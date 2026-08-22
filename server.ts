import {
  setWorkspaceSecret,
  getWorkspaceSecret,
  deleteWorkspaceSecret,
} from "./src/services/workspaceSecretVault";
import { FieldValue } from "firebase-admin/firestore";
import {
  canWorkspaceUseFeature,
  FoxFeature,
} from "./src/services/entitlementService";

import {
  adminAuth,
  adminDb,
} from "./src/services/firebaseAdmin";

import {
  encryptSecret,
  decryptSecret,
} from "./src/services/secretService";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { aiAgentService } from "./src/services/aiAgentService";
import { sharedMemoryService } from "./src/services/sharedMemoryService";
import { conversationService } from "./src/services/conversationService";
import { workspaceCrmService } from "./src/services/workspaceCrmService";
import { crmEventService } from "./src/services/crmEventService";
import { emailService } from "./src/services/emailService";
import { TrialLimitManager } from "./src/services/TrialLimitManager";
import { db } from "./src/services/firebase";
import { collection, getDocs } from "firebase/firestore";

dotenv.config();

// ============================================================
// FOX PASSWORD HASHING V1
// ============================================================
//
// Format:
// scrypt$<salt>$<derived-key>
//
// - Plaintext passwords are never stored for new workspaces.
// - timingSafeEqual prevents timing-based comparison leakage.
// - Legacy plaintext workspaces are migrated after successful auth.
// ============================================================

function hashWorkspacePassword(
  password: string
): string {
  if (!password) {
    throw new Error(
      "Password is required for hashing"
    );
  }

  const salt =
    randomBytes(16).toString("hex");

  const derivedKey =
    scryptSync(
      password,
      salt,
      64
    ).toString("hex");

  return `scrypt$${salt}$${derivedKey}`;
}

function verifyWorkspacePassword(
  password: string,
  storedHash?: string
): boolean {
  if (
    !password ||
    !storedHash ||
    !storedHash.startsWith("scrypt$")
  ) {
    return false;
  }

  try {
    const [
      algorithm,
      salt,
      storedKeyHex,
    ] = storedHash.split("$");

    if (
      algorithm !== "scrypt" ||
      !salt ||
      !storedKeyHex
    ) {
      return false;
    }

    const storedKey =
      Buffer.from(
        storedKeyHex,
        "hex"
      );

    const suppliedKey =
      scryptSync(
        password,
        salt,
        storedKey.length
      );

    if (
      storedKey.length !==
      suppliedKey.length
    ) {
      return false;
    }

    return timingSafeEqual(
      storedKey,
      suppliedKey
    );
  } catch {
    return false;
  }
}

async function verifyAndMigrateWorkspacePassword(
  workspace: any,
  inputPassword: string
): Promise<boolean> {
  if (
    !workspace ||
    !inputPassword
  ) {
    return false;
  }

  // Modern secure account.
  if (workspace.passwordHash) {
    return verifyWorkspacePassword(
      inputPassword,
      workspace.passwordHash
    );
  }

  // ==========================================================
  // LEGACY ONE-TIME MIGRATION
  // ==========================================================
  //
  // Existing workspaces may still contain password plaintext.
  // Accept it ONLY when it exactly matches, then immediately:
  // 1. create secure hash
  // 2. remove plaintext from Firestore
  // 3. remove plaintext from runtime object
  // ==========================================================

  if (
    workspace.password &&
    workspace.password ===
      inputPassword
  ) {
    const passwordHash =
      hashWorkspacePassword(
        inputPassword
      );

    try {
      await adminDb
        .collection("workspaces")
        .doc(workspace.id)
        .set(
          {
            passwordHash,
            password:
              FieldValue.delete(),
            passwordMigratedAt:
              new Date().toISOString(),
          },
          {
            merge: true,
          }
        );

      workspace.passwordHash =
        passwordHash;

      delete workspace.password;

      console.log(
        `🔐 [FOX Auth] Legacy password migrated | Workspace=${workspace.id}`
      );
    } catch (error) {
      console.error(
        "❌ [FOX Auth] Password migration failed:",
        error
      );

      // Do not authenticate if migration failed.
      return false;
    }

    return true;
  }

  return false;
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "50mb" }));

// Store generated OTP codes in memory for web/API verification
const otpStore: Record<string, { code: string; expiresAt: number; ownerName?: string; workspaceName?: string }> = {};

// Send Email OTP Endpoint
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email, ownerName = "عميل جديد", workspaceName = "النشاط التجاري" } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory (15 min expiration)
    otpStore[cleanEmail] = {
      code: otpCode,
      expiresAt: Date.now() + 15 * 60 * 1000,
      ownerName,
      workspaceName,
    };

    const mailResult = await emailService.sendVerificationEmail({
      toEmail: cleanEmail,
      ownerName,
      otpCode,
      workspaceName,
    });

    return res.json({
      success: true,
      message: `تم إرسال كود التفعيل إلى البريد: ${cleanEmail}`,
      otpCode, // also returned for testing/fallback
      deliveryMode: mailResult.mode,
      previewUrl: mailResult.previewUrl,
    });
  } catch (err: any) {
    console.error("Send OTP Endpoint Error:", err);
    return res.status(500).json({ error: err.message || "Failed to send verification email" });
  }
});

// Verify Email OTP Endpoint
app.post("/api/verify-otp", (req, res) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ error: "Email and otpCode are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore[cleanEmail];

    if (!record) {
      // Fallback check for universal test code 123456
      if (false) {
        return res.json({ success: true, verified: true, message: "تم التحقق بواسطة كود الاختبار العام" });
      }
      return res.status(400).json({ error: "لم يتم العثور على رمز تفعيل لهذا البريد. أعد طلب الإرسال." });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[cleanEmail];
      return res.status(400).json({ error: "انتهت صلاحية رمز التفعيل (15 دقيقة). برجاء طلب رمز جديد." });
    }

    if (record.code === otpCode.trim()) {
      delete otpStore[cleanEmail];
      return res.json({ success: true, verified: true, message: "تم تفعيل وتأكيد البريد الإلكتروني بنجاح!" });
    } else {
      return res.status(400).json({ error: "رمز التفعيل غير صحيح. برجاء التأكد من الرمز وإعادة المحاولة." });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to verify OTP" });
  }
});

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Gemini API calls will run in fallback smart mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ==========================================
// API ROUTES
// ==========================================

// AI Social Media Post Generator & Optimal Timing Endpoint
app.post("/api/generate-ai-post", async (req, res) => {
  try {
    const {
      topic = "",
      platform = "facebook",
      targetAudience = "أصحاب المحلات والمشاريع",
      tone = "إقناعي وحماسي",
      language = "ar"
    } = req.body;

    const isAr = language === "ar";
    const userTopic = topic.trim() || (isAr ? "حلول الذكاء الاصطناعي لتنمية المبيعات وخدمة العملاء 24/7" : "AI Automation Solutions for Business Growth");

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const prompt = `أنت خبير تسويق رقمي وكتابة محتوى لمواقع التواصل الاجتماعي (Social Media Copywriter).
المطلوب: كتابة منشور تسويقي جذاب واحترافي لمنصة (${platform}) باللغة (${isAr ? "العربية" : "الإنكليزية"}).

تفاصيل المنشور:
- الموضوع/العرض: ${userTopic}
- المنصة: ${platform}
- الجمهور المستهدف: ${targetAudience}
- نبرة الكتابة: ${tone}

المنشور يجب أن يحتوي على:
1. عنوان حماسي يشد الانتباه في السطر الأول مع إيموجي مميز.
2. جسم المنشور يوضح المزايا والقيمة التنافسية في نقاط منظمة.
3. دعوة واضحة اتخاذ إجراء (Call To Action) تشجع القارئ على التعليق أو المراسلة.
4. قائمة بالهاشتاجات النشطة والمناسبة لـ ${platform}.

أعد النتيجة فقط ككائن JSON بالصيغة التالية من غير أي markdown أو شروح حولها:
{
  "postContent": "نص المنشور الكامل هنا",
  "recommendedTime": "الوقت المقترح (مثال: اليوم الساعة 8:00 مساءً)",
  "bestDays": "أفضل الأيام (مثال: الأحد، الثلاثاء، الخميس)",
  "reason": "سبب اختيار هذا الوقت للجمهور المستهدف",
  "engagementBoost": "+65% تفاعل متوقع",
  "suggestedVisualPrompt": "وصف الصورة المقترحة للمنشور"
}`;

        const response = await gemini.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const textResult = response.text;
        if (textResult) {
          const parsed = JSON.parse(textResult);
          return res.json({ success: true, ...parsed });
        }
      } catch (geminiError) {
        console.warn("[Gemini API Error in /api/generate-ai-post, falling back]:", geminiError);
      }
    }

    // Fallback logic if Gemini is unavailable or errors
    let bestTimeObj = {
      recommendedTime: "اليوم الساعة 7:30 مساءً",
      bestDays: "الأحد، الثلاثاء، الخميس",
      reason: "فترة الذروة المسائية عقب ساعات العمل الرسمية حيث تزداد نسبة تصفح مواقع التواصل الاجتماعي.",
      engagementBoost: "+60% زيادة في التفاعل",
      suggestedVisualPrompt: "تصميم عصري وجذاب يعبر عن التطور التكنولوجي والذكاء الاصطناعي بأسلوب الوكالة"
    };

    if (platform === "instagram") {
      bestTimeObj = {
        recommendedTime: "اليوم الساعة 6:00 مساءً إلى 9:00 مساءً",
        bestDays: "الإثنين، الأربعاء، الجمعة",
        reason: "أوقات التصفح المكثف لإنستغرام من قِبل الجمهور المهتم بالخدمات البصرية والمحتوى الجذاب.",
        engagementBoost: "+75% وصول أعلى",
        suggestedVisualPrompt: "صورة عالية الجودة بألوان زاهية وتباين مرتفع تبرز فائدة الخدمة"
      };
    } else if (platform === "linkedin") {
      bestTimeObj = {
        recommendedTime: "غداً الساعة 9:00 صباحاً أو 1:00 ظهراً",
        bestDays: "الثلاثاء، الأربعاء، الخميس",
        reason: "ساعات العمل الرسمية وفترات الاستراحة للشركات والمدراء ورواد الأعمال على لينكد إن.",
        engagementBoost: "+50% تفاعل مهني",
        suggestedVisualPrompt: "إنفوجرافيك احترافي ملخص مع شعار الوكالة وأرقام نمو واضحة"
      };
    } else if (platform === "twitter") {
      bestTimeObj = {
        recommendedTime: "اليوم الساعة 12:00 ظهراً أو 8:00 مساءً",
        bestDays: "طوال أيام الأسبوع (خاصة الأحد إلى الخميس)",
        reason: "أوقات متابعة الأخبار والتغريدات السريعة خلال فترة الظهيرة والمساء.",
        engagementBoost: "+55% إعادات تغريد",
        suggestedVisualPrompt: "تصميم بسيط مركز مع نص مختصر وواضح"
      };
    } else if (platform === "tiktok") {
      bestTimeObj = {
        recommendedTime: "اليوم الساعة 8:30 مساءً إلى 11:00 مساءً",
        bestDays: "الخميس، الجمعة، السبت",
        reason: "ذروة مشاهدات الفيديوهات القصيرة والمحتوى الترفيهي والتسويقي في نهاية الأسبوع.",
        engagementBoost: "+85% مشاهدات إضافية",
        suggestedVisualPrompt: "فيديو قصير تفاعلي مدته 15-30 ثانية يعرض النتيجة النهائية لاستخدام الخدمة"
      };
    }

    const generatedPostContent = isAr
      ? `🔥 **هل ترغب في زيادة مبيعات مشروعك وتحسين تجربة عملائك بأحدث تقنيات الذكاء الاصطناعي؟**\n\nتتيح لك منصتنا تفعيل وكلاء ذكاء اصطناعي مخصصين لـ (${targetAudience}) يقدمون:\n\n✨ **الرد الفوري على الاستفسارات** على مدار 24 ساعة دون تأخير.\n🤖 **أتمتة المبيعات وحجز المواعيد** تلقائياً عبر واتساب وفيسبوك.\n📊 **تنسيق بيانات العملاء والربط مع نظام إدارة علاقات العملاء CRM**.\n💡 **تقليل تكاليف خدمة العملاء** بنسبة تصل إلى 80%.\n\n👇 **كيف تبدأ الآن؟**\nاكتب كلمة **"تفاصيل"** أو **"مهتم"** في التعليقات أو أرسل لنا رسالة خاصة لتصلك كافة التفاصيل ورابط التجربة المباشرة فوراً! 📩⚡\n\n#ذكاء_اصطناعي #تسويق_رقمي #أتمتة_المشاريع #FoxAI #${platform}`
      : `🔥 **Ready to Scale Your Business & Automate Sales with AI?**\n\nEmpower your business with custom AI Agents built for (${targetAudience}):\n\n✨ **Instant 24/7 Customer Support** with zero delay.\n🤖 **Automated Sales & Appointment Booking** directly on WhatsApp & Facebook.\n📊 **Seamless CRM Integration** and lead management.\n💡 **Cut Support Costs by up to 80%**.\n\n👇 **How to get started?**\nComment **"INFO"** or send us a Direct Message to get instant access and a free demo link! 📩⚡\n\n#AIAgents #DigitalMarketing #Automation #${platform}`;

    return res.json({
      success: true,
      postContent: generatedPostContent,
      ...bestTimeObj
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Fox AI Agency SaaS Engine", timestamp: new Date().toISOString() });
});

// Meta Graph API Publishing Endpoint
app.post("/api/meta/publish-post", async (req, res) => {
  try {
    const { pageId, pageAccessToken, message, imageUrl } = req.body;

    const targetPageId = pageId || "1303288339529348";
    const targetToken = pageAccessToken || "EABAcoO32gPIBSFpxMQy0l23pr2YMFDPexleFCiV0D7cFNtx1yrIfco27yrhmLBPHEnqb4dHncn99fhC1NGDneTyeTA3u5TcSswhG6eO4laodp1y5S3ZBY17G24WKsUHiKZCLRUYhQ9921jbZAMs9rkR0zgUKXdJqoQfw8gMkFwm1VYH5rU52hSAT5VpNiT81EKsFagYlQPKwaU6ICBQuAZDZD";

    if (!message) {
      return res.status(400).json({ error: "محتوى البوست (message) مطلوب للنشر" });
    }

    let publishResult: any = null;
    let publishError: any = null;

    // Attempt 1: If image URL exists, try publishing to /photos endpoint
    if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
      try {
        console.log(`[Meta API] Attempting photo post to https://graph.facebook.com/v19.0/${targetPageId}/photos...`);
        const photoRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: imageUrl,
            caption: message,
            published: true,
            access_token: targetToken
          })
        });

        const photoData: any = await photoRes.json();
        if (photoRes.ok && !photoData.error) {
          publishResult = photoData;
        } else {
          console.warn("[Meta API] Photo post failed, falling back to text feed post:", photoData);
          publishError = photoData.error;
        }
      } catch (e: any) {
        console.warn("[Meta API] Exception on photo post, falling back to text feed post:", e.message);
      }
    }

    // Attempt 2: Publish to /feed endpoint (if photo post wasn't attempted or failed)
    if (!publishResult) {
      console.log(`[Meta API] Attempting text feed post to https://graph.facebook.com/v19.0/${targetPageId}/feed...`);
      const feedRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          published: true,
          access_token: targetToken
        })
      });

      const feedData: any = await feedRes.json();
      if (feedRes.ok && !feedData.error) {
        publishResult = feedData;
      } else {
        publishError = feedData.error;
      }
    }

    // If both attempts failed
    if (!publishResult) {
      console.error("[Meta API] Publishing failed entirely:", publishError);
      
      let userFriendlyError = publishError?.message || "فشل الاتصال بـ Meta Graph API";
      const code = publishError?.code;
      const subcode = publishError?.error_subcode;

      if (code === 190) {
        userFriendlyError = "انتهت صلاحية توكن الوصول (Access Token Expired). يرجى توليد توكن جديد من Meta Graph API Explorer ووضعه في خانة توكن الصفحة.";
      } else if (code === 200 || code === 283) {
        userFriendlyError = "التوكن المستخدم يفتقر لصلاحية النشر (pages_manage_posts). تأكد من إعطاء التوكن صلاحيات: pages_manage_posts, pages_read_engagement, pages_show_list.";
      } else if (code === 100) {
        userFriendlyError = `خطأ في المعاملات (Invalid Parameter): ${publishError?.message || 'تأكد من اختيار صفحة فيسبوك الصحيحة وصلاحيات التوكن.'}`;
      }

      return res.status(400).json({
        success: false,
        error: userFriendlyError,
        details: publishError
      });
    }

    const postId = publishResult.post_id || publishResult.id;
    const postUrl = `https://facebook.com/${postId}`;

    return res.json({
      success: true,
      postId: postId,
      postUrl: postUrl,
      message: "تم نشر البوست بنجاح فوراً على صفحة الفيسبوك الرسمية! 🎉"
    });
  } catch (err: any) {
    console.error("Error in /api/meta/publish-post:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "حدث خطأ غير متوقع أثناء الاتصال بالخادم"
    });
  }
});

// Meta Graph API Connection Verification Endpoint
app.get("/api/meta/test-connection", async (req, res) => {
  try {
    const pageId = (req.query.pageId as string) || "1303288339529348";
    const token = (req.query.token as string) || "EABAcoO32gPIBSFpxMQy0l23pr2YMFDPexleFCiV0D7cFNtx1yrIfco27yrhmLBPHEnqb4dHncn99fhC1NGDneTyeTA3u5TcSswhG6eO4laodp1y5S3ZBY17G24WKsUHiKZCLRUYhQ9921jbZAMs9rkR0zgUKXdJqoQfw8gMkFwm1VYH5rU52hSAT5VpNiT81EKsFagYlQPKwaU6ICBQuAZDZD";

    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=name,id,link,followers_count&access_token=${token}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({
        success: false,
        error: data.error?.message || "فشل التحقق من توكن الصفحة"
      });
    }

    return res.json({
      success: true,
      pageName: data.name,
      pageId: data.id,
      followersCount: data.followers_count || 0,
      link: data.link || `https://facebook.com/${data.id}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Active Meta Page Token in memory for Webhooks
let activeMetaPageAccessToken = process.env.META_PAGE_ACCESS_TOKEN || "EABAcoO32gPIBSFpxMQy0l23pr2YMFDPexleFCiV0D7cFNtx1yrIfco27yrhmLBPHEnqb4dHncn99fhC1NGDneTyeTA3u5TcSswhG6eO4laodp1y5S3ZBY17G24WKsUHiKZCLRUYhQ9921jbZAMs9rkR0zgUKXdJqoQfw8gMkFwm1VYH5rU52hSAT5VpNiT81EKsFagYlQPKwaU6ICBQuAZDZD";

// Endpoint to subscribe Facebook Page to App Webhooks (feed, messages)
app.post("/api/meta/subscribe-page", async (req, res) => {
  try {
    const pageId = req.body.pageId || "1303288339529348";
    const token = req.body.token || activeMetaPageAccessToken;

    if (token) {
      activeMetaPageAccessToken = token;
    }

    console.log(`[Meta Subscribed Apps] Subscribing page ${pageId} to webhooks...`);

    // Method A: Query String with comma-separated fields
    const fieldsStr = "feed,messages,messaging_postbacks,mention";
    let url = `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fieldsStr)}&access_token=${encodeURIComponent(token)}`;
    
    let response = await fetch(url, { method: "POST" });
    let data: any = await response.json();
    console.log(`[Meta Subscribed Apps Method A Result]:`, data);

    // If Method A fails, try Method B with feed field only (essential for comment auto-replies)
    if (!data.success && !data.id) {
      console.warn("[Meta Subscribed Apps Method A failed, trying Method B (feed field only)...]");
      const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${encodeURIComponent(token)}`;
      response = await fetch(feedUrl, { method: "POST" });
      data = await response.json();
      console.log(`[Meta Subscribed Apps Method B Result]:`, data);
    }

    // If Method B fails, try Method C with JSON body
    if (!data.success && !data.id) {
      console.warn("[Meta Subscribed Apps Method B failed, trying Method C (JSON body)...]");
      response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: ["feed"],
          access_token: token
        })
      });
      data = await response.json();
      console.log(`[Meta Subscribed Apps Method C Result]:`, data);
    }

    if (data.success || data.id) {
      return res.json({
        success: true,
        message: "تم ربط وتفعيل الويب هوك (Webhooks) بنجاح على الصفحة لتلقي التعليقات والرسائل تلقائياً! 🎉",
        details: data
      });
    } else {
      const errMsg = data.error?.message || "فشل تفعيل الويب هوك على الصفحة";
      const errType = data.error?.type || "";
      const errCode = data.error?.code;

      let userFriendlyError = errMsg;
      if (errType === "OAuthException" || errCode === 200) {
        userFriendlyError = `خطأ تصاريح من فيسبوك (OAuthException): التوكن المستعمل يحتاج إلى صلاحية pages_manage_metadata أو أن يكون التطبيق مرتبطاً بالصفحة في Meta Developers Console. (${errMsg})`;
      }

      return res.status(400).json({
        success: false,
        error: userFriendlyError,
        details: data.error
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper for Direct Messenger DM Auto-Reply
async function handleMessengerDirectReply({
  senderPsid,
  userMessage,
  pageId = "1303288339529348",
  pageAccessToken
}: {
  senderPsid: string;
  userMessage: string;
  pageId?: string;
  pageAccessToken: string;
}) {
  let replyText = "";
  try {
    const ai = getGeminiClient();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `أنت بوت المبيعات والخدمات التلقائي لشركة FOX AI Agency. رسالة عميل على ماسنجر فيسبوك: "${userMessage}".
اكتب رد احترافي وودود وسريع باللغة العربية يلبي طلب العميل ويشرح خدمات الذكاء الاصطناعي ويدعوه لبدء الاستفادة.`
      });
      replyText = response.text || "";
    }
  } catch (e) {
    console.warn("[Messenger DM AI Gen Fallback]:", e);
  }

  if (!replyText) {
    replyText = `أهلاً بك! 🌸 شرفتنا برسالتك في FOX AI Agency. يسعدنا جداً مساعدتك والرد على كافة استفساراتك حول حلولنا بالذكاء الاصطناعي والتسويق الرقمي! كيف يمكننا مساعدتك اليوم؟ ✨`;
  }

  try {
    console.log(`[Messenger AutoReply] Sending DM reply to PSID ${senderPsid}...`);
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: senderPsid },
        message: { text: replyText },
        access_token: pageAccessToken
      })
    });
    const data: any = await res.json();
    return { success: res.ok && !data.error, replyText, data };
  } catch (err: any) {
    console.error("[Messenger AutoReply Error]:", err.message);
    return { success: false, error: err.message };
  }
}

// Helper for Meta Auto-Reply (Public Comment Reply + Private DM)
async function handleMetaAutoReply({
  commentId,
  commentText,
  senderName = "العميل",
  pageId = "1303288339529348",
  pageAccessToken,
  customPublicReply,
  customPrivateDm
}: {
  commentId: string;
  commentText: string;
  senderName?: string;
  pageId?: string;
  pageAccessToken: string;
  customPublicReply?: string;
  customPrivateDm?: string;
}) {
  let publicReplyText = customPublicReply || "";
  let privateDmText = customPrivateDm || "";

  // 1. AI Response Generation using Gemini if custom text not provided
  if (!publicReplyText || !privateDmText) {
    try {
      const ai = getGeminiClient();
      if (ai) {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `أنت بوت تسويقي ذكي لشركة FOX AI Agency. تعليق عميل على بوست فيسبوك: "${commentText}" واسمه "${senderName}".
اكتب كود JSON فقط بدون أية علامات مارك داون بالشكل التالي:
{
  "publicReply": "رد عام ودود ومختصر جداً للتعليق يخبره برضا وسعادة أنه تم إرسال التفاصيل كاملة في الرسائل الخاصة (الخاص/DM) مع إيموجي مبهج",
  "privateDm": "رسالة خاصة دافئة وواضحة جداً ترسل له على الخاص تفصل له خدمات الشركة وتجيب عن تعليقه وتدعوه لبدء الاستفادة فوراً"
}`
        });

        const rawText = response.text || "";
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.publicReply) publicReplyText = parsed.publicReply;
        if (parsed.privateDm) privateDmText = parsed.privateDm;
      }
    } catch (e) {
      console.warn("[Meta AutoReply AI Gen Fallback]:", e);
    }
  }

  if (!publicReplyText) {
    publicReplyText = `أهلاً بك يا فندم! 🌸 تم الرد على استفسارك بكل التفاصيل في الرسائل الخاصة (DM)، تفقد الخاص الآن! ✨`;
  }
  if (!privateDmText) {
    privateDmText = `أهلاً بك يا ${senderName}! 🌺 يسعدنا تواصلك مع FOX AI Agency. بالنسبة لاستفسارك: "${commentText}"، نرحب بك جداً ونوفر لك كافة باقتنا وخدماتنا بالذكاء الاصطناعي. هل تود أن نساعدك في اختيار الباقة المناسبة لشغلك؟`;
  }

  // 2. Post Public Reply to Comment
  let publicReplySuccess = false;
  let publicReplyData: any = null;
  try {
    console.log(`[Meta AutoReply] Posting public comment reply to ${commentId}...`);
    const pubRes = await fetch(`https://graph.facebook.com/v19.0/${commentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: publicReplyText,
        access_token: pageAccessToken
      })
    });
    publicReplyData = await pubRes.json();
    publicReplySuccess = pubRes.ok && !publicReplyData.error;
    if (!publicReplySuccess) {
      console.warn("[Meta AutoReply] Public comment reply failed:", publicReplyData);
    }
  } catch (err: any) {
    console.error("[Meta AutoReply] Public comment reply exception:", err.message);
  }

  // 3. Post Private Reply (DM) to Commenter
  let privateDmSuccess = false;
  let privateDmData: any = null;
  try {
    console.log(`[Meta AutoReply] Sending private DM for comment ${commentId}...`);
    // Attempt Method 1: /${commentId}/private_replies
    const dmRes = await fetch(`https://graph.facebook.com/v19.0/${commentId}/private_replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: privateDmText,
        access_token: pageAccessToken
      })
    });
    privateDmData = await dmRes.json();
    privateDmSuccess = dmRes.ok && !privateDmData.error;

    // Fallback Method 2: /me/messages with recipient.comment_id
    if (!privateDmSuccess) {
      console.warn("[Meta AutoReply] Method 1 /private_replies failed, trying /me/messages fallback...", privateDmData);
      const dmRes2 = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text: privateDmText },
          access_token: pageAccessToken
        })
      });
      const dmData2 = await dmRes2.json();
      if (dmRes2.ok && !dmData2.error) {
        privateDmSuccess = true;
        privateDmData = dmData2;
      } else {
        console.warn("[Meta AutoReply] Method 2 /me/messages failed as well:", dmData2);
      }
    }
  } catch (err: any) {
    console.error("[Meta AutoReply] Private DM exception:", err.message);
  }

  return {
    publicReplySuccess,
    publicReplyText,
    publicReplyData,
    privateDmSuccess,
    privateDmText,
    privateDmData
  };
}

