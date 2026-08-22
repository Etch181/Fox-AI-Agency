import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "../../services/LanguageService";
import { GeminiTenantMetrics, GeminiErrorLog } from "../../types";
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Play,
  Pause,
  Clock,
  Server,
  Bot,
  TrendingUp,
  BarChart2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles,
  Info,
  X,
  Radio,
  Sliders,
} from "lucide-react";

export const AdminGeminiMonitoring: React.FC = () => {
  const { t, isAr } = useTranslation();
  const {
    geminiMetrics,
    simulateGeminiPing,
    clearTenantErrorLogs,
    resetGeminiMetrics,
    addToast,
    addAuditLog,
    currentUser,
  } = useApp();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");

  // Real-time live pulse state
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true);
  const [lastPulseTime, setLastPulseTime] = useState<string>("");
  const [isPingingAll, setIsPingingAll] = useState<boolean>(false);
  const [pingingTenantId, setPingingTenantId] = useState<string | null>(null);

  // Selected Tenant for detailed inspection modal
  const [selectedTenantModal, setSelectedTenantModal] = useState<GeminiTenantMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<"tenants" | "error_stream" | "health_matrix">("tenants");

  // Real-time simulation loop
  useEffect(() => {
    let interval: any = null;
    if (isLiveAutoRefresh && geminiMetrics.length > 0) {
      interval = setInterval(() => {
        // Pick a random tenant to simulate live API traffic
        const randomTenant = geminiMetrics[Math.floor(Math.random() * geminiMetrics.length)];
        if (randomTenant) {
          simulateGeminiPing(randomTenant.workspaceId);
          setLastPulseTime(new Date().toLocaleTimeString());
        }
      }, 4000); // Pulse every 4 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveAutoRefresh, geminiMetrics]);

  // Global Aggregate Statistics
  const globalStats = useMemo(() => {
    if (geminiMetrics.length === 0) {
      return {
        totalCalls: 0,
        totalErrors: 0,
        avgLatency: 0,
        globalErrorRate: 0,
        healthyTenants: 0,
        degradedTenants: 0,
        downTenants: 0,
        systemHealth: "healthy" as const,
      };
    }

    const totalCalls = geminiMetrics.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = geminiMetrics.reduce((sum, m) => sum + m.errorCalls, 0);
    const avgLatency = Math.round(
      geminiMetrics.reduce((sum, m) => sum + m.avgLatencyMs, 0) / geminiMetrics.length
    );
    const globalErrorRate = totalCalls > 0 ? Number(((totalErrors / totalCalls) * 100).toFixed(2)) : 0;

    const healthyTenants = geminiMetrics.filter((m) => m.status === "healthy").length;
    const degradedTenants = geminiMetrics.filter((m) => m.status === "degraded").length;
    const downTenants = geminiMetrics.filter((m) => m.status === "down").length;

    let systemHealth: "healthy" | "degraded" | "down" = "healthy";
    if (downTenants > 0 || globalErrorRate > 8) {
      systemHealth = "down";
    } else if (degradedTenants > 0 || globalErrorRate > 3) {
      systemHealth = "degraded";
    }

    return {
      totalCalls,
      totalErrors,
      avgLatency,
      globalErrorRate,
      healthyTenants,
      degradedTenants,
      downTenants,
      systemHealth,
    };
  }, [geminiMetrics]);

  // Filtered Tenant Metrics
  const filteredMetrics = useMemo(() => {
    return geminiMetrics.filter((m) => {
      // Search
      const matchesSearch =
        m.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.workspaceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.activeModel.toLowerCase().includes(searchQuery.toLowerCase());

      // Industry
      const matchesIndustry = selectedIndustry === "all" || m.industry === selectedIndustry;

      // Status
      const matchesStatus = selectedStatus === "all" || m.status === selectedStatus;

      // Model
      const matchesModel = selectedModel === "all" || m.activeModel === selectedModel;

      return matchesSearch && matchesIndustry && matchesStatus && matchesModel;
    });
  }, [geminiMetrics, searchQuery, selectedIndustry, selectedStatus, selectedModel]);

  // Flattened All Error Logs Stream
  const allRecentErrors = useMemo(() => {
    const logs: GeminiErrorLog[] = [];
    geminiMetrics.forEach((m) => {
      if (m.recentErrorLogs) {
        logs.push(...m.recentErrorLogs);
      }
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }, [geminiMetrics]);

  // Trigger diagnostic ping for single tenant
  const handlePingTenant = async (workspaceId: string, workspaceName: string) => {
    setPingingTenantId(workspaceId);
    try {
      const res = await simulateGeminiPing(workspaceId);
      if (res.success) {
        addToast(
          isAr
            ? `اختبار Gemini API ناجح لـ ${workspaceName} (${res.latencyMs}ms)`
            : `Gemini API ping successful for ${workspaceName} (${res.latencyMs}ms)`,
          "success"
        );
      } else {
        addToast(
          isAr
            ? `فشل اختبار Gemini API لـ ${workspaceName}: ${res.errorCode}`
            : `Gemini API ping failed for ${workspaceName}: ${res.errorCode}`,
          "error"
        );
      }
    } finally {
      setPingingTenantId(null);
    }
  };

  // Trigger diagnostic ping for all tenants
  const handlePingAllTenants = async () => {
    setIsPingingAll(true);
    addToast(
      isAr ? "جاري تشغيل الفحص الشامل لجميع المؤسسات..." : "Executing full diagnostic ping across all tenants...",
      "info"
    );

    for (const m of geminiMetrics) {
      await simulateGeminiPing(m.workspaceId);
    }

    setIsPingingAll(false);
    addToast(isAr ? "اكتمل الفحص التشخيصي الشامل بنجاح!" : "All tenant diagnostic pings completed!", "success");

    addAuditLog({
      action: "Gemini API Diagnostic Sweep Executed",
      category: "api",
      severity: "info",
      target: "Gemini AI API Engine",
      details: "Triggered diagnostic health and latency ping across all workspace tenants.",
      actorName: currentUser?.name || "System Super Admin",
      actorEmail: currentUser?.email || "info.hesham.m@gmail.com",
    });
  };

  // Clear tenant error logs
  const handleClearErrors = (workspaceId: string, workspaceName: string) => {
    clearTenantErrorLogs(workspaceId);
    if (selectedTenantModal?.workspaceId === workspaceId) {
      setSelectedTenantModal((prev) =>
        prev
          ? {
              ...prev,
              recentErrorLogs: [],
              errorCalls: 0,
              errorRatePercent: 0,
              status: "healthy",
            }
          : null
      );
    }
    addToast(
      isAr ? `تم تنظيف سجلات الأخطاء لـ ${workspaceName}` : `Error logs cleared for ${workspaceName}`,
      "success"
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* HEADER BANNER */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              <span>{isAr ? "مراقبة البنية التحتية لـ Gemini AI" : "Gemini AI Telemetry Hub"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? "لوحة مراقبة زَمَن الاستجابة ونسبة الأخطاء" : "Gemini API Latency & Error Rate Dashboard"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              {isAr
                ? "تتبع مباشر ولحظي لزمن الاستجابة (Latency)، معُدّل الأخطاء (Error Rates)، وتوزيع الطلبات لكل مؤسسة (Tenant) عبر نماذج Google Gemini 2.5."
                : "Real-time monitoring of response latency, HTTP/Quota error rates, throughput (RPM/TPM), and safety blocks per workspace tenant."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Live Auto-Refresh Toggle */}
            <button
              onClick={() => setIsLiveAutoRefresh(!isLiveAutoRefresh)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold border transition shadow-md ${
                isLiveAutoRefresh
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {isLiveAutoRefresh ? (
                <>
                  <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>{isAr ? "البث المباشر: نشط (Pulse)" : "Live Telemetry: ON"}</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 text-slate-400" />
                  <span>{isAr ? "البث المباشر: متوقف" : "Live Telemetry: OFF"}</span>
                </>
              )}
            </button>

            {/* Trigger All Diagnostic Pings */}
            <button
              onClick={handlePingAllTenants}
              disabled={isPingingAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isPingingAll ? "animate-spin" : ""}`} />
              <span>{isAr ? "فحص شامل لكل المؤسسات" : "Ping All Tenants"}</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-700/60 relative z-10">
          {/* Average Latency */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "متوسط زمن الاستجابة" : "Avg Latency (ms)"}</span>
              <Clock className="h-4 w-4 text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{globalStats.avgLatency}</span>
              <span className="text-xs text-sky-400 font-bold">ms</span>
            </div>
          </div>

          {/* Global Error Rate */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "نسبة الأخطاء الكلية" : "Global Error Rate"}</span>
              <AlertTriangle
                className={`h-4 w-4 ${
                  globalStats.globalErrorRate > 5 ? "text-rose-400 animate-bounce" : "text-amber-400"
                }`}
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  globalStats.globalErrorRate > 5 ? "text-rose-400" : "text-amber-300"
                }`}
              >
                {globalStats.globalErrorRate}%
              </span>
              <span className="text-[10px] text-slate-400">({globalStats.totalErrors} errs)</span>
            </div>
          </div>

          {/* Total API Requests */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "إجمالي استدعاءات API" : "Total API Calls"}</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{globalStats.totalCalls.toLocaleString()}</div>
          </div>

          {/* System Health Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "حالة النظام العامة" : "System Status"}</span>
              <Cpu className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="pt-0.5">
              {globalStats.systemHealth === "healthy" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{isAr ? "سليم ومستقر (100%)" : "Operational (Healthy)"}</span>
                </span>
              ) : globalStats.systemHealth === "degraded" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isAr ? "أداء منخفض (Degraded)" : "Degraded Performance"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 animate-pulse">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  <span>{isAr ? "أخطاء عالية (Critical)" : "High Error Rate"}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TABS & FILTERS BAR */}
      <div className="p-4 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("tenants")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "tenants"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Server className="h-4 w-4" />
              <span>{isAr ? "مراقبة المؤسسات (Tenants)" : "Per-Tenant Metrics"}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
                {filteredMetrics.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("error_stream")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "error_stream"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>{isAr ? "سجل الأخطاء المباشر" : "Live Error Log Stream"}</span>
              {allRecentErrors.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {allRecentErrors.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("health_matrix")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "health_matrix"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>{isAr ? "حالة نماذج Gemini 2.5" : "Gemini Models Status"}</span>
            </button>
          </div>

          <button
            onClick={resetGeminiMetrics}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold underline flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isAr ? "إعادة ضبط التقييمات" : "Reset Metrics"}</span>
          </button>
        </div>

        {/* Filter Controls (When in Tenants tab) */}
        {activeTab === "tenants" && (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? "بحث باسم المؤسسة، المعرّف ID، أو النموذج Active Model..."
                    : "Search tenant name, ID, or Gemini model..."
                }
                className="w-full h-10 ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Industry Filter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? "كل القطاعات" : "All Industries"}</option>
                  <option value="Clinic">{isAr ? "عيادات (Clinic)" : "Clinic"}</option>
                  <option value="Pharmacy">{isAr ? "صيدليات (Pharmacy)" : "Pharmacy"}</option>
                  <option value="Restaurant">{isAr ? "مطاعم (Restaurant)" : "Restaurant"}</option>
                  <option value="Retail">{isAr ? "تجارة (Retail)" : "Retail"}</option>
                </select>
              </div>

              {/* Health Status Filter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? "كل الحالات" : "All Health Statuses"}</option>
                  <option value="healthy">{isAr ? "سليم (Healthy)" : "Healthy"}</option>
                  <option value="degraded">{isAr ? "منخفض (Degraded)" : "Degraded"}</option>
                  <option value="down">{isAr ? "أخطاء حرجة (Down)" : "Critical Errs"}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: PER-TENANT METRICS DASHBOARD */}
      {activeTab === "tenants" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMetrics.length === 0 ? (
            <div className="col-span-full py-12 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-center text-slate-400 space-y-2">
              <Server className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-sm">
                {isAr ? "لا توجد نتائج تطابق معايير المراقبة المحددة" : "No tenant metrics match specified filters"}
              </p>
            </div>
          ) : (
            filteredMetrics.map((tenant) => {
              const maxLatencyInTrend = Math.max(...tenant.latencyTrend, 1);

              return (
                <div
                  key={tenant.workspaceId}
                  className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md transition p-6 space-y-5 relative overflow-hidden group"
                >
                  {/* Status Bar Indicator Accent */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      tenant.status === "healthy"
                        ? "bg-emerald-500"
                        : tenant.status === "degraded"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />

                  {/* Header Tenant Info */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-base group-hover:text-orange-500 transition">
                          {tenant.workspaceName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {tenant.industry}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-400">
                        ID: {tenant.workspaceId} • Model:{" "}
                        <span className="text-orange-600 dark:text-orange-400 font-bold">
                          {tenant.activeModel}
                        </span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                        tenant.status === "healthy"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : tenant.status === "degraded"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse"
                      }`}
                    >
                      {tenant.status === "healthy" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : tenant.status === "degraded" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>{tenant.status}</span>
                    </span>
                  </div>

                  {/* Latency & Error Rate Metrics Split */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Latency Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                        <span>{isAr ? "زمن الاستجابة" : "Avg Latency"}</span>
                        <Clock className="h-3.5 w-3.5 text-sky-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {tenant.avgLatencyMs}
                        </span>
                        <span className="text-xs font-bold text-sky-500">ms</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        P95 Latency: <span className="font-mono font-bold">{tenant.p95LatencyMs}ms</span>
                      </div>
                    </div>

                    {/* Error Rate Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                        <span>{isAr ? "نسبة الأخطاء" : "Error Rate"}</span>
                        <AlertTriangle
                          className={`h-3.5 w-3.5 ${
                            tenant.errorRatePercent > 3 ? "text-rose-500" : "text-emerald-500"
                          }`}
                        />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-xl font-black ${
                            tenant.errorRatePercent > 3
                              ? "text-rose-500"
                              : tenant.errorRatePercent > 0
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }`}
                        >
                          {tenant.errorRatePercent}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({tenant.errorCalls}/{tenant.totalCalls})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Throughput: <span className="font-mono font-bold">{tenant.rpm} RPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Sparkline Latency Visual Trend Bar Graph */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{isAr ? "مُخطط زمن الاستجابة المباشر (آخر 10 طلبات)" : "Real-Time Latency History (Last 10 calls)"}</span>
                      <span className="font-mono text-[10px] text-slate-500">Peak: {maxLatencyInTrend}ms</span>
                    </div>

                    <div className="h-12 w-full bg-slate-950/90 rounded-2xl p-2 flex items-end justify-between gap-1 border border-slate-800">
                      {tenant.latencyTrend.map((lat, idx) => {
                        const heightPct = Math.max(10, Math.min(100, Math.round((lat / maxLatencyInTrend) * 100)));
                        const isError = tenant.errorTrend[idx] === 1;

                        return (
                          <div
                            key={idx}
                            className="flex-1 bg-slate-800/80 rounded-sm relative group/bar flex items-end"
                            title={`Call #${idx + 1}: ${lat}ms ${isError ? "(FAILED)" : ""}`}
                          >
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-sm transition-all duration-300 ${
                                isError
                                  ? "bg-rose-500 animate-pulse"
                                  : lat > 700
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Last Call: {tenant.lastCallTimestamp || "Just now"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTenantModal(tenant)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-extrabold transition text-[11px] flex items-center gap-1"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>{isAr ? "التفاصيل" : "Logs"}</span>
                        {tenant.recentErrorLogs.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px]">
                            {tenant.recentErrorLogs.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handlePingTenant(tenant.workspaceId, tenant.workspaceName)}
                        disabled={pingingTenantId === tenant.workspaceId}
                        className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold transition text-[11px] flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Zap className={`h-3.5 w-3.5 ${pingingTenantId === tenant.workspaceId ? "animate-spin" : ""}`} />
                        <span>{isAr ? "اختبار Ping" : "Ping Test"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: LIVE ERROR LOG STREAM */}
      {activeTab === "error_stream" && (
        <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {isAr ? "سجل استثناءات وأخطاء Gemini API المباشر" : "Live Gemini API Exception Stream"}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total Logged Exceptions: {allRecentErrors.length}
            </span>
          </div>

          <div className="space-y-3">
            {allRecentErrors.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400" />
                <p className="font-bold text-sm">
                  {isAr ? "لا توجد أخطاء مسجلة حالياً، جميع الاتصالات سليمة!" : "No recent errors logged. All Gemini connections nominal!"}
                </p>
              </div>
            ) : (
              allRecentErrors.map((err) => (
                <div
                  key={err.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 space-y-2 font-mono text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[10px] uppercase">
                        {err.errorCode}
                      </span>
                      <span className="font-bold text-white text-xs">{err.workspaceName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Latency: <strong className="text-amber-400">{err.latencyMs}ms</strong></span>
                      <span>Model: <strong className="text-sky-400">{err.model}</strong></span>
                      <span>{err.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-rose-300 font-sans font-medium text-xs">{err.errorMessage}</p>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-400 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Prompt Excerpt:</span>
                    <p className="italic font-sans text-slate-300">"{err.promptSnippet}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GEMINI MODELS HEALTH MATRIX */}
      {activeTab === "health_matrix" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gemini 2.5 Flash */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-slate-900 dark:text-white">Gemini 2.5 Flash</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
                Active Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? "النموذج القياسي عالي السرعة المحسن للمحادثات التفاعلية وتأكيد المواعيد والرد الآلي."
                : "Primary high-speed model optimized for real-time customer dialogues, appointment booking, and instant replies."}
            </p>
            <div className="pt-2 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "متوسط زمن الاستجابة" : "Avg Latency"}</span>
                <span className="font-bold text-slate-900 dark:text-white">~380ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحد الأقصى للتزامن" : "Concurrency Limit"}</span>
                <span className="font-bold text-emerald-500">1,000 RPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحالة الحالية" : "Current Status"}</span>
                <span className="font-black text-emerald-500">100% Operational</span>
              </div>
            </div>
          </div>

          {/* Gemini 2.5 Pro */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                <h3 className="font-black text-slate-900 dark:text-white">Gemini 2.5 Pro</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase">
                Reasoning Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? "نموذج الاستدلال المعقد المخصص لمعالجة الشكاوى الطبية وتصنيف الطلبات المتقدمة."
                : "Advanced reasoning model designed for complex complaint resolution and multi-step logic."}
            </p>
            <div className="pt-2 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "متوسط زمن الاستجابة" : "Avg Latency"}</span>
                <span className="font-bold text-slate-900 dark:text-white">~650ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحد الأقصى للتزامن" : "Concurrency Limit"}</span>
                <span className="font-bold text-indigo-500">360 RPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحالة الحالية" : "Current Status"}</span>
                <span className="font-black text-emerald-500">100% Operational</span>
              </div>
            </div>
          </div>

          {/* Gemini Flash Lite */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-sky-500" />
                <h3 className="font-black text-slate-900 dark:text-white">Gemini Flash Lite</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-black uppercase">
                Ultra Light
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? "نموذج فائق السرعة والتوفير المخصص للتصنيف اللحظي والتوجيه السريع."
                : "Ultra-fast lightweight model for classification, fallback intent routing, and triage."}
            </p>
            <div className="pt-2 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "متوسط زمن الاستجابة" : "Avg Latency"}</span>
                <span className="font-bold text-slate-900 dark:text-white">~190ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحد الأقصى للتزامن" : "Concurrency Limit"}</span>
                <span className="font-bold text-sky-500">2,000 RPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? "الحالة الحالية" : "Current Status"}</span>
                <span className="font-black text-emerald-500">100% Operational</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED INSPECTION MODAL FOR SELECTED TENANT */}
      {selectedTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedTenantModal.workspaceName}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {selectedTenantModal.workspaceId} • Industry: {selectedTenantModal.industry}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTenantModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  {isAr ? "متوسط زمن الاستجابة" : "Avg Latency"}
                </span>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedTenantModal.avgLatencyMs} <span className="text-xs font-normal text-slate-400">ms</span>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  {isAr ? "نسبة الأخطاء" : "Error Rate"}
                </span>
                <p
                  className={`text-xl font-black ${
                    selectedTenantModal.errorRatePercent > 3 ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {selectedTenantModal.errorRatePercent}%
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  {isAr ? "إجمالي الطلبات" : "Total Requests"}
                </span>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedTenantModal.totalCalls}
                </p>
              </div>
            </div>

            {/* Recent Error Logs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {isAr ? "سجل الأخطاء الفردية للمؤسسة" : "Tenant Specific Error Logs"}
                </h4>

                {selectedTenantModal.recentErrorLogs.length > 0 && (
                  <button
                    onClick={() =>
                      handleClearErrors(selectedTenantModal.workspaceId, selectedTenantModal.workspaceName)
                    }
                    className="text-xs text-rose-500 hover:underline font-bold flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{isAr ? "مسح أخطاء هذه المؤسسة" : "Clear Error History"}</span>
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedTenantModal.recentErrorLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
                    <span>{isAr ? "لا توجد أخطاء مسجلة لهذه المؤسسة" : "No recent errors for this tenant"}</span>
                  </div>
                ) : (
                  selectedTenantModal.recentErrorLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                        <span className="text-rose-400 font-bold">{log.errorCode}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p className="text-rose-300 font-sans text-xs">{log.errorMessage}</p>
                      <p className="text-[10px] text-slate-400 italic font-sans">Prompt: "{log.promptSnippet}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedTenantModal(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
