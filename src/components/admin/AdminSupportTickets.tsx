import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { SupportTicket } from "../../types";
import {
  LifeBuoy,
  Search,
  Filter,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Tag,
  X,
  User,
  Bot,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

export const AdminSupportTickets: React.FC = () => {
  const {
    supportTickets,
    workspaces,
    addTicketReply,
    updateTicketStatus,
    language,
  } = useApp();

  const isAr = language === "ar";

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");

  // Active ticket selection
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Reply text state
  const [replyText, setReplyText] = useState("");

  const selectedTicket = supportTickets.find((t) => t.id === selectedTicketId);
  const ticketWorkspace = workspaces.find((w) => w.id === selectedTicket?.workspaceId);

  // Filtered tickets
  const filteredTickets = supportTickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWorkspace = workspaceFilter === "All" || t.workspaceId === workspaceFilter;
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;

    return matchesSearch && matchesWorkspace && matchesStatus && matchesPriority;
  });

  // Overview stats
  const totalCount = supportTickets.length;
  const needsResponseCount = supportTickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;
  const awaitingClientCount = supportTickets.filter((t) => t.status === "Awaiting Client").length;
  const resolvedCount = supportTickets.filter(
    (t) => t.status === "Resolved" || t.status === "Closed"
  ).length;

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    addTicketReply(selectedTicketId, replyText.trim());
    setReplyText("");
  };

  const handleQuickTemplate = (templateText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n${templateText}` : templateText));
  };

  const getPriorityBadge = (p: SupportTicket["priority"]) => {
    switch (p) {
      case "Urgent":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "High":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "Medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusBadge = (s: SupportTicket["status"]) => {
    switch (s) {
      case "Open":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "In Progress":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Awaiting Client":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "Resolved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Closed":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 ltr:right-0 rtl:left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-black text-white">
              {isAr ? "إدارة تذاكر الدعم الفني للعملاء (Super Admin)" : "Super Admin Ticket Control Center"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {isAr
              ? "منصة الإدارة المركزية للرد على استفسارات العملاء، متابعة مشاكل البوتات والذكاء الاصطناعي، وتأكيد عمليات الاشتراك عبر انستاباي."
              : "Unified ticket hub for Super Admin to respond to client queries, troubleshoot AI bots, and manage subscriptions."}
          </p>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "إجمالي التذاكر" : "Total Tickets"}</span>
            <LifeBuoy className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-white">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 relative overflow-hidden">
          {needsResponseCount > 0 && (
            <div className="absolute top-2 ltr:right-2 rtl:left-2 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          )}
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "تتطلب رد الإدارة" : "Needs Admin Response"}</span>
            <Clock className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-400">{needsResponseCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "بانتظار رد العميل" : "Awaiting Client"}</span>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{awaitingClientCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "مغلقة / تم الحل" : "Resolved / Closed"}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{resolvedCount}</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets Table / List */}
        <div className={`${selectedTicketId ? "hidden lg:block lg:col-span-5" : "lg:col-span-12"} space-y-4`}>
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? "بحث بالعميل، الموضوع، أو رقم التذكرة..." : "Search tickets, workspace, or email..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent text-white focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <select
                value={workspaceFilter}
                onChange={(e) => setWorkspaceFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 focus:outline-none truncate"
              >
                <option value="All">{isAr ? "جميع مساحات العمل" : "All Workspaces"}</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 focus:outline-none"
              >
                <option value="All">{isAr ? "جميع الحالات" : "All Statuses"}</option>
                <option value="Open">{isAr ? "جديد (Open)" : "Open"}</option>
                <option value="In Progress">{isAr ? "قيد المتابعة" : "In Progress"}</option>
                <option value="Awaiting Client">{isAr ? "بانتظار العميل" : "Awaiting Client"}</option>
                <option value="Resolved">{isAr ? "تم الحل (Resolved)" : "Resolved"}</option>
                <option value="Closed">{isAr ? "مغلقة (Closed)" : "Closed"}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 focus:outline-none col-span-2 md:col-span-1"
              >
                <option value="All">{isAr ? "جميع الأولويات" : "All Priorities"}</option>
                <option value="Urgent">{isAr ? "عاجل (Urgent)" : "Urgent"}</option>
                <option value="High">{isAr ? "عالية (High)" : "High"}</option>
                <option value="Medium">{isAr ? "متوسطة (Medium)" : "Medium"}</option>
                <option value="Low">{isAr ? "منخفضة (Low)" : "Low"}</option>
              </select>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
                <LifeBuoy className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {isAr ? "لا توجد تذاكر تطابق الفلتر المختار." : "No tickets found matching filters."}
                </p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const lastReply = t.replies[t.replies.length - 1];

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer space-y-2.5 ${
                      isSelected
                        ? "bg-slate-800/90 border-orange-500 shadow-lg shadow-orange-500/10"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                          {t.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <span className="truncate">{t.workspaceName}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 mt-1">{t.subject}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {lastReply?.message || t.subject}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span>{t.category}</span>
                      </span>
                      <span className="font-mono">{t.updatedAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Admin Response Workspace Panel */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[550px] shadow-2xl relative">
            <div className="space-y-4">
              {/* Header with Workspace Summary & Status Changer */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                      {selectedTicket.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>

                  <h2 className="text-base font-black text-white pt-1">{selectedTicket.subject}</h2>

                  {/* Workspace Tenant Info Card */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white font-extrabold">
                        <Building2 className="h-4 w-4 text-orange-500" />
                        <span>{selectedTicket.workspaceName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        ID: {selectedTicket.workspaceId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span>{selectedTicket.clientEmail}</span>
                      </div>
                      {selectedTicket.clientPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{selectedTicket.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Changer Control */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-400 font-bold">
                      {isAr ? "تغيير حالة التذكرة:" : "Ticket Status:"}
                    </label>
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="p-1 text-slate-400 hover:text-white lg:hidden"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <select
                    value={selectedTicket.status}
                    onChange={(e) =>
                      updateTicketStatus(selectedTicket.id, e.target.value as SupportTicket["status"])
                    }
                    className="rounded-xl border border-orange-500/30 bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-orange-400 focus:outline-none"
                  >
                    <option value="Open">{isAr ? "مفتوحة (Open)" : "Open"}</option>
                    <option value="In Progress">{isAr ? "قيد المتابعة (In Progress)" : "In Progress"}</option>
                    <option value="Awaiting Client">{isAr ? "بانتظار العميل (Awaiting Client)" : "Awaiting Client"}</option>
                    <option value="Resolved">{isAr ? "محلولة (Resolved)" : "Resolved"}</option>
                    <option value="Closed">{isAr ? "مغلقة (Closed)" : "Closed"}</option>
                  </select>
                </div>
              </div>

              {/* Message Thread History */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedTicket.replies.map((reply) => {
                  const isAgencyAdmin = reply.senderRole === "super_admin";

                  return (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-2xl border space-y-2 ${
                        isAgencyAdmin
                          ? "bg-slate-950/90 border-orange-500/40 shadow-lg shadow-orange-500/5 ltr:ml-4 rtl:mr-4"
                          : "bg-slate-800/60 border-slate-700/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAgencyAdmin
                                ? "bg-orange-600 text-white"
                                : "bg-slate-700 text-slate-200"
                            }`}
                          >
                            {isAgencyAdmin ? <Bot className="h-4 w-4" /> : reply.senderName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs">{reply.senderName}</span>
                            {isAgencyAdmin ? (
                              <span className="ltr:ml-2 rtl:mr-2 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-black border border-orange-500/30">
                                👑 {isAr ? "إدارة الوكالة" : "Agency Super Admin"}
                              </span>
                            ) : (
                              <span className="ltr:ml-2 rtl:mr-2 px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] font-bold">
                                {isAr ? "العميل" : "Client"}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">{reply.createdAt}</span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pt-1 font-medium">
                        {reply.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Admin Action Presets & Composer Form */}
            <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ⚡ {isAr ? "قوالب الرد السريع للإدارة:" : "Quick Admin Response Templates:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate(
                        isAr
                          ? "تمت مراجعة عملية التحويل عبر انستا باي، وتأكيد اشتراكك وتمديد الصلاحية بنجاح!"
                          : "Instapay payment verified! Your subscription plan has been activated successfully."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700"
                  >
                    {isAr ? "✅ تأكيد الدفع عبر انستاباي" : "✅ Verify Instapay"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate(
                        isAr
                          ? "تم تحديث البرومبت الخاص بالذكاء الاصطناعي لحسابك بنجاح. يمكنك تجربة البوت الآن في التليجرام!"
                          : "AI Prompt updated successfully! You can test your bot behavior on Telegram now."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700"
                  >
                    {isAr ? "🤖 تحديث البرومبت" : "🤖 Prompt Updated"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickTemplate(
                        isAr
                          ? "المشكلة التقنية قيد التحقيق بواسطة المهندس المسؤول وسيتم حله خلال ساعات قليلة."
                          : "Under technical investigation by our engineers. Will update you shortly."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 border border-slate-700"
                  >
                    {isAr ? "🔍 جاري الفحص التقني" : "🔍 Investigating"}
                  </button>
                </div>
              </div>

              {/* Admin Reply Form */}
              <form onSubmit={handleSendAdminReply} className="space-y-3">
                <textarea
                  rows={3}
                  placeholder={
                    isAr
                      ? "أكتب رد إدارة الوكالة الرسمي للعميل..."
                      : "Type official Super Admin response..."
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-3.5 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-slate-500 resize-none"
                  required
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">
                    👑 {isAr ? "إرسال كـ Super Admin (Hesham M.)" : "Sending as Super Admin"}
                  </span>

                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-orange-600/20 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isAr ? "إرسال رد الإدارة" : "Send Admin Reply"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