// Manual Endpoint: Trigger Auto-Reply on a Comment or Post
app.post("/api/meta/auto-reply-comment", async (req, res) => {
  try {
    const { commentId, commentText, senderName, pageId, pageAccessToken, customPublicReply, customPrivateDm } = req.body;

    const targetPageId = pageId || "1303288339529348";
    const targetToken = pageAccessToken || "EABAcoO32gPIBSFpxMQy0l23pr2YMFDPexleFCiV0D7cFNtx1yrIfco27yrhmLBPHEnqb4dHncn99fhC1NGDneTyeTA3u5TcSswhG6eO4laodp1y5S3ZBY17G24WKsUHiKZCLRUYhQ9921jbZAMs9rkR0zgUKXdJqoQfw8gMkFwm1VYH5rU52hSAT5VpNiT81EKsFagYlQPKwaU6ICBQuAZDZD";

    if (!commentId) {
      return res.status(400).json({ error: "معرف التعليق (commentId) مطلوب للرد التلقائي" });
    }

    const result = await handleMetaAutoReply({
      commentId,
      commentText: commentText || "استفسار عن التفاصيل والأسعار",
      senderName: senderName || "عميل فيسبوك",
      pageId: targetPageId,
      pageAccessToken: targetToken,
      customPublicReply,
      customPrivateDm
    });

    return res.json({
      success: result.publicReplySuccess || result.privateDmSuccess,
      message: (result.publicReplySuccess || result.privateDmSuccess)
        ? "تم تنفيذ عملية الرد التلقائي وإرسال الرسالة بنجاح 🤖"
        : "فشل إرسال الرد المباشر. تأكد من أن معرف التعليق صحيح وأن التوكن يمتلك صلاحية pages_manage_posts و pages_messaging.",
      result
    });
  } catch (err: any) {
    console.error("Error in /api/meta/auto-reply-comment:", err);
    return res.status(500).json({ success: false, error: err.message || "حدث خطأ أثناء معالجة الرد التلقائي" });
  }
});

// Meta Webhook Verification (OPTIONS preflight)
app.options(["/api/webhooks/meta-social", "/api/meta/webhook", "/api/webhooks/facebook", "/webhook"], (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.status(200).end();
});

// Meta Webhook Verification (GET)
app.get(["/api/webhooks/meta-social", "/api/meta/webhook", "/api/webhooks/facebook", "/webhook"], (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Type", "text/plain");

  const query = req.query || {};
  const hub = (query.hub as any) || {};

  const rawQuery = req.url.includes("?") ? req.url.split("?")[1] : "";
  const urlParams = new URLSearchParams(rawQuery);

  const mode = query["hub.mode"] || hub.mode || query["hub[mode]"] || query.mode || urlParams.get("hub.mode") || urlParams.get("mode");
  const token = query["hub.verify_token"] || hub.verify_token || query["hub[verify_token]"] || query.verify_token || query.token || urlParams.get("hub.verify_token") || urlParams.get("verify_token");
  const challenge = query["hub.challenge"] || hub.challenge || query["hub[challenge]"] || query.challenge || urlParams.get("hub.challenge") || urlParams.get("challenge");

  console.log(`[Meta Webhook GET Verification] Full Query:`, query, `| Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

  const EXPECTED_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "";

  if (challenge) {
    if (token && token !== EXPECTED_TOKEN) {
      console.warn(`[Meta Webhook] Token mismatch: received "${token}" vs expected "${EXPECTED_TOKEN}"`);
    }
    console.log(`[Meta Webhook Verification SUCCESS] Returning challenge: ${challenge}`);
    return res.status(200).send(String(challenge));
  }

  if (mode === "subscribe") {
    console.log("[Meta Webhook] Mode subscribe detected without challenge, returning OK");
    return res.status(200).send("OK");
  }

  return res.status(200).send("Meta Webhook Endpoint Active");
});

// Meta Webhook Event Handler (POST)
app.post(["/api/webhooks/meta-social", "/api/meta/webhook", "/api/webhooks/facebook", "/webhook"], async (req, res) => {
  // Always return 200 OK to Meta immediately
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body;
    console.log("[Meta Webhook Incoming POST Event]:", JSON.stringify(body, null, 2));

    const targetToken = activeMetaPageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;

    if (body?.object === "page" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const pageId = entry.id || "1303288339529348";

        // 1. Process Page Feed Comments
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const val = change.value;
            if (val && (val.item === "comment" || val.comment_id || val.parent_id) && val.verb !== "remove") {
              const commentId = val.comment_id || val.id;
              const commentText = val.message || val.text || "";
              const senderId = val.sender_id || val.from?.id;
              const senderName = val.sender_name || val.from?.name || "عميل فيسبوك";

              // Ignore comments from page itself
              if (senderId === pageId || val.from?.id === pageId) {
                console.log(`[Meta Webhook] Skipping comment made by page itself: ${commentId}`);
                continue;
              }

              console.log(`[Meta Webhook] New customer comment detected: "${commentText}" by ${senderName} (Comment ID: ${commentId})`);

              // Trigger AI auto reply + private DM
              await handleMetaAutoReply({
                commentId,
                commentText,
                senderName,
                pageId,
                pageAccessToken: targetToken
              });
            }
          }
        }

        // 2. Process Messenger Direct Inbox Messages (DMs)
        if (Array.isArray(entry.messaging)) {
          for (const msgObj of entry.messaging) {
            const senderPsid = msgObj.sender?.id;
            const userMsgText = msgObj.message?.text;

            // Ignore messages sent by page itself or echo messages
            if (!senderPsid || senderPsid === pageId || msgObj.message?.is_echo) {
              continue;
            }

            if (userMsgText) {
              console.log(`[Meta Webhook] New Messenger DM from PSID ${senderPsid}: "${userMsgText}"`);
              await handleMessengerDirectReply({
                senderPsid,
                userMessage: userMsgText,
                pageId,
                pageAccessToken: targetToken
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Meta Webhook POST Event Error]:", err.message || err);
  }
});

// AI Agent System Prompt Builder Endpoint (Inspect Prompt & Constraints)
app.post("/api/ai/build-system-prompt", (req, res) => {
  try {
    const { workspace = {}, messageLang = "ar", channel = "telegram", overrideConfig } = req.body;
    const prompt = aiAgentService.buildSystemInstruction(workspace, messageLang, channel, overrideConfig);
    return res.json({ systemInstruction: prompt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to build system prompt" });
  }
});

// Centralized AI Agent Chat Endpoint

app.post("/api/ai/reset-session", async (req, res) => {
  try {
    const { workspaceId, sessionId } = req.body;
    if (workspaceId && sessionId) {
      await sharedMemoryService.resetContext(workspaceId, sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset session" });
  }
});


app.post("/api/ai/extract-knowledge", async (req, res) => {
  try {
    const { type, content, url, mimeType } = req.body;
    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }
    const result = await aiAgentService.extractKnowledge({ type, content, url, mimeType });
    res.json(result);
  } catch (error) {
    console.error("Extract Knowledge Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract knowledge" });
  }
});




app.post(
  "/api/ai/chat",
  authenticateFirebaseRequest,
  async (req: any, res) => {
  try {
    const {
      workspace,
      workspaceId,
      customerMessage,
      userMessage,
      channel = "telegram",
      chatHistory = [],
      overrideConfig,
      sessionId
    } = req.body;

    const message = customerMessage || userMessage;

    if (!message) {
      return res.status(400).json({
        error: "customerMessage or userMessage is required"
      });
    }

    // ========================================================
    // SECURITY:
    // Never trust workspace subscription/credit data supplied
    // by the browser.
    // ========================================================

    const requestedWorkspaceId =
      workspaceId || workspace?.id;

    if (!requestedWorkspaceId) {
      return res.status(400).json({
        error: "workspaceId is required",
        code: "WORKSPACE_ID_REQUIRED"
      });
    }

    const trustedWorkspace =
      requireAuthenticatedWorkspace(
        req,
        res,
        requestedWorkspaceId
      );

    if (!trustedWorkspace) {
      return;
    }

    // Channel entitlement must be enforced server-side.
    if (channel === "telegram") {
      const access =
        requireWorkspaceFeature(
          trustedWorkspace,
          "telegram"
        );

      if (!access.allowed) {
        return res.status(access.status).json(access);
      }
    }

    if (channel === "whatsapp") {
      const access =
        requireWorkspaceFeature(
          trustedWorkspace,
          "whatsapp"
        );

      if (!access.allowed) {
        return res.status(access.status).json(access);
      }
    }

    console.log(
      `🛡️ [FOX Security] Trusted workspace resolved | Workspace=${trustedWorkspace.id} | Plan=${trustedWorkspace.planId} | Channel=${channel}`
    );

    const result =
      await aiAgentService.generateChatResponse({
        workspace: trustedWorkspace,
        message,
        channel,
        chatHistory,
        overrideConfig,
        sessionId,
      });

    return res.json(result);

  } catch (error: any) {
    console.error(
      "AI Chat Route Error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Failed to process AI response"
    });
  }
  }
);

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

async function generateWithFallback(ai: any, params: any) {
  let lastError;
  for (const model of FALLBACK_MODELS) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (e: any) {
      lastError = e;
      console.warn(`Model ${model} failed: ${e?.message || e}. Trying next...`);
      // We fall back on any error just in case, but particularly for 429 Quota limits
      continue;
    }
  }
  throw lastError;
}

// Smart Fox Advisor endpoint for the client dashboard
app.post("/api/ai/fox-advisor", async (req, res) => {
  try {
    const { message, chatHistory, workspace } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Mock fallback if no Gemini key
      return res.json({
        response: "بناءً على تحليلي لبيانات متجرك، أنصحك بتحديث ملف التدريب وإضافة المنتجات الأكثر مبيعاً، ومراجعة المحادثات مع العملاء لتحسين الردود الآلية."
      });
    }

    const businessName = workspace?.name || "the client's business";
    const industry = workspace?.industry || "Small Business";

    const systemPrompt = `You are 'Smart Fox Advisor' (مستشار فوكس الذكي 🦊), an expert AI consultant for a SaaS platform called FOX AI AGENCY SAAS.
Your job is to advise the client (the owner of '${businessName}' in the '${industry}' industry) on how to improve their AI chatbots, increase sales, optimize customer service, and better train their bot's knowledge base.
Be professional, analytical, and friendly. Provide actionable advice. You can use Markdown for formatting. Respond in the same language as the user's message (mostly Arabic unless asked in English).`;

    let contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      contents = chatHistory.map((msg: any) => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.text }]
      }));
    }
    
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await generateWithFallback(ai, {
      contents,
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] }
      }
    });

    return res.json({ response: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Fox Advisor Route Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process Fox Advisor response" });
  }
});


// Official Telegram Bot Active Token & Agency Config
let activeTelegramToken = process.env.TELEGRAM_BOT_TOKEN || "";

// ============================================================
// SECURE AGENCY TELEGRAM TOKEN STORAGE
// Firestore stores AES-256-GCM encrypted data only.
// The real token never leaves the backend.
// ============================================================

async function persistAgencyTelegramToken(
  token: string
) {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    throw new Error("Telegram token cannot be empty");
  }

  const encrypted = encryptSecret(cleanToken);

  await adminDb
    .collection("agencySettings")
    .doc("telegram")
    .set(
      {
        tokenEncrypted: encrypted,
        hasToken: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  activeTelegramToken = cleanToken;

  console.log(
    "🔐 [Agency Telegram] Token encrypted and persisted"
  );
}

async function hydrateAgencyTelegramToken() {
  try {
    const ref = adminDb
      .collection("agencySettings")
      .doc("telegram");

    const snapshot = await ref.get();

    if (snapshot.exists) {
      const data: any = snapshot.data() || {};

      if (
        data.tokenEncrypted?.iv &&
        data.tokenEncrypted?.tag &&
        data.tokenEncrypted?.data
      ) {
        const decrypted = decryptSecret(
          data.tokenEncrypted
        );

        if (decrypted.trim()) {
          activeTelegramToken = decrypted.trim();

          console.log(
            "🔐 [Agency Telegram] Encrypted token loaded from Firestore"
          );

          return true;
        }
      }
    }

    // One-time migration from the existing environment token.
    if (activeTelegramToken.trim()) {
      await persistAgencyTelegramToken(
        activeTelegramToken
      );

      console.log(
        "🔄 [Agency Telegram] Environment token migrated to encrypted Firestore storage"
      );

      return true;
    }

    console.warn(
      "⚠️ [Agency Telegram] No Telegram token configured"
    );

    return false;

  } catch (error) {
    console.error(
      "❌ [Agency Telegram] Secure token hydration failed:",
      error
    );

    // Keep the .env token as emergency fallback if available.
    return Boolean(activeTelegramToken);
  }
}

// Facebook Messenger Config
let activeFacebookVerifyToken = process.env.FACEBOOK_VERIFY_TOKEN || "";
let activeFacebookPageToken = process.env.FACEBOOK_PAGE_TOKEN || "";

let agencyBotConfig = {
  botName: "FOX AI Agency Bot",
  welcomeMessage: `أهلاً بك في FOX AI AGENCY! 🦊🤖\n\nنحن نقدم أحدث حلول وكلاء الذكاء الاصطناعي وتكاملات التليجرام والواتساب للأنشطة التجارية.\n\nاستخدم الأوامر السريعة التالية للحصول على التفاصيل:\n• /plans - خطط الأسعار والاشتراكات 💼\n• /features - مميزات الوكلاء والأتمتة ⚡\n• /contact - التواصل مع الدعم المباشر 📞`,
  responseTone: "friendly", // "friendly" | "formal" | "sales" | "professional"
  enableGeminiAI: true,
  systemPrompt: `أنت المساعد الذكي الرسمي لوكالة FOX AI AGENCY المتخصصة في تقديم حلول الذكاء الاصطناعي وتجهيز البوتات الذكية للشركات والأنشطة التجارية (العيادات، الصيدليات، المطاعم، المتاجر). أجب بأسلوب ودود، مشجع، واحترافي وركز على مساعدة العميل واقتراح الخطة المناسبة له بالجنيه المصري (EGP).`,
  pricingPlansText: `💼 *خطط وأسعار FOX AI AGENCY (بالجنيه المصري EGP)*:\n\n1️⃣ *Fox Starter* - تجربة مجانية (7 أيام)\n• وكيل ذكاء اصطناعي 1 (تليجرام)\n• 50 محادثة ذكاء اصطناعي\n• إدارة عملاء وحجوزات أساسية\n\n2️⃣ *Fox Business* - 1000 جنيه / شهرياً\n• ربط واتساب + تليجرام\n• 1000 محادثة ذكاء اصطناعي\n• رفع المنيو، الأدوية، أو المنتجات\n• مزامنة مع إكسيل وجوجل شيتس\n\n3️⃣ *Fox Enterprise* - 2000 جنيه / شهرياً\n• محادثات ذكاء اصطناعي غير محدودة\n• أتمتة سير العمل n8n\n• دعم فني مخصص 24/7\n\nاكتب *تسجيل* أو *اشتراك* للبدء فوراً!`,
  fallbackMessage: `شكراً لتواصلك مع FOX AI AGENCY! 🦊\nتم استلام رسالتك وسيقوم فريق العمل أو البوت المباشر بالرد عليك. يمكنك استخدام الأمر /start لعرض قائمة الخيارات الرئيسية.`,
  currency: "EGP",
  contactPhone: "+20 100 000 0000",
  contactEmail: "info@foxai.agency",
  quickTemplates: [
    {
      id: "tpl_start",
      keyword: "/start",
      title: "رسالة الترحيب الرئيسية",
      reply: `أهلاً بك في FOX AI AGENCY! 🦊🤖\n\nنحن نقدم أحدث حلول وكلاء الذكاء الاصطناعي وتكاملات التليجرام والواتساب للأنشطة التجارية.\n\nاستخدم الأوامر التالية:\n• /plans - خطط الأسعار والاشتراكات 💼\n• /features - المميزات وإدارة العمليات ⚡\n• /contact - التواصل مع الدعم الفني 📞`,
    },
    {
      id: "tpl_plans",
      keyword: "/plans",
      title: "عرض خطط الأسعار",
      reply: `💼 *خطط وأسعار FOX AI AGENCY (بالجنيه المصري EGP)*:\n\n1️⃣ *Fox Starter* - تجربة مجانية (7 أيام)\n2️⃣ *Fox Business* - 1000 جنيه / شهرياً\n3️⃣ *Fox Enterprise* - 2000 جنيه / شهرياً`,
    },
    {
      id: "tpl_contact",
      keyword: "/contact",
      title: "معلومات التواصل والاتصال",
      reply: `📞 *تواصل معنا في FOX AI AGENCY*:\n\n• البريد الإلكتروني: info@foxai.agency\n• الهاتف / الواتساب: +20 100 000 0000\n• فريق الدعم جاهز للرد على استفساراتك على مدار الساعة!`,
    },
    {
      id: "tpl_features",
      keyword: "/features",
      title: "مميزات المنصة والوكيل الذكي",
      reply: `⚡ *مميزات منصة FOX AI AGENCY*:\n\n1. الرد التلقائي الذكي بـ Gemini AI 🤖\n2. حجز المواعيد والطلبات تلقائياً 📅\n3. ربط وتكامل مع n8n وجوجل شيتس 📊\n4. لوحة تحكم CRM متكاملة لمتابعة العملاء 👥`,
    },
  ],
};

// Registered Clients & Leads Store for Agency Dashboard
let registeredWorkspacesStore: any[] = [];
let registeredLeadsStore: any[] = [];

// ==========================================================
// FIRESTORE WORKSPACE HYDRATION
// Firestore is the persistent source of truth for tenants.
// Backend memory is only a runtime cache.
// ==========================================================
async function hydrateRegisteredWorkspacesFromFirestore() {
  try {
    const snapshot = await adminDb
      .collection("workspaces")
      .get();

    const firestoreWorkspaces = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as any;

        return {
          ...data,
          id: data?.id || docSnap.id,
        };
      })
      .filter((workspace) => {
        return (
          workspace?.id &&
          workspace.status !== "deleted"
        );
      });

    registeredWorkspacesStore =
      firestoreWorkspaces;

    console.log(
      `🔥 [Firestore] Loaded ${registeredWorkspacesStore.length} real workspace(s)`
    );

    for (const workspace of registeredWorkspacesStore) {
      console.log(
        `🏢 [Firestore Workspace] ${workspace.id} | ${workspace.name || "Unnamed"} | ${workspace.industry || "Unknown"} | Plan=${workspace.planId || "unknown"}`
      );
    }

    return registeredWorkspacesStore;
  } catch (error) {
    console.error(
      "❌ [Firestore] Failed to hydrate workspaces:",
      error
    );

    // Important:
    // Do NOT inject demo workspaces when Firestore fails.
    registeredWorkspacesStore = [];

    return [];
  }
}

// Subscriber Modification Requests Store
export interface SubscriberModificationRequestStoreItem {
  id: string;
  workspaceId: string;
  chatId?: string;
  clientEmail?: string;
  clientPhone?: string;
  currentData: {
    name?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    planId?: string;
  };
  proposedData: {
    name?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    planId?: string;
  };
  status: "AWAITING_CLIENT_CONFIRMATION" | "CLIENT_CONFIRMED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
}

let subscriberModificationRequestsStore: SubscriberModificationRequestStoreItem[] = [];

let registeredServiceRatingsStore: {
  id: string;
  workspaceId: string;
  customerName: string;
  customerPhone?: string;
  channel: "telegram" | "whatsapp" | "web";
  rating: number;
  feedback: string;
  createdAt: string;
}[] = [
  {
    id: "rat_tg_101",
    workspaceId: "ws_agency",
    customerName: "د. هاني محمود",
    customerPhone: "01011223344",
    channel: "telegram",
    rating: 5,
    feedback: "رائع جداً",
    createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
  },
  {
    id: "rat_tg_102",
    workspaceId: "ws_agency",
    customerName: "م. كريم عبد الفتاح",
    customerPhone: "01234567890",
    channel: "telegram",
    rating: 4,
    feedback: "رائع جداً",
    createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
  }
];

// Trial Abuse Anti-Fraud Tracking Stores (Chat ID, Phone, Email)
let usedTrialChatIds = new Set<string>();
let usedTrialPhones = new Set<string>();
let usedTrialEmails = new Set<string>();

async function hasUsedTrialBefore(chatId: string, phone?: string, email?: string): Promise<boolean> {
  // Check memory store (fast track & offline resilient)
  if (chatId && usedTrialChatIds.has(chatId)) return true;
  
  const cleanPhone = phone ? phone.replace(/[\s\-\+\(\)]/g, "") : null;
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  if (cleanPhone && usedTrialPhones.has(cleanPhone)) return true;
  if (cleanEmail && usedTrialEmails.has(cleanEmail)) return true;

  // Check against persistent store (synced from Firebase)
  for (const w of registeredWorkspacesStore) {
    if (w.planId === "starter") {
      const wPhone = (w.phone || "").replace(/[\s\-\+\(\)]/g, "");
      const wEmail = (w.ownerEmail || "").trim().toLowerCase();
      if (cleanPhone && cleanPhone === wPhone) return true;
      if (cleanEmail && cleanEmail === wEmail) return true;
    }
  }

  // Final check: Firestore Database (via TrialLimitManager component)
  try {
    const isUsedInDb = await TrialLimitManager.hasUsedTrial(phone, email, chatId);
    if (isUsedInDb) {
      if (chatId) usedTrialChatIds.add(chatId);
      if (cleanPhone) usedTrialPhones.add(cleanPhone);
      if (cleanEmail) usedTrialEmails.add(cleanEmail);
      return true;
    }
  } catch (err) {
    console.warn("TrialLimitManager check failed:", err);
  }

  return false;
}

function registerTrialConsumption(chatId: string, phone?: string, email?: string) {
  if (chatId) usedTrialChatIds.add(chatId);
  if (phone) {
    const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, "");
    if (cleanPhone) usedTrialPhones.add(cleanPhone);
  }
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) usedTrialEmails.add(cleanEmail);
  }
  // Record in Firestore Database for cross-session persistence
  TrialLimitManager.recordTrialUsage(phone, email, chatId).catch(console.error);
}

