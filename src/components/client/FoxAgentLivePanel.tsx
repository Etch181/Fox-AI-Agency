import React, { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, Clock3, RefreshCw, Workflow, XCircle, Zap } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { authenticatedFetch } from "../../services/authenticatedFetch";

type Agent = { id:string; name:string; role:string; status:string; description:string; lastExecutionAt?:string|null; lastExecutionStatus?:string|null; successCount:number; failureCount:number };
type ActivityItem = { id:string; agentId:string; taskId?:string|null; type:string; message:string; severity:string; createdAt:string };

export const FoxAgentLivePanel: React.FC = () => {
  const { currentUser, currentWorkspace, language } = useApp();
  const [agents,setAgents]=useState<Agent[]>([]);
  const [activities,setActivities]=useState<ActivityItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const isAr=language === "ar";

  const load=async()=>{
    if(!currentWorkspace || !currentUser || !["super_admin","client_owner"].includes(currentUser.role)) return;
    setLoading(true); setError(false);
    try{
      const res=await authenticatedFetch(`/api/agents/activity?workspaceId=${encodeURIComponent(currentWorkspace.id)}`);
      if(!res.ok) throw new Error("agent_activity_unavailable");
      const data=await res.json();
      setAgents(Array.isArray(data.agents)?data.agents:[]);
      setActivities(Array.isArray(data.activities)?data.activities:[]);
    }catch{ setError(true); } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); const timer=window.setInterval(load,20000); return()=>window.clearInterval(timer); },[currentWorkspace?.id,currentUser?.role]);
  if(!currentWorkspace || !currentUser || !["super_admin","client_owner"].includes(currentUser.role)) return null;

  const agentMap=new Map(agents.map(a=>[a.id,a]));
  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><Bot className="h-6 w-6"/></div>
        <div><div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-900 dark:text-white">FOX AI AGENTS</h2><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600">LIVE</span></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAr?"الوكلاء المتخصصون وحالة التنفيذ الفعلية لمساحة العمل":"Specialized agents and real execution status for this workspace"}</p></div>
      </div>
      <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>{isAr?"تحديث":"Refresh"}</button>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agents.map(agent=>{const ok=agent.status==="active"&&agent.lastExecutionStatus!=="failed"; return <div key={agent.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900 dark:text-white">{agent.name}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{agent.role}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${ok?"bg-emerald-500/10 text-emerald-600":"bg-rose-500/10 text-rose-600"}`}>{ok?(isAr?"نشط":"ACTIVE"):(isAr?"مشكلة":"ATTENTION")}</span></div>
        <p className="mt-3 min-h-8 text-[11px] leading-5 text-slate-500">{agent.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="text-slate-400">{isAr?"نجاح":"Success"}</span><b className="ml-1 text-emerald-600">{agent.successCount}</b></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="text-slate-400">{isAr?"فشل":"Failed"}</span><b className="ml-1 text-rose-600">{agent.failureCount}</b></div></div>
      </div>})}
    </div>

    <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
      <div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-orange-400"/><span className="text-xs font-black">{isAr?"مسار التنفيذ":"Execution Flow"}</span></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-300"><span>Customer Event</span><Zap className="h-3 w-3 text-orange-400"/><span>FOX Router</span><Zap className="h-3 w-3 text-orange-400"/><span>Specialized Agent</span><Zap className="h-3 w-3 text-orange-400"/><span>Action / Tool</span><Zap className="h-3 w-3 text-orange-400"/><span>CRM</span><Zap className="h-3 w-3 text-orange-400"/><span>Follow-up</span></div>
    </div>

    <div className="mt-5"><div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500"/><h3 className="text-xs font-black text-slate-900 dark:text-white">{isAr?"آخر نشاط فعلي":"Recent live activity"}</h3></div>
      {error?<p className="rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-600">{isAr?"تعذر قراءة نشاط الوكلاء حالياً":"Agent activity is unavailable right now"}</p>:activities.length===0?<p className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500 dark:bg-slate-800">{isAr?"لا توجد عمليات فعلية مسجلة حتى الآن — لن يتم عرض بيانات وهمية.":"No real executions recorded yet — no synthetic activity is shown."}</p>:<div className="space-y-2">{activities.slice(0,6).map(item=><div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><div className="mt-0.5">{item.type.includes("failed")?<XCircle className="h-4 w-4 text-rose-500"/>:item.type.includes("completed")?<CheckCircle2 className="h-4 w-4 text-emerald-500"/>:<Clock3 className="h-4 w-4 text-amber-500"/>}</div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{item.message}</p><p className="mt-1 text-[9px] text-slate-400">{agentMap.get(item.agentId)?.name || item.agentId} · {new Date(item.createdAt).toLocaleString()}</p></div></div>)}</div>}
    </div>
  </section>;
};
