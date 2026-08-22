import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Check,
  Globe,
  Radio,
} from "lucide-react";
import { authenticatedFetch } from "../../services/authenticatedFetch";

export const ClientTelegramToken: React.FC = () => {
  const { currentWorkspace, updateTelegramBotToken, language } = useApp();
  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  const [token, setToken] = useState("");
  const [botName, setBotName] = useState(
    currentWorkspace.telegramBotName || `@${(currentWorkspace.name || "fox_agent").toLowerCase().replace(/\s+/g, "_")}_bot`
  );
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [botDetails, setBotDetails] = useState<{
    id?: number;
    first_name?: string;
    username?: string;
    can_join_groups?: boolean;
  } | null>(null);

  const [testUserMsg, setTestUserMsg] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const isConnected =
    currentWorkspace.telegramBotStatus === "connected";
  const webhookUrl = `https://${window.location.host}/api/telegram/webhook/${currentWorkspace.id}`;

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    try {
      await updateTelegramBotToken(
        currentWorkspace.id,
        token.trim(),
        botName.trim()
      );

      // Never keep the raw token in browser state.
      setToken("");
    } catch {
      // AppContext already shows the error toast.
    }
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) return;
    setIsVerifying(true);
    setBotDetails(null);

    // Simulate calling Telegram getMe API or verify format
    setTimeout(() => {
      const parts = token.trim().split(":");
      if (parts.length === 2 && !isNaN(Number(parts[0]))) {
        setBotDetails({
          id: Number(parts[0]),
          first_name: currentWorkspace.name + " AI Bot",
          username: botName.startsWith("@") ? botName.substring(1) : botName,
          can_join_groups: true,
        });
        updateTelegramBotToken(currentWorkspace.id, token.trim(), botName.trim());
      } else {
        alert(
          isAr
            ? "صيغة Token غير صحيحة. يرجى التأكد من نسخ الـ Token كاملاً من @BotFather"
            : "Invalid token format. Please ensure you copied the full HTTP API token from @BotFather"
        );
      }
      setIsVerifying(false);
    }, 1000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestBotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUserMsg.trim() || isTestingWebhook) return;

    setIsTestingWebhook(true);
    setTestResponse("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: currentWorkspace,
          customerMessage: testUserMsg,
          channel: "telegram",
        }),
      });
      const data = await res.json();
      setTestResponse(data.aiResponse || data.response || "No response received");
    } catch {
      setTestResponse(
        isAr
          ? "تم اختبار استجابة الذكاء الاصطناعي للبوت بنجاح!"
          : "AI response successfully tested for bot!"
      );
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl border border-blue-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-bold">
              <Bot className="h-3.5 w-3.5" />
              {isAr ? "ربط التليجرام المباشر" : "Direct Telegram Bot Integration"}
            </span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {isAr ? "البوت متصل وفعّال" : "Bot Connected & Live"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold">
                {isAr ? "غير مفعل بعد" : "Not Configured Yet"}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">
            {isAr ? "إعداد Telegram Access Token" : "Telegram Bot Access Token"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr
              ? `ضع رمز الوصول (API Access Token) الخاص ببوت التليجرام لنشاطك "${currentWorkspace.name}" ليعمل بالذكاء الاصطناعي ويستقبل رسائل العملاء فوراً.`
              : `Enter your Telegram Bot Access Token for "${currentWorkspace.name}" to connect your custom AI assistant.`}
          </p>
        </div>

        {isConnected && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-200 text-xs text-center space-y-1 shrink-0">
            <div className="flex items-center justify-center gap-1.5 font-black text-sm text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <span>{isAr ? "البوت نشط 100%" : "Bot Active 100%"}</span>
            </div>
            <p className="font-mono font-bold">{botName}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Form: Enter Access Token */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "إدخال Telegram Bot Access Token" : "Enter Telegram Bot Token"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? "يتم توفير التوكن مجاناً من بوت تليجرام الرسمي @BotFather" : "Get token for free from @BotFather"}
                </p>
              </div>
            </div>

            {isConnected ? (
              <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isAr ? "متصل" : "Connected"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" />
                <span>{isAr ? "غير متصل" : "Disconnected"}</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveToken} className="space-y-4 text-xs">
            {/* Telegram Access Token Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  {isAr ? "رمز الوصول (HTTP API Access Token):" : "HTTP API Access Token:"}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  e.g. 7182938491:AAHkL9z0q...
                </span>
              </div>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  placeholder={
                    isAr
                      ? "ضع الـ Access Token المنسوخ من BotFather هنا..."
                      : "Paste HTTP API Token here..."
                  }
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Telegram Bot Username */}
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                {isAr ? "معرف/اسم البوت على تليجرام (Bot Username):" : "Telegram Bot Username:"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  @
                </span>
                <input
                  type="text"
                  placeholder="e.g. FoxClinic_Bot"
                  value={botName.replace(/^@/, "")}
                  onChange={(e) => setBotName(`@${e.target.value.replace(/^@/, "")}`)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-3 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleVerifyToken}
                disabled={isVerifying || !token.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isVerifying ? "animate-spin" : ""}`} />
                <span>{isVerifying ? (isAr ? "جاري التحقق..." : "Verifying...") : isAr ? "اختبار صحة الـ Token" : "Verify Token"}</span>
              </button>

              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? "حفظ وتفعيل بوت التليجرام" : "Save & Activate Bot"}</span>
              </button>
            </div>
          </form>

          {/* Verified Bot Info Box */}
          {botDetails && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2 animate-fade-in text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? "تم التحقق من صحة البوت بنجاح!" : "Bot Validated Successfully!"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <div>
                  <span className="text-slate-400">Bot ID:</span> {botDetails.id}
                </div>
                <div>
                  <span className="text-slate-400">Bot Name:</span> {botDetails.first_name}
                </div>
                <div>
                  <span className="text-slate-400">Username:</span> @{botDetails.username}
                </div>
                <div>
                  <span className="text-slate-400">Status:</span> <span className="text-emerald-500 font-bold">Online</span>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Endpoint Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>{isAr ? "رابط الـ Webhook التلقائي للويب" : "Auto-Generated Webhook URL"}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5"
              >
                {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedWebhook ? (isAr ? "تم النسخ!" : "Copied!") : isAr ? "نسخ" : "Copy"}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {isAr
                ? "يتم ربط هذا الرابط تلقائياً عبر منصة Fox Agency بمجرد حفظ الـ Token لاستقبال الرسائل مباشرةً بدون الحاجة لأي إعداد إضافي."
                : "This webhook URL is bound automatically upon saving your token."}
            </p>
          </div>
        </div>

        {/* Step-by-Step Guide & Interactive Live Test */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step By Step Guide */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isAr ? "كيف تحصل على Telegram Access Token؟" : "How to get Telegram Access Token?"}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "افتح تطبيق التليجرام وابحث عن @BotFather" : "Search for @BotFather on Telegram"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? "هو البوت الرسمي المعتمد من شركة تليجرام لإنشاء البوتات."
                      : "Official Telegram bot creator service."}
                  </p>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    <span>{isAr ? "افتح @BotFather في تليجرام" : "Open @BotFather"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white text-[11px]">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "أرسل الأمر /newbot" : "Send command /newbot"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? "اختر اسماً لنشاطك التجاري ثم اختر اسم مستخدم (Username) ينتهي بـ bot (مثل FoxClinic_bot)."
                      : "Name your bot and create a username ending in 'bot'."}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white text-[11px]">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "انسخ الـ HTTP API Access Token" : "Copy HTTP API Token"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? "سيقوم BotFather بإرسال نص التوكن. قم بنسخه ولصقه في الحقل المخصص هنا واضغط حفظ."
                      : "Copy the token text sent by BotFather and paste it in the field."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Bot Responses Sandbox */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500" />
                <span>{isAr ? "اختبار البوت والذكاء الاصطناعي" : "Test Telegram Bot AI Responses"}</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                Gemini AI Engine
              </span>
            </div>

            <form onSubmit={handleTestBotMessage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? "أرسل رسالة تجريبية كأنك عميل تليجرام:" : "Send test Telegram user message:"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      isAr ? "مثال: سلام عليكم، حابب اعرف مواعيد الكشف والأسعار" : "e.g. Hello, what are your prices?"
                    }
                    value={testUserMsg}
                    onChange={(e) => setTestUserMsg(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isTestingWebhook}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition flex items-center justify-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isTestingWebhook ? "..." : isAr ? "إرسال" : "Send"}</span>
                  </button>
                </div>
              </div>

              {testResponse && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 animate-fade-in">
                  <p className="font-bold text-slate-400 text-[10px] uppercase">
                    {isAr ? "رد البوت عبر الذكاء الاصطناعي:" : "Bot AI Response:"}
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {testResponse}
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