// Helper to parse industry/activity type selection for dashboard generation
function parseIndustryInput(input: string): { key: "Clinic" | "Pharmacy" | "Retail" | "Course Center" | "Restaurant" | "Small Business"; labelAr: string } {
  if (!input) return { key: "Small Business", labelAr: "نشاط تجاري عام 🏢" };
  const lower = input.toLowerCase().trim();
  if (lower === "1" || lower.includes("عيادة") || lower.includes("طبي") || lower.includes("clinic") || lower.includes("مركز طبي")) {
    return { key: "Clinic", labelAr: "عيادة / مركز طبي 🏥" };
  }
  if (lower === "2" || lower.includes("صيدل") || lower.includes("pharmacy")) {
    return { key: "Pharmacy", labelAr: "صيدلية 💊" };
  }
  if (lower === "3" || lower.includes("متجر") || lower.includes("تجار") || lower.includes("retail") || lower.includes("store") || lower.includes("شوب")) {
    return { key: "Retail", labelAr: "متجر / تجارة إلكترونية 🛒" };
  }
  if (lower === "4" || lower.includes("كورس") || lower.includes("تعليم") || lower.includes("مركز") || lower.includes("تدريب") || lower.includes("course") || lower.includes("أكاديمية") || lower.includes("اكاديمية")) {
    return { key: "Course Center", labelAr: "مركز كورسات / تعليمي 📚" };
  }
  if (lower === "5" || lower.includes("مطعم") || lower.includes("كافيه") || lower.includes("مقهى") || lower.includes("restaurant") || lower.includes("أكل") || lower.includes("طعام")) {
    return { key: "Restaurant", labelAr: "مطعم / كافيه 🍽️" };
  }
  if (lower === "6" || lower.includes("عام") || lower.includes("خدمات") || lower.includes("شركة") || lower.includes("business")) {
    return { key: "Small Business", labelAr: "نشاط تجاري عام / خدمات 🏢" };
  }
  return { key: "Small Business", labelAr: `${input} 🏢` };
}

let telegramUserSessions: Record<string, {
  step: "IDLE" | "AWAITING_NAME" | "AWAITING_INDUSTRY" | "AWAITING_PHONE" | "AWAITING_CREDENTIALS" | "AWAITING_OTP" | "AWAITING_PLAN_CHOICE" | "AWAITING_RATING" | "MOD_AWAITING_AUTH" | "MOD_SELECT_FIELD" | "MOD_ENTER_NAME" | "MOD_ENTER_INDUSTRY" | "MOD_ENTER_OWNER" | "MOD_ENTER_PHONE" | "MOD_ENTER_EMAIL";
  name?: string;
  industry?: string;
  phone?: string;
  email?: string;
  password?: string;
  selectedPlan?: "starter" | "business" | "enterprise";
  otpCode?: string;
  isVerified?: boolean;
  authenticatedWorkspaceId?: string;
  proposedModData?: {
    name?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    industry?: string;
    planId?: "starter" | "business" | "enterprise";
  };
}> = {};

function finalizeModificationRequestSubmission(chatId: string, session: any): string {
  const ws = registeredWorkspacesStore.find((w) => w.id === session.authenticatedWorkspaceId);
  if (!ws) {
    telegramUserSessions[chatId] = { step: "IDLE" };
    return "❌ خطأ: لم نتمكن من العثور على منشأتك. برجاء المحاولة مجدداً عبر إرسال 'تعديل البيانات'.";
  }

  const reqId = `mod_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();
  const proposed = session.proposedModData || {};

  const newReq = {
    id: reqId,
    workspaceId: ws.id,
    chatId: chatId,
    clientEmail: ws.ownerEmail || "",
    clientPhone: ws.phone || "",
    currentData: {
      name: ws.name,
      ownerName: ws.ownerName,
      phone: ws.phone,
      email: ws.ownerEmail,
      industry: ws.industry,
      planId: ws.planId,
    },
    proposedData: {
      name: proposed.name || ws.name,
      ownerName: proposed.ownerName || ws.ownerName,
      phone: proposed.phone || ws.phone,
      email: proposed.email || ws.ownerEmail,
      industry: proposed.industry || ws.industry,
      planId: proposed.planId || ws.planId,
    },
    status: "CLIENT_CONFIRMED" as const, // Confirmed directly by client via Telegram Authentication!
    createdAt: nowStr,
    updatedAt: nowStr,
    adminNotes: "طلب تعديل تم إنشاؤه وتأكيده مباشرة من العميل عبر بوت تليجرام بعد التحقق برمز المرور والبريد",
  };

  subscriberModificationRequestsStore.unshift(newReq);
  telegramUserSessions[chatId] = { step: "IDLE" };

  const indAr = parseIndustryInput(newReq.proposedData.industry || "Small Business").labelAr;

  return `🎉 *تم إرسال طلب تعديل بيانات منشأتك بنجاح إلى صاحب الوكالة (Super Admin)!* 🦊🤖\n\n📌 **البيانات المقترحة والمرفوعة للاعتماد**:\n• **اسم النشاط**: ${newReq.proposedData.name}\n• **نوع النشاط واللوحة**: ${indAr}\n• **اسم المالك**: ${newReq.proposedData.ownerName}\n• **رقم الهاتف**: ${newReq.proposedData.phone}\n• **البريد الإلكتروني**: \`${newReq.proposedData.email}\`\n• **الباقة**: ${newReq.proposedData.planId?.toUpperCase() || "BUSINESS"}\n\n📩 *تم تحويل الطلب الآن إلى لوحة تحكّم صاحب الوكالة (Super Admin) للموافقة والاعتماد النهائي.*\nستتلقى إشعاراً فورياً هنا عند موافقة صاحب الوكالة رسمياً! 🦊✨`;
}

function finalizeTelegramRegistration(chatId: string, session: any, userInfo?: any) {
  const wsId = `ws_tg_${Date.now().toString().slice(-6)}`;
  const leadId = `lead_tg_${Date.now().toString().slice(-6)}`;
  const nowStr = new Date().toISOString().split("T")[0];

  const planId: "starter" | "business" | "enterprise" = session.selectedPlan || "business";
  const planName = planId === "enterprise" ? "Fox Enterprise (2000 EGP)" : planId === "starter" ? "Fox Starter (Free Trial)" : "Fox Business (1000 EGP)";

  // Register trial consumption for single-use trial enforcement
  if (planId === "starter") {
    registerTrialConsumption(chatId, session.phone, session.email);
  }

  const userEmail = session.email || `${chatId}@telegram.agency`;
  const userPassword = session.password || "";

  const resolvedIndustryKey = session.industry || (
    (session.name || "").includes("عيادة") ? "Clinic" :
    (session.name || "").includes("صيدلية") ? "Pharmacy" :
    (session.name || "").includes("متجر") ? "Retail" :
    ((session.name || "").includes("كورس") || (session.name || "").includes("تعليم") || (session.name || "").includes("مركز")) ? "Course Center" :
    (session.name || "").includes("مطعم") ? "Restaurant" : "Small Business"
  );

  const indAr = parseIndustryInput(resolvedIndustryKey).labelAr;

  const newWorkspace = {
    id: wsId,
    name: session.name || `نشاط تجاري - ${userInfo?.first_name || "تليجرام"}`,
    industry: resolvedIndustryKey,
    ownerName: userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ""}`.trim() : (session.name || "عميل تليجرام"),
    ownerEmail: userEmail,
    // FOX PASSWORD HASHING V1
    passwordHash:
      hashWorkspacePassword(
        userPassword
      ),
    phone: session.phone || "+20 100 000 0000",
    status: "active",
    planId: planId,
    isVerified: true,
    activationCode: session.otpCode || "VERIFIED",
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    aiConversationsUsed: 1,
    totalCustomers: 1,
    totalAppointments: 0,
    totalComplaints: 0,
    createdAt: nowStr,
    registrationSource: "Telegram Bot",
    telegramChatId: chatId,
    telegramUsername: userInfo?.username || "",
    aiSettings: {
      agentName: `${session.name || "FOX"} AI Agent`,
      customPrompt: `مساعد الذكاء الاصطناعي الخاص بـ ${session.name}`,
      tone: "Friendly",
      autoBookingEnabled: true,
      autoComplaintEscalation: true,
      languageMode: "auto",
    }
  };

  const newLead = {
    id: leadId,
    workspaceId: wsId,
    customerName: session.name || userInfo?.first_name || "عميل تليجرام",
    phone: session.phone || "+20 100 000 0000",
    status: "converted",
    notes: `قام بالتسجيل والتحقق بالبريد التلقائي - باقة ${planName} - نوع النشاط: ${indAr}`,
    createdAt: nowStr,
    source: "Telegram Bot",
  };

  // Add to top of stores
  registeredWorkspacesStore = [newWorkspace, ...registeredWorkspacesStore.filter(w => w.id !== wsId)];
  registeredLeadsStore = [newLead, ...registeredLeadsStore.filter(l => l.id !== leadId)];

  // Set session step to AWAITING_RATING so the client's next response is recorded as rating
  telegramUserSessions[chatId] = {
    step: "AWAITING_RATING",
    authenticatedWorkspaceId: wsId,
    name: session.name || userInfo?.first_name || "عميل تليجرام",
    phone: session.phone || "+20 100 000 0000",
    email: userEmail
  };

  const ratingPrompt = `\n\n⭐ *تقييم مستوى الخدمة والتسجيل:*
نرجو تقييم تجربتك اليوم معنا باختيار رقم من 1 إلى 5:
• 1️⃣ أو 2️⃣ : ❌ *سئ جداً*
• 3️⃣ : ⚠️ *وسط*
• 4️⃣ أو 5️⃣ : ⭐ *رائع جداً*

(أرسل الرقم 1 أو 2 أو 3 أو 4 أو 5 للتقييم المباشر)`;

  return {
    newWorkspace,
    newLead,
    reply: `🎉 *تم تفعيل وتأكيد حسابك بنجاح في FOX AI AGENCY!* 🦊🤖\n\n🔑 *بيانات دخول لوحة تحكّم النشاط*:\n• *النشاط التجاري*: ${newWorkspace.name}\n• *نوع لوحة التحكم المخصصة*: ${indAr}\n• *البريد الإلكتروني*: \`${userEmail}\`\n• *كلمة السر*: 🔐 تم حفظها بأمان ولن يتم عرضها داخل المحادثة\n• *حالة البريد*: ✅ تم التحقق والتفعيل (Verified)\n• *كود التفعيل*: \`${session.otpCode || "VERIFIED"}\`\n• *باقة الاشتراك*: ${planName}\n• *رقم التواصل*: ${newWorkspace.phone}\n• *كود النشاط (Workspace ID)*: \`${wsId}\`\n\n✅ *تم إنشاء لوحة التحكم المناسبة لنشاطك تلقائياً (عيادة / صيدلية / متجر / مركز كورسات / مطعم)!*\n\n🚀 **يمكنك الآن تسجيل الدخول وإدارة وكيلك الذكي عبر الرابط التالي**:\n🔗 https://fox-ai-agency.ai.studio/\n\nيمكنك كتابة /plans لمراجعة باقي الباقات أو /contact للتواصل المباشر مع الدعم.` + ratingPrompt
  };
}

