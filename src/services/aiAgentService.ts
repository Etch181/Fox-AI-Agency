import { aiModelAnalyticsService } from "./aiModelAnalyticsService";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { checkAvailability, bookAppointmentInSheet } from "./googleSheetsService";
import { workspaceDataService } from "./workspaceDataService";
import { triggerExternalCRM } from "./crmService";
import { sharedMemoryService } from "./sharedMemoryService";
import { creditService } from "./creditService";
import { couponService } from "./couponService";
import { workspaceCrmService } from "./workspaceCrmService";

export interface AiAgentConfig {
  agentName?: string;
  customPrompt?: string;
  tone?: "Friendly" | "Professional" | "Empathetic" | "Formal" | "Direct";
  languageMode?: "auto" | "arabic" | "english";
  autoBookingEnabled?: boolean;
  autoComplaintEscalation?: boolean;
  strictCatalogOnly?: boolean;
  currency?: string;
  fallbackMessage?: string;
  workingHours?: string;
  supportAgentName?: string;
  supportAgentPrompt?: string;
  salesAgentName?: string;
  salesAgentPrompt?: string;
  marketingAgentName?: string;
  marketingAgentPrompt?: string;
  routerPrompt?: string;
  salesKeywords?: string;
  supportKeywords?: string;
  marketingKeywords?: string;
  enableServiceRating?: boolean;
  serviceRatingPrompt?: string;
}

export interface WorkspaceContext {
  id?: string;
  name?: string;
  industry?: string;
  creditBalance?: number;
  aiSettings?: AiAgentConfig;
  knowledgeBase?: { question: string; answer: string; approved?: boolean }[];
  doctors?: { name: string; specialty: string; slots?: string[]; consultationFeeEGP?: number }[];
  menu?: { name: string; category: string; price: number; description?: string; available?: boolean; alternativeItemName?: string; alternativeNotes?: string }[];
  medicines?: { name: string; category: string; price: number; requiresPrescription?: boolean; available?: boolean; alternativeItemName?: string; alternativeNotes?: string }[];
  courses?: { name: string; price: number; duration: string; description?: string; instructor?: string }[];
  courseReviews?: { studentName: string; courseName: string; rating: number; comment: string; reply?: string }[];
  products?: { name: string; price: number; stock?: number; available?: boolean; alternativeItemName?: string; alternativeNotes?: string }[];
  clinicServices?: { name: string; price: number; durationMinutes: number; description?: string; available?: boolean }[];
  googleSheetsAccessToken?: string;
  crmSpreadsheetId?: string;
  externalCrmWebhookUrl?: string;
}

export interface GenerateChatParams {
  workspace?: WorkspaceContext;
  message: string;
  channel?: string;
  chatHistory?: { role?: string; sender?: string; text?: string; parts?: any[] }[];
  sessionId?: string;
  overrideConfig?: Partial<AiAgentConfig>;
}

export interface ChatResponse {
  response: string;
  aiResponse: string;
  detectedLanguage: "ar" | "en";
  source: string;
  suggestedActions: string[];
}


async function markBookingConversion(
  workspaceId: string,
  lead: any,
  appointment: any,
  customerName: string,
  customerPhone: string
) {
  const leadId =
    String(lead?.id || "").trim();

  if (!leadId) {
    console.warn(
      `[FOX CRM Conversion] Booking saved but CRM Lead ID is missing | Workspace=${workspaceId}`
    );
    return;
  }

  try {
    await workspaceCrmService.markCustomerConverted(
      workspaceId,
      leadId,
      {
        name: customerName,
        phone: customerPhone,
        conversionType: "appointment",
        conversionId:
          String(appointment?.id || "").trim() ||
          undefined,
      }
    );
  } catch (error: any) {
    console.error(
      `[FOX CRM Conversion] Appointment conversion sync failed | Workspace=${workspaceId} | Lead=${leadId}`,
      error?.message || error
    );
  }
}

function extractCanonicalExternalCustomerId(
  channel?: string,
  sessionId?: string
): string | undefined {
  const cleanChannel =
    String(channel || "")
      .trim()
      .toLowerCase();

  const cleanSession =
    String(sessionId || "")
      .trim();

  if (!cleanSession) {
    return undefined;
  }

  /*
   * FOX Telegram session format:
   * telegram:<workspaceId>:<chatId>
   */
  if (cleanChannel === "telegram") {
    const parts = cleanSession.split(":");

    if (
      parts.length >= 3 &&
      parts[0].toLowerCase() === "telegram"
    ) {
      const chatId =
        String(parts[parts.length - 1] || "")
          .trim();

      if (chatId) {
        return chatId;
      }
    }
  }

  return undefined;
}

export class AiAgentService {

  // =========================================================
  // =========================================================
  // FOX FREE AI ROUTER
  // =========================================================

  private getOpenRouterPrimaryModel(): string {
    return (
      process.env.OPENROUTER_MODEL?.trim() ||
      "openrouter/free"
    );
  }

  /**
   * OpenRouter's free router dynamically selects from
   * currently available free models and filters models
   * according to request capabilities such as tool calling.
   *
   * Keeping openrouter/free as the final OpenRouter route
   * avoids maintaining stale hard-coded free model IDs.
   */
  private getOpenRouterFallbackModels(
    primaryModel?: string
  ): string[] {
    const primary =
      String(primaryModel || "").trim();

    const models = [
      "openrouter/free",
    ];

    return models.filter(
      (model, index, all) =>
        model &&
        model !== primary &&
        all.indexOf(model) === index
    );
  }

  private getOpenRouterExtraBody(
    primaryModel?: string
  ): Record<string, any> {
    const models =
      this.getOpenRouterFallbackModels(
        primaryModel
      );

    const extraBody: Record<string, any> = {
      provider: {
        allow_fallbacks: true,
      },
    };

    if (models.length > 0) {
      extraBody.models = models;
    }

    return extraBody;
  }

