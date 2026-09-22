import React, { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { useTranslation } from "../../services/LanguageService";
import {
  ShieldCheck, MessageSquare, Phone, Instagram, MessageCircle, Globe,
  Clock, User, Sparkles, RefreshCw, X, Bot, UserRoundCheck
} from "lucide-react";

type MonitorRow = {
  workspaceId: string;
  workspaceName: string;
  conversationId: string;
  customerName: string;
  customerPhone?: string;
  channel: "telegram" | "whatsapp" | "instagram" | "messenger" | "web";
  status: "open" | "ai_handled" | "human_needed" | "resolved";
  assignedTo: "ai" | "human";
  activeAgent?: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageAt: string;
  unreadCount: number;
  crmLeadId?: string;
  handoffReason?: string;
};

type MessageRow = {
  id: string;
  sender: "customer" | "ai" | "human" | "system";
  text: string;
  agentRole?: string;
  createdAt: string;
};

export const AdminUnifiedMonitor: React.FC = () => {
  const { isAr } = useTranslation();
  const [rows, setRows] = useState<MonitorRow[]>([]);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [selected, setSelected] = useState<MonitorRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch("/api/admin/unified-monitor");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "MONITOR_LOAD_FAILED");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdated(String(data.generatedAt || new Date().toISOString()));
    } catch (error) {
      console.error("FOX unified monitor failed:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (row: MonitorRow) => {
    setSelected(row);
    setLoadingMessages(true);
    try {
      const url = "/api/admin/unified-monitor/" + encodeURIComponent(row.workspaceId) + "/" + encodeURIComponent(row.conversationId) + "/messages";
      const response = await authenticatedFetch(url);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "MESSAGES_LOAD_FAILED");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      console.error("FOX conversation monitor failed:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadRows();
    const timer = window.setInterval(() => void loadRows(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const channelOk = filterChannel === "all" || row.channel === filterChannel;
    const statusOk = filterStatus === "all" || row.status === filterStatus;
    return channelOk && statusOk;
  }), [rows, filterChannel, filterStatus]);

  const channelIcon = (channel: string) => {
    switch (channel) {
      case "telegram": return <Phone className="h-4 w-4 text-blue-500" />;
      case "whatsapp": return <MessageCircle className="h-4 w-4 text-emerald-500" />;
      case "instagram": return <Instagram className="h-4 w-4 text-rose-500" />;
      case "messenger": return <MessageCircle className="h-4 w-4 text-indigo-500" />;
      default: return <Globe className="h-4 w-4 text-amber-500" />;
    }
  };
  const statusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string; cls: string }> = {
      open: { ar: "مفتوح", en: "Open", cls: "text-amber-500 bg-amber-500/10" },
      ai_handled: { ar: "AI", en: "AI", cls: "text-violet-500 bg-violet-500/10" },
      human_needed: { ar: "تدخل بشري", en: "Human", cls: "text-rose-500 bg-rose-500/10" },
      resolved: { ar: "منتهي", en: "Resolved", cls: "text-emerald-500 bg-emerald-500/10" },
    };
    const item = labels[status] || labels.open;
    return <span className={"rounded-full px-2 py-0.5 text-[10px] font-black " + item.cls}>{isAr ? item.ar : item.en}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-400/20">
              <ShieldCheck className="h-6 w-6 text-violet-300" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">FOX LIVE CONTROL</div>
              <h2 className="mt-1 text-2xl font-black">{isAr ? "مراقب المحادثات الموحد" : "Unified Conversation Monitor"}</h2>
              <p className="mt-1 text-xs text-slate-300">{isAr ? "بيانات حقيقية من جميع محادثات المنشآت، مع تتبع الوكيل وآخر رسالة." : "Live workspace-scoped conversations with agent routing and latest message state."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-300 border border-emerald-500/20">{isAr ? "بيانات حقيقية" : "REAL DATA"}</span>
            <button onClick={() => void loadRows()} className="rounded-xl border border-white/10 bg-white/5 p-2.5 hover:bg-white/10"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /></button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] text-slate-400">{isAr ? "المحادثات" : "Conversations"}</p><p className="mt-1 text-xl font-black">{rows.length}</p></div>
          <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] text-slate-400">{isAr ? "تدخل بشري" : "Human needed"}</p><p className="mt-1 text-xl font-black text-rose-300">{rows.filter((r) => r.status === "human_needed").length}</p></div>
          <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] text-slate-400">{isAr ? "غير مقروء" : "Unread"}</p><p className="mt-1 text-xl font-black text-amber-300">{rows.reduce((sum, r) => sum + r.unreadCount, 0)}</p></div>
          <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] text-slate-400">{isAr ? "آخر تحديث" : "Updated"}</p><p className="mt-1 text-[11px] font-bold text-slate-200">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}</p></div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <option value="all">{isAr ? "كل القنوات" : "All channels"}</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="messenger">Messenger</option>
          <option value="web">Web</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <option value="all">{isAr ? "كل الحالات" : "All status"}</option>
          <option value="open">{isAr ? "مفتوح" : "Open"}</option>
          <option value="ai_handled">AI</option>
          <option value="human_needed">{isAr ? "تدخل بشري" : "Human"}</option>
          <option value="resolved">{isAr ? "منتهي" : "Resolved"}</option>
        </select>
        <span className="text-[10px] font-bold text-slate-400">{isAr ? "تحديث تلقائي كل 10 ثوانٍ" : "Auto-refresh every 10s"}</span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "المنشأة" : "Workspace"}</th>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "العميل" : "Customer"}</th>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "القناة" : "Channel"}</th>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "الوكيل" : "Agent"}</th>
                <th className="px-4 py-3 text-right font-bold">{isAr ? "آخر رسالة" : "Last message"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !rows.length ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400"><RefreshCw className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400">{isAr ? "لا توجد محادثات حقيقية مطابقة." : "No real conversations match the filter."}</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.workspaceId + ":" + row.conversationId} onClick={() => void loadConversation(row)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-200">{row.workspaceName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" /><span className="font-bold">{row.customerName}</span></div>
                    {row.customerPhone && <div className="mt-1 text-[9px] text-slate-400">{row.customerPhone}</div>}
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">{channelIcon(row.channel)}<span className="capitalize">{row.channel}</span></div></td>
                  <td className="px-4 py-3">{statusLabel(row.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500" /><span className="font-bold">{row.assignedTo === "ai" ? "AI" : (isAr ? "إنسان" : "Human")}</span></div>
                    {row.activeAgent && <div className="mt-1 text-[9px] text-slate-400">{row.activeAgent}</div>}
                  </td>
                  <td className="max-w-[360px] px-4 py-3">
                    <div className="line-clamp-2 text-slate-600 dark:text-slate-300">{row.lastMessage || "—"}</div>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-400"><Clock className="h-3 w-3" />{row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString() : "—"}{row.unreadCount > 0 && <span className="rounded-full bg-orange-500 px-1.5 py-0.5 font-black text-white">{row.unreadCount}</span>}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">{selected.workspaceName}</div>
                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selected.customerName}</h3>
                <p className="mt-1 text-xs text-slate-500">{selected.channel} · {selected.activeAgent || "support"} · {selected.assignedTo === "ai" ? "AI" : (isAr ? "إنسان" : "Human")}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingMessages ? (
                <div className="py-16 text-center text-slate-400"><RefreshCw className="mx-auto h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const fromCustomer = message.sender === "customer";
                    const fromHuman = message.sender === "human";
                    return (
                      <div key={message.id} className={"flex " + (fromCustomer ? "justify-start" : "justify-end")}>
                        <div className={"max-w-[82%] rounded-2xl px-4 py-3 " + (fromCustomer ? "bg-slate-100 dark:bg-slate-900" : fromHuman ? "bg-emerald-600 text-white" : "bg-violet-600 text-white")}>
                          <div className="mb-1 flex items-center gap-2 text-[9px] font-black opacity-70">
                            {fromCustomer ? <User className="h-3 w-3" /> : fromHuman ? <UserRoundCheck className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                            <span>{fromCustomer ? (isAr ? "العميل" : "Customer") : fromHuman ? (isAr ? "الموظف" : "Human") : "FOX AI"}</span>
                            {message.agentRole && <span>· {message.agentRole}</span>}
                          </div>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">{message.text}</p>
                          <div className="mt-2 text-[8px] opacity-60">{message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length && <div className="py-16 text-center text-sm text-slate-400">{isAr ? "لا توجد رسائل محفوظة بعد." : "No stored messages yet."}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminUnifiedMonitorSafe: React.FC = () => <AdminUnifiedMonitor />;