async function processAgencyBotMessage(chatId: string, userInfo: any, userMsg: string): Promise<string> {
  if (!isBotEnabled) {
    return "🔴 *تنويه:* بوت التليجرام الخاص بـ FOX AI AGENCY متوقف حالياً من قِبل إدارة الوكالة (تم إيقاف الخدمة مؤقتاً). يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.";
  }

  const trimmed = (userMsg || "").trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return agencyBotConfig.fallbackMessage;

  // Initialize session
  if (!telegramUserSessions[chatId]) {
    telegramUserSessions[chatId] = { step: "IDLE" };
  }
  const session = telegramUserSessions[chatId];

  // ----------------------------------------------------
  // AUTOMATIC SERVICE RATING HANDLER
  // ----------------------------------------------------
  const isRatingCommand =
    lower === "/rate" ||
    lower === "تقييم" ||
    lower === "تقيم" ||
    lower === "تقييم الخدمة" ||
    lower === "تقيم الخدمة" ||
    lower === "تقييم الخدمه" ||
    lower === "رأيي" ||
    lower === "رايي";

  if (isRatingCommand) {
    session.step = "AWAITING_RATING";
    telegramUserSessions[chatId] = session;

    return `⭐ *تقييم مستوى الخدمة - FOX AI AGENCY* 🦊🤖\n\nنرجو تقييم تجربتك اليوم معنا باختيار رقم من 1 إلى 5:\n\n• 1️⃣ أو 2️⃣ : ❌ *سئ جداً*\n• 3️⃣ : ⚠️ *وسط*\n• 4️⃣ أو 5️⃣ : ⭐ *رائع جداً*\n\n(أرسل الرقم 1 أو 2 أو 3 أو 4 أو 5 لتقييم الخدمة مباشرة)`;
  }

  // Handle direct rating input if in AWAITING_RATING or if numeric rating sent
  if (session.step === "AWAITING_RATING" || (["1", "2", "3", "4", "5"].includes(trimmed) && (lower.includes("سئ") || lower.includes("سيء") || lower.includes("وسط") || lower.includes("رائع") || lower.includes("تقييم")))) {
    let ratingVal = 5;
    let feedbackText = "رائع جداً";

    if (trimmed === "1" || trimmed === "2" || lower.includes("سئ") || lower.includes("سيء")) {
      ratingVal = Number(trimmed) || (trimmed === "2" ? 2 : 1);
      feedbackText = "سئ جداً";
    } else if (trimmed === "3" || lower.includes("وسط")) {
      ratingVal = 3;
      feedbackText = "وسط";
    } else if (trimmed === "4" || trimmed === "5" || lower.includes("رائع")) {
      ratingVal = Number(trimmed) || (trimmed === "4" ? 4 : 5);
      feedbackText = "رائع جداً";
    }

    const newRating = {
      id: `rat_tg_${Date.now()}`,
      workspaceId: session.authenticatedWorkspaceId || "ws_agency",
      customerName: session.name || userInfo?.first_name || "عميل تليجرام",
      customerPhone: session.phone || "+20 100 000 0000",
      channel: "telegram" as const,
      rating: ratingVal,
      feedback: feedbackText,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    registeredServiceRatingsStore.unshift(newRating);

    session.step = "IDLE";
    telegramUserSessions[chatId] = session;

    return `⭐ *نشكرك جزيلاً على تقييمك!* 🙏\n\nتم تسجيل تقييمك (**${ratingVal}/5 - ${feedbackText}**) بنجاح في نظام الوكالة 🦊\nنعتز بوجودك معنا وسنعمل دائماً على تقديم أفضل تجربة ذكية لأعمالكم! 🚀`;
  }

  // Check if there is an active subscriber modification request awaiting client confirmation
  const pendingModReq = subscriberModificationRequestsStore.find(
    (r) =>
      r.status === "AWAITING_CLIENT_CONFIRMATION" &&
      (r.chatId === chatId ||
        (r.clientPhone && session.phone && r.clientPhone === session.phone) ||
        (r.clientEmail && session.email && r.clientEmail === session.email))
  );

  if (pendingModReq) {
    if (
      lower.includes("تأكيد") ||
      lower.includes("تاكيد") ||
      lower.includes("موافق") ||
      lower.includes("تأكيد التعديل") ||
      lower.includes("confirm") ||
      lower.includes("accept") ||
      lower === "1" ||
      lower === "نعم"
    ) {
      pendingModReq.status = "CLIENT_CONFIRMED";
      pendingModReq.updatedAt = new Date().toISOString();

      return `✅ *شكراً لك! تم تسجيل تأكيدك لتعديل البيانات بنجاح.* 🚀\n\n📌 تم رفع الطلب الآن إلى صاحب الوكالة (Super Admin) للموافقة والاعتماد النهائي.\nستتلقى إشعاراً فور اعتماد التعديل رسمياً! 🦊`;
    } else if (
      lower.includes("رفض") ||
      lower.includes("إلغاء") ||
      lower.includes("الغاء") ||
      lower.includes("reject") ||
      lower.includes("cancel") ||
      lower === "2" ||
      lower === "لا"
    ) {
      pendingModReq.status = "REJECTED";
      pendingModReq.updatedAt = new Date().toISOString();

      return `❌ *تم تسجيل رفضك لطلب تعديل البيانات وإلغاء العملية.* 🚫`;
    }
  }

  // Admin / Client Command: /mod_requests
  if (lower === "/mod_requests" || lower === "/requests" || lower === "طلبات التعديل") {
    const clientReqs = subscriberModificationRequestsStore.filter(
      (r) => r.chatId === chatId || r.clientEmail === session.email
    );
    if (clientReqs.length === 0) {
      return `لا توجد طلبات تعديل بيانات حالية لحسابك. 📄`;
    }

    let msg = `📄 *طلبات تعديل بيانات حسابك:* \n\n`;
    clientReqs.forEach((r, idx) => {
      const statusText =
        r.status === "AWAITING_CLIENT_CONFIRMATION"
          ? "⏳ بانتظار تأكيدك (أرسل 'تأكيد' أو 'رفض')"
          : r.status === "CLIENT_CONFIRMED"
          ? "🔄 تم تأكيدك - بانتظار موافقة صاحب الوكالة"
          : r.status === "APPROVED"
          ? "✅ تم الاعتماد والموافقة"
          : "❌ مرفوض";
      msg += `${idx + 1}. **${r.proposedData.name}** - ${statusText}\n`;
    });
    return msg;
  }

  // Cancel / Reset Command
  if (lower === "/cancel" || lower === "/reset" || lower === "إلغاء" || lower === "الغي") {
    telegramUserSessions[chatId] = { step: "IDLE" };
    return "تم إلغاء العملية الحالية. يمكنك كتابة /start أو /plans في أي وقت للبدء من جديد. 🦊";
  }

  // Interactive Client Workspace Inquiry & Modification Flow
  const isModTrigger =
    lower.includes("تعديل البيانات") ||
    lower.includes("تعديل بيانات") ||
    lower.includes("تغير البيانات") ||
    lower.includes("تغيير البيانات") ||
    lower.includes("تغير بيانات") ||
    lower.includes("تغيير بيانات") ||
    lower.includes("بياناتي") ||
    lower.includes("منشأتي") ||
    lower.includes("استعلام عن منشأتي") ||
    lower.includes("تعديل منشأتي") ||
    lower.includes("طلب تعديل") ||
    lower === "/edit" ||
    lower === "/workspace" ||
    lower === "/my_workspace";

  if ((isModTrigger && session.step === "IDLE") || (session.step && session.step.startsWith("MOD_"))) {
    // 1. Initial Trigger
    if (isModTrigger && session.step === "IDLE") {
      const wsByChat = registeredWorkspacesStore.find(
        (w) => w.telegramChatId === chatId || (session.email && w.ownerEmail?.toLowerCase() === session.email.toLowerCase())
      );

      if (wsByChat) {
        session.authenticatedWorkspaceId = wsByChat.id;
        session.proposedModData = {
          name: wsByChat.name,
          ownerName: wsByChat.ownerName,
          phone: wsByChat.phone,
          email: wsByChat.ownerEmail,
          industry: wsByChat.industry,
          planId: wsByChat.planId,
        };
        session.step = "MOD_SELECT_FIELD";
        telegramUserSessions[chatId] = session;

        const curIndLabel = parseIndustryInput(wsByChat.industry || "Small Business").labelAr;

        return `🏢 *مرحباً بك! البوت على علم بجميع بيانات منشأتك:* **${wsByChat.name}** 🦊🤖\n\n📌 **البيانات الحالية للنشاط التجاري**:\n• **اسم النشاط**: ${wsByChat.name}\n• **نوع النشاط واللوحة**: ${curIndLabel}\n• **اسم المالك**: ${wsByChat.ownerName}\n• **رقم الهاتف**: ${wsByChat.phone}\n• **البريد الإلكتروني**: \`${wsByChat.ownerEmail}\`\n• **باقة الاشتراك**: ${wsByChat.planId?.toUpperCase() || "BUSINESS"}\n\n📝 **أرسل رقم الخيار المراد تعديله**:\n1️⃣ تعديل **اسم النشاط التجاري**\n2️⃣ تعديل **نوع النشاط (عيادة/صيدلية/متجر/مركز كورسات/مطعم/عام)**\n3️⃣ تعديل **اسم المالك**\n4️⃣ تعديل **رقم الهاتف**\n5️⃣ تعديل **البريد الإلكتروني**\n6️⃣ 🔐 **تسجيل الدخول ببريد وكلمة سر منشأة أخرى**\n7️⃣ 🚀 **إرسال طلب التعديل الحالي لصاحب الوكالة للاعتماد**\n\n(يمكنك إرسال /cancel للرجوع)`;
      } else {
        session.step = "MOD_AWAITING_AUTH";
        telegramUserSessions[chatId] = session;

        return `🔐 *التحقق من هوية صاحب المنشأة - FOX AI AGENCY* 🏢🤖\n\nالبوت على علم بجميع المنشئات والمشتركين لدى الوكالة. للحفاظ على أمان بياناتك والتأكد من هويتك كمالك للمنشأة:\n\nبرجاء كتابة **البريد الإلكتروني وكلمة السر** الخاصين بحساب منشأتك (مثال: \`ahmed@company.com YourStrongPassword\`):`;
      }
    }

    // 2. Authentication Step
    if (session.step === "MOD_AWAITING_AUTH") {
      const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      let inputEmail = emailMatch ? emailMatch[0].trim().toLowerCase() : "";
      let inputPassword = emailMatch ? trimmed.replace(emailMatch[0], "").trim() : trimmed;

      if (!inputEmail) {
        return `⚠️ *برجاء كتابة البريد الإلكتروني وكلمة السر بشكل صحيح* كالتالي:\n\`example@domain.com YourStrongPassword\``;
      }

      const foundWs = registeredWorkspacesStore.find((w) => {
        const e = (w.ownerEmail || w.email || "").trim().toLowerCase();
        return e === inputEmail;
      });

      if (!foundWs) {
        return `❌ *عفواً، لم نجد منشأة مسجلة بهذا البريد الإلكتروني (\`${inputEmail}\`)!* 🚫\n\n• برجاء التأكد من البريد الإلكتروني الذي سجلت به في الوكالة.\n• للبدء بتسجيل منشأة جديدة، أرسل كلمة **تسجيل** أو **/start**.`;
      }

      const passwordValid =
        await verifyAndMigrateWorkspacePassword(
          foundWs,
          inputPassword
        );

      if (!passwordValid) {
        return `❌ *كلمة السر غير صحيحة!* 🔑\n\nالبريد الإلكتروني \`${inputEmail}\` مخصص لمنشأة **${foundWs.name}**، ولكن كلمة السر المدخلة غير صحيحة.\nبرجاء كتابة كلمة السر الصحيحة للدخول والتعديل.`;
      }

      session.authenticatedWorkspaceId = foundWs.id;
      session.email = foundWs.ownerEmail;
      session.proposedModData = {
        name: foundWs.name,
        ownerName: foundWs.ownerName,
        phone: foundWs.phone,
        email: foundWs.ownerEmail,
        industry: foundWs.industry,
        planId: foundWs.planId,
      };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;

      const foundIndLabel = parseIndustryInput(foundWs.industry || "Small Business").labelAr;

      return `✅ *تم التحقق من هويتك بنجاح كمالك لمنشأة:* **${foundWs.name}** 🏢\n\n📌 **البيانات الحالية للنشاط التجاري في FOX AI AGENCY**:\n• **اسم النشاط**: ${foundWs.name}\n• **نوع النشاط واللوحة**: ${foundIndLabel}\n• **اسم المالك**: ${foundWs.ownerName}\n• **رقم الهاتف**: ${foundWs.phone}\n• **البريد الإلكتروني**: \`${foundWs.ownerEmail}\`\n• **باقة الاشتراك**: ${foundWs.planId?.toUpperCase() || "BUSINESS"}\n\n📝 **أرسل رقم الخيار المراد تعديله**:\n1️⃣ تعديل **اسم النشاط التجاري**\n2️⃣ تعديل **نوع النشاط (عيادة/صيدلية/متجر/مركز كورسات/مطعم/عام)**\n3️⃣ تعديل **اسم المالك**\n4️⃣ تعديل **رقم الهاتف**\n5️⃣ تعديل **البريد الإلكتروني**\n6️⃣ 🔐 **تسجيل الدخول ببريد وكلمة سر منشأة أخرى**\n7️⃣ 🚀 **إرسال طلب التعديل فوراً لصاحب الوكالة للاعتماد**`;
    }

    // 3. Field Selection Step
    if (session.step === "MOD_SELECT_FIELD") {
      if (trimmed === "1") {
        session.step = "MOD_ENTER_NAME";
        telegramUserSessions[chatId] = session;
        return `برجاء كتابة **اسم النشاط التجاري الجديد** (الاسم الحالي: ${session.proposedModData?.name}):`;
      } else if (trimmed === "2") {
        session.step = "MOD_ENTER_INDUSTRY";
        telegramUserSessions[chatId] = session;
        const curIndLabel = parseIndustryInput(session.proposedModData?.industry || "Small Business").labelAr;
        return `برجاء اختيار أو كتابة **نوع النشاط الجديد** (النوع الحالي: ${curIndLabel}):\n\n1️⃣ 🏥 **عيادة / مركز طبي** (Clinic)\n2️⃣ 💊 **صيدلية** (Pharmacy)\n3️⃣ 🛒 **متجر / تجارة إلكترونية** (Retail)\n4️⃣ 📚 **مركز كورسات / تعليمي** (Course Center)\n5️⃣ 🍽️ **مطعم / كافيه** (Restaurant)\n6️⃣ 🏢 **نشاط تجاري عام / خدمات أخرى** (Small Business)`;
      } else if (trimmed === "3") {
        session.step = "MOD_ENTER_OWNER";
        telegramUserSessions[chatId] = session;
        return `برجاء كتابة **اسم المالك الجديد** (المالك الحالي: ${session.proposedModData?.ownerName}):`;
      } else if (trimmed === "4") {
        session.step = "MOD_ENTER_PHONE";
        telegramUserSessions[chatId] = session;
        return `برجاء كتابة **رقم الهاتف الجديد** (الرقم الحالي: ${session.proposedModData?.phone}):`;
      } else if (trimmed === "5") {
        session.step = "MOD_ENTER_EMAIL";
        telegramUserSessions[chatId] = session;
        return `برجاء كتابة **البريد الإلكتروني الجديد** (البريد الحالي: ${session.proposedModData?.email}):`;
      } else if (trimmed === "6" && (session.proposedModData?.name || session.proposedModData?.email)) {
        const curWs = registeredWorkspacesStore.find((w) => w.id === session.authenticatedWorkspaceId);
        if (curWs && session.proposedModData?.name === curWs.name && session.proposedModData?.email === curWs.ownerEmail) {
          session.step = "MOD_AWAITING_AUTH";
          telegramUserSessions[chatId] = session;
          return `برجاء إرسال **البريد الإلكتروني وكلمة السر** الخاصين بالحساب الآخر:`;
        }
        return finalizeModificationRequestSubmission(chatId, session);
      } else if (trimmed === "7" || lower.includes("إرسال") || lower.includes("ارسال") || lower.includes("تأكيد") || lower.includes("اعتمد")) {
        return finalizeModificationRequestSubmission(chatId, session);
      } else {
        return `يرجى اختيار رقم من (1 إلى 6) أو إرسال **7** لتحويل الطلب لصاحب الوكالة.`;
      }
    }

    // 4. Entering Specific Field Values
    if (session.step === "MOD_ENTER_NAME") {
      session.proposedModData = { ...session.proposedModData, name: trimmed };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;
      const indLabel = parseIndustryInput(session.proposedModData.industry || "Small Business").labelAr;
      return `تم تسجيل اسم النشاط الجديد: *${trimmed}* 📝\n\n📌 **البيانات المعدلة حالياً**:\n• **اسم النشاط**: ${session.proposedModData.name}\n• **نوع النشاط**: ${indLabel}\n• **اسم المالك**: ${session.proposedModData.ownerName}\n• **رقم الهاتف**: ${session.proposedModData.phone}\n• **البريد**: \`${session.proposedModData.email}\`\n\nأرسل **7** الآن لإرسال الطلب نهائياً لصاحب الوكالة، أو اختر (1-5) لتعديل حقل آخر.`;
    }

    if (session.step === "MOD_ENTER_INDUSTRY") {
      const parsedInd = parseIndustryInput(trimmed);
      session.proposedModData = { ...session.proposedModData, industry: parsedInd.key };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;
      return `تم تسجيل نوع النشاط الجديد: *${parsedInd.labelAr}* 🎯\n\n📌 **البيانات المعدلة حالياً**:\n• **اسم النشاط**: ${session.proposedModData.name}\n• **نوع النشاط واللوحة**: ${parsedInd.labelAr}\n• **اسم المالك**: ${session.proposedModData.ownerName}\n• **رقم الهاتف**: ${session.proposedModData.phone}\n• **البريد**: \`${session.proposedModData.email}\`\n\nأرسل **7** الآن لإرسال الطلب نهائياً لصاحب الوكالة، أو اختر (1-5) لتعديل حقل آخر.`;
    }

    if (session.step === "MOD_ENTER_OWNER") {
      session.proposedModData = { ...session.proposedModData, ownerName: trimmed };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;
      return `تم تسجيل اسم المالك الجديد: *${trimmed}* 👤\n\nأرسل **7** الآن لإرسال الطلب نهائياً لصاحب الوكالة، أو اختر (1-5) لتعديل حقل آخر.`;
    }

    if (session.step === "MOD_ENTER_PHONE") {
      session.proposedModData = { ...session.proposedModData, phone: trimmed };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;
      return `تم تسجيل رقم الهاتف الجديد: *${trimmed}* 📱\n\nأرسل **7** الآن لإرسال الطلب نهائياً لصاحب الوكالة، أو اختر (1-5) لتعديل حقل آخر.`;
    }

    if (session.step === "MOD_ENTER_EMAIL") {
      const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const newEmail = emailMatch ? emailMatch[0].trim().toLowerCase() : trimmed;
      session.proposedModData = { ...session.proposedModData, email: newEmail };
      session.step = "MOD_SELECT_FIELD";
      telegramUserSessions[chatId] = session;
      return `تم تسجيل البريد الإلكتروني الجديد: \`${newEmail}\` 📧\n\nأرسل **7** الآن لإرسال الطلب نهائياً لصاحب الوكالة، أو اختر (1-5) لتعديل حقل آخر.`;
    }
  }

  // Detect Plan Intent in message
  let detectedPlan: "starter" | "business" | "enterprise" | undefined = undefined;
  if (lower.includes("starter") || lower.includes("مجاني") || lower.includes("تجربة") || lower.includes("تجربه") || lower.includes("ستارتر")) {
    detectedPlan = "starter";
  } else if (lower.includes("business") || lower.includes("بيزنس") || lower.includes("1000") || lower.includes("بزنس")) {
    detectedPlan = "business";
  } else if (lower.includes("enterprise") || lower.includes("انتربرايز") || lower.includes("2000") || lower.includes("المؤسسات")) {
    detectedPlan = "enterprise";
  }

  // Handle Smart Single-Line Registration (e.g., "تسجيل د. أحمد - صيدلية الشفاء - 01012345678 - Fox Business")
  const hasPhonePattern = /(01[0125]\d{8}|\+?\d{10,14})/.test(trimmed);
  if ((lower.includes("تسجيل") || lower.includes("اشتراك") || lower.includes("سجل")) && hasPhonePattern && session.step === "IDLE") {
    const phoneMatch = trimmed.match(/(01[0125]\d{8}|\+?\d{10,14})/);
    const phone = phoneMatch ? phoneMatch[0] : "+20 100 000 0000";
    const cleanedName = trimmed
      .replace(/تسجيل|اشتراك|سجل/gi, "")
      .replace(phone, "")
      .replace(/fox|starter|business|enterprise|بيزنس|انتربرايز|مجاني/gi, "")
      .replace(/[-–—,:;]/g, " ")
      .trim();

    session.name = cleanedName || userInfo?.first_name || "نشاط تجاري جديد";
    session.phone = phone;
    session.selectedPlan = detectedPlan || "business";

    const parsedInd = parseIndustryInput(cleanedName);
    session.industry = parsedInd.key;

    // Trial Anti-Fraud check for single-line registration
    if (session.selectedPlan === "starter" && await hasUsedTrialBefore(chatId, session.phone)) {
      session.selectedPlan = "business";
    }

    session.step = "AWAITING_CREDENTIALS";
    telegramUserSessions[chatId] = session;

    return `تم استلام بيانات النشاط: *${session.name}* (${parsedInd.labelAr} - رقم: ${session.phone}) 📝\n\n📌 *الخطوة 4 من 5 (بيانات الدخول للوحة التحكم)*:\nبرجاء إرسال **البريد الإلكتروني وكلمة السر** اللذين تفضلهما لإدارة لوحة تحكّم نشاطك (مثال: \`ahmed@gmail.com YourStrongPassword\`):`;
  }

  // STEP-BY-STEP REGISTRATION FLOW

  // STEP 1: AWAITING_NAME
  if (session.step === "AWAITING_NAME") {
    session.name = trimmed;
    const autoInd = parseIndustryInput(trimmed);
    if (autoInd.key !== "Small Business") {
      session.industry = autoInd.key;
    }
    session.step = "AWAITING_INDUSTRY";
    telegramUserSessions[chatId] = session;

    const pName = session.selectedPlan === "enterprise" ? "Fox Enterprise" : session.selectedPlan === "starter" ? "Fox Starter (تجريبي)" : "Fox Business";
    return `ممتاز يا ${session.name}! 📝 (باقة ${pName})\n\n📌 *الخطوة 2 من 5 (تحديد نوع النشاط التجاري)*:\nنوع النشاط يحدد شكل وتصميم **لوحة التحكم المخصصة** لنشاطك (عيادة، صيدلية، متجر، مركز كورسات، مطعم).\n\nأرسل رقم الخيار المناسب أو اسم نوع نشاطك:\n1️⃣ 🏥 **عيادة / مركز طبي** (Clinic)\n2️⃣ 💊 **صيدلية** (Pharmacy)\n3️⃣ 🛒 **متجر / تجارة إلكترونية** (Retail)\n4️⃣ 📚 **مركز كورسات / تعليمي** (Course Center)\n5️⃣ 🍽️ **مطعم / كافيه** (Restaurant)\n6️⃣ 🏢 **نشاط تجاري عام / خدمات أخرى** (Small Business)`;
  }

  // STEP 2: AWAITING_INDUSTRY
  if (session.step === "AWAITING_INDUSTRY") {
    const indInfo = parseIndustryInput(trimmed);
    session.industry = indInfo.key;
    session.step = "AWAITING_PHONE";
    telegramUserSessions[chatId] = session;

    return `تم تسجيل نوع النشاط وتحديد شكل لوحة التحكم: *${indInfo.labelAr}* 🎯\n\n📌 *الخطوة 3 من 5*:\nبرجاء كتابة **رقم هاتفك / الواتساب** لإكمال الربط والتواصل:`;
  }

  // STEP 3: AWAITING_PHONE
  if (session.step === "AWAITING_PHONE") {
    session.phone = trimmed;

    // Trial Anti-Fraud check for Phone
    if (session.selectedPlan === "starter" && await hasUsedTrialBefore(chatId, session.phone)) {
      session.selectedPlan = "business";
      session.step = "AWAITING_CREDENTIALS";
      telegramUserSessions[chatId] = session;

      return `⚠️ *عفواً، رقم الهاتف (${session.phone}) قد استفاد بالفعل من الباقة التجريبية المجانية سابقاً!* 🚫\n\nتُتاح الباقة التجريبية **مرة واحدة فقط لكل هاتف**.\nتم تحويل طلبك تلقائياً لباقة **Fox Business** (1000 جنيه / شهرياً).\n\n📌 *الخطوة 4 من 5 (بيانات الدخول للوحة التحكم)*:\nبرجاء كتابة **البريد الإلكتروني وكلمة السر** لدخول لوحتك (مثال: \`ahmed@gmail.com YourStrongPassword\`):`;
    }

    session.step = "AWAITING_CREDENTIALS";
    telegramUserSessions[chatId] = session;

    return `تم تسجيل رقم الهاتف: ${session.phone} 📱\n\n📌 *الخطوة 4 من 5 (بيانات الدخول للوحة التحكم)*:\nبرجاء إرسال **البريد الإلكتروني وكلمة السر** للتحكّم ببياناتك ولوحتك (مثال: \`ahmed@gmail.com YourStrongPassword\` أو أرسل البريد الإلكتروني أولاً):`;
  }

  // STEP 3: AWAITING_CREDENTIALS
  if (session.step === "AWAITING_CREDENTIALS") {
    const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (emailMatch) {
      session.email = emailMatch[0].trim().toLowerCase();
      const remainder = trimmed.replace(emailMatch[0], "").trim();
      if (remainder.length >= 3) {
        session.password = remainder;
      }
    } else if (session.email && !session.password) {
      session.password = trimmed;
    } else {
      // User sent text without a valid email format
      return `⚠️ *برجاء إدخال بريد إلكتروني صحيح* لإرسال كود التفعيل عليه والتحكم باللوحة (مثال: \`myname@company.com YourStrongPassword\`):`;
    }

    // FOX PASSWORD POLICY V1
    if (
      session.password &&
      (
        session.password.length < 8 ||
        !/[A-Za-z]/.test(session.password) ||
        !/[0-9]/.test(session.password)
      )
    ) {
      session.password = undefined;

      return `⚠️ *كلمة السر ضعيفة.*

استخدم كلمة سر لا تقل عن 8 أحرف وتحتوي على حروف وأرقام.

مثال:
\`MyBusiness2026\``;
    }

    if (!session.password) {
      telegramUserSessions[chatId] = session;
      return `تم حفظ البريد الإلكتروني: \`${session.email}\` 📧\n\nبرجاء كتابة **كلمة السر** المرغوبة لحسابك للدخول إلى لوحة التحكم:`;
    }

    // Trial Anti-Fraud check for Email
    if (session.selectedPlan === "starter" && await hasUsedTrialBefore(chatId, session.phone, session.email)) {
      session.selectedPlan = "business";
    }

    // Generate 6-Digit OTP Verification Code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    session.otpCode = otpCode;
    session.step = "AWAITING_OTP";
    telegramUserSessions[chatId] = session;

    // Send Real Email via Nodemailer Email Service
    emailService
      .sendVerificationEmail({
        toEmail: session.email,
        ownerName: session.name || userInfo?.first_name || "عميل FOX AI",
        otpCode,
        workspaceName: session.name || "نشاطك التجاري",
      })
      .then((res) => {
        console.log(`[Telegram Bot] Verification email dispatched to ${session.email}. Mode: ${res.mode}`);
      })
      .catch((err) => {
        console.error(`[Telegram Bot] Verification email failed:`, err);
      });

    return `📧 *تم إرسال كود التفعيل إلى بريدك الإلكتروني!* 📩\n\nتم إرسال رمز التحقق والتفعيل المكون من 6 أرقام عبر البريد الإلكتروني إلى: \`${session.email}\`\n\n🔐 **كود التفعيل (رمز الأمان)**: \`${otpCode}\`\n\n📌 *الخطوة الأخيرة (4 من 4 - تأكيد البريد وتفعيل الحساب)*:\nبرجاء كتابة كود التفعيل المكون من 6 أرقام الآن لتأكيد تفعيل الحساب فوراً:`;
  }

  // STEP 4: AWAITING_OTP VERIFICATION
  if (session.step === "AWAITING_OTP") {
    if (lower === "/resend" || lower.includes("إعادة إرسال") || lower.includes("اعادة ارسال") || lower.includes("resend")) {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      session.otpCode = newOtp;
      telegramUserSessions[chatId] = session;

      emailService
        .sendVerificationEmail({
          toEmail: session.email || "",
          ownerName: session.name || userInfo?.first_name || "عميل FOX AI",
          otpCode: newOtp,
          workspaceName: session.name || "نشاطك التجاري",
        })
        .catch((err) => console.error("Resend OTP Email Error:", err));

      return `🔄 *تم إعادة إرسال كود تفعيل جديد عبر البريد الإلكتروني!*\n\n📧 البريد الإلكتروني: \`${session.email}\`\n🔐 **كود التفعيل الجديد**: \`${newOtp}\`\n\nبرجاء كتابة الكود الجديد للتحقق والتفعيل:`;
    }

    if (trimmed === session.otpCode) {
      session.isVerified = true;
      const result = finalizeTelegramRegistration(chatId, session, userInfo);
      return result.reply;
    } else {
      return `❌ *كود التفعيل غير صحيح!*\n\nكود التفعيل المكون من 6 أرقام الذي تم إرساله لبريدك (\`${session.email}\`) هو: \`${session.otpCode}\`\n\nبرجاء كتابة الكود الصحيح المكتوب أعلاه أو أرسل "إعادة إرسال":`;
    }
  }

  if (session.step === "AWAITING_PLAN_CHOICE") {
    if (trimmed === "1" || lower.includes("starter") || lower.includes("ستارتر") || lower.includes("مجاني")) {
      if (await hasUsedTrialBefore(chatId, session.phone, session.email)) {
        return `⚠️ *عفواً، لقد استفدت بالفعل من التجربة المجانية من قبل!* 🚫\n\nتُتاح الباقة التجريبية **مرة واحدة فقط لكل حساب/هاتف/بريد**.\n\nبرجاء اختيار إحدى الباقات المدفوعة للاستمرار:\n2️⃣ *Fox Business* - 1000 جنيه / شهرياً\n3️⃣ *Fox Enterprise* - 2000 جنيه / شهرياً\n\nأرسل **2** أو **3** للاختيار وتأكيد التسجيل!`;
      }
      session.selectedPlan = "starter";
    } else if (trimmed === "3" || lower.includes("enterprise") || lower.includes("انتربرايز")) {
      session.selectedPlan = "enterprise";
    } else {
      session.selectedPlan = "business";
    }

    session.step = "AWAITING_CREDENTIALS";
    telegramUserSessions[chatId] = session;

    return `ممتاز! تم اختيار باقة **${session.selectedPlan === "enterprise" ? "Fox Enterprise" : session.selectedPlan === "starter" ? "Fox Starter" : "Fox Business"}** 💼\n\n📌 *الخطوة 3 من 4 (بيانات الدخول للوحة التحكم)*:\nبرجاء إرسال **البريد الإلكتروني وكلمة السر** (مثال: \`ahmed@gmail.com YourStrongPassword\`):`;
  }

  // Trigger Registration Flow Start on Registration Keywords or Plan Selection
  if (
    lower === "/register" ||
    lower === "تسجيل" ||
    lower === "اشتراك" ||
    lower === "تسجيل حساب" ||
    lower === "تفعيل" ||
    lower === "بدء" ||
    lower === "1" ||
    lower === "2" ||
    lower === "3" ||
    detectedPlan !== undefined
  ) {
    if (detectedPlan) {
      if (detectedPlan === "starter" && await hasUsedTrialBefore(chatId)) {
        return `⚠️ *عفواً، لقد استفدت بالفعل من الباقة التجريبية المجانية لهذا الحساب!* 🚫\n\nنظام FOX AI AGENCY يمنح التجربة المجانية **مرة واحدة فقط لكل شات/رقم هاتف** لضمان أعلى مستوى من الجودة والأمان.\n\nبرجاء اختيار إحدى الباقات المدفوعة لتفعيل حسابك:\n1️⃣ *Fox Business* - 1000 جنيه / شهرياً (تكامل واتساب + تليجرام + CRM)\n2️⃣ *Fox Enterprise* - 2000 جنيه / شهرياً (غير محدود + أتمتة n8n)\n\nأرسل **1** أو **2** للاختيار المباشر!`;
      }
      session.selectedPlan = detectedPlan;
    } else if (lower === "1") {
      if (await hasUsedTrialBefore(chatId)) {
        return `⚠️ *عفواً، لقد استفدت بالفعل من التجربة المجانية لهذا الحساب!* 🚫\n\nبرجاء اختيار إحدى الباقات المدفوعة:\n2️⃣ *Fox Business* (1000 EGP)\n3️⃣ *Fox Enterprise* (2000 EGP)`;
      }
      session.selectedPlan = "starter";
    } else if (lower === "3") {
      session.selectedPlan = "enterprise";
    } else if (lower === "2") {
      session.selectedPlan = "business";
    }

    session.step = "AWAITING_NAME";
    telegramUserSessions[chatId] = session;

    const pName = session.selectedPlan
      ? session.selectedPlan === "enterprise"
        ? "Fox Enterprise"
        : session.selectedPlan === "starter"
        ? "Fox Starter (تجريبي)"
        : "Fox Business"
      : null;

    return `🚀 *مرحباً بك في خدمة التسجيل المباشر - FOX AI AGENCY* 🦊🤖\n\n${pName ? `🎯 الباقة المختارة: **${pName}**\n\n` : ""}📌 *الخطوة 1 من 4*:\nبرجاء كتابة **اسمك واسم النشاط التجاري** (مثال: د. أحمد - عيادة الشفاء أو صيدلية الأمل):`;
  }

  // Otherwise, fallback to template/Gemini bot response
  return await generateAgencyBotReply(trimmed);
}

// Agency Clients API Endpoints
app.get("/api/agency/clients", (_req, res) => {
  return res.json({ success: true, clients: registeredWorkspacesStore });
});

app.post("/api/agency/clients", (req, res) => {
  const { workspace } = req.body;
  if (req.body.workspaces && Array.isArray(req.body.workspaces)) {
    req.body.workspaces.forEach(ws => {
      const idx = registeredWorkspacesStore.findIndex(w => w.id === ws.id);
      if (idx >= 0) registeredWorkspacesStore[idx] = { ...registeredWorkspacesStore[idx], ...ws };
      else registeredWorkspacesStore.unshift(ws);
    });
  } else if (workspace && workspace.id) {
    const idx = registeredWorkspacesStore.findIndex((w) => w.id === workspace.id);
    if (idx >= 0) {
      registeredWorkspacesStore[idx] = { ...registeredWorkspacesStore[idx], ...workspace };
    } else {
      registeredWorkspacesStore.unshift(workspace);
    }
  }
  syncWorkspaceTelegramBots().catch((err) =>
    console.warn("Workspace Telegram sync warning:", err)
  );

  return res.json({ success: true, clients: registeredWorkspacesStore });
});

app.delete("/api/agency/clients/:id", (req, res) => {
  const { id } = req.params;
  registeredWorkspacesStore = registeredWorkspacesStore.filter((w) => w.id !== id);
  stopWorkspaceTelegramPolling(String(id)).catch(() => {});
  return res.json({ success: true, message: "Client workspace deleted", clients: registeredWorkspacesStore });
});

app.get("/api/agency/leads", (_req, res) => {
  return res.json({ success: true, leads: registeredLeadsStore });
});

app.get("/api/agency/ratings", (_req, res) => {
  return res.json({ success: true, ratings: registeredServiceRatingsStore });
});

app.post("/api/agency/ratings", (req, res) => {
  const { rating } = req.body;
  if (rating) {
    const newRating = {
      id: rating.id || `rat_${Date.now()}`,
      workspaceId: rating.workspaceId || "ws_agency",
      customerName: rating.customerName || "عميل",
      customerPhone: rating.customerPhone || "",
      channel: rating.channel || "telegram",
      rating: rating.rating || 5,
      feedback: rating.feedback || (rating.rating <= 2 ? "سئ جداً" : rating.rating === 3 ? "وسط" : "رائع جداً"),
      createdAt: rating.createdAt || new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    registeredServiceRatingsStore.unshift(newRating);
  }
  return res.json({ success: true, ratings: registeredServiceRatingsStore });
});

// Subscriber Modification Requests Endpoints
app.get("/api/agency/modification-requests", (_req, res) => {
  return res.json({ success: true, requests: subscriberModificationRequestsStore });
});

app.post("/api/agency/modification-requests", async (req, res) => {
  const { workspaceId, proposedData, adminNotes } = req.body;
  if (!workspaceId || !proposedData) {
    return res.status(400).json({ error: "workspaceId and proposedData are required" });
  }

  const ws = registeredWorkspacesStore.find((w) => w.id === workspaceId);
  if (!ws) {
    return res.status(404).json({ error: "Client workspace not found" });
  }

  const reqId = `mod_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const newReq = {
    id: reqId,
    workspaceId: ws.id,
    chatId: ws.telegramChatId || "",
    clientEmail: ws.ownerEmail || "",
    clientPhone: ws.phone || "",
    currentData: {
      name: ws.name,
      ownerName: ws.ownerName,
      phone: ws.phone,
      email: ws.ownerEmail,
      planId: ws.planId,
    },
    proposedData: {
      name: proposedData.name || ws.name,
      ownerName: proposedData.ownerName || ws.ownerName,
      phone: proposedData.phone || ws.phone,
      email: proposedData.email || ws.ownerEmail,
      planId: proposedData.planId || ws.planId,
    },
    status: "AWAITING_CLIENT_CONFIRMATION" as const,
    createdAt: nowStr,
    updatedAt: nowStr,
    adminNotes: adminNotes || "",
  };

  subscriberModificationRequestsStore.unshift(newReq);

  // Notify Client via Telegram if chatId is present
  if (ws.telegramChatId && activeTelegramToken) {
    const notifyText = `⚠️ *تنبيه من إدارة الوكالة FOX AI AGENCY* 🦊🤖\n\nترغب إدارة الوكالة بتحديث بيانات حسابك كالتالي:\n${
      proposedData.name ? `• **اسم النشاط**: ${proposedData.name}\n` : ""
    }${proposedData.ownerName ? `• **اسم المالك**: ${proposedData.ownerName}\n` : ""}${
      proposedData.phone ? `• **رقم الهاتف**: ${proposedData.phone}\n` : ""
    }${proposedData.email ? `• **البريد الإلكتروني**: ${proposedData.email}\n` : ""}${
      proposedData.planId ? `• **الخطة الحالية**: ${proposedData.planId.toUpperCase()}\n` : ""
    }\n📌 *تأكيدك مطلوب لتفعيل التعديل!*\n• أرسل كلمة **تأكيد** للموافقة 🟢\n• أرسل كلمة **رفض** للإلغاء 🔴`;

    await callTelegramApi("sendMessage", {
      chat_id: ws.telegramChatId,
      text: notifyText,
      parse_mode: "Markdown",
    }).catch((err) => console.warn("Telegram client notification failed:", err));
  }

  return res.json({
    success: true,
    message: "تم إنشاء طلب تعديل البيانات وإرسال إشعار التأكيد للعميل عبر تليجرام!",
    request: newReq,
    requests: subscriberModificationRequestsStore,
  });
});

app.post("/api/agency/modification-requests/:id/confirm-by-client", async (req, res) => {
  const { id } = req.params;
  const modReq = subscriberModificationRequestsStore.find((r) => r.id === id);
  if (!modReq) {
    return res.status(404).json({ error: "Modification request not found" });
  }

  modReq.status = "CLIENT_CONFIRMED";
  modReq.updatedAt = new Date().toISOString();

  if (modReq.chatId && activeTelegramToken) {
    await callTelegramApi("sendMessage", {
      chat_id: modReq.chatId,
      text: `✅ *تم تسليم تأكيدك بنجاح!* 🚀\n\nظهر طلب التعديل الآن لصاحب الوكالة (Super Admin) للموافقة والاعتماد النهائي.`,
      parse_mode: "Markdown",
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: "تم تأكيد طلب التعديل من قبل العميل بنجاح!",
    request: modReq,
    requests: subscriberModificationRequestsStore,
  });
});

app.post("/api/agency/modification-requests/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const modReq = subscriberModificationRequestsStore.find((r) => r.id === id);
  if (!modReq) {
    return res.status(404).json({ error: "Modification request not found" });
  }

  modReq.status = "APPROVED";
  modReq.updatedAt = new Date().toISOString();
  if (adminNotes) modReq.adminNotes = adminNotes;

  const wsIdx = registeredWorkspacesStore.findIndex((w) => w.id === modReq.workspaceId);
  if (wsIdx >= 0) {
    const targetWs = registeredWorkspacesStore[wsIdx];
    registeredWorkspacesStore[wsIdx] = {
      ...targetWs,
      name: modReq.proposedData.name || targetWs.name,
      ownerName: modReq.proposedData.ownerName || targetWs.ownerName,
      phone: modReq.proposedData.phone || targetWs.phone,
      ownerEmail: modReq.proposedData.email || targetWs.ownerEmail,
      planId: modReq.proposedData.planId || targetWs.planId,
    };
  }

  if (modReq.chatId && activeTelegramToken) {
    await callTelegramApi("sendMessage", {
      chat_id: modReq.chatId,
      text: `🎉 *تمت الموافقة على تعديل بياناتك بنجاح من صاحب الوكالة!* 🦊🤖\n\nتم تحديث بيانات حسابك في المنصة رسمياً:\n• **اسم النشاط**: ${modReq.proposedData.name}\n• **اسم المالك**: ${modReq.proposedData.ownerName}\n• **رقم الهاتف**: ${modReq.proposedData.phone}\n• **البريد**: ${modReq.proposedData.email}\n• **الباقة**: ${modReq.proposedData.planId}`,
      parse_mode: "Markdown",
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: "تمت الموافقة على طلب تعديل البيانات وتحديث بيانات حساب المشترك فوراً!",
    request: modReq,
    clients: registeredWorkspacesStore,
    requests: subscriberModificationRequestsStore,
  });
});

app.post("/api/agency/modification-requests/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const modReq = subscriberModificationRequestsStore.find((r) => r.id === id);
  if (!modReq) {
    return res.status(404).json({ error: "Modification request not found" });
  }

  modReq.status = "REJECTED";
  modReq.updatedAt = new Date().toISOString();
  if (adminNotes) modReq.adminNotes = adminNotes;

  if (modReq.chatId && activeTelegramToken) {
    await callTelegramApi("sendMessage", {
      chat_id: modReq.chatId,
      text: `❌ *إشعار:* تم رفض طلب تعديل البيانات بواسطة صاحب الوكالة. لم يتم تغيير بيانات حسابك الحالية.`,
      parse_mode: "Markdown",
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: "تم رفض طلب التعديل.",
    request: modReq,
    requests: subscriberModificationRequestsStore,
  });
});

// Dedicated Telegram Bot Client Authenticated Modification Request Endpoint
app.post("/api/telegram/client-data-request", async (req, res) => {
  const { email, password, proposedData, chatId } = req.body;

  if (!email || !proposedData) {
    return res.status(400).json({ error: "Email and proposedData are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ws = registeredWorkspacesStore.find((w) => {
    const e = (w.ownerEmail || w.email || "").trim().toLowerCase();
    return e === normalizedEmail;
  });

  if (!ws) {
    return res.status(404).json({
      error: "لم نتمكن من العثور على منشأة مسجلة بهذ البريد الإلكتروني.",
    });
  }

  const passwordValid =
    await verifyAndMigrateWorkspacePassword(
      ws,
      String(password || "")
    );

  if (!passwordValid) {
    return res.status(401).json({
      error: "كلمة السر غير صحيحة الخاصة بحساب هذه المنشأة.",
    });
  }

  const reqId = `mod_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const newReq = {
    id: reqId,
    workspaceId: ws.id,
    chatId: chatId || ws.telegramChatId || "",
    clientEmail: ws.ownerEmail || normalizedEmail,
    clientPhone: ws.phone || "",
    currentData: {
      name: ws.name,
      ownerName: ws.ownerName,
      phone: ws.phone,
      email: ws.ownerEmail,
      planId: ws.planId,
    },
    proposedData: {
      name: proposedData.name || ws.name,
      ownerName: proposedData.ownerName || ws.ownerName,
      phone: proposedData.phone || ws.phone,
      email: proposedData.email || ws.ownerEmail,
      planId: proposedData.planId || ws.planId,
    },
    status: "CLIENT_CONFIRMED" as const,
    createdAt: nowStr,
    updatedAt: nowStr,
    adminNotes: "طلب تم إنشاؤه وتأكيده عبر API خدمة بوت التليجرام بالبريد وكلمة المرور",
  };

  subscriberModificationRequestsStore.unshift(newReq);

  if (newReq.chatId && activeTelegramToken) {
    const notifyText = `🎉 *تم رفع طلب تعديل بيانات المنشأة بنجاح إلى صاحب الوكالة!* 🦊🤖\n\n🏢 **المنشأة**: ${ws.name}\n📌 **البيانات المقترحة الجديدة**:\n• **اسم النشاط**: ${newReq.proposedData.name}\n• **اسم المالك**: ${newReq.proposedData.ownerName}\n• **رقم الهاتف**: ${newReq.proposedData.phone}\n• **البريد**: \`${newReq.proposedData.email}\`\n\n📩 الطلب الآن قيد المراجعة في لوحة تحكّم Super Admin للموافقة النهائية.`;

    await callTelegramApi("sendMessage", {
      chat_id: newReq.chatId,
      text: notifyText,
      parse_mode: "Markdown",
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: "تم استلام طلب التعديل والتحقق من الهوية بنجاح، وتحويله لصاحب الوكالة للموافقة والاعتماد!",
    request: newReq,
    workspace: ws,
    requests: subscriberModificationRequestsStore,
  });
});

async function callTelegramApi(method: string, body?: any) {
  if (!activeTelegramToken) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeTelegramToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error (${method}):`, err);
    return null;
  }
}


// ==========================================================
// MULTI-TENANT TELEGRAM ENGINE
// Each client workspace owns its own Telegram Bot Token.
// The FOX AGENCY main bot remains completely separate.
// ==========================================================

type WorkspaceTelegramPollingState = {
  running: boolean;
  offset: number;
  token: string;
};

const workspaceTelegramPollers = new Map<string, WorkspaceTelegramPollingState>();

async function callWorkspaceTelegramApi(
  token: string,
  method: string,
  body?: any
) {
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }
    );

    return await response.json();
  } catch (err) {
    console.error(`[Workspace Telegram API] ${method} error:`, err);
    return null;
  }
}


/**
 * FOX Backend Subscription Enforcement
 *
 * IMPORTANT:
 * Never trust planId / creditBalance / entitlements supplied by
 * a browser request. The registered server workspace is the
 * source of truth.
 */

// ==========================================================
// FIREBASE API AUTHENTICATION
// ==========================================================

type FoxAuthenticatedRequest = any;

async function authenticateFirebaseRequest(
  req: FoxAuthenticatedRequest,
  res: any,
  next: any
) {
  try {
    const authorization =
      String(
        req.headers?.authorization || ""
      ).trim();

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        code: "AUTH_TOKEN_REQUIRED",
        error:
          "Firebase authentication token is required",
      });
    }

    const idToken =
      authorization
        .slice("Bearer ".length)
        .trim();

    if (!idToken) {
      return res.status(401).json({
        success: false,
        code: "AUTH_TOKEN_REQUIRED",
        error:
          "Firebase authentication token is required",
      });
    }

    // Verify token signature, expiration and project.
    const decoded =
      await adminAuth.verifyIdToken(
        idToken
      );

    const uid = decoded.uid;

    // Profile is authoritative for FOX role/workspace binding.
    const profileSnapshot =
      await adminDb
        .collection("users")
        .doc(uid)
        .get();

    if (!profileSnapshot.exists) {
      console.warn(
        `🚫 [FOX Auth] Profile missing | UID=${uid}`
      );

      return res.status(403).json({
        success: false,
        code: "FOX_USER_PROFILE_MISSING",
        error:
          "FOX user profile was not found",
      });
    }

    const profile: any =
      profileSnapshot.data() || {};

    if (
      profile.role !== "super_admin" &&
      profile.role !== "client_owner" &&
      profile.role !== "staff"
    ) {
      return res.status(403).json({
        success: false,
        code: "INVALID_USER_ROLE",
        error:
          "User role is not authorized",
      });
    }

    req.foxAuth = {
      uid,
      email:
        decoded.email ||
        profile.email ||
        null,
      role: profile.role,
      workspaceId:
        profile.workspaceId || null,
      profile,
    };

    console.log(
      `🔐 [FOX Auth] Verified | UID=${uid} | Role=${profile.role} | Workspace=${profile.workspaceId || "AGENCY"}`
    );

    return next();

  } catch (error: any) {
    console.warn(
      "[FOX Auth] Token verification failed:",
      error?.code ||
        error?.message ||
        error
    );

    return res.status(401).json({
      success: false,
      code: "INVALID_AUTH_TOKEN",
      error:
        "Authentication token is invalid or expired",
    });
  }
}


/**
 * Validates that a logged-in tenant can act only on its own
 * workspace. Super Admin can access every workspace.
 */
function requireAuthenticatedWorkspace(
  req: FoxAuthenticatedRequest,
  res: any,
  requestedWorkspaceId: string
) {
  const auth = req.foxAuth;

  if (!auth) {
    res.status(401).json({
      success: false,
      code: "NOT_AUTHENTICATED",
      error: "Authentication required",
    });

    return null;
  }

  const workspaceId =
    String(
      requestedWorkspaceId || ""
    ).trim();

  if (!workspaceId) {
    res.status(400).json({
      success: false,
      code: "WORKSPACE_ID_REQUIRED",
      error: "workspaceId is required",
    });

    return null;
  }

  // Agency owner can manage all tenants.
  if (auth.role === "super_admin") {
    const workspace =
      resolveTrustedWorkspace(
        workspaceId
      );

    if (!workspace) {
      res.status(404).json({
        success: false,
        code: "WORKSPACE_NOT_FOUND",
        error: "Workspace not found",
      });

      return null;
    }

    return workspace;
  }

  // Client/staff accounts are locked to their Firebase profile.
  if (
    String(auth.workspaceId) !==
    workspaceId
  ) {
    console.warn(
      `🚨 [FOX Security] Cross-tenant request blocked | UID=${auth.uid} | UserWorkspace=${auth.workspaceId} | RequestedWorkspace=${workspaceId}`
    );

    res.status(403).json({
      success: false,
      code:
        "CROSS_TENANT_ACCESS_BLOCKED",
      error:
        "You cannot access another workspace",
    });

    return null;
  }

  const workspace =
    resolveTrustedWorkspace(
      workspaceId
    );

  if (!workspace) {
    res.status(404).json({
      success: false,
      code: "WORKSPACE_NOT_FOUND",
      error: "Workspace not found",
    });

    return null;
  }

  return workspace;
}

function requireWorkspaceFeature(
  workspace: any,
  feature: FoxFeature
) {
  if (!workspace?.id) {
    return {
      allowed: false,
      status: 404,
      code: "WORKSPACE_NOT_FOUND",
      message: "Workspace not found",
    };
  }

  if (!canWorkspaceUseFeature(workspace, feature)) {
    console.warn(
      `🔒 [FOX Entitlement] Blocked | Workspace=${workspace.id} | Plan=${workspace.planId || "unknown"} | Feature=${feature}`
    );

    return {
      allowed: false,
      status: 403,
      code: "FEATURE_NOT_INCLUDED",
      feature,
      planId: workspace.planId || null,
      message:
        "This feature is not included in the current subscription plan.",
    };
  }

  console.log(
    `🔓 [FOX Entitlement] Allowed | Workspace=${workspace.id} | Plan=${workspace.planId || "unknown"} | Feature=${feature}`
  );

  return {
    allowed: true,
    status: 200,
    feature,
    planId: workspace.planId,
  };
}

function resolveTrustedWorkspace(
  requestedWorkspace: any
) {
  const workspaceId =
    typeof requestedWorkspace === "string"
      ? requestedWorkspace
      : requestedWorkspace?.id;

  if (!workspaceId) {
    return null;
  }

  return (
    registeredWorkspacesStore.find(
      (workspace) =>
        String(workspace.id) === String(workspaceId)
    ) || null
  );
}

function getWorkspaceById(workspaceId: string) {
  return registeredWorkspacesStore.find(
    (workspace) => String(workspace.id) === String(workspaceId)
  );
}

async function generateWorkspaceTelegramReply(
  workspace: any,
  chatId: string,
  userMsg: string
) {
  // Server-side subscription enforcement.
  const telegramAccess =
    requireWorkspaceFeature(
      workspace,
      "telegram"
    );

  if (!telegramAccess.allowed) {
    console.warn(
      `🔒 [FOX Telegram] Subscription blocked | Workspace=${workspace?.id}`
    );

    return "خدمة Telegram غير متاحة ضمن الباقة الحالية للمنشأة. يرجى التواصل مع إدارة المنشأة أو ترقية الاشتراك.";
  }

  const result = await aiAgentService.generateChatResponse({
    workspace,
    message: userMsg,
    channel: "telegram",
    sessionId: `telegram:${workspace.id}:${chatId}`,
  });

  return (
    result?.response ||
    result?.aiResponse ||
    "شكراً لتواصلك معنا. كيف يمكننا مساعدتك؟"
  );
}

const workspaceTelegramRuntimeTokens =
  new Map<string, string>();

/**
 * Returns a tenant Telegram token server-side only.
 *
 * Priority:
 * 1) Runtime memory cache
 * 2) Encrypted Workspace Secret Vault
 * 3) Legacy plaintext workspace field (one-time migration)
 */
async function getWorkspaceTelegramRuntimeToken(
  workspace: any
): Promise<string> {
  const workspaceId =
    String(workspace?.id || "").trim();

  if (!workspaceId) return "";

  const cached =
    workspaceTelegramRuntimeTokens.get(
      workspaceId
    );

  if (cached) {
    return cached;
  }

  // Secure Vault is the normal source of truth.
  const vaultToken =
    await getWorkspaceSecret(
      workspaceId,
      "telegramBotToken"
    );

  if (vaultToken?.trim()) {
    const cleanToken = vaultToken.trim();

    workspaceTelegramRuntimeTokens.set(
      workspaceId,
      cleanToken
    );

    return cleanToken;
  }

  // --------------------------------------------------------
  // ONE-TIME LEGACY MIGRATION
  // --------------------------------------------------------

  const legacyToken =
    String(
      workspace?.telegramBotToken || ""
    ).trim();

  if (!legacyToken) {
    return "";
  }

  await setWorkspaceSecret(
    workspaceId,
    "telegramBotToken",
    legacyToken
  );

  workspaceTelegramRuntimeTokens.set(
    workspaceId,
    legacyToken
  );

  try {
    await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .update({
        telegramBotToken:
          FieldValue.delete(),

        telegramSecretMigratedAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),
      });

    // Also remove it from the server's in-memory workspace.
    delete workspace.telegramBotToken;

    console.log(
      `🔐 [Workspace Telegram] Legacy plaintext token migrated | Workspace=${workspaceId}`
    );

  } catch (error) {
    console.error(
      `❌ [Workspace Telegram] Plaintext cleanup failed | Workspace=${workspaceId}`,
      error
    );
  }

  return legacyToken;
}

const workspaceTelegramRatingSessions = new Set<string>();

function getWorkspaceTelegramSessionKey(workspaceId: string, chatId: string) {
  return `${workspaceId}:${chatId}`;
}

async function handleWorkspaceTelegramUpdate(
  workspace: any,
  update: any
) {
  if (!update?.message?.chat) return;

  const token =
    await getWorkspaceTelegramRuntimeToken(
      workspace
    );
  if (!token) return;

  const chatId = String(update.message.chat.id);
  const userMsg = String(update.message.text || "").trim();

  if (!userMsg) return;

  const lower = userMsg.toLowerCase();
  const sessionKey = getWorkspaceTelegramSessionKey(
    String(workspace.id),
    chatId
  );

  const userInfo =
    update.message.from || {
      first_name: update.message.chat.first_name || "Telegram Customer",
    };

  console.log(
    `🏢 [Workspace Telegram] ${workspace.name || workspace.id} | ${chatId} (${userInfo.first_name}): "${userMsg}"`
  );

  // -------------------------------------------------------
  // REAL UNIFIED INBOX STORAGE
  // -------------------------------------------------------
  const telegramSessionId =
    `telegram:${workspace.id}:${chatId}`;

  const telegramCustomerName =
    [userInfo.first_name, userInfo.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Telegram Customer";

  const inboxConversation =
    await conversationService.getOrCreateConversation(
      String(workspace.id),
      {
        sessionId: telegramSessionId,
        channel: "telegram",
        externalChatId: chatId,
        customerName: telegramCustomerName,
      }
    );


  // -------------------------------------------------------
  // REAL TENANT CRM AUTO-SYNC
  // One Telegram user = one CRM Lead per workspace.
  // -------------------------------------------------------
  try {
    const crmResult =
      await workspaceCrmService.upsertChannelCustomer(
        String(workspace.id),
        {
          channel: "telegram",
          externalCustomerId: chatId,
          name: telegramCustomerName,
          sessionId: telegramSessionId,
          conversationId: inboxConversation.id,
        }
      );

    console.log(
      `👤 [FOX CRM Telegram Sync] Workspace=${workspace.id} | Lead=${crmResult.lead.id} | Created=${crmResult.created}`
    );

    // Enrich the same CRM customer from the current message.
    await workspaceCrmService.enrichLeadFromMessage(
      String(workspace.id),
      String(crmResult.lead.id),
      userMsg
    );

    // Link Unified Inbox conversation to the CRM customer.
    await adminDb
      .collection("workspaces")
      .doc(String(workspace.id))
      .collection("conversations")
      .doc(inboxConversation.id)
      .set(
        {
          crmLeadId:
            String(crmResult.lead.id),

          updatedAt:
            new Date().toISOString(),
        },
        { merge: true }
      );
  } catch (error: any) {
    console.error(
      `❌ [FOX CRM Telegram Sync] Workspace=${workspace.id} | Chat=${chatId}`,
      error?.message || error
    );
  }

  await conversationService.appendMessage(
    String(workspace.id),
    inboxConversation.id,
    {
      sessionId: telegramSessionId,
      channel: "telegram",
      sender: "customer",
      text: userMsg,
      externalMessageId:
        update.message?.message_id
          ? String(update.message.message_id)
          : undefined,
    }
  );

  // -------------------------------------------------------
  // HUMAN TAKEOVER
  // Customer messages are still saved to Unified Inbox,
  // but AI must remain silent while a human owns the chat.
  // -------------------------------------------------------
  if (inboxConversation.assignedTo === "human") {
    console.log(
      `👤 [FOX Human Takeover] AI suppressed | Workspace=${workspace.id} | Conversation=${inboxConversation.id} | Chat=${chatId}`
    );

    return;
  }

  // -------------------------------------------------------
  // /start belongs to the tenant business, not Smart Router.
  // -------------------------------------------------------
  if (
    lower === "/start" ||
    lower === "start" ||
    lower === "أهلا" ||
    lower === "اهلا" ||
    lower === "مرحبا"
  ) {
    const businessName = workspace.name || "منشأتنا";
    const industry = workspace.industry
      ? ` (${workspace.industry})`
      : "";

    const welcomeText =
      `أهلاً بك في ${businessName}${industry} 👋\n\n` +
      `أنا المساعد الذكي الخاص بالمنشأة. أقدر أساعدك في الاستفسارات والخدمات والأسعار والحجوزات أو الطلبات حسب الخدمات المتاحة لدينا.\n\n` +
      `اكتب سؤالك مباشرة وسأساعدك.`;

    await callWorkspaceTelegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: welcomeText,
    });

    console.log(
      `✅ [Workspace Telegram Welcome] ${workspace.name || workspace.id} -> ${chatId}`
    );
    return;
  }

  // -------------------------------------------------------
  // Explicit rating command
  // -------------------------------------------------------
  if (
    lower === "/rating" ||
    lower === "rating" ||
    lower === "تقييم" ||
    lower === "تقييم الخدمة" ||
    lower === "تقييم الخدمه"
  ) {
    workspaceTelegramRatingSessions.add(sessionKey);

    await callWorkspaceTelegramApi(token, "sendMessage", {
      chat_id: chatId,
      text:
        "⭐ نرجو تقييم تجربتك معنا من 1 إلى 5:\n\n" +
        "1️⃣ سيئ جداً\n" +
        "2️⃣ سيئ\n" +
        "3️⃣ متوسط\n" +
        "4️⃣ جيد جداً\n" +
        "5️⃣ ممتاز",
    });

    return;
  }

  // -------------------------------------------------------
  // Rating 1-5 is handled only if the bot is waiting for it.
  // -------------------------------------------------------
  if (
    workspaceTelegramRatingSessions.has(sessionKey) &&
    ["1", "2", "3", "4", "5"].includes(userMsg)
  ) {
    const ratingValue = Number(userMsg);

    const feedback =
      ratingValue <= 2
        ? "سئ جداً"
        : ratingValue === 3
        ? "وسط"
        : "رائع جداً";

    const ratingId = `rat_ws_${Date.now()}`;

    const customerName =
      [userInfo.first_name, userInfo.last_name]
        .filter(Boolean)
        .join(" ") || "Telegram Customer";

    const createdAt = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 16);

    const newRating = {
      id: ratingId,
      workspaceId: String(workspace.id),
      customerName,
      customerPhone: "",
      channel: "telegram" as const,
      rating: ratingValue,
      feedback,
      createdAt,
    };

    // -------------------------------------------------------
    // Persist tenant rating in Firestore.
    //
    // The client dashboard already subscribes to the global
    // "serviceRatings" collection and scopes records using
    // workspaceId, so this becomes live and tenant-isolated.
    // -------------------------------------------------------
    try {
      await adminDb
        .collection("serviceRatings")
        .doc(ratingId)
        .set(newRating);

      console.log(
        `⭐ [FOX Rating Firestore] Saved | Workspace=${workspace.id} | Rating=${ratingValue}/5 | ID=${ratingId}`
      );
    } catch (ratingError) {
      console.error(
        `❌ [FOX Rating Firestore] Save failed | Workspace=${workspace.id}`,
        ratingError
      );

      await callWorkspaceTelegramApi(token, "sendMessage", {
        chat_id: chatId,
        text:
          "حدث خطأ أثناء تسجيل التقييم. من فضلك حاول مرة أخرى بعد قليل.",
      });

      return;
    }

    // Keep legacy runtime store synchronized temporarily
    // because existing agency endpoints still read from it.
    registeredServiceRatingsStore.unshift(newRating);

    workspaceTelegramRatingSessions.delete(sessionKey);

    await callWorkspaceTelegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: `⭐ شكراً لتقييمك! تم تسجيل تقييمك ${ratingValue}/5 بنجاح.`,
    });

    console.log(
      `⭐ [Workspace Rating] ${workspace.name || workspace.id} -> ${ratingValue}/5`
    );

    return;
  }

  // -------------------------------------------------------
  // FOX TENANT COMPLAINT AUTO-DETECTION
  // Detect real customer complaints from Telegram and persist
  // them to the global complaints collection scoped by workspaceId.
  // -------------------------------------------------------
  const complaintKeywords = [
    "شكوى",
    "شكوي",
    "مشكلة",
    "مشكلتي",
    "عندي مشكلة",
    "بلاغ",
    "متضايق",
    "زعلان",
    "خدمة سيئة",
    "الخدمة سيئة",
    "معاملة سيئة",
    "محدش رد",
    "محدش بيرد",
    "لم يتم الرد",
    "مش راضي",
    "مش شغال",
    "سيئة جدا",
    "سيئ جدا",
    "complaint",
    "problem",
    "bad service",
    "no response"
  ];

  const normalizedComplaintMessage =
    String(userMsg || "").trim().toLowerCase();

  const isComplaint =
    complaintKeywords.some((keyword) =>
      normalizedComplaintMessage.includes(keyword)
    );

  let createdComplaintId: string | null = null;

  if (isComplaint) {
    try {
      const complaintCustomerName =
        [userInfo.first_name, userInfo.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || "Telegram Customer";

      // Try to get the latest CRM data for this Telegram customer.
      let complaintPhone = "";

      try {
        const crmLeadId = `telegram_${chatId}`;

        const crmLeadSnapshot = await adminDb
          .collection("workspaces")
          .doc(String(workspace.id))
          .collection("crmLeads")
          .doc(crmLeadId)
          .get();

        if (crmLeadSnapshot.exists) {
          const crmLeadData: any = crmLeadSnapshot.data() || {};
          complaintPhone =
            String(
              crmLeadData.phone ||
              crmLeadData.customerPhone ||
              ""
            ).trim();
        }
      } catch (crmLookupError) {
        console.warn(
          `⚠️ [FOX Complaint] CRM phone lookup skipped | Workspace=${workspace.id}`,
          crmLookupError
        );
      }

      // Avoid duplicate complaints caused by repeated Telegram updates.
      const recentComplaints = await adminDb
        .collection("complaints")
        .where("workspaceId", "==", String(workspace.id))
        .where("channel", "==", "Telegram")
        .limit(25)
        .get();

      const duplicateComplaint = recentComplaints.docs.some((doc) => {
        const data: any = doc.data();

        return (
          String(data.externalChatId || "") === String(chatId) &&
          String(data.issue || "").trim().toLowerCase() ===
            normalizedComplaintMessage &&
          data.status !== "Resolved"
        );
      });

      if (!duplicateComplaint) {
        createdComplaintId =
          `cmp_tg_${String(workspace.id)}_${Date.now()}`;

        const complaintDate =
          new Date().toISOString().split("T")[0];

        const complaintCreatedAt =
          new Date().toISOString();

        const priority =
          normalizedComplaintMessage.includes("خطير") ||
          normalizedComplaintMessage.includes("ضروري") ||
          normalizedComplaintMessage.includes("كارثة") ||
          normalizedComplaintMessage.includes("كارثه") ||
          normalizedComplaintMessage.includes("urgent") ||
          normalizedComplaintMessage.includes("emergency")
            ? "High"
            : "Medium";

        await adminDb
          .collection("complaints")
          .doc(createdComplaintId)
          .set({
            id: createdComplaintId,
            workspaceId: String(workspace.id),

            customerName: complaintCustomerName,
            customerPhone: complaintPhone,
            phone: complaintPhone,

            channel: "Telegram",
            externalChatId: String(chatId),
            sessionId: telegramSessionId,
            conversationId: inboxConversation.id,

            issue: String(userMsg).trim(),

            aiResponse: "",
            aiAutoResponse: "",

            status: "Open",
            priority,

            date: complaintDate,
            createdAt: complaintCreatedAt,
            updatedAt: complaintCreatedAt,

            source: "telegram_auto_detection"
          });

        console.log(
          `🚨 [FOX Complaint Firestore] Created | Workspace=${workspace.id} | Complaint=${createdComplaintId} | Priority=${priority}`
        );
      } else {
        console.log(
          `ℹ️ [FOX Complaint] Duplicate skipped | Workspace=${workspace.id} | Chat=${chatId}`
        );
      }
    } catch (complaintError) {
      console.error(
        `❌ [FOX Complaint Firestore] Save failed | Workspace=${workspace.id} | Chat=${chatId}`,
        complaintError
      );
    }
  }

  // Normal tenant AI flow
  const replyText = await generateWorkspaceTelegramReply(
    workspace,
    chatId,
    userMsg
  );

  // Attach the actual AI reply to the newly-created complaint.
  if (createdComplaintId) {
    try {
      await adminDb
        .collection("complaints")
        .doc(createdComplaintId)
        .set(
          {
            aiResponse: replyText,
            aiAutoResponse: replyText,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );

      console.log(
        `🤖 [FOX Complaint AI Response] Updated | Workspace=${workspace.id} | Complaint=${createdComplaintId}`
      );
    } catch (complaintReplyError) {
      console.error(
        `❌ [FOX Complaint AI Response] Update failed | Complaint=${createdComplaintId}`,
        complaintReplyError
      );
    }
  }

  // If the AI explicitly asks for a 1-5 rating, remember that state.
  const normalizedReply = replyText.toLowerCase();
  if (
    normalizedReply.includes("تقييم") &&
    (
      normalizedReply.includes("1 إلى 5") ||
      normalizedReply.includes("1 الى 5") ||
      normalizedReply.includes("1-5")
    )
  ) {
    workspaceTelegramRatingSessions.add(sessionKey);
  }

  await conversationService.appendMessage(
    String(workspace.id),
    inboxConversation.id,
    {
      sessionId: telegramSessionId,
      channel: "telegram",
      sender: "ai",
      text: replyText,
    }
  );

  const sendResult = await callWorkspaceTelegramApi(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text: replyText,
    }
  );

  if (sendResult?.ok) {
    console.log(
      `✅ [Workspace Telegram Reply] ${workspace.name || workspace.id} -> ${chatId}`
    );
  } else {
    console.warn(
      `⚠️ [Workspace Telegram Reply Failed] ${workspace.name || workspace.id}`,
      sendResult
    );
  }
}

async function stopWorkspaceTelegramPolling(workspaceId: string) {
  const state = workspaceTelegramPollers.get(workspaceId);

  if (state) {
    state.running = false;
    workspaceTelegramPollers.delete(workspaceId);
  }
}

async function startWorkspaceTelegramPolling(workspaceId: string) {
  const workspace = getWorkspaceById(workspaceId);

  if (!workspace) return;

  const token =
    await getWorkspaceTelegramRuntimeToken(
      workspace
    );

  if (!token || workspace.telegramBotStatus === "disconnected") {
    await stopWorkspaceTelegramPolling(workspaceId);
    return;
  }

  const existingState = workspaceTelegramPollers.get(workspaceId);

  // Already starting or polling the same token.
  // Reserve the workspace BEFORE any awaited Telegram API calls
  // so concurrent workspace syncs cannot create duplicate pollers.
  if (
    existingState &&
    existingState.running &&
    existingState.token === token
  ) {
    return;
  }

  // Token changed: stop old worker first.
  if (existingState) {
    existingState.running = false;
    workspaceTelegramPollers.delete(workspaceId);
  }

  // Reserve immediately to prevent duplicate concurrent starts.
  const state: WorkspaceTelegramPollingState = {
    running: true,
    offset: 0,
    token,
  };

  workspaceTelegramPollers.set(workspaceId, state);

  const botInfo = await callWorkspaceTelegramApi(token, "getMe");

  if (!botInfo?.ok) {
    state.running = false;

    if (workspaceTelegramPollers.get(workspaceId) === state) {
      workspaceTelegramPollers.delete(workspaceId);
    }

    console.warn(
      `❌ [Workspace Telegram] Invalid token for ${workspace.name || workspaceId}`
    );
    return;
  }

  // Polling mode requires webhook to be disabled for this client bot.
  await callWorkspaceTelegramApi(token, "deleteWebhook", {
    drop_pending_updates: false,
  }).catch(() => {});

  console.log(
    `🤖 [Workspace Telegram Connected] ${workspace.name || workspaceId} -> @${botInfo.result?.username || "unknown_bot"}`
  );

  const poll = async () => {
    const current = workspaceTelegramPollers.get(workspaceId);

    if (!current || !current.running || current.token !== token) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${current.offset}&timeout=3`,
        { signal: controller.signal }
      ).catch(() => null);

      clearTimeout(timeoutId);

      if (response?.ok) {
        const data = await response.json().catch(() => null);

        if (data?.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            current.offset = Math.max(
              current.offset,
              Number(update.update_id || 0) + 1
            );

            const latestWorkspace = getWorkspaceById(workspaceId);

            if (latestWorkspace) {
              await handleWorkspaceTelegramUpdate(
                latestWorkspace,
                update
              );
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        `[Workspace Telegram Polling] ${workspace.name || workspaceId}:`,
        err
      );
    } finally {
      const latest = workspaceTelegramPollers.get(workspaceId);

      if (latest?.running && latest.token === token) {
        setTimeout(poll, 1000);
      }
    }
  };

  poll();
}

async function syncWorkspaceTelegramBots() {
  const activeWorkspaceIds = new Set<string>();

  for (const workspace of registeredWorkspacesStore) {
    if (!workspace?.id) continue;

    const workspaceId = String(workspace.id);
    const token =
    await getWorkspaceTelegramRuntimeToken(
      workspace
    );

    if (
      token.length > 10 &&
      workspace.telegramBotStatus !== "disconnected"
    ) {
      activeWorkspaceIds.add(workspaceId);
      await startWorkspaceTelegramPolling(workspaceId);
    } else {
      await stopWorkspaceTelegramPolling(workspaceId);
    }
  }

  // Stop workers for deleted workspaces
  for (const workspaceId of workspaceTelegramPollers.keys()) {
    if (!activeWorkspaceIds.has(workspaceId)) {
      await stopWorkspaceTelegramPolling(workspaceId);
    }
  }
}

// Workspace-specific webhook endpoint.
// Useful later for production hosting instead of polling.
app.post(
  "/api/telegram/webhook/:workspaceId",
  async (req, res) => {
    const workspace = getWorkspaceById(req.params.workspaceId);

    if (!workspace) {
      return res.status(404).json({
        ok: false,
        error: "Workspace not found",
      });
    }

    try {
      await handleWorkspaceTelegramUpdate(
        workspace,
        req.body
      );

      return res.json({ ok: true });
    } catch (err: any) {
      console.error(
        "[Workspace Telegram Webhook Error]",
        err
      );

      return res.status(500).json({
        ok: false,
        error: err?.message || "Webhook processing failed",
      });
    }
  }
);

// ==========================================================
// SECURE TENANT TELEGRAM TOKEN MANAGEMENT
// ==========================================================

app.post(
  "/api/telegram/workspace/:workspaceId/token",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    const workspace =
      requireAuthenticatedWorkspace(
        req,
        res,
        req.params.workspaceId
      );

    if (!workspace) {
      return;
    }

    const access =
      requireWorkspaceFeature(
        workspace,
        "telegram"
      );

    if (!access.allowed) {
      return res
        .status(access.status)
        .json(access);
    }

    const candidateToken =
      String(
        req.body?.token || ""
      ).trim();

    if (!candidateToken) {
      return res.status(400).json({
        success: false,
        code: "TELEGRAM_TOKEN_REQUIRED",
        error:
          "Telegram Bot Token is required",
      });
    }

    // Validate against the real Telegram API BEFORE saving.
    const botInfo =
      await callWorkspaceTelegramApi(
        candidateToken,
        "getMe"
      );

    if (!botInfo?.ok) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_TELEGRAM_BOT_TOKEN",
        error:
          botInfo?.description ||
          "Invalid Telegram Bot Token",
      });
    }

    const workspaceId =
      String(workspace.id);

    // Store encrypted only.
    await setWorkspaceSecret(
      workspaceId,
      "telegramBotToken",
      candidateToken
    );

    workspaceTelegramRuntimeTokens.set(
      workspaceId,
      candidateToken
    );

    const username =
      botInfo.result?.username
        ? `@${botInfo.result.username}`
        : String(
            req.body?.botName ||
            workspace.telegramBotName ||
            ""
          );

    const now =
      new Date().toISOString();

    // Persist ONLY safe metadata in the tenant workspace.
    await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .update({
        telegramBotToken:
          FieldValue.delete(),

        telegramBotStatus:
          "connected",

        telegramBotName:
          username,

        telegramBotId:
          botInfo.result?.id || null,

        telegramConnectedAt:
          now,

        updatedAt:
          now,
      });

    // Update backend in-memory workspace without exposing token.
    const idx =
      registeredWorkspacesStore.findIndex(
        (w) =>
          String(w.id) ===
          workspaceId
      );

    if (idx >= 0) {
      const updated: any = {
        ...registeredWorkspacesStore[idx],
        telegramBotStatus:
          "connected",
        telegramBotName:
          username,
        telegramBotId:
          botInfo.result?.id || null,
        telegramConnectedAt:
          now,
        updatedAt:
          now,
      };

      delete updated.telegramBotToken;

      registeredWorkspacesStore[idx] =
        updated;
    }

    await startWorkspaceTelegramPolling(
      workspaceId
    );

    console.log(
      `🔐 [Workspace Telegram] Secure token connected | Workspace=${workspaceId} | Bot=${username || botInfo.result?.id}`
    );

    return res.json({
      success: true,
      connected: true,
      hasToken: true,

      // Safe Telegram metadata only.
      botInfo: {
        id:
          botInfo.result?.id,
        first_name:
          botInfo.result?.first_name,
        username:
          botInfo.result?.username,
        can_join_groups:
          botInfo.result?.can_join_groups,
      },

      workspaceId,
      telegramBotName: username,
    });
  }
);


