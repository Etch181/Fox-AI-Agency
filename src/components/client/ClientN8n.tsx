import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Bot, Activity, Clock3, ShieldCheck, RefreshCw, LockKeyhole } from "lucide-react";

type Agent = { id: string; name: string; role: string; status: string; description?: string; lastExecutionAt?: string; lastExecutionStatus?: string; successCount?: number; failureCount?: number };
type ActivityItem = { id: string; agentId?: string; type: string; message: string; severity?: string; createdAt: string };

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  "product-developer": { ar: "تطوير المنتج", en: "Product Development" },
  "sales": { ar: "المبيعات", en: "Sales" },
  "customer-support": { ar: "خدمة العملاء", en: "Customer Support" },
  "marketing": { ar: "التسويق", en: "Marketing" },
  "monitoring": { ar: "المراقبة", en: "Monitoring" },
  "knowledge": { ar: "إدارة المعرفة", en: "Knowledge" },
};

export const ClientN8n: React.FC = () => {
  const { currentWorkspace, currentUser, language, addToast } = useApp();
  const isAr = language === "ar";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/activity?workspaceId=${encodeURIComponent(currentWorkspace.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load agent activity");
      setAgents(Array.isArray(data.agents) ? data.agents : []);
      setActivities(Array.isArray(data.activities) ? data.activities : []);
    } catch (error: any) {
      addToast(isAr ? "تعذر تحميل حالة الـ Agents" : "Could not load agent status", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentWorkspace?.id]);

  if (!currentWorkspace || currentUser?.role === "staff") return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center"><Bot className="h-6 w-6 text-violet-500" /></div>
            <div><h2 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? "وكلاء FOX الذكيون" : "FOX AI Agents"}</h2>
              <p className="text-sm text-slate-500 mt-1">{isAr ? "تابع الوكلاء والمهام التي ينفذونها. إدارة n8n متاحة للـ Super Admin فقط." : "Monitor your agents and their work. n8n administration is restricted to Super Admin."}</p></div>
          </div>
          <button onClick={load} disabled={loading} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-violet-500"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600"><ShieldCheck className="h-4 w-4" />{isAr ? "عرض فقط — لا يوجد تحكم في workflows" : "Read-only — workflow controls are unavailable"}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const label = ROLE_LABELS[agent.role]?.[isAr ? "ar" : "en"] || agent.role;
          const running = agent.status === "running";
          return <div key={agent.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between"><span className={`h-2.5 w-2.5 rounded-full ${running ? "bg-amber-500 animate-pulse" : agent.status === "error" ? "bg-red-500" : "bg-emerald-500"}`} />
              <span className="text-[10px] font-black uppercase text-slate-400">{label}</span></div>
            <h3 className="mt-3 font-black text-slate-900 dark:text-white">{agent.name.replace(/^FOX-/, "")}</h3>
            <p className="mt-1 text-xs text-slate-500 min-h-8">{agent.description || label}</p>
            <div className="mt-4 flex items-center justify-between text-[11px] font-bold"><span className={running ? "text-amber-600" : "text-emerald-600"}>{running ? (isAr ? "يعمل الآن" : "Running") : (isAr ? "جاهز" : "Ready")}</span><span className="text-slate-400">✓ {agent.successCount || 0} / ✕ {agent.failureCount || 0}</span></div>
          </div>;
        })}
        {!loading && agents.length === 0 && <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{isAr ? "لا توجد بيانات Agents مسجلة بعد." : "No agent registry data is available yet."}</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3"><Activity className="h-5 w-5 text-violet-500" /><div><h3 className="font-black text-slate-900 dark:text-white">{isAr ? "آخر نشاط للوكلاء" : "Recent Agent Activity"}</h3><p className="text-xs text-slate-500">{isAr ? "الأحداث الخاصة بمنشأتك فقط" : "Only activity associated with this workspace"}</p></div></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activities.map((item) => <div key={item.id} className="p-4 flex items-start gap-3"><Clock3 className="h-4 w-4 text-slate-400 mt-0.5" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.message}</p><p className="text-[10px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}</p></div></div>)}
          {!loading && activities.length === 0 && <div className="p-8 text-center text-sm text-slate-500">{isAr ? "لا يوجد نشاط مسجل لمنشأتك حتى الآن." : "No activity recorded for this workspace yet."}</div>}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white p-5 flex gap-3 items-start"><LockKeyhole className="h-5 w-5 text-amber-400 mt-0.5" /><div><p className="font-black text-sm">{isAr ? "n8n Engine محمي" : "n8n Engine Protected"}</p><p className="text-xs text-slate-300 mt-1">{isAr ? "صاحب المنشأة يرى حالة الوكلاء ونتائج أعمالهم فقط. لا توجد واجهة لتعديل أو تشغيل أو حذف workflows." : "Workspace owners can see agent status and outcomes only. There is no workflow edit, run, or delete control."}</p></div></div>
    </div>
  );
};
