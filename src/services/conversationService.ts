import { adminDb } from "./firebaseAdmin.ts";
import { FieldValue } from "firebase-admin/firestore";

export type ConversationChannel =
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "web";

export type ConversationSender =
  | "customer"
  | "ai"
  | "human"
  | "system";

export interface FoxConversation {
  id: string;
  workspaceId: string;
  sessionId: string;
  channel: ConversationChannel;

  customerId: string;
  customerName: string;
  customerPhone?: string;
  externalChatId?: string;

  status:
    | "open"
    | "ai_handled"
    | "human_needed"
    | "resolved";

  assignedTo: "ai" | "human";
  activeAgent?: string;
  previousAgent?: string;
  lastHandoffAt?: string;
  handoffReason?: string;

  lastMessage: string;
  lastMessageSender: ConversationSender;
  lastMessageAt: string;

  unreadCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface FoxConversationMessage {
  id: string;
  workspaceId: string;
  conversationId: string;
  sessionId: string;
  channel: ConversationChannel;

  sender: ConversationSender;
  text: string;

  externalMessageId?: string;
  agentRole?: string;

  createdAt: string;
}

function safeId(value: string) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 180);
}

function cleanObject<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as T;
}

function normalizeWorkspaceId(workspaceId: string) {
  const clean = String(workspaceId || "").trim();

  if (!clean) {
    throw new Error("FOX_WORKSPACE_ID_REQUIRED");
  }

  return clean;
}

