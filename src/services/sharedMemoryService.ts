import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export interface ConversationMessage {
  sender: "user" | "bot";
  text: string;
  time: string;
  agentRole?:
    | "Support"
    | "Sales"
    | "Marketing"
    | "Router"
    | "Unknown";
}

export interface SharedMemoryContext {
  workspaceId: string;
  sessionId: string;
  messages: ConversationMessage[];
  lastUpdatedAt: string;
  assignedAgent?:
    | "Support"
    | "Sales"
    | "Marketing"
    | "Router"
    | "Unknown";
}

function normalizeId(
  value: string,
  errorCode: string
): string {
  const clean = String(value || "").trim();

  if (!clean) {
    throw new Error(errorCode);
  }

  return clean;
}

function getMemoryRef(
  workspaceId: string,
  sessionId: string
) {
  const cleanWorkspaceId = normalizeId(
    workspaceId,
    "FOX_WORKSPACE_ID_REQUIRED"
  );

  const cleanSessionId = normalizeId(
    sessionId,
    "FOX_SESSION_ID_REQUIRED"
  );

  return {
    workspaceId: cleanWorkspaceId,
    sessionId: cleanSessionId,

    ref: adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("shared_memory")
      .doc(cleanSessionId),
  };
}

export class SharedMemoryService {
  async getContext(
    workspaceId: string,
    sessionId: string
  ): Promise<SharedMemoryContext> {
    try {
      const {
        workspaceId: cleanWorkspaceId,
        sessionId: cleanSessionId,
        ref,
      } = getMemoryRef(
        workspaceId,
        sessionId
      );

      const snap = await ref.get();

      if (snap.exists) {
        return snap.data() as SharedMemoryContext;
      }

      return {
        workspaceId: cleanWorkspaceId,
        sessionId: cleanSessionId,
        messages: [],
        lastUpdatedAt:
          new Date().toISOString(),
      };
    } catch (err) {
      console.warn(
        "SharedMemoryService: Could not fetch context, returning empty.",
        err
      );

      return {
        workspaceId:
          String(workspaceId || "").trim(),
        sessionId:
          String(sessionId || "").trim(),
        messages: [],
        lastUpdatedAt:
          new Date().toISOString(),
      };
    }
  }

  async appendMessage(
    workspaceId: string,
    sessionId: string,
    message: ConversationMessage
  ): Promise<void> {
    try {
      const {
        workspaceId: cleanWorkspaceId,
        sessionId: cleanSessionId,
        ref,
      } = getMemoryRef(
        workspaceId,
        sessionId
      );

      const now =
        new Date().toISOString();

      const cleanMessage: ConversationMessage = {
        sender: message.sender,
        text: message.text,
        time: message.time,

        ...(message.agentRole
          ? {
              agentRole:
                message.agentRole,
            }
          : {}),
      };

      const snap = await ref.get();

      if (snap.exists) {
        const current =
          snap.data() as SharedMemoryContext;

        const updatePayload: Record<
          string,
          any
        > = {
          messages:
            FieldValue.arrayUnion(
              cleanMessage
            ),

          lastUpdatedAt: now,
        };

        const assignedAgent =
          message.agentRole ||
          current.assignedAgent;

        if (assignedAgent) {
          updatePayload.assignedAgent =
            assignedAgent;
        }

        await ref.set(
          updatePayload,
          {
            merge: true,
          }
        );

        return;
      }

      const newContext: SharedMemoryContext = {
        workspaceId:
          cleanWorkspaceId,

        sessionId:
          cleanSessionId,

        messages: [
          cleanMessage,
        ],

        lastUpdatedAt: now,

        ...(message.agentRole
          ? {
              assignedAgent:
                message.agentRole,
            }
          : {}),
      };

      await ref.set(newContext);
    } catch (err) {
      console.error(
        "SharedMemoryService: Failed to append message.",
        err
      );
    }
  }

  async resetContext(
    workspaceId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const {
        workspaceId: cleanWorkspaceId,
        sessionId: cleanSessionId,
        ref,
      } = getMemoryRef(
        workspaceId,
        sessionId
      );

      await ref.set(
        {
          workspaceId:
            cleanWorkspaceId,

          sessionId:
            cleanSessionId,

          messages: [],

          lastUpdatedAt:
            new Date().toISOString(),

          assignedAgent:
            FieldValue.delete(),
        },
        {
          merge: true,
        }
      );
    } catch (err) {
      console.error(
        "SharedMemoryService: Failed to reset context.",
        err
      );
    }
  }
}

export const sharedMemoryService =
  new SharedMemoryService();
