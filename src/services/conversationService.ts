import { db, sanitizeForFirestore } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

export type ConversationChannel =
  | "telegram"
  | "whatsapp"
  | "instagram"
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
    const conversationId = conversationIdFor(
      data.channel,
      data.externalChatId
    );

    const ref = doc(
      db,
      "workspaces",
      workspaceId,
      "conversations",
      conversationId
    );

    const existing = await getDoc(ref);

    if (existing.exists()) {
      return existing.data() as FoxConversation;
    }

    const now = new Date().toISOString();

    const conversation: FoxConversation =
      sanitizeForFirestore({
        id: conversationId,
        workspaceId,
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

    await setDoc(ref, conversation);

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
    const cleanText = String(data.text || "").trim();

    if (!cleanText) {
      return null;
    }

    const now = new Date().toISOString();
    const messageId = makeMessageId();

    const message: FoxConversationMessage =
      sanitizeForFirestore({
        id: messageId,
        workspaceId,
        conversationId,
        sessionId: data.sessionId,
        channel: data.channel,
        sender: data.sender,
        text: cleanText,
        externalMessageId:
          data.externalMessageId,
        agentRole: data.agentRole,
        createdAt: now,
      });

    await setDoc(
      doc(
        db,
        "workspaces",
        workspaceId,
        "conversations",
        conversationId,
        "messages",
        messageId
      ),
      message
    );

    const conversationRef = doc(
      db,
      "workspaces",
      workspaceId,
      "conversations",
      conversationId
    );

    const updatePayload: any = {
      lastMessage: cleanText,
      lastMessageSender: data.sender,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (data.sender === "customer") {
      updatePayload.unreadCount = increment(1);
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

    await updateDoc(
      conversationRef,
      updatePayload
    );

    return message;
  },

  async markRead(
    workspaceId: string,
    conversationId: string
  ) {
    await updateDoc(
      doc(
        db,
        "workspaces",
        workspaceId,
        "conversations",
        conversationId
      ),
      {
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      }
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
    await updateDoc(
      doc(
        db,
        "workspaces",
        workspaceId,
        "conversations",
        conversationId
      ),
      {
        status,
        updatedAt: new Date().toISOString(),
      }
    );
  },
};
