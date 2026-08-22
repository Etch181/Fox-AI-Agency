import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Cpu,
  Gauge,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";

import { db } from "../../services/firebase";
import { useTranslation } from "../../services/LanguageService";

type ModelHealth = {
  id: string;
  provider?: string;
  model?: string;
  requests?: number;
  successes?: number;
  failures?: number;
  successRate?: number;
  avgLatencyMs?: number;
  toolRequests?: number;
  toolSuccesses?: number;
  fallbackRequests?: number;
  healthStatus?: string;

  // FOX ADAPTIVE HEALTH CENTER V2
  reliabilityScore?: number;
  latencyScore?: number;
  toolScore?: number;
  adaptiveScore?: number;
  adaptiveToolScore?: number;
  toolSuccessRate?: number | null;

  routingRecommendation?:
    | "preferred"
    | "normal"
    | "deprioritize"
    | "cooldown"
    | string;

  toolRecommendation?:
    | "preferred"
    | "normal"
    | "deprioritize"
    | string;

  // FOX COOLDOWN UI V1
  cooldownUntil?: string | null;
  cooldownReason?: string | null;

  // FOX CIRCUIT BREAKER UI V2
  circuitBreakerLevel?: number;
  circuitBreakerState?:
    | "closed"
    | "open"
    | "recovering"
    | string;

  lastCooldownStartedAt?: string | null;
  lastRecoveryAt?: string | null;

  lastAgentRole?: string;
  lastUsedAt?: any;
};

type ModelUsage = {
  id: string;
  workspaceId?: string;
  provider?: string;
  requestedModel?: string;
  servedModel?: string;
  agentRole?: string;
  channel?: string;
  toolsEnabled?: boolean;
  fallbackUsed?: boolean;
  status?: string;
  latencyMs?: number;
  errorType?: string | null;
  createdAt?: any;
};

