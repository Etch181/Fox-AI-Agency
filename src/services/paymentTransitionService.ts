import { calculateEntitlementRenewal } from "../utils/entitlementRenewal.ts";

export type PaymentTransitionAction = "approve" | "reject";

export interface PaymentTransitionRequest {
  paymentId: string;
  action: PaymentTransitionAction;
  reason?: string;
}

export interface PaymentTransitionActor {
  uid: string;
  email: string;
  name: string;
  role: "super_admin";
}

export interface PaymentTransitionTransaction {
  get(path: string): Promise<Record<string, any> | null>;
  update(path: string, updates: Record<string, any>): void;
  create(path: string, value: Record<string, any>): void;
}

export interface PaymentTransitionDependencies {
  runTransaction<T>(
    operation: (transaction: PaymentTransitionTransaction) => Promise<T>,
  ): Promise<T>;
  now(): Date;
  timestampFromDate(date: Date): unknown;
  nextAuditId(): string;
}

export class PaymentTransitionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const ALLOWED_PLANS = new Set(["starter", "business", "enterprise"]);
const EXTRA_PACKAGE_PRICES = new Map([
  [500, 250],
  [1000, 450],
  [2500, 900],
  [5000, 1600],
]);

export async function transitionPayment(
  request: PaymentTransitionRequest,
  actor: PaymentTransitionActor,
  dependencies: PaymentTransitionDependencies,
) {
  if (actor.role !== "super_admin") {
    throw new PaymentTransitionError(
      "SUPER_ADMIN_REQUIRED",
      "Super Admin authorization is required",
    );
  }

  const paymentId = String(request.paymentId || "").trim();

  if (!paymentId) {
    throw new PaymentTransitionError(
      "PAYMENT_ID_REQUIRED",
      "Payment ID is required",
    );
  }

  if (request.action !== "approve" && request.action !== "reject") {
    throw new PaymentTransitionError(
      "INVALID_PAYMENT_ACTION",
      "Payment action must be approve or reject",
    );
  }

  const rejectionReason = String(request.reason || "").trim();

  if (request.action === "reject" && !rejectionReason) {
    throw new PaymentTransitionError(
      "REJECTION_REASON_REQUIRED",
      "A rejection reason is required",
    );
  }

  return dependencies.runTransaction(async (transaction) => {
    const paymentPath = `payments/${paymentId}`;
    const payment = await transaction.get(paymentPath);

    if (!payment) {
      throw new PaymentTransitionError(
        "PAYMENT_NOT_FOUND",
        "Payment request was not found",
      );
    }

    if (payment.status !== "pending") {
      throw new PaymentTransitionError(
        "PAYMENT_ALREADY_PROCESSED",
        "Payment request was already processed",
      );
    }

    const workspaceId = String(payment.workspaceId || "").trim();

    if (!workspaceId) {
      throw new PaymentTransitionError(
        "PAYMENT_WORKSPACE_REQUIRED",
        "Payment is not bound to a workspace",
      );
    }

    const workspacePath = `workspaces/${workspaceId}`;
    const workspace = await transaction.get(workspacePath);

    if (!workspace || String(workspace.id || workspaceId) !== workspaceId) {
      throw new PaymentTransitionError(
        "WORKSPACE_NOT_FOUND",
        "Authoritative payment workspace was not found",
      );
    }

    const now = dependencies.now();
    const nowIso = now.toISOString();
    const auditId = dependencies.nextAuditId();
    let entitlementExpiresAtMillis: number | undefined;

    if (request.action === "approve") {
      if (payment.paymentType === "extra_package") {
        const conversations = Math.floor(
          Number(payment.extraConversationsCount || 0),
        );

        if (conversations <= 0) {
          throw new PaymentTransitionError(
            "INVALID_EXTRA_PACKAGE",
            "Extra conversation package is invalid",
          );
        }

        const expectedPrice = EXTRA_PACKAGE_PRICES.get(conversations);

        if (
          expectedPrice === undefined ||
          Number(payment.amountEGP) !== expectedPrice
        ) {
          throw new PaymentTransitionError(
            "PAYMENT_AMOUNT_MISMATCH",
            "Payment amount does not match the authoritative package price",
          );
        }

        transaction.update(workspacePath, {
          extraConversationsLimit:
            Number(workspace.extraConversationsLimit || 0) + conversations,
          extraPackages: [
            ...(Array.isArray(workspace.extraPackages)
              ? workspace.extraPackages
              : []),
            {
              id: `pkg-${auditId}`,
              name:
                payment.extraPackageName ||
                `+${conversations} conversations`,
              conversationsAdded: conversations,
              priceEGP: Number(payment.amountEGP || 0),
              addedAt: nowIso,
            },
          ],
        });
      } else {
        const planId = String(payment.planId || "");

        if (!ALLOWED_PLANS.has(planId)) {
          throw new PaymentTransitionError(
            "INVALID_PAYMENT_PLAN",
            "Payment plan is invalid",
          );
        }

        const plan = await transaction.get(`plans/${planId}`);

        if (
          !plan ||
          Number(payment.amountEGP) !== Number(plan.priceEGP)
        ) {
          throw new PaymentTransitionError(
            "PAYMENT_AMOUNT_MISMATCH",
            "Payment amount does not match the authoritative plan price",
          );
        }

        const expiry = calculateEntitlementRenewal(
          workspace.entitlementExpiresAt,
          now.getTime(),
          30,
        );
        entitlementExpiresAtMillis = expiry.getTime();

        transaction.update(workspacePath, {
          planId,
          status: "active",
          subscriptionExpiresAt: expiry.toISOString().split("T")[0],
          entitlementExpiresAt: dependencies.timestampFromDate(expiry),
          aiConversationsUsed: 0,
        });
      }

      transaction.update(paymentPath, {
        status: "approved",
        approvedAt: nowIso,
        approvedByUid: actor.uid,
        approvedBy: actor.email,
        activatedAt: nowIso,
      });
    } else {
      transaction.update(paymentPath, {
        status: "rejected",
        rejectionReason,
        rejectedAt: nowIso,
        rejectedByUid: actor.uid,
        rejectedBy: actor.email,
      });
    }

    transaction.create(`audit_logs/${auditId}`, {
      id: auditId,
      timestamp: dependencies.timestampFromDate(now),
      actorUid: actor.uid,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action:
        request.action === "approve"
          ? "Payment approved"
          : "Payment rejected",
      category: "billing",
      severity: "info",
      target: paymentId,
      workspaceId,
      details:
        request.action === "approve"
          ? "Authoritative payment transition completed"
          : `Payment rejected: ${rejectionReason}`,
    });

    return {
      paymentId,
      workspaceId,
      status:
        request.action === "approve" ? "approved" : "rejected",
      entitlementExpiresAtMillis,
    };
  });
}