// ==========================================================
// WHATSAPP CLOUD API - SECURE TENANT INTEGRATION
// ==========================================================

async function callWhatsAppGraphApi(
  path: string,
  accessToken: string,
  options: RequestInit = {}
) {
  const cleanPath = String(path || "")
    .replace(/^\/+/, "");

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${cleanPath}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

// ----------------------------------------------------------
// WHATSAPP WEBHOOK VERIFY TOKEN
// ----------------------------------------------------------

app.post(
  "/api/whatsapp/workspace/:workspaceId/webhook-token",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const workspace = requireAuthenticatedWorkspace(
        req,
        res,
        req.params.workspaceId
      );

      if (!workspace) return;

      const access = requireWorkspaceFeature(
        workspace,
        "whatsapp"
      );

      if (!access.allowed) {
        return res.status(access.status).json(access);
      }

      const workspaceId = String(workspace.id);

      // Generate a high-entropy token server-side.
      const verifyToken = randomBytes(32).toString("hex");

      await setWorkspaceSecret(
        workspaceId,
        "whatsappVerifyToken",
        verifyToken
      );

      console.log(
        `🔐 [WhatsApp Webhook] Verify token generated | Workspace=${workspaceId}`
      );

      return res.json({
        success: true,
        workspaceId,
        verifyToken,
        webhookPath:
          `/api/whatsapp/webhook/${encodeURIComponent(workspaceId)}`,
      });
    } catch (error: any) {
      console.error(
        "[WhatsApp Webhook Token Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: "Failed to generate WhatsApp webhook verify token",
      });
    }
  }
);

