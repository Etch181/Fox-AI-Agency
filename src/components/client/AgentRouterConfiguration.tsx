import React, { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Bot, CheckCircle2, GitMerge, Save, Route, ShieldCheck, UserRound } from "lucide-react";
import type { WorkspaceAgentId, WorkspaceAgentRouting } from "../../types";

const AGENTS: Array<{ id: WorkspaceAgentId; ar: string; en: string; description: string }> = [
  { id: "sales", ar: "وكيل المبيعات", en: "Sales Agent", description: "تأهيل العملاء، المنتجات، الأسعار ونية الشراء." },
  { id: "customer-support", ar: "وكيل خدمة العملاء", en: "Customer Support", description: "الاستفسارات، الدعم وحل المشاكل." },
  { id: "marketing", ar: "وكيل التسويق", en: "Marketing Agent", description: "المحتوى، الحملات والمتابعة التسويقية." },
  { id: "knowledge", ar: "وكيل المعرفة", en: "Knowledge Agent", description: "إجابات مبنية على معرفة المنشأة المعتمدة." },
  { id: "clinic-appointments", ar: "وكيل حجوزات العيادة", en: "Clinic Appointments", description: "الحجز، المواعيد، الإلغاء وإعادة الجدولة." },
  { id: "complaints-suggestions", ar: "وكيل الشكاوى", en: "Complaints & Suggestions", description: "تصنيف الشكاوى، الأولوية والتصعيد." },
  { id: "pharmacy-sales", ar: "وكيل مبيعات الصيدلية", en: "Pharmacy Sales", description: "الأدوية، التوفر والبدائل مع قيود الوصفات." },
  { id: "retail-sales", ar: "وكيل مبيعات التجزئة", en: "Retail Sales", description: "المنتجات، المخزون ونية الطلب." },
  { id: "restaurant-operations", ar: "وكيل المطعم", en: "Restaurant Operations", description: "المنيو، الحجوزات ونية الطلب." },
  { id: "course-center", ar: "وكيل مركز التدريب", en: "Course Center", description: "الكورسات، المواعيد، الأسعار والتسجيل." },
];

const defaults = (industry?: string): WorkspaceAgentRouting => {
  const map: Record<string, WorkspaceAgentId[]> = {
    Clinic: ["clinic-appointments", "customer-support", "complaints-suggestions", "sales", "marketing"],
    Pharmacy: ["pharmacy-sales", "customer-support", "complaints-suggestions", "sales", "marketing"],
    Restaurant: ["restaurant-operations", "sales", "customer-support", "complaints-suggestions", "marketing"],
    Retail: ["retail-sales", "sales", "customer-support", "complaints-suggestions", "marketing"],
    "Course Center": ["course-center", "sales", "customer-support", "complaints-suggestions", "marketing"],
    "Small Business": ["sales", "customer-support", "complaints-suggestions", "marketing"],
  };
  const enabledAgents = map[industry || ""] || ["customer-support", "sales"];
  return {
    enabledAgents,
    primaryAgent: enabledAgents[0],
    agentPriorities: Object.fromEntries(enabledAgents.map((id, i) => [id, 100 - i * 10])),
    routingMode: "hybrid",
    humanHandoffEnabled: true,
    autoResumeEnabled: true,
    handoffTriggers: ["low_confidence", "customer_requests_human", "agent_error", "policy_required"],
  };
};

