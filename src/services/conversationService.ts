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