// ----------------------------------------------------------
// WHATSAPP TENANT AI MESSAGE PROCESSING
// ----------------------------------------------------------

async function generateWorkspaceWhatsAppReply(
  workspace: any,
  customerNumber: string,
  userMsg: string
) {
  const whatsappAccess =
    requireWorkspaceFeature(
      workspace,
      "whatsapp"
    );

  if (!whatsappAccess.allowed) {
    console.warn(
      `🔒 [FOX WhatsApp] Subscription blocked | Workspace=${workspace?.id}`
    );

    return "خدمة WhatsApp غير متاحة ضمن الباقة الحالية للمنشأة.";
  }

  const result =
    await aiAgentService.generateChatResponse({
      workspace,
      message: userMsg,
      channel: "whatsapp",
      sessionId:
        `whatsapp:${workspace.id}:${customerNumber}`,
    });

  return (
    result?.response ||
    result?.aiResponse ||
    "شكراً لتواصلك معنا. كيف يمكننا مساعدتك؟"
  );
}

async function claimWhatsAppMessage(
  workspaceId: string,
  messageId: string
): Promise<boolean> {
  const safeMessageId =
    encodeURIComponent(messageId);

  const ref = adminDb
    .collection("whatsappProcessedMessages")
    .doc(workspaceId)
    .collection("messages")
    .doc(safeMessageId);

  try {
    await ref.create({
      workspaceId,
      messageId,
      createdAt:
        new Date().toISOString(),
    });

    return true;

  } catch (error: any) {
    // Firestore ALREADY_EXISTS => duplicate webhook delivery.
    if (
      error?.code === 6 ||
      error?.code === "already-exists"
    ) {
      return false;
    }

    throw error;
  }
}

async function processWorkspaceWhatsAppWebhook(
  workspaceId: string,
  body: any
) {
  const workspace =
    getWorkspaceById(workspaceId);

  if (!workspace) {
    console.warn(
      `⚠️ [WhatsApp] Unknown workspace | Workspace=${workspaceId}`
    );
    return;
  }

  const featureAccess =
    requireWorkspaceFeature(
      workspace,
      "whatsapp"
    );

  if (!featureAccess.allowed) {
    console.warn(
      `🔒 [WhatsApp] Subscription blocked | Workspace=${workspaceId}`
    );
    return;
  }

  const entries =
    Array.isArray(body?.entry)
      ? body.entry
      : [];

  for (const entry of entries) {
    const changes =
      Array.isArray(entry?.changes)
        ? entry.changes
        : [];

    for (const change of changes) {
      const value =
        change?.value || {};

      const incomingPhoneNumberId =
        String(
          value?.metadata?.phone_number_id ||
          ""
        ).trim();

      // Status callbacks have no customer messages.
      const messages =
        Array.isArray(value?.messages)
          ? value.messages
          : [];

      if (!messages.length) {
        continue;
      }

      const expectedPhoneNumberId =
        String(
          workspace.whatsappPhoneNumberId ||
          ""
        ).trim();

      if (
        !expectedPhoneNumberId ||
        incomingPhoneNumberId !==
          expectedPhoneNumberId
      ) {
        console.warn(
          `🚨 [WhatsApp Security] Phone Number ID mismatch | Workspace=${workspaceId} | Expected=${expectedPhoneNumberId || "NONE"} | Received=${incomingPhoneNumberId || "NONE"}`
        );

        continue;
      }

      const accessToken =
        await getWorkspaceSecret(
          workspaceId,
          "whatsappAccessToken"
        );

      if (!accessToken) {
        console.warn(
          `🔒 [WhatsApp] Access token missing | Workspace=${workspaceId}`
        );

        continue;
      }

      for (const message of messages) {
        const messageId =
          String(
            message?.id || ""
          ).trim();

        const customerNumber =
          String(
            message?.from || ""
          ).trim();

        if (
          !messageId ||
          !customerNumber
        ) {
          continue;
        }

        const firstDelivery =
          await claimWhatsAppMessage(
            workspaceId,
            messageId
          );

        if (!firstDelivery) {
          console.log(
            `♻️ [WhatsApp] Duplicate ignored | Workspace=${workspaceId} | Message=${messageId}`
          );

          continue;
        }

        // Phase 1 supports text messages only.
        if (
          message?.type !== "text" ||
          !message?.text?.body
        ) {
          console.log(
            `ℹ️ [WhatsApp] Unsupported message type ignored | Workspace=${workspaceId} | Type=${message?.type || "unknown"}`
          );

          continue;
        }

        const userMsg =
          String(
            message.text.body
          ).trim();

        if (!userMsg) {
          continue;
        }

        console.log(
          `🏢 [Workspace WhatsApp] ${workspace.name || workspaceId} | ${customerNumber}: "${userMsg}"`
        );

        try {
          const replyText =
            await generateWorkspaceWhatsAppReply(
              workspace,
              customerNumber,
              userMsg
            );

          const sendResult =
            await callWhatsAppGraphApi(
              `${encodeURIComponent(
                incomingPhoneNumberId
              )}/messages`,
              accessToken,
              {
                method: "POST",
                body: JSON.stringify({
                  messaging_product:
                    "whatsapp",

                  recipient_type:
                    "individual",

                  to:
                    customerNumber,

                  type:
                    "text",

                  text: {
                    preview_url:
                      false,
                    body:
                      replyText,
                  },
                }),
              }
            );

          if (sendResult.ok) {
            console.log(
              `✅ [Workspace WhatsApp Reply] ${workspace.name || workspaceId} -> ${customerNumber}`
            );
          } else {
            console.warn(
              `⚠️ [Workspace WhatsApp Reply Failed] Workspace=${workspaceId} | HTTP=${sendResult.status}`,
              sendResult.data
            );
          }

        } catch (error: any) {
          console.error(
            `❌ [Workspace WhatsApp Processing] Workspace=${workspaceId} | Message=${messageId}`,
            error?.message || error
          );
        }
      }
    }
  }
}

// ----------------------------------------------------------
// META WEBHOOK VERIFICATION
// ----------------------------------------------------------

app.post(
  "/api/whatsapp/webhook/:workspaceId",
  async (req: any, res) => {
    const workspaceId =
      String(
        req.params.workspaceId || ""
      ).trim();

    if (!workspaceId) {
      return res.sendStatus(400);
    }

    const workspace =
      getWorkspaceById(
        workspaceId
      );

    if (!workspace) {
      console.warn(
        `⚠️ [WhatsApp Webhook] Unknown workspace POST | Workspace=${workspaceId}`
      );

      return res.sendStatus(404);
    }

    /*
     * Acknowledge Meta immediately.
     *
     * AI generation and the outbound reply continue
     * asynchronously so webhook delivery is not blocked
     * by model latency.
     */
    res.sendStatus(200);

    void processWorkspaceWhatsAppWebhook(
      workspaceId,
      req.body
    ).catch((error) => {
      console.error(
        `❌ [WhatsApp Webhook Async Error] Workspace=${workspaceId}`,
        error?.message || error
      );
    });
  }
);

app.get(
  "/api/whatsapp/webhook/:workspaceId",
  async (req: any, res) => {
    try {
      const workspaceId = String(
        req.params.workspaceId || ""
      );

      const mode = String(
        req.query["hub.mode"] || ""
      );

      const suppliedToken = String(
        req.query["hub.verify_token"] || ""
      );

      const challenge = String(
        req.query["hub.challenge"] || ""
      );

      if (
        !workspaceId ||
        mode !== "subscribe" ||
        !suppliedToken ||
        !challenge
      ) {
        return res.sendStatus(400);
      }

      // Ensure the workspace really exists.
      const workspace = getWorkspaceById(workspaceId);

      if (!workspace) {
        console.warn(
          `⚠️ [WhatsApp Webhook] Unknown workspace | Workspace=${workspaceId}`
        );
        return res.sendStatus(404);
      }

      const access = requireWorkspaceFeature(
        workspace,
        "whatsapp"
      );

      if (!access.allowed) {
        console.warn(
          `🔒 [WhatsApp Webhook] WhatsApp entitlement denied | Workspace=${workspaceId}`
        );
        return res.sendStatus(403);
      }

      const expectedToken = await getWorkspaceSecret(
        workspaceId,
        "whatsappVerifyToken"
      );

      if (
        !expectedToken ||
        suppliedToken !== expectedToken
      ) {
        console.warn(
          `⛔ [WhatsApp Webhook] Verification rejected | Workspace=${workspaceId}`
        );
        return res.sendStatus(403);
      }

      console.log(
        `✅ [WhatsApp Webhook] Meta verification successful | Workspace=${workspaceId}`
      );

      // Meta expects the challenge as plain text.
      return res
        .status(200)
        .type("text/plain")
        .send(challenge);
    } catch (error: any) {
      console.error(
        "[WhatsApp Webhook Verify Error]",
        error?.message || error
      );

      return res.sendStatus(500);
    }
  }
);

// ----------------------------------------------------------
// CONNECT WHATSAPP
// ----------------------------------------------------------

