import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PackageRecommendation } from "./PackageRecommendation";
import { ClientAnalyticsDashboard } from "./ClientAnalyticsDashboard";
import {
  HelpCircle,
  AlertCircle,
  ChevronRight,
  Users,
  Calendar,
  MessageSquareWarning,
  Bot,
  Zap,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  Building2,
  Key,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Send,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const ClientDashboard: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const {
    currentWorkspace,
    addKnowledgeFact,
    plans,
    activationCodes,
    crmLeads,
    appointments,
    complaints,
    knowledgeFacts,
    redeemActivationCode,
    updateTelegramBotToken,

    // FOX LAUNCH ONBOARDING V1
    updateWorkspaceField,
    updateAISettings,

    addToast,
    language,
  } = useApp();

  const isAr = language === "ar";

  const [unansweredFAQs, setUnansweredFAQs] = useState([
    { id: 1, question: isAr ? "هل يوجد خصم للطلاب؟" : "Is there a student discount?", category: "Pricing", count: 12 },
    { id: 2, question: isAr ? "مواعيد العمل في شهر رمضان؟" : "Working hours during Ramadan?", category: "Working Hours", count: 8 },
    { id: 3, question: isAr ? "هل تقبلون الدفع بالتقسيط؟" : "Do you accept installments?", category: "Payments", count: 5 },
  ]);
  const [replyFormId, setReplyFormId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleAddAnswer = (q: any) => {
    if (!replyText.trim()) return;
    addKnowledgeFact({
      workspaceId: currentWorkspace!.id,
      question: q.question,
      answer: replyText,
      category: q.category,
      approved: true,
      source: "manual"
    });
    setUnansweredFAQs(prev => prev.filter(item => item.id !== q.id));
    setReplyFormId(null);
    setReplyText("");
  };


  if (!currentWorkspace) return null;

  // Local state for quick activation code & telegram token widgets
  const [activationCodeInput, setActivationCodeInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [telegramToken, setTelegramToken] = useState("");
  const [telegramBotName, setTelegramBotName] = useState(
    currentWorkspace.telegramBotName || `@${(currentWorkspace.name || "fox_agent").toLowerCase().replace(/\s+/g, "_")}_bot`
  );
  const [showToken, setShowToken] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // =========================================================
  // FOX LAUNCH ONBOARDING V1
  // =========================================================

  const [onboardingAgentName, setOnboardingAgentName] =
    useState(
      currentWorkspace.aiSettings?.agentName ||
      `${currentWorkspace.name} AI Assistant`
    );

  const [onboardingWorkingHours, setOnboardingWorkingHours] =
    useState(
      currentWorkspace.aiSettings?.workingHours || ""
    );

  const [onboardingBusinessDescription, setOnboardingBusinessDescription] =
    useState(
      currentWorkspace.businessDescription || ""
    );

  const [onboardingTelegramToken, setOnboardingTelegramToken] =
    useState("");

  const [onboardingTelegramBotName, setOnboardingTelegramBotName] =
    useState(
      currentWorkspace.telegramBotName ||
      `@${(currentWorkspace.name || "fox_agent")
        .toLowerCase()
        .replace(/\s+/g, "_")}_bot`
    );

  const [onboardingTelegramSaving, setOnboardingTelegramSaving] =
    useState(false);

  // Legacy tenants created before Launch Onboarding V1 do not
  // get blocked. Only new workspaces explicitly carrying
  // onboardingCompleted=false enter the wizard.
  const launchOnboardingRequired =
    currentWorkspace.onboardingCompleted === false;

  // Filtered dataset for current workspace
  const workspaceLeads = crmLeads.filter((l) => l.workspaceId === currentWorkspace.id);
  const workspaceApts = appointments.filter((a) => a.workspaceId === currentWorkspace.id);
  const workspaceCmps = complaints.filter((c) => c.workspaceId === currentWorkspace.id);
  const pendingFacts = knowledgeFacts.filter(
    (k) => k.workspaceId === currentWorkspace.id && !k.approved
  );

  // Active plan details
  const currentPlan = plans.find((p) => p.id === currentWorkspace.planId) || plans[0];
  const myRedeemedCodes = activationCodes.filter(
    (c) => c.usedByWorkspaceId === currentWorkspace.id || c.code === activationCodeInput.trim()
  );

  const isTelegramConnected =
    currentWorkspace.telegramBotStatus === "connected";

  // Usage limits calculation
  const limit = currentPlan.aiConversationLimit;
  const used = currentWorkspace.aiConversationsUsed || 0;
  const creditBalance = currentWorkspace.creditBalance ?? 0;
  const isOutOfCredits = creditBalance <= 0;
  const usagePercentage = limit === -1 ? 15 : Math.min(Math.round((used / limit) * 100), 100);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCodeInput.trim()) {
      addToast(
        isAr
          ? "يرجى إدخال كود التفعيل"
          : "Please enter an activation code",
        "error"
      );

      return;
    }

    setIsRedeeming(true);

    try {
      const success =
        await redeemActivationCode(
          currentWorkspace.id,
          activationCodeInput.trim()
        );

      if (success) {
        setActivationCodeInput("");
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSaveTelegramToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramToken.trim()) {
      addToast(
        isAr ? "يرجى إدخال Token تليجرام" : "Please enter a valid Telegram Bot Token",
        "error"
      );
      return;
    }
    setIsSavingToken(true);
    setTimeout(() => {
      updateTelegramBotToken(currentWorkspace.id, telegramToken.trim(), telegramBotName.trim());
      setIsSavingToken(false);
    }, 600);
  };

  // =========================================================
  // FOX LAUNCH ONBOARDING ACTIONS
  // =========================================================

  const handleOnboardingSaveBusinessAI = () => {
    if (!onboardingAgentName.trim()) {
      addToast(
        isAr
          ? "اكتب اسم المساعد الذكي أولاً"
          : "Please enter the AI assistant name",
        "error"
      );
      return;
    }

    if (!onboardingWorkingHours.trim()) {
      addToast(
        isAr
          ? "اكتب مواعيد العمل أولاً"
          : "Please enter your working hours",
        "error"
      );
      return;
    }

    updateAISettings(currentWorkspace.id, {
      ...(currentWorkspace.aiSettings || {}),
      agentName: onboardingAgentName.trim(),
      workingHours: onboardingWorkingHours.trim(),

      customPrompt:
        currentWorkspace.aiSettings?.customPrompt ||
        (
          onboardingBusinessDescription.trim()
            ? `Represent ${currentWorkspace.name}. Business description: ${onboardingBusinessDescription.trim()}. Only use approved business data, catalog and knowledge base.`
            : `Assist customers for ${currentWorkspace.name}. Only use approved business data, catalog and knowledge base.`
        ),
    });

    updateWorkspaceField(
      currentWorkspace.id,
      {
        businessDescription:
          onboardingBusinessDescription.trim(),

        onboardingAiReady: true,
        onboardingStep: 2,
      } as any
    );

    addToast(
      isAr
        ? "تم حفظ بيانات النشاط وإعداد المساعد"
        : "Business and AI setup saved",
      "success"
    );
  };


  const handleOnboardingCatalogReady = () => {
    updateWorkspaceField(
      currentWorkspace.id,
      {
        onboardingCatalogReady: true,
        onboardingStep: 3,
      } as any
    );

    addToast(
      isAr
        ? "تم تأكيد تجهيز بيانات النشاط"
        : "Business catalog marked as ready",
      "success"
    );
  };


  const handleOnboardingTelegramConnect = async () => {
    if (!onboardingTelegramToken.trim()) {
      addToast(
        isAr
          ? "أدخل Telegram Bot Token أولاً"
          : "Enter your Telegram Bot Token first",
        "error"
      );
      return;
    }

    try {
      setOnboardingTelegramSaving(true);

      await updateTelegramBotToken(
        currentWorkspace.id,
        onboardingTelegramToken.trim(),
        onboardingTelegramBotName.trim()
      );

      updateWorkspaceField(
        currentWorkspace.id,
        {
          onboardingStep: 4,
        } as any
      );

      setOnboardingTelegramToken("");

      addToast(
        isAr
          ? "تم ربط Telegram بنجاح"
          : "Telegram connected successfully",
        "success"
      );
    } catch (error) {
      console.error(
        "[FOX Launch Onboarding] Telegram:",
        error
      );

      addToast(
        isAr
          ? "تعذر ربط Telegram. راجع الـToken."
          : "Telegram connection failed. Check the token.",
        "error"
      );
    } finally {
      setOnboardingTelegramSaving(false);
    }
  };


  const handleOnboardingGoLive = () => {
    const aiReady =
      Boolean(currentWorkspace.onboardingAiReady);

    const catalogReady =
      Boolean(currentWorkspace.onboardingCatalogReady);

    const telegramReady =
      currentWorkspace.telegramBotStatus === "connected";

    if (!aiReady || !catalogReady || !telegramReady) {
      addToast(
        isAr
          ? "أكمل خطوات الإعداد المطلوبة قبل تشغيل FOX"
          : "Complete the required setup before going live",
        "error"
      );

      return;
    }

    updateWorkspaceField(
      currentWorkspace.id,
      {
        onboardingStatus: "completed",
        onboardingCompleted: true,
        onboardingCompletedAt:
          new Date().toISOString(),
        onboardingStep: 5,
      } as any
    );

    addToast(
      isAr
        ? "🚀 تم تجهيز FOX للعمل مع العملاء!"
        : "🚀 FOX is ready to serve customers!",
      "success"
    );
  };


  const weeklyTraffic = [
    { day: isAr ? "الإثنين" : "Mon", Telegram: 24, WhatsApp: 45 },
    { day: isAr ? "الثلاثاء" : "Tue", Telegram: 30, WhatsApp: 62 },
    { day: isAr ? "الأربعاء" : "Wed", Telegram: 28, WhatsApp: 55 },
    { day: isAr ? "الخميس" : "Thu", Telegram: 42, WhatsApp: 78 },
    { day: isAr ? "الجمعة" : "Fri", Telegram: 50, WhatsApp: 95 },
    { day: isAr ? "السبت" : "Sat", Telegram: 65, WhatsApp: 110 },
    { day: isAr ? "الأحد" : "Sun", Telegram: 38, WhatsApp: 70 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* =====================================================
          FOX LAUNCH ONBOARDING V1
          Only new tenants are required to complete this flow.
          Legacy tenants remain unaffected.
      ====================================================== */}

      {launchOnboardingRequired && (
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/70 shadow-xl overflow-hidden dark:border-orange-500/20 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20">

          {/* Header */}
          <div className="border-b border-orange-100 p-6 sm:p-7 dark:border-orange-500/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                  <Bot className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isAr
                      ? "جهّز FOX لاستقبال عملائك"
                      : "Launch your FOX AI Agent"}
                  </h2>

                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr
                      ? "أكمل الإعداد السريع مرة واحدة، وبعدها يبدأ الوكيل في خدمة عملائك."
                      : "Complete this one-time setup, then your AI agent is ready for customers."}
                  </p>
                </div>
              </div>

              <span className="self-start rounded-full border border-orange-200 bg-orange-100 px-3 py-1.5 text-[10px] font-black uppercase text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400">
                FOX Launch Setup
              </span>
            </div>

            {/* Progress */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[
                {
                  label: isAr ? "النشاط والـAI" : "Business & AI",
                  done: Boolean(currentWorkspace.onboardingAiReady),
                },
                {
                  label: isAr ? "الكتالوج" : "Catalog",
                  done: Boolean(currentWorkspace.onboardingCatalogReady),
                },
                {
                  label: "Telegram",
                  done:
                    currentWorkspace.telegramBotStatus === "connected",
                },
                {
                  label: isAr ? "تشغيل" : "Go Live",
                  done: false,
                },
              ].map((step, index) => (
                <div key={index}>
                  <div
                    className={`h-2 rounded-full ${
                      step.done
                        ? "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />

                  <p
                    className={`mt-1 text-[9px] font-bold ${
                      step.done
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {step.done ? "✓ " : ""}
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>


          <div className="grid gap-5 p-6 lg:grid-cols-2">

            {/* STEP 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />

                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr
                      ? "1. بيانات النشاط والمساعد"
                      : "1. Business & AI"}
                  </h3>
                </div>

                {currentWorkspace.onboardingAiReady && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">
                    {isAr
                      ? "اسم المساعد"
                      : "AI Assistant Name"}
                  </label>

                  <input
                    value={onboardingAgentName}
                    onChange={(e) =>
                      setOnboardingAgentName(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="FOX AI Assistant"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500">
                    {isAr
                      ? "مواعيد العمل"
                      : "Working Hours"}
                  </label>

                  <input
                    value={onboardingWorkingHours}
                    onChange={(e) =>
                      setOnboardingWorkingHours(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={
                      isAr
                        ? "مثال: السبت - الخميس، 10 صباحاً - 10 مساءً"
                        : "Example: Sat-Thu, 10 AM - 10 PM"
                    }
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500">
                    {isAr
                      ? "وصف النشاط"
                      : "Business Description"}
                  </label>

                  <textarea
                    rows={3}
                    value={onboardingBusinessDescription}
                    onChange={(e) =>
                      setOnboardingBusinessDescription(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={
                      isAr
                        ? "اكتب باختصار النشاط والخدمات التي تقدمها..."
                        : "Briefly describe your business and services..."
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOnboardingSaveBusinessAI}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  {currentWorkspace.onboardingAiReady
                    ? isAr
                      ? "✓ تحديث الإعداد"
                      : "✓ Update Setup"
                    : isAr
                    ? "حفظ والمتابعة"
                    : "Save & Continue"}
                </button>
              </div>
            </div>


            {/* STEP 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageRecommendation />

                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr
                      ? "2. جهّز بيانات نشاطك"
                      : "2. Business Catalog"}
                  </h3>
                </div>

                {currentWorkspace.onboardingCatalogReady && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <p className="font-bold">
                  {currentWorkspace.industry === "Clinic"
                    ? isAr
                      ? "أضف الخدمات، الأسعار والأطباء."
                      : "Add services, prices and doctors."
                    : currentWorkspace.industry === "Restaurant"
                    ? isAr
                      ? "أضف قائمة الطعام والأسعار."
                      : "Add menu items and prices."
                    : currentWorkspace.industry === "Pharmacy"
                    ? isAr
                      ? "أضف الأدوية والمنتجات."
                      : "Add medicines and products."
                    : currentWorkspace.industry === "Course Center"
                    ? isAr
                      ? "أضف الكورسات والأسعار."
                      : "Add courses and prices."
                    : isAr
                    ? "أضف المنتجات أو الخدمات والأسعار."
                    : "Add your products, services and prices."}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  {isAr
                    ? "FOX يعتمد على هذه البيانات للرد بدون اختراع أسعار أو خدمات."
                    : "FOX uses this data to answer customers without inventing services or prices."}
                </p>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      "client_industry_module"
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                >
                  {isAr
                    ? "فتح بيانات النشاط"
                    : "Open Business Data"}

                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleOnboardingCatalogReady}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <CheckCircle2 className="h-4 w-4" />

                  {isAr
                    ? "تم تجهيز البيانات"
                    : "Catalog Ready"}
                </button>
              </div>
            </div>


            {/* STEP 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-blue-500" />

                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr
                      ? "3. ربط Telegram"
                      : "3. Connect Telegram"}
                  </h3>
                </div>

                {currentWorkspace.telegramBotStatus === "connected" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              {currentWorkspace.telegramBotStatus === "connected" ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    ✓ Telegram Connected
                  </p>

                  <p className="mt-1 text-[10px] text-emerald-600/80">
                    {currentWorkspace.telegramBotName || "FOX Telegram Bot"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <input
                    type="password"
                    value={onboardingTelegramToken}
                    onChange={(e) =>
                      setOnboardingTelegramToken(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="123456:ABC..."
                  />

                  <input
                    value={onboardingTelegramBotName}
                    onChange={(e) =>
                      setOnboardingTelegramBotName(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="@my_business_bot"
                  />

                  <button
                    type="button"
                    disabled={onboardingTelegramSaving}
                    onClick={handleOnboardingTelegramConnect}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {onboardingTelegramSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    {onboardingTelegramSaving
                      ? isAr
                        ? "جاري التحقق..."
                        : "Verifying..."
                      : isAr
                      ? "ربط البوت"
                      : "Connect Bot"}
                  </button>
                </div>
              )}
            </div>


            {/* STEP 4 */}
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-white dark:border-orange-500/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-400" />

                <h3 className="text-sm font-black">
                  {isAr
                    ? "4. جاهزية التشغيل"
                    : "4. Go Live"}
                </h3>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                {[
                  {
                    label:
                      isAr
                        ? "بيانات النشاط والمساعد"
                        : "Business & AI",
                    ready:
                      Boolean(currentWorkspace.onboardingAiReady),
                  },
                  {
                    label:
                      isAr
                        ? "الخدمات / المنتجات"
                        : "Business Catalog",
                    ready:
                      Boolean(currentWorkspace.onboardingCatalogReady),
                  },
                  {
                    label: "Telegram",
                    ready:
                      currentWorkspace.telegramBotStatus === "connected",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <span className="font-bold text-slate-300">
                      {item.label}
                    </span>

                    {item.ready ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={
                  !currentWorkspace.onboardingAiReady ||
                  !currentWorkspace.onboardingCatalogReady ||
                  currentWorkspace.telegramBotStatus !== "connected"
                }
                onClick={handleOnboardingGoLive}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />

                {isAr
                  ? "🚀 تشغيل FOX واستقبال العملاء"
                  : "🚀 Launch FOX"}
              </button>

              <p className="mt-3 text-center text-[9px] text-slate-500">
                {isAr
                  ? "بعد التشغيل يمكنك تعديل أي إعداد من لوحة التحكم في أي وقت."
                  : "You can change any configuration later from the dashboard."}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Workspace Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 text-xs font-extrabold uppercase">
              {currentWorkspace.industry} Workspace
            </span>
            <span className="rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {currentWorkspace.planId} Plan
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {currentWorkspace.status === "active"
                ? isAr
                  ? "الحساب نشط"
                  : "Active Tenant"
                : isAr
                ? "قيد المراجعة"
                : "Pending Review"}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
            {currentWorkspace.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium flex flex-wrap gap-x-4 gap-y-1">
            <span>👤 {isAr ? "مالك الحساب" : "Owner"}: {currentWorkspace.ownerName}</span>
            <span>📱 {isAr ? "الهاتف" : "Phone"}: {currentWorkspace.phone}</span>
            <span>📧 {currentWorkspace.ownerEmail}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => onNavigate("client_n8n")}
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-2.5 text-xs font-bold hover:bg-amber-500/30 transition"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            {isAr ? "اختبار Webhook n8n" : "Test n8n Webhook"}
          </button>
          <button
            onClick={() => onNavigate("client_live_simulator")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 transition"
          >
            <MessageSquare className="h-4 w-4" />
            {isAr ? "تجربة الوكيل الآلي مباشر" : "Test AI Agent Live"}
          </button>
          <button
            onClick={() => onNavigate("client_subscription")}
            className="flex items-center gap-2 rounded-xl bg-slate-800/90 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
          >
            <Receipt className="h-4 w-4 text-emerald-400" />
            {isAr ? "مركز الاشتراكات وInstapay" : "Instapay & Subscription"}
          </button>
        </div>
      </div>

      {/* SECTION 1: Active Subscription Plan Features Display (عرض مميزات الخطة المشترك بها) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {isAr ? "تفاصيل ومميزات الخطة المشترك بها" : "Current Subscription Plan & Features"}
                </h2>
                <span className="rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-0.5 text-xs font-extrabold uppercase border border-orange-500/20">
                  {currentPlan.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? `ينتهي الاشتراك في: ${new Date(currentWorkspace.subscriptionExpiresAt).toLocaleDateString("ar-EG")}`
                  : `Valid through: ${new Date(currentWorkspace.subscriptionExpiresAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right sm:text-left dir-ltr">
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {currentPlan.priceEGP.toLocaleString()} <span className="text-xs font-bold text-slate-500">EGP</span>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">{currentPlan.duration}</div>
            </div>
            <button
              onClick={() => onNavigate("client_subscription")}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 px-3.5 py-2 text-xs font-extrabold transition border border-orange-500/20"
            >
              <span>{isAr ? "ترقية / تجديد الخطة" : "Upgrade Plan"}</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Plan Usage Progress Bar */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-orange-500" />
              {isAr ? "استهلاك المحادثات الآلية الذكية:" : "AI Conversations Usage:"}
            </span>
            <span className="text-orange-600 dark:text-orange-400 font-mono">
              {used} / {limit === -1 ? (isAr ? "غير محدود" : "Unlimited") : `${limit} ${isAr ? "محادثة" : "chats"}`}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Plan Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {currentPlan.features.map((feat, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {feat}
              </span>
            </div>
          ))}

          {/* Active Channels Badge */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? "القنوات المتاحة:" : "Channels:"}{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                {currentPlan.channels.join(" + ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Quick Control Panel / Keyboard (لوحة الإدارة السريعة لأكواد التفعيل وتوكن تليجرام) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Quick Activation Code Panel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? "تفعيل كود اشتراك جديد" : "Quick Activation Code Redemption"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr
                      ? "أدخل كود التفعيل الممنوح من الدعم الفني أو السوبر أدمين لشحن الباقة فوراً"
                      : "Enter an activation code issued by super admin to instantly top up plan"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRedeemCode} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activationCodeInput}
                  onChange={(e) => setActivationCodeInput(e.target.value)}
                  placeholder={isAr ? "أدخل كود التفعيل" : "Enter activation code"}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-5 py-2.5 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 shrink-0"
                >
                  {isRedeeming ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span>{isAr ? "تفعيل الآن" : "Redeem"}</span>
                </button>
              </div>
            </form>

            {/* Demo Helper Activation Codes */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              
              <div className="flex flex-wrap gap-1.5">
                
              </div>
            </div>
          </div>

          {/* Redeemed History Status */}
          {myRedeemedCodes.length > 0 && (
            <div className="text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl flex items-center justify-between font-medium">
              <span>
                ✓ {isAr ? "تم استخدام كود تفعيل مسجل لمساحة العمل هذه" : "Activation code active on workspace"}
              </span>
              <span className="font-mono font-bold">{myRedeemedCodes[0]?.code}</span>
            </div>
          )}
        </div>

        {/* Quick Telegram Access Token Widget */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? "ربط Telegram Access Token لمساحة العمل" : "Telegram Bot Access Token"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr
                      ? "ربط البوت المباشر لتلقي رسائل العملاء والرد عليها بالذكاء الاصطناعي تلقائياً"
                      : "Link Telegram Bot Token to automate AI client chats for this workspace"}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                  isTelegramConnected
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400"
                }`}
              >
                <Radio className={`h-3 w-3 ${isTelegramConnected ? "animate-pulse" : ""}`} />
                {isTelegramConnected
                  ? isAr
                    ? "مربوط بنجاح"
                    : "Connected"
                  : isAr
                  ? "غير مربوط"
                  : "Disconnected"}
              </span>
            </div>

            <form onSubmit={handleSaveTelegramToken} className="mt-4 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder={isAr ? "HTTP API Token من BotFather" : "Telegram HTTP API Token"}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <input
                  type="text"
                  value={telegramBotName}
                  onChange={(e) => setTelegramBotName(e.target.value)}
                  placeholder="@BotUsername"
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate("client_telegram")}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {isAr ? "إرشادات الحصول على Token عبر @BotFather" : "Detailed Bot Setup Guide"}
                </button>

                <button
                  type="submit"
                  disabled={isSavingToken}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-4 py-2 shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 shrink-0"
                >
                  {isSavingToken ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  <span>{isAr ? "حفظ التوكن" : "Save Token"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-sky-500/5 p-2 rounded-xl border border-sky-500/10">
            🤖 {isAr ? "سيقوم الرد الآلي بالاستجابة للاستفسارات والحجوزات المسجلة لمواضيع مساحة العمل فوراً." : "AI bot will automatically process client chats for this workspace in real-time."}
          </div>
        </div>

      </div>

      {/* SECTION 3: Key Performance Metrics & Analytics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "محادثات الذكاء الاصطناعي" : "AI Conversations"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {currentWorkspace.aiConversationsUsed}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {currentPlan.aiConversationLimit === -1 ? (isAr ? "مفتوح" : "Unlimited") : `${currentPlan.aiConversationLimit}`}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "الردود التلقائية عبر تليجرام وواتساب" : "Automated WhatsApp & Telegram chats"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "عملاء CRM المسجلين" : "Total CRM Customers"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {workspaceLeads.length}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {isAr ? "نشط حالياً" : "Active CRM"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "سجل العملاء والطلبات والفرص" : "Leads, Prospects, & History"}
          </p>
        </div>

        {currentWorkspace.industry === "Clinic" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAr ? "حجوزات العيادة" : "Appointments"}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {workspaceApts.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {isAr ? "حجز مؤكد" : "Bookings"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? "جدولة الأطباء والمرضى" : "Doctor scheduling & appointments"}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "الشكاوى والمتابعات" : "Pending Complaints"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <MessageSquareWarning className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {workspaceCmps.filter((c) => c.status !== "Resolved").length}
            </span>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {isAr ? "تتطلب اهتمام" : "Attention needed"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "تم الرد الآلي وتوثيقها بالـ CRM" : "Logged in CRM & Auto-replied"}
          </p>
        </div>
      </div>

      {/* Self-Learning Fact Review Banner if pending facts */}
      {pendingFacts.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                {isAr
                  ? `حقائق معتمدة من التعلم الذاتي في انتظار المراجعة (${pendingFacts.length})`
                  : `Self-Learning AI Facts Pending Approval (${pendingFacts.length})`}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {isAr
                  ? "قام الذكاء الاصطناعي باستخراج حقائق جديدة من الملفات. يرجى واعتمادها لاستخدامها في الردود."
                  : "AI extracted new business facts. Approve them before the AI uses them in live chats."}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("client_ai_settings")}
            className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
          >
            {isAr ? "مراجعة الحقائق" : "Review Facts"}
          </button>
        </div>
      )}

      
      {/* Advanced Analytics & Insights */}
      <ClientAnalyticsDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Unanswered FAQs Extraction */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-500" />
                {isAr ? "أسئلة شائعة لم يتم الإجابة عليها" : "Unanswered FAQs"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "أسئلة كررها العملاء ولم يتمكن الذكاء الاصطناعي من الإجابة عليها" : "Questions frequently asked by customers that the AI couldn't answer"}
              </p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {unansweredFAQs.length} {isAr ? "أسئلة جديدة" : "New Questions"}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {unansweredFAQs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-10">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-3" />
                <p className="text-sm font-bold">{isAr ? "لا توجد أسئلة معلقة!" : "No pending questions!"}</p>
                <p className="text-xs mt-1">{isAr ? "تم تحديث قاعدة المعرفة بنجاح." : "Knowledge base is fully up to date."}</p>
              </div>
            ) : (
              unansweredFAQs.map(q => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500">
                          {q.category}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {isAr ? `تكرر ${q.count} مرات` : `Asked ${q.count} times`}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{q.question}</p>
                    </div>
                    {replyFormId !== q.id && (
                      <button 
                        onClick={() => setReplyFormId(q.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition"
                      >
                        {isAr ? "إضافة إجابة" : "Add Answer"}
                      </button>
                    )}
                  </div>
                  
                  {replyFormId === q.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={isAr ? "اكتب الإجابة النموذجية ليتم إضافتها لقاعدة المعرفة..." : "Write the standard answer to add to Knowledge Base..."}
                        className="w-full h-20 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setReplyFormId(null); setReplyText(""); }}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>
                        <button 
                          onClick={() => handleAddAnswer(q)}
                          className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition shadow-sm"
                        >
                          {isAr ? "حفظ وتحديث القاعدة" : "Save to Knowledge Base"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