function makeMessageId() {
  return `msg_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function conversationIdFor(
  channel: ConversationChannel,
  externalChatId: string
) {
  return safeId(`${channel}_${externalChatId}`);
}

export const conversationService = {
  async getOrCreateConversation(
    workspaceId: string,
    data: {
      sessionId: string;
      channel: ConversationChannel;
      externalChatId: string;
      customerName?: string;
      customerPhone?: string;
    }
  ): Promise<FoxConversation> {
    const cleanWorkspaceId =
      normalizeWorkspaceId(workspaceId);

    const conversationId =
      conversationIdFor(
        data.channel,
        data.externalChatId
      );

    const ref =
      adminDb
        .collection("workspaces")
        .doc(cleanWorkspaceId)
        .collection("conversations")
        .doc(conversationId);

    const existing = await ref.get();

    if (existing.exists) {
      return {
        ...(existing.data() as FoxConversation),
        id: existing.id,
      };
    }

    const now = new Date().toISOString();

    const conversation =
      cleanObject<FoxConversation>({
        id: conversationId,
        workspaceId: cleanWorkspaceId,
        sessionId: data.sessionId,
        channel: data.channel,

        customerId: safeId(data.externalChatId),
        customerName:
          data.customerName ||
          data.customerPhone ||
          data.externalChatId,

        customerPhone: data.customerPhone,
        externalChatId: data.externalChatId,

        status: "open",
        assignedTo: "ai",
        activeAgent: "support",

        lastMessage: "",
        lastMessageSender: "system",
        lastMessageAt: now,

        unreadCount: 0,

        createdAt: now,
        updatedAt: now,
      });

    await ref.set(conversation);

    return conversation;
  },

  async appendMessage(
    workspaceId: string,
    conversationId: string,
    data: {
      sessionId: string;
      channel: ConversationChannel;
      sender: ConversationSender;
      text: string;
      externalMessageId?: string;
      agentRole?: string;
    }
  ) {
    const cleanWorkspaceId =
      normalizeWorkspaceId(workspaceId);

    const cleanConversationId =
      String(conversationId || "").trim();

    if (!cleanConversationId) {
      throw new Error(
        "FOX_CONVERSATION_ID_REQUIRED"
      );
    }

    const cleanText =
      String(data.text || "").trim();

    if (!cleanText) {
      return null;
    }

    const now = new Date().toISOString();
    const messageId = makeMessageId();

    const conversationRef =
      adminDb
        .collection("workspaces")
        .doc(cleanWorkspaceId)
        .collection("conversations")
        .doc(cleanConversationId);

    const messageRef =
      conversationRef
        .collection("messages")
        .doc(messageId);

    const message =
      cleanObject<FoxConversationMessage>({
        id: messageId,
        workspaceId: cleanWorkspaceId,
        conversationId: cleanConversationId,
        sessionId: data.sessionId,
        channel: data.channel,
        sender: data.sender,
        text: cleanText,
        externalMessageId:
          data.externalMessageId,
        agentRole:
          data.agentRole,
        createdAt: now,
      });

    await messageRef.set(message);

    const updatePayload: Record<string, any> = {
      lastMessage: cleanText,
      lastMessageSender: data.sender,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (data.sender === "customer") {
      updatePayload.unreadCount =
        FieldValue.increment(1);
      updatePayload.status = "open";
    }

    if (data.sender === "ai") {
      updatePayload.status = "ai_handled";
      updatePayload.assignedTo = "ai";
    }

    if (data.sender === "human") {
      updatePayload.status = "open";
      updatePayload.assignedTo = "human";
    }

    await conversationRef.set(
      updatePayload,
      { merge: true }
    );

    return message;
  },

  async getRecentMessages(
    workspaceId: string,
    conversationId: string,
    limit = 20
  ): Promise<FoxConversationMessage[]> {
    const cleanWorkspaceId = normalizeWorkspaceId(workspaceId);
    const cleanConversationId = String(conversationId || "").trim();
    if (!cleanConversationId) throw new Error("FOX_CONVERSATION_ID_REQUIRED");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const snapshot = await adminDb
      .collection("workspaces").doc(cleanWorkspaceId)
      .collection("conversations").doc(cleanConversationId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(safeLimit).get();
    return snapshot.docs
      .map((doc) => doc.data() as FoxConversationMessage)
      .reverse();
  },

  async markRead(
    workspaceId: string,
    conversationId: string
  ) {
    const cleanWorkspaceId =
      normalizeWorkspaceId(workspaceId);

    const cleanConversationId =
      String(conversationId || "").trim();

    if (!cleanConversationId) {
      throw new Error(
        "FOX_CONVERSATION_ID_REQUIRED"
      );
    }

    await adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("conversations")
      .doc(cleanConversationId)
      .set(
        {
          unreadCount: 0,
          updatedAt:
            new Date().toISOString(),
        },
        { merge: true }
      );
  },

  async transferAgent(
    workspaceId: string,
    conversationId: string,
    nextAgent: string,
    reason: string,
  ) {
    const cleanWorkspaceId = normalizeWorkspaceId(workspaceId);
    const cleanConversationId = String(conversationId || "").trim();
    const cleanNextAgent = String(nextAgent || "").trim();
    if (!cleanConversationId) throw new Error("FOX_CONVERSATION_ID_REQUIRED");
    if (!cleanNextAgent) throw new Error("FOX_AGENT_ID_REQUIRED");

    const ref = adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("conversations")
      .doc(cleanConversationId);

    const snap = await ref.get();
    const current = String(snap.data()?.activeAgent || "").trim();
    if (current === cleanNextAgent) return { transferred: false, from: current, to: cleanNextAgent };

    const now = new Date().toISOString();
    const handoffUpdate: Record<string, any> = {
      activeAgent: cleanNextAgent,
      lastHandoffAt: now,
      handoffReason: String(reason || "intent_reroute"),
      updatedAt: now,
    };
    if (current) handoffUpdate.previousAgent = current;

    await ref.set(handoffUpdate, { merge: true });

    await ref.collection("events").add({
      type: "agent_handoff",
      fromAgent: current || null,
      toAgent: cleanNextAgent,
      reason: String(reason || "intent_reroute"),
      createdAt: now,
    });

    return { transferred: true, from: current || null, to: cleanNextAgent, reason: String(reason || "intent_reroute") };
  },

  async setAssignment(
    workspaceId: string,
    conversationId: string,
    assignedTo: "ai" | "human",
    status?: "open" | "ai_handled" | "human_needed" | "resolved"
  ) {
    const cleanWorkspaceId = normalizeWorkspaceId(workspaceId);
    const cleanConversationId = String(conversationId || "").trim();
    if (!cleanConversationId) throw new Error("FOX_CONVERSATION_ID_REQUIRED");

    await adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("conversations")
      .doc(cleanConversationId)
      .set(
        {
          assignedTo,
          status: status || (assignedTo === "human" ? "human_needed" : "ai_handled"),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  },

  async getConversation(
    workspaceId: string,
    conversationId: string
  ): Promise<FoxConversation | null> {
    const cleanWorkspaceId = normalizeWorkspaceId(workspaceId);
    const cleanConversationId = String(conversationId || "").trim();
    if (!cleanConversationId) return null;

    const snap = await adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("conversations")
      .doc(cleanConversationId)
      .get();

    return snap.exists
      ? ({ ...(snap.data() as FoxConversation), id: snap.id })
      : null;
  },

  async setStatus(
    workspaceId: string,
    conversationId: string,
    status:
      | "open"
      | "ai_handled"
      | "human_needed"
      | "resolved"
  ) {
    const cleanWorkspaceId =
      normalizeWorkspaceId(workspaceId);

    const cleanConversationId =
      String(conversationId || "").trim();

    if (!cleanConversationId) {
      throw new Error(
        "FOX_CONVERSATION_ID_REQUIRED"
      );
    }

    await adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("conversations")
      .doc(cleanConversationId)
      .set(
        {
          status,
          updatedAt:
            new Date().toISOString(),
        },
        { merge: true }
      );
  },
};
