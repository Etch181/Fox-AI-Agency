import React, { useState, useEffect } from "react";
import { useTranslation } from "../../services/LanguageService";
import { useApp } from "../../context/AppContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  Clock,
  Calendar,
  Send,
  Bot,
  TrendingUp,
  Image as ImageIcon,
  ExternalLink,
  Target,
  Trash2,
  RefreshCw,
  Lightbulb,
  Zap,
  Globe,
  MessageSquare,
  Activity,
  AlertCircle,
  CheckCircle2,
  Radio,
  ShieldOff,
  Settings,
  Crown,
} from "lucide-react";

export interface GeneratedSocialPost {
  id?: string;
  workspaceId: string;
  platform: "facebook" | "instagram" | "linkedin" | "twitter" | "tiktok";
  topic: string;
  content: string;
  recommendedTime: string;
  bestDays: string;
  reason: string;
  suggestedVisualPrompt?: string;
  imageUrl?: string;
  targetAudience: string;
  createdAt?: any;
}

export const ClientMarketingAgent: React.FC = () => {
  const { isAr } = useTranslation();
  const { currentWorkspace } = useApp();

  const [activeTab, setActiveTab] = useState<"generator" | "history">("generator");

  // Form State
  const [topic, setTopic] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<"facebook" | "instagram" | "linkedin" | "twitter" | "tiktok">("facebook");
  const [targetAudience, setTargetAudience] = useState<string>(isAr ? "أصحاب المطاعم والعيادات والمشاريع" : "Business & Clinic Owners");
  const [tone, setTone] = useState<string>(isAr ? "إقناعي وحماسي" : "Persuasive & High Converting");

  // Generation Results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<GeneratedSocialPost | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saved Posts History State
  const [savedPosts, setSavedPosts] = useState<GeneratedSocialPost[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Real Marketing Automation Status (fetched from server)
  const [mktStatus, setMktStatus] = useState<{
    strategySet: boolean;
    approvalMode: string;
    platforms: { facebook: { connected: boolean }; instagram: { connected: boolean } };
    recentPosts: { total: number; published: number; failed: number; lastPublishedAt?: string };
  } | null>(null);
  const [mktStatusLoading, setMktStatusLoading] = useState(true);

  // Real agent activity for Automation Activity inside Marketing FOX (workspace-scoped, no fake data)
  const [agentActivities, setAgentActivities] = useState<Array<{id:string; message:string; severity?:string; createdAt:string}>>([]);
  const [agentActivitiesLoading, setAgentActivitiesLoading] = useState(true);

  // Fetch Saved Posts from Firestore
  useEffect(() => {
    fetchPostsHistory();
  }, [currentWorkspace?.id]);

  // Fetch real Marketing Automation Status from server
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    setMktStatusLoading(true);
    fetch("/api/marketing/status", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json().catch(() => null))
      .then((data: any) => {
        if (cancelled) return;
        setMktStatus(data);
        setMktStatusLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMktStatus(null);
        setMktStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentWorkspace?.id]);

  // Fetch real workspace agent activities (same endpoint ClientN8n uses)
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    setAgentActivitiesLoading(true);
    fetch(`/api/agents/activity?workspaceId=${encodeURIComponent(currentWorkspace.id)}`, { headers: { 'Content-Type': 'application/json' } })
      .then((r) => r.json().catch(() => null))
      .then((data: any) => {
        if (cancelled) return;
        const acts = Array.isArray(data?.activities) ? data.activities : [];
        setAgentActivities(acts.slice(0, 4));
        setAgentActivitiesLoading(false);
      })
      .catch(() => { if (!cancelled) { setAgentActivities([]); setAgentActivitiesLoading(false); } });
    return () => { cancelled = true; };
  }, [currentWorkspace?.id]);

  const fetchPostsHistory = async () => {
    if (!currentWorkspace?.id) return;
    setLoadingHistory(true);
    try {
      const postsRef = collection(db, "marketing_generated_posts");
      const qPosts = query(postsRef, where("workspaceId", "==", currentWorkspace.id));
      const postsSnap = await getDocs(qPosts);
      const fetched: GeneratedSocialPost[] = [];
      postsSnap.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as GeneratedSocialPost);
      });

      if (fetched.length > 0) {
        setSavedPosts(fetched);
      } else {
        setSavedPosts([]);
      }
    } catch (e) {
      console.error("Error fetching saved generated posts:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Generate Post Handler
  const handleGeneratePost = async () => {
    setIsGenerating(true);
    setCopied(false);

    try {
      const response = await fetch("/api/generate-ai-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform: selectedPlatform,
          targetAudience,
          tone,
          language: isAr ? "ar" : "en"
        })
      });

      const data = await response.json();

      if (data.success) {
        // NOTE: image generation is NOT a connected provider. We do NOT fabricate
        // or persist a fake imageUrl. The marketing_generated_posts record only
        // contains the AI-authored copy + scheduling advice returned by the server.
        // If image generation is added later (e.g. via n8n + DALL-E/Stability),
        // populate imageUrl from the real provider response only.
        const newResult: GeneratedSocialPost = {
          workspaceId: currentWorkspace?.id || "",
          platform: selectedPlatform,
          topic: topic || (isAr ? "منشور تسويقي مميز" : "Social Marketing Post"),
          content: data.postContent,
          recommendedTime: data.recommendedTime || "",
          bestDays: data.bestDays || "",
          reason: data.reason || "",
          suggestedVisualPrompt: data.suggestedVisualPrompt,
          targetAudience
        };

        setCurrentResult(newResult);

        // Save to Firestore
        try {
          const docRef = await addDoc(collection(db, "marketing_generated_posts"), {
            ...newResult,
            createdAt: serverTimestamp()
          });
          setSavedPosts((prev) => [{ ...newResult, id: docRef.id }, ...prev]);
        } catch (e) {
          console.error("Error saving generated post to Firestore:", e);
          setSavedPosts((prev) => [{ ...newResult, id: "local_" + Date.now() }, ...prev]);
        }
      }
    } catch (err: any) {
      console.error("Error generating AI post:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Content Handler
  const handleCopyText = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Delete Post
  const handleDeletePost = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "marketing_generated_posts", id));
      setSavedPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Error deleting post:", e);
      setSavedPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "📘 Facebook";
      case "instagram":
        return "📸 Instagram";
      case "linkedin":
        return "💼 LinkedIn";
      case "twitter":
        return "🐦 X / Twitter";
      case "tiktok":
        return "🎵 TikTok";
      default:
        return "📱 Social Media";
    }
  };

  const getSocialLink = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "https://www.facebook.com";
      case "instagram":
        return "https://www.instagram.com";
      case "linkedin":
        return "https://www.linkedin.com";
      case "twitter":
        return "https://x.com";
      case "tiktok":
        return "https://www.tiktok.com";
      default:
        return "https://www.facebook.com";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 opacity-15 pointer-events-none">
          <Bot className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{isAr ? "كتابة المنشورات وتحديد أفضل أوقات النشر" : "AI Content & Optimal Timing Generator"}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {isAr ? "مُولّد منشورات السوشيال ميديا الذكي 🚀" : "AI Social Media Post Generator"}
          </h1>

          <p className="text-sm text-orange-100 font-medium leading-relaxed">
            {isAr
              ? "اكتب فكرة منشورك أو اختر اقتراحاً بالذكاء الاصطناعي، ليقوم المساعد بتوليد النص كاملاً مع الإيموجي والهاشتاجات، بالإضافة لتحديد أفضل وقت للنشر لجمهورك لتنسخ البوست وتنشره مباشرة من صفحتك."
              : "Generate high-converting posts with hashtags and emojis, plus optimal posting time recommendations. Simply copy and publish directly on your page."}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="bg-white/15 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20">
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isAr ? "نسخ بضغطة زر واحدة" : "1-Click Copy"}</span>
            </span>
            <span className="bg-white/15 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? "تحليل أفضل أوقات النشر" : "Optimal Time Analyzer"}</span>
            </span>
            <span className="bg-white/15 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20">
              <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
              <span>{isAr ? "زيادة التفاعل والوصول" : "Maximize Reach"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Marketing Automation Activity — real workspace-scoped status (no simulated data) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20"><Activity className="h-5 w-5" /></div>
            <div>
              <h3 className="text-sm font-black text-white">{isAr ? "نشاط التشغيل الآلي (Marketing FOX)" : "Marketing Automation Activity"}</h3>
              <p className="text-[11px] text-slate-400 font-medium">{isAr ? "حالة الاستراتيجية، الموافقات، ون8n" : "Strategy, approvals, and n8n execution status"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <Radio className="h-3 w-3 text-emerald-400" /> {isAr ? "مبني على بيانات حقيقية" : "Real data only"}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              labelAr: "وضع الموافقة", labelEn: "Approval Mode",
              value: mktStatusLoading ? (isAr ? "..." : "...") : (mktStatus?.approvalMode === 'AUTO_PUBLISH' ? (isAr ? "نشر تلقائي" : "Auto-Publish") : mktStatus?.approvalMode === 'MANUAL_APPROVAL' ? (isAr ? "موافقة يدوية" : "Manual Approval") : (isAr ? "غير مهيأ" : "Not configured")),
              color: "text-amber-400", icon: <ShieldOff className="h-4 w-4 text-amber-400" />,
            },
            {
              labelAr: "استراتيجية", labelEn: "Strategy",
              value: mktStatusLoading ? (isAr ? "..." : "...") : (mktStatus?.strategySet ? (isAr ? "مُعدّة" : "Configured") : (isAr ? "غير موجودة" : "Missing")),
              color: "text-emerald-400", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
            },
            {
              labelAr: "فيسبوك / إنستغرام", labelEn: "Facebook / IG",
              value: mktStatusLoading ? (isAr ? "..." : "...") : ((mktStatus?.platforms?.facebook?.connected ? (isAr ? "متصل" : "Connected") : (isAr ? "غير متصل" : "Not connected")) + "/" + (mktStatus?.platforms?.instagram?.connected ? (isAr ? "متصل" : "Connected") : (isAr ? "غير متصل" : "Not connected"))),
              color: "text-sky-400", icon: <Globe className="h-4 w-4 text-sky-400" />,
            },
            {
              labelAr: "واتساب / مسنجر", labelEn: "WhatsApp / Messenger",
              value: mktStatusLoading ? (isAr ? "..." : "...") : (() => {
                const w = currentWorkspace?.whatsappBotStatus;
                const m = currentWorkspace?.metaPageId;
                const connected = (w === 'connected') || !!m;
                return (isAr ? (connected ? "متصل" : "غير متصل") : (connected ? "Connected" : "Not connected")) + (m ? (isAr ? " (Meta)" : " (Meta)") : "") + (isAr ? " — عبر n8n" : " — via n8n");
              })(),
              color: "text-red-400", icon: <MessageSquare className="h-4 w-4 text-red-400" />,
            },
            {
              labelAr: "تليجرام", labelEn: "Telegram",
              value: mktStatusLoading ? (isAr ? "..." : "...") : (() => {
                const t = currentWorkspace?.telegramBotStatus;
                const connected = t === 'connected';
                return (isAr ? (connected ? "متصل" : "غير متصل") : (connected ? "Connected" : "Not connected")) + (isAr ? " — عبر n8n / Agent" : " — via n8n / Agent");
              })(),
              color: "text-violet-400", icon: <Send className="h-4 w-4 text-violet-400" />,
            },
            {
              labelAr: "منشورات حديثة (مُنشرة)", labelEn: "Recent Published",
              value: mktStatusLoading ? (isAr ? "..." : "...") : `${mktStatus?.recentPosts?.published ?? 0}`,
              color: "text-white", icon: <Zap className="h-4 w-4 text-amber-400" />,
            },
          ].map((s, idx) => (
            <div key={idx} className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.icon}<span>{isAr ? s.labelAr : s.labelEn}</span></div>
              <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 font-medium">{isAr ? "من n8n / Firestore — لا بيانات وهمية" : "From n8n / Firestore — no fake data"}</div>
            </div>
          ))}
        </div>
        {agentActivities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-200 mb-2">
              <Activity className="h-3.5 w-3.5" />
              <span>{isAr ? "آخر أنشطة التشغيل الآلي (من سجل الوكلاء)" : "Recent Automation Activity (from agent registry)"}</span>
            </div>
            <div className="space-y-2">
              {agentActivities.map((a) => (
                <div key={a.id} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-start gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full mt-1 shrink-0 ${a.severity === 'error' ? 'bg-rose-400' : a.severity === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-100 leading-snug truncate">{a.message}</p>
                    <p className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-amber-300/90 font-medium">
          <Settings className="h-3.5 w-3.5" />
          <span>{isAr ? "ن8n workflow: 07-marketing-scheduled-post.json — التنفيذ عبر n8n مع مدخل MANUAL_APPROVAL / AUTO_PUBLISH." : "n8n workflow: 07-marketing-scheduled-post.json — execution via n8n with MANUAL_APPROVAL / AUTO_PUBLISH mode."}</span>
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-lg font-extrabold">{isAr ? "لا بيانات وهمية" : "NO FAKE DATA"}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 rtl:space-x-reverse">
        <button
          onClick={() => setActiveTab("generator")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all ${
            activeTab === "generator"
              ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAr ? "توليد منشور جديد" : "Create New Post"}</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all ${
            activeTab === "history"
              ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isAr ? `أرشيف المنشورات المولّدة (${savedPosts.length})` : `Saved Posts (${savedPosts.length})`}</span>
        </button>
      </div>

      {/* TAB 1: GENERATOR */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Column */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-orange-500" />
                <span>{isAr ? "بيانات المنشور المطلوب" : "Post Details & Objective"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? "حدد المنصة والجمهور وفكرة البوست التي تريد كتابتها" : "Select platform, audience, and main message"}
              </p>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isAr ? "منصة النشر" : "Target Platform"}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(["facebook", "instagram", "linkedin", "twitter", "tiktok"] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatform(plat)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      selectedPlatform === plat
                        ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="capitalize text-[11px]">{plat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input with AI Generator Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "موضوع البوست / العرض التسويقي" : "Post Topic / Offer"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sampleTopicsAr = [
                      `🚀 عرض حصري لأصحاب (${targetAudience}): نظام الرد الآلي واقتناص المبيعات بالذكاء الاصطناعي 24/7`,
                      `⚡ كيف توفر مشروعك 80% من مصاريف خدمة العملاء وتزيد المبيعات باستخدام Fox AI؟`,
                      `🔥 تحويل التعليقات إلى رسائل الخاص ومبيعات فورية دون أي تدخل بشري لـ (${targetAudience})`,
                      `🎯 تجربة مجانية: وكيل ذكاء اصطناعي ذكي مخصص لجدولة المواعيد وتلقي الطلبات تلقائياً`,
                      `💎 باقة الوكالة المتكاملة: ربط واتساب وتليجرام وانستجرام في منصة واحدة لزيادة العملاء`
                    ];
                    const sampleTopicsEn = [
                      `🚀 Exclusive Offer for (${targetAudience}): 24/7 AI Sales & Support Automation Agent`,
                      `⚡ How to cut customer service costs by 80% and boost sales with Fox AI`,
                      `🔥 Turn social comments into instant DMs & leads automatically for (${targetAudience})`,
                      `🎯 Free Trial: Smart AI Agent customized for booking & automated order management`
                    ];
                    const list = isAr ? sampleTopicsAr : sampleTopicsEn;
                    const deterministicIndex = currentWorkspace?.id ? (currentWorkspace.id.length % list.length) : 0;
                    const selectedChoice = list[deterministicIndex];
                    setTopic(selectedChoice);
                  }}
                  className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 bg-orange-50 dark:bg-orange-950/50 px-2.5 py-1 rounded-xl border border-orange-200 dark:border-orange-800 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{isAr ? "اقتراح موضوع بالذكاء الاصطناعي ✨" : "Suggest Topic ✨"}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  isAr
                    ? "مثال: عرض خصم 30% على اشتراك نظام إدارة الطلبات والمطاعم بالذكاء الاصطناعي..."
                    : "e.g. 30% discount on restaurant order management automation..."
                }
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium resize-none"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? "الجمهور المستهدف" : "Target Audience"}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder={isAr ? "مثال: أصحاب المطاعم، العيادات، العقارات..." : "e.g. Restaurant Owners, Doctors..."}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Tone Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? "نبرة الكتابة" : "Writing Tone"}
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white font-medium"
              >
                <option value={isAr ? "إقناعي وحماسي" : "Persuasive & High-Converting"}>
                  {isAr ? "🔥 إقناعي وحماسي (تحفيز اتخاذ إجراء)" : "🔥 Persuasive & High-Converting"}
                </option>
                <option value={isAr ? "احترافي ورسمي" : "Professional & Formal"}>
                  {isAr ? "💼 احترافي ورسمي (مناسب للشركات ولينكد إن)" : "💼 Professional & Corporate"}
                </option>
                <option value={isAr ? "عرض وخصم محدد" : "Special Offer & Discount"}>
                  {isAr ? "🎁 عرض خاص وخصم حصري لفترة محدودة" : "🎁 Special Offer & Discount"}
                </option>
                <option value={isAr ? "تثقيفي وتوعوي" : "Educational & Informative"}>
                  {isAr ? "💡 تثقيفي وتوعوي (تبسيط المزايا والفوائد)" : "💡 Educational & Informative"}
                </option>
              </select>
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              onClick={handleGeneratePost}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{isAr ? "جاري كتابة المنشور واحتساب أفضل أوقات النشر..." : "Generating Post & Optimal Schedule..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  <span>{isAr ? "✨ كتابة المنشور وتحليل وقت النشر المثالي" : "✨ Generate Post & Optimal Timing"}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Result Column */}
          <div className="lg:col-span-7 space-y-6">
            {currentResult ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                {/* Generated Post Box */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-xs">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{getPlatformIcon(currentResult.platform)}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyText(currentResult.content)}
                      className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                        copied
                          ? "bg-emerald-600 text-white shadow-emerald-600/20"
                          : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{isAr ? "✅ تم نسخ النص للحافظة!" : "✅ Copied to Clipboard!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>{isAr ? "📋 نسخ نص البوست بضغطة زر" : "📋 Copy Post Text"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Formatted Post Area */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {currentResult.content}
                  </div>
                </div>

                {/* Quick Launch Buttons */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 space-y-2">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? "جاهز للنشر؟ يمكنك فتح منصتك مباشرة للصق البوست:" : "Ready to publish? Open your platform to paste:"}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href={getSocialLink(currentResult.platform)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>{isAr ? `فتح ${currentResult.platform}` : `Open ${currentResult.platform}`}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="https://www.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      📘 Facebook
                    </a>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      📸 Instagram
                    </a>
                  </div>
                </div>

                {/* Optimal Publishing Time Analysis Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>{isAr ? "أفضل وقت وتوقيت لنشر هذا المنشور لجمهورك" : "Optimal Publishing Time Advice"}</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{isAr ? "🕒 الوقت الذهبي الموصى به اليوم:" : "🕒 Recommended Time:"}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{currentResult.recommendedTime}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{isAr ? "📅 أفضل أيام النشر لـ " + currentResult.platform + ":" : "📅 Best Days:"}</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{currentResult.bestDays}</p>
                    </div>
                  </div>

                  <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed font-medium">
                    💡 <strong>{isAr ? "تلميحات زيادة الوصول:" : "Reach Tip:"}</strong> {currentResult.reason}
                  </p>
                </div>

                {/* Suggested Visual Idea */}
                {currentResult.suggestedVisualPrompt && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-500" />
                      <span>{isAr ? "مقترح الصورة/التصميم البصري للمنشور:" : "Suggested Image Concept:"}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                      "{currentResult.suggestedVisualPrompt}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State Placeholder */
              <div className="h-full min-h-[380px] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? "منطقة عرض المنشور المولّد والتوقيت المثالي" : "Your Generated Post Will Appear Here"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {isAr
                      ? "اكتب الموضوع واضغط زر التوليد بالأعلى للحصول على نص المنشور كاملاً وأفضل وقت لنشره على صفحتك."
                      : "Enter your topic and click Generate to view your post and optimal publishing times."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? "أرشيف المنشورات التي قمت بتوليدها أوفلاين/أونلاين" : "Previously Generated Posts"}
            </h3>
            <span className="text-xs text-slate-500">{savedPosts.length} {isAr ? "منشور محفوظ" : "saved posts"}</span>
          </div>

          {savedPosts.length === 0 && !loadingHistory ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? "لا توجد منشورات محفوظة بعد" : "No saved posts yet"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {isAr
                    ? "سيظهر هنا كل منشور تولّده فعلياً من تبويب \"توليد منشور جديد\" بعد حفظه في Firestore. لا توجد بيانات وهمية أو محفوظات مسبقة."
                    : "Every post you actually generate from the \"Create New Post\" tab will appear here once persisted to Firestore. No demo or fake content is shown."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("generator")}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? "ابدأ بتوليد أول منشور" : "Generate your first post"}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xs relative hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                    <Share2 className="w-3 h-3 text-orange-500" />
                    <span>{getPlatformIcon(post.platform)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(post.content, post.id)}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? "تم النسخ" : "Copied"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isAr ? "نسخ البوست" : "Copy Post"}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors"
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {post.topic}
                </p>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto font-sans">
                  {post.content}
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAr ? `الوقت الموصى به: ${post.recommendedTime}` : `Best Time: ${post.recommendedTime}`}</span>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
