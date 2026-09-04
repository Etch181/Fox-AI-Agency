import { adminDb } from "./firebaseAdmin.ts";

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
  if (value === "enterprise") {
    return "enterprise";
  }

  if (value === "business") {
    return "business";
  }

  return "starter";
}

function normalizeWorkspaceId(
  workspaceId: string
): string {
  const clean =
    String(workspaceId || "").trim();

  if (!clean) {
    throw new Error(
      "FOX_WORKSPACE_ID_REQUIRED"
    );
  }

  return clean;
}

function calculateCreditState(
  workspaceId: string,
  data: any
): WorkspaceCreditState {
  const planId =
    normalizePlanId(
      data?.planId
    );

  const limit =
    PLAN_LIMITS[planId];

  const used =
    Math.max(
      0,
      Number(
        data?.aiConversationsUsed || 0
      )
    );

  let balance: number;

  if (limit === -1) {
    balance = -1;

  } else if (
    typeof data?.creditBalance ===
    "number"
  ) {
    balance =
      Math.max(
        0,
        Number(
          data.creditBalance
        )
      );

  } else {
    balance =
      Math.max(
        0,
        limit - used
      );
  }

  return {
    workspaceId,
    planId,
    aiConversationsUsed:
      used,

    creditBalance:
      balance,

    unlimited:
      limit === -1,
  };
}

export const creditService = {

  // =========================================================
  // READ CURRENT CREDIT STATE
  // Backend-only / Firebase Admin
  // =========================================================

  async getState(
    workspaceId: string
  ): Promise<WorkspaceCreditState> {

    const cleanWorkspaceId =
      normalizeWorkspaceId(
        workspaceId
      );

    const workspaceRef =
      adminDb
        .collection("workspaces")
        .doc(cleanWorkspaceId);

    const snapshot =
      await workspaceRef.get();

    if (!snapshot.exists) {
      throw new Error(
        `FOX_WORKSPACE_NOT_FOUND:${cleanWorkspaceId}`
      );
    }

    const data =
      snapshot.data() || {};

    return calculateCreditState(
      cleanWorkspaceId,
      data
    );
  },


  // =========================================================
  // AI USAGE GUARD
  // =========================================================

  async canUseAI(
    workspaceId: string
  ): Promise<{
    allowed: boolean;
    state: WorkspaceCreditState;
  }> {

    const state =
      await this.getState(
        workspaceId
      );

    return {
      allowed:
        state.unlimited ||
        state.creditBalance > 0,

      state,
    };
  },


  // =========================================================
  // ATOMIC CONVERSATION CREDIT CONSUMPTION
  //
  // IMPORTANT:
  // - Firebase Admin only
  // - Transaction prevents double-spend
  // - Workspace document is source of truth
  // - Usage record is written in same transaction
  // =========================================================

  async consumeConversation(
    workspaceId: string,
    metadata?: {
      channel?: string;
      sessionId?: string;
      agentRole?: string;
    }
  ) {

    const cleanWorkspaceId =
      normalizeWorkspaceId(
        workspaceId
      );

    const workspaceRef =
      adminDb
        .collection("workspaces")
        .doc(cleanWorkspaceId);

    const usageRef =
      workspaceRef
        .collection("usage")
        .doc(
          `usage_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 8)}`
        );

    return adminDb.runTransaction(
      async (transaction) => {

        const snapshot =
          await transaction.get(
            workspaceRef
          );

        if (!snapshot.exists) {
          throw new Error(
            `FOX_WORKSPACE_NOT_FOUND:${cleanWorkspaceId}`
          );
        }

        const data =
          snapshot.data() || {};

        const currentState =
          calculateCreditState(
            cleanWorkspaceId,
            data
          );

        const planId =
          currentState.planId;

        const limit =
          PLAN_LIMITS[planId];

        const used =
          currentState.aiConversationsUsed;

        const balance =
          currentState.creditBalance;

        if (
          !currentState.unlimited &&
          balance <= 0
        ) {
          throw new Error(
            "FOX_AI_CREDITS_EXHAUSTED"
          );
        }

        const nextUsed =
          used + 1;

        const nextBalance =
          limit === -1
            ? -1
            : Math.max(
                0,
                balance - 1
              );

        const now =
          new Date().toISOString();

        transaction.update(
          workspaceRef,
          {
            aiConversationsUsed:
              nextUsed,

            creditBalance:
              nextBalance,

            updatedAt:
              now,
          }
        );

        transaction.set(
          usageRef,
          {
            workspaceId:
              cleanWorkspaceId,

            type:
              "ai_conversation",

            units:
              1,

            planId,

            channel:
              metadata?.channel ||
              "unknown",

            sessionId:
              metadata?.sessionId ||
              null,

            agentRole:
              metadata?.agentRole ||
              null,

            balanceBefore:
              balance,

            balanceAfter:
              nextBalance,

            createdAt:
              now,
          }
        );

        return {
          success:
            true,

          workspaceId:
            cleanWorkspaceId,

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


  // =========================================================
  // INITIALIZE LEGACY WORKSPACE CREDIT FIELDS
  // =========================================================

  async initializeCredits(
    workspaceId: string
  ) {

    const cleanWorkspaceId =
      normalizeWorkspaceId(
        workspaceId
      );

    const state =
      await this.getState(
        cleanWorkspaceId
      );

    const ref =
      adminDb
        .collection("workspaces")
        .doc(cleanWorkspaceId);

    await ref.set(
      {
        creditBalance:
          state.creditBalance,

        aiConversationsUsed:
          state.aiConversationsUsed,

        updatedAt:
          new Date().toISOString(),
      },
      {
        merge:
          true,
      }
    );

    return state;
  },
};
