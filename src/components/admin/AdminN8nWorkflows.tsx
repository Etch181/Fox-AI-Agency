import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { Workflow, Play, CheckCircle2, Clock, Zap, ArrowRight, Globe, ExternalLink, Bot } from "lucide-react";

export const AdminN8nWorkflows: React.FC = () => {
  const { n8nWorkflows, addToast, language } = useApp();
  const isAr = language === "ar";
  const [runningWfId, setRunningWfId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("/api/n8n/webhook");
  const [runtimeStatus, setRuntimeStatus] = useState<any>(null);
  const [n8nUrl, setN8nUrl] = useState("");
  const [showConsole, setShowConsole] = useState(false);
  useEffect(() => {
    authenticatedFetch("/api/n8n/status").then((r) => r.json()).then(setRuntimeStatus).catch(() => setRuntimeStatus(null));
    authenticatedFetch("/api/admin/infrastructure").then((r) => r.json()).then((d) => {
      const service = Array.isArray(d.services) ? d.services.find((x: any) => x.id === "n8n") : null;
      if (service?.url) setN8nUrl(service.url);
    }).catch(() => setN8nUrl(""));
  }, []);

  const handleRunTest = async (wf: any) => {
    setRunningWfId(wf.id);
    try {
      const bodyPayload: any = {
        event: wf.triggerEvent,
        payload: { testSource: "Super Admin Console", timestamp: new Date().toISOString() },
      };
      
      if (webhookUrl.trim() && webhookUrl.trim() !== "/api/n8n/webhook") {
        bodyPayload.customWebhookUrl = webhookUrl.trim();
      }

      const res = await fetch("/api/n8n/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error" || data.status === "failed") {
        throw new Error(data.error || "Failed");
      }
      addToast(
        isAr
          ? `تم تشغيل الويب هوك بنجاح! رقم التنفيذ: ${data.executionId || "N/A"}`
          : `n8n Trigger Success! Execution ID: ${data.executionId || "N/A"}`,
        "success"
      );
    } catch {
      addToast(
        isAr ? "فشل تشغيل ويب هوك n8n" : "Failed to trigger n8n webhook",
        "error"
      );
    } finally {
      setRunningWfId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <Workflow className="h-6 w-6 text-amber-500" />
            {isAr ? "ملاحة وأتمتة n8n والـ Webhooks" : "n8n Automation Engine & Webhooks"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "أتمتة إشعارات واتساب وتليجرام وحجوزات العيادات وإشعار السداد ومزامنة Google Sheets CRM."
              : "Automate WhatsApp, Telegram, Appointments, Payment Notifications, and Google Sheets CRM Sync."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-700 to-indigo-700 p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><p className="text-xs font-black uppercase tracking-wider">FOX Live n8n</p></div>
            <h2 className="mt-1 text-lg font-black">{isAr ? "محرك n8n الحقيقي" : "Live n8n Automation Console"}</h2>
            <p className="mt-1 text-[11px] text-white/75">{isAr ? "وصول Super Admin فقط — افتح الـ Editor الحقيقي وشاهد الـ Workflows والـ Executions." : "Super Admin only — open the real editor to inspect workflows and executions."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowConsole((v) => !v)} disabled={!n8nUrl} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-black hover:bg-white/25 disabled:opacity-40"><Workflow className="h-4 w-4" />{showConsole ? (isAr ? "إخفاء n8n" : "Hide n8n") : (isAr ? "فتح n8n داخل FOX" : "Open n8n in FOX")}</button>
            {n8nUrl && <a href={n8nUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-indigo-700"><ExternalLink className="h-4 w-4" />{isAr ? "فتح في تبويب" : "Open tab"}</a>}
          </div>
        </div>
      </div>
      {showConsole && n8nUrl && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-[10px] font-black text-slate-400"><span>n8n Editor</span><span>{n8nUrl}</span></div>
          <iframe title="FOX n8n Editor" src={n8nUrl} className="h-[720px] w-full border-0 bg-white" allow="clipboard-read; clipboard-write" />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">FOX ↔ n8n Runtime</p>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{runtimeStatus?.status === "online" ? (isAr ? "متصل فعلياً" : "Connected") : runtimeStatus?.status === "disabled" ? (isAr ? "معطل" : "Disabled") : (isAr ? "غير مكتمل التهيئة" : "Not fully configured")}</p>
            <p className="mt-1 text-[11px] text-slate-500">{runtimeStatus?.message || (isAr ? "جاري قراءة حالة الربط من الخادم" : "Reading live integration status from the server")}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-black ${runtimeStatus?.status === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{runtimeStatus?.status || "CHECKING"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-2">
          <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-amber-500" />
              {isAr ? "رابط نقطة النهاية (Webhook URL) لاختبار أتمتة n8n:" : "Target Webhook Endpoint URL for n8n Automation:"}
            </span>
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://n8n.your-domain.com/webhook/..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            {isAr ? "قم بإدخال رابط Webhook الخاص بسيرفر n8n الخاص بك لاختبار الإرسال مباشرة من لوحة الإدارة." : "Enter your custom n8n webhook URL to test trigger payloads directly from the admin panel."}
          </p>
        </div>
        {n8nWorkflows.map((wf) => (
          <div
            key={wf.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase">
                  {wf.triggerEvent}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> {isAr ? "نشط" : wf.status}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">
                {wf.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {wf.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                {wf.executionsCount} {isAr ? "تنفيذ" : "runs"}
              </span>
              <button
                onClick={() => handleRunTest(wf)}
                disabled={runningWfId === wf.id}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {runningWfId === wf.id
                  ? isAr
                    ? "جار التشغيل..."
                    : "Executing..."
                  : isAr
                  ? "اختبار الويب هوك"
                  : "Test Trigger"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
