import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { SupportTicket } from "../../types";
import {
  LifeBuoy,
  PlusCircle,
  Search,
  Filter,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  User,
  ShieldCheck,
  Tag,
  X,
  ChevronRight,
  ArrowLeft,
  Headphones,
  Bot,
  Sparkles,
} from "lucide-react";

export const ClientSupportTickets: React.FC = () => {
  const {
    currentWorkspace,
    currentUser,
    supportTickets,
    createSupportTicket,
    addTicketReply,
    language,
  } = useApp();

  const isAr = language === "ar";

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Active viewing ticket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New ticket modal state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicket["category"]>("Technical");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("Medium");
  const [message, setMessage] = useState("");
  const [clientPhone, setClientPhone] = useState(currentWorkspace?.phone || "");

  // Active reply message
  const [replyText, setReplyText] = useState("");

  if (!currentWorkspace) return null;

  // Filter workspace tickets
  const workspaceTickets = supportTickets.filter(
    (t) => t.workspaceId === currentWorkspace.id
  );

  const filteredTickets = workspaceTickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const selectedTicket = workspaceTickets.find((t) => t.id === selectedTicketId);

  // Quick stats
  const totalTickets = workspaceTickets.length;
  const openCount = workspaceTickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;
  const awaitingReplyCount = workspaceTickets.filter(
    (t) => t.status === "Awaiting Client"
  ).length;
  const resolvedCount = workspaceTickets.filter(
    (t) => t.status === "Resolved" || t.status === "Closed"
  ).length;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const newTicket = createSupportTicket({
      workspaceId: currentWorkspace.id,
      workspaceName: currentWorkspace.name,
      clientEmail: currentUser?.email || currentWorkspace.ownerEmail,
      clientPhone: clientPhone || currentWorkspace.phone,
      subject: subject.trim(),
      category,
      priority,
      status: 'Open',
      initialMessage: message.trim(),
    });

    setSubject("");
    setMessage("");
    setIsNewTicketOpen(false);
    setSelectedTicketId(newTicket.id);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    addTicketReply(selectedTicketId, replyText.trim());
    setReplyText("");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 ltr:right-0 rtl:left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Headphones className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-black text-white">
              {isAr ? "مركز الدعم الفني وتذاكر الخدمة" : "Agency Support & Tickets Center"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            {isAr
              ? "تواصل مباشرة مع مهندسي إدارة Fox AI Agency للحصول على مساعدة في الربط، إعدادات الذكاء الاصطناعي، والاشتراكات."
              : "Connect directly with Super Admins for bot technical assistance, prompt adjustments, and Instapay billing queries."}
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketOpen(true)}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition transform hover:-translate-y-0.5"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{isAr ? "إنشاء تذكرة دعم جديدة" : "Open New Ticket"}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "إجمالي التذاكر" : "Total Tickets"}</span>
            <LifeBuoy className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-white">{totalTickets}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "قيد المتابعة والعمل" : "Open / Active"}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-400">{openCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "رد الإدارة بانتظارك" : "Awaiting Your Reply"}</span>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{awaitingReplyCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{isAr ? "مكتمل ومحلول" : "Resolved"}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{resolvedCount}</p>
        </div>
      </div>

      {/* Main View Grid: Left List / Right Thread Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets List */}
        <div className={`${selectedTicketId ? "hidden lg:block lg:col-span-5" : "lg:col-span-12"} space-y-4`}>
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? "بحث برقم التذكرة أو العنوان..." : "Search tickets..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent text-white focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 focus:outline-none"
              >
                <option value="All">{isAr ? "كل الحالات" : "All Statuses"}</option>
                <option value="Open">{isAr ? "مفتوح (Open)" : "Open"}</option>
                <option value="In Progress">{isAr ? "قيد التنفيذ" : "In Progress"}</option>
                <option value="Awaiting Client">{isAr ? "رد الإدارة موجود" : "Awaiting Client"}</option>
                <option value="Resolved">{isAr ? "محلول (Resolved)" : "Resolved"}</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 focus:outline-none"
              >
                <option value="All">{isAr ? "كل التصنيفات" : "All Categories"}</option>
                <option value="AI Agent">{isAr ? "الذكاء الاصطناعي (AI Agent)" : "AI Agent"}</option>
                <option value="Billing">{isAr ? "الفواتير والدفع EGP" : "Billing"}</option>
                <option value="Technical">{isAr ? "مشاكل تقنية وربط" : "Technical"}</option>
                <option value="Feature Request">{isAr ? "طلب ميزة جديدة" : "Feature Request"}</option>
              </select>
            </div>
          </div>

          {/* Ticket Items Container */}
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3">
                <LifeBuoy className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {isAr ? "لا توجد تذاكر دعم تطابق معايير البحث." : "No support tickets match your filter."}
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
                      <h4 className="text-xs font-bold text-white line-clamp-1">{t.subject}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {lastReply?.message || t.subject}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        <span>{t.category}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <MessageSquare className="h-3 w-3 text-slate-400" />
                        <span>{t.replies.length} {isAr ? "ردود" : "replies"}</span>
                        <span>•</span>
                        <span>{t.updatedAt}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Thread Details */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between min-h-[500px] shadow-2xl relative">
            <div className="space-y-4">
              {/* Thread Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    </button>
                    <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                      {selectedTicket.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-white pt-1">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                    <span>{isAr ? "التصنيف:" : "Category:"} <strong className="text-slate-200">{selectedTicket.category}</strong></span>
                    <span>•</span>
                    <span>{isAr ? "الأولوية:" : "Priority:"} <strong className="text-slate-200">{selectedTicket.priority}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="hidden lg:block p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message Thread Container */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
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
                                ? "bg-orange-600 text-white shadow-sm"
                                : "bg-slate-700 text-slate-200"
                            }`}
                          >
                            {isAgencyAdmin ? <Bot className="h-4 w-4" /> : reply.senderName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs">{reply.senderName}</span>
                            {isAgencyAdmin && (
                              <span className="ltr:ml-2 rtl:mr-2 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-black border border-orange-500/30">
                                👑 {isAr ? "دعم وكالة Fox AI" : "Fox AI Super Admin"}
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

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-800 space-y-3 mt-4">
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder={
                    isAr
                      ? "أكتب ردك أو استفسارك الإضافي للإدارة هنا..."
                      : "Type your reply or additional details for Super Admin..."
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-3.5 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-slate-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500">
                  ⚡ {isAr ? "سيتم إشعار إدارة الوكالة بالرد فوراً" : "Notifies Super Admin instantly"}
                </p>

                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-orange-600/20 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isAr ? "إرسال الرد" : "Send Reply"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* CREATE NEW TICKET MODAL */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-white">
                  {isAr ? "فتح تذكرة دعم فني جديدة" : "Create Support Ticket"}
                </h3>
              </div>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isAr ? "عنوان التذكرة / الموضوع" : "Ticket Subject"}
                </label>
                <input
                  type="text"
                  placeholder={
                    isAr
                      ? "مثال: استفسار عن ضبط بومبت التليجرام أو الدفع عبر انستا باي"
                      : "e.g. Help configuring custom AI prompt or Instapay renewal"
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? "التصنيف" : "Category"}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportTicket["category"])}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="AI Agent">{isAr ? "إعدادات AI Agent" : "AI Agent"}</option>
                    <option value="Billing">{isAr ? "الفواتير والاشتراك EGP" : "Billing"}</option>
                    <option value="Technical">{isAr ? "الدعم التقني والربط" : "Technical"}</option>
                    <option value="Feature Request">{isAr ? "طلب ميزة جديدة" : "Feature Request"}</option>
                    <option value="Other">{isAr ? "أخرى" : "Other"}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? "الأولوية" : "Priority"}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket["priority"])}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Low">{isAr ? "منخفضة (Low)" : "Low"}</option>
                    <option value="Medium">{isAr ? "متوسطة (Medium)" : "Medium"}</option>
                    <option value="High">{isAr ? "عالية (High)" : "High"}</option>
                    <option value="Urgent">{isAr ? "عاجلة طارئة (Urgent)" : "Urgent"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isAr ? "رقم الهاتف للسرعة بالتواصل (واتساب)" : "WhatsApp Phone Contact"}
                </label>
                <input
                  type="text"
                  placeholder="+2010..."
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isAr ? "تفاصيل المشكلة أو الاستفسار" : "Detailed Message"}
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    isAr
                      ? "اشرح بالتفصيل المشكلة أو الخدمة التي تريد مساعدة الإدارة فيها..."
                      : "Provide as much context as possible..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-slate-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition"
                >
                  {isAr ? "تأكيد وإرسال التذكرة" : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