export const AgentRouterConfiguration: React.FC = () => {
  const { currentWorkspace, updateAISettings, language, addToast } = useApp();
  const isAr = language === "ar";
  const initial = useMemo(() => currentWorkspace?.agentRouting || defaults(currentWorkspace?.industry), [currentWorkspace]);
  const [routing, setRouting] = useState<WorkspaceAgentRouting>(initial);
  const [routerPrompt, setRouterPrompt] = useState(currentWorkspace?.aiSettings?.routerPrompt || "");
  const [salesKeywords, setSalesKeywords] = useState(currentWorkspace?.aiSettings?.salesKeywords || "سعر، شراء، حجز، بكام, price, book, buy");
  const [supportKeywords, setSupportKeywords] = useState(currentWorkspace?.aiSettings?.supportKeywords || "شكوى، مشكلة، استفسار, complaint, issue, help");
  const [marketingKeywords, setMarketingKeywords] = useState(currentWorkspace?.aiSettings?.marketingKeywords || "عروض، خصم، جديد, offer, discount, new");

  if (!currentWorkspace) return null;

  const toggleAgent = (id: WorkspaceAgentId) => {
    setRouting((prev) => {
      const enabled = prev.enabledAgents.includes(id)
        ? prev.enabledAgents.filter((agent) => agent !== id)
        : [...prev.enabledAgents, id];
      if (!enabled.length) return prev;
      const primaryAgent = enabled.includes(prev.primaryAgent) ? prev.primaryAgent : enabled[0];
      return { ...prev, enabledAgents: enabled, primaryAgent };
    });
  };

  const setPrimary = (id: WorkspaceAgentId) => setRouting((prev) => ({ ...prev, primaryAgent: id, enabledAgents: prev.enabledAgents.includes(id) ? prev.enabledAgents : [...prev.enabledAgents, id] }));
  const setPriority = (id: WorkspaceAgentId, value: number) => setRouting((prev) => ({ ...prev, agentPriorities: { ...prev.agentPriorities, [id]: value } }));

  const handleSave = () => {
    updateAISettings(currentWorkspace.id, {
      routerPrompt, salesKeywords, supportKeywords, marketingKeywords,
      agentRouting: { ...routing, updatedAt: new Date().toISOString() },
    });
    addToast(isAr ? "تم ربط المنشأة بالـAgents وحفظ التوجيه الفعلي" : "Workspace agents and routing saved", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><GitMerge className="h-5 w-5 text-indigo-500" />{isAr ? "توجيه وربط الـAgents" : "Agent Assignment & Routing"}</h3>
          <p className="mt-1 text-xs text-slate-500">{isAr ? `المنشأة: ${currentWorkspace.name} • ${currentWorkspace.industry}` : `Workspace: ${currentWorkspace.name} • ${currentWorkspace.industry}`}</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Save className="h-4 w-4" />{isAr ? "حفظ الربط" : "Save Assignment"}</button>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
        <div className="flex gap-3"><Route className="h-5 w-5 text-indigo-500 shrink-0" /><div><b>{isAr ? "الـRouter الآن tenant-scoped" : "Tenant-scoped routing"}</b><p className="text-sm mt-1 text-slate-600 dark:text-slate-300">{isAr ? "كل منشأة لها قائمة Agents مستقلة. الرسالة تذهب للـAgent المفعّل الأنسب، وإذا لم يوجد تطابق يستخدم الـPrimary Agent." : "Every workspace has its own enabled agents. Messages route to the best enabled agent, otherwise the primary agent is used."}</p></div></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {AGENTS.map((agent) => {
          const enabled = routing.enabledAgents.includes(agent.id);
          const primary = routing.primaryAgent === agent.id;
          return <div key={agent.id} className={`rounded-2xl border p-4 transition ${enabled ? "border-indigo-300 bg-white dark:border-indigo-500/50 dark:bg-slate-900" : "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-950"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3"><div className="rounded-xl bg-indigo-100 p-2 dark:bg-indigo-500/15"><Bot className="h-5 w-5 text-indigo-500" /></div><div><div className="font-bold text-slate-800 dark:text-white">{isAr ? agent.ar : agent.en}</div><div className="text-xs text-slate-500 mt-1">{agent.description}</div></div></div>
              <button onClick={() => toggleAgent(agent.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{enabled ? "ON" : "OFF"}</button>
            </div>
            {enabled && <div className="mt-4 flex items-center gap-4 text-xs"><label className="flex items-center gap-2"><input type="radio" checked={primary} onChange={() => setPrimary(agent.id)} />{isAr ? "Primary" : "Primary Agent"}</label><label className="flex items-center gap-2">Priority <input type="number" min={1} max={100} value={routing.agentPriorities[agent.id] ?? 50} onChange={(e) => setPriority(agent.id, Number(e.target.value))} className="w-16 rounded-lg border p-1 dark:bg-slate-800" /></label></div>}
          </div>;
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="font-bold flex items-center gap-2"><UserRound className="h-4 w-4" />{isAr ? "Human Handoff" : "Human Handoff"}</div><label className="mt-3 flex items-center justify-between text-sm"><span>{isAr ? "السماح بالتحويل للعنصر البشري" : "Allow human escalation"}</span><input type="checkbox" checked={routing.humanHandoffEnabled} onChange={(e) => setRouting((p) => ({ ...p, humanHandoffEnabled: e.target.checked }))} /></label><label className="mt-3 flex items-center justify-between text-sm"><span>{isAr ? "استئناف الـBot بعد تدخل الموظف" : "Auto-resume Bot after human"}</span><input type="checkbox" checked={routing.autoResumeEnabled} onChange={(e) => setRouting((p) => ({ ...p, autoResumeEnabled: e.target.checked }))} /></label></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{isAr ? "حالة التوجيه" : "Routing Mode"}</div><select value={routing.routingMode} onChange={(e) => setRouting((p) => ({ ...p, routingMode: e.target.value as WorkspaceAgentRouting["routingMode"] }))} className="mt-3 w-full rounded-xl border p-2 dark:bg-slate-800"><option value="hybrid">Hybrid — Rules + Intent</option><option value="rules">Rules only</option><option value="intent">Intent only</option></select><div className="mt-3 text-xs text-emerald-600 flex gap-1"><CheckCircle2 className="h-4 w-4" />{isAr ? `${routing.enabledAgents.length} Agents مفعّلين` : `${routing.enabledAgents.length} agents enabled`}</div></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="font-bold">{isAr ? "قواعد الـRouter المتقدمة" : "Advanced Router Rules"}</div>
        <input value={salesKeywords} onChange={(e) => setSalesKeywords(e.target.value)} className="w-full rounded-xl border p-3 text-sm dark:bg-slate-800" placeholder="Sales keywords" />
        <input value={supportKeywords} onChange={(e) => setSupportKeywords(e.target.value)} className="w-full rounded-xl border p-3 text-sm dark:bg-slate-800" placeholder="Support keywords" />
        <input value={marketingKeywords} onChange={(e) => setMarketingKeywords(e.target.value)} className="w-full rounded-xl border p-3 text-sm dark:bg-slate-800" placeholder="Marketing keywords" />
        <textarea value={routerPrompt} onChange={(e) => setRouterPrompt(e.target.value)} className="w-full h-24 rounded-xl border p-3 text-sm dark:bg-slate-800" placeholder={isAr ? "تعليمات إضافية للـRouter" : "Additional router instructions"} />
      </div>
    </div>
  );
};