  // OPENROUTER CLIENT
  // Primary AI provider for FOX AI AGENCY
  // Uses OpenAI-compatible API.
  // =========================================================
  private getOpenRouterClient(): OpenAI | null {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return null;

    return new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://fox-ai-agency.ai.studio/",
        "X-Title": "FOX AI AGENCY",
      },
    });
  }

  private getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }

  public detectLanguage(text: string): "ar" | "en" {
    return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
  }


  private parseRouterKeywords(raw: string | undefined, defaults: string[]): string[] {
    if (!raw?.trim()) return defaults;

    return raw
      .split(/[,،\n]/)
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
  }

  private async detectAgentRole(
    workspace: WorkspaceContext = {},
    message: string
  ): Promise<"Sales" | "Support" | "Marketing"> {

    const lower = message.toLowerCase();

    // Appointment / availability questions are Sales unless
    // the customer is reporting a problem with an existing booking.
    const hasAppointmentLanguage =
      /(موعد|مواعيد|كشف|حجز|appointment|appointments|availability|available)/i.test(lower);

    const hasExistingBookingProblem =
      /(اتلغ|إلغاء|الغاء|مشكلة|تأخير|متأخر|شكوى|refund|cancel|complaint|problem|issue)/i.test(lower);

    if (hasAppointmentLanguage && !hasExistingBookingProblem) {
      return "Sales";
    }

    const salesKeywords = this.parseRouterKeywords(
      workspace.aiSettings?.salesKeywords,
      [
        "سعر", "اسعار", "أسعار", "بكام",
        "شراء", "اشتراك", "باقة", "باقات",
        "حجز", "احجز", "طلب", "اطلب",
        "price", "pricing", "buy", "book",
        "order", "subscribe"
      ]
    );

    const supportKeywords = this.parseRouterKeywords(
      workspace.aiSettings?.supportKeywords,
      [
        "شكوى", "مشكلة", "مش شغال", "لا يعمل",
        "عطل", "مساعدة", "الغاء", "إلغاء",
        "اتلغى", "تأخير", "متأخر", "استرجاع",
        "complaint", "issue", "problem", "help",
        "cancel", "refund", "support"
      ]
    );

    const marketingKeywords = this.parseRouterKeywords(
      workspace.aiSettings?.marketingKeywords,
      [
        "عرض", "عروض", "خصم", "خصومات",
        "كوبون", "برومو", "جديد", "ترشيح",
        "اقتراح", "offer", "offers", "discount",
        "promo", "coupon", "recommend"
      ]
    );

    const score = (keywords: string[]) =>
      keywords.reduce(
        (total, keyword) => total + (lower.includes(keyword) ? 1 : 0),
        0
      );

    const scores = {
      Sales: score(salesKeywords),
      Support: score(supportKeywords),
      Marketing: score(marketingKeywords),
    };

    const highestScore = Math.max(
      scores.Sales,
      scores.Support,
      scores.Marketing
    );

    const winners = (
      Object.entries(scores) as Array<
        ["Sales" | "Support" | "Marketing", number]
      >
    ).filter(([, value]) => value === highestScore && value > 0);

    // Clear keyword winner
    if (winners.length === 1) {
      return winners[0][0];
    }

    // Ambiguous message -> AI Router
    const routerPrompt = `
You are the hidden Smart Agent Router for FOX AI AGENCY.

Classify the customer's message into EXACTLY ONE category.

SALES:
Pricing, purchasing, subscriptions, NEW bookings,
appointment availability, placing orders, or purchase intent.

SUPPORT:
Complaints, problems with an EXISTING booking/order,
refunds, cancellations, technical issues or dissatisfaction.

MARKETING:
Offers, discounts, promotions, recommendations,
upselling or discovering new services.

RULES:
- NEW booking = SALES
- Asking about available appointments = SALES
- Problem with EXISTING booking = SUPPORT
- Offers or discounts = MARKETING
- Output ONE WORD ONLY:
SALES, SUPPORT, or MARKETING

CUSTOM ROUTER INSTRUCTIONS:
${workspace.aiSettings?.routerPrompt || "None"}

CUSTOMER MESSAGE:
${message}
`;

    // OpenRouter is the primary router.
    const openRouter = this.getOpenRouterClient();

    if (openRouter) {
      try {
        const routerModel =
          this.getOpenRouterPrimaryModel();

        const result = await openRouter.chat.completions.create({
          model: routerModel,
          messages: [
            {
              role: "system",
              content:
                "You are a hidden intent classifier. Output only SALES, SUPPORT, or MARKETING."
            },
            {
              role: "user",
              content: routerPrompt
            }
          ],
          temperature: 0,

          // OpenRouter-specific routing options.
          // The OpenAI SDK forwards these in the request body.
          extra_body:
            this.getOpenRouterExtraBody(
              routerModel
            ),
        });

        const routed =
          String(result.choices?.[0]?.message?.content || "")
            .trim()
            .toUpperCase();

        if (routed.includes("MARKETING")) return "Marketing";
        if (routed.includes("SUPPORT")) return "Support";
        if (routed.includes("SALES")) return "Sales";

      } catch (err) {
        console.warn(
          "Smart Router OpenRouter classification failed:",
          err
        );
      }
    }

    // Gemini is only the secondary router fallback.
    const ai = this.getGeminiClient();

    if (ai) {
      try {
        const result = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: routerPrompt,
          config: { temperature: 0 },
        });

        const routed = (result.text || "")
          .trim()
          .toUpperCase();

        if (routed.includes("MARKETING")) return "Marketing";
        if (routed.includes("SUPPORT")) return "Support";
        if (routed.includes("SALES")) return "Sales";

      } catch (err) {
        console.warn(
          "Smart Router Gemini fallback failed:",
          err
        );
      }
    }

    return "Support";
  }

  public buildSystemInstruction(
    workspace: WorkspaceContext = {},
    messageLang: "ar" | "en",
    channel: string = "TELEGRAM",
    overrideConfig?: Partial<AiAgentConfig>
  ): string {
    const config: AiAgentConfig = {
      agentName: workspace.aiSettings?.agentName || `${workspace.name || "Business"} AI Assistant`,
      customPrompt: workspace.aiSettings?.customPrompt || "",
      tone: workspace.aiSettings?.tone || "Friendly",
      languageMode: workspace.aiSettings?.languageMode || "auto",
      autoBookingEnabled: workspace.aiSettings?.autoBookingEnabled ?? true,
      autoComplaintEscalation: workspace.aiSettings?.autoComplaintEscalation ?? true,
      strictCatalogOnly: true,
      currency: "EGP",
      supportAgentName: workspace.aiSettings?.supportAgentName,
      supportAgentPrompt: workspace.aiSettings?.supportAgentPrompt,
      salesAgentName: workspace.aiSettings?.salesAgentName,
      salesAgentPrompt: workspace.aiSettings?.salesAgentPrompt,
      marketingAgentName: workspace.aiSettings?.marketingAgentName,
      marketingAgentPrompt: workspace.aiSettings?.marketingAgentPrompt,
      routerPrompt: workspace.aiSettings?.routerPrompt,
      salesKeywords: workspace.aiSettings?.salesKeywords,
      supportKeywords: workspace.aiSettings?.supportKeywords,
      marketingKeywords: workspace.aiSettings?.marketingKeywords,
      ...overrideConfig,
    };

    const businessName = workspace.name || "Fox Business";
    const industry = workspace.industry || "Small Business";

    let industryContext = "";
    if (workspace.aiSettings?.workingHours) {
      industryContext += `WORKING HOURS: ${workspace.aiSettings.workingHours}\n\n`;
    }
    if (industry === "Clinic") {
      if (workspace.doctors) {
        industryContext +=
          "DOCTORS & CLINIC SLOTS:\n" +
          workspace.doctors
            .map(
              (d) =>
                `- Dr. ${d.name} (${d.specialty}): Fee: ${d.consultationFeeEGP || 0} EGP, Available slots: ${
                  d.slots?.join(", ") || "10:00 AM, 02:00 PM, 06:00 PM"
                }`
            )
            .join("\n") + "\n\n";
      }
      if (workspace.clinicServices) {
        industryContext +=
          "CLINIC SERVICES & PRICING:\n" +
          workspace.clinicServices
            .map((s) => `- ${s.name}: ${s.price} EGP (${s.durationMinutes} mins) ${s.description || ""}`)
            .join("\n") + "\n\n";
      }
    } else if (industry === "Restaurant" && workspace.menu) {
      industryContext +=
        "RESTAURANT MENU & PRICES:\n" +
        workspace.menu
          .map(
            (m) =>
              `- ${m.name} (${m.category}): ${m.price} ${config.currency} - ${m.description || ""} ${
                m.available !== false ? "[Available / متاح]" : "[OUT OF STOCK / غير متاح]"
              } ${m.alternativeItemName ? `(Suggested Alternative: ${m.alternativeItemName} - ${m.alternativeNotes || ''})` : ''}`
          )
          .join("\n");
    } else if (industry === "Pharmacy" && workspace.medicines) {
      industryContext +=
        "PHARMACY MEDICINES & ALTERNATIVES:\n" +
        workspace.medicines
          .map(
            (m) =>
              `- ${m.name}: ${m.price} ${config.currency} (${m.category}) - ${
                m.requiresPrescription ? "Requires Prescription" : "Over the counter"
              }. Status: ${m.available !== false ? "[Available / متاح]" : "[OUT OF STOCK / غير متاح]"}. ${
                m.alternativeItemName ? `[RECOMMENDED ALTERNATIVE MEDICINE: ${m.alternativeItemName} (${m.alternativeNotes || ''})]` : ''
              }`
          )
          .join("\n");
    } else if (industry === "Retail" && workspace.products) {
      industryContext +=
        "STORE PRODUCTS, STOCK & ALTERNATIVES:\n" +
        workspace.products
          .map((p) => `- ${p.name}: ${p.price} ${config.currency} - Status: ${p.available !== false ? "[Available / متاح]" : "[OUT OF STOCK / غير متاح]"} (Stock: ${p.stock || 0}). ${
            p.alternativeItemName ? `[RECOMMENDED ALTERNATIVE PRODUCT: ${p.alternativeItemName} (${p.alternativeNotes || ''})]` : ''
          }`)
          .join("\n");
    } else if (industry === "Course Center" && workspace.courses) {
      industryContext +=
        "AVAILABLE TRAINING COURSES:\n" +
        workspace.courses
          .map((c) => `- ${c.name}: ${c.price} ${config.currency} (Duration: ${c.duration}, Instructor: ${c.instructor || 'TBD'}) - ${c.description || ''}`)
          .join("\n");
    }

    let reviewsContext = "";
    if (industry === "Course Center" && workspace.courseReviews) {
      reviewsContext = "\n\nSTUDENT REVIEWS (Use these to build trust and show social proof if asked about quality):\n" +
        workspace.courseReviews
          .map((r) => `- ${r.studentName} rated ${r.courseName} ${r.rating}/5: "${r.comment}" ${r.reply ? `(Center Reply: ${r.reply})` : ''}`)
          .join("\n");
    }

    const approvedKnowledge = (workspace.knowledgeBase || [])
      .filter((k) => k.approved !== false)
      .map((k) => `Q: ${k.question}\nA: ${k.answer}`)
      .join("\n\n");

    let toneGuide = "";
    switch (config.tone) {
      case "Friendly":
        toneGuide =
          "Warm, welcoming, polite, and accessible (use cheerful, friendly Egyptian Arabic dialect or polite English).";
        break;
      case "Professional":
        toneGuide = "Formal, respectful, objective, and structured business tone.";
        break;
      case "Empathetic":
        toneGuide =
          "Extremely attentive, compassionate, patient (especially suitable for clinic or pharmacy customers).";
        break;
      case "Formal":
        toneGuide = "High-level corporate, polite, strict standard language.";
        break;
      case "Direct":
        toneGuide = "Concise, straight-to-the-point without fluff or long greetings.";
        break;
      default:
        toneGuide = "Polite and helpful customer support tone.";
    }

    let targetLanguage = messageLang;
    if (config.languageMode === "arabic") targetLanguage = "ar";
    if (config.languageMode === "english") targetLanguage = "en";

    const isTargetAr = targetLanguage === "ar";

    return `
You are "${config.agentName}", an expert AI Customer Support Agent representing "${businessName}" (${industry}) on ${channel.toUpperCase()}.

TARGET LANGUAGE MANDATE:
You MUST reply strictly in ${
      isTargetAr
        ? "ARABIC (العامية المصرية البسيطة الواضحة والمهذبة أو الفصحى البسيطة)"
        : "ENGLISH"
    }.
Do NOT switch languages unless explicitly requested by the customer.

TONE OF VOICE & STYLE:
${toneGuide}

BEHAVIORAL CONSTRAINTS & CORE RULES:
1. ACCURACY & ZERO HALLUCINATION: Rely STRICTLY on the approved knowledge base and catalog provided below. NEVER invent prices, doctors, medicines, or services.
2. CURRENCY: All prices must be quoted in ${config.currency} (Egyptian Pounds / جنيه مصري) unless specified otherwise.
3. DATA CAPTURE (CRM): ${
      config.autoBookingEnabled
        ? "When a customer wants to book an appointment, order an item, or reschedule, politely ask for their Full Name, Phone Number, and Preferred Date/Time, and confirm that their request will be saved in the CRM."
        : "Inform customers about available slots/prices and ask them to contact staff directly for final bookings."
    }
4. ESCALATION & COMPLAINTS & REVIEWS: ${
      config.autoComplaintEscalation
        ? "If a customer expresses dissatisfaction or files a complaint, express sincere empathy, record their issue details, and assure them a senior manager will contact them shortly. If a customer leaves a positive review, thank them gracefully."
        : "Direct customer complaints to our official support line. Thank customers for any positive reviews."
    }
5. OUT-OF-SCOPE INQUIRIES: If asked about something not present in the business context, state politely that you don't have that information right now and offer to connect them with a human team member.
6. PRODUCT & MEDICINE AVAILABILITY & ORDER VERIFICATION:
   - When a customer requests a medicine, product, or order item that is marked as [OUT OF STOCK / غير متاح]:
     a) State clearly that the requested item is currently unavailable in our main inventory.
     b) If an alternative medicine or product is provided in the catalog, proactively suggest it: "ولكن يتوفر لدينا الدواء/المنتج البديل: [Alternative Name] - [Alternative Notes]".
     c) Inform the customer: "وقد تم رفع طلب أوردر لصاحب المنشأة للتأكد التام من توفر المنتج بالمخزن الرئيسي وإفادتكم فوراً." (An order request has been logged for the owner to double-check inventory).
   - When a customer places an order for available items, confirm the items and price, and inform them that an order verification alert has been sent to the facility owner.
7. SERVICE RATING PROMPT:
   ${
     config.enableServiceRating !== false
       ? `At the end of your response when completing a booking, order, or providing requested information, politely ask the customer for their service rating: "${config.serviceRatingPrompt || "نرجو تقييم خدمتنا اليوم من 1 إلى 5 نجوم لمساعدتنا في تحسين تجربتك"}"`
       : "Do not ask for service ratings unless the user specifically asks to evaluate the service."
   }

CUSTOM CLIENT INSTRUCTIONS:
${config.customPrompt || "No custom instructions defined."}

APPROVED KNOWLEDGE BASE (FAQS):
${approvedKnowledge || "No custom FAQ entries available."}

BUSINESS CATALOG & DATA:
${industryContext || "Standard business inquiry catalog."}
`;
  }


  public async extractKnowledge(input: { type: 'url' | 'text' | 'file'; content?: string; url?: string; mimeType?: string }): Promise<{ question: string; answer: string }[]> {
    const ai = this.getGeminiClient();
    if (!ai) throw new Error("Gemini API key not configured");

    let prompt = "Extract key information from the following content and generate a list of Frequently Asked Questions (FAQs) in a strict JSON array format. Each object must have exactly two keys: 'question' and 'answer'. Both should be strings. Focus on business details, pricing, services, policies, and contact info.\n\n";
    let parts = [];

    if (input.type === 'url' && input.url) {
      // Very basic URL extraction, ideally we'd fetch the HTML and convert to text, or use Gemini's built-in search grounding. 
      // For now, let's just ask Gemini to analyze the URL directly (some models can browse or we can just fetch the content here).
      // Since we are in a Node environment, let's fetch the URL content text.
      try {
        const response = await fetch(input.url);
        const text = await response.text();
        // Take first 50000 characters to avoid exceeding token limits if it's huge
        const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 50000);
        prompt += `Content from ${input.url}:\n\n${cleanText}`;
        parts = [{ text: prompt }];
      } catch (e) {
        throw new Error("Failed to fetch content from URL: " + e.message);
      }
    } else if (input.type === 'text' && input.content) {
      prompt += input.content;
      parts = [{ text: prompt }];
    } else if (input.type === 'file' && input.content && input.mimeType) {
      parts = [
        { text: prompt },
        {
          inlineData: {
            data: input.content,
            mimeType: input.mimeType
          }
        }
      ];
    } else {
      throw new Error("Invalid input for knowledge extraction");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert data extractor. You must respond ONLY with a valid JSON array of objects, each containing 'question' and 'answer' string properties. Do not include markdown formatting or any other text.",
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) return [];
    
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
         return parsed.map(item => ({
           question: item.question || item.Question || "",
           answer: item.answer || item.Answer || ""
         })).filter(item => item.question && item.answer);
      }
      return [];
    } catch (e) {
      console.error("Failed to parse knowledge extraction JSON", e, text);
      return [];
    }
  }

  // =========================================================
  // CENTRALIZED FOX AI CREDIT GATE
  // Every tenant AI request passes through this method.
  // Firestore is the source of truth for conversation credits.
  // =========================================================
  /**
   * FOX AI BILLING CLASSIFIER
   *
   * Conversation credits represent actual AI/LLM usage.
   * Deterministic Firestore/business-logic responses must not
   * consume tenant AI credits.
   */
  private shouldConsumeAiCredit(result: ChatResponse): boolean {
    const source = String(result?.source || "")
      .trim()
      .toLowerCase();

    // Firestore/database/business-logic responses are deterministic.
    if (source.startsWith("firestore:")) {
      return false;
    }

    // FOX guards/parsers/state-machine responses do not call an LLM.
    const nonBillableFoxSources = new Set([
      "fox_credit_guard",
      "fox_credit_guard_error",
      "fox_modify_flow",
      "fox_modify_invalid_selection",
      "fox_modify_parser",
      "fox_cancel_flow",
      "fox_crm_lookup",
      "fox_booking_datetime_guard",
      "fox_booking_identity_guard",
      "fox_booking_guard",
      "fox_booking_parser",
    ]);

    if (nonBillableFoxSources.has(source)) {
      return false;
    }

    /*
     * fallback_engine is local deterministic fallback logic.
     * It must not consume an AI conversation credit.
     */
    if (source === "fallback_engine") {
      return false;
    }

    /*
     * Everything else is considered billable.
     *
     * This intentionally keeps OpenRouter/Gemini and future
     * real AI-provider sources billable by default.
     */
    return true;
  }

  public async generateChatResponse(
    params: GenerateChatParams
  ): Promise<ChatResponse> {
    const workspaceId = params.workspace?.id;

    // Internal/system calls without a tenant workspace are not billed.
    if (!workspaceId) {
      return this.generateChatResponseInternal(params);
    }

    try {
      const creditCheck =
        await creditService.canUseAI(workspaceId);

      if (!creditCheck.allowed) {
        const isEnglish =
          params.workspace?.aiSettings?.languageMode === "english";

        const responseText = isEnglish
          ? "Your AI conversation balance has been exhausted. Please purchase an additional conversation package or renew your subscription."
          : "تم استهلاك رصيد المحادثات الخاص بالمنشأة. يرجى شراء باقة محادثات إضافية أو تجديد الاشتراك لاستمرار خدمة الوكيل الذكي.";

        console.log(
          `🔴 [FOX Credits] Exhausted | Workspace=${workspaceId} | Plan=${creditCheck.state.planId}`
        );

        return {
          response: responseText,
          aiResponse: responseText,
          detectedLanguage: isEnglish ? "en" : "ar",
          source: "fox_credit_guard",
          suggestedActions: isEnglish
            ? ["Buy Extra Conversations", "View Subscription"]
            : ["شراء محادثات إضافية", "عرض الاشتراك"],
        };
      }

      console.log(
        `🟢 [FOX Credits] Allowed | Workspace=${workspaceId} | Plan=${creditCheck.state.planId} | Balance=${
          creditCheck.state.unlimited
            ? "UNLIMITED"
            : creditCheck.state.creditBalance
        }`
      );

      // Generate the actual tenant response first.
      const result =
        await this.generateChatResponseInternal(params);

      /*
       * Consume a conversation credit only when this response
       * represents real AI/LLM usage.
       *
       * Deterministic Firestore / booking / coupon / CRM flows
       * are free and must not reduce the tenant AI balance.
       */
      const shouldBill =
        this.shouldConsumeAiCredit(result);

      if (!shouldBill) {
        console.log(
          `⚪ [FOX Credits] Not billed | Workspace=${workspaceId} | Source=${result.source}`
        );

        return result;
      }

      try {
        const usage =
          await creditService.consumeConversation(
            workspaceId,
            {
              channel: params.channel || "telegram",
              sessionId: params.sessionId,
            }
          );

        console.log(
          `💳 [FOX Credits] Consumed 1 | Workspace=${workspaceId} | Source=${result.source} | Used=${usage.aiConversationsUsed} | Balance=${
            usage.unlimited
              ? "UNLIMITED"
              : usage.creditBalance
          }`
        );
      } catch (creditError: any) {
        /*
         * A concurrent request may have consumed the final credit
         * after the initial check. In that case do not expose the
         * generated answer for free.
         */
        if (
          creditError?.message ===
          "FOX_AI_CREDITS_EXHAUSTED"
        ) {
          console.warn(
            `🟠 [FOX Credits] Final credit consumed concurrently | Workspace=${workspaceId}`
          );

          const isEnglish =
            params.workspace?.aiSettings?.languageMode === "english";

          const responseText = isEnglish
            ? "Your AI conversation balance has just been exhausted. Please purchase an additional conversation package to continue."
            : "تم استهلاك آخر نقطة من رصيد المحادثات. يرجى شراء باقة محادثات إضافية لاستمرار الخدمة.";

          return {
            response: responseText,
            aiResponse: responseText,
            detectedLanguage: isEnglish ? "en" : "ar",
            source: "fox_credit_guard",
            suggestedActions: isEnglish
              ? ["Buy Extra Conversations"]
              : ["شراء محادثات إضافية"],
          };
        }

        console.error(
          "[FOX Credits] Usage recording failed:",
          creditError
        );

        /*
         * Don't break a completed customer interaction because
         * analytics logging failed for an unrelated reason.
         */
      }

      return result;
    } catch (error: any) {
      console.error(
        `[FOX Credits] Guard failure | Workspace=${workspaceId}:`,
        error
      );

      /*
       * Fail closed for tenant billing/credit validation.
       * We must never allow unlimited AI usage if Firestore
       * credit verification itself is unavailable.
       */
      const isEnglish =
        params.workspace?.aiSettings?.languageMode === "english";

      const responseText = isEnglish
        ? "The AI service is temporarily unavailable while your subscription balance is being verified. Please try again shortly."
        : "خدمة الوكيل الذكي غير متاحة مؤقتاً أثناء التحقق من رصيد الاشتراك. يرجى المحاولة مرة أخرى بعد قليل.";

      return {
        response: responseText,
        aiResponse: responseText,
        detectedLanguage: isEnglish ? "en" : "ar",
        source: "fox_credit_guard_error",
        suggestedActions: [],
      };
    }
  }

  private async generateChatResponseInternal(params: GenerateChatParams): Promise<ChatResponse> {
    const { workspace } = params;

    const {
      channel = "telegram",
      chatHistory = [],
      overrideConfig
    } = params;

    // Mutable local copy.
    // Booking retry may temporarily replace the current message
    // with the preserved customer identity so the existing
    // deterministic booking flow can be reused safely.
    let message = params.message;
    

    let messageLang = this.detectLanguage(message);

    // Phone numbers / numeric-only replies have no language.
    // Recover the language from recent conversation context.
    if (!/[A-Za-z\u0600-\u06FF]/.test(message) && workspace?.id && params.sessionId) {
      try {
        const languageCtx = await sharedMemoryService.getContext(
          workspace.id,
          params.sessionId
        );

        const previousText = languageCtx.messages
          .slice()
          .reverse()
          .map((m) => m.text || "")
          .find((text) => /[A-Za-z\u0600-\u06FF]/.test(text));

        if (previousText) {
          messageLang = this.detectLanguage(previousText);
        }
      } catch {
        // Keep original detection as fallback.
      }
    }

    // =========================================================
    // DETERMINISTIC APPOINTMENT MODIFICATION
    // Firestore is the source of truth.
    // Never create a new booking when modifying an existing one.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      const modifyCtx =
        await sharedMemoryService.getContext(
          workspace.id,
          params.sessionId
        );

      const modifyMessage =
        String(message || "").trim();

      const lastModifyBot =
        modifyCtx.messages
          .slice()
          .reverse()
          .find((m) => m.sender === "bot")
          ?.text || "";

      const modifyIntent =
        /(عاوز|عايز|أريد|اريد)?\s*(أعدل|اعدل|تعديل|أغير|اغير|تغيير)\s*(حجزي|الحجز|موعدي|الموعد)|modify\s*(my\s*)?(booking|appointment)|change\s*(my\s*)?(booking|appointment)/i.test(
          modifyMessage
        );

      const phoneDigits =
        modifyMessage.replace(/\D/g, "");

      const looksLikeModifyPhone =
        phoneDigits.length >= 10 &&
        phoneDigits.length <= 15;

      const saveModifyUserMessage = async () => {
        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );
      };

      // --------------------------------------------------------
      // STEP 1: Customer asks to modify booking
      // --------------------------------------------------------
      if (modifyIntent) {
        await saveModifyUserMessage();

        const reply =
          messageLang === "ar"
            ? "تمام ✅ ابعتلي رقم الموبايل المستخدم في الحجز علشان أجيب الحجز اللي عايز تعدله."
            : "Sure ✅ Please send the phone number used for the booking.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: reply + "\nMODIFY_STATE:WAIT_PHONE",
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        console.log(
          `✏️ [FOX Booking] Waiting for modification phone | Workspace=${workspace.id}`
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "fox_modify_flow",
          suggestedActions: []
        };
      }

      // --------------------------------------------------------
      // STEP 2: Receive customer phone
      // --------------------------------------------------------
      if (
        lastModifyBot.includes("MODIFY_STATE:WAIT_PHONE") &&
        looksLikeModifyPhone
      ) {
        await saveModifyUserMessage();

        const appointments =
          await workspaceDataService.getCustomerAppointments(
            workspace.id,
            modifyMessage
          );

        console.log(
          `✏️ [FOX CRM] Modification lookup | Workspace=${workspace.id} | Count=${appointments.length}`
        );

        if (appointments.length === 0) {
          const reply =
            messageLang === "ar"
              ? "ملقتش أي حجز حالي أو قادم على رقم الموبايل ده."
              : "No current or upcoming appointment was found.";

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text: reply,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:modify_lookup",
            suggestedActions: []
          };
        }

        // One booking -> select automatically
        if (appointments.length === 1) {
          const apt: any = appointments[0];

          const reply =
            messageLang === "ar"
              ? `لقيت الحجز ده:\n\nالتاريخ الحالي: ${apt.date}\nالوقت الحالي: ${apt.time}\n\nاكتب التاريخ والوقت الجديد، مثال:\n19 أغسطس الساعة 1 مساء`
              : `Current appointment: ${apt.date} at ${apt.time}.\nSend the new date and time.`;

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text:
                reply +
                `\nMODIFY_TARGET:${apt.id}`,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:modify_target",
            suggestedActions: []
          };
        }

        // Multiple bookings -> customer chooses
        const lines =
          appointments.map(
            (apt: any, index: number) =>
              `${index + 1}) ${apt.date} — ${apt.time}`
          );

        const reply =
          messageLang === "ar"
            ? `لقيت ${appointments.length} حجوزات:\n\n${lines.join("\n")}\n\nاكتب رقم الحجز اللي عايز تعدله.`
            : `I found ${appointments.length} appointments:\n\n${lines.join("\n")}\n\nSend the number to modify.`;

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text:
              reply +
              `\nMODIFY_OPTIONS:${appointments
                .map((apt: any) => apt.id)
                .join(",")}`,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "firestore:modify_options",
          suggestedActions: []
        };
      }

      // --------------------------------------------------------
      // STEP 3: Select one appointment
      // --------------------------------------------------------
      if (
        lastModifyBot.includes("MODIFY_OPTIONS:") &&
        /^\d+$/.test(modifyMessage)
      ) {
        await saveModifyUserMessage();

        const ids =
          lastModifyBot
            .split("MODIFY_OPTIONS:")[1]
            ?.trim()
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean) || [];

        const choice =
          Number(modifyMessage) - 1;

        if (
          choice < 0 ||
          choice >= ids.length
        ) {
          const reply =
            messageLang === "ar"
              ? "اختيار غير صحيح. ابعت رقم الحجز الموجود في القائمة."
              : "Invalid selection.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "fox_modify_invalid_selection",
            suggestedActions: []
          };
        }

        const selectedId =
          ids[choice];

        const reply =
          messageLang === "ar"
            ? "تمام. اكتب التاريخ والوقت الجديد، مثال: 19 أغسطس الساعة 1 مساء."
            : "Send the new appointment date and time.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text:
              reply +
              `\nMODIFY_TARGET:${selectedId}`,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "firestore:modify_selected",
          suggestedActions: []
        };
      }

      // --------------------------------------------------------
      // STEP 4: Receive new date/time
      // --------------------------------------------------------
      if (
        lastModifyBot.includes("MODIFY_TARGET:")
      ) {
        const appointmentId =
          lastModifyBot
            .split("MODIFY_TARGET:")[1]
            ?.trim()
            .split(/\s/)[0];

        await saveModifyUserMessage();

        const now = new Date();

        const months: Record<string, number> = {
          "يناير": 1,
          "فبراير": 2,
          "مارس": 3,
          "أبريل": 4,
          "ابريل": 4,
          "مايو": 5,
          "يونيو": 6,
          "يوليو": 7,
          "أغسطس": 8,
          "اغسطس": 8,
          "سبتمبر": 9,
          "أكتوبر": 10,
          "اكتوبر": 10,
          "نوفمبر": 11,
          "ديسمبر": 12
        };

        let newDate = "";
        let newTime = "";

        // Example: 19 الشهر ده
        const thisMonthMatch =
          modifyMessage.match(
            /(\d{1,2})\s*(?:من\s*)?(?:الشهر\s*ده|هذا\s*الشهر)/i
          );

        if (thisMonthMatch) {
          newDate =
            `${now.getFullYear()}-` +
            `${String(now.getMonth() + 1).padStart(2, "0")}-` +
            `${String(Number(thisMonthMatch[1])).padStart(2, "0")}`;
        }

        // Example: 19 أغسطس / 19 أغسطس 2026
        if (!newDate) {
          const dateMatch =
            modifyMessage.match(
              /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)(?:\s+(\d{4}))?/i
            );

          if (dateMatch) {
            const day =
              Number(dateMatch[1]);

            const month =
              months[dateMatch[2]];

            const year =
              Number(dateMatch[3] || now.getFullYear());

            newDate =
              `${year}-` +
              `${String(month).padStart(2, "0")}-` +
              `${String(day).padStart(2, "0")}`;
          }
        }

        // Example: الساعة 1 مساء
        const timeMatch =
          modifyMessage.match(
            /(?:الساعة\s*)(\d{1,2})(?::(\d{2}))?\s*(صباحاً|صباحا|صباحًا|صباح|ظهراً|ظهرا|ظهرًا|ظهر|مساءً|مساءا|مساء)/i
          );

        if (timeMatch) {
          const hour =
            Number(timeMatch[1]);

          const minute =
            Number(timeMatch[2] || 0);

          const period =
            String(timeMatch[3]);

          if (
            hour >= 1 &&
            hour <= 12 &&
            minute >= 0 &&
            minute <= 59
          ) {
            const suffix =
              /ظهر|مساء/.test(period)
                ? "PM"
                : "AM";

            newTime =
              `${String(hour).padStart(2, "0")}:` +
              `${String(minute).padStart(2, "0")} ${suffix}`;
          }
        }

        const todayISO =
          new Date()
            .toISOString()
            .slice(0, 10);

        if (
          !appointmentId ||
          !newDate ||
          !newTime ||
          newDate < todayISO
        ) {
          const reply =
            messageLang === "ar"
              ? "التاريخ أو الوقت غير واضح. اكتبه بالشكل ده مثلاً:\n19 أغسطس الساعة 1 مساء"
              : "Please send a valid future date and time.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "fox_modify_parser",
            suggestedActions: []
          };
        }

        const available =
          await workspaceDataService.isAppointmentAvailable(
            workspace.id,
            newDate,
            newTime
          );

        if (!available) {
          const reply =
            messageLang === "ar"
              ? `الموعد ${newDate} الساعة ${newTime} غير متاح ❌\nاختار موعد تاني.`
              : "That slot is unavailable.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:modify_unavailable",
            suggestedActions: []
          };
        }

        const reply =
          messageLang === "ar"
            ? `الموعد الجديد متاح ✅\n\nالتاريخ الجديد: ${newDate}\nالوقت الجديد: ${newTime}\n\nلو متأكد اكتب: تأكيد التغيير`
            : `The new slot is available ✅\nSend: confirm`;

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text:
              reply +
              `\nMODIFY_PENDING:${appointmentId}|${newDate}|${newTime}`,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        console.log(
          `✏️ [FOX Booking] Modification pending | Workspace=${workspace.id} | Appointment=${appointmentId} | ${newDate} ${newTime}`
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "firestore:modify_pending",
          suggestedActions: []
        };
      }

      // --------------------------------------------------------
      // STEP 5: Final confirmation -> REAL Firestore update
      // --------------------------------------------------------
      if (
        lastModifyBot.includes("MODIFY_PENDING:")
      ) {
        const confirmModify =
          /^(تأكيد\s*التغيير|تاكيد\s*التغيير|تأكيد|تاكيد|أكد|اكد|نعم|ايوه|أيوه|confirm|yes)$/i.test(
            modifyMessage
          );

        if (confirmModify) {
          await saveModifyUserMessage();

          const raw =
            lastModifyBot
              .split("MODIFY_PENDING:")[1]
              ?.trim();

          const [
            appointmentId,
            newDate,
            newTime
          ] = raw.split("|");

          // Final availability re-check immediately before write
          const stillAvailable =
            await workspaceDataService.isAppointmentAvailable(
              workspace.id,
              newDate,
              newTime
            );

          if (!stillAvailable) {
            const reply =
              messageLang === "ar"
                ? "للأسف الموعد اتاخد قبل التأكيد ❌ اختار موعد تاني."
                : "The slot was taken before confirmation.";

            return {
              response: reply,
              aiResponse: reply,
              detectedLanguage: messageLang,
              source: "firestore:modify_conflict",
              suggestedActions: []
            };
          }

          const result =
            await workspaceDataService.updateAppointment(
              workspace.id,
              appointmentId,
              {
                date: newDate,
                time: newTime,
                status: "Scheduled"
              }
            );

          if (!result?.success) {
            throw new Error(
              "Firestore appointment update did not succeed"
            );
          }

          console.log(
            `✏️ [FOX CRM] Appointment updated | Workspace=${workspace.id} | Appointment=${appointmentId} | ${newDate} ${newTime}`
          );

          const reply =
            messageLang === "ar"
              ? `✅ تم تعديل الحجز بنجاح.\n\nالتاريخ الجديد: ${newDate}\nالوقت الجديد: ${newTime}`
              : `✅ Your appointment was updated successfully.\n\nDate: ${newDate}\nTime: ${newTime}`;

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text: reply,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:modified",
            suggestedActions:
              messageLang === "ar"
                ? ["عرض حجوزاتي", "إلغاء الحجز"]
                : ["My Appointments", "Cancel Appointment"]
          };
        }
      }
    }

    // =========================================================
    // DETERMINISTIC APPOINTMENT CANCELLATION
    // Cancellation is a CRM transaction, not an LLM decision.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      const cancelCtx =
        await sharedMemoryService.getContext(
          workspace.id,
          params.sessionId
        );

      const cancelMessage = String(message || "").trim();
      const cancelLower = cancelMessage.toLowerCase();

      const cancelIntent =
        /(ألغي\s*(حجزي|الحجز|موعدي)|الغي\s*(حجزي|الحجز|موعدي)|إلغاء\s*(حجز|موعد)|الغاء\s*(حجز|موعد)|cancel\s*(my\s*)?(booking|appointment))/i.test(
          cancelLower
        );

      const lastBot =
        cancelCtx.messages
          .slice()
          .reverse()
          .find((m) => m.sender === "bot")
          ?.text || "";

      const digitsOnly =
        cancelMessage.replace(/\D/g, "");

      const isPhone =
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 15;

      const waitingForCancelPhone =
        /(رقم الموبايل.*إلغاء|رقم الموبايل.*الغاء|phone number.*cancel)/i.test(
          lastBot
        );

      const waitingForCancelConfirm =
        /(تأكيد إلغاء الحجز|تأكيد الغاء الحجز|confirm cancellation)/i.test(
          lastBot
        );

      // Step 1: cancellation intent
      if (cancelIntent && !isPhone) {
        const reply =
          messageLang === "ar"
            ? "أكيد. ابعتلي رقم الموبايل المستخدم في الحجز علشان أراجع الحجز وأكمل إلغاءه."
            : "Sure. Please send the phone number used for the booking so I can review it and continue the cancellation.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: reply,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        console.log(
          `🗑️ [FOX Booking] Waiting for cancellation phone | Workspace=${workspace.id}`
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "fox_cancel_flow",
          suggestedActions: []
        };
      }

      // Step 2: phone supplied after cancel request
      if (waitingForCancelPhone && isPhone) {
        const appointments =
          await workspaceDataService.getCustomerAppointments(
            workspace.id,
            cancelMessage
          );

        if (appointments.length === 0) {
          const reply =
            messageLang === "ar"
              ? "راجعت النظام ولم أجد أي حجز حالي أو قادم على رقم الموبايل ده."
              : "I checked the system and found no current or upcoming booking on this phone number.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:cancel_lookup",
            suggestedActions: []
          };
        }

        if (appointments.length > 1) {
          const lines = appointments.map(
            (apt: any, index: number) =>
              `${index + 1}) ${apt.date} - ${apt.time}`
          );

          const reply =
            messageLang === "ar"
              ? `لقيت أكتر من حجز على الرقم ده:\n\n${lines.join("\n")}\n\nاكتب رقم الحجز اللي عايز تلغيه.`
              : `I found more than one booking:\n\n${lines.join("\n")}\n\nSend the number of the booking you want to cancel.`;

          // store options in memory in a machine-readable line
          const machineState =
            `CANCEL_OPTIONS:${appointments
              .map((apt: any) => apt.id)
              .join(",")}`;

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text: reply + "\n" + machineState,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:cancel_options",
            suggestedActions: []
          };
        }

        const apt: any = appointments[0];

        const reply =
          messageLang === "ar"
            ? `لقيت الحجز ده:\n\nالتاريخ: ${apt.date}\nالوقت: ${apt.time}\n\nلو عايز تكمل، اكتب: تأكيد إلغاء الحجز`
            : `I found this booking:\n\nDate: ${apt.date}\nTime: ${apt.time}\n\nTo continue, send: confirm cancellation`;

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text:
              reply +
              `\nCANCEL_APPOINTMENT_ID:${apt.id}`,
            time: new Date().toISOString(),
            agentRole: "Support"
          }
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "firestore:cancel_confirm",
          suggestedActions: []
        };
      }

      // Step 3a: choose from multiple appointments
      const optionState =
        cancelCtx.messages
          .slice()
          .reverse()
          .find((m) =>
            String(m.text || "").includes("CANCEL_OPTIONS:")
          )
          ?.text || "";

      if (
        /^\d+$/.test(cancelMessage) &&
        optionState.includes("CANCEL_OPTIONS:")
      ) {
        const ids =
          optionState
            .split("CANCEL_OPTIONS:")[1]
            ?.split(",")
            .map((x) => x.trim())
            .filter(Boolean) || [];

        const choice = Number(cancelMessage) - 1;

        if (choice >= 0 && choice < ids.length) {
          const selectedId = ids[choice];

          const reply =
            messageLang === "ar"
              ? "تمام. لو متأكد من إلغاء الحجز، اكتب: تأكيد إلغاء الحجز"
              : "Okay. If you're sure, send: confirm cancellation";

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text:
                reply +
                `\nCANCEL_APPOINTMENT_ID:${selectedId}`,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:cancel_selected",
            suggestedActions: []
          };
        }
      }

      // Step 3b: final confirmation
      const hasPendingCancellation =
        cancelCtx.messages.some((m) =>
          String(m.text || "").includes("CANCEL_APPOINTMENT_ID:")
        );

      const confirmCancel =
        hasPendingCancellation &&
        /^(تأكيد|تاكيد|أكد|اكد|نعم|ايوه|أيوه|yes|confirm|تأكيد\s*إلغاء\s*الحجز|تاكيد\s*الغاء\s*الحجز|confirm\s*cancellation)$/i.test(
          cancelMessage.trim()
        );

      if (confirmCancel) {
        const idState =
          cancelCtx.messages
            .slice()
            .reverse()
            .find((m) =>
              String(m.text || "").includes(
                "CANCEL_APPOINTMENT_ID:"
              )
            )
            ?.text || "";

        const appointmentId =
          idState.split("CANCEL_APPOINTMENT_ID:")[1]?.trim();

        if (appointmentId) {
          await workspaceDataService.cancelAppointment(
            workspace.id,
            appointmentId
          );

          console.log(
            `🗑️ [FOX CRM] Appointment cancelled | Workspace=${workspace.id} | Appointment=${appointmentId}`
          );

          const reply =
            messageLang === "ar"
              ? "✅ تم إلغاء الحجز بنجاح. لو تحب، أقدر أساعدك تعمل حجز جديد."
              : "✅ Your booking has been cancelled successfully.";

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text: reply,
              time: new Date().toISOString(),
              agentRole: "Support"
            }
          );

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:cancelled",
            suggestedActions:
              messageLang === "ar"
                ? ["حجز موعد جديد"]
                : ["Book New Appointment"]
          };
        }
      }
    }

    // =========================================================
    // DETERMINISTIC CUSTOMER APPOINTMENT LOOKUP
    // Never let the LLM invent whether a booking exists.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      const normalizedMessage = message.trim();
      const lowerMessage = normalizedMessage.toLowerCase();

      const bookingLookupIntent =
        /(عندي\s*(حجز|موعد)|حجز\s*قبل\s*كده|موعد\s*قبل\s*كده|حجوزاتي|مواعيدي|existing\s*(booking|appointment)|my\s*(booking|appointment))/i.test(
          lowerMessage
        );

      const digitsOnly = normalizedMessage.replace(/\D/g, "");

      const looksLikePhone =
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 15;

      const existingContext =
        await sharedMemoryService.getContext(
          workspace.id,
          params.sessionId
        );

      const recentUserMessages =
        existingContext.messages
          .filter((m) => m.sender === "user")
          .slice(-4)
          .map((m) => m.text);

      const lastAssistantMessage =
        existingContext.messages
          .slice()
          .reverse()
          .find((m) => m.sender === "bot")
          ?.text || "";

      const previousAskedForBookingLookup =
        /(رقم الموبايل المستخدم في الحجز|أراجع حجوزاتك|check your appointments|phone number used for the booking)/i.test(
          lastAssistantMessage
        );

      // Step 1: Customer asks whether a booking exists.
      if (bookingLookupIntent && !looksLikePhone) {
        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        const lookupPrompt =
          messageLang === "ar"
            ? "أكيد. ابعتلي رقم الموبايل المستخدم في الحجز علشان أراجع حجوزاتك المسجلة في النظام."
            : "Sure. Please send the phone number used for the booking so I can check your appointments.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: lookupPrompt,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        console.log(
          `📞 [FOX CRM] Waiting for customer phone | Workspace=${workspace.id}`
        );

        return {
          response: lookupPrompt,
          aiResponse: lookupPrompt,
          detectedLanguage: messageLang,
          source: "fox_crm_lookup",
          suggestedActions: []
        };
      }

      // Step 2: Next customer message contains phone number.
      if (looksLikePhone && previousAskedForBookingLookup) {
        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        const appointments =
          await workspaceDataService.getCustomerAppointments(
            workspace.id,
            normalizedMessage
          );

        console.log(
          `🔎 [FOX CRM] Customer appointments lookup | Workspace=${workspace.id} | Phone=${normalizedMessage} | Count=${appointments.length}`
        );

        let replyText = "";

        if (appointments.length === 0) {
          replyText =
            messageLang === "ar"
              ? "راجعت النظام ولم أجد حجوزات حالية أو قادمة مسجلة على رقم الموبايل ده."
              : "I checked the system and found no current or upcoming appointments registered with this phone number.";
        } else {
          const appointmentLines =
            appointments.map((apt: any, index: number) =>
              messageLang === "ar"
                ? `${index + 1}) يوم ${apt.date} الساعة ${apt.time} — الحالة: ${apt.status || "Scheduled"}`
                : `${index + 1}) ${apt.date} at ${apt.time} — Status: ${apt.status || "Scheduled"}`
            );

          replyText =
            messageLang === "ar"
              ? `لقيت ${appointments.length} حجز حالي/قادم على الرقم ده:\n\n${appointmentLines.join("\n")}`
              : `I found ${appointments.length} current/upcoming appointment(s):\n\n${appointmentLines.join("\n")}`;
        }

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: replyText,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        return {
          response: replyText,
          aiResponse: replyText,
          detectedLanguage: messageLang,
          source: "firestore:appointments",
          suggestedActions:
            messageLang === "ar"
              ? ["حجز موعد جديد", "تعديل موعد"]
              : ["Book New Appointment", "Modify Appointment"]
        };
      }
    }

    // =========================================================
    // DETERMINISTIC BOOKING DATE/TIME COLLECTION
    // Booking order:
    // intent -> date/time -> fresh name/phone -> Firestore booking
    // =========================================================
    if (workspace?.id && params.sessionId) {
      const bookingFlowCtx =
        await sharedMemoryService.getContext(
          workspace.id,
          params.sessionId
        );

      const bookingFlowMessage =
        String(message || "").trim();

      const bookingFlowIntent =
        /(عاوز\s*احجز|عاوز\s*أحجز|عايز\s*احجز|عايز\s*أحجز|أريد\s*حجز|اريد\s*حجز|احجز|أحجز|book\s+an?\s*appointment|book\s+appointment|reserve)/i.test(
          bookingFlowMessage
        );

      const explicitDate =
        /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)|(\d{4}-\d{2}-\d{2})|بكره|بكرة|غدا|غداً/i.test(
          bookingFlowMessage
        );

      const explicitTime =
        /الساعة\s*\d{1,2}|(\d{1,2}):(\d{2})\s*(AM|PM)|\d{1,2}\s*(صباح|ظهر|مساء)/i.test(
          bookingFlowMessage
        );

      const lastBookingBot =
        bookingFlowCtx.messages
          .slice()
          .reverse()
          .find((m) => m.sender === "bot")
          ?.text || "";

      // -------------------------------------------------------
      // STEP 1: Generic booking request without date/time
      // -------------------------------------------------------
      if (
        bookingFlowIntent &&
        (!explicitDate || !explicitTime)
      ) {
        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        const reply =
          messageLang === "ar"
            ? "تمام ✅ قولي التاريخ والوقت اللي تحب تحجز فيهم.\n\nمثال: 25 أغسطس الساعة 3 مساءً"
            : "Sure ✅ Please send your preferred appointment date and time.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: reply + "\nBOOKING_STATE:WAIT_DATETIME",
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        console.log(
          `📅 [FOX Booking] Waiting for appointment date/time | Workspace=${workspace.id}`
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "fox_booking_datetime_guard",
          suggestedActions: []
        };
      }

      // -------------------------------------------------------
      // STEP 2: Date/time supplied after generic booking request
      // Save a synthetic complete booking request in memory.
      // This lets the existing deterministic booking parser use
      // the correct date/time later after name + phone arrive.
      // -------------------------------------------------------
      if (
        lastBookingBot.includes("BOOKING_STATE:WAIT_DATETIME")
      ) {
        if (!explicitDate || !explicitTime) {
          const reply =
            messageLang === "ar"
              ? "محتاج التاريخ والوقت مع بعض، مثلاً: 25 أغسطس الساعة 3 مساءً."
              : "Please send both the appointment date and time.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "fox_booking_datetime_guard",
            suggestedActions: []
          };
        }

        const completeBookingRequest =
          `عاوز أحجز موعد ${bookingFlowMessage}`;

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: completeBookingRequest,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        const reply =
          messageLang === "ar"
            ? "تمام ✅ قبل تأكيد الحجز، ابعتلي **اسم صاحب الحجز ورقم الموبايل** المستخدم في الحجز."
            : "Great ✅ Before confirming the booking, please send the customer name and phone number.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: reply,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        console.log(
          `📝 [FOX Booking] Date/time collected; waiting for fresh customer identity | Workspace=${workspace.id}`
        );

        return {
          response: reply,
          aiResponse: reply,
          detectedLanguage: messageLang,
          source: "fox_booking_identity_guard",
          suggestedActions: []
        };
      }
    }

    // =========================================================
    // DETERMINISTIC NEW BOOKING IDENTITY GUARD
    // A new booking must use fresh/reconfirmed customer identity.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      const newBookingIntent =
        /(عاوز\s*أحجز|عايز\s*أحجز|أريد\s*حجز|اريد\s*حجز|احجز|أحجز|book\s+an?\s*appointment|book\s+appointment|reserve)/i.test(
          message
        );

      const currentDigits =
        String(message || "").replace(/\D/g, "");

      const hasCurrentPhone =
        currentDigits.length >= 10 &&
        currentDigits.length <= 15;

      // We deliberately require the customer to provide/reconfirm
      // identity in the CURRENT booking conversation.
      if (newBookingIntent && !hasCurrentPhone) {
        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "user",
            text: message,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        const bookingDetailsPrompt =
          messageLang === "ar"
            ? "تمام ✅ قبل تأكيد الحجز، ابعتلي **اسم صاحب الحجز ورقم الموبايل** المستخدم في الحجز."
            : "Great ✅ Before confirming the booking, please send the **customer name and phone number** for this booking.";

        await sharedMemoryService.appendMessage(
          workspace.id,
          params.sessionId,
          {
            sender: "bot",
            text: bookingDetailsPrompt,
            time: new Date().toISOString(),
            agentRole: "Sales"
          }
        );

        console.log(
          `📝 [FOX Booking] Waiting for fresh customer identity | Workspace=${workspace.id}`
        );

        return {
          response: bookingDetailsPrompt,
          aiResponse: bookingDetailsPrompt,
          detectedLanguage: messageLang,
          source: "fox_booking_guard",
          suggestedActions: []
        };
      }
    }

    // =========================================================
    // FOX BOOKING RETRY DATE/TIME STATE
    //
    // Customer identity was already collected, but the requested
    // appointment was unavailable. The next message must therefore
    // be treated as a replacement date/time — never as a name.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      try {
        const retryCtx =
          await sharedMemoryService.getContext(
            workspace.id,
            params.sessionId
          );

        const lastRetryBot =
          retryCtx.messages
            .slice()
            .reverse()
            .find((m) => m.sender === "bot")
            ?.text || "";

        const waitingForNewDatetime =
          lastRetryBot.includes(
            "BOOKING_STATE:WAIT_NEW_DATETIME"
          );

        if (waitingForNewDatetime) {
          const retryMessage =
            String(message || "").trim();

          const retryExplicitDate =
            /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)|(\d{4}-\d{2}-\d{2})|بكره|بكرة|غدا|غداً/i.test(
              retryMessage
            );

          const retryExplicitTime =
            /الساعة\s*\d{1,2}|(\d{1,2}):(\d{2})\s*(AM|PM)|\d{1,2}\s*(صباح|ظهر|مساء)/i.test(
              retryMessage
            );

          if (
            !retryExplicitDate ||
            !retryExplicitTime
          ) {
            const retryPrompt =
              messageLang === "ar"
                ? "ابعتلي التاريخ والوقت الجديد مع بعض، مثلاً: 26 أغسطس الساعة 3 مساءً."
                : "Please send the new appointment date and time together.";

            // Keep state alive.
            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "bot",
                text:
                  retryPrompt +
                  "\n" +
                  lastRetryBot
                    .split("\n")
                    .filter(
                      (line) =>
                        line.startsWith("BOOKING_STATE:") ||
                        line.startsWith("BOOKING_CUSTOMER_NAME:") ||
                        line.startsWith("BOOKING_CUSTOMER_PHONE:")
                    )
                    .join("\n"),
                time: new Date().toISOString(),
                agentRole: "Sales"
              }
            );

            return {
              response: retryPrompt,
              aiResponse: retryPrompt,
              detectedLanguage: messageLang,
              source: "fox_booking_retry_datetime_guard",
              suggestedActions: []
            };
          }

          const customerName =
            lastRetryBot.match(
              /BOOKING_CUSTOMER_NAME:(.+)/
            )?.[1]?.trim() || "";

          const customerPhone =
            lastRetryBot.match(
              /BOOKING_CUSTOMER_PHONE:(\d+)/
            )?.[1]?.trim() || "";

          if (
            !customerName ||
            customerPhone.length < 10
          ) {
            console.warn(
              `⚠️ [FOX Booking Retry] Preserved identity missing | Workspace=${workspace.id}`
            );

            const resetPrompt =
              messageLang === "ar"
                ? "محتاج أتأكد من بيانات الحجز. ابعتلي اسم صاحب الحجز ورقم الموبايل مرة تانية."
                : "I need to reconfirm the booking details. Please send the customer name and phone number again.";

            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "bot",
                text: resetPrompt,
                time: new Date().toISOString(),
                agentRole: "Sales"
              }
            );

            return {
              response: resetPrompt,
              aiResponse: resetPrompt,
              detectedLanguage: messageLang,
              source: "fox_booking_retry_identity_reset",
              suggestedActions: []
            };
          }

          // Store a NEW complete booking request.
          //
          // The existing deterministic parser searches backwards
          // for the most recent booking-intent user message, so this
          // becomes the new canonical date/time request.
          const replacementBookingRequest =
            `عاوز أحجز موعد ${retryMessage}`;

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "user",
              text: replacementBookingRequest,
              time: new Date().toISOString(),
              agentRole: "Sales"
            }
          );

          // Re-create the identity prompt internally so the existing
          // deterministic booking follow-up can safely reuse the
          // already collected identity in this SAME request.
          const identityPrompt =
            messageLang === "ar"
              ? "تمام ✅ قبل تأكيد الحجز، ابعتلي **اسم صاحب الحجز ورقم الموبايل** المستخدم في الحجز."
              : "Great ✅ Before confirming the booking, please send the customer name and phone number.";

          await sharedMemoryService.appendMessage(
            workspace.id,
            params.sessionId,
            {
              sender: "bot",
              text: identityPrompt,
              time: new Date().toISOString(),
              agentRole: "Sales"
            }
          );

          console.log(
            `🔁 [FOX Booking Retry] New date/time captured | Workspace=${workspace.id} | Customer=${customerName} | Phone=${customerPhone}`
          );

          // Replace the current message in-memory for the existing
          // deterministic identity follow-up below.
          message =
            `الاسم ${customerName} ورقم الموبايل ${customerPhone}`;

          console.log(
            `🪪 [FOX Booking Retry] Reusing preserved customer identity | Workspace=${workspace.id}`
          );
        }
      } catch (retryError) {
        console.warn(
          "[FOX Booking Retry] State handling failed:",
          retryError
        );
      }
    }

    // =========================================================
    // DETERMINISTIC BOOKING FOLLOW-UP
    // If FOX previously asked for fresh name + phone, complete
    // the booking server-side instead of depending on LLM tools.
    // =========================================================
    if (workspace?.id && params.sessionId) {
      try {
        const bookingCtx =
          await sharedMemoryService.getContext(
            workspace.id,
            params.sessionId
          );

        const lastBotText =
          bookingCtx.messages
            .slice()
            .reverse()
            .find((m) => m.sender === "bot")
            ?.text || "";

        const waitingForIdentity =
          /(اسم صاحب الحجز ورقم الموبايل|customer name and phone number)/i.test(
            lastBotText
          );

        if (waitingForIdentity) {
          const identityMessage =
            String(message || "").trim();

          // Extract phone independently from the message so name + phone
          // can safely exist on the same line.
          const phoneMatch =
            identityMessage.match(
              /(?:\+?\d[\d\s-]{8,16}\d)/
            );

          const phone =
            phoneMatch
              ? phoneMatch[0].replace(/\D/g, "")
              : "";

          // Remove the phone and common Arabic/English identity labels.
          // Examples supported:
          // "أحمد محمد 01012345678"
          // "الاسم أحمد محمد ورقم الموبايل 01012345678"
          // "اسمي أحمد محمد ورقمي 01012345678"
          let customerName =
            identityMessage;

          if (phoneMatch) {
            customerName =
              customerName.replace(phoneMatch[0], " ");
          }

          customerName =
            customerName
              .replace(
                /(?:الاسم|اسمي|اسم\s*صاحب\s*الحجز|name)\s*[:：-]?/gi,
                " "
              )
              .replace(
                /(?:و?رقم\s*(?:الموبايل|الموبيل|الهاتف|التليفون)|و?رقمي|phone(?:\s*number)?)\s*[:：-]?/gi,
                " "
              )
              .replace(/\s+/g, " ")
              .trim()
              .replace(/^(?:و|هو|هي)\s+/i, "")
              .trim();

          console.log(
            `🪪 [FOX Booking Identity] Workspace=${workspace.id} | Name=${customerName || "NONE"} | PhoneCaptured=${!!phone}`
          );

          const originalBookingRequest =
            bookingCtx.messages
              .slice()
              .reverse()
              .find(
                (m) =>
                  m.sender === "user" &&
                  /(عاوز\s*أحجز|عايز\s*أحجز|أريد\s*حجز|اريد\s*حجز|احجز|أحجز|book\s+an?\s*appointment|reserve)/i.test(
                    m.text || ""
                  )
              )
              ?.text || "";

          if (
            phone.length >= 10 &&
            customerName.length >= 2 &&
            originalBookingRequest
          ) {
            // -------------------------------
            // Parse Arabic / English date
            // -------------------------------
            const arabicMonths: Record<string, number> = {
              "يناير": 1,
              "فبراير": 2,
              "مارس": 3,
              "أبريل": 4,
              "ابريل": 4,
              "مايو": 5,
              "يونيو": 6,
              "يوليو": 7,
              "أغسطس": 8,
              "اغسطس": 8,
              "سبتمبر": 9,
              "أكتوبر": 10,
              "اكتوبر": 10,
              "نوفمبر": 11,
              "ديسمبر": 12
            };

            let bookingDate = "";
            let bookingTime = "";

            const now = new Date();
            const currentYear = now.getFullYear();

            // Arabic date: 22 أغسطس
            const dateMatch =
              originalBookingRequest.match(
                /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)/i
              );

            if (dateMatch) {
              const day = Number(dateMatch[1]);
              const month =
                arabicMonths[dateMatch[2]];

              if (month) {
                bookingDate =
                  `${currentYear}-` +
                  `${String(month).padStart(2, "0")}-` +
                  `${String(day).padStart(2, "0")}`;
              }
            }

            // ------------------------------------------------
            // Parse appointment TIME only from an explicit time phrase.
            // Never mistake the DAY number (e.g. 23 August) for the hour.
            // Examples:
            // الساعة 1 ظهراً  -> 01:00 PM
            // الساعة 10 صباحاً -> 10:00 AM
            // 2:30 مساءً       -> 02:30 PM
            // ------------------------------------------------
            const timeMatch =
              originalBookingRequest.match(
                /(?:الساعة\s+|الساعة\s*|at\s+)(\d{1,2})(?::(\d{2}))?\s*(صباحاً|صباحا|صباحًا|صباح|ظهراً|ظهرا|ظهرًا|ظهر|مساءً|مساءا|مساء|am|pm)/i
              );

            if (timeMatch) {
              let hour12 = Number(timeMatch[1]);
              const minute = Number(timeMatch[2] || 0);

              const period =
                String(timeMatch[3] || "").toLowerCase();

              if (
                hour12 < 1 ||
                hour12 > 12 ||
                minute < 0 ||
                minute > 59
              ) {
                bookingTime = "";
              } else {
                const isPM =
                  /ظهر|مساء|pm/.test(period);

                const suffix = isPM ? "PM" : "AM";

                bookingTime =
                  `${String(hour12).padStart(2, "0")}:` +
                  `${String(minute).padStart(2, "0")} ${suffix}`;
              }
            }

            if (!bookingDate || !bookingTime) {
              const msg =
                messageLang === "ar"
                  ? "محتاج أتأكد من تاريخ ووقت الحجز. اكتبهم مرة تانية مثلاً: 22 أغسطس الساعة 12 ظهراً."
                  : "I need to confirm the appointment date and time. Please send them again.";

              return {
                response: msg,
                aiResponse: msg,
                detectedLanguage: messageLang,
                source: "fox_booking_parser",
                suggestedActions: []
              };
            }

            const available =
              await workspaceDataService.isAppointmentAvailable(
                workspace.id,
                bookingDate,
                bookingTime
              );

            if (!available) {
              const msg =
                messageLang === "ar"
                  ? `الموعد ${bookingDate} الساعة ${bookingTime} غير متاح حالياً. اختار تاريخ ووقت تاني من فضلك.`
                  : `The appointment on ${bookingDate} at ${bookingTime} is not available. Please choose another date and time.`;

              // Preserve the already validated fresh identity so the
              // customer does NOT need to send name + phone again.
              //
              // This marker is internal shared-memory state and is
              // intentionally not returned to the customer.
              await sharedMemoryService.appendMessage(
                workspace.id,
                params.sessionId,
                {
                  sender: "bot",
                  text:
                    msg +
                    `\nBOOKING_STATE:WAIT_NEW_DATETIME` +
                    `\nBOOKING_CUSTOMER_NAME:${customerName}` +
                    `\nBOOKING_CUSTOMER_PHONE:${phone}`,
                  time: new Date().toISOString(),
                  agentRole: "Sales"
                }
              );

              console.log(
                `🔄 [FOX Booking] Appointment unavailable; waiting for replacement date/time | Workspace=${workspace.id} | Customer=${customerName}`
              );

              return {
                response: msg,
                aiResponse: msg,
                detectedLanguage: messageLang,
                source: "firestore:availability",
                suggestedActions: []
              };
            }

            // ===============================================
            // RESOLVE PENDING COUPON + REAL CLINIC PRICE
            // ===============================================
            let bookingService: any = null;

            let bookingFinancials:
              | {
                  couponCode: string;
                  originalAmount: number;
                  discountAmount: number;
                  finalAmount: number;
                }
              | null = null;

            // Find the most recent validated coupon that has not
            // already been redeemed in this conversation.
            let lastValidatedCouponIndex = -1;
            let lastRedeemedCouponIndex = -1;
            let pendingCouponCode = "";

            bookingCtx.messages.forEach((memoryMessage, index) => {
              const text =
                String(memoryMessage.text || "");

              const validated =
                text.match(
                  /\[FOX_COUPON_VALIDATED:([A-Z0-9_-]+)\]/i
                );

              if (validated?.[1]) {
                lastValidatedCouponIndex = index;
                pendingCouponCode =
                  String(validated[1])
                    .trim()
                    .toUpperCase();
              }

              if (
                /\[FOX_COUPON_REDEEMED:[A-Z0-9_-]+\]/i.test(
                  text
                )
              ) {
                lastRedeemedCouponIndex = index;
              }
            });

            if (
              lastValidatedCouponIndex <=
              lastRedeemedCouponIndex
            ) {
              pendingCouponCode = "";
            }

            if (pendingCouponCode) {
              const clinicServices =
                await workspaceDataService.getClinicServices(
                  workspace.id
                );

              const availableServices =
                clinicServices.filter(
                  (service: any) =>
                    service.available !== false &&
                    Number(service.price || 0) > 0
                );

              // Try explicit service selection from recent messages.
              const recentCustomerText =
                bookingCtx.messages
                  .filter(
                    (memoryMessage) =>
                      memoryMessage.sender === "user"
                  )
                  .slice(-10)
                  .map(
                    (memoryMessage) =>
                      String(
                        memoryMessage.text || ""
                      ).toLowerCase()
                  )
                  .join(" ");

              bookingService =
                availableServices.find(
                  (service: any) =>
                    service.name &&
                    recentCustomerText.includes(
                      String(
                        service.name
                      ).toLowerCase()
                    )
                ) || null;

              // If the business has exactly one priced clinic
              // service, it is safe to use it for a generic booking.
              if (
                !bookingService &&
                availableServices.length === 1
              ) {
                bookingService =
                  availableServices[0];
              }

              if (!bookingService) {
                const serviceNames =
                  availableServices
                    .map(
                      (service: any) =>
                        `• ${service.name} - ${service.price} EGP`
                    )
                    .join("\n");

                const msg =
                  messageLang === "ar"
                    ? (
                        "🎟️ كود الخصم صالح، لكن لازم أحدد الخدمة قبل تطبيق الخصم.\n\n" +
                        (
                          serviceNames ||
                          "لا توجد خدمات مسعرة متاحة حالياً."
                        ) +
                        "\n\nاكتب اسم الخدمة المطلوبة."
                      )
                    : (
                        "🎟️ Your coupon is valid, but I need to know which service you are booking before applying the discount.\n\n" +
                        (
                          serviceNames ||
                          "No priced services are currently available."
                        )
                      );

                return {
                  response: msg,
                  aiResponse: msg,
                  detectedLanguage: messageLang,
                  source:
                    "firestore:coupon_service_required",
                  suggestedActions: [],
                };
              }

              const couponValidation =
                await couponService.validateCoupon(
                  workspace.id,
                  pendingCouponCode,
                  Number(bookingService.price)
                );

              if (
                !couponValidation.valid ||
                couponValidation.originalAmount === undefined ||
                couponValidation.discountAmount === undefined ||
                couponValidation.finalAmount === undefined
              ) {
                const msg =
                  messageLang === "ar"
                    ? `تعذر تطبيق كود الخصم ${pendingCouponCode} على الحجز. تحقق من صلاحية الكود وحاول مرة أخرى.`
                    : `Coupon ${pendingCouponCode} could not be applied to this booking.`;

                return {
                  response: msg,
                  aiResponse: msg,
                  detectedLanguage: messageLang,
                  source:
                    "firestore:coupon_booking_invalid",
                  suggestedActions: [],
                };
              }

              bookingFinancials = {
                couponCode:
                  pendingCouponCode,
                originalAmount:
                  couponValidation.originalAmount,
                discountAmount:
                  couponValidation.discountAmount,
                finalAmount:
                  couponValidation.finalAmount,
              };

              console.log(
                `💰 [FOX Booking Price] Workspace=${workspace.id} | Service=${bookingService.name} | Original=${bookingFinancials.originalAmount} | Coupon=${pendingCouponCode} | Discount=${bookingFinancials.discountAmount} | Final=${bookingFinancials.finalAmount}`
              );
            }

            const lead =
              await workspaceDataService.upsertLead(
                workspace.id,
                {
                  name: customerName,
                  phone,
                  channel,
                  sessionId: params.sessionId,

                  externalCustomerId:
                    extractCanonicalExternalCustomerId(
                      channel,
                      params.sessionId
                    )
                }
              );

            const appointment =
              await workspaceDataService.createAppointment(
                workspace.id,
                {
                  customerName,
                  phone,
                  date: bookingDate,
                  time: bookingTime,
                  channel,
                  sessionId: params.sessionId,

                  serviceId:
                    bookingService?.id,
                  serviceName:
                    bookingService?.name,

                  // Store the real base price immediately.
                  // Coupon fields are persisted only after
                  // redeemCoupon succeeds.
                  originalAmount:
                    bookingFinancials?.originalAmount,
                }
              );

            let couponApplied = false;
            let couponRedemptionId = "";

            if (
              bookingFinancials &&
              bookingService
            ) {
              try {
                const redemption: any =
                  await couponService.redeemCoupon({
                    workspaceId:
                      workspace.id,
                    code:
                      bookingFinancials.couponCode,
                    customerName,
                    customerPhone:
                      phone,
                    channel,
                    sessionId:
                      params.sessionId,
                    transactionType:
                      "appointment",
                    transactionId:
                      String(appointment.id),
                    originalAmount:
                      bookingFinancials.originalAmount,
                  });

                if (
                  redemption?.redeemed &&
                  redemption?.redemptionId
                ) {
                  couponApplied = true;

                  couponRedemptionId =
                    String(
                      redemption.redemptionId
                    );

                  await workspaceDataService.updateAppointmentFinancials(
                    workspace.id,
                    String(appointment.id),
                    {
                      serviceId:
                        bookingService.id,
                      serviceName:
                        bookingService.name,
                      originalAmount:
                        bookingFinancials.originalAmount,
                      couponCode:
                        bookingFinancials.couponCode,
                      discountAmount:
                        bookingFinancials.discountAmount,
                      finalAmount:
                        bookingFinancials.finalAmount,
                      couponRedemptionId,
                    }
                  );

                  await sharedMemoryService.appendMessage(
                    workspace.id,
                    params.sessionId,
                    {
                      sender: "bot",
                      text:
                        `[FOX_COUPON_REDEEMED:${bookingFinancials.couponCode}] Redemption=${couponRedemptionId}`,
                      time:
                        new Date().toISOString(),
                      agentRole:
                        "Sales",
                    }
                  );

                  console.log(
                    `✅ [FOX Booking Coupon] Applied | Workspace=${workspace.id} | Appointment=${appointment.id} | Code=${bookingFinancials.couponCode} | Redemption=${couponRedemptionId}`
                  );
                }
              } catch (couponRedeemError) {
                console.error(
                  `❌ [FOX Booking Coupon] Redemption failed | Workspace=${workspace.id} | Appointment=${appointment.id}`,
                  couponRedeemError
                );
              }
            }

            await markBookingConversion(
              workspace.id,
              lead,
              appointment,
              customerName,
              phone
            );

            console.log(
              `✅ [FOX CRM] Direct appointment saved | Workspace=${workspace.id} | Customer=${customerName} | ${bookingDate} ${bookingTime}`
            );

            if (
              workspace.externalCrmWebhookUrl
            ) {
              try {
                triggerExternalCRM(
                  workspace.id,
                  "booking",
                  {
                    appointment,
                    lead,
                    date: bookingDate,
                    time: bookingTime,
                    name: customerName,
                    phone,
                    channel
                  },
                  workspace.externalCrmWebhookUrl
                );
              } catch (err) {
                console.warn(
                  "[FOX CRM] External webhook failed; booking remains saved.",
                  err
                );
              }
            }

            const bookingLanguage =
              this.detectLanguage(originalBookingRequest);

            let confirmation =
              bookingLanguage === "ar"
                ? `✅ تم تأكيد حجزك بنجاح 🎉\n\nالاسم: ${customerName}\nالتاريخ: ${bookingDate}\nالوقت: ${bookingTime}`
                : `✅ Your appointment has been confirmed successfully.\n\nName: ${customerName}\nDate: ${bookingDate}\nTime: ${bookingTime}`;

            if (
              bookingService &&
              bookingFinancials
            ) {
              if (couponApplied) {
                confirmation +=
                  bookingLanguage === "ar"
                    ? (
                        `\n\n🏥 الخدمة: ${bookingService.name}` +
                        `\n💵 السعر الأصلي: ${bookingFinancials.originalAmount} جنيه` +
                        `\n🎟️ كود الخصم: ${bookingFinancials.couponCode}` +
                        `\n💰 قيمة الخصم: ${bookingFinancials.discountAmount} جنيه` +
                        `\n✅ الإجمالي بعد الخصم: ${bookingFinancials.finalAmount} جنيه`
                      )
                    : (
                        `\n\nService: ${bookingService.name}` +
                        `\nOriginal price: ${bookingFinancials.originalAmount} EGP` +
                        `\nCoupon: ${bookingFinancials.couponCode}` +
                        `\nDiscount: ${bookingFinancials.discountAmount} EGP` +
                        `\nFinal total: ${bookingFinancials.finalAmount} EGP`
                      );
              } else {
                confirmation +=
                  bookingLanguage === "ar"
                    ? (
                        `\n\n🏥 الخدمة: ${bookingService.name}` +
                        `\n💵 السعر: ${bookingFinancials.originalAmount} جنيه` +
                        `\n⚠️ تعذر تسجيل الخصم، لذلك لم يتم خصم قيمة الكوبون من الحجز.`
                      )
                    : (
                        `\n\nService: ${bookingService.name}` +
                        `\nPrice: ${bookingFinancials.originalAmount} EGP` +
                        `\nThe coupon could not be redeemed, so no discount was applied.`
                      );
              }
            }

            if (bookingLanguage === "ar") {
              confirmation +=
                `\n\nنتشرف بخدمتك في ${workspace.name || "العيادة"}.`;
            }

            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "user",
                text: message,
                time: new Date().toISOString(),
                agentRole: "Sales"
              }
            );

            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "bot",
                text: confirmation,
                time: new Date().toISOString(),
                agentRole: "Sales"
              }
            );

            return {
              response: confirmation,
              aiResponse: confirmation,
              detectedLanguage: this.detectLanguage(originalBookingRequest),
              source: "firestore:direct_booking",
              suggestedActions:
                messageLang === "ar"
                  ? ["عرض حجوزاتي", "تعديل الموعد", "إلغاء الموعد"]
                  : ["My Appointments", "Modify Appointment", "Cancel Appointment"]
            };
          }
        }
      } catch (bookingError) {
        console.error(
          "❌ [FOX Direct Booking Error]",
          bookingError
        );
      }
    }

    // =========================================================
    // DETERMINISTIC COUPON VALIDATION
    //
    // Coupon validity is a business transaction and MUST NOT
    // be invented or guessed by an LLM.
    // =========================================================
    if (workspace?.id) {
      const couponMessage =
        String(message || "").trim();

      const couponLower =
        couponMessage.toLowerCase();

      const hasCouponIntent =
        /(?:كوبون|كود\s*(?:خصم)?|برومو|promo|coupon|discount\s*code)/i.test(
          couponLower
        );

      if (hasCouponIntent) {
        // Accept examples:
        // "معايا كود FOX20"
        // "كوبون LASER20"
        // "promo SUMMER25"
        //
        // Coupon codes are intentionally restricted to a safe
        // alphanumeric format with _ and -.
        const couponPatterns = [
          /(?:كود(?:\s*خصم)?|كوبون|برومو)\s*[:：-]?\s*([A-Za-z0-9_-]{3,40})/i,
          /(?:coupon|promo|discount\s*code)\s*[:：-]?\s*([A-Za-z0-9_-]{3,40})/i,
        ];

        let couponCode = "";

        for (const pattern of couponPatterns) {
          const match =
            couponMessage.match(pattern);

          if (match?.[1]) {
            couponCode =
              String(match[1])
                .trim()
                .toUpperCase();

            break;
          }
        }

        if (!couponCode) {
          const reply =
            messageLang === "ar"
              ? "🎟️ تمام. ابعت كود الخصم نفسه من فضلك، مثال: FOX20"
              : "🎟️ Sure. Please send the coupon code, for example: FOX20.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:coupon_missing_code",
            suggestedActions: [],
          };
        }

        try {
          const couponValidation =
            await couponService.validateCoupon(
              workspace.id,
              couponCode
            );

          if (!couponValidation.valid) {
            const reason =
              couponValidation.reason;

            let reply = "";

            if (messageLang === "ar") {
              switch (reason) {
                case "COUPON_INACTIVE":
                  reply =
                    `🎟️ كود ${couponCode} موجود لكنه غير مفعّل حالياً.`;
                  break;

                case "COUPON_NOT_STARTED":
                  reply =
                    `🎟️ كود ${couponCode} لم تبدأ فترة صلاحيته بعد.`;
                  break;

                case "COUPON_EXPIRED":
                  reply =
                    `🎟️ كود ${couponCode} انتهت صلاحيته.`;
                  break;

                case "COUPON_USAGE_LIMIT_REACHED":
                  reply =
                    `🎟️ كود ${couponCode} وصل للحد الأقصى من مرات الاستخدام.`;
                  break;

                case "COUPON_NOT_FOUND":
                default:
                  reply =
                    `❌ كود الخصم ${couponCode} غير صحيح أو غير تابع لهذه المنشأة.`;
                  break;
              }
            } else {
              switch (reason) {
                case "COUPON_INACTIVE":
                  reply =
                    `🎟️ Coupon ${couponCode} exists but is currently inactive.`;
                  break;

                case "COUPON_NOT_STARTED":
                  reply =
                    `🎟️ Coupon ${couponCode} is not valid yet.`;
                  break;

                case "COUPON_EXPIRED":
                  reply =
                    `🎟️ Coupon ${couponCode} has expired.`;
                  break;

                case "COUPON_USAGE_LIMIT_REACHED":
                  reply =
                    `🎟️ Coupon ${couponCode} has reached its usage limit.`;
                  break;

                default:
                  reply =
                    `❌ Coupon ${couponCode} is invalid for this business.`;
              }
            }

            console.log(
              `🎟️ [FOX Coupon] Rejected | Workspace=${workspace.id} | Code=${couponCode} | Reason=${reason}`
            );

            return {
              response: reply,
              aiResponse: reply,
              detectedLanguage: messageLang,
              source: "firestore:coupon_invalid",
              suggestedActions: [],
            };
          }

          const coupon: any =
            couponValidation.coupon;

          const discountText =
            coupon.discountType === "percentage"
              ? `${coupon.discountValue}%`
              : `${coupon.discountValue} EGP`;

          const usageLimit =
            Number(coupon.usageLimit || 0);

          const usageCount =
            Number(coupon.usageCount || 0);

          const remaining =
            usageLimit > 0
              ? Math.max(
                  0,
                  usageLimit - usageCount
                )
              : null;

          const reply =
            messageLang === "ar"
              ? (
                  `✅ كود الخصم ${couponCode} صالح.\n\n` +
                  `🎁 قيمة الخصم: ${discountText}\n` +
                  `📌 الشروط: ${coupon.condition || "طبقاً لشروط العرض"}\n` +
                  (
                    coupon.validUntil
                      ? `📅 صالح حتى: ${coupon.validUntil}\n`
                      : ""
                  ) +
                  (
                    remaining !== null
                      ? `🔢 الاستخدامات المتبقية: ${remaining}\n`
                      : ""
                  ) +
                  `\nسيتم تطبيق الخصم عند إتمام العملية المؤهلة للعرض.`
                )
              : (
                  `✅ Coupon ${couponCode} is valid.\n\n` +
                  `🎁 Discount: ${discountText}\n` +
                  `📌 Conditions: ${coupon.condition || "Offer conditions apply"}\n` +
                  (
                    coupon.validUntil
                      ? `📅 Valid until: ${coupon.validUntil}\n`
                      : ""
                  ) +
                  (
                    remaining !== null
                      ? `🔢 Remaining uses: ${remaining}\n`
                      : ""
                  ) +
                  `\nThe discount will be applied when an eligible transaction is completed.`
                );

          console.log(
            `✅ [FOX Coupon] Validated | Workspace=${workspace.id} | Code=${couponCode} | Discount=${discountText}`
          );

          // Remember the validated coupon in shared memory so the
          // following booking/order flow can redeem the SAME code.
          if (params.sessionId) {
            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "bot",
                text:
                  `[FOX_COUPON_VALIDATED:${couponCode}] ${reply}`,
                time:
                  new Date().toISOString(),
                agentRole: "Marketing"
              }
            );
          }

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:coupon_valid",
            suggestedActions:
              messageLang === "ar"
                ? ["إتمام الحجز", "إتمام الطلب"]
                : ["Complete Booking", "Complete Order"],
          };

        } catch (couponError) {
          console.error(
            `❌ [FOX Coupon] Validation error | Workspace=${workspace.id} | Code=${couponCode}`,
            couponError
          );

          const reply =
            messageLang === "ar"
              ? "تعذر التحقق من كود الخصم حالياً. حاول مرة أخرى بعد قليل."
              : "I couldn't verify the coupon right now. Please try again shortly.";

          return {
            response: reply,
            aiResponse: reply,
            detectedLanguage: messageLang,
            source: "firestore:coupon_error",
            suggestedActions: [],
          };
        }
      }
    }

    // FOX Smart Agent Router
    let forcedBookingSales = false;

    if (workspace?.id && params.sessionId) {
      try {
        const bookingCtx =
          await sharedMemoryService.getContext(
            workspace.id,
            params.sessionId
          );

        const lastBotText =
          bookingCtx.messages
            .slice()
            .reverse()
            .find((m) => m.sender === "bot")
            ?.text || "";

        forcedBookingSales =
          /(اسم صاحب الحجز ورقم الموبايل|customer name and phone number)/i.test(
            lastBotText
          );
      } catch {
        forcedBookingSales = false;
      }
    }

    const agentRole: "Sales" | "Support" | "Marketing" =
      forcedBookingSales
        ? "Sales"
        : await this.detectAgentRole(workspace, message);

    const roleConfig: Partial<AiAgentConfig> =
      agentRole === "Sales"
        ? {
            agentName:
              workspace.aiSettings?.salesAgentName ||
              "FOX Sales Agent",
            customPrompt:
              workspace.aiSettings?.salesAgentPrompt ||
              "Act as a professional sales consultant. Understand customer needs, recommend the most suitable service, answer pricing accurately and guide the customer naturally toward booking, ordering or subscribing without being pushy.",
          }
        : agentRole === "Marketing"
        ? {
            agentName:
              workspace.aiSettings?.marketingAgentName ||
              "FOX Marketing Agent",
            customPrompt:
              workspace.aiSettings?.marketingAgentPrompt ||
              "Act as a marketing and growth specialist. Explain approved offers and benefits, recommend relevant services and identify ethical upsell opportunities. Never invent discounts.",
          }
        : {
            agentName:
              workspace.aiSettings?.supportAgentName ||
              "FOX Support Agent",
            customPrompt:
              workspace.aiSettings?.supportAgentPrompt ||
              "Act as an expert customer support specialist. Diagnose problems, respond empathetically, solve issues using approved business information and escalate when human intervention is required.",
          };

    const effectiveConfig: Partial<AiAgentConfig> = {
      ...roleConfig,
      ...overrideConfig,
    };

    console.log(
      `[Smart Router] ${channel} -> ${agentRole}: ${message.substring(0, 120)}`
    );

    const todayISO = new Date().toISOString().slice(0, 10);

    const systemInstruction =
      this.buildSystemInstruction(
        workspace,
        messageLang,
        channel,
        effectiveConfig
      ) +
      `

CURRENT DATE:
${todayISO}

DATE SAFETY RULES:
- Never create or confirm an appointment in the past.
- If the customer says "tomorrow", "بكرة", "next week", or another relative date, resolve it using CURRENT DATE above.
- Never guess a previous year from conversation history.
- Never reuse an old customer's name or phone for a new booking unless the customer provided or clearly reconfirmed them in the current booking conversation.
- Asking about available appointments is NOT permission to create a booking.
`;

    const openRouter = this.getOpenRouterClient();
    const ai = this.getGeminiClient();

    // OpenRouter is the primary provider.
    // Gemini remains available as a fallback.
    if (!openRouter && !ai) {
      const msgLower = message.toLowerCase();
      const isAr = messageLang === "ar";
      const businessName = workspace.name || "Fox Business";
      const agentName = workspace.aiSettings?.agentName || `${businessName} AI Assistant`;

      let responseText = "";
      if (isAr) {
        responseText = `أهلاً بك في ${businessName}! أنا ${agentName}، المساعد الذكي الخاص بالنشاط. `;
        if (
          msgLower.includes("سعر") ||
          msgLower.includes("كام") ||
          msgLower.includes("بكام") ||
          msgLower.includes("منيو") ||
          msgLower.includes("دكتور")
        ) {
          responseText += `إليك تفاصيل الخدمات والأسعار المتاحة لدينا بالجنيه المصري (EGP). يسعدنا تزويدك بأي معلومات إضافية تحتاجها!`;
        } else if (msgLower.includes("حجز") || msgLower.includes("موعد") || msgLower.includes("احجز")) {
          responseText += `يمكنني مساعدتك في تسجيل حجزك فوراً! يرجى تزويدي باسمك ورقم هاتفك والموعد المفضل وسأقوم بحفظه في الـ CRM.`;
        } else {
          responseText += `كيف يمكنني مساعدتك اليوم؟ يمكنك الاستفسار عن الخدمات والأسعار أو طلب المواعيد.`;
        }
      } else {
        responseText = `Hello! Welcome to ${businessName}. I am ${agentName}. `;
        if (msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("menu") || msgLower.includes("doctor")) {
          responseText += `Here are our available services and catalog prices in EGP. Feel free to ask any questions!`;
        } else if (msgLower.includes("book") || msgLower.includes("appointment")) {
          responseText += `I can help you book an appointment! Please provide your name, phone number, and preferred slot for CRM registration.`;
        } else {
          responseText += `How may I assist you today? You can ask about our catalog, pricing, or book an appointment.`;
        }
      }

      return {
        response: responseText,
        aiResponse: responseText,
        detectedLanguage: messageLang,
        source: "fallback_engine",
        suggestedActions:
          messageLang === "ar"
            ? ["حجز موعد", "استعراض الأسعار", "التحدث مع مسؤول"]
            : ["Book Appointment", "View Catalog", "Contact Support"],
      };
    }

    try {
      const formattedContents: any[] = [];
      let finalChatHistory = chatHistory;
      
      // Use SharedMemoryContext if sessionId and workspaceId are provided
      if (params.sessionId && workspace.id) {
        const sharedCtx = await sharedMemoryService.getContext(workspace.id, params.sessionId);
        if (sharedCtx.messages.length > 0) {
          finalChatHistory = sharedCtx.messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text,
          }));
        }
        // Append current user message to shared memory
        await sharedMemoryService.appendMessage(workspace.id, params.sessionId, {
          sender: "user",
          text: message,
          time: new Date().toISOString()
        });
      }

      for (const h of finalChatHistory) {
        const text = h.text || h.parts?.[0]?.text;
        if (text) {
          const role = h.sender === "user" || h.role === "user" ? "user" : "model";
          formattedContents.push({
            role,
            parts: [{ text }],
          });
        }
      }

      formattedContents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const FALLBACK_MODELS = [
        "gemini-3.6-flash",
        "gemini-3.1-pro-preview",
        "gemini-flash-latest"
      ];

      // =========================================================
      // FOX NATIVE CRM TOOLS
      // Firestore is the primary database.
      // Google Sheets / external CRM are optional integrations.
      // =========================================================
      const tools = [
        {
          functionDeclarations: [
            {
              name: "checkAppointmentAvailability",
              description:
                "Check whether a requested appointment date and time is available in this business workspace.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  date: {
                    type: Type.STRING,
                    description: "Appointment date in YYYY-MM-DD format"
                  },
                  time: {
                    type: Type.STRING,
                    description: "Appointment time, for example 10:00 AM"
                  }
                },
                required: ["date", "time"]
              }
            },
            {
              name: "bookAppointment",
              description:
                "Create and confirm an appointment only after customer name, phone, date and time have all been collected.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  date: {
                    type: Type.STRING,
                    description: "Appointment date in YYYY-MM-DD format"
                  },
                  time: {
                    type: Type.STRING,
                    description: "Appointment time"
                  },
                  name: {
                    type: Type.STRING,
                    description: "Customer full name"
                  },
                  phone: {
                    type: Type.STRING,
                    description: "Customer phone number"
                  }
                },
                required: ["date", "time", "name", "phone"]
              }
            },
            {
              name: "recordSale",
              description:
                "Record a confirmed successful sale or order.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  itemName: {
                    type: Type.STRING,
                    description: "Item, service or package sold"
                  },
                  price: {
                    type: Type.NUMBER,
                    description: "Total sale price"
                  },
                  customerName: {
                    type: Type.STRING,
                    description: "Customer name"
                  },
                  customerPhone: {
                    type: Type.STRING,
                    description: "Customer phone"
                  }
                },
                required: [
                  "itemName",
                  "price",
                  "customerName",
                  "customerPhone"
                ]
              }
            }
          ]
        }
      ];

      // =========================================================
      // OPENROUTER PRIMARY AI ENGINE
      // Gemini below remains the fallback provider.
      // =========================================================

      // Analytics-safe state must live outside the try/catch so
      // failure logging can access the same request information.
      let foxOpenRouterToolsEnabledForAnalytics = false;
      let foxOpenRouterStartedAtForAnalytics = 0;

      if (openRouter) {
        try {
          console.log(
            `🟢 [OpenRouter] Primary AI request | Workspace=${workspace.id || "unknown"} | Agent=${agentRole}`
          );

          const openRouterMessages: any[] = [
            {
              role: "system",
              content: systemInstruction
            }
          ];

          for (const h of finalChatHistory) {
            const text = h.text || h.parts?.[0]?.text;

            if (!text) continue;

            openRouterMessages.push({
              role:
                h.sender === "user" || h.role === "user"
                  ? "user"
                  : "assistant",
              content: text
            });
          }

          openRouterMessages.push({
            role: "user",
            content: message
          });

          const openRouterTools: any[] = [
            {
              type: "function",
              function: {
                name: "checkAppointmentAvailability",
                description:
                  "Check whether a requested appointment date and time is available in this business workspace.",
                parameters: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Appointment date in YYYY-MM-DD format"
                    },
                    time: {
                      type: "string",
                      description: "Appointment time, for example 10:00 AM"
                    }
                  },
                  required: ["date", "time"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "bookAppointment",
                description:
                  "Create and confirm an appointment only after customer name, phone, date and time have all been collected.",
                parameters: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Appointment date in YYYY-MM-DD format"
                    },
                    time: {
                      type: "string",
                      description: "Appointment time"
                    },
                    name: {
                      type: "string",
                      description: "Customer full name"
                    },
                    phone: {
                      type: "string",
                      description: "Customer phone number"
                    }
                  },
                  required: ["date", "time", "name", "phone"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "getCustomerAppointments",
                description:
                  "Read the customer's real current/future appointments from FOX CRM. Use this before claiming that a customer already has a booking.",
                parameters: {
                  type: "object",
                  properties: {
                    phone: {
                      type: "string",
                      description: "Customer phone number"
                    }
                  },
                  required: ["phone"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "getAppointmentsForDate",
                description:
                  "Read the appointments already booked for a specific date from FOX CRM. This returns booked appointments, not invented availability.",
                parameters: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Date in YYYY-MM-DD format"
                    }
                  },
                  required: ["date"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "recordSale",
                description:
                  "Record a confirmed successful sale or order.",
                parameters: {
                  type: "object",
                  properties: {
                    itemName: {
                      type: "string",
                      description: "Item, service or package sold"
                    },
                    price: {
                      type: "number",
                      description: "Total sale price"
                    },
                    customerName: {
                      type: "string",
                      description: "Customer name"
                    },
                    customerPhone: {
                      type: "string",
                      description: "Customer phone"
                    }
                  },
                  required: [
                    "itemName",
                    "price",
                    "customerName",
                    "customerPhone"
                  ]
                }
              }
            }
          ];

          let orCompletion: any = null;
          let finalOpenRouterText = "";

          let foxOpenRouterModel =
            this.getOpenRouterPrimaryModel();

          const foxOpenRouterStartedAt =
            Date.now();

          // =====================================================
          // FOX SMART TOOL ROUTER
          // =====================================================
          //
          // Do NOT send function tools for ordinary questions.
          // This lets OpenRouter use a much wider free-model pool
          // and avoids unnecessary tool loops.
          //
          // Enable tools only when the current message indicates
          // an operational action that may require real workspace
          // data or a write operation.
          // =====================================================

          const normalizedCurrentMessage =
            String(message || "")
              .trim()
              .toLowerCase();

          // -----------------------------------------------------
          // FOX OPERATIONAL INTENT DETECTION
          //
          // Important:
          // Generic words such as "متاح", "متاحة", "available"
          // are NOT enough to enable tools.
          //
          // Example:
          // "ايه الخدمات المتاحة؟" => Tools OFF
          // "فيه ميعاد متاح؟"     => Tools ON
          // -----------------------------------------------------

          const bookingOperationalIntent =
            /(?:حجز|احجز|أحجز|موعد|ميعاد|مواعيدي|حجوزاتي|appointment|appointments|book\b|booking|reserve|reservation|my appointments)/i.test(
              normalizedCurrentMessage
            );

          const orderOperationalIntent =
            /(?:اطلب|عاوز أطلب|عايز أطلب|اوردر|أوردر|order\b|place an order|purchase|اشتري|شراء)/i.test(
              normalizedCurrentMessage
            );

          const operationalIntent =
            bookingOperationalIntent ||
            orderOperationalIntent;

          const toolsEnabled =
            operationalIntent ||
            forcedBookingSales;

          // =====================================================
          // FOX ADAPTIVE ROUTER V2
          //
          // Only promote a concrete FREE model after enough
          // successful real-world evidence exists.
          //
          // Otherwise keep openrouter/free as the safe router.
          // =====================================================

          if (
            foxOpenRouterModel ===
            "openrouter/free"
          ) {
            const adaptiveChoice =
              await aiModelAnalyticsService
                .getRecommendedOpenRouterModel({
                  toolsEnabled,
                });

            if (adaptiveChoice) {
              foxOpenRouterModel =
                adaptiveChoice.model;

              console.log(
                `🎯 [FOX Adaptive Router] Selected=${adaptiveChoice.model} | Score=${adaptiveChoice.score} | Success=${adaptiveChoice.successRate}% | Requests=${adaptiveChoice.requests} | Latency=${adaptiveChoice.avgLatencyMs}ms | Tools=${toolsEnabled ? "ON" : "OFF"} | Reason=${adaptiveChoice.reason}`
              );
            } else {
              console.log(
                `🛡️ [FOX Adaptive Router] No proven candidate yet | Using=openrouter/free | Tools=${toolsEnabled ? "ON" : "OFF"}`
              );
            }
          } else {
            console.log(
              `⚙️ [FOX Adaptive Router] Explicit OPENROUTER_MODEL configured | Using=${foxOpenRouterModel}`
            );
          }

          foxOpenRouterToolsEnabledForAnalytics =
            toolsEnabled;

          foxOpenRouterStartedAtForAnalytics =
            foxOpenRouterStartedAt;

          console.log(
            `🧠 [FOX Free Router] Primary=${foxOpenRouterModel} | Fallback=openrouter/free | Tools=${toolsEnabled ? "ON" : "OFF"}`
          );

          // Tool requests may require several turns.
          // Normal chat only needs one model request.
          const maxOpenRouterRounds =
            toolsEnabled ? 5 : 1;

          for (
            let toolRound = 0;
            toolRound < maxOpenRouterRounds;
            toolRound++
          ) {
            const requestBody: any = {
              model: foxOpenRouterModel,
              messages: openRouterMessages,
              temperature: 0.3,

              extra_body:
                this.getOpenRouterExtraBody(
                  foxOpenRouterModel
                ),
            };

            if (toolsEnabled) {
              requestBody.tools =
                openRouterTools;

              requestBody.tool_choice =
                "auto";
            }

            orCompletion =
              await openRouter.chat.completions.create(
                requestBody
              );

            const orMessage: any =
              orCompletion.choices?.[0]?.message;

            if (!orMessage) {
              throw new Error(
                "OpenRouter returned no assistant message"
              );
            }

            const toolCalls: any[] =
              orMessage.tool_calls || [];

            // No tool call = final normal AI answer.
            if (toolCalls.length === 0) {
              finalOpenRouterText =
                typeof orMessage.content === "string"
                  ? orMessage.content
                  : "";

              break;
            }

            // Preserve the assistant tool-call message.
            openRouterMessages.push(orMessage);

            for (const toolCall of toolCalls) {
              const toolName =
                toolCall?.function?.name;

              let args: any = {};

              try {
                args = JSON.parse(
                  toolCall?.function?.arguments || "{}"
                );
              } catch {
                args = {};
              }

              console.log(
                `🔧 [OpenRouter Tool] ${toolName} | Workspace=${workspace.id || "unknown"}`
              );

              let functionResult: any = {};

              try {
                if (
                  toolName ===
                  "checkAppointmentAvailability"
                ) {
                  const { date, time } = args;

                  const isAvailable =
                    await workspaceDataService.isAppointmentAvailable(
                      workspace.id,
                      date,
                      time
                    );

                  functionResult = {
                    available: isAvailable,
                    date,
                    time,
                    message: isAvailable
                      ? "Slot is available."
                      : "Slot is already booked. Please suggest another time."
                  };

                  // =====================================================
                  // DETERMINISTIC BOOKING COMPLETION
                  // Some OpenRouter free models stop after availability
                  // instead of calling bookAppointment. If this is the
                  // fresh identity follow-up of an explicit booking flow,
                  // complete the booking server-side.
                  // =====================================================
                  if (isAvailable && params.sessionId && workspace.id) {
                    const currentLines = String(message || "")
                      .split(/\n+/)
                      .map((x) => x.trim())
                      .filter(Boolean);

                    const phoneLine =
                      currentLines.find((line) => {
                        const digits = line.replace(/\D/g, "");
                        return digits.length >= 10 && digits.length <= 15;
                      }) || "";

                    const freshPhone =
                      phoneLine.replace(/\D/g, "");

                    const freshName =
                      currentLines
                        .filter((line) => line !== phoneLine)
                        .join(" ")
                        .trim();

                    const bookingCtx =
                      await sharedMemoryService.getContext(
                        workspace.id,
                        params.sessionId
                      );

                    const lastBotText =
                      bookingCtx.messages
                        .slice()
                        .reverse()
                        .find((m) => m.sender === "bot")
                        ?.text || "";

                    const wasWaitingForFreshIdentity =
                      /(اسم صاحب الحجز ورقم الموبايل|customer name and phone number)/i.test(
                        lastBotText
                      );

                    const previousUserBookingRequest =
                      bookingCtx.messages
                        .slice()
                        .reverse()
                        .find(
                          (m) =>
                            m.sender === "user" &&
                            /(عاوز\s*أحجز|عايز\s*أحجز|أريد\s*حجز|اريد\s*حجز|احجز|أحجز|book\s+an?\s*appointment|reserve)/i.test(
                              m.text || ""
                            )
                        );

                    if (
                      wasWaitingForFreshIdentity &&
                      previousUserBookingRequest &&
                      freshName.length >= 2 &&
                      freshPhone.length >= 10
                    ) {
                      // Re-check immediately before the write.
                      const stillAvailable =
                        await workspaceDataService.isAppointmentAvailable(
                          workspace.id,
                          date,
                          time
                        );

                      if (stillAvailable) {
                        const lead =
                          await workspaceDataService.upsertLead(
                            workspace.id,
                            {
                              name: freshName,
                              phone: freshPhone,
                              channel,
                              sessionId: params.sessionId,

                  externalCustomerId:
                    extractCanonicalExternalCustomerId(
                      channel,
                      params.sessionId
                    )
                            }
                          );

                        const appointment =
                          await workspaceDataService.createAppointment(
                            workspace.id,
                            {
                              customerName: freshName,
                              phone: freshPhone,
                              date,
                              time,
                              channel,
                              sessionId: params.sessionId
                            }
                          );

                        if (
                          workspace.googleSheetsAccessToken &&
                          workspace.crmSpreadsheetId
                        ) {
                          try {
                            await bookAppointmentInSheet(
                              workspace.googleSheetsAccessToken,
                              workspace.crmSpreadsheetId,
                              date,
                              time,
                              freshName,
                              freshPhone
                            );
                          } catch (sheetError) {
                            console.warn(
                              "[FOX CRM] Google Sheets sync failed; Firestore booking remains saved.",
                              sheetError
                            );
                          }
                        }

                        if (workspace.externalCrmWebhookUrl) {
                          try {
                            triggerExternalCRM(
                              workspace.id,
                              "booking",
                              {
                                appointment,
                                lead,
                                date,
                                time,
                                name: freshName,
                                phone: freshPhone,
                                channel
                              },
                              workspace.externalCrmWebhookUrl
                            );
                          } catch (webhookError) {
                            console.warn(
                              "[FOX CRM] External CRM webhook failed; Firestore booking remains saved.",
                              webhookError
                            );
                          }
                        }

                        await markBookingConversion(
                          workspace.id,
                          lead,
                          appointment,
                          freshName,
                          freshPhone
                        );

                        console.log(
                          `✅ [FOX CRM] Deterministic appointment saved | Workspace=${workspace.id} | Customer=${freshName} | ${date} ${time}`
                        );

                        functionResult = {
                          success: true,
                          available: true,
                          bookingCreated: true,
                          date,
                          time,
                          customerName: freshName
                        };

                        finalOpenRouterText =
                          messageLang === "ar"
                            ? `✅ تم تأكيد حجزك بنجاح.\n\nالاسم: ${freshName}\nالتاريخ: ${date}\nالوقت: ${time}\n\nنتشرف بخدمتك.`
                            : `✅ Your appointment has been confirmed successfully.\n\nName: ${freshName}\nDate: ${date}\nTime: ${time}\n\nWe look forward to serving you.`;
                      }
                    }
                  }

                } else if (
                  toolName === "bookAppointment"
                ) {
                  const {
                    date,
                    time,
                    name,
                    phone
                  } = args;

                  // -------------------------------------------------
                  // TRANSACTION SAFETY GUARD
                  // Never trust booking identity only because the LLM
                  // remembered it from an older conversation.
                  // -------------------------------------------------
                  const recentUserContext = [
                    ...finalChatHistory
                      .filter(
                        (h: any) =>
                          h.sender === "user" ||
                          h.role === "user"
                      )
                      .slice(-4)
                      .map(
                        (h: any) =>
                          h.text ||
                          h.parts?.[0]?.text ||
                          ""
                      ),
                    message
                  ].join("\n");

                  const recentAssistantContext =
                    finalChatHistory
                      .filter(
                        (h: any) =>
                          h.sender !== "user" &&
                          h.role !== "user"
                      )
                      .slice(-2)
                      .map(
                        (h: any) =>
                          h.text ||
                          h.parts?.[0]?.text ||
                          ""
                      )
                      .join("\n");

                  const userDigits =
                    recentUserContext.replace(/\D/g, "");

                  const phoneDigits =
                    String(phone || "").replace(/\D/g, "");

                  const normalizedName =
                    String(name || "")
                      .trim()
                      .toLowerCase();

                  const normalizedUserContext =
                    recentUserContext.toLowerCase();

                  const userProvidedPhone =
                    phoneDigits.length >= 8 &&
                    userDigits.includes(
                      phoneDigits.slice(-8)
                    );

                  const userProvidedName =
                    normalizedName.length >= 3 &&
                    normalizedUserContext.includes(
                      normalizedName
                    );

                  const explicitBookingIntent =
                    /(عاوز\s*أحجز|عايز\s*أحجز|اريد\s*حجز|أريد\s*حجز|احجز|أحجز|book\s|book an appointment|reserve)/i.test(
                      recentUserContext
                    );

                  const assistantRequestedDetails =
                    /(الاسم|اسمك|رقم الهاتف|رقم الموبايل|الموبايل|phone|name).*(موعد|تاريخ|وقت|date|time)|(?:موعد|تاريخ|وقت|date|time).*(الاسم|اسمك|رقم الهاتف|رقم الموبايل|phone|name)/is.test(
                      recentAssistantContext
                    );

                  const validDateFormat =
                    /^\d{4}-\d{2}-\d{2}$/.test(
                      String(date || "")
                    );

                  const todayForBooking =
                    new Date()
                      .toISOString()
                      .slice(0, 10);

                  const dateIsNotPast =
                    validDateFormat &&
                    String(date) >= todayForBooking;

                  if (
                    !date ||
                    !time ||
                    !name ||
                    !phone
                  ) {
                    functionResult = {
                      success: false,
                      message:
                        "Missing required booking information. Ask the customer for name, phone, date and time."
                    };

                  } else if (!dateIsNotPast) {
                    functionResult = {
                      success: false,
                      message:
                        `The requested appointment date (${date}) is invalid or in the past. Today is ${todayForBooking}. Ask the customer for a valid future date.`
                    };

                  } else if (
                    !userProvidedPhone ||
                    !userProvidedName
                  ) {
                    functionResult = {
                      success: false,
                      message:
                        "Do NOT create the booking yet. The customer must provide or reconfirm their current name and phone number in this booking conversation. Do not reuse identity data from old memory."
                    };

                  } else if (
                    !explicitBookingIntent &&
                    !assistantRequestedDetails
                  ) {
                    functionResult = {
                      success: false,
                      message:
                        "This conversation does not contain enough evidence of an active booking request. Do not create an appointment. Answer the availability question only."
                    };

                  } else {
                    // Re-check immediately before saving.
                    const isAvailable =
                      await workspaceDataService.isAppointmentAvailable(
                        workspace.id,
                        date,
                        time
                      );

                    if (!isAvailable) {
                      functionResult = {
                        success: false,
                        message:
                          "This appointment slot is already booked. Ask the customer to choose another time."
                      };
                    } else {
                      const lead =
                        await workspaceDataService.upsertLead(
                          workspace.id,
                          {
                            name,
                            phone,
                            channel,
                            sessionId:
                              params.sessionId,

                  externalCustomerId:
                    extractCanonicalExternalCustomerId(
                      channel,
                      params.sessionId
                    )
                          }
                        );

                      const appointment =
                        await workspaceDataService.createAppointment(
                          workspace.id,
                          {
                            customerName: name,
                            phone,
                            date,
                            time,
                            channel,
                            sessionId:
                              params.sessionId
                          }
                        );

                      // Optional Google Sheets sync.
                      if (
                        workspace.googleSheetsAccessToken &&
                        workspace.crmSpreadsheetId
                      ) {
                        try {
                          await bookAppointmentInSheet(
                            workspace.googleSheetsAccessToken,
                            workspace.crmSpreadsheetId,
                            date,
                            time,
                            name,
                            phone
                          );
                        } catch (sheetError) {
                          console.warn(
                            "[FOX CRM] Google Sheets sync failed; Firestore booking remains saved.",
                            sheetError
                          );
                        }
                      }

                      // Optional external CRM / n8n.
                      if (
                        workspace.externalCrmWebhookUrl
                      ) {
                        try {
                          triggerExternalCRM(
                            workspace.id,
                            "booking",
                            {
                              appointment,
                              lead,
                              date,
                              time,
                              name,
                              phone,
                              channel
                            },
                            workspace.externalCrmWebhookUrl
                          );
                        } catch (webhookError) {
                          console.warn(
                            "[FOX CRM] External CRM webhook failed; Firestore booking remains saved.",
                            webhookError
                          );
                        }
                      }

                      await markBookingConversion(
                        workspace.id,
                        lead,
                        appointment,
                        name,
                        phone
                      );

                      console.log(
                        `✅ [FOX CRM] Appointment saved | Workspace=${workspace.id} | Customer=${name} | ${date} ${time}`
                      );

                      functionResult = {
                        success: true,
                        appointmentId: appointment.id,
                        leadId: lead.id,
                        date,
                        time,
                        customerName: name,
                        phone,
                        message:
                          "Appointment booked successfully."
                      };

                      // Customer-facing confirmation is deterministic.
                      // Do not expose internal CRM IDs.
                      finalOpenRouterText =
                        messageLang === "ar"
                          ? `✅ تم تأكيد حجزك بنجاح.\n\nالاسم: ${name}\nالتاريخ: ${date}\nالوقت: ${time}\n\nنتشرف بخدمتك.`
                          : `✅ Your appointment has been confirmed successfully.\n\nName: ${name}\nDate: ${date}\nTime: ${time}\n\nWe look forward to serving you.`;
                    }
                  }

                } else if (
                  toolName === "getCustomerAppointments"
                ) {
                  const { phone } = args;

                  if (!phone) {
                    functionResult = {
                      success: false,
                      message:
                        "Customer phone number is required before checking existing appointments."
                    };
                  } else {
                    const appointments =
                      await workspaceDataService.getCustomerAppointments(
                        workspace.id,
                        phone
                      );

                    console.log(
                      `🔎 [FOX CRM] Customer appointments lookup | Workspace=${workspace.id} | Count=${appointments.length}`
                    );

                    functionResult = {
                      success: true,
                      count: appointments.length,
                      appointments: appointments.map((apt: any) => ({
                        date: apt.date,
                        time: apt.time,
                        status: apt.status
                      }))
                    };
                  }

                } else if (
                  toolName === "getAppointmentsForDate"
                ) {
                  const { date } = args;

                  if (!date) {
                    functionResult = {
                      success: false,
                      message: "Date is required."
                    };
                  } else {
                    const appointments =
                      await workspaceDataService.getAppointmentsForDate(
                        workspace.id,
                        date
                      );

                    console.log(
                      `📅 [FOX CRM] Date appointments lookup | Workspace=${workspace.id} | Date=${date} | Count=${appointments.length}`
                    );

                    functionResult = {
                      success: true,
                      date,
                      bookedSlots: appointments.map((apt: any) => ({
                        time: apt.time,
                        status: apt.status
                      }))
                    };
                  }

                } else if (
                  toolName === "recordSale"
                ) {
                  const {
                    itemName,
                    price,
                    customerName,
                    customerPhone
                  } = args;

                  if (
                    workspace.externalCrmWebhookUrl
                  ) {
                    triggerExternalCRM(
                      workspace.id,
                      "sale",
                      {
                        itemName,
                        price,
                        customerName,
                        customerPhone
                      },
                      workspace.externalCrmWebhookUrl
                    );
                  }

                  functionResult = {
                    success: true,
                    message:
                      "Sale recorded successfully."
                  };

                } else {
                  functionResult = {
                    success: false,
                    error:
                      `Unknown FOX tool: ${toolName}`
                  };
                }

              } catch (toolError: any) {
                console.error(
                  `❌ [OpenRouter Tool Error] ${toolName}:`,
                  toolError
                );

                functionResult = {
                  success: false,
                  error:
                    toolError?.message ||
                    "Tool execution failed"
                };
              }

              openRouterMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
              });

              if (
                finalOpenRouterText &&
                (
                  (toolName === "bookAppointment" &&
                    functionResult?.success === true) ||
                  functionResult?.bookingCreated === true
                )
              ) {
                break;
              }
            }

            if (finalOpenRouterText) {
              break;
            }
          }

          if (!finalOpenRouterText) {
            throw new Error(
              "OpenRouter tool loop ended without a final text response"
            );
          }

          console.log(
            `✅ [FOX Free Router] Response completed | Requested=${foxOpenRouterModel} | Served=${orCompletion?.model || "unknown"}`
          );

          void aiModelAnalyticsService.recordUsage({
            workspaceId: workspace.id,
            provider: "openrouter",
            requestedModel: foxOpenRouterModel,
            servedModel:
              orCompletion?.model ||
              foxOpenRouterModel,
            agentRole,
            channel,
            toolsEnabled:
              toolsEnabled === true,
            // openrouter/free selecting an underlying free model
            // is normal routing, NOT a fallback.
            //
            // Count model-level fallback only when FOX explicitly
            // requested a concrete model and another model served.
            fallbackUsed:
              foxOpenRouterModel !== "openrouter/free" &&
              Boolean(
                orCompletion?.model &&
                orCompletion.model !==
                  foxOpenRouterModel
              ),
            status: "success",
            latencyMs:
              Date.now() -
              foxOpenRouterStartedAt,
          });

          // Save bot reply in this tenant's shared memory.
          if (
            params.sessionId &&
            workspace.id
          ) {
            await sharedMemoryService.appendMessage(
              workspace.id,
              params.sessionId,
              {
                sender: "bot",
                text: finalOpenRouterText,
                time: new Date().toISOString(),
                agentRole
              }
            );
          }

          return {
            response: finalOpenRouterText,
            aiResponse: finalOpenRouterText,
            detectedLanguage: messageLang,
            source:
              `openrouter:${orCompletion?.model || foxOpenRouterModel}`,
            suggestedActions:
              messageLang === "ar"
                ? [
                    "حجز موعد",
                    "التأكد من المواعيد المتاحة",
                    "التحدث مع موظف"
                  ]
                : [
                    "Book Appointment",
                    "Check Availability",
                    "Speak to Human Agent"
                  ]
          };

        } catch (openRouterError: any) {
          console.warn(
            `🟠 [OpenRouter] Primary provider failed: ${openRouterError?.message || openRouterError}`
          );

          void aiModelAnalyticsService.recordUsage({
            workspaceId: workspace.id,
            provider: "openrouter",
            requestedModel:
              this.getOpenRouterPrimaryModel(),
            servedModel:
              this.getOpenRouterPrimaryModel(),
            agentRole,
            channel,
            toolsEnabled:
              foxOpenRouterToolsEnabledForAnalytics,
            fallbackUsed: false,
            status: "failure",
            latencyMs:
              foxOpenRouterStartedAtForAnalytics > 0
                ? Date.now() -
                  foxOpenRouterStartedAtForAnalytics
                : undefined,
            errorType:
              openRouterError?.name ||
              "OpenRouterError",
            errorMessage:
              openRouterError?.message ||
              String(openRouterError),
          });

          if (ai) {
            console.log(
              "🔵 [Gemini] Switching to fallback provider..."
            );
          }
        }
      }

      // =========================================================
      // GEMINI FALLBACK ENGINE
      // =========================================================

      if (!ai) {
        throw new Error(
          "OpenRouter failed and Gemini fallback is unavailable"
        );
      }

      let response;
      let usedModel = "gemini-3.6-flash";
      let lastError;

      for (const model of FALLBACK_MODELS) {
        const foxGeminiStartedAt =
          Date.now();

        try {
          response = await ai.models.generateContent({
            model,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.3,
              tools: undefined
            },
          });
          
          if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            let functionResult = {};
            try {
              if (call.name === "checkAppointmentAvailability") {
                const { date, time } = call.args as any;

                // Firestore is the primary source of truth.
                const isAvailable =
                  await workspaceDataService.isAppointmentAvailable(
                    workspace.id,
                    date,
                    time
                  );

                functionResult = {
                  available: isAvailable,
                  message: isAvailable
                    ? "Slot is available."
                    : "Slot is already booked. Please suggest another time."
                };

              } else if (call.name === "bookAppointment") {
                const { date, time, name, phone } = call.args as any;

                // Always re-check immediately before booking.
                const isAvailable =
                  await workspaceDataService.isAppointmentAvailable(
                    workspace.id,
                    date,
                    time
                  );

                if (!isAvailable) {
                  functionResult = {
                    success: false,
                    message:
                      "Sorry, this appointment slot is already booked. Please select another time."
                  };
                } else {
                  // Create/update CRM lead for this tenant.
                  const lead = await workspaceDataService.upsertLead(
                    workspace.id,
                    {
                      name,
                      phone,
                      channel,
                      sessionId: params.sessionId,

                  externalCustomerId:
                    extractCanonicalExternalCustomerId(
                      channel,
                      params.sessionId
                    )
                    }
                  );

                  // Save appointment in tenant Firestore + legacy dashboard collection.
                  const appointment =
                    await workspaceDataService.createAppointment(
                      workspace.id,
                      {
                        customerName: name,
                        phone,
                        date,
                        time,
                        channel,
                        sessionId: params.sessionId
                      }
                    );

                  // Optional Google Sheets synchronization.
                  if (
                    workspace.googleSheetsAccessToken &&
                    workspace.crmSpreadsheetId
                  ) {
                    try {
                      await bookAppointmentInSheet(
                        workspace.googleSheetsAccessToken,
                        workspace.crmSpreadsheetId,
                        date,
                        time,
                        name,
                        phone
                      );
                    } catch (sheetError) {
                      console.warn(
                        "[FOX CRM] Google Sheets sync failed; Firestore booking remains saved.",
                        sheetError
                      );
                    }
                  }

                  // Optional external CRM / n8n webhook.
                  if (workspace.externalCrmWebhookUrl) {
                    try {
                      triggerExternalCRM(
                        workspace.id,
                        "booking",
                        {
                          appointment,
                          lead,
                          date,
                          time,
                          name,
                          phone,
                          channel
                        },
                        workspace.externalCrmWebhookUrl
                      );
                    } catch (webhookError) {
                      console.warn(
                        "[FOX CRM] External CRM webhook failed; Firestore booking remains saved.",
                        webhookError
                      );
                    }
                  }

                  await markBookingConversion(
                    workspace.id,
                    lead,
                    appointment,
                    name,
                    phone
                  );

                  console.log(
                    `[FOX CRM] Appointment saved | Workspace=${workspace.id} | Customer=${name} | ${date} ${time}`
                  );

                  functionResult = {
                    success: true,
                    appointmentId: appointment.id,
                    leadId: lead.id,
                    message:
                      "Appointment booked successfully in FOX CRM."
                  };
                }

              } else if (call.name === "recordSale") {
                const { itemName, price, customerName, customerPhone } = call.args as any;
                // Log the sale to external CRM or Webhook if provided
                triggerExternalCRM(workspace.id, "sale", { itemName, price, customerName, customerPhone }, workspace.externalCrmWebhookUrl);
                functionResult = { success: true, message: "Sale recorded successfully." };
              }
            } catch (err: any) {
              functionResult = { error: err.message };
            }
            
            // =====================================================
            // IMPORTANT: Preserve Gemini's original model content.
            // Gemini 3 function calls can contain thoughtSignature.
            // Rebuilding the functionCall manually strips that signature
            // and causes HTTP 400 on the follow-up request.
            // =====================================================

            const originalModelContent =
              response?.candidates?.[0]?.content;

            if (!originalModelContent?.parts?.length) {
              throw new Error(
                "Gemini function call returned without original model content"
              );
            }

            // Push the ORIGINAL model response exactly as Gemini returned it.
            // This preserves functionCall + thoughtSignature.
            formattedContents.push(originalModelContent);

            // Then provide our tool result.
            formattedContents.push({
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: functionResult
                  }
                }
              ]
            });

            response = await ai.models.generateContent({
              model,
              contents: formattedContents,
              config: {
                systemInstruction,
                temperature: 0.3,
                tools: undefined
              }
            });
          }
          
          usedModel = model;

          void aiModelAnalyticsService.recordUsage({
            workspaceId: workspace.id,
            provider: "gemini",
            requestedModel: model,
            servedModel: model,
            agentRole,
            channel,
            toolsEnabled: false,
            fallbackUsed: true,
            status: "success",
            latencyMs:
              Date.now() -
              foxGeminiStartedAt,
          });
          
          // Append AI response to shared memory
          if (params.sessionId && workspace.id) {
            await sharedMemoryService.appendMessage(workspace.id, params.sessionId, {
              sender: "bot",
              text: response.text || "...",
              time: new Date().toISOString(),
              agentRole
            });
          }
          
          break; // success
        } catch (e: any) {
          lastError = e;

          void aiModelAnalyticsService.recordUsage({
            workspaceId: workspace.id,
            provider: "gemini",
            requestedModel: model,
            servedModel: model,
            agentRole,
            channel,
            toolsEnabled: false,
            fallbackUsed: true,
            status: "failure",
            latencyMs:
              Date.now() -
              foxGeminiStartedAt,
            errorType:
              e?.name ||
              "GeminiError",
            errorMessage:
              e?.message ||
              String(e),
          });

          console.warn(
            `AiAgentService: Model ${model} failed: ${e?.message || e}. Trying next...`
          );

          continue; // try next
        }
      }

      if (!response) {
        throw lastError; // if all failed
      }

      const aiText =
        response.text ||
        (messageLang === "ar"
          ? `شكراً لتواصلك معنا في ${workspace.name || "النشاط التجاري"}. كيف يمكنني مساعدتك؟`
          : `Thank you for reaching out to ${workspace.name || "Business"}. How may I help you?`);

      return {
        response: aiText,
        aiResponse: aiText,
        detectedLanguage: messageLang,
        source: usedModel,
        suggestedActions:
          messageLang === "ar"
            ? ["حجز موعد", "التأكد من المواعيد المتاحة", "التحدث مع موظف"]
            : ["Book Appointment", "Check Availability", "Speak to Human Agent"],
      };
    } catch (err: any) {
      console.error("AiAgentService Error:", err);
      const isAr = messageLang === "ar";
      const fallbackMsg =
        workspace.aiSettings?.fallbackMessage ||
        (isAr
          ? "شكراً لتواصلك معنا! جاري تحويل طلبك لأحد موظفي خدمة العملاء للتأكيد والمتابعة."
          : "Thank you for reaching out! Your request is being forwarded to our support staff.");

      return {
        response: fallbackMsg,
        aiResponse: fallbackMsg,
        detectedLanguage: messageLang,
        source: "error_fallback",
        suggestedActions: isAr ? ["التحدث مع موظف"] : ["Speak to Staff"],
      };
    }
  }
}

export const aiAgentService = new AiAgentService();
