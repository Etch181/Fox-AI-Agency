import { authenticatedFetch } from "../../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { GmailIntegrationWidget } from "../common/GmailIntegrationWidget";
import { AdminAgencyRatings } from "./AdminAgencyRatings";
import {
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Zap,
  Sparkles,
  Key,
  Globe,
  RefreshCw,
  ShieldCheck,
  SendHorizontal,
  Sliders,
  FileText,
  Plus,
  Trash2,
  Save,
  Cpu,
  Phone,
  Mail,
  HelpCircle,
  Settings,
  Layers,
  Users,
  Clock,
  Power,
  PowerOff,
  ToggleLeft,
  ToggleRight,
  Play,
  Pause,
  Star,
  Award,
} from "lucide-react";

interface QuickTemplate {
  id: string;
  keyword: string;
  title: string;
  reply: string;
}

interface BotConfig {
  botName: string;
  welcomeMessage: string;
  responseTone: string;
  enableGeminiAI: boolean;
  systemPrompt: string;
  pricingPlansText: string;
  fallbackMessage: string;
  currency: string;
  contactPhone: string;
  contactEmail: string;
  quickTemplates: QuickTemplate[];
}

export const AdminTelegramBot: React.FC = () => {
  const {
    language,
    workspaces,
    updateWorkspaceStatus,
    updateWorkspacePlan,
    deleteWorkspace,
    modificationRequests,
    confirmModificationByClient,
    approveSubscriberModificationRequest,
    rejectSubscriberModificationRequest,
  } = useApp();
  const isAr = language === "ar";

  const [activeSubTab, setActiveSubTab] = useState<"general" | "welcome" | "templates" | "ai" | "simulator" | "registrations" | "gmail" | "modifications" | "ratings">("welcome");
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any>(null);

  // Filter workspaces registered via Telegram Bot
  const tgRegisteredWorkspaces = workspaces.filter(
    (w) => w.registrationSource === "Telegram Bot" || w.id.startsWith("ws_tg_") || w.ownerEmail.includes("telegram")
  );

  // Connection State
  const [token, setToken] = useState("");
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [tokenMasked, setTokenMasked] = useState<string | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [checking, setChecking] = useState(true);
  const [savingToken, setSavingToken] = useState(false);

  // Config State
  const [config, setConfig] = useState<BotConfig>({
    botName: "FOX AI Agency Bot",
    welcomeMessage: `أهلاً بك في FOX AI AGENCY! 🦊🤖\n\nنحن نقدم أحدث حلول وكلاء الذكاء الاصطناعي وتكاملات التليجرام والواتساب للأنشطة التجارية.\n\nاستخدم الأوامر السريعة التالية للحصول على التفاصيل:\n• /plans - خطط الأسعار والاشتراكات 💼\n• /features - مميزات الوكلاء والأتمتة ⚡\n• /contact - التواصل مع الدعم المباشر 📞`,
    responseTone: "friendly",
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
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Template Editing State
  const [newKeyword, setNewKeyword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newReply, setNewReply] = useState("");

  // Direct Message Test
  const [testChatId, setTestChatId] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTestMsg, setSendingTestMsg] = useState(false);
  const [testMsgStatus, setTestMsgStatus] = useState<string | null>(null);

  // Simulator State
  const [userMsg, setUserMsg] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: config.welcomeMessage,
    },
  ]);

  const fetchBotStatusAndConfig = async () => {
    setChecking(true);
    try {
      const [resStatus, resConfig] = await Promise.all([
        authenticatedFetch("/api/telegram/status"),
        authenticatedFetch("/api/telegram/bot-config"),
      ]);

      const dataStatus = await resStatus.json();
      if (dataStatus.connected && dataStatus.botInfo) {
        setIsConnected(true);
        setBotInfo(dataStatus.botInfo);
        // Never load the real Telegram token into the browser.
      } else {
        setIsConnected(false);
        setBotInfo(null);
      }

      if (typeof dataStatus.botEnabled === "boolean") {
        setIsBotEnabled(dataStatus.botEnabled);
      }

      const dataConfig = await resConfig.json();

      if (typeof dataConfig.hasToken === "boolean") {
        setHasSavedToken(dataConfig.hasToken);
      }

      if (dataConfig.tokenMasked) {
        setTokenMasked(dataConfig.tokenMasked);
      }

      if (dataConfig.success && dataConfig.config) {
        setConfig(dataConfig.config);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleBot = async () => {
    setTogglingStatus(true);
    try {
      const res = await authenticatedFetch("/api/telegram/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !isBotEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBotEnabled(data.botEnabled);
      } else {
        alert(data.error || (isAr ? "فشل تغيير حالة البوت" : "Failed to toggle bot status"));
      }
    } catch {
      alert(isAr ? "حدث خطأ أثناء تغيير حالة البوت" : "Error toggling bot status");
    } finally {
      setTogglingStatus(false);
    }
  };

  useEffect(() => {
    fetchBotStatusAndConfig();
  }, []);

  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setSavingToken(true);
    try {
      const res = await authenticatedFetch("/api/telegram/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (data.success && data.botInfo) {
        setIsConnected(true);
        setBotInfo(data.botInfo);
        setHasSavedToken(true);
        setTokenMasked(
          token.trim().length >= 4
            ? `••••••••${token.trim().slice(-4)}`
            : "••••••••"
        );
        setToken("");
        alert(isAr ? "تم ربط توكن البوت بنجاح!" : "Bot token connected successfully!");
      } else {
        setIsConnected(false);
        alert(data.error || (isAr ? "فشل التحقق من التوكن" : "Token validation failed"));
      }
    } catch {
      alert(isAr ? "حدث خطأ أثناء الربط" : "Error updating bot token");
    } finally {
      setSavingToken(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setSaveSuccess(false);
    try {
      const res = await authenticatedFetch("/api/telegram/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || (isAr ? "حدث خطأ أثناء الحفظ" : "Failed to save configuration"));
      }
    } catch {
      alert(isAr ? "فشل الاتصال بالخادم" : "Server connection failed");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddTemplate = () => {
    if (!newKeyword.trim() || !newReply.trim()) {
      alert(isAr ? "يرجى إدخال الكلمة المفتاحية/الأمر ونص الرد" : "Please enter keyword and reply text");
      return;
    }

    const tplKey = newKeyword.trim().startsWith("/") ? newKeyword.trim() : `/${newKeyword.trim()}`;
    const newTpl: QuickTemplate = {
      id: `tpl_${Date.now()}`,
      keyword: tplKey,
      title: newTitle.trim() || tplKey,
      reply: newReply.trim(),
    };

    setConfig((prev) => ({
      ...prev,
      quickTemplates: [...prev.quickTemplates, newTpl],
    }));

    setNewKeyword("");
    setNewTitle("");
    setNewReply("");
  };

  const handleDeleteTemplate = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      quickTemplates: prev.quickTemplates.filter((t) => t.id !== id),
    }));
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testChatId.trim() || !testMessage.trim()) return;

    setSendingTestMsg(true);
    setTestMsgStatus(null);
    try {
      const res = await authenticatedFetch("/api/telegram/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: testChatId.trim(), text: testMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestMsgStatus(isAr ? "تم إرسال الرسالة بنجاح عبر تليجرام!" : "Message sent via Telegram successfully!");
        setTestMessage("");
      } else {
        setTestMsgStatus(`Error: ${data.error}`);
      }
    } catch {
      setTestMsgStatus(isAr ? "فشل الإرسال" : "Failed to send message");
    } finally {
      setSendingTestMsg(false);
    }
  };

  const handleSendSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMsg.trim()) return;

    const input = userMsg;
    setUserMsg("");
    setChatLog((prev) => [...prev, { sender: "user", text: input }]);

    try {
      const res = await fetch("/api/telegram/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setChatLog((prev) => [...prev, { sender: "bot", text: data.telegramResponse }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          sender: "bot",
          text: config.welcomeMessage,
        },
      ]);
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2.5">
            <Bot className="h-7 w-7 text-blue-500" />
            <span>
              {isAr ? "التحكم في بوت تليجرام الوكالة (Telegram Bot Controller)" : "Agency Telegram Bot Controller"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "تحكم في رسائل الترحيب، طريقة ونبرة الردود، قوالب الأوامر السريعة، وإعدادات Gemini AI المباشرة لبوت الوكالة."
              : "Full control over welcome messages, tone of voice, command templates, and Gemini AI agent rules for your agency bot."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BOT TOGGLE ON / OFF BUTTON */}
          <button
            onClick={handleToggleBot}
            disabled={togglingStatus}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer ${
              isBotEnabled
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
            }`}
          >
            <Power className={`h-4 w-4 ${togglingStatus ? "animate-spin" : ""}`} />
            <span>
              {togglingStatus
                ? (isAr ? "جاري التحديث..." : "Updating...")
                : isBotEnabled
                ? (isAr ? "البوت يعمل (شغال) 🟢" : "Bot Active 🟢")
                : (isAr ? "البوت متوقف (مفصول) 🔴" : "Bot Paused 🔴")}
            </span>
          </button>

          <button
            onClick={fetchBotStatusAndConfig}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-blue-500 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            <span>{isAr ? "تحديث البيانات" : "Refresh"}</span>
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{savingConfig ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</span>
          </button>
        </div>
      </div>

      {/* Bot Disabled Warning Banner */}
      {!isBotEnabled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <PowerOff className="h-6 w-6 shrink-0 text-rose-500 animate-pulse" />
            <div>
              <p className="font-black text-sm">
                {isAr ? "⚠️ تنبيه: بوت تليجرام الوكالة متوقف حالياً (خدمة البوت مفصولة)" : "⚠️ Alert: Telegram Bot is currently Paused/Disabled"}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {isAr
                  ? "البوت لن يستجيب تلقائياً لمحادثات المشتركين أو المحاكاة حتى تقوم بتشغيله مجدداً باستخدام زر التشغيل."
                  : "The bot will not auto-reply to clients until you turn it back ON using the start button."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleBot}
            disabled={togglingStatus}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
          >
            {isAr ? "تشغيل البوت الآن 🟢" : "Turn ON Bot Now 🟢"}
          </button>
        </div>
      )}

      {/* Save Success Alert Banner */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{isAr ? "تم حفظ جميع إعدادات بوت التليجرام وتطبيقها فوراً!" : "All Telegram bot settings saved and applied instantly!"}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("welcome")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "welcome"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{isAr ? "رسالة الترحيب ونبرة الرد" : "Welcome & Reply Tone"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("templates")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "templates"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>
            {isAr
              ? `قوالب الردود والأوامر (${config.quickTemplates.length})`
              : `Command Templates (${config.quickTemplates.length})`}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("ai")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "ai"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>{isAr ? "توجيهات الذكاء الاصطناعي (Gemini AI)" : "Gemini AI Agent Prompt"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "general"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>{isAr ? "بيانات التوكن والاتصال" : "Bot Token & Connection"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("simulator")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "simulator"
              ? "bg-orange-600 text-white shadow-md shadow-orange-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-300" />
          <span>{isAr ? "المُحاكي التجريبي المباشر (Simulator)" : "Live Interactive Simulator"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("registrations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "registrations"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Users className="h-4 w-4 text-emerald-400" />
          <span>{isAr ? "طلبات المشتركين عبر البوت" : "Telegram Registrations"}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
            {tgRegisteredWorkspaces.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("gmail")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "gmail"
              ? "bg-red-600 text-white shadow-md shadow-red-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Mail className="h-4 w-4 text-red-400" />
          <span>{isAr ? "خدمة Gmail وإرسال الإشعارات 📧" : "Gmail API Service"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("modifications")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "modifications"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Sliders className="h-4 w-4 text-indigo-400" />
          <span>{isAr ? "طلبات تعديل البيانات" : "Data Modifications"}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold">
            {modificationRequests?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("ratings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeSubTab === "ratings"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Award className="h-4 w-4 text-amber-400" />
          <span>{isAr ? "تقييمات خدمة الوكالة ⭐" : "Agency Ratings ⭐"}</span>
        </button>
      </div>

      {activeSubTab === "ratings" ? (
        <AdminAgencyRatings />
      ) : (
      /* Main Tab Views */
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN / MAIN PANEL */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: WELCOME MESSAGE & REPLY TONE */}
          {activeSubTab === "welcome" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <span>{isAr ? "رسالة الترحيب ونبرة الصوت" : "Welcome Message & Tone of Voice"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "حدد الرسالة الترحيبية الأولى عند ضغط العميل على /start وتحديد أسلوب استجابة البوت."
                    : "Configure the greeting message when users hit /start and set the response tone."}
                </p>
              </div>

              {/* Bot Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "اسم البوت الظاهر للعملاء:" : "Public Bot Display Name:"}
                </label>
                <input
                  type="text"
                  value={config.botName}
                  onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Response Tone Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "نبرة وأسلوب الرد المفضل (Response Tone):" : "Response Tone & Persona Style:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "friendly", labelAr: "ودود ومشجع 🌟", labelEn: "Friendly & Warm" },
                    { id: "professional", labelAr: "احترافي رسمي 💼", labelEn: "Professional Formal" },
                    { id: "sales", labelAr: "مبيعات وتسويق 🚀", labelEn: "Sales & Marketing" },
                    { id: "creative", labelAr: "مبتكر وسريع ⚡", labelEn: "Casual & Quick" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConfig({ ...config, responseTone: t.id })}
                      className={`p-3 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                        config.responseTone === t.id
                          ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {isAr ? t.labelAr : t.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Welcome Message Text Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "رسالة الترحيب عند بدء المحادثة (/start):" : "First Welcome Message (/start):"}
                  </label>
                  <span className="text-[10px] text-blue-500 font-bold">
                    {isAr ? "يدعم التنسيق بـ Markdown" : "Supports Markdown formatting"}
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                  placeholder={isAr ? "أهلاً بك في وكالة FOX AI..." : "Welcome to Fox AI Agency..."}
                />
              </div>

              {/* Default Fallback Message */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "الرد الافتراضي عند عدم توفر الإجابة (Fallback Message):" : "Default Fallback Reply:"}
                </label>
                <textarea
                  rows={3}
                  value={config.fallbackMessage}
                  onChange={(e) => setConfig({ ...config, fallbackMessage: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: COMMAND TEMPLATES */}
          {activeSubTab === "templates" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span>{isAr ? "إدارة قوالب الأوامر والردود السريعة" : "Command Templates & Quick Auto-Replies"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "أضف أوامرك الخاصة على تليجرام مثل (/plans, /contact, /features, /demo) مع تحديد نص الرد الدقيق بكل قالب."
                    : "Create custom bot commands like (/plans, /contact, /features) with tailored replies."}
                </p>
              </div>

              {/* Add New Template Form */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-emerald-500" />
                  <span>{isAr ? "إضافة أمر/قالب رد جديد:" : "Add New Command / Auto-Reply Template:"}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? "الأمر أو الكلمة المفتاحية (مثال: /plans):" : "Command / Keyword (e.g. /plans):"}
                    </label>
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="/discount"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? "عنوان القالب وصفياً:" : "Template Title:"}
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={isAr ? "عرض الخصم الحالي" : "Special Discount Offer"}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {isAr ? "نص الرد التلقائي القادم من البوت:" : "Auto-Reply Text:"}
                  </label>
                  <textarea
                    rows={3}
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder={isAr ? "احصل على خصم 20% عند الاشتراك في باقة Fox Business اليوم! 🚀" : "Get 20% off Fox Business today!"}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTemplate}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? "إضافة القالب لقائمة البوت" : "Add Template to Bot"}</span>
                </button>
              </div>

              {/* Templates List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {isAr ? "القوالب والأوامر النشطة حالياً:" : "Active Bot Commands & Templates:"}
                </h4>

                {config.quickTemplates.map((tpl, idx) => (
                  <div
                    key={tpl.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {tpl.keyword}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{tpl.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-500/10 transition"
                        title={isAr ? "حذف القالب" : "Delete Template"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={tpl.reply}
                      onChange={(e) => {
                        const updatedReply = e.target.value;
                        setConfig((prev) => ({
                          ...prev,
                          quickTemplates: prev.quickTemplates.map((t) =>
                            t.id === tpl.id ? { ...t, reply: updatedReply } : t
                          ),
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GEMINI AI RULES */}
          {activeSubTab === "ai" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-indigo-500" />
                  <span>{isAr ? "توجيهات شخصية الذكاء الاصطناعي (Gemini AI Agent)" : "Gemini AI Agent Persona & Rules"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "عندما يطرح العميل سؤالاً غير مسجل بالقوالب السريعة، يستجيب Gemini AI تلقائياً بناءً على القواعد التالية."
                    : "When users ask unhandled questions, Gemini AI steps in using these exact system instructions."}
                </p>
              </div>

              {/* Enable Gemini Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isAr ? "تفعيل الرد الذكي عبر Gemini 3.6 Flash" : "Enable Gemini 3.6 Flash AI Bot"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr ? "إجابة الاستفسارات المعقدة تلقائياً بذكاء" : "Automatically handle custom questions using AI"}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableGeminiAI}
                    onChange={(e) => setConfig({ ...config, enableGeminiAI: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:peer-focus:ring-blue-800 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* System Instruction Text Area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "التعليمات البرمجية لتوجيه الوكيل (System Instructions):" : "AI Agent System Prompt Instructions:"}
                </label>
                <textarea
                  rows={5}
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Pricing & Plans Summary Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "ملخص بيانات خطط الأسعار والاشتراكات (Pricing Context):" : "Pricing Plans Context for AI:"}
                </label>
                <textarea
                  rows={4}
                  value={config.pricingPlansText}
                  onChange={(e) => setConfig({ ...config, pricingPlansText: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 4: TOKEN & CONNECTION */}
          {activeSubTab === "general" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-500" />
                  <span>{isAr ? "بيانات الربط والتوكن مع BotFather" : "BotFather Token & Connection"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? "ربط الحساب بـ Telegram Bot API بواسطة Access Token" : "Connect your Telegram Bot via BotFather API token."}
                </p>
              </div>

              {/* Bot Info Status Banner */}
              {botInfo && (
                <div className="space-y-2 text-xs p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "اسم البوت:" : "Bot Name:"}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{botInfo.first_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "معرّف البوت (Username):" : "Username:"}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">@{botInfo.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? "معرّف البوت (ID):" : "Bot ID:"}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{botInfo.id}</span>
                  </div>
                </div>
              )}

              {/* Token Form */}
              <div className="mb-3">
                {hasSavedToken ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500 font-bold">
                    {isAr
                      ? `✅ التوكن محفوظ ومؤمَّن${tokenMasked ? ` — ${tokenMasked}` : ""}`
                      : `✅ Token saved securely${tokenMasked ? ` — ${tokenMasked}` : ""}`}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500 font-bold">
                    {isAr
                      ? "لا يوجد توكن محفوظ حالياً"
                      : "No token is currently saved"}
                  </div>
                )}
              </div>

              <form onSubmit={handleUpdateToken} className="space-y-3">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-500" />
                  <span>{isAr ? "توكن البوت (BotFather Access Token):" : "BotFather Access Token:"}</span>
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={savingToken}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 hover:bg-blue-500 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isAr ? "حفظ واختبار الربط بـ BotFather" : "Save & Verify Token"}</span>
                </button>
              </form>

              {/* Send Direct Test Telegram Message */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <SendHorizontal className="h-4 w-4 text-emerald-500" />
                  <span>{isAr ? "إرسال رسالة تجريبية مباشرة لعميل عبر تليجرام:" : "Send Direct Telegram Test Message:"}</span>
                </h4>

                <form onSubmit={handleSendDirectMessage} className="space-y-3 text-xs">
                  <input
                    type="text"
                    placeholder="Telegram Chat ID (e.g. 123456789)"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={2}
                    placeholder={isAr ? "أهلاً بك! هذه رسالة تجريبية من لوحة التحكم." : "Hello! This is a test message."}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />

                  {testMsgStatus && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 p-2 rounded-lg">
                      {testMsgStatus}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sendingTestMsg}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isAr ? "إرسال الرسالة الآن" : "Send Test Message"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: SIMULATOR */}
          {activeSubTab === "simulator" && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 flex flex-col h-[550px] overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">{config.botName}</h3>
                    <p className="text-[11px] opacity-90 font-medium">
                      {isAr ? "المُحاكي المباشر لردود تليجرام" : "Live Telegram Response Simulator"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Active Persona: {config.responseTone}
                </span>
              </div>

              {/* Chat Log Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 dark:bg-slate-950/70">
                {chatLog.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                        m.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Form with Quick Test Chips */}
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-slate-400">{isAr ? "اختبارات سريعة للتسجيل:" : "Quick Test Chips:"}</span>
                  <button
                    type="button"
                    onClick={() => setUserMsg("/start")}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    /start
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("/plans")}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    /plans
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("تسجيل")}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold"
                  >
                    تسجيل 🚀
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("1")}
                    className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold"
                  >
                    تجريبي (1) 🆓
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("عيادة السلام - د. أحمد")}
                    className="px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold"
                  >
                    اسم النشاط
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("1")}
                    className="px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold"
                    title="اختيار عيادة"
                  >
                    عيادة (1) 🏥
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("2")}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                    title="اختيار صيدلية"
                  >
                    صيدلية (2) 💊
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("3")}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold"
                    title="اختيار متجر"
                  >
                    متجر (3) 🛒
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("4")}
                    className="px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold"
                    title="اختيار مركز كورسات"
                  >
                    كورسات (4) 📚
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("01012345678")}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                  >
                    الهاتف
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("dr.ahmed@clinic.com 123456")}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold"
                  >
                    الإيميل والباسورد 📧
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("123456")}
                    className="px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold"
                  >
                    كود التفعيل 🔑
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserMsg("تقييم")}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold"
                  >
                    تقييم الخدمة ⭐
                  </button>
                </div>

                <form onSubmit={handleSendSimulator} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      isAr
                        ? "جرب كتابة: /start أو /plans أو اكتب 'تسجيل' للاشتراك المباشر..."
                        : "Type /start, /plans, or 'تسجيل' to register..."
                    }
                    value={userMsg}
                    onChange={(e) => setUserMsg(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-blue-500 transition cursor-pointer"
                  >
                    <Send className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    <span>{isAr ? "تجربة" : "Test"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: TELEGRAM BOT REGISTERED CLIENTS */}
          {activeSubTab === "registrations" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <span>{isAr ? "طلبات المشتركين والعملاء القادمة من البوت" : "Telegram Bot Registered Clients"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isAr
                      ? "جميع حسابات الأنشطة التجارية التي سجلت بياناتها واختارت باقاتها تلقائياً عبر بوت التليجرام الرسمي."
                      : "All business accounts registered and plan selections saved automatically via the Telegram bot."}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold self-start sm:self-auto">
                  {tgRegisteredWorkspaces.length} {isAr ? "مشترك مسجل" : "Registered Workspaces"}
                </span>
              </div>

              {tgRegisteredWorkspaces.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <Bot className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isAr ? "لا توجد تسجيلات حتى الآن من بوت التليجرام." : "No Telegram registrations recorded yet."}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    {isAr
                      ? "يمكنك الانتقال لتبويب المُحاكي التجريبي واكتب 'تسجيل' ثم اختر الباقة لاختبار الحفظ التلقائي بنجاح!"
                      : "Switch to the Live Simulator tab and type 'تسجيل' then choose a plan to test automatic registration!"}
                  </p>
                  <button
                    onClick={() => setActiveSubTab("simulator")}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                  >
                    {isAr ? "الانتقال للمُحاكي واختبار التسجيل الآن 🚀" : "Open Simulator & Test Registration"}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                        <th className="py-3 px-4">{isAr ? "النشاط والمالك" : "Business & Owner"}</th>
                        <th className="py-3 px-4">{isAr ? "الهاتف" : "Phone"}</th>
                        <th className="py-3 px-4">{isAr ? "الباقة" : "Plan"}</th>
                        <th className="py-3 px-4">{isAr ? "تاريخ التسجيل" : "Registered At"}</th>
                        <th className="py-3 px-4">{isAr ? "الحالة" : "Status"}</th>
                        <th className="py-3 px-4 text-right">{isAr ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {tgRegisteredWorkspaces.map((ws) => (
                        <tr key={ws.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs">{ws.name}</div>
                            <div className="text-[11px] text-slate-500">{ws.ownerName} ({ws.industry})</div>
                            <div className="text-[10px] font-mono text-blue-500">ID: {ws.id}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">{ws.phone}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              ws.planId === "enterprise"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : ws.planId === "business"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                            }`}>
                              {ws.planId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">{ws.createdAt}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              {ws.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateWorkspaceStatus(ws.id, ws.status === "active" ? "suspended" : "active")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
                              >
                                {ws.status === "active" ? (isAr ? "تعليق" : "Suspend") : (isAr ? "تفعيل" : "Activate")}
                              </button>
                              <button
                                onClick={() => setWorkspaceToDelete(ws)}
                                className="p-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                                title={isAr ? "حذف نهائي" : "Delete"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: GMAIL INTEGRATION */}
          {activeSubTab === "gmail" && <GmailIntegrationWidget />}

          {/* TAB 8: SUBSCRIBER MODIFICATION REQUESTS */}
          {activeSubTab === "modifications" && (
            <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-xl dark:border-indigo-900/60 dark:bg-slate-900 space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-500" />
                    <span>{isAr ? "طلبات تعديل بيانات المشتركين" : "Subscriber Data Modification Requests"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isAr
                      ? "إدارة طلبات تحديل بيانات المشتركين. يقوم البوت بإرسال إشعار للعميل أولاً للتأكيد، وعندما يؤكد العميل، تظهر لك الموافقة النهائية هنا."
                      : "Manage client data update requests with two-step verification."}
                  </p>
                </div>
                <span className="px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black self-start sm:self-auto">
                  {modificationRequests?.length || 0} {isAr ? "طلب" : "Requests"}
                </span>
              </div>

              {(!modificationRequests || modificationRequests.length === 0) ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <Sliders className="h-10 w-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isAr ? "لا توجد طلبات تعديل بيانات حالياً." : "No modification requests currently pending."}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    {isAr
                      ? "يمكنك فتح 'دليل حسابات المشتركين' والضغط على زر 'تعديل البيانات' للبدء بإنشاء طلب جديد مع إشعار تليجرام التلقائي للعميل!"
                      : "Open Client Directory and click 'Edit Data' to initiate a request with automatic Telegram client notification."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1">
                  {modificationRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`rounded-2xl border p-5 transition-all space-y-4 ${
                        req.status === "CLIENT_CONFIRMED"
                          ? "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
                          : req.status === "AWAITING_CLIENT_CONFIRMATION"
                          ? "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20"
                          : req.status === "APPROVED"
                          ? "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40 opacity-75"
                          : "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 opacity-75"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {req.currentData.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {req.workspaceId}
                          </p>
                        </div>

                        {req.status === "AWAITING_CLIENT_CONFIRMATION" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="h-4 w-4 animate-spin" />
                            {isAr ? "⏳ بانتظار تأكيد العميل عبر تليجرام" : "Awaiting Client Confirmation"}
                          </span>
                        )}
                        {req.status === "CLIENT_CONFIRMED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 animate-pulse">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            {isAr ? "🟢 العميل أكد التعديل - بانتظار موافقتك" : "Client Confirmed - Pending Approval"}
                          </span>
                        )}
                        {req.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            {isAr ? "✅ تم الاعتماد والتعديل" : "Approved & Applied"}
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-4 w-4" />
                            {isAr ? "❌ مرفوض" : "Rejected"}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-3 border border-slate-200 dark:border-slate-800 space-y-1">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase">{isAr ? "البيانات الحالية" : "Current Data"}</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">الاسم: {req.currentData.name}</p>
                          <p className="text-slate-600 dark:text-slate-400">المالك: {req.currentData.ownerName}</p>
                          <p className="text-slate-500 dark:text-slate-400 font-mono">📱 {req.currentData.phone}</p>
                          <p className="text-slate-500 dark:text-slate-400">✉️ {req.currentData.email}</p>
                          <p className="text-slate-500 dark:text-slate-400 font-bold">الباقة: {req.currentData.planId}</p>
                        </div>

                        <div className="rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 p-3 border border-indigo-200 dark:border-indigo-800 space-y-1">
                          <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">{isAr ? "البيانات المقترحة (الجديدة)" : "Proposed Data"}</p>
                          <p className="font-extrabold text-indigo-950 dark:text-indigo-200">الاسم: {req.proposedData.name}</p>
                          <p className="font-bold text-indigo-900 dark:text-indigo-300">المالك: {req.proposedData.ownerName}</p>
                          <p className="font-mono text-indigo-800 dark:text-indigo-300">📱 {req.proposedData.phone}</p>
                          <p className="text-indigo-800 dark:text-indigo-300">✉️ {req.proposedData.email}</p>
                          <p className="font-bold text-indigo-800 dark:text-indigo-300">الباقة: {req.proposedData.planId}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-xs text-slate-400 font-mono">
                          {req.createdAt}
                        </span>

                        <div className="flex items-center gap-2">
                          {req.status === "AWAITING_CLIENT_CONFIRMATION" && (
                            <button
                              onClick={() => confirmModificationByClient(req.id)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>{isAr ? "إرسال تأكيد العميل (محاكاة)" : "Simulate Client Confirm"}</span>
                            </button>
                          )}

                          {req.status === "CLIENT_CONFIRMED" && (
                            <>
                              <button
                                onClick={() => approveSubscriberModificationRequest(req.id)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition active:scale-95"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                <span>{isAr ? "موافقة صاحب الوكالة (اعتماد)" : "Approve & Apply"}</span>
                              </button>
                              <button
                                onClick={() => rejectSubscriberModificationRequest(req.id)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold transition"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>{isAr ? "رفض" : "Reject"}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN / SIDEBAR INFO & LIVE QUICK PREVIEW */}
        <div className="lg:col-span-4 space-y-6">
          {/* Connection Status Overview Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span>{isAr ? "حالة البوت المباشر" : "Live Bot Status"}</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isAr ? "متصل ومفعل" : "Connected"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full">
                  <XCircle className="h-3.5 w-3.5" />
                  {isAr ? "غير متصل" : "Disconnected"}
                </span>
              )}
            </h4>

            <div className="space-y-2 text-xs">
              {/* Interactive Bot Power Toggle Box */}
              <div
                className={`p-3.5 rounded-2xl border transition ${
                  isBotEnabled
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Power className={`h-5 w-5 ${isBotEnabled ? "text-emerald-500" : "text-rose-500"}`} />
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? "حالة تشغيل البوت" : "Bot Service Power"}
                      </p>
                      <p
                        className={`text-[10px] font-bold ${
                          isBotEnabled
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isBotEnabled
                          ? isAr
                            ? "الخدمة شغالة وتستجيب تلقائياً 🟢"
                            : "Service Active & Replying 🟢"
                          : isAr
                          ? "الخدمة متوقفة/مفصولة حالياً 🔴"
                          : "Service Paused/Offline 🔴"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleBot}
                    disabled={togglingStatus}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition shadow-xs cursor-pointer ${
                      isBotEnabled
                        ? "bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {togglingStatus
                      ? "..."
                      : isBotEnabled
                      ? isAr
                        ? "إيقاف"
                        : "Pause"
                      : isAr
                      ? "تشغيل"
                      : "Start"}
                  </button>
                </div>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">{isAr ? "المعرف:" : "Username:"}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {botInfo ? `@${botInfo.username}` : "@FoxAIAgencyBot"}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">{isAr ? "النموذج النشط:" : "Active Model:"}</span>
                <span className="font-bold text-slate-900 dark:text-white">Gemini 3.6 Flash</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500">{isAr ? "نبرة الصوت:" : "Tone:"}</span>
                <span className="font-bold capitalize text-amber-600 dark:text-amber-400">{config.responseTone}</span>
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isAr ? "حفظ كافة الإعدادات والقوالب" : "Save All Bot Settings"}</span>
            </button>
          </div>

          {/* Quick Help & Guidance */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 p-5 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>{isAr ? "كيف تعمل الاستجابة التلقائية؟" : "How Bot Response Pipeline Works"}</span>
            </h4>
            <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
              <li>{isAr ? "عند إرسال /start، يتلقى العميل رسالة الترحيب المخصصة فوراً." : "When sending /start, users receive your custom welcome text."}</li>
              <li>{isAr ? "الأوامر السريعة مثل (/plans) تجيب مباشرة بأسعار وتفاصيل الباقة." : "Quick commands like /plans return instant formatted pricing."}</li>
              <li>{isAr ? "Gemini AI يجيب عن أي استفسارات مخصصة بالذكاء الاصطناعي." : "Gemini AI answers open questions intelligently."}</li>
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="rounded-xl bg-rose-500/10 p-3">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "تأكيد الحذف النهائي للمشترك" : "Confirm Permanent Delete"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {workspaceToDelete.name} ({workspaceToDelete.id})
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {isAr
                ? `هل أنت تأكد تماماً من رغبتك في حذف المشترك "${workspaceToDelete.name}"؟ سيتم إزالته نهائياً من قاعدة البيانات والسيرفر ولن يظهر في القائمة مجدداً.`
                : `Are you sure you want to permanently delete workspace "${workspaceToDelete.name}"? This will remove it from database and server permanently.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWorkspaceToDelete(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const wsId = workspaceToDelete.id;
                  setWorkspaceToDelete(null);
                  await deleteWorkspace(wsId);
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isAr ? "نعم، حذف المشترك نهائياً 🗑️" : "Yes, Delete Permanently 🗑️"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
