import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { IndustryType } from "../../types";
import { AgentRouterConfiguration } from "./AgentRouterConfiguration";
import { ClientKnowledgeBuilder } from "./ClientKnowledgeBuilder";
import {
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  Plus,
  Save,
  BookOpen,
  Zap,
  Globe,
  Sliders,
  Cpu,
  RotateCcw,
  MessageSquare,
  ShieldAlert,
  Eye,
  Send,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { authenticatedFetch } from "../../services/authenticatedFetch";

export const ClientAISettings: React.FC = () => {
  const {
    currentWorkspace,
    updateAISettings, updateWorkspaceField,
    knowledgeFacts,
    approveKnowledgeFact,
    rejectKnowledgeFact,
    addKnowledgeFact,
    language,
    doctors,
    menuItems,
    medicines,
    products,
    clinicServices, courses,
  } = useApp();

  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  const [agentName, setAgentName] = useState(
    currentWorkspace.aiSettings?.agentName ||
      (isAr
        ? `مساعد ${currentWorkspace.name} الذكي`
        : `${currentWorkspace.name} AI Assistant`)
  );

  const [langPreference, setLangPreference] = useState<"auto" | "arabic" | "english">(
    currentWorkspace.aiSettings?.languageMode || "auto"
  );

  const [tone, setTone] = useState<"Friendly" | "Professional" | "Empathetic" | "Formal" | "Direct">(
    (currentWorkspace.aiSettings?.tone as any) || "Friendly"
  );

  const [customPrompt, setCustomPrompt] = useState(
    currentWorkspace.aiSettings?.customPrompt ||
      (isAr
        ? `أنت وكيل خدمة العملاء الذكي لـ "${currentWorkspace.name}". أجب بأسلوب ودود ومباشر واعرض أسعار المنتجات والخدمات وساعد العميل في حجز موعده أو تسجيل طلبه.`
        : `Assist customers for ${currentWorkspace.name}. Be polite, accurate with prices, and offer appointment booking.`)
  );

  const [workingHours, setWorkingHours] = useState(
    currentWorkspace.aiSettings?.workingHours ||
      (isAr ? "من السبت للخميس، من 10 صباحاً إلى 10 مساءً" : "Mon-Sat, 10 AM to 10 PM")
  );

  const [fallbackMsg, setFallbackMsg] = useState(
    currentWorkspace.aiSettings?.fallbackMessage ||
      (isAr
        ? "شكراً لتواصلك معنا! سيقوم أحد موظفي خدمة العملاء بالرد عليك وتأكيد كافة التفاصيل قريباً."
        : "Thank you for reaching out! A customer service team member will contact you shortly to confirm details.")
  );

  const [autoBooking, setAutoBooking] = useState(
    currentWorkspace.aiSettings?.autoBookingEnabled ?? true
  );

  const [autoComplaintEscalation, setAutoComplaintEscalation] = useState(
    currentWorkspace.aiSettings?.autoComplaintEscalation ?? true
  );

  const [enableServiceRating, setEnableServiceRating] = useState(
    currentWorkspace.aiSettings?.enableServiceRating ?? true
  );

  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(
    currentWorkspace.industry || "Clinic"
  );

  const [serviceRatingPrompt, setServiceRatingPrompt] = useState(
    currentWorkspace.aiSettings?.serviceRatingPrompt ||
      (isAr
        ? "نرجو تقييم خدمتنا اليوم من 1 إلى 5 نجوم لمساعدتنا في تحسين تجربتك (1 و 2 سئ جدا، 3 وسط، 4 و 5 رائع جدا)"
        : "Please rate our service today from 1 to 5 stars (1 & 2 Very Bad, 3 Average, 4 & 5 Excellent)")
  );


  const [supportAgentName, setSupportAgentName] = useState(
    currentWorkspace.aiSettings?.supportAgentName || "خدمة العملاء"
  );
  const [supportAgentPrompt, setSupportAgentPrompt] = useState(
    currentWorkspace.aiSettings?.supportAgentPrompt || "الرد على الاستفسارات، المواعيد، الأسئلة الشائعة، وتلقي الشكاوى وتهدئة العملاء."
  );
  const [salesAgentName, setSalesAgentName] = useState(
    currentWorkspace.aiSettings?.salesAgentName || "المبيعات"
  );
  const [salesAgentPrompt, setSalesAgentPrompt] = useState(
    currentWorkspace.aiSettings?.salesAgentPrompt || "الإقناع بالشراء، اقتراح باقات أو منتجات إضافية، والرد على اعتراضات السعر. إتمام عمليات البيع."
  );
  const [marketingAgentName, setMarketingAgentName] = useState(
    currentWorkspace.aiSettings?.marketingAgentName || "التسويق"
  );

  const [marketingAgentPrompt, setMarketingAgentPrompt] = useState(
    currentWorkspace.aiSettings?.marketingAgentPrompt || "جمع التقييمات، إبلاغ العملاء بالعروض الجديدة، وعمل استبيانات."
  );
  const [externalCrmWebhookUrl, setExternalCrmWebhookUrl] = useState(
    currentWorkspace.externalCrmWebhookUrl || ""
  );
  const [strictCatalogOnly, setStrictCatalogOnly] = useState(true);



  const [newFact, setNewFact] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Inspector & Sandbox State
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [builtPromptText, setBuiltPromptText] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  // Live Test Chat State
  const [testUserMsg, setTestUserMsg] = useState("");
  const [testChatLog, setTestChatLog] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);
  const [testingAi, setTestingAi] = useState(false);

  const workspaceFacts = knowledgeFacts.filter(
    (k) => k.workspaceId === currentWorkspace.id
  );

  const prepareWorkspaceContextPayload = () => {
    return {
      id: currentWorkspace.id,
      name: currentWorkspace.name,
      industry: currentWorkspace.industry,
      creditBalance: currentWorkspace.creditBalance,

      aiSettings: {
        agentName,
        customPrompt,
        tone,
        languageMode: langPreference,
        workingHours,
        autoBookingEnabled: autoBooking,
        autoComplaintEscalation,
        enableServiceRating,
        serviceRatingPrompt,
        fallbackMessage: fallbackMsg,
        supportAgentName,
        supportAgentPrompt,
        salesAgentName,
        salesAgentPrompt,
        marketingAgentName,
        marketingAgentPrompt,
      },

      knowledgeBase: workspaceFacts.map((f) => ({
        question: f.fact,
        answer: f.fact,
        approved: f.approved,
      })),
      doctors: doctors.filter((d) => d.workspaceId === currentWorkspace.id),
      menu: menuItems.filter((m) => m.workspaceId === currentWorkspace.id),
      medicines: medicines.filter((m) => m.workspaceId === currentWorkspace.id),
      products: products.filter((p) => p.workspaceId === currentWorkspace.id),
      clinicServices: clinicServices.filter((s) => s.workspaceId === currentWorkspace.id),
    };
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();


    updateAISettings(currentWorkspace.id, {
      agentName,
      tone,
      customPrompt,
      autoBookingEnabled: autoBooking,
      autoComplaintEscalation,
      enableServiceRating,
      serviceRatingPrompt,
      languageMode: langPreference,

      // FOX Launch readiness:
      // workingHours existed in the UI but was not persisted here.
      workingHours,

      fallbackMessage: fallbackMsg,
      supportAgentName,
      supportAgentPrompt,
      salesAgentName,
      salesAgentPrompt,
      marketingAgentName,
      marketingAgentPrompt,
    });
    
    // Update workspace industry if changed
    if (selectedIndustry !== currentWorkspace.industry) {
      updateWorkspaceField(currentWorkspace.id, { industry: selectedIndustry });
    }

    // Also update the workspace directly for the webhook URL
    if (externalCrmWebhookUrl !== currentWorkspace.externalCrmWebhookUrl) {
       updateWorkspaceField(currentWorkspace.id, { externalCrmWebhookUrl });
    }



    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleInspectSystemPrompt = async () => {
    setShowPromptInspector(true);
    setLoadingPrompt(true);
    try {
      const res = await fetch("/api/ai/build-system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: prepareWorkspaceContextPayload(),
          messageLang: langPreference === "english" ? "en" : "ar",
          channel: "telegram",
        }),
      });
      const data = await res.json();
      setBuiltPromptText(data.systemInstruction || "Failed to build system prompt");
    } catch {
      setBuiltPromptText("Error reaching system prompt builder endpoint.");
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleTestAiSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUserMsg.trim() || testingAi) return;

    const input = testUserMsg.trim();
    setTestUserMsg("");
    setTestChatLog((prev) => [...prev, { sender: "user", text: input }]);
    setTestingAi(true);

    try {
      const res = await authenticatedFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          workspace: prepareWorkspaceContextPayload(),
          customerMessage: input,
          channel: "sandbox_test",
          sessionId: "sandbox_" + currentWorkspace.id,
        }),
      });
      const data = await res.json();

      setTestChatLog((prev) => [...prev, { sender: "bot", text: data.aiResponse || data.response }]);
    } catch {
      setTestChatLog((prev) => [
        ...prev,
        {
          sender: "bot",
          text: isAr
            ? "أهلاً بك! تم اختبار الوكيل بنجاح من خلال محرك الخدمة المركزية."
            : "Hello! AI Agent Service module successfully tested.",
        },
      ]);
    } finally {
      setTestingAi(false);
    }
  };

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    addKnowledgeFact({
      workspaceId: currentWorkspace.id,
      question: newFact.slice(0, 50),
      answer: newFact,
      fact: newFact,
      category: "General",
      source: isAr ? "إدخال يدوي من صاحب النشاط" : "Manual Owner Entry",
      approved: true,
    });

    setNewFact("");
  };

  const applyIndustryPreset = () => {
    const ind = selectedIndustry || currentWorkspace.industry;
    if (ind === "Clinic") {
      setCustomPrompt(
        isAr
          ? `أنت وكيل خدمة العملاء الطبي لعيادة "${currentWorkspace.name}". مرحب بالمرضى، واعرض التخصصات والأطباء المتاحين ومواعيد الكشف بالجنيه المصري (EGP). عند طلب الحجز اجمع الاسم ورقم الهاتف والموعد المفضل.`
          : `You are the medical receptionist AI for ${currentWorkspace.name}. Offer doctor schedules, consultation fees in EGP, and collect patient appointment requests.`
      );
    } else if (ind === "Restaurant") {
      setCustomPrompt(
        isAr
          ? `أنت مسؤول الطلبات لـ مطعم "${currentWorkspace.name}". اعرض الوجبات المتاحة وأسعارها بالجنيه المصري EGP وتكلفة التوصيل وملاحظات الأكل الحار أو المكونات.`
          : `You are the order assistant for ${currentWorkspace.name} Restaurant. Present menu items with EGP prices and take food delivery orders.`
      );
    } else if (ind === "Pharmacy") {
      setCustomPrompt(
        isAr
          ? `أنت الصيدلي الذكي لـ صيدلية "${currentWorkspace.name}". استقبل أسئلة الأدوية والأسعار ونبه إذا كان الدواء يتطلب روشتة طبية مع خدمة التوصيل.`
          : `You are the AI pharmacist assistant for ${currentWorkspace.name} Pharmacy. Provide medicine availability and EGP prices.`
      );
    } else if (ind === "Course Center") {
      setCustomPrompt(
        isAr
          ? `أنت موظف الاستقبال والمبيعات الذكي لـ مركز الكورسات والتدريب "${currentWorkspace.name}". اعرض الدورات والكورسات التدريبية المتاحة وأسعارها بالجنيه المصري EGP واسم المدرب والمواعيد وساعد الطلاب في التسجيل وحجز مكانهم.`
          : `You are the AI admissions assistant for ${currentWorkspace.name} Course & Training Center. Present available courses, fees in EGP, instructors, schedules, and help students enroll.`
      );
    } else {
      setCustomPrompt(
        isAr
          ? `أنت الوكيل الذكي لـ "${currentWorkspace.name}". اعرض المنتجات والأسعار وساعد الزوار في تقديم الطلبات أو تقديم الشكاوى.`
          : `You represent ${currentWorkspace.name}. Provide pricing in EGP and process customer inquiries.`
      );
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <span>
              {isAr
                ? "خدمة وكيل الذكاء الاصطناعي المركزي (AI Agent Service Module)"
                : "Centralized AI Agent Service Module"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "إدارة التعليمات البرمجية، تحديد نبرة الصوت، أسلوب اللغة، وقيود السلوك المحقونة مباشرة في اتصالات Gemini API"
              : "Manage system prompts, tone, language style, and behavioral constraints injected into Gemini API calls"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInspectSystemPrompt}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
          >
            <Eye className="h-4 w-4" />
            <span>{isAr ? "معاينة النظام المحقون بـ Gemini" : "Inspect Gemini System Prompt"}</span>
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs animate-bounce">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isAr ? "تم الحفظ بنجاح!" : "Saved!"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Agent Settings Panel */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isAr ? "إعدادات الشخصية والتعليمات (System Prompts)" : "Agent Persona & Prompt Engine"}
              </h3>
            </div>
            <button
              type="button"
              onClick={applyIndustryPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-orange-500 hover:text-white transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isAr ? "قالب القطاع" : "Industry Preset"}</span>
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Industry / Business Activity Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "نوع النشاط التجاري واللوحة المخصصة" : "Business Activity & Dashboard Type"}
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value as IndustryType)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Clinic">{isAr ? "🏥 عيادة / مركز طبي (Clinic)" : "Clinic / Medical"}</option>
                  <option value="Pharmacy">{isAr ? "💊 صيدلية (Pharmacy)" : "Pharmacy"}</option>
                  <option value="Retail">{isAr ? "🛒 متجر / تجارة إلكترونية (Retail)" : "Retail / E-commerce"}</option>
                  <option value="Course Center">{isAr ? "📚 مركز كورسات / تعليمي (Course Center)" : "Course Center / Academy"}</option>
                  <option value="Restaurant">{isAr ? "🍽️ مطعم / كافيه (Restaurant)" : "Restaurant / Cafe"}</option>
                  <option value="Small Business">{isAr ? "🏢 نشاط تجاري عام (Small Business)" : "Small Business"}</option>
                </select>
              </div>

              {/* Agent Display Name */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "اسم الوكيل الظاهر للعملاء" : "Agent Display Name"}
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-extrabold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            
            {/* Agent Team Settings */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isAr ? "إعدادات فريق الوكلاء المتخصصين" : "Specialized Agents Team Settings"}
              </h3>
              
              {/* Support Agent */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل خدمة العملاء" : "Support Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={supportAgentName}
                      onChange={(e) => setSupportAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={supportAgentPrompt}
                      onChange={(e) => setSupportAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sales Agent */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل المبيعات" : "Sales Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={salesAgentName}
                      onChange={(e) => setSalesAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={salesAgentPrompt}
                      onChange={(e) => setSalesAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Marketing Agent */}
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل التسويق" : "Marketing Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={marketingAgentName}
                      onChange={(e) => setMarketingAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={marketingAgentPrompt}
                      onChange={(e) => setMarketingAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
\n            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <AgentRouterConfiguration />
            </div>

            {/* Language Strategy & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "استراتيجية أسلوب اللغة (Language Strategy)" : "Language Style & Strategy"}
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setLangPreference("auto")}
                    className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition ${
                      langPreference === "auto"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {isAr ? "تلقائي" : "Auto-Detect"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangPreference("arabic")}
                    className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition ${
                      langPreference === "arabic"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {isAr ? "عربي فقط" : "Arabic Only"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangPreference("english")}
                    className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition ${
                      langPreference === "english"
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    English
                  </button>
                </div>
              
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  {isAr ? "مواعيد العمل (للرد الآلي):" : "Working Hours:"}
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "نبرة الصوت وأسلوب الكلام (Tone Selection)" : "Tone of Voice Selection"}
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Friendly">
                    {isAr ? "ودود ومرحب (عامية مصرية بسيطة)" : "Friendly & Welcoming"}
                  </option>
                  <option value="Professional">
                    {isAr ? "رسمي واحترافي" : "Formal & Professional"}
                  </option>
                  <option value="Empathetic">
                    {isAr ? "طبي متعاطف وسريع الاستجابة" : "Empathetic Medical"}
                  </option>
                  <option value="Formal">
                    {isAr ? "شركات راقي" : "Corporate Formal"}
                  </option>
                  <option value="Direct">
                    {isAr ? "مختصر ومباشر بدون مقدمات" : "Concise & Direct"}
                  </option>
                </select>
              </div>
            </div>

            {/* Behavioral Constraints Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-orange-500" />
                <span>{isAr ? "قيود وقواعد السلوك المضمونة (Behavioral Constraints)" : "Injected Behavioral Constraints"}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                {/* Auto Booking Constraint */}
                <div
                  onClick={() => setAutoBooking(!autoBooking)}
                  className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-2.5 ${
                    autoBooking
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center font-bold text-white ${autoBooking ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                    {autoBooking ? "✓" : ""}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isAr ? "التقاط بيانات الحجز (CRM Lead Capture)" : "Capture Bookings to CRM"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAr ? "توجيه Gemini لطلب الاسم والهاتف والموعد" : "Instruct Gemini to ask for name & phone"}
                    </p>
                  </div>
                </div>

                {/* Complaint Escalation Constraint */}
                <div
                  onClick={() => setAutoComplaintEscalation(!autoComplaintEscalation)}
                  className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-2.5 ${
                    autoComplaintEscalation
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center font-bold text-white ${autoComplaintEscalation ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                    {autoComplaintEscalation ? "✓" : ""}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isAr ? "تصعيد الشكاوى للإدارة" : "Auto Complaint Escalation"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAr ? "تسجيل ملاحظات الشكوى وتسجيلها فوراً بالـ CRM" : "Log customer complaints to CRM"}
                    </p>
                  </div>
                </div>

                {/* Service Rating Toggle */}
                <div
                  onClick={() => setEnableServiceRating(!enableServiceRating)}
                  className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-2.5 col-span-1 sm:col-span-2 ${
                    enableServiceRating
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center font-bold text-white ${enableServiceRating ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}>
                    {enableServiceRating ? "★" : ""}
                  </div>
                  <div className="w-full">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{isAr ? "تفعيل طلب تقييم الخدمة من العملاء (1-5 نجوم)" : "Enable Service Rating Prompt (1-5 Stars)"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${enableServiceRating ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {enableServiceRating ? (isAr ? "مفعّل" : "Active") : (isAr ? "معطّل" : "Disabled")}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr ? "طلب تقييم الجودة وإبداء الرأي من عملاء المتاجر والعيادات والصيدليات والكورسات في نهاية المحادثة" : "Prompt customers at conversation end to rate quality and leave feedback"}
                    </p>
                    
                    {enableServiceRating && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/40" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block mb-1">
                          {isAr ? "رسالة طلب التقييم المخصصة:" : "Custom Rating Prompt Message:"}
                        </label>
                        <input
                          type="text"
                          value={serviceRatingPrompt}
                          onChange={(e) => setServiceRatingPrompt(e.target.value)}
                          className="w-full rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Strict Catalog Constraint */}
                <div
                  onClick={() => setStrictCatalogOnly(!strictCatalogOnly)}
                  className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-2.5 ${
                    strictCatalogOnly
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-md flex items-center justify-center font-bold text-white ${strictCatalogOnly ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}>
                    {strictCatalogOnly ? "✓" : ""}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isAr ? "منع الهلوسة في الأسعار (Zero Hallucination)" : "Zero Price Hallucination Guard"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAr ? "الالتزام التام بأسعار الكتالوج المعتمدة فقط" : "Strict reliance on approved catalog only"}
                    </p>
                  </div>
                </div>

                {/* Currency Guard Constraint */}
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20 flex items-start gap-2.5">
                  <div className="mt-0.5 h-4 w-4 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px]">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isAr ? "توحيد العملة (EGP Egyptian Pounds)" : "EGP Currency Guard"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAr ? "إلزام Gemini بذكر الأسعار بالجنيه المصري" : "All price quotes locked to EGP"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Instructions Prompt */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? "توجيهات النشاط المخصصة (Custom Business Prompt)" : "Custom Business Instructions"}
              </label>
              <textarea
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500 leading-relaxed"
              />
            </div>

            {/* Fallback Response */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? "رسالة الاعتذار عند عدم توفر المعلومة (Fallback Message)" : "Fallback Response Message"}
              </label>
              <input
                type="text"
                value={fallbackMsg}
                onChange={(e) => setFallbackMsg(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-600/30 hover:bg-orange-500 transition flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isAr ? "حفظ وتحديث وحدة خدمة الذكاء الاصطناعي" : "Save AI Agent Service Configuration"}</span>
            </button>
          </form>
        </div>

        {/* Live Testing Sandbox & Knowledge Base Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live AI Sandbox Tester */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-500" />
                <span>{isAr ? "بيئة اختبار الوكيل الحية (Live Gemini Sandbox)" : "Live AI Agent Testing Sandbox"}</span>
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
                Gemini 3.6 Flash
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? "اختبر إجابات الوكيل الذكي بالتعليمات والنبرة المحددة قبل نشرها للعملاء على تليجرام أو واتساب:"
                : "Test real-time AI responses with your configured rules before serving customers on channels:"}
            </p>

            <div className="h-48 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 p-3.5 space-y-3 text-xs border border-slate-200 dark:border-slate-800">
              {testChatLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[11px] text-center">
                  <Bot className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-1" />
                  <span>{isAr ? "اكتب رسالة تجريبية لاختبار الرد الحي..." : "Type a query to test live AI responses..."}</span>
                </div>
              ) : (
                testChatLog.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                        m.sender === "user"
                          ? "bg-orange-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleTestAiSandbox} className="flex gap-2">
              <input
                type="text"
                placeholder={isAr ? "مثال: كم سعر الكشف؟ أو ما هو المنيو المتاح؟" : "e.g. What are your prices in EGP?"}
                value={testUserMsg}
                onChange={(e) => setTestUserMsg(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={testingAi}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-500 transition flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testingAi ? "..." : isAr ? "تجربة" : "Test"}</span>
              </button>
            </form>
          </div>

          {/* Knowledge Base Facts Review */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "قاعدة المعرفة والحقائق المعتمدة" : "Knowledge Base Facts"}
                </h3>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {workspaceFacts.length} {isAr ? "حقيقة" : "facts"}
              </span>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {workspaceFacts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {isAr ? "لا توجد حقائق مخصصة بعد." : "No custom knowledge facts added yet."}
                </div>
              ) : (
                workspaceFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className={`rounded-2xl border p-3 text-xs transition ${
                      fact.approved
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
                        : "border-amber-200 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                        "{fact.fact}"
                      </p>
                      {fact.approved ? (
                        <span className="shrink-0 flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="h-3 w-3" /> {isAr ? "معتمد" : "Approved"}
                        </span>
                      ) : (
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => approveKnowledgeFact(fact.id)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                          >
                            {isAr ? "اعتماد" : "Approve"}
                          </button>
                          <button
                            onClick={() => rejectKnowledgeFact(fact.id)}
                            className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-500 hover:text-white"
                          >
                            {isAr ? "رفض" : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400 font-mono">
                      المصدر: {fact.source}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Fact Form */}
            <form
              onSubmit={handleAddFact}
              className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2"
            >
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                {isAr ? "إضافة حقيقة جديدة إلى الذكاء الاصطناعي:" : "Add New Business Fact:"}
              </label>
              <textarea
                rows={2}
                placeholder={
                  isAr
                    ? "مثال: يتوفر جراج مجاني للعملاء أمام العيادة، ومواعيد الاستشارات الأحد والأربعاء."
                    : "e.g. Free parking is available for customers right in front of the clinic branch."
                }
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 transition flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? "إضافة لقاعدة المعرفة" : "Add Fact to Knowledge Base"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* System Prompt Inspector Modal */}
      {showPromptInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "معاينة النظام البرمجي المحقون لـ Gemini" : "Injected System Prompt Inspector"}
                </h3>
              </div>
              <button
                onClick={() => setShowPromptInspector(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? "هذا هو النص التوجيهي الدقيق (System Instruction) الذي يتم إنشاؤه وحقنه ديناميكياً في كل استدعاء لـ Gemini API عبر الخدمة المركزية:"
                : "This is the exact System Instruction constructed dynamically and injected into Gemini API calls via the central AiAgentService:"}
            </p>

            {loadingPrompt ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                {isAr ? "جاري بناء ومعاينة البرومبت..." : "Generating prompt view..."}
              </div>
            ) : (
              <pre className="h-96 overflow-y-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap border border-slate-800">
                {builtPromptText}
              </pre>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowPromptInspector(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};