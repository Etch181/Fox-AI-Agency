import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface WorkspaceCreditState {
  workspaceId: string;
  planId: "starter" | "business" | "enterprise";
  aiConversationsUsed: number;
  creditBalance: number;
  unlimited: boolean;
}

const PLAN_LIMITS = {
  starter: 50,
  business: 1000,
  enterprise: -1,
} as const;

function normalizePlanId(
  value: any
): "starter" | "business" | "enterprise" {
  if (value === "enterprise") return "enterprise";
  if (value === "business") return "business";
  return "starter";
}

export const creditService = {
  async getState(
    workspaceId: string
  ): Promise<WorkspaceCreditState> {
    const ref = doc(db, "workspaces", workspaceId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error(
        `Workspace not found: ${workspaceId}`
      );
    }

    const data: any = snap.data();

    const planId = normalizePlanId(data.planId);
    const limit = PLAN_LIMITS[planId];

    const used =
      Number(data.aiConversationsUsed || 0);

    /*
     * creditBalance is the authoritative remaining balance.
     * For old workspaces where it has not yet been initialized,
     * derive it once from the plan limit.
     */
    let balance: number;

    if (limit === -1) {
      balance = -1;
    } else if (
      typeof data.creditBalance === "number"
    ) {
      balance = data.creditBalance;
    } else {
      balance = Math.max(0, limit - used);
    }

    return {
      workspaceId,
      planId,
      aiConversationsUsed: used,
      creditBalance: balance,
      unlimited: limit === -1,
    };
  },

  async canUseAI(
    workspaceId: string
  ): Promise<{
    allowed: boolean;
    state: WorkspaceCreditState;
  }> {
    const state = await this.getState(workspaceId);

    return {
      allowed:
        state.unlimited ||
        state.creditBalance > 0,
      state,
    };
  },

  async consumeConversation(
    workspaceId: string,
    metadata?: {
      channel?: string;
      sessionId?: string;
      agentRole?: string;
    }
  ) {
    const workspaceRef =
      doc(db, "workspaces", workspaceId);

    const usageRef =
      doc(
        db,
        "workspaces",
        workspaceId,
        "usage",
        `usage_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`
      );

    return runTransaction(
      db,
      async (transaction) => {
        const snapshot =
          await transaction.get(workspaceRef);

        if (!snapshot.exists()) {
          throw new Error(
            `Workspace not found: ${workspaceId}`
          );
        }

        const data: any = snapshot.data();

        const planId =
          normalizePlanId(data.planId);

        const limit = PLAN_LIMITS[planId];

        const used =
          Number(data.aiConversationsUsed || 0);

        let balance: number;

        if (limit === -1) {
          balance = -1;
        } else if (
          typeof data.creditBalance === "number"
        ) {
          balance = data.creditBalance;
        } else {
          balance = Math.max(
            0,
            limit - used
          );
        }

        if (
          limit !== -1 &&
          balance <= 0
        ) {
          throw new Error(
            "FOX_AI_CREDITS_EXHAUSTED"
          );
        }

        const nextUsed = used + 1;

        const nextBalance =
          limit === -1
            ? -1
            : Math.max(0, balance - 1);

        transaction.update(
          workspaceRef,
          {
            aiConversationsUsed: nextUsed,
            creditBalance: nextBalance,
            updatedAt:
              new Date().toISOString(),
          }
        );

        transaction.set(
          usageRef,
          {
            workspaceId,
            type: "ai_conversation",
            units: 1,
            planId,
            channel:
              metadata?.channel || "unknown",
            sessionId:
              metadata?.sessionId || null,
            agentRole:
              metadata?.agentRole || null,
            balanceBefore: balance,
            balanceAfter: nextBalance,
            createdAt:
              new Date().toISOString(),
          }
        );

        return {
          success: true,
          workspaceId,
          planId,
          aiConversationsUsed:
            nextUsed,
          creditBalance:
            nextBalance,
          unlimited:
            limit === -1,
        };
      }
    );
  },

  async initializeCredits(
    workspaceId: string
  ) {
    const state = await this.getState(
      workspaceId
    );

    const ref =
      doc(db, "workspaces", workspaceId);

    await setDoc(
      ref,
      {
        creditBalance:
          state.creditBalance,
        aiConversationsUsed:
          state.aiConversationsUsed,
        updatedAt:
          new Date().toISOString(),
      },
      { merge: true }
    );

    return state;
  },
};
