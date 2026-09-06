import React from "react";
import { Bot, ShieldCheck, Activity, Wrench, BookOpen, ShoppingCart, Headphones, Megaphone, BarChart3 } from "lucide-react";
import { useApp } from "../../context/AppContext";

type AgentCard = {
  name: string;
  roleAr: string;
  roleEn: string;
  icon: React.ComponentType<{ className?: string }>;
};

const AGENTS: AgentCard[] = [
  { name: "FOX-PRODUCT-DEVELOPER", roleAr: "تطوير المنتج والكود", roleEn: "Product development", icon: Wrench },
  { name: "FOX-QA-TECHNICAL-REVIEWER", roleAr: "مراجعة الجودة والتقنية", roleEn: "QA & technical review", icon: ShieldCheck },
  { name: "FOX-STAGING-RELEASE", roleAr: "البناء والنشر على Staging", roleEn: "Staging release", icon: Activity },
  { name: "FOX-KNOWLEDGE", roleAr: "إدارة قاعدة المعرفة", roleEn: "Knowledge management", icon: BookOpen },
  { name: "FOX-SALES", roleAr: "المبيعات والعملاء المحتملون", roleEn: "Sales & leads", icon: ShoppingCart },
  { name: "FOX-CUSTOMER-SUPPORT", roleAr: "خدمة العملاء", roleEn: "Customer support", icon: Headphones },
  { name: "FOX-MARKETING", roleAr: "التسويق والحملات", roleEn: "Marketing & campaigns", icon: Megaphone },
  { name: "FOX-MONITORING", roleAr: "المراقبة والصحة", roleEn: "Monitoring & health", icon: Activity },
  { name: "FOX-EXECUTIVE-REPORTING", roleAr: "التقارير التنفيذية", roleEn: "Executive reporting", icon: BarChart3 },
];

export const AgentRegistryPage: React.FC = () => {
  const { language } = useApp();
  const isAr = language === "ar";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-500 p-3 shadow-lg shadow-orange-500/20"><Bot className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-black">{isAr ? "وكلاء FOX AI" : "FOX AI Agents"}</h1>
              <p className="text-xs text-slate-300">{isAr ? "فريق الوكلاء المتخصصين المستخدم لتطوير وتشغيل الوكالة" : "Specialized agents used to build and operate FOX"}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
            <p className="text-3xl font-black">{AGENTS.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{isAr ? "وكلاء مسجلون" : "Registered agents"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-500"><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{agent.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{isAr ? agent.roleAr : agent.roleEn}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-500">Configured</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-slate-600 dark:text-slate-300">
        {isAr
          ? "تعرض الصفحة الوكلاء المسجلين بدون اختلاق مؤشرات تشغيل. حالات التنفيذ والمهام ستظهر هنا من المصدر التشغيلي عند ربط Runtime API."
          : "This page shows the registered agent roster without fabricated runtime metrics. Live task and execution status will appear from the runtime source when connected."}
      </div>
    </div>
  );
};
