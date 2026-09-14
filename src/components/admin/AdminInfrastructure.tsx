import React, { useEffect, useState } from "react";
import { Activity, BarChart3, Database, ExternalLink, Gauge, Radio, ShieldCheck } from "lucide-react";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { useApp } from "../../context/AppContext";

type Service = { id: string; name: string; ar: string; purpose: string; url: string; status: string };

const icons: Record<string, React.ReactNode> = {
  openlit: <Activity className="h-5 w-5" />,
  phoenix: <Radio className="h-5 w-5" />,
  qdrant: <Database className="h-5 w-5" />,
  uptime: <Gauge className="h-5 w-5" />,
  metabase: <BarChart3 className="h-5 w-5" />,
};

export const AdminInfrastructure: React.FC = () => {
  const { language } = useApp();
  const isAr = language === "ar";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authenticatedFetch("/api/admin/infrastructure")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data) => setServices(Array.isArray(data.services) ? data.services : []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-violet-600 to-indigo-600 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" /> Super Admin Only
            </span>
            <h1 className="mt-3 text-2xl font-black">{isAr ? "بنية FOX الذكية" : "FOX AI Infrastructure"}</h1>
            <p className="mt-1 max-w-3xl text-xs font-medium text-white/80">
              {isAr ? "مركز واحد لأدوات المراقبة، التتبع، قاعدة المعرفة، حالة الخدمات والتحليلات الخاصة بالوكالة." : "One control center for FOX observability, tracing, knowledge infrastructure, service health and analytics."}
            </p>
          </div>
          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-black text-emerald-100">{services.filter((s) => s.status === "online").length}/{services.length} ONLINE</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">{isAr ? "جاري فحص الخدمات..." : "Checking FOX infrastructure..."}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">{icons[service.id]}</div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? service.ar : service.name}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{service.name}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${service.status === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{service.status.toUpperCase()}</span>
              </div>
              <p className="mt-4 min-h-10 text-xs leading-5 text-slate-500 dark:text-slate-400">{service.purpose}</p>
              <a href={service.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white transition hover:bg-orange-600 dark:bg-slate-800">
                {isAr ? "فتح لوحة الخدمة" : "Open Service"}<ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 text-xs leading-6 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
        <strong>{isAr ? "خطة الاستخدام داخل FOX:" : "FOX usage plan:"}</strong>{" "}
        {isAr ? "OpenLIT لمراقبة Gemini والـ LLM، Phoenix لتتبع مسارات الـ Agents، Qdrant للـ RAG وKnowledge Base، Uptime Kuma لصحة كل الخدمات، وMetabase لتحليلات الوكالة. هذه الأدوات لا تظهر لمستخدمي المنشآت." : "OpenLIT for Gemini/LLM observability, Phoenix for agent traces, Qdrant for RAG/Knowledge Base, Uptime Kuma for service health, and Metabase for agency analytics. These tools are not exposed to workspace users."}
      </div>
    </div>
  );
};