const safeNumber = (
  value: unknown,
  fallback = 0
) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatModelName = (model?: string) => {
  if (!model) return "Unknown";

  return model
    .replace(/:free$/i, "")
    .replace(/^openrouter\//i, "")
    .replace(/^google\//i, "")
    .replace(/^nvidia\//i, "")
    .replace(/^poolside\//i, "")
    .replace(/^cohere\//i, "");
};

const formatLatency = (ms?: number) => {
  const value = safeNumber(ms);

  if (value <= 0) return "—";

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  return `${(value / 1000).toFixed(1)}s`;
};

const formatDate = (
  value: any,
  isAr: boolean
) => {
  if (!value) return "—";

  try {
    let date: Date;

    if (typeof value?.toDate === "function") {
      date = value.toDate();
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      isAr ? "ar-EG" : "en-GB",
      {
        dateStyle: "short",
        timeStyle: "medium",
      }
    ).format(date);
  } catch {
    return "—";
  }
};

const latencyClass = (ms?: number) => {
  const value = safeNumber(ms);

  if (value <= 0) {
    return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }

  if (value < 5000) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (value <= 15000) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }

  return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
};

const healthClass = (status?: string) => {
  const normalized =
    String(status || "").toLowerCase();

  if (
    normalized === "healthy" ||
    normalized === "good"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }

  if (
    normalized === "degraded" ||
    normalized === "warning"
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  }

  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
};

// ============================================================
// FOX ADAPTIVE HEALTH CENTER V2
// ============================================================

const adaptiveScoreClass = (score?: number) => {
  const value = safeNumber(score);

  if (value >= 85) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }

  if (value >= 65) {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  }

  if (value >= 45) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  }

  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
};

const recommendationClass = (
  recommendation?: string
) => {
  switch (
    String(recommendation || "normal").toLowerCase()
  ) {
    case "preferred":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";

    case "cooldown":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";

    case "deprioritize":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
};

// ============================================================
// FOX COOLDOWN UI V1
// ============================================================

// ============================================================
// FOX CIRCUIT BREAKER UI V2
// ============================================================

const circuitStateClass = (
  state?: string
) => {
  switch (
    String(state || "closed").toLowerCase()
  ) {
    case "open":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";

    case "recovering":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }
};

const circuitStateLabel = (
  state?: string
) => {
  const value =
    String(state || "closed").toLowerCase();

  if (value === "open") return "OPEN";
  if (value === "recovering") return "RECOVERING";

  return "CLOSED";
};

const getCooldownDisplay = (
  cooldownUntil?: string | null
) => {
  if (!cooldownUntil) {
    return {
      active: false,
      label: "—",
      remainingMs: 0,
    };
  }

  const expiresAt =
    new Date(cooldownUntil).getTime();

  const remainingMs =
    expiresAt - Date.now();

  if (
    !Number.isFinite(expiresAt) ||
    remainingMs <= 0
  ) {
    return {
      active: false,
      label: "Expired",
      remainingMs: 0,
    };
  }

  const minutes =
    Math.max(
      1,
      Math.ceil(
        remainingMs / 60000
      )
    );

  return {
    active: true,
    label: `${minutes}m`,
    remainingMs,
  };
};

const recommendationLabel = (
  recommendation?: string
) => {
  const value =
    String(recommendation || "normal").toLowerCase();

  switch (value) {
    case "preferred":
      return "Preferred";

    case "deprioritize":
      return "Deprioritize";

    case "cooldown":
      return "Cooldown";

    default:
      return "Normal";
  }
};

const providerClass = (provider?: string) => {
  switch (
    String(provider || "").toLowerCase()
  ) {
    case "openrouter":
      return "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400";

    case "gemini":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          {icon}
        </div>
      </div>
    </div>
  );
};

export const ClientAIEngagement:
  React.FC = () => {
    const { isAr } = useTranslation();

    const [modelHealth, setModelHealth] =
      useState<ModelHealth[]>([]);

    const [usage, setUsage] =
      useState<ModelUsage[]>([]);

    const [healthLoaded, setHealthLoaded] =
      useState(false);

    const [usageLoaded, setUsageLoaded] =
      useState(false);

    const [error, setError] =
      useState<string | null>(null);

    useEffect(() => {
      setError(null);

      const healthQuery = query(
        collection(db, "aiModelHealth"),
        orderBy("lastUsedAt", "desc"),
        limit(100)
      );

      const usageQuery = query(
        collection(db, "aiModelUsage"),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      const unsubscribeHealth =
        onSnapshot(
          healthQuery,
          (snapshot) => {
            setModelHealth(
              snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
              }))
            );

            setHealthLoaded(true);
          },
          (snapshotError) => {
            console.error(
              "[FOX Model Health] Firestore error:",
              snapshotError
            );

            setHealthLoaded(true);

            setError(
              isAr
                ? "تعذر قراءة بيانات صحة موديلات الذكاء الاصطناعي."
                : "Unable to read AI model health data."
            );
          }
        );

      const unsubscribeUsage =
        onSnapshot(
          usageQuery,
          (snapshot) => {
            setUsage(
              snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
              }))
            );

            setUsageLoaded(true);
          },
          (snapshotError) => {
            console.error(
              "[FOX Model Usage] Firestore error:",
              snapshotError
            );

            setUsageLoaded(true);

            setError(
              isAr
                ? "تعذر قراءة سجل استخدام موديلات الذكاء الاصطناعي."
                : "Unable to read AI model usage history."
            );
          }
        );

      return () => {
        unsubscribeHealth();
        unsubscribeUsage();
      };
    }, [isAr]);

    const stats = useMemo(() => {
      const totalRequests =
        modelHealth.reduce(
          (sum, model) =>
            sum +
            safeNumber(model.requests),
          0
        );

      const totalSuccesses =
        modelHealth.reduce(
          (sum, model) =>
            sum +
            safeNumber(model.successes),
          0
        );

      const totalFailures =
        modelHealth.reduce(
          (sum, model) =>
            sum +
            safeNumber(model.failures),
          0
        );

      const totalFallbacks =
        modelHealth.reduce(
          (sum, model) =>
            sum +
            safeNumber(
              model.fallbackRequests
            ),
          0
        );

      const weightedLatencyTotal =
        modelHealth.reduce(
          (sum, model) => {
            const requests =
              safeNumber(model.requests);

            return (
              sum +
              safeNumber(
                model.avgLatencyMs
              ) *
                requests
            );
          },
          0
        );

      const successRate =
        totalRequests > 0
          ? (totalSuccesses /
              totalRequests) *
            100
          : 0;

      const fallbackRate =
        totalRequests > 0
          ? (totalFallbacks /
              totalRequests) *
            100
          : 0;

      const avgLatency =
        totalRequests > 0
          ? weightedLatencyTotal /
            totalRequests
          : 0;

      const unhealthy =
        modelHealth.filter((model) => {
          const status = String(
            model.healthStatus || ""
          ).toLowerCase();

          return (
            status &&
            status !== "healthy" &&
            status !== "good"
          );
        }).length;

      const providers = new Set(
        modelHealth
          .map((x) => x.provider)
          .filter(Boolean)
      ).size;

      return {
        totalRequests,
        totalSuccesses,
        totalFailures,
        totalFallbacks,
        successRate,
        fallbackRate,
        avgLatency,
        unhealthy,
        providers,
        models: modelHealth.length,
      };
    }, [modelHealth]);

    const loading =
      !healthLoaded || !usageLoaded;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <Brain className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  FOX AI Model Health Center
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "مراقبة حقيقية للموديلات المجانية، السرعة، الأخطاء والتحويل التلقائي."
                    : "Live monitoring for free AI models, latency, failures and automatic fallback."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Activity className="h-4 w-4" />
            {loading
              ? isAr
                ? "جاري الاتصال..."
                : "Connecting..."
              : isAr
              ? "مراقبة مباشرة"
              : "Live Monitoring"}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title={
              isAr
                ? "طلبات الذكاء الاصطناعي"
                : "AI Requests"
            }
            value={stats.totalRequests}
            subtitle={`${stats.totalSuccesses} success / ${stats.totalFailures} failed`}
            icon={
              <Bot className="h-5 w-5" />
            }
          />

          <MetricCard
            title={
              isAr
                ? "نسبة النجاح"
                : "Success Rate"
            }
            value={`${stats.successRate.toFixed(
              1
            )}%`}
            subtitle={
              isAr
                ? "لكل الموديلات"
                : "Across all models"
            }
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <MetricCard
            title={
              isAr
                ? "الموديلات المستخدمة"
                : "Models Used"
            }
            value={stats.models}
            subtitle={`${stats.providers} provider(s)`}
            icon={
              <Cpu className="h-5 w-5" />
            }
          />

          <MetricCard
            title={
              isAr
                ? "متوسط زمن الاستجابة"
                : "Avg Latency"
            }
            value={formatLatency(
              stats.avgLatency
            )}
            subtitle={
              stats.avgLatency > 15000
                ? isAr
                  ? "يحتاج تحسين"
                  : "Needs optimization"
                : isAr
                ? "زمن استجابة الشبكة والموديل"
                : "Provider + model latency"
            }
            icon={
              <Gauge className="h-5 w-5" />
            }
          />

          <MetricCard
            title={
              isAr
                ? "نسبة التحويل الاحتياطي"
                : "Fallback Rate"
            }
            value={`${stats.fallbackRate.toFixed(
              1
            )}%`}
            subtitle={`${stats.totalFallbacks} explicit fallback(s)`}
            icon={
              <Route className="h-5 w-5" />
            }
          />

          <MetricCard
            title={
              isAr
                ? "موديلات غير مستقرة"
                : "Unhealthy Models"
            }
            value={stats.unhealthy}
            subtitle={
              stats.unhealthy === 0
                ? isAr
                  ? "كل الموديلات سليمة"
                  : "All tracked models healthy"
                : isAr
                ? "راجع الجدول بالأسفل"
                : "Review models below"
            }
            icon={
              stats.unhealthy === 0 ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )
            }
          />
        </div>

        {/* Model Health */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
                <Sparkles className="h-5 w-5 text-orange-500" />
                {isAr
                  ? "صحة موديلات الذكاء الاصطناعي"
                  : "AI Model Health"}
              </h3>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {isAr
                  ? "البيانات الفعلية المجمعة من FOX AI Router."
                  : "Real usage aggregated by FOX AI Router."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
              Firestore Live
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1740px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950/40">
                <tr>
                  <th className="px-5 py-3">
                    Model
                  </th>
                  <th className="px-4 py-3">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-center">
                    Requests
                  </th>
                  <th className="px-4 py-3 text-center">
                    Success
                  </th>
                  <th className="px-4 py-3 text-center">
                    Failures
                  </th>
                  <th className="px-4 py-3 text-center">
                    Avg Time
                  </th>
                  <th className="px-4 py-3 text-center">
                    Tools
                  </th>
                  <th className="px-4 py-3 text-center">
                    Fallback
                  </th>

                  <th className="px-4 py-3 text-center">
                    AI Score
                  </th>

                  <th className="px-4 py-3 text-center">
                    Tool Score
                  </th>

                  <th className="px-4 py-3 text-center">
                    Routing
                  </th>

                  <th className="px-4 py-3 text-center">
                    Tool Route
                  </th>

                  <th className="px-4 py-3 text-center">
                    Circuit
                  </th>

                  <th className="px-4 py-3 text-center">
                    Level
                  </th>

                  <th className="px-4 py-3 text-center">
                    Cooldown
                  </th>

                  <th className="px-4 py-3 text-center">
                    Health
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {modelHealth.length === 0 &&
                healthLoaded ? (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-5 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      {isAr
                        ? "لا توجد بيانات موديلات حتى الآن."
                        : "No model usage recorded yet."}
                    </td>
                  </tr>
                ) : (
                  modelHealth.map(
                    (model) => (
                      <tr
                        key={model.id}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-slate-800 dark:text-slate-100">
                            {formatModelName(
                              model.model
                            )}
                          </div>

                          <div className="mt-1 max-w-[260px] truncate font-mono text-[10px] text-slate-400">
                            {model.model ||
                              model.id}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 font-extrabold ${providerClass(
                              model.provider
                            )}`}
                          >
                            {model.provider ||
                              "unknown"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center font-black text-slate-700 dark:text-slate-200">
                          {safeNumber(
                            model.requests
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {safeNumber(
                              model.successRate
                            ).toFixed(1)}
                            %
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-slate-500">
                          {safeNumber(
                            model.failures
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 font-extrabold ${latencyClass(
                              model.avgLatencyMs
                            )}`}
                          >
                            {formatLatency(
                              model.avgLatencyMs
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                            <Wrench className="h-3.5 w-3.5" />
                            {safeNumber(
                              model.toolSuccesses
                            )}
                            /
                            {safeNumber(
                              model.toolRequests
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-slate-500">
                          {safeNumber(
                            model.fallbackRequests
                          )}
                        </td>

                        {/* FOX ADAPTIVE HEALTH CENTER V2 */}

                        <td className="px-4 py-4 text-center">
                          <span
                            title={`Reliability ${safeNumber(
                              model.reliabilityScore
                            ).toFixed(1)}% • Latency ${safeNumber(
                              model.latencyScore
                            ).toFixed(1)}%`}
                            className={`inline-flex min-w-[58px] justify-center rounded-full border px-2.5 py-1 text-[10px] font-black ${adaptiveScoreClass(
                              model.adaptiveScore
                            )}`}
                          >
                            {safeNumber(
                              model.adaptiveScore
                            ).toFixed(1)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            title={`Tool success ${
                              model.toolSuccessRate == null
                                ? "No evidence"
                                : `${safeNumber(
                                    model.toolSuccessRate
                                  ).toFixed(1)}%`
                            }`}
                            className={`inline-flex min-w-[58px] justify-center rounded-full border px-2.5 py-1 text-[10px] font-black ${adaptiveScoreClass(
                              model.adaptiveToolScore
                            )}`}
                          >
                            {safeNumber(
                              model.adaptiveToolScore
                            ).toFixed(1)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${recommendationClass(
                              model.routingRecommendation
                            )}`}
                          >
                            {recommendationLabel(
                              model.routingRecommendation
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${recommendationClass(
                              model.toolRecommendation
                            )}`}
                          >
                            {recommendationLabel(
                              model.toolRecommendation
                            )}
                          </span>
                        </td>

                        {/* FOX CIRCUIT BREAKER UI V2 */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black ${circuitStateClass(
                              model.circuitBreakerState
                            )}`}
                          >
                            {circuitStateLabel(
                              model.circuitBreakerState
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-[36px] justify-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {safeNumber(
                              model.circuitBreakerLevel
                            )}
                          </span>
                        </td>

                        {/* FOX COOLDOWN UI V1 */}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const cooldown =
                              getCooldownDisplay(
                                model.cooldownUntil
                              );

                            return (
                              <span
                                title={
                                  model.cooldownReason
                                    ? `Reason: ${model.cooldownReason}`
                                    : ""
                                }
                                className={`inline-flex min-w-[58px] justify-center rounded-full border px-2.5 py-1 text-[10px] font-black ${
                                  cooldown.active
                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                    : cooldown.label === "Expired"
                                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                                    : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {cooldown.label}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${healthClass(
                              model.healthStatus
                            )}`}
                          >
                            {model.healthStatus ||
                              "unknown"}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Clock3 className="h-5 w-5 text-blue-500" />
              {isAr
                ? "أحدث طلبات الذكاء الاصطناعي"
                : "Recent AI Requests"}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-400">
              {isAr
                ? "آخر 100 عملية AI مسجلة داخل FOX."
                : "Latest 100 AI operations recorded by FOX."}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950/40">
                <tr>
                  <th className="px-5 py-3">
                    Time
                  </th>
                  <th className="px-4 py-3">
                    Workspace
                  </th>
                  <th className="px-4 py-3">
                    Agent
                  </th>
                  <th className="px-4 py-3">
                    Requested
                  </th>
                  <th className="px-4 py-3">
                    Served
                  </th>
                  <th className="px-4 py-3 text-center">
                    Tools
                  </th>
                  <th className="px-4 py-3 text-center">
                    Latency
                  </th>
                  <th className="px-4 py-3 text-center">
                    Fallback
                  </th>
                  <th className="px-4 py-3 text-center">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usage.length === 0 &&
                usageLoaded ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      {isAr
                        ? "لا توجد عمليات AI مسجلة حتى الآن."
                        : "No AI requests recorded yet."}
                    </td>
                  </tr>
                ) : (
                  usage.map((item) => {
                    const success =
                      item.status ===
                      "success";

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">
                          {formatDate(
                            item.createdAt,
                            isAr
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[180px] truncate font-mono text-[10px] font-bold text-slate-500">
                            {item.workspaceId ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-orange-50 px-2 py-1 font-extrabold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                            {item.agentRole ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[180px] truncate font-mono text-[10px] text-slate-500">
                            {item.requestedModel ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[220px] truncate font-bold text-slate-700 dark:text-slate-200">
                            {item.servedModel ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`rounded-lg px-2 py-1 font-black ${
                              item.toolsEnabled
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {item.toolsEnabled
                              ? "ON"
                              : "OFF"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-lg px-2 py-1 font-extrabold ${latencyClass(
                              item.latencyMs
                            )}`}
                          >
                            {formatLatency(
                              item.latencyMs
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {item.fallbackUsed ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              <Route className="h-3 w-3" />
                              YES
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400">
                              NO
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          {success ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              SUCCESS
                            </span>
                          ) : (
                            <span
                              title={
                                item.errorType ||
                                ""
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 font-black text-red-700 dark:bg-red-500/10 dark:text-red-400"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              FAILED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Latency Guide */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <span>
            {isAr
              ? "مؤشر السرعة:"
              : "Latency guide:"}
          </span>

          <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            &lt; 5s Excellent
          </span>

          <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            5–15s Moderate
          </span>

          <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700 dark:bg-red-500/10 dark:text-red-400">
            &gt; 15s Slow
          </span>
        </div>
      </div>
    );
  };
