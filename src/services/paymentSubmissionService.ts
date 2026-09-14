export type PaymentSubmissionType = "plan" | "extra_package";

export interface PaymentSubmissionRequest {
  workspaceId: string;
  paymentType: PaymentSubmissionType;
  planId?: string;
  extraConversationsCount?: number;
  transactionRef: string;
  screenshotUrl: string;
}

export interface PaymentSubmissionTransaction {
  get(path: string): Promise<Record<string, any> | null>;
  create(path: string, data: Record<string, any>): void;
}

export interface PaymentSubmissionDependencies {
  now(): Date;
  nextPaymentId(): string;
  referenceId(normalizedReference: string): string;
  runTransaction<T>(
    operation: (transaction: PaymentSubmissionTransaction) => Promise<T>,
  ): Promise<T>;
}

const EXTRA_PACKAGE_PRICES = new Map([
  [500, 250],
  [1000, 450],
  [2500, 900],
  [5000, 1600],
]);

export class PaymentSubmissionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function normalizeReference(reference: string) {
  const normalized = String(reference || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9-]{4,100}$/.test(normalized)) {
    throw new PaymentSubmissionError(
      "INVALID_TRANSACTION_REFERENCE",
      "Transaction reference is invalid",
    );
  }
  return normalized;
}

function validateProofUrl(value: string) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("unsafe");
    }
    return url.toString();
  } catch {
    throw new PaymentSubmissionError(
      "INVALID_PAYMENT_PROOF_URL",
      "Payment proof URL is invalid",
    );
  }
}

export async function submitPayment(
  request: PaymentSubmissionRequest,
  dependencies: PaymentSubmissionDependencies,
) {
  const workspaceId = String(request.workspaceId || "").trim();
  const transactionRef = normalizeReference(request.transactionRef);
  const screenshotUrl = validateProofUrl(request.screenshotUrl);
  const paymentId = dependencies.nextPaymentId();
  const referenceId = dependencies.referenceId(transactionRef);
  const submittedAt = dependencies.now().toISOString();

  return dependencies.runTransaction(async (transaction) => {
    const referencePath = `paymentReferences/${referenceId}`;
    const existingReference = await transaction.get(referencePath);

    if (existingReference) {
      throw new PaymentSubmissionError(
        "PAYMENT_REFERENCE_ALREADY_USED",
        "Transaction reference was already submitted",
      );
    }

    const workspace = await transaction.get(`workspaces/${workspaceId}`);
    if (!workspace) {
      throw new PaymentSubmissionError(
        "WORKSPACE_NOT_FOUND",
        "Workspace was not found",
      );
    }

    let amountEGP: number;
    let planId: string | undefined;
    let extraConversationsCount: number | undefined;
    let extraPackageName: string | undefined;
    let pricingSource: "plan_config" | "extra_package";

    if (request.paymentType === "plan") {
      planId = String(request.planId || "");
      const plan = await transaction.get(`plans/${planId}`);
      amountEGP = Number(plan?.priceEGP);
      if (!plan || !Number.isFinite(amountEGP) || amountEGP < 0) {
        throw new PaymentSubmissionError(
          "INVALID_PAYMENT_PLAN",
          "Selected plan is invalid",
        );
      }
      pricingSource = "plan_config";
    } else {
      extraConversationsCount = Math.floor(
        Number(request.extraConversationsCount || 0),
      );
      const authoritativePrice = EXTRA_PACKAGE_PRICES.get(
        extraConversationsCount,
      );
      if (authoritativePrice === undefined) {
        throw new PaymentSubmissionError(
          "INVALID_EXTRA_PACKAGE",
          "Selected extra package is invalid",
        );
      }
      amountEGP = authoritativePrice;
      extraPackageName = `+${extraConversationsCount} conversations`;
      pricingSource = "extra_package";
    }

    const payment = {
      id: paymentId,
      workspaceId,
      workspaceName: String(workspace.name || workspaceId),
      paymentType: request.paymentType,
      ...(planId ? { planId } : {}),
      ...(extraConversationsCount
        ? { extraConversationsCount, extraPackageName }
        : {}),
      amountEGP,
      screenshotUrl,
      transactionRef,
      status: "pending",
      submittedAt,
      pricingSource,
      paymentMethod: "instapay",
    };

    transaction.create(referencePath, {
      id: referenceId,
      transactionRef,
      paymentId,
      workspaceId,
      createdAt: submittedAt,
    });
    transaction.create(`payments/${paymentId}`, payment);

    return { payment };
  });
}
