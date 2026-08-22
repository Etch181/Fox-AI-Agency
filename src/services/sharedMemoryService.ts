import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

export interface ConversationMessage {
  sender: "user" | "bot";
  text: string;
  time: string;
  agentRole?: "Support" | "Sales" | "Marketing" | "Router" | "Unknown";
}

export interface SharedMemoryContext {
  workspaceId: string;
  sessionId: string; // e.g. customer phone or telegram chatId
  messages: ConversationMessage[];
  lastUpdatedAt: string;
  assignedAgent?: "Support" | "Sales" | "Marketing" | "Router" | "Unknown";
}

export class SharedMemoryService {
  /**
   * Fetch the shared conversation context for a given workspace and session (customer)
   */
  async getContext(workspaceId: string, sessionId: string): Promise<SharedMemoryContext> {
    try {
      const docRef = doc(db, "workspaces", workspaceId, "shared_memory", sessionId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SharedMemoryContext;
      }
      return {
        workspaceId,
        sessionId,
        messages: [],
        lastUpdatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn("SharedMemoryService: Could not fetch context, returning empty.", err);
      return { workspaceId, sessionId, messages: [], lastUpdatedAt: new Date().toISOString() };
    }
  }

  /**
   * Append a new message to the shared conversation context
   */
  async appendMessage(workspaceId: string, sessionId: string, message: ConversationMessage): Promise<void> {
    try {
      const docRef = doc(db, "workspaces", workspaceId, "shared_memory", sessionId);
      const snap = await getDoc(docRef);

      // Firestore rejects undefined values, so omit agentRole if it is not set.
      const cleanMessage: ConversationMessage = {
        sender: message.sender,
        text: message.text,
        time: message.time,
        ...(message.agentRole ? { agentRole: message.agentRole } : {}),
      };

      if (snap.exists()) {
        const updatePayload: any = {
          messages: arrayUnion(cleanMessage),
          lastUpdatedAt: new Date().toISOString(),
        };

        const assignedAgent = message.agentRole || snap.data().assignedAgent;
        if (assignedAgent) {
          updatePayload.assignedAgent = assignedAgent;
        }

        await updateDoc(docRef, updatePayload);
      } else {
        const newCtx: SharedMemoryContext = {
          workspaceId,
          sessionId,
          messages: [cleanMessage],
          lastUpdatedAt: new Date().toISOString(),
          ...(message.agentRole ? { assignedAgent: message.agentRole } : {}),
        };

        await setDoc(docRef, newCtx);
      }
    } catch (err) {
      console.error("SharedMemoryService: Failed to append message.", err);
    }
  }

  /**
   * Clear or reset context
   */
  async resetContext(workspaceId: string, sessionId: string): Promise<void> {
    try {
      const docRef = doc(db, "workspaces", workspaceId, "shared_memory", sessionId);
      await setDoc(docRef, {
        workspaceId,
        sessionId,
        messages: [],
        lastUpdatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("SharedMemoryService: Failed to reset context.", err);
    }
  }
}

export const sharedMemoryService = new SharedMemoryService();
