import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Send,
  Zap,
  HelpCircle,
  Copy,
  Check,
  Radio,
  Sparkles,
  Link2,
  LogOut,
} from "lucide-react";
import { authenticatedFetch } from "../../services/authenticatedFetch";

export const ClientWhatsAppQR: React.FC = () => {
  const { currentWorkspace, updateWhatsAppBotStatus, language } = useApp();
  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  const connectedPhone =
    currentWorkspace.whatsappPhoneNumber ||
    currentWorkspace.phone ||
    "+20 100 123 4567";

  const [phoneInput, setPhoneInput] = useState(connectedPhone);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(
    currentWorkspace.whatsappPhoneNumberId || ""
  );
  const [businessAccountId, setBusinessAccountId] = useState(
    currentWorkspace.whatsappBusinessAccountId || ""
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [serverConnected, setServerConnected] = useState(
    currentWorkspace.whatsappBotStatus === "connected"
  );

  const isConnected = serverConnected;
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [generatingWebhookToken, setGeneratingWebhookToken] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);

  // Live Test Sandbox state
  const [testMsg, setTestMsg] = useState("");
  const [testChat, setTestChat] = useState<{ sender: "user" | "bot"; text: string; time: string }[]>([
    {
      sender: "bot",
      text: isAr
        ? `أهلاً بك! أنا وكيل الذكاء الاصطناعي المباشر لـ ${currentWorkspace.name} عبر الواتساب. كيف يمكنني خدمتك اليوم؟ 🦊🤖`
        : `Hello! I am the official AI assistant for ${currentWorkspace.name} on WhatsApp. How can I assist you today? 🦊🤖`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isBotResponding, setIsBotResponding] = useState(false);

  const fetchWhatsAppStatus = async () => {
    setCheckingStatus(true);

    try {
      const res = await authenticatedFetch(
        `/api/whatsapp/workspace/${currentWorkspace.id}/status`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to read WhatsApp status"
        );
      }

      setServerConnected(Boolean(data.connected));

      if (data.phoneNumber) {
        setPhoneInput(data.phoneNumber);
      }

      if (data.phoneNumberId) {
        setPhoneNumberId(data.phoneNumberId);
      }

      if (data.businessAccountId) {
        setBusinessAccountId(data.businessAccountId);
      }

    } catch (error) {
      console.error("WhatsApp status failed:", error);
      setServerConnected(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
  }, [currentWorkspace.id]);

  const handleConnectWhatsApp = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!accessToken.trim() || !phoneNumberId.trim()) {
      alert(
        isAr
          ? "يرجى إدخال Access Token و Phone Number ID."
          : "Please enter Access Token and Phone Number ID."
      );
      return;
    }

    setIsConnecting(true);

    try {
      const res = await authenticatedFetch(
        `/api/whatsapp/workspace/${currentWorkspace.id}/connect`,
        {
          method: "POST",
          body: JSON.stringify({
            accessToken: accessToken.trim(),
            phoneNumberId: phoneNumberId.trim(),
            businessAccountId:
              businessAccountId.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "WhatsApp connection failed"
        );
      }

      setServerConnected(true);

      if (data.phoneNumber) {
        setPhoneInput(data.phoneNumber);
      }

      setAccessToken("");

      alert(
        isAr
          ? "تم التحقق من حساب WhatsApp وربطه بنجاح."
          : "WhatsApp account verified and connected successfully."
      );

    } catch (error: any) {
      alert(
        error?.message ||
        (isAr
          ? "تعذر ربط WhatsApp."
          : "Could not connect WhatsApp.")
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const approved = confirm(
      isAr
        ? "هل تريد قطع ربط WhatsApp فعلاً؟"
        : "Are you sure you want to disconnect WhatsApp?"
    );

    if (!approved) return;

    try {
      const res = await authenticatedFetch(
        `/api/whatsapp/workspace/${currentWorkspace.id}/disconnect`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "WhatsApp disconnect failed"
        );
      }

      setServerConnected(false);
      setAccessToken("");
      setPhoneNumberId("");
      setBusinessAccountId("");

      alert(
        isAr
          ? "تم قطع ربط WhatsApp."
          : "WhatsApp disconnected."
      );

    } catch (error: any) {
      alert(
        error?.message ||
        (isAr
          ? "تعذر قطع ربط WhatsApp."
          : "Could not disconnect WhatsApp.")
      );
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMsg.trim() || isBotResponding) return;

    const userText = testMsg.trim();
    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setTestChat((prev) => [...prev, { sender: "user", text: userText, time: userTime }]);
    setTestMsg("");
    setIsBotResponding(true);

    try {
      const res = await authenticatedFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: currentWorkspace,
          customerMessage: userText,
          channel: "whatsapp",
        }),
      });
      const data = await res.json();
      const botReply = data.aiResponse || data.response || (isAr ? "أهلاً بك، يسعدني تقديم المساعدة وتلبية طلبك فوراً!" : "Hello! Happy to assist you right away.");

      setTestChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setTestChat((prev) => [
        ...prev,
        {
          sender: "bot",
          text: isAr
            ? `شكراً لربطك الواتساب مع ${currentWorkspace.name}! البوت جاهز لاستقبال الطلبات والاستفسارات.`
            : `Thank you for connecting WhatsApp! AI Bot is ready to receive requests.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsBotResponding(false);
    }
  };

  const webhookUrl = `https://${window.location.host}/api/whatsapp/webhook/${currentWorkspace.id}`;

  const handleGenerateWebhookToken = async () => {
    setGeneratingWebhookToken(true);

    try {
      const res = await authenticatedFetch(
        `/api/whatsapp/workspace/${currentWorkspace.id}/webhook-token`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
          "Failed to generate webhook verify token"
        );
      }

      setWebhookVerifyToken(
        data.verifyToken || ""
      );

    } catch (error: any) {
      alert(
        error?.message ||
        (isAr
          ? "تعذر إنشاء Verify Token."
          : "Could not generate Verify Token.")
      );
    } finally {
      setGeneratingWebhookToken(false);
    }
  };

  const handleCopyVerifyToken = () => {
    if (!webhookVerifyToken) return;

    navigator.clipboard.writeText(
      webhookVerifyToken
    );

    setCopiedVerifyToken(true);

    setTimeout(
      () => setCopiedVerifyToken(false),
      2500
    );
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              {isAr ? "ربط WhatsApp Cloud API" : "Official WhatsApp Business Cloud API"}
            </span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {isAr ? "الواتساب متصل والبوت نشط" : "WhatsApp Bot Connected & Live"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-bold">
                {isAr ? "في انتظار ربط حساب Meta" : "Awaiting Meta Connection"}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">
            {isAr ? "تفعيل WhatsApp Business Cloud API" : "WhatsApp Cloud API Integration"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr
              ? `اربط حساب WhatsApp Business الخاص بالنشاط "${currentWorkspace.name}" باستخدام بيانات Meta Cloud API لتفعيل الرد الآلي بالذكاء الاصطناعي.`
              : `Connect the WhatsApp Business account for "${currentWorkspace.name}" using Meta Cloud API credentials to activate AI auto-replies.`}
          </p>
        </div>

        {isConnected && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-200 text-xs text-center space-y-1 shrink-0">
            <div className="flex items-center justify-center gap-1.5 font-black text-sm text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <span>{isAr ? "الربط نشط 100%" : "Connected 100%"}</span>
            </div>
            <p className="font-mono font-bold text-white dir-ltr">{currentWorkspace.whatsappPhoneNumber || connectedPhone}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Panel: WhatsApp Cloud API & Status */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Link2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "إعدادات WhatsApp Cloud API" : "WhatsApp Cloud API Connection"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? "أدخل بيانات Meta الرسمية للتحقق من الحساب وتفعيل البوت الذكي" : "Enter your official Meta credentials to verify the account and activate the AI bot"}
                </p>
              </div>
            </div>

            {isConnected ? (
              <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? "متصل" : "Connected"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900">
                <XCircle className="h-4 w-4" />
                <span>{isAr ? "غير متصل" : "Disconnected"}</span>
              </span>
            )}
          </div>

          {!isConnected ? (
            <form
              onSubmit={handleConnectWhatsApp}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr
                      ? "ربط WhatsApp Cloud API الرسمي"
                      : "Connect Official WhatsApp Cloud API"}
                  </h4>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? "أدخل بيانات WhatsApp Business من Meta. سيتم التحقق منها مباشرةً ثم تخزين الـ Access Token بشكل مشفّر داخل FOX ولن يتم عرضه مرة أخرى."
                    : "Enter your WhatsApp Business credentials from Meta. FOX will verify them and store the access token encrypted server-side."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Access Token
                  </label>

                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) =>
                      setAccessToken(e.target.value)
                    }
                    placeholder="EAAG..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />

                  <p className="text-[10px] text-slate-400">
                    {isAr
                      ? "لن يتم حفظ التوكن في المتصفح أو داخل Workspace العادي."
                      : "The token will not be stored in the browser or normal workspace data."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number ID
                  </label>

                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) =>
                      setPhoneNumberId(e.target.value)
                    }
                    placeholder="123456789012345"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    WhatsApp Business Account ID
                  </label>

                  <input
                    type="text"
                    value={businessAccountId}
                    onChange={(e) =>
                      setBusinessAccountId(e.target.value)
                    }
                    placeholder="123456789012345"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isConnecting ||
                  checkingStatus ||
                  !accessToken.trim() ||
                  !phoneNumberId.trim()
                }
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}

                <span>
                  {isConnecting
                    ? isAr
                      ? "جاري التحقق من Meta..."
                      : "Verifying with Meta..."
                    : isAr
                    ? "تحقق واربط WhatsApp"
                    : "Verify & Connect WhatsApp"}
                </span>
              </button>

              <button
                type="button"
                onClick={fetchWhatsAppStatus}
                disabled={checkingStatus}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    checkingStatus ? "animate-spin" : ""
                  }`}
                />

                <span>
                  {isAr
                    ? "تحديث حالة الاتصال"
                    : "Refresh Connection Status"}
                </span>
              </button>
            </form>
          ) : (
            /* CONNECTED STATE PANEL */
            <div className="space-y-6 py-2">
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-950 dark:text-emerald-300">
                      {isAr ? "حساب الواتساب مرتبط بنجاح! 🟢" : "WhatsApp Account Connected!"}
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400">
                      {isAr ? "بوت الذكاء الاصطناعي يعمل الآن للرد الفوري ومتابعة العملاء تلقائياً" : "AI agent is live and responding to customer chats"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block font-sans">{isAr ? "رقم الهاتف المربوط:" : "Connected Phone:"}</span>
                    <span className="font-bold text-slate-900 dark:text-white dir-ltr block text-sm">{currentWorkspace.whatsappPhoneNumber || connectedPhone}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50">
                    <span className="text-[10px] text-slate-400 block font-sans">{isAr ? "جلسة الواتساب:" : "Session Type:"}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">FOX AI WhatsApp Cloud API</span>
                  </div>
                </div>
              </div>

              {/* Connected Control Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={fetchWhatsAppStatus}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>{isAr ? "تحديث حالة الاتصال" : "Refresh Connection Status"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-extrabold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isAr ? "قطع ربط الواتساب" : "Disconnect WhatsApp"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Webhook Endpoint */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-emerald-500" />
              <span>{isAr ? "رابط الـ Webhook التلقائي لرسائل الواتساب" : "WhatsApp Webhook Endpoint"}</span>
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
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedUrl ? (isAr ? "تم النسخ!" : "Copied!") : isAr ? "نسخ" : "Copy"}</span>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {isAr
                    ? "Verify Token الخاص بـ Meta"
                    : "Meta Verify Token"}
                </label>

                <button
                  type="button"
                  onClick={handleGenerateWebhookToken}
                  disabled={generatingWebhookToken}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {generatingWebhookToken
                    ? isAr
                      ? "جاري الإنشاء..."
                      : "Generating..."
                    : webhookVerifyToken
                    ? isAr
                      ? "إعادة إنشاء Token"
                      : "Regenerate Token"
                    : isAr
                    ? "إنشاء Verify Token"
                    : "Generate Verify Token"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookVerifyToken}
                  placeholder={
                    isAr
                      ? "اضغط إنشاء Verify Token"
                      : "Click Generate Verify Token"
                  }
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                />

                <button
                  type="button"
                  onClick={handleCopyVerifyToken}
                  disabled={!webhookVerifyToken}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40"
                >
                  {copiedVerifyToken
                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : <Copy className="h-3.5 w-3.5" />}

                  <span>
                    {copiedVerifyToken
                      ? isAr
                        ? "تم النسخ!"
                        : "Copied!"
                      : isAr
                      ? "نسخ"
                      : "Copy"}
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                {isAr
                  ? "استخدم Callback URL و Verify Token داخل إعدادات Webhooks في Meta. الـVerify Token يتم تخزينه مشفّرًا لكل منشأة."
                  : "Use the Callback URL and Verify Token in Meta Webhooks settings. The Verify Token is stored encrypted per workspace."}
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions & WhatsApp Sandbox */}
        <div className="lg:col-span-5 space-y-6">
          {/* Instructions Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <HelpCircle className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isAr ? "خطوات ربط WhatsApp Cloud API:" : "How to connect WhatsApp Cloud API:"}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-black text-white text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "افتح Meta for Developers / WhatsApp Business" : "Open Meta for Developers / WhatsApp Business"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr ? "اختر تطبيق Meta والنشاط التجاري المرتبط بحساب WhatsApp Business" : "Select your Meta app and linked WhatsApp Business account"}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-black text-white text-[11px]">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "احصل على Access Token و Phone Number ID" : "Get your Access Token and Phone Number ID"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr ? "أدخل البيانات في FOX ثم اضغط تحقق واربط WhatsApp" : "Enter the credentials in FOX and click Verify & Connect WhatsApp"}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3 items-start p-3 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-black text-white text-[11px]">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {isAr ? "سيقوم FOX بالتحقق من البيانات مباشرة مع Meta" : "FOX will verify the credentials directly with Meta"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr ? "بعد نجاح التحقق سيتم تشفير التوكن وتفعيل الاتصال." : "After successful verification, the token is encrypted and the connection is activated."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live WhatsApp Chat Tester */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500" />
                <span>{isAr ? "مُحاكي رسائل الواتساب المباشرة" : "WhatsApp Live AI Tester"}</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                Gemini AI Engine
              </span>
            </div>

            {/* Chat Messages Display */}
            <div className="h-56 overflow-y-auto p-3 bg-slate-950 rounded-2xl space-y-3 font-sans border border-slate-800 text-xs dir-ltr">
              {testChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl shadow-sm text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[9px] text-slate-300/70 mt-1 block text-right font-mono">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              {isBotResponding && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{isAr ? "الذكاء الاصطناعي يكتب الرد عبر الواتساب..." : "WhatsApp AI typing reply..."}</span>
                </div>
              )}
            </div>

            {/* Test Input Form */}
            <form onSubmit={handleSendTestMessage} className="flex gap-2">
              <input
                type="text"
                placeholder={isAr ? "أرسل رسالة تجريبية كعميل واتساب..." : "Type test WhatsApp customer msg..."}
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isBotResponding || !testMsg.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isAr ? "إرسال" : "Send"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