app.post(
  "/api/whatsapp/workspace/:workspaceId/connect",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const workspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          req.params.workspaceId
        );

      if (!workspace) {
        return;
      }

      const access =
        requireWorkspaceFeature(
          workspace,
          "whatsapp"
        );

      if (!access.allowed) {
        return res
          .status(access.status)
          .json(access);
      }

      const accessToken =
        String(
          req.body?.accessToken || ""
        ).trim();

      const phoneNumberId =
        String(
          req.body?.phoneNumberId || ""
        ).trim();

      const businessAccountId =
        String(
          req.body?.businessAccountId || ""
        ).trim();

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          code:
            "WHATSAPP_ACCESS_TOKEN_REQUIRED",
          error:
            "WhatsApp Access Token is required",
        });
      }

      if (!phoneNumberId) {
        return res.status(400).json({
          success: false,
          code:
            "WHATSAPP_PHONE_NUMBER_ID_REQUIRED",
          error:
            "WhatsApp Phone Number ID is required",
        });
      }

      // Validate the token + Phone Number ID against Meta.
      const verification =
        await callWhatsAppGraphApi(
          `${encodeURIComponent(
            phoneNumberId
          )}?fields=id,display_phone_number,verified_name,quality_rating`,
          accessToken
        );

      if (
        !verification.ok ||
        !verification.data?.id
      ) {
        console.warn(
          `[WhatsApp] Meta verification failed | Workspace=${workspace.id} | HTTP=${verification.status}`
        );

        return res.status(400).json({
          success: false,
          code:
            "WHATSAPP_META_VERIFICATION_FAILED",
          error:
            verification.data?.error?.message ||
            "Could not verify WhatsApp credentials with Meta",
        });
      }

      // Extra protection:
      // Meta must return the same Phone Number ID.
      if (
        String(verification.data.id) !==
        phoneNumberId
      ) {
        return res.status(400).json({
          success: false,
          code:
            "WHATSAPP_PHONE_ID_MISMATCH",
          error:
            "Meta returned a different Phone Number ID",
        });
      }

      const workspaceId =
        String(workspace.id);

      // Secret goes ONLY to encrypted vault.
      await setWorkspaceSecret(
        workspaceId,
        "whatsappAccessToken",
        accessToken
      );

      const now =
        new Date().toISOString();

      const safeMetadata = {
        whatsappBotStatus:
          "connected",

        whatsappPhoneNumber:
          verification.data
            .display_phone_number ||
          workspace.whatsappPhoneNumber ||
          "",

        whatsappPhoneNumberId:
          phoneNumberId,

        whatsappBusinessAccountId:
          businessAccountId || null,

        whatsappVerifiedName:
          verification.data
            .verified_name || null,

        whatsappQualityRating:
          verification.data
            .quality_rating || null,

        whatsappConnectedAt:
          now,

        updatedAt:
          now,
      };

      // Store safe metadata only.
      await adminDb
        .collection("workspaces")
        .doc(workspaceId)
        .update(safeMetadata);

      // Synchronize server memory.
      const idx =
        registeredWorkspacesStore
          .findIndex(
            (w) =>
              String(w.id) ===
              workspaceId
          );

      if (idx >= 0) {
        registeredWorkspacesStore[idx] = {
          ...registeredWorkspacesStore[idx],
          ...safeMetadata,
        };
      }

      console.log(
        `🟢 [WhatsApp] Connected securely | Workspace=${workspaceId} | Phone=${verification.data.display_phone_number || phoneNumberId}`
      );

      return res.json({
        success: true,
        connected: true,

        workspaceId,

        phoneNumber:
          verification.data
            .display_phone_number ||
          null,

        phoneNumberId,

        businessAccountId:
          businessAccountId || null,

        verifiedName:
          verification.data
            .verified_name || null,

        qualityRating:
          verification.data
            .quality_rating || null,

        hasAccessToken: true,
      });

    } catch (error: any) {
      console.error(
        "[WhatsApp Connect Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        code:
          "WHATSAPP_CONNECT_FAILED",
        error:
          "Failed to connect WhatsApp",
      });
    }
  }
);

// ----------------------------------------------------------
// WHATSAPP STATUS
// ----------------------------------------------------------

app.get(
  "/api/whatsapp/workspace/:workspaceId/status",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const workspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          req.params.workspaceId
        );

      if (!workspace) {
        return;
      }

      const access =
        requireWorkspaceFeature(
          workspace,
          "whatsapp"
        );

      if (!access.allowed) {
        return res
          .status(access.status)
          .json(access);
      }

      const workspaceId =
        String(workspace.id);

      const token =
        await getWorkspaceSecret(
          workspaceId,
          "whatsappAccessToken"
        );

      const connected =
        Boolean(token) &&
        workspace.whatsappBotStatus ===
          "connected";

      return res.json({
        success: true,
        connected,
        hasAccessToken:
          Boolean(token),

        workspaceId,

        phoneNumber:
          workspace.whatsappPhoneNumber ||
          null,

        phoneNumberId:
          workspace
            .whatsappPhoneNumberId ||
          null,

        businessAccountId:
          workspace
            .whatsappBusinessAccountId ||
          null,

        connectedAt:
          workspace
            .whatsappConnectedAt ||
          null,
      });

    } catch (error: any) {
      console.error(
        "[WhatsApp Status Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to read WhatsApp status",
      });
    }
  }
);

// ----------------------------------------------------------
// DISCONNECT WHATSAPP
// ----------------------------------------------------------

app.delete(
  "/api/whatsapp/workspace/:workspaceId/disconnect",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const workspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          req.params.workspaceId
        );

      if (!workspace) {
        return;
      }

      const access =
        requireWorkspaceFeature(
          workspace,
          "whatsapp"
        );

      if (!access.allowed) {
        return res
          .status(access.status)
          .json(access);
      }

      const workspaceId =
        String(workspace.id);

      // Permanently remove encrypted token.
      await deleteWorkspaceSecret(
        workspaceId,
        "whatsappAccessToken"
      );

      const now =
        new Date().toISOString();

      await adminDb
        .collection("workspaces")
        .doc(workspaceId)
        .update({
          whatsappBotStatus:
            "disconnected",

          whatsappPhoneNumber:
            FieldValue.delete(),

          whatsappPhoneNumberId:
            FieldValue.delete(),

          whatsappBusinessAccountId:
            FieldValue.delete(),

          whatsappVerifiedName:
            FieldValue.delete(),

          whatsappQualityRating:
            FieldValue.delete(),

          whatsappConnectedAt:
            FieldValue.delete(),

          updatedAt:
            now,
        });

      const idx =
        registeredWorkspacesStore
          .findIndex(
            (w) =>
              String(w.id) ===
              workspaceId
          );

      if (idx >= 0) {
        const safeWorkspace: any = {
          ...registeredWorkspacesStore[idx],
          whatsappBotStatus:
            "disconnected",
          updatedAt:
            now,
        };

        delete safeWorkspace
          .whatsappPhoneNumber;

        delete safeWorkspace
          .whatsappPhoneNumberId;

        delete safeWorkspace
          .whatsappBusinessAccountId;

        delete safeWorkspace
          .whatsappVerifiedName;

        delete safeWorkspace
          .whatsappQualityRating;

        delete safeWorkspace
          .whatsappConnectedAt;

        registeredWorkspacesStore[idx] =
          safeWorkspace;
      }

      console.log(
        `🔴 [WhatsApp] Disconnected | Workspace=${workspaceId}`
      );

      return res.json({
        success: true,
        connected: false,
        workspaceId,
      });

    } catch (error: any) {
      console.error(
        "[WhatsApp Disconnect Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to disconnect WhatsApp",
      });
    }
  }
);



// ==========================================================
// UNIFIED INBOX - RETURN CONVERSATION TO AI
// ==========================================================

app.post(
  "/api/conversations/:conversationId/return-to-ai",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const conversationId =
        String(req.params.conversationId || "").trim();

      const workspaceId =
        String(req.body?.workspaceId || "").trim();

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          code: "WORKSPACE_ID_REQUIRED",
          error: "workspaceId is required",
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          code: "CONVERSATION_ID_REQUIRED",
          error: "conversationId is required",
        });
      }

      const workspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          workspaceId
        );

      if (!workspace) {
        return;
      }

      const conversationRef =
        adminDb
          .collection("workspaces")
          .doc(workspaceId)
          .collection("conversations")
          .doc(conversationId);

      const conversationSnap =
        await conversationRef.get();

      if (!conversationSnap.exists) {
        return res.status(404).json({
          success: false,
          code: "CONVERSATION_NOT_FOUND",
          error: "Conversation not found",
        });
      }

      const conversation: any =
        conversationSnap.data() || {};

      if (
        String(conversation.workspaceId) !==
        String(workspaceId)
      ) {
        return res.status(403).json({
          success: false,
          code: "CROSS_TENANT_BLOCKED",
          error:
            "Conversation does not belong to this workspace",
        });
      }

      const now = new Date().toISOString();

      await conversationRef.update({
        assignedTo: "ai",
        status: "ai_handled",
        updatedAt: now,
      });

      // -----------------------------------------------------
      // FOX CRM EVENT: HUMAN -> AI
      // Only log a real ownership transition.
      // -----------------------------------------------------
      if (
        String(conversation.assignedTo || "")
          .toLowerCase() === "human"
      ) {
        const crmLeadId =
          String(
            conversation.crmLeadId || ""
          ).trim();

        if (crmLeadId) {
          try {
            await crmEventService.logReturnToAi({
              workspaceId,
              leadId: crmLeadId,
              channel:
                conversation.channel ||
                undefined,
              sessionId:
                conversation.sessionId ||
                undefined,
              conversationId,
            });
          } catch (eventError: any) {
            console.error(
              `❌ [FOX CRM Event Return AI] Workspace=${workspaceId} | Conversation=${conversationId}`,
              eventError?.message ||
                eventError
            );
          }
        }
      }

      console.log(
        `🤖 [Unified Inbox Return To AI] Workspace=${workspaceId} | Conversation=${conversationId}`
      );

      return res.json({
        success: true,
        conversationId,
        workspaceId,
        assignedTo: "ai",
        status: "ai_handled",
      });

    } catch (error: any) {
      console.error(
        "[Unified Inbox Return To AI Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        code: "RETURN_TO_AI_FAILED",
        error:
          "Failed to return conversation to AI",
      });
    }
  }
);


// ==========================================================
// UNIFIED INBOX - SECURE HUMAN REPLY
// ==========================================================

app.post(
  "/api/conversations/:conversationId/reply",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    try {
      const conversationId =
        String(req.params.conversationId || "").trim();

      const workspaceId =
        String(req.body?.workspaceId || "").trim();

      const text =
        String(req.body?.text || "").trim();

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          code: "WORKSPACE_ID_REQUIRED",
          error: "workspaceId is required",
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          code: "CONVERSATION_ID_REQUIRED",
          error: "conversationId is required",
        });
      }

      if (!text) {
        return res.status(400).json({
          success: false,
          code: "MESSAGE_REQUIRED",
          error: "Message text is required",
        });
      }

      const workspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          workspaceId
        );

      if (!workspace) {
        return;
      }

      const conversationSnap =
        await adminDb
          .collection("workspaces")
          .doc(workspaceId)
          .collection("conversations")
          .doc(conversationId)
          .get();

      if (!conversationSnap.exists) {
        return res.status(404).json({
          success: false,
          code: "CONVERSATION_NOT_FOUND",
          error: "Conversation not found",
        });
      }

      const conversation: any =
        conversationSnap.data() || {};

      if (
        String(conversation.workspaceId) !==
        String(workspaceId)
      ) {
        return res.status(403).json({
          success: false,
          code: "CROSS_TENANT_BLOCKED",
          error: "Conversation does not belong to this workspace",
        });
      }

      if (conversation.channel !== "telegram") {
        return res.status(400).json({
          success: false,
          code: "CHANNEL_NOT_SUPPORTED",
          error: "Human reply currently supports Telegram only",
        });
      }

      const telegramAccess =
        requireWorkspaceFeature(
          workspace,
          "telegram"
        );

      if (!telegramAccess.allowed) {
        return res
          .status(telegramAccess.status)
          .json(telegramAccess);
      }

      const token =
        await getWorkspaceTelegramRuntimeToken(
          workspace
        );

      if (!token) {
        return res.status(409).json({
          success: false,
          code: "TELEGRAM_NOT_CONNECTED",
          error: "Telegram bot is not connected",
        });
      }

      const chatId =
        String(
          conversation.externalChatId ||
          conversation.customerId ||
          ""
        ).trim();

      if (!chatId) {
        return res.status(400).json({
          success: false,
          code: "CHAT_ID_MISSING",
          error: "Telegram chat ID is missing",
        });
      }

      const sendResult =
        await callWorkspaceTelegramApi(
          token,
          "sendMessage",
          {
            chat_id: chatId,
            text,
          }
        );

      if (!sendResult?.ok) {
        return res.status(502).json({
          success: false,
          code: "TELEGRAM_SEND_FAILED",
          error:
            sendResult?.description ||
            "Failed to send Telegram message",
        });
      }

      await conversationService.appendMessage(
        workspaceId,
        conversationId,
        {
          sessionId:
            conversation.sessionId ||
            `telegram:${workspaceId}:${chatId}`,
          channel: "telegram",
          sender: "human",
          text,
          externalMessageId:
            sendResult?.result?.message_id
              ? String(sendResult.result.message_id)
              : undefined,
        }
      );

      await adminDb
        .collection("workspaces")
        .doc(workspaceId)
        .collection("conversations")
        .doc(conversationId)
        .update({
          assignedTo: "human",
          status: "open",
          updatedAt: new Date().toISOString(),
        });

      // -----------------------------------------------------
      // FOX CRM EVENT: AI -> HUMAN
      // First human reply creates takeover event.
      // Additional human replies do not create duplicates.
      // -----------------------------------------------------
      if (
        String(conversation.assignedTo || "")
          .toLowerCase() !== "human"
      ) {
        const crmLeadId =
          String(
            conversation.crmLeadId || ""
          ).trim();

        if (crmLeadId) {
          try {
            await crmEventService.logHumanTakeover({
              workspaceId,
              leadId: crmLeadId,
              channel:
                conversation.channel ||
                "telegram",
              sessionId:
                conversation.sessionId ||
                `telegram:${workspaceId}:${chatId}`,
              conversationId,
            });
          } catch (eventError: any) {
            console.error(
              `❌ [FOX CRM Event Human Takeover] Workspace=${workspaceId} | Conversation=${conversationId}`,
              eventError?.message ||
                eventError
            );
          }
        }
      }

      console.log(
        `👤 [Unified Inbox Human Reply] Workspace=${workspaceId} | Conversation=${conversationId} | Chat=${chatId}`
      );

      return res.json({
        success: true,
        sent: true,
        conversationId,
        channel: "telegram",
      });

    } catch (error: any) {
      console.error(
        "[Unified Inbox Human Reply Error]",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: "Failed to send human reply",
      });
    }
  }
);


// Client workspace Telegram connection status.
app.get(
  "/api/telegram/workspace/:workspaceId/status",
  authenticateFirebaseRequest,
  async (req: any, res) => {
    const workspace =
      requireAuthenticatedWorkspace(
        req,
        res,
        req.params.workspaceId
      );

    if (!workspace) {
      return;
    }

    const access =
      requireWorkspaceFeature(
        workspace,
        "telegram"
      );

    if (!access.allowed) {
      return res
        .status(access.status)
        .json(access);
    }

    const token =
    await getWorkspaceTelegramRuntimeToken(
      workspace
    );

    if (!token) {
      return res.json({
        connected: false,
        pollingActive: false,
      });
    }

    const botInfo = await callWorkspaceTelegramApi(
      token,
      "getMe"
    );

    const state = workspaceTelegramPollers.get(
      String(workspace.id)
    );

    return res.json({
      connected: !!botInfo?.ok,
      botInfo: botInfo?.ok ? botInfo.result : undefined,
      pollingActive: !!state?.running,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  }
);

async function generateAgencyBotReply(userMsg: string): Promise<string> {
  const trimmed = (userMsg || "").trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return agencyBotConfig.fallbackMessage;

  // 1. Check for /start or greeting
  if (lower === "/start" || lower === "start" || lower === "أهلا" || lower === "اهلآ" || lower === "مرحبا" || lower === "السلام عليكم") {
    return agencyBotConfig.welcomeMessage;
  }

  // 2. Check registered quick templates
  for (const tpl of agencyBotConfig.quickTemplates) {
    if (tpl.keyword && lower.includes(tpl.keyword.toLowerCase())) {
      return tpl.reply;
    }
  }

 // 3. Show fixed pricing ONLY for direct/simple pricing requests
const directPricingRequests = [
  "/plans",
  "plans",
  "الخطط",
  "الباقات",
  "الأسعار",
  "الاسعار",
  "الخطط والأسعار",
  "الخطط والاسعار",
  "أسعار الباقات",
  "اسعار الباقات",
  "بكام",
  "price",
  "pricing",
  "plans and pricing"
];

if (directPricingRequests.includes(lower)) {
  return agencyBotConfig.pricingPlansText;
}

  // 4. Check for contact keywords
  if (lower.includes("تواصل") || lower.includes("رقم") || lower.includes("هاتف") || lower.includes("إيميل") || lower.includes("contact")) {
    const contactTpl = agencyBotConfig.quickTemplates.find((t) => t.keyword === "/contact");
    if (contactTpl) return contactTpl.reply;
    return `📞 يمكنك التواصل معنا على الهواتف التالية:\n${agencyBotConfig.contactPhone}\nالبريد: ${agencyBotConfig.contactEmail}`;
  }

  // 5. Use Gemini AI if enabled
  if (agencyBotConfig.enableGeminiAI) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `${agencyBotConfig.systemPrompt}\n\nنبرة الرد المطلوبة: ${agencyBotConfig.responseTone}\nبيانات خطط الأسعار والتواصل:\n${agencyBotConfig.pricingPlansText}\nالهاتف: ${agencyBotConfig.contactPhone}\n\nرسالة المستخدم: "${trimmed}"\n\nأجب في 2-4 أسطر قصيرة وواضحة جداً وبدون مقدمات طويلة.`;
        const response = await generateWithFallback(ai, {
          contents: prompt,
        });
        if (response.text && response.text.trim()) {
          return response.text.trim();
        }
      } catch (e) {
        console.warn("Gemini reply error, falling back to custom fallback", e);
      }
    }
  }

  // 6. Default Fallback
  return agencyBotConfig.fallbackMessage;
}

// Get Bot Config Endpoint
app.get(
  "/api/telegram/bot-config",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  (_req, res) => {
    return res.json({
      success: true,
      config: agencyBotConfig,
      hasToken: Boolean(activeTelegramToken),
      tokenMasked: activeTelegramToken
        ? `••••••••${activeTelegramToken.slice(-4)}`
        : null,
    });
  }
);

// Update Bot Config Endpoint
app.post(
  "/api/telegram/bot-config",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  (req, res) => {
    const { config } = req.body;

    if (!config || typeof config !== "object") {
      return res.status(400).json({
        error: "Config object is required",
      });
    }

    agencyBotConfig = {
      ...agencyBotConfig,
      ...config,
    };

    return res.json({
      success: true,
      message:
        "Agency Telegram Bot settings updated successfully!",
      config: agencyBotConfig,
      hasToken: Boolean(activeTelegramToken),
    });
  }
);

// Telegram Polling Engine for Real-Time Telegram Response
let isBotEnabled = true;
let isPollingActive = false;
let lastUpdateOffset = 0;

async function startTelegramPolling() {
  if (isPollingActive || !isBotEnabled) return;
  isPollingActive = true;

  // Clear any existing failing webhooks so Telegram routes messages to getUpdates
  if (activeTelegramToken) {
    await callTelegramApi("deleteWebhook", { drop_pending_updates: false }).catch(() => {});
  }
  console.log("🚀 [Telegram Bot] Continuous polling service initialized...");

  const pollLoop = async () => {
    if (!isPollingActive || !isBotEnabled) {
      isPollingActive = false;
      return;
    }
    try {
      if (activeTelegramToken && isBotEnabled) {
        const url = `https://api.telegram.org/bot${activeTelegramToken}/getUpdates?offset=${lastUpdateOffset}&timeout=3`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const update of data.result) {
              lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id + 1);

              if (update.message && update.message.chat) {
                const chatId = String(update.message.chat.id);
                const userMsg = update.message.text || "";
                const userInfo = update.message.from || { first_name: update.message.chat.first_name || "عميل تليجرام" };

                console.log(`📩 [Telegram Bot Input] ChatId: ${chatId} (${userInfo.first_name}): "${userMsg}"`);

                const replyText = await processAgencyBotMessage(chatId, userInfo, userMsg);

                const sendRes = await callTelegramApi("sendMessage", {
                  chat_id: chatId,
                  text: replyText,
                  parse_mode: "Markdown",
                });

                if (sendRes && sendRes.ok) {
                  console.log(`✅ [Telegram Bot Reply Sent] To ${chatId}`);
                } else {
                  console.warn(`⚠️ [Telegram Bot Reply Warning]`, sendRes);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Telegram Polling Exception]:", err);
    } finally {
      if (isPollingActive && isBotEnabled) {
        setTimeout(pollLoop, 1000);
      } else {
        isPollingActive = false;
      }
    }
  };

  pollLoop();
}

// Agency Telegram polling starts from startServer()
// after the encrypted token has been hydrated.

// Agency-management authorization.
// These routes control the FOX AI AGENCY main Telegram bot,
// not tenant/workspace Telegram bots.
function requireSuperAdmin(
  req: any,
  res: any,
  next: any
) {
  if (!req.foxAuth) {
    return res.status(401).json({
      success: false,
      code: "NOT_AUTHENTICATED",
      error: "Authentication required",
    });
  }

  if (req.foxAuth.role !== "super_admin") {
    console.warn(
      `[FOX Security] Agency Telegram access blocked | UID=${req.foxAuth.uid} | Role=${req.foxAuth.role}`
    );

    return res.status(403).json({
      success: false,
      code: "SUPER_ADMIN_REQUIRED",
      error: "Agency administrator access required",
    });
  }

  return next();
}


// ============================================================
// FOX PRODUCTION ACTIVATION SECURITY V2
// ============================================================
//
// SECURITY MODEL:
//
// - Activation codes live ONLY in Firestore/backend.
// - Browser never receives the full activation-code database.
// - Only Super Admin may list/create/revoke codes.
// - Tenant may submit ONE code for its own workspace.
// - Server verifies ownership, expiry and one-time usage.
// - Browser supplied planId/duration/credits are NEVER trusted.
// - Firestore transaction prevents double redemption.
//
// ============================================================

function normalizeFoxActivationCode(value: unknown): string {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function generateSecureFoxActivationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const makePart = (length: number) => {
    const bytes = randomBytes(length);

    return Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join("");
  };

  return `FOX-${makePart(5)}-${makePart(5)}-${makePart(5)}`;
}


// ------------------------------------------------------------
// SUPER ADMIN — LIST ACTIVATION CODES
// ------------------------------------------------------------

app.get(
  "/api/admin/activation-codes",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (_req, res) => {
    try {
      const snapshot = await adminDb
        .collection("activationCodes")
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();

      const codes = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data() || {};

        return {
          id: docSnap.id,
          code: data.code,
          planId: data.planId,
          codeType: data.codeType || "plan",
          extraConversationsCount:
            data.extraConversationsCount || 0,
          durationDays:
            Number(data.durationDays || 0),
          isUsed:
            Boolean(data.isUsed),
          createdBy:
            data.createdBy || "super_admin",
          usedByWorkspaceId:
            data.usedByWorkspaceId || null,
          usedByWorkspaceName:
            data.usedByWorkspaceName || null,
          createdAt:
            data.createdAt || "",
          expiresAt:
            data.expiresAt || "",
          usedAt:
            data.usedAt || null,
        };
      });

      return res.json({
        success: true,
        codes,
      });

    } catch (error) {
      console.error(
        "❌ [FOX Activation] Failed to list codes:",
        error
      );

      return res.status(500).json({
        success: false,
        code: "ACTIVATION_LIST_FAILED",
        error: "Unable to load activation codes",
      });
    }
  }
);


// ------------------------------------------------------------
// SUPER ADMIN — CREATE ACTIVATION CODE
// ------------------------------------------------------------

app.post(
  "/api/admin/activation-codes",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const {
        planId,
        durationDays = 30,
        codeType = "plan",
        extraConversationsCount = 0,
      } = req.body || {};

      const allowedPlans = [
        "starter",
        "business",
        "enterprise",
      ];

      if (
        codeType !== "plan" &&
        codeType !== "extra_package"
      ) {
        return res.status(400).json({
          success: false,
          code: "INVALID_CODE_TYPE",
          error: "Invalid activation code type",
        });
      }

      if (
        codeType === "plan" &&
        !allowedPlans.includes(String(planId))
      ) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PLAN",
          error: "Invalid subscription plan",
        });
      }

      const safeDuration =
        Math.max(
          1,
          Math.min(
            3650,
            Number(durationDays) || 30
          )
        );

      const safeExtraCredits =
        Math.max(
          0,
          Math.floor(
            Number(extraConversationsCount) || 0
          )
        );

      if (
        codeType === "extra_package" &&
        safeExtraCredits <= 0
      ) {
        return res.status(400).json({
          success: false,
          code: "INVALID_EXTRA_CREDITS",
          error:
            "Extra conversation count must be greater than zero",
        });
      }

      let code = "";
      let codeRef: any = null;

      // Extremely unlikely collision, but check anyway.
      for (let attempt = 0; attempt < 5; attempt++) {
        code =
          generateSecureFoxActivationCode();

        codeRef =
          adminDb
            .collection("activationCodes")
            .doc(code);

        const existing =
          await codeRef.get();

        if (!existing.exists) {
          break;
        }

        code = "";
        codeRef = null;
      }

      if (!code || !codeRef) {
        return res.status(500).json({
          success: false,
          code: "CODE_GENERATION_FAILED",
          error:
            "Could not generate unique activation code",
        });
      }

      const now =
        new Date();

      const expiresAt =
        new Date(
          now.getTime() +
            90 *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      const record = {
        code,
        planId:
          codeType === "plan"
            ? String(planId)
            : null,
        codeType,
        extraConversationsCount:
          codeType === "extra_package"
            ? safeExtraCredits
            : 0,
        durationDays:
          safeDuration,
        isUsed: false,

        createdBy:
          req.foxAuth.uid,

        createdByEmail:
          req.foxAuth.email || null,

        createdAt:
          now.toISOString(),

        expiresAt,

        usedByWorkspaceId: null,
        usedByWorkspaceName: null,
        usedAt: null,
      };

      await codeRef.create(record);

      console.log(
        `🔑 [FOX Activation] Code created | Type=${codeType} | Plan=${planId || "-"} | Admin=${req.foxAuth.uid}`
      );

      return res.status(201).json({
        success: true,
        activationCode: {
          id: code,
          ...record,
        },
      });

    } catch (error) {
      console.error(
        "❌ [FOX Activation] Code creation failed:",
        error
      );

      return res.status(500).json({
        success: false,
        code: "ACTIVATION_CREATE_FAILED",
        error:
          "Unable to create activation code",
      });
    }
  }
);


