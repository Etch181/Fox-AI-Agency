import React from "react";
import { FoxAgentLivePanel } from "./FoxAgentLivePanel";
import { useApp } from "../../context/AppContext";

export const AgentRegistryPage: React.FC = () => {
  const { language } = useApp();
  const isAr = language === "ar";
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          {isAr ? "وكلاء FOX AI — الحالة الفعلية" : "FOX AI Agents — Live Status"}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isAr ? "بيانات الوكلاء والتنفيذ تُقرأ من Runtime الفعلي لمساحة العمل، بدون مؤشرات وهمية." : "Agent state and executions come from the real workspace runtime; no fabricated metrics."}
        </p>
      </div>
      <FoxAgentLivePanel />
    </div>
  );
};
