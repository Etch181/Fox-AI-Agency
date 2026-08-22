import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "../../services/LanguageService";
import { AuditLog, AuditLogCategory, AuditLogSeverity } from "../../types";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  Server,
  Receipt,
  Eye,
  AlertTriangle,
  Info,
  Terminal,
  FileSpreadsheet,
  Lock,
  X,
  Key,
  Bot,
  LifeBuoy,
} from "lucide-react";

type SortField = "timestamp" | "actorName" | "action" | "category" | "severity" | "target";
type SortOrder = "asc" | "desc";

export const AdminAuditLogs: React.FC = () => {
  const { t, isAr } = useTranslation();
  const { auditLogs, addAuditLog, currentUser, addToast } = useApp();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // New Log Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAction, setNewAction] = useState("");
  const [newCategory, setNewCategory] = useState<AuditLogCategory>("security");
  const [newSeverity, setNewSeverity] = useState<AuditLogSeverity>("warning");
  const [newTarget, setNewTarget] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle sort order or field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filtered and Sorted Logs
  const filteredLogs = useMemo(() => {
    let result = [...auditLogs];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q) ||
          (log.ipAddress && log.ipAddress.includes(q)) ||
          log.id.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((log) => log.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      result = result.filter((log) => log.severity === selectedSeverity);
    }

    // Timeframe filter
    if (timeframe !== "all") {
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      result = result.filter((log) => {
        const logTime = new Date(log.timestamp).getTime();
        if (isNaN(logTime)) return true;
        if (timeframe === "today") return now - logTime <= oneDay;
        if (timeframe === "7days") return now - logTime <= 7 * oneDay;
        if (timeframe === "30days") return now - logTime <= 30 * oneDay;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (sortField === "timestamp") {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }

      const cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [auditLogs, searchQuery, selectedCategory, selectedSeverity, timeframe, sortField, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const critical = auditLogs.filter((l) => l.severity === "critical").length;
    const warnings = auditLogs.filter((l) => l.severity === "warning").length;
    const securityEvents = auditLogs.filter((l) => l.category === "security" || l.category === "authentication").length;
    const billingEvents = auditLogs.filter((l) => l.category === "billing").length;

    return { total, critical, warnings, securityEvents, billingEvents };
  }, [auditLogs]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      addToast(isAr ? "لا توجد سجلات للتصدير" : "No logs available to export", "info");
      return;
    }

    const headers = ["Log ID", "Timestamp", "Actor Name", "Actor Email", "Role", "Action", "Category", "Severity", "Target", "Details", "IP Address"];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actorName}"`,
      `"${l.actorEmail}"`,
      l.actorRole,
      `"${l.action.replace(/"/g, '""')}"`,
      l.category,
      l.severity,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fox_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(isAr ? "تم تصدير ملف CSV بنجاح!" : "Audit CSV exported successfully!", "success");
  };

  // Handle Manual Log Submit
  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.trim() || !newTarget.trim() || !newDetails.trim()) {
      addToast(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await addAuditLog({
        action: newAction.trim(),
        category: newCategory,
        severity: newSeverity,
        target: newTarget.trim(),
        details: newDetails.trim(),
        actorName: currentUser?.name || "Hesham M. (Super Admin)",
        actorEmail: currentUser?.email || "info.hesham.m@gmail.com",
        actorRole: "super_admin",
        ipAddress: "197.38.12.45",
      });

      addToast(isAr ? "تم تسجيل الحدث الأمني في السجلات بنجاح!" : "Manual audit log entry saved to Firestore!", "success");
      setIsAddModalOpen(false);
      setNewAction("");
      setNewTarget("");
      setNewDetails("");
    } catch (err) {
      addToast(isAr ? "حدث خطأ أثناء حفظ السجل" : "Failed to save audit log entry", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper badge color functions
  const getSeverityBadge = (sev: AuditLogSeverity) => {
    switch (sev) {
      case "critical":
        return "bg-rose-500/10 text-rose-500 border-rose-500/30 dark:bg-rose-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:bg-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 dark:bg-sky-500/20";
    }
  };

  const getCategoryIcon = (cat: AuditLogCategory) => {
    switch (cat) {
      case "security":
      case "authentication":
        return <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />;
      case "billing":
        return <Receipt className="h-3.5 w-3.5 text-emerald-500" />;
      case "workspace":
        return <Server className="h-3.5 w-3.5 text-amber-500" />;
      case "ticket":
        return <LifeBuoy className="h-3.5 w-3.5 text-orange-500" />;
      case "api":
        return <Bot className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <Terminal className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5" />
              <span>{isAr ? "مركز الحماية والمراجعة الرقمية" : "Security & Audit Governance"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? "سجلات المراجعة والأمان (Audit Logs)" : "System Audit & Security Logs"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              {isAr
                ? "مراقبة وتسجيل جميع عمليات مدير النظام، إجراءات الفوترة، أحداث الأمان، وتغييرات الصلاحيات ومحاولات الوصول عبر المؤسسات لحظياً."
                : "Real-time immutable logging for all super admin actions, payment approvals, workspace security events, and cross-tenant access assertions."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-extrabold transition shadow-md"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-orange-500/20 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? "تسجيل حدث أمني" : "Log Security Event"}</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-700/60 relative z-10">
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "إجمالي الأحداث" : "Total Log Entries"}</span>
              <FileSpreadsheet className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-xl font-black text-white">{stats.total}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "تنبيهات حرجة" : "Critical Alerts"}</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400">{stats.critical}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "أحداث الأمان" : "Security Operations"}</span>
              <ShieldCheck className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-xl font-black text-sky-400">{stats.securityEvents}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-700/50 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{isAr ? "حماية الجدار الناري" : "Isolation Guard"}</span>
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isAr ? "نشط ومؤمّن" : "Active & Enforced"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? "بحث بالإجراء، المنفذ، الهدف، عنوان IP، أو التفاصيل..."
                  : "Search action, actor, target, IP address, or details..."
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
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? "كل التصنيفات" : "All Categories"}</option>
                <option value="security">{isAr ? "أمان وحماية" : "Security"}</option>
                <option value="billing">{isAr ? "مدفوعات وفوترة" : "Billing"}</option>
                <option value="workspace">{isAr ? "مساحات العمل" : "Workspace"}</option>
                <option value="authentication">{isAr ? "تسجيل الدخول" : "Authentication"}</option>
                <option value="ticket">{isAr ? "الدعم الفني" : "Tickets"}</option>
                <option value="system">{isAr ? "النظام" : "System"}</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? "كل مستويات الخطورة" : "All Severities"}</option>
                <option value="info">{isAr ? "معلومات (Info)" : "Info"}</option>
                <option value="warning">{isAr ? "تحذير (Warning)" : "Warning"}</option>
                <option value="critical">{isAr ? "حرج جداً (Critical)" : "Critical"}</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? "كل الأوقات" : "All Time"}</option>
                <option value="today">{isAr ? "اليوم" : "Today"}</option>
                <option value="7days">{isAr ? "آخر 7 أيام" : "Last 7 Days"}</option>
                <option value="30days">{isAr ? "آخر 30 يوم" : "Last 30 Days"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            {isAr
              ? `عرض ${filteredLogs.length} من إجمالي ${auditLogs.length} سجل أمني`
              : `Showing ${filteredLogs.length} of ${auditLogs.length} audit logs`}
          </span>

          {(searchQuery || selectedCategory !== "all" || selectedSeverity !== "all" || timeframe !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedSeverity("all");
                setTimeframe("all");
              }}
              className="text-xs text-orange-600 hover:underline font-bold"
            >
              {isAr ? "إعادة ضبط الفلاتر" : "Reset Filters"}
            </button>
          )}
        </div>
      </div>

      {/* Sortable Audit Data Table */}
      <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-black uppercase text-slate-500 tracking-wider select-none">
                {/* Timestamp */}
                <th
                  onClick={() => handleSort("timestamp")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? "التاريخ والوقت" : "Timestamp"}</span>
                    {sortField === "timestamp" ? (
                      sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Actor */}
                <th
                  onClick={() => handleSort("actorName")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? "المنفذ (Actor)" : "Actor"}</span>
                    {sortField === "actorName" ? (
                      sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Action & Category */}
                <th
                  onClick={() => handleSort("action")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? "الإجراء والتصنيف" : "Action & Category"}</span>
                    {sortField === "action" ? (
                      sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Target */}
                <th
                  onClick={() => handleSort("target")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? "الهدف (Target)" : "Target"}</span>
                    {sortField === "target" ? (
                      sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Severity */}
                <th
                  onClick={() => handleSort("severity")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? "الخطورة" : "Severity"}</span>
                    {sortField === "severity" ? (
                      sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* IP Address */}
                <th className="py-3.5 px-4">
                  <span>{isAr ? "عنوان IP" : "IP Address"}</span>
                </th>

                {/* Details Action */}
                <th className="py-3.5 px-4 text-center">
                  <span>{isAr ? "التفاصيل" : "Details"}</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">
                        {isAr ? "لم يتم العثور على أي سجلات طابق المبحث" : "No audit logs found matching criteria"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isAr ? "جرب ضبط الفلاتر أو تنظيف حقل البحث" : "Try resetting filters or search query"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                        {log.actorName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                        {log.actorEmail}
                      </div>
                    </td>

                    {/* Action & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                          {getCategoryIcon(log.category)}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-orange-500 transition line-clamp-1">
                            {log.action}
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            {log.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Target */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      <span className="line-clamp-1 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                        {log.target}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getSeverityBadge(
                          log.severity
                        )}`}
                      >
                        {log.severity === "critical" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                        <span>{log.severity}</span>
                      </span>
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.ipAddress || "127.0.0.1"}
                    </td>

                    {/* View Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition"
                        title={isAr ? "عرض التفاصيل الكاملة" : "View Details"}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED LOG INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden space-y-6 p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isAr ? "تفاصيل حدث المراجعة والأمان" : "Audit Log Record Detail"}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">ID: {selectedLog.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">{isAr ? "المنفذ" : "Actor"}</span>
                <p className="font-extrabold text-slate-900 dark:text-white">{selectedLog.actorName}</p>
                <p className="text-slate-400 text-[11px]">{selectedLog.actorEmail}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">{isAr ? "التوقيت و IP" : "Timestamp & IP"}</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedLog.timestamp}</p>
                <p className="font-mono text-slate-400 text-[11px]">IP: {selectedLog.ipAddress || "N/A"}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">{isAr ? "الإجراء الأساسي" : "Action"}</span>
                <p className="font-extrabold text-base text-slate-900 dark:text-white">{selectedLog.action}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300">
                    Category: {selectedLog.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${getSeverityBadge(selectedLog.severity)}`}>
                    Severity: {selectedLog.severity}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">{isAr ? "الهدف المتأثر" : "Target Resource"}</span>
                <p className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">{selectedLog.target}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 space-y-2 sm:col-span-2">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{isAr ? "وصف ومحتوى السجل" : "Details & Description"}</span>
                <p className="text-xs leading-relaxed font-sans">{selectedLog.details}</p>
              </div>

              {selectedLog.metadata && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">{isAr ? "بيانات إضافية (Metadata JSON)" : "Metadata Payload"}</span>
                  <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-950 rounded-xl">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG NEW SECURITY EVENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isAr ? "تسجيل حدث أمني يدوياً" : "Record Security Audit Event"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? "إضافة بيان مراجعة إلى قاعدة بيانات Firestore الحية" : "Persists audit log entry into Firestore"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "عنوان الإجراء (Action Title)" : "Action Title"}
                </label>
                <input
                  type="text"
                  required
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder={isAr ? "مثال: مراجعة يدوية لصلاحيات مساحة عمل" : "e.g., Manual Security Clearance Audit"}
                  className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "التصنيف (Category)" : "Category"}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AuditLogCategory)}
                    className="w-full h-10 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="security">{isAr ? "أمان وحماية" : "Security"}</option>
                    <option value="billing">{isAr ? "مدفوعات" : "Billing"}</option>
                    <option value="workspace">{isAr ? "مساحات العمل" : "Workspace"}</option>
                    <option value="authentication">{isAr ? "مصادقة" : "Authentication"}</option>
                    <option value="ticket">{isAr ? "تذاكر" : "Ticket"}</option>
                    <option value="system">{isAr ? "النظام" : "System"}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "مستوى الخطورة (Severity)" : "Severity"}
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AuditLogSeverity)}
                    className="w-full h-10 px-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "الهدف المتأثر (Target Resource)" : "Target Resource"}
                </label>
                <input
                  type="text"
                  required
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder={isAr ? "مثال: Workspace #ws_clinic" : "e.g., Workspace #ws_clinic"}
                  className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "تفاصيل الوصف" : "Details Description"}
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder={isAr ? "اكتب وصفاً كاملاً للحدث الأمني والملاحظات..." : "Enter complete audit event description..."}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-lg shadow-orange-600/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  <span>{isAr ? "حفظ السجل في Firestore" : "Save Log Entry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