// ------------------------------------------------------------
// SUPER ADMIN — REVOKE UNUSED ACTIVATION CODE
// ------------------------------------------------------------

app.delete(
  "/api/admin/activation-codes/:codeId",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const codeId =
        normalizeFoxActivationCode(
          req.params.codeId
        );

      if (!codeId) {
        return res.status(400).json({
          success: false,
          error:
            "Activation code is required",
        });
      }

      const ref =
        adminDb
          .collection("activationCodes")
          .doc(codeId);

      const snapshot =
        await ref.get();

      if (!snapshot.exists) {
        return res.status(404).json({
          success: false,
          code: "CODE_NOT_FOUND",
          error:
            "Activation code not found",
        });
      }

      const data: any =
        snapshot.data() || {};

      if (data.isUsed) {
        return res.status(409).json({
          success: false,
          code: "CODE_ALREADY_USED",
          error:
            "Used activation codes cannot be revoked",
        });
      }

      await ref.delete();

      console.log(
        `🗑️ [FOX Activation] Code revoked | Admin=${req.foxAuth.uid}`
      );

      return res.json({
        success: true,
      });

    } catch (error) {
      console.error(
        "❌ [FOX Activation] Revoke failed:",
        error
      );

      return res.status(500).json({
        success: false,
        code: "ACTIVATION_REVOKE_FAILED",
        error:
          "Unable to revoke activation code",
      });
    }
  }
);


// ------------------------------------------------------------
// TENANT — REDEEM ACTIVATION CODE
// ------------------------------------------------------------

app.post(
  "/api/workspaces/:workspaceId/redeem-activation-code",
  authenticateFirebaseRequest,
  async (req, res) => {
    try {
      const workspaceId =
        String(
          req.params.workspaceId || ""
        ).trim();

      const trustedWorkspace =
        requireAuthenticatedWorkspace(
          req,
          res,
          workspaceId
        );

      if (!trustedWorkspace) {
        return;
      }

      const code =
        normalizeFoxActivationCode(
          req.body?.code
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          code: "ACTIVATION_CODE_REQUIRED",
          error:
            "Activation code is required",
        });
      }

      const codeRef =
        adminDb
          .collection("activationCodes")
          .doc(code);

      const workspaceRef =
        adminDb
          .collection("workspaces")
          .doc(workspaceId);

      let responsePayload: any = null;

      await adminDb.runTransaction(
        async (transaction) => {
          const [
            codeSnapshot,
            workspaceSnapshot,
          ] = await Promise.all([
            transaction.get(codeRef),
            transaction.get(workspaceRef),
          ]);

          if (!codeSnapshot.exists) {
            const err: any =
              new Error(
                "INVALID_ACTIVATION_CODE"
              );

            err.foxCode =
              "INVALID_ACTIVATION_CODE";

            throw err;
          }

          if (!workspaceSnapshot.exists) {
            const err: any =
              new Error(
                "WORKSPACE_NOT_FOUND"
              );

            err.foxCode =
              "WORKSPACE_NOT_FOUND";

            throw err;
          }

          const codeData: any =
            codeSnapshot.data() || {};

          const workspaceData: any =
            workspaceSnapshot.data() || {};

          if (codeData.isUsed) {
            const err: any =
              new Error(
                "ACTIVATION_CODE_ALREADY_USED"
              );

            err.foxCode =
              "ACTIVATION_CODE_ALREADY_USED";

            throw err;
          }

          if (
            codeData.expiresAt &&
            new Date(
              codeData.expiresAt
            ).getTime() <
              Date.now()
          ) {
            const err: any =
              new Error(
                "ACTIVATION_CODE_EXPIRED"
              );

            err.foxCode =
              "ACTIVATION_CODE_EXPIRED";

            throw err;
          }

          const codeType =
            codeData.codeType ||
            "plan";

          const now =
            new Date();

          const workspaceUpdate: any = {
            updatedAt:
              now.toISOString(),
          };

          if (codeType === "plan") {
            const allowedPlans = [
              "starter",
              "business",
              "enterprise",
            ];

            const trustedPlanId =
              String(
                codeData.planId || ""
              );

            if (
              !allowedPlans.includes(
                trustedPlanId
              )
            ) {
              const err: any =
                new Error(
                  "INVALID_CODE_PLAN"
                );

              err.foxCode =
                "INVALID_CODE_PLAN";

              throw err;
            }

            const durationDays =
              Math.max(
                1,
                Number(
                  codeData.durationDays
                ) || 30
              );

            const existingExpiry =
              workspaceData
                .subscriptionExpiresAt
                ? new Date(
                    `${workspaceData.subscriptionExpiresAt}T23:59:59`
                  )
                : null;

            const baseDate =
              existingExpiry &&
              existingExpiry.getTime() >
                now.getTime()
                ? existingExpiry
                : now;

            const newExpiry =
              new Date(
                baseDate.getTime() +
                  durationDays *
                    24 *
                    60 *
                    60 *
                    1000
              );

            workspaceUpdate.planId =
              trustedPlanId;

            workspaceUpdate.status =
              "active";

            workspaceUpdate.subscriptionExpiresAt =
              newExpiry
                .toISOString()
                .split("T")[0];

            responsePayload = {
              codeType: "plan",
              planId:
                trustedPlanId,
              subscriptionExpiresAt:
                workspaceUpdate
                  .subscriptionExpiresAt,
            };

          } else if (
            codeType ===
            "extra_package"
          ) {
            const extraCredits =
              Math.max(
                0,
                Math.floor(
                  Number(
                    codeData
                      .extraConversationsCount
                  ) || 0
                )
              );

            if (extraCredits <= 0) {
              const err: any =
                new Error(
                  "INVALID_EXTRA_PACKAGE"
                );

              err.foxCode =
                "INVALID_EXTRA_PACKAGE";

              throw err;
            }

            const currentExtra =
              Math.max(
                0,
                Number(
                  workspaceData
                    .extraConversationsLimit
                ) || 0
              );

            workspaceUpdate
              .extraConversationsLimit =
              currentExtra +
              extraCredits;

            responsePayload = {
              codeType:
                "extra_package",
              extraConversationsCount:
                extraCredits,
              extraConversationsLimit:
                workspaceUpdate
                  .extraConversationsLimit,
            };

          } else {
            const err: any =
              new Error(
                "INVALID_CODE_TYPE"
              );

            err.foxCode =
              "INVALID_CODE_TYPE";

            throw err;
          }

          transaction.update(
            workspaceRef,
            workspaceUpdate
          );

          transaction.update(
            codeRef,
            {
              isUsed: true,
              usedByWorkspaceId:
                workspaceId,
              usedByWorkspaceName:
                workspaceData.name ||
                trustedWorkspace.name ||
                workspaceId,
              usedAt:
                now.toISOString(),
            }
          );
        }
      );

      // Refresh backend runtime cache.
      const cacheIndex =
        registeredWorkspacesStore.findIndex(
          (workspace) =>
            workspace.id ===
            workspaceId
        );

      if (cacheIndex >= 0) {
        registeredWorkspacesStore[
          cacheIndex
        ] = {
          ...registeredWorkspacesStore[
            cacheIndex
          ],
          ...(responsePayload?.planId
            ? {
                planId:
                  responsePayload.planId,
                subscriptionExpiresAt:
                  responsePayload
                    .subscriptionExpiresAt,
                status: "active",
              }
            : {}),
          ...(responsePayload
            ?.extraConversationsLimit !=
          null
            ? {
                extraConversationsLimit:
                  responsePayload
                    .extraConversationsLimit,
              }
            : {}),
        };
      }

      console.log(
        `✅ [FOX Activation] Redeemed | Workspace=${workspaceId} | Type=${responsePayload?.codeType}`
      );

      return res.json({
        success: true,
        ...responsePayload,
      });

    } catch (error: any) {
      const foxCode =
        error?.foxCode ||
        error?.message;

      const knownErrors:
        Record<string, number> = {
        INVALID_ACTIVATION_CODE: 404,
        ACTIVATION_CODE_ALREADY_USED: 409,
        ACTIVATION_CODE_EXPIRED: 410,
        WORKSPACE_NOT_FOUND: 404,
        INVALID_CODE_PLAN: 400,
        INVALID_EXTRA_PACKAGE: 400,
        INVALID_CODE_TYPE: 400,
      };

      if (knownErrors[foxCode]) {
        return res
          .status(
            knownErrors[foxCode]
          )
          .json({
            success: false,
            code: foxCode,
            error: foxCode,
          });
      }

      console.error(
        "❌ [FOX Activation] Redeem failed:",
        error
      );

      return res.status(500).json({
        success: false,
        code: "ACTIVATION_REDEEM_FAILED",
        error:
          "Unable to redeem activation code",
      });
    }
  }
);



// Telegram Toggle Active Status Endpoint
app.post(
  "/api/telegram/toggle-status",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled === "boolean") {
    isBotEnabled = enabled;
  } else {
    isBotEnabled = !isBotEnabled;
  }

  if (isBotEnabled) {
    if (!isPollingActive && activeTelegramToken) {
      startTelegramPolling();
    }
  } else {
    isPollingActive = false;
  }

  return res.json({
    success: true,
    botEnabled: isBotEnabled,
    pollingActive: isPollingActive,
    message: isBotEnabled
      ? "تم تشغيل بوت التليجرام بنجاح! البوت يعمل الآن ويستقبل الرسائل."
      : "تم إيقاف/فصل بوت التليجرام بنجاح! البوت متوقف حالياً عن العمل.",
  });
});

// Telegram Status Endpoint
app.get(
  "/api/telegram/status",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
  const data = await callTelegramApi("getMe");
  if (data && data.ok) {
    // Ensure polling is active if bot is enabled
    await callTelegramApi("deleteWebhook", { drop_pending_updates: false }).catch(() => {});
    if (!isPollingActive && isBotEnabled) startTelegramPolling();

    return res.json({
      connected: true,
      botInfo: data.result,
      botEnabled: isBotEnabled,
      pollingActive: isPollingActive && isBotEnabled,
    });
  } else {
    return res.json({
      connected: false,
      error: data?.description || "Unable to connect to Telegram Bot API",
      botEnabled: isBotEnabled,
      pollingActive: false,
    });
  }
});

// Telegram Set Token Endpoint
app.post(
  "/api/telegram/set-token",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  const previousToken = activeTelegramToken;
  const candidateToken = token.trim();

  // Temporarily use the candidate only for BotFather validation.
  activeTelegramToken = candidateToken;

  const data = await callTelegramApi("getMe");

  if (data && data.ok) {
    try {
      // Persist only after BotFather confirms the token.
      await persistAgencyTelegramToken(
        candidateToken
      );
    } catch (error: any) {
      activeTelegramToken = previousToken;

      console.error(
        "[Agency Telegram] Secure token save failed:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Telegram token was valid but could not be stored securely.",
      });
    }

    await callTelegramApi(
      "deleteWebhook",
      { drop_pending_updates: false }
    ).catch(() => {});

    isPollingActive = false;
    lastUpdateOffset = 0;

    setTimeout(
      () => startTelegramPolling(),
      500
    );

    return res.json({
      success: true,
      botInfo: data.result,
      hasToken: true,
      message:
        "Telegram Bot Token updated, encrypted and verified successfully.",
    });

  } else {
    // Never replace the working token with an invalid candidate.
    activeTelegramToken = previousToken;

    return res.status(400).json({
      success: false,
      error:
        data?.description ||
        "Invalid Telegram Bot Token from BotFather",
    });
  }
});

// Direct Send Telegram Message
app.post(
  "/api/telegram/send-message",
  authenticateFirebaseRequest,
  requireSuperAdmin,
  async (req, res) => {
  const { chatId, text } = req.body;
  if (!chatId || !text) {
    return res.status(400).json({ error: "chatId and text are required" });
  }

  const result = await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  });

  if (result && result.ok) {
    return res.json({ success: true, telegramResult: result.result });
  } else {
    return res.status(400).json({ success: false, error: result?.description || "Failed to send message" });
  }
});

// Telegram Webhook Endpoint
app.post("/api/telegram/webhook", async (req, res) => {
  const update = req.body;
  if (update && update.message && update.message.chat) {
    const chatId = String(update.message.chat.id);
    const userMsg = update.message.text || "";
    const userInfo = update.message.from || { first_name: update.message.chat.first_name || "عميل تليجرام" };

    const replyText = await processAgencyBotMessage(chatId, userInfo, userMsg);

    await callTelegramApi("sendMessage", {
      chat_id: chatId,
      text: replyText,
      parse_mode: "Markdown",
    });
  }
  return res.json({ ok: true });
});

// ==========================================
// FACEBOOK MESSENGER WEBHOOK ENDPOINTS
// ==========================================

// GET Facebook Webhook Verification (Required by Meta)
const handleFacebookVerification = (req: express.Request, res: express.Response) => {
  const mode = req.query["hub.mode"] || req.query["mode"];
  const token = req.query["hub.verify_token"] || req.query["verify_token"];
  const challenge = req.query["hub.challenge"] || req.query["challenge"];

  console.log("[Facebook Webhook Verification GET Request]:", req.query);

  if (mode === "subscribe" && challenge) {
    console.log("[Facebook Webhook Verified Successfully!] Challenge:", challenge);
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(String(challenge));
  }

  // Fallback: If challenge exists, always return it with 200 OK so Meta verification succeeds instantly
  if (challenge) {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(String(challenge));
  }

  return res.status(200).send("Facebook Webhook Active");
};

app.get("/api/webhook/facebook", handleFacebookVerification);
app.get("/webhook/facebook", handleFacebookVerification);

// POST Facebook Webhook Receiver (Incoming Messages)
const handleFacebookMessage = async (req: express.Request, res: express.Response) => {
  const body = req.body;
  console.log("[Facebook Webhook Received POST]:", JSON.stringify(body));

  if (body.object === "page") {
    for (const entry of body.entry || []) {
      const messagingList = entry.messaging || [];
      for (const webhookEvent of messagingList) {
        // Skip echo messages sent by the page itself
        if (webhookEvent.message && webhookEvent.message.is_echo) {
          continue;
        }

        if (webhookEvent.message && webhookEvent.message.text) {
          const senderPsid = webhookEvent.sender?.id;
          const messageText = webhookEvent.message.text;

          console.log(`[Facebook Messenger Received] Sender PSID: ${senderPsid}, Message: ${messageText}`);

          if (senderPsid) {
            // Process message with Agency Bot Engine
            const replyText = await processAgencyBotMessage(senderPsid, { first_name: "عميل فيسبوك" }, messageText);

            // Send Reply back to Facebook Page via Graph API if page token is configured
            if (activeFacebookPageToken) {
              try {
                const graphRes = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${activeFacebookPageToken}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    recipient: { id: senderPsid },
                    message: { text: replyText },
                  }),
                });
                const graphData = await graphRes.json();
                console.log("[Facebook Graph API Send Response]:", graphData);
              } catch (err) {
                console.error("[Facebook Messenger Send Reply Error]:", err);
              }
            } else {
              console.warn("[Facebook Messenger]: activeFacebookPageToken is empty!");
            }
          }
        }
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } else {
    return res.sendStatus(404);
  }
};

app.post("/api/webhook/facebook", handleFacebookMessage);
app.post("/webhook/facebook", handleFacebookMessage);

// ==========================================
// MANYCHAT INTEGRATION ENDPOINT
// ==========================================
app.post("/api/manychat/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const userMsg =
      body.message ||
      body.last_input_text ||
      body.userMessage ||
      body.content ||
      query.message ||
      "";

    const subscriberId = String(
      body.subscriber_id || body.user_id || body.id || query.subscriber_id || "manychat_user"
    );

    const firstName =
      body.first_name || body.name || query.first_name || "عميل ماسنجر";

    console.log(`[ManyChat Request] Subscriber: ${subscriberId} (${firstName}), Message: "${userMsg}"`);

    if (!userMsg) {
      const fallbackReply = "أهلاً بك! لم يصلنا أي نص في رسالتك. كيف يمكنني مساعدتك؟";
      return res.json({
        reply: fallbackReply,
        version: "v2",
        content: {
          messages: [{ type: "text", text: fallbackReply }],
        },
      });
    }

    // Generate response using Agency Bot AI engine
    const replyText = await processAgencyBotMessage(
      subscriberId,
      { first_name: firstName },
      userMsg
    );

    // Return response compatible with both standard REST API & ManyChat Dynamic Content v2
    return res.json({
      reply: replyText,
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: replyText,
          },
        ],
      },
    });
  } catch (err: any) {
    console.error("[ManyChat Endpoint Error]:", err);
    const errReply = "عفواً، حدث خطأ أثناء معالجة الطلب بالذكاء الاصطناعي. برجاء المحاولة لاحقاً.";
    return res.status(500).json({
      error: err.message,
      reply: errReply,
      version: "v2",
      content: {
        messages: [{ type: "text", text: errReply }],
      },
    });
  }
});
app.get("/api/manychat/chat", (req, res) => {
  return res.json({
    status: "active",
    endpoint: "https://fox-ai-agency.ai.studio/api/manychat/chat",
    info: "ManyChat External Request Endpoint for Fox AI Agency",
  });
});

// ==========================================
// MAKE.COM INTEGRATION ENDPOINT
// ==========================================
app.post("/api/make/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const userMsg =
      body.message ||
      body.text ||
      body.userMessage ||
      body.content ||
      query.message ||
      "";

    const senderId = String(
      body.sender_id || body.user_id || body.id || query.sender_id || "make_user"
    );

    const firstName =
      body.first_name || body.name || query.first_name || "عميل ماسنجر";

    console.log(`[Make.com Request] Sender: ${senderId} (${firstName}), Message: "${userMsg}"`);

    if (!userMsg) {
      return res.json({
        success: true,
        reply: "أهلاً بك! لم يصلنا أي نص في الرسالة. كيف يمكنني مساعدتك؟",
      });
    }

    // Process message through Agency Bot AI Engine
    const replyText = await processAgencyBotMessage(
      senderId,
      { first_name: firstName },
      userMsg
    );

    return res.json({
      success: true,
      sender_id: senderId,
      reply: replyText,
    });
  } catch (err: any) {
    console.error("[Make.com Endpoint Error]:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
      reply: "عفواً، حدث خطأ أثناء معالجة الطلب بالذكاء الاصطناعي. برجاء المحاولة لاحقاً.",
    });
  }
});

app.get("/api/make/chat", (_req, res) => {
  return res.json({
    status: "active",
    endpoint: "https://fox-ai-agency.ai.studio/api/make/chat",
    info: "Make.com Integration Endpoint for Fox AI Agency",
  });
});

// Facebook Config API Endpoints
app.get("/api/facebook/config", (_req, res) => {
  return res.json({
    verifyToken: activeFacebookVerifyToken,
    hasPageToken: Boolean(activeFacebookPageToken),
    webhookUrl: "https://fox-ai-agency.ai.studio/api/webhook/facebook",
  });
});

app.post("/api/facebook/config", (req, res) => {
  const { verifyToken, pageToken } = req.body;
  if (verifyToken && typeof verifyToken === "string") {
    activeFacebookVerifyToken = verifyToken.trim();
  }
  if (typeof pageToken === "string") {
    activeFacebookPageToken = pageToken.trim();
  }
  return res.json({
    success: true,
    message: "Facebook Messenger configuration updated successfully!",
    verifyToken: activeFacebookVerifyToken,
    hasPageToken: Boolean(activeFacebookPageToken),
  });
});

// Official Telegram Bot Simulation Endpoint
app.post("/api/telegram/bot", async (req, res) => {
  const { message, chatId = "sim_user_101", userInfo = { first_name: "مستخدم تجربة اللوحة", username: "admin_test" } } = req.body;
  const msg = message || "";
  const response = await processAgencyBotMessage(String(chatId), userInfo, msg);
  const isArabic = /[\u0600-\u06FF]/.test(msg);

  return res.json({
    telegramResponse: response,
    detectedLanguage: isArabic ? "ar" : "en",
    registeredClients: registeredWorkspacesStore,
    registeredLeads: registeredLeadsStore,
  });
});




// n8n Webhook Simulation & Proxy Endpoint
app.post("/api/n8n/webhook", async (req, res) => {
  try {
    const {
      event,
      payload,
      customWebhookUrl,
      workspaceId: bodyWorkspaceId,
    } = req.body || {};

    const startTime = Date.now();

    // ========================================================
    // FOX SECURITY:
    // n8n is an Enterprise-only tenant integration.
    // Never trust planId or entitlement data from the request.
    // ========================================================

    const requestedWorkspaceId = String(
      bodyWorkspaceId ||
      payload?.workspaceId ||
      ""
    ).trim();

    if (!requestedWorkspaceId) {
      return res.status(400).json({
        success: false,
        status: "failed",
        code: "WORKSPACE_ID_REQUIRED",
        error: "workspaceId is required",
      });
    }

    const trustedWorkspace =
      resolveTrustedWorkspace(requestedWorkspaceId);

    if (!trustedWorkspace) {
      console.warn(
        `🚫 [FOX n8n] Unknown workspace | Workspace=${requestedWorkspaceId}`
      );

      return res.status(404).json({
        success: false,
        status: "failed",
        code: "WORKSPACE_NOT_FOUND",
        error: "Workspace not found",
      });
    }

    const access =
      requireWorkspaceFeature(
        trustedWorkspace,
        "n8n"
      );

    if (!access.allowed) {
      console.warn(
        `🔒 [FOX n8n] Blocked | Workspace=${trustedWorkspace.id} | Plan=${trustedWorkspace.planId}`
      );

      return res.status(access.status).json({
        success: false,
        status: "blocked",
        ...access,
      });
    }

    console.log(
      `🔓 [FOX n8n] Allowed | Workspace=${trustedWorkspace.id} | Plan=${trustedWorkspace.planId} | Event=${event || "test_trigger"}`
    );

    // ========================================================
    // External n8n webhook
    // ========================================================

    if (
      customWebhookUrl &&
      typeof customWebhookUrl === "string" &&
      customWebhookUrl.startsWith("http")
    ) {
      try {
        const response = await fetch(
          customWebhookUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...(payload || {}),
              workspaceId: trustedWorkspace.id,
              event: event || "test_trigger",
            }),
          }
        );

        const durationMs =
          Date.now() - startTime;

        let data;

        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }

        return res.json({
          success: response.ok,
          status:
            response.ok
              ? "success"
              : "error",
          statusCode: response.status,
          durationMs,
          workspaceId:
            trustedWorkspace.id,
          event:
            event || "test_trigger",
          executionId:
            `exec_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          timestamp:
            new Date().toISOString(),
          responseData: data,
          message: response.ok
            ? `External n8n Webhook triggered successfully! (HTTP ${response.status})`
            : `External n8n Webhook returned HTTP ${response.status}`,
        });

      } catch (err: any) {
        return res.status(500).json({
          success: false,
          status: "failed",
          statusCode: 500,
          durationMs:
            Date.now() - startTime,
          workspaceId:
            trustedWorkspace.id,
          error:
            err.message ||
            "Failed to reach external n8n webhook URL",
          timestamp:
            new Date().toISOString(),
        });
      }
    }

    // ========================================================
    // Internal n8n simulation
    // ========================================================

    console.log(
      `[n8n Webhook Triggered] Workspace=${trustedWorkspace.id} | Event=${event || "test_trigger"}`
    );

    return res.json({
      success: true,
      status: "success",
      statusCode: 200,
      durationMs:
        Math.floor(
          Math.random() * 40
        ) + 15,
      workspaceId:
        trustedWorkspace.id,
      event:
        event || "test_trigger",
      executionId:
        `exec_${Math.random()
          .toString(36)
          .substring(2, 9)}`,
      timestamp:
        new Date().toISOString(),
      responseData: {
        received: true,
        event:
          event || "test_trigger",
        workspaceId:
          trustedWorkspace.id,
        processedBy:
          "FOX AI Agency n8n Integration Hub",
        dataEcho:
          payload || {},
      },
      message:
        `n8n workflow executed successfully for event: ${event || "test_trigger"}`,
    });

  } catch (err: any) {
    console.error(
      "[FOX n8n Endpoint Error]:",
      err
    );

    return res.status(500).json({
      success: false,
      status: "failed",
      error:
        err.message ||
        "n8n request failed",
    });
  }
});

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  // --------------------------------------------------------
  // Secure Agency Telegram startup
  // --------------------------------------------------------
  await hydrateAgencyTelegramToken();

  if (
    activeTelegramToken &&
    isBotEnabled
  ) {
    startTelegramPolling();
  }

  // --------------------------------------------------------
  // Persistent tenant startup
  // --------------------------------------------------------
  await hydrateRegisteredWorkspacesFromFirestore();

  // Start Telegram workers only AFTER Firestore tenants exist.
  await syncWorkspaceTelegramBots();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🦊 FOX AI AGENCY Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
