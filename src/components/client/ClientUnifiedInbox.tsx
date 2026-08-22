import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useApp } from "../../context/AppContext";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import { authenticatedFetch } from "../../services/authenticatedFetch";

import {
  MessageSquare,
  MoreVertical,
  Search,
  Bot,
  User,
  CheckCheck,
  Inbox,
  PhoneCall,
  RefreshCw,
} from "lucide-react";

type Channel =
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "web";

type ConversationStatus =
  | "open"
  | "ai_handled"
  | "human_needed"
  | "resolved";

interface Conversation {
  id: string;
  workspaceId: string;
  sessionId: string;
  channel: Channel;

  customerId: string;
  customerName: string;
  customerPhone?: string;
  externalChatId?: string;

  status: ConversationStatus;
  assignedTo?: "ai" | "human";

  lastMessage: string;
  lastMessageSender:
    | "customer"
    | "ai"
    | "human"
    | "system";

  lastMessageAt: string;
  unreadCount: number;

  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  sender:
    | "customer"
    | "ai"
    | "human"
    | "system";

  text: string;
  createdAt: string;
  agentRole?: string;
}

export const ClientUnifiedInbox: React.FC = () => {
  const {
    currentWorkspace,
    language,
  } = useApp();

  const isAr = language === "ar";

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<ConversationMessage[]>([]);

  const [activeChat, setActiveChat] =
    useState<string | null>(null);

  const [preferredConversationId] =
    useState<string | null>(() =>
      sessionStorage.getItem(
        "fox_open_conversation_id"
      )
    );

  const [activeTab, setActiveTab] =
    useState<
      "all" |
      "whatsapp" |
      "telegram" |
      "instagram"
    >("all");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [humanReply, setHumanReply] =
    useState("");

  const [sendingHumanReply, setSendingHumanReply] =
    useState(false);

  const [returningToAI, setReturningToAI] =
    useState(false);

  if (!currentWorkspace) {
    return null;
  }

  // --------------------------------------------------------
  // LIVE CONVERSATIONS
  // --------------------------------------------------------

  useEffect(() => {
    setLoading(true);

    const ref = collection(
      db,
      "workspaces",
      currentWorkspace.id,
      "conversations"
    );

    const q = query(
      ref,
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map(
          (snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })
        ) as Conversation[];

        setConversations(rows);

        setActiveChat((current) => {
          if (
            preferredConversationId &&
            rows.some(
              (c) =>
                c.id === preferredConversationId
            )
          ) {
            sessionStorage.removeItem(
              "fox_open_conversation_id"
            );

            return preferredConversationId;
          }

          if (
            current &&
            rows.some((c) => c.id === current)
          ) {
            return current;
          }

          return rows[0]?.id || null;
        });

        setLoading(false);
      },
      (error) => {
        console.error(
          "Unified Inbox conversations error:",
          error
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [
    currentWorkspace.id,
    preferredConversationId,
  ]);

  // --------------------------------------------------------
  // LIVE MESSAGES FOR SELECTED CONVERSATION
  // --------------------------------------------------------

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const ref = collection(
      db,
      "workspaces",
      currentWorkspace.id,
      "conversations",
      activeChat,
      "messages"
    );

    const q = query(
      ref,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map(
            (snapshotDoc) => ({
              id: snapshotDoc.id,
              ...snapshotDoc.data(),
            })
          ) as ConversationMessage[]
        );
      },
      (error) => {
        console.error(
          "Unified Inbox messages error:",
          error
        );
      }
    );

    return unsubscribe;
  }, [
    currentWorkspace.id,
    activeChat,
  ]);

  // --------------------------------------------------------
  // MARK SELECTED CONVERSATION READ
  // --------------------------------------------------------

  useEffect(() => {
    if (!activeChat) return;

    updateDoc(
      doc(
        db,
        "workspaces",
        currentWorkspace.id,
        "conversations",
        activeChat
      ),
      {
        unreadCount: 0,
        updatedAt:
          new Date().toISOString(),
      }
    ).catch((error) => {
      console.warn(
        "Unified Inbox mark read failed:",
        error
      );
    });
  }, [
    currentWorkspace.id,
    activeChat,
  ]);

  const filteredConvs = useMemo(() => {
    let rows = conversations;

    if (activeTab !== "all") {
      rows = rows.filter(
        (conversation) =>
          conversation.channel === activeTab
      );
    }

    const search =
      searchTerm.trim().toLowerCase();

    if (search) {
      rows = rows.filter(
        (conversation) =>
          String(
            conversation.customerName || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            conversation.customerPhone || ""
          ).includes(search) ||
          String(
            conversation.externalChatId || ""
          ).includes(search) ||
          String(
            conversation.lastMessage || ""
          )
            .toLowerCase()
            .includes(search)
      );
    }

    return rows;
  }, [
    conversations,
    activeTab,
    searchTerm,
  ]);

  const activeConv =
    conversations.find(
      (conversation) =>
        conversation.id === activeChat
    ) || null;

  const formatTime = (
    iso?: string
  ) => {
    if (!iso) return "";

    const date = new Date(iso);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const now = new Date();

    if (
      date.toDateString() ===
      now.toDateString()
    ) {
      return date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }

    return date.toLocaleDateString(
      [],
      {
        month: "short",
        day: "numeric",
      }
    );
  };

  const channelBadgeClass = (
    channel: Channel
  ) => {
    if (channel === "whatsapp") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    }

    if (channel === "instagram") {
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    }

    if (channel === "telegram") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }

    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const handleReturnToAI = async () => {
    if (!activeConv || returningToAI) {
      return;
    }

    const approved = confirm(
      isAr
        ? "هل تريد إعادة هذه المحادثة للذكاء الاصطناعي؟ سيعود البوت للرد تلقائياً على الرسائل الجديدة."
        : "Return this conversation to AI? The bot will automatically reply to new messages again."
    );

    if (!approved) {
      return;
    }

    setReturningToAI(true);

    try {
      const res = await authenticatedFetch(
        `/api/conversations/${encodeURIComponent(
          activeConv.id
        )}/return-to-ai`,
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
          "Failed to return conversation to AI"
        );
      }

    } catch (error: any) {
      alert(
        error?.message ||
        (isAr
          ? "تعذر إعادة المحادثة للذكاء الاصطناعي."
          : "Could not return conversation to AI.")
      );
    } finally {
      setReturningToAI(false);
    }
  };

  const handleHumanReply = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !activeConv ||
      !humanReply.trim() ||
      sendingHumanReply
    ) {
      return;
    }

    if (activeConv.channel !== "telegram") {
      alert(
        isAr
          ? "الرد اليدوي متاح حالياً لمحادثات Telegram فقط."
          : "Human reply currently supports Telegram conversations only."
      );
      return;
    }

    const text = humanReply.trim();

    setSendingHumanReply(true);

    try {
      const res = await authenticatedFetch(
        `/api/conversations/${encodeURIComponent(
          activeConv.id
        )}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            text,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Failed to send message"
        );
      }

      setHumanReply("");

    } catch (error: any) {
      alert(
        error?.message ||
        (isAr
          ? "تعذر إرسال الرسالة."
          : "Could not send message.")
      );
    } finally {
      setSendingHumanReply(false);
    }
  };

  return (
    <div
      className={`h-[calc(100vh-140px)] flex flex-col ${
        isAr
          ? "dir-rtl"
          : "dir-ltr"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="h-6 w-6 text-indigo-500" />

            <span>
              {isAr
                ? "صندوق الوارد الموحد"
                : "Unified Inbox"}
            </span>
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "محادثات العملاء الحقيقية من القنوات المتصلة"
              : "Live customer conversations from connected channels"}
          </p>
        </div>

        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          <span>
            {loading
              ? isAr
                ? "جاري التحميل..."
                : "Loading..."
              : isAr
              ? `${conversations.length} محادثة`
              : `${conversations.length} conversations`}
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex overflow-hidden">
        {/* Conversation list */}
        <div
          className={`w-1/3 border-${
            isAr
              ? "l"
              : "r"
          } border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search
                className={`absolute ${
                  isAr
                    ? "right-3"
                    : "left-3"
                } top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400`}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder={
                  isAr
                    ? "بحث في المحادثات..."
                    : "Search conversations..."
                }
                className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 ${
                  isAr
                    ? "pr-9 pl-3"
                    : "pl-9 pr-3"
                } text-xs focus:outline-none focus:border-indigo-500`}
              />
            </div>

            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {[
                "all",
                "telegram",
                "whatsapp",
                "instagram",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() =>
                    setActiveTab(
                      tab as any
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                    activeTab === tab
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                      : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tab === "all"
                    ? isAr
                      ? "الكل"
                      : "All"
                    : tab
                        .charAt(0)
                        .toUpperCase() +
                      tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!loading &&
              filteredConvs.length ===
                0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />

                  {isAr
                    ? "لا توجد محادثات بعد."
                    : "No conversations yet."}
                </div>
              )}

            {filteredConvs.map(
              (conversation) => (
                <div
                  key={conversation.id}
                  onClick={() =>
                    setActiveChat(
                      conversation.id
                    )
                  }
                  className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition ${
                    activeChat ===
                    conversation.id
                      ? "bg-indigo-50/80 dark:bg-slate-800"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
                      {conversation.customerName ||
                        conversation.externalChatId ||
                        "Customer"}
                    </h4>

                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {formatTime(
                        conversation.lastMessageAt
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate pr-2">
                      {conversation.lastMessage}
                    </p>

                    {Number(
                      conversation.unreadCount ||
                        0
                    ) > 0 && (
                      <span className="bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {
                          conversation.unreadCount
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${channelBadgeClass(
                        conversation.channel
                      )}`}
                    >
                      {
                        conversation.channel
                      }
                    </span>

                    {conversation.status ===
                      "ai_handled" && (
                      <span className="text-[9px] flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        <Bot className="h-3 w-3" />
                        AI Handled
                      </span>
                    )}

                    {conversation.status ===
                      "human_needed" && (
                      <span className="text-[9px] flex items-center gap-1 text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded font-bold">
                        <User className="h-3 w-3" />
                        Human Needed
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Active chat */}
        {activeConv ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg text-white ${
                    activeConv.channel ===
                    "whatsapp"
                      ? "bg-emerald-500"
                      : activeConv.channel ===
                        "instagram"
                      ? "bg-pink-500"
                      : "bg-blue-500"
                  }`}
                >
                  {String(
                    activeConv.customerName ||
                      "C"
                  ).charAt(0)}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {
                      activeConv.customerName
                    }
                  </h3>

                  <p className="text-[11px] text-slate-500 capitalize">
                    {activeConv.channel} •{" "}
                    {activeConv.assignedTo ===
                    "human"
                      ? isAr
                        ? "موظف بشري"
                        : "Human"
                      : isAr
                      ? "الذكاء الاصطناعي"
                      : "AI"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 text-slate-400">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                  <PhoneCall className="h-4 w-4" />
                </button>

                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-8">
                  {isAr
                    ? "لا توجد رسائل."
                    : "No messages."}
                </div>
              )}

              {messages.map((message) => {
                const customer =
                  message.sender ===
                  "customer";

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      customer
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] border p-3 rounded-2xl shadow-sm ${
                        customer
                          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-none"
                          : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 rounded-tr-none"
                      }`}
                    >
                      {!customer && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {message.sender ===
                          "ai" ? (
                            <>
                              <Bot className="h-3 w-3" />
                              AI Reply
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3" />
                              Human Reply
                            </>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {message.text}
                      </p>

                      <div className="text-[9px] text-slate-400 mt-1 flex justify-end items-center gap-1">
                        {formatTime(
                          message.createdAt
                        )}

                        {!customer && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleHumanReply}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={humanReply}
                  onChange={(e) =>
                    setHumanReply(e.target.value)
                  }
                  disabled={
                    sendingHumanReply ||
                    activeConv.channel !== "telegram"
                  }
                  placeholder={
                    activeConv.channel === "telegram"
                      ? isAr
                        ? "اكتب ردك للعميل كموظف..."
                        : "Reply to customer as human..."
                      : isAr
                      ? "الرد اليدوي لهذه القناة قريباً..."
                      : "Human reply for this channel coming soon..."
                  }
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={
                    sendingHumanReply ||
                    !humanReply.trim() ||
                    activeConv.channel !== "telegram"
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-sm disabled:opacity-50"
                >
                  {sendingHumanReply
                    ? isAr
                      ? "جاري الإرسال..."
                      : "Sending..."
                    : isAr
                    ? "إرسال"
                    : "Send"}
                </button>
              </div>

              {activeConv.assignedTo === "human" && (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {isAr
                      ? "👤 هذه المحادثة تحت متابعة موظف بشري، والذكاء الاصطناعي متوقف مؤقتاً."
                      : "👤 Human takeover is active. AI auto-replies are temporarily paused."}
                  </p>

                  <button
                    type="button"
                    onClick={handleReturnToAI}
                    disabled={returningToAI}
                    className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {returningToAI
                      ? isAr
                        ? "جاري الإعادة..."
                        : "Returning..."
                      : isAr
                      ? "🤖 إعادة للذكاء الاصطناعي"
                      : "🤖 Return to AI"}
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />

            <p>
              {isAr
                ? "اختر محادثة للبدء"
                : "Select a conversation"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
