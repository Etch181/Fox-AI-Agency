import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Workflow, Play, CheckCircle2, Clock, Zap, ArrowRight, Globe } from "lucide-react";

export const AdminN8nWorkflows: React.FC = () => {
  const { n8nWorkflows, addToast, language } = useApp();
  const isAr = language === "ar";
  const [runningWfId, setRunningWfId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("/api/n8n/webhook");

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
