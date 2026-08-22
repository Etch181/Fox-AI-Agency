import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Zap,
  CheckCircle2,
  Play,
  FileSpreadsheet,
  Workflow,
  Send,
  Terminal,
  Clock,
  Check,
  Copy,
  Trash2,
  Code2,
  AlertCircle,
  Globe,
  Radio,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface WebhookLogEntry {
  id: string;
  timestamp: string;
  event: string;
  targetUrl: string;
  statusCode: number;
  durationMs: number;
  requestPayload: any;
  responsePayload: any;
  status: "success" | "error" | "failed";
}

export const ClientN8n: React.FC = () => {
  const { currentWorkspace, addToast, language } = useApp();
  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  // Custom Webhook Endpoint URL
  const [webhookUrl, setWebhookUrl] = useState("/api/n8n/webhook");
  const [selectedPreset, setSelectedPreset] = useState("crm_lead_created");

  // Pre-configured JSON sample payloads based on workspace
  const getPresetPayload = (preset: string) => {
    switch (preset) {
      case "crm_lead_created":
        return JSON.stringify(
          {
            event: "crm_lead_created",
            workspaceId: currentWorkspace.id,
            workspaceName: currentWorkspace.name,
            lead: {
              id: `lead_${Math.random().toString(36).substring(2, 7)}`,
              name: isAr ? "أحمد المحمدي" : "Ahmed El-Mohamady",
              phone: "+20 100 123 4567",
              email: "ahmed.customer@gmail.com",
              channel: "WhatsApp",
              status: "New",
              notes: "Interested in Fox Business Plan for Clinic AI Assistant",
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      case "appointment_scheduled":
        return JSON.stringify(
          {
            event: "appointment_scheduled",
            workspaceId: currentWorkspace.id,
            workspaceName: currentWorkspace.name,
            appointment: {
              id: `apt_${Math.random().toString(36).substring(2, 7)}`,
              customerName: isAr ? "د. سارة فؤاد" : "Dr. Sara Fouad",
              phone: "+20 122 888 9999",
              doctorName: isAr ? "د. سامح نادر" : "Dr. Sameh Nader",
              specialty: isAr ? "طب الأسنان" : "Dentistry",
              date: new Date().toISOString().split("T")[0],
              time: "06:30 PM",
              consultationFeeEGP: 450,
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      case "customer_complaint_escalated":
        return JSON.stringify(
          {
            event: "customer_complaint_escalated",
            workspaceId: currentWorkspace.id,
            workspaceName: currentWorkspace.name,
            complaint: {
              id: `cmp_${Math.random().toString(36).substring(2, 7)}`,
              customerName: isAr ? "م. محمود طاهر" : "Eng. Mahmoud Taher",
              phone: "+20 111 222 3333",
              complaintText: "Delay in order delivery and response on WhatsApp",
              severity: "High",
              escalatedToAdmin: true,
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      case "payment_received":
        return JSON.stringify(
          {
            event: "payment_received",
            workspaceId: currentWorkspace.id,
            workspaceName: currentWorkspace.name,
            payment: {
              txRef: "INSTAPAY-TX-88291",
              amountEGP: 1000,
              planId: "business",
              paymentMethod: "Instapay Egypt",
              status: "approved",
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
      default:
        return JSON.stringify(
          {
            event: "custom_payload",
            workspaceId: currentWorkspace.id,
            data: { customField: "sample_value", active: true },
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );
    }
  };

  const [payloadJson, setPayloadJson] = useState<string>(() => getPresetPayload("crm_lead_created"));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const newJson = getPresetPayload(preset);
    setPayloadJson(newJson);
    setJsonError(null);
  };

  const handleJsonChange = (val: string) => {
    setPayloadJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadJson);
      setPayloadJson(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      addToast(isAr ? "تم تنسيق الـ JSON بنجاح" : "JSON formatted successfully", "info");
    } catch {
      addToast(isAr ? "تعذر تنسيق كود JSON غير صالح" : "Cannot format invalid JSON", "error");
    }
  };

  const handleSendWebhook = async () => {
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch {
      setJsonError("Invalid JSON payload");
      addToast(isAr ? "يرجى تصحيح أخطاء الـ JSON قبل الإرسال" : "Fix JSON errors before sending", "error");
      return;
    }

    setIsSending(true);
    const logId = `log_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const bodyPayload: any = {
        event: parsedPayload.event || selectedPreset,
        payload: parsedPayload,
      };

      if (webhookUrl.trim() && webhookUrl.trim() !== "/api/n8n/webhook") {
        bodyPayload.customWebhookUrl = webhookUrl.trim();
      }

      const res = await fetch("/api/n8n/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const resData = await res.json();

      const newEntry: WebhookLogEntry = {
        id: logId,
        timestamp: new Date().toLocaleTimeString(),
        event: parsedPayload.event || selectedPreset,
        targetUrl: webhookUrl.trim() || "/api/n8n/webhook",
        statusCode: resData.statusCode || res.status,
        durationMs: resData.durationMs || 25,
        requestPayload: parsedPayload,
        responsePayload: resData,
        status: res.ok && resData.status !== "failed" && resData.status !== "error" ? "success" : "error",
      };

      setLogs((prev) => [newEntry, ...prev]);

      if (newEntry.status === "success") {
        addToast(
          isAr
            ? `تم إرسال Trigger الـ n8n بنجاح! Execution ID: ${resData.executionId}`
            : `n8n webhook triggered! Execution ID: ${resData.executionId}`,
          "success"
        );
      } else {
        addToast(isAr ? "فشل إرسال التريجر إلى n8n" : "n8n Webhook trigger failed", "error");
      }
    } catch (err: any) {
      const failedEntry: WebhookLogEntry = {
        id: logId,
        timestamp: new Date().toLocaleTimeString(),
        event: selectedPreset,
        targetUrl: webhookUrl,
        statusCode: 500,
        durationMs: 0,
        requestPayload: parsedPayload,
        responsePayload: { error: err.message || "Network Error" },
        status: "failed",
      };
      setLogs((prev) => [failedEntry, ...prev]);
      addToast(isAr ? "خطأ في الاتصال بالسيرفر" : "Network connection error", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLog = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    addToast(isAr ? "تم نسخ نتيجة الرد إلى الحافظة" : "Response payload copied", "info");
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    addToast(isAr ? "تم مسح سجلات الاختبارات" : "Test logs cleared", "info");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-extrabold uppercase flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> n8n Automation Engine
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
            {isAr ? "مركز أتمتة واختبار Webhooks لـ n8n" : "n8n Webhook Testing Hub & Live Console"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">
            {isAr
              ? `قم باختبار الاتصال بسيرفر n8n الخاص بمساحة عمل (${currentWorkspace.name})، وإرسال حمولات JSON تجريبية، ومشاهدة سجل الاستجابة اللحظية.`
              : `Test webhook endpoints for ${currentWorkspace.name}, send trigger JSON payloads, and inspect real-time execution logs.`}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="rounded-2xl bg-slate-800/80 p-3.5 border border-slate-700/80 text-right dir-ltr">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>n8n Status: ONLINE</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Workspace: {currentWorkspace.id}
            </div>
          </div>
        </div>
      </div>

      {/* Main Testing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Webhook Config & Sample Payload Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? "إعدادات تريجر الـ Webhook" : "Webhook Trigger Configuration"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr ? "حدد رابط الـ Webhook ونوع الحدث المراد اختباره" : "Set target webhook URL and sample trigger event"}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Webhook URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-amber-500" />
                  {isAr ? "رابط نقطة النهاية (Webhook URL):" : "Target Webhook Endpoint URL:"}
                </span>
                <button
                  type="button"
                  onClick={() => setWebhookUrl("/api/n8n/webhook")}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                >
                  {isAr ? "اعتماد السيرفر الافتراضي" : "Reset to Default"}
                </button>
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.your-domain.com/webhook/..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>

            {/* Event Preset Selector Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? "نماذج الأحداث الجاهزة (Trigger Presets):" : "Select Sample Event Preset:"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "crm_lead_created", labelAr: "عميل جديد CRM", labelEn: "New Lead Created" },
                  { id: "appointment_scheduled", labelAr: "حجز موعد جديد", labelEn: "Appointment Scheduled" },
                  { id: "customer_complaint_escalated", labelAr: "تصعيد شكوى عميل", labelEn: "Complaint Escalated" },
                  { id: "payment_received", labelAr: "تأكيد الدفع Instapay", labelEn: "Payment Received" },
                  { id: "custom_payload", labelAr: "حملة مخصصة Custom", labelEn: "Custom Payload" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePresetChange(item.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition text-right sm:text-center border ${
                      selectedPreset === item.id
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isAr ? item.labelAr : item.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Code Editor Box */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-amber-500" />
                  {isAr ? "محتوى الحمولة (JSON Trigger Payload):" : "Trigger Request JSON Payload:"}
                </label>
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2.5 py-1 rounded-lg transition"
                >
                  {isAr ? "تنسيق الـ JSON ✨" : "Prettify JSON ✨"}
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950 p-3">
                <textarea
                  value={payloadJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  rows={10}
                  className="w-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y"
                  spellCheck={false}
                />
              </div>

              {jsonError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            {/* Send Trigger Action Button */}
            <button
              onClick={handleSendWebhook}
              disabled={isSending || !!jsonError}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{isAr ? "جاري إرسال التريجر إلى n8n..." : "Sending Trigger Payload..."}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>{isAr ? "إرسال وتجربة الـ Webhook الآن" : "Send & Test Webhook Payload"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Execution Response Console & Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? "سجل استجابة n8n اللحظية" : "Live Execution Response Logs"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr ? "مراقبة حالة الرد وسرعة الاستجابة بالمللي ثانية" : "Monitor HTTP status, duration, and output"}
                  </p>
                </div>
              </div>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition"
                  title={isAr ? "مسح السجلات" : "Clear logs"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Logs List Area */}
            {logs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400">
                  <Play className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "لا توجد سجلات اختبار بعد" : "No webhook executions recorded yet"}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {isAr
                      ? "اضغط على زر (إرسال وتجربة الـ Webhook) لإطلاق حمولة تجريبية وعرض النتيجة هنا."
                      : "Click 'Send & Test Webhook Payload' to send a request and view live response details."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[580px] pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 space-y-3 shadow-sm text-white"
                  >
                    {/* Log Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            log.status === "success"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {log.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          HTTP {log.statusCode}
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono">
                          {log.event}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          {log.durationMs}ms
                        </span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    {/* Target Endpoint string */}
                    <div className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-left">
                      📍 URL: {log.targetUrl}
                    </div>

                    {/* Response Payload Code Block */}
                    <div className="relative group bg-slate-900 rounded-xl p-3 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                        <span>RESPONSE JSON OUTPUT:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLog(log.id, JSON.stringify(log.responsePayload, null, 2))}
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition"
                        >
                          {copiedLogId === log.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedLogId === log.id ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ الرد" : "Copy")}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed overflow-x-auto max-h-48 scrollbar-thin">
                        {JSON.stringify(log.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
