import React, { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { useApp } from "../../context/AppContext";

export const AdminAgentCenter: React.FC = () => {
  const { language, workspaces } = useApp();
  const isAr = language === "ar";
  const [workspaceId, setWorkspaceId] = useState("");
  const [data, setData] = useState<any>({ agents: [], activities: [] });
  const [loading, setLoading] = useState(false);

  const activeWorkspace = useMemo(() => workspaces.find((w: any) => w.id === workspaceId), [workspaces, workspaceId]);

  useEffect(() => {
    if (!workspaceId && workspaces[0]?.id) setWorkspaceId(workspaces[0].id);
  }, [workspaceId, workspaces]);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/agents/activity?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (!res.ok) throw new Error("failed");
      setData(await res.json());
    } catch {
      setData({ agents: [], activities: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [workspaceId]);

  const agents = Array.isArray(data.agents) ? data.agents : [];
  const activities = Array.isArray(data.activities) ? data.activities : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-700 to-indigo-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider"><Bot className="h-3.5 w-3.5" /> FOX Agents</span>
            <h1 className="mt-3 text-2xl font-black">{isAr ? "مركز الوكلاء الحي" : "Live Agent Center"}</h1>
            <p className="mt-1 text-xs font-medium text-white/80">{isAr ? "شاهد الوكلاء والتنفيذات الفعلية من داخل FOX بدون بيانات وهمية." : "Inspect real agent registrations and execution activity from inside FOX — no demo telemetry."}</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-black hover:bg-white/25"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{isAr ? "تحديث" : "Refresh"}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">{isAr ? "المنشأة" : "Workspace"}</label>
        <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white">
          {workspaces.map((w: any) => <option key={w.id} value={w.id}>{w.name || w.id}</option>)}
        </select>
        {activeWorkspace && <p className="mt-2 text-[10px] text-slate-400">{activeWorkspace.industry || "Business"} · {activeWorkspace.planId || "plan"}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {agents.map((agent: any) => {
          const ok = agent.lastExecutionStatus !== "failed";
          return <div key={agent.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><Bot className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-slate-900 dark:text-white">{agent.name}</h2><p className="text-[10px] text-slate-400">{agent.role}</p></div></div>
              {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[9px] text-slate-400">Success</p><p className="text-sm font-black">{agent.successCount ?? 0}</p></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[9px] text-slate-400">Failures</p><p className="text-sm font-black">{agent.failureCount ?? 0}</p></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><p className="text-[9px] text-slate-400">Status</p><p className="text-sm font-black">{agent.status || "-"}</p></div></div>
            <p className="mt-3 text-[10px] text-slate-400">{agent.lastExecutionAt ? new Date(agent.lastExecutionAt).toLocaleString() : (isAr ? "لم ينفذ بعد" : "No execution yet")}</p>
          </div>;
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-black">{isAr ? "آخر التنفيذات" : "Recent executions"}</h2></div>
        {activities.length === 0 ? <p className="text-xs text-slate-400">{isAr ? "لا توجد تنفيذات مسجلة لهذه المنشأة حتى الآن." : "No recorded executions for this workspace yet."}</p> : <div className="space-y-2">{activities.slice(0, 20).map((a: any) => <div key={a.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><Clock3 className="mt-0.5 h-4 w-4 text-slate-400" /><div className="min-w-0"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.message}</p><p className="text-[10px] text-slate-400">{a.type} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</p></div></div>)}</div>}
      </div>
    </div>
  );
};
