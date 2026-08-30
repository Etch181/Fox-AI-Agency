export type RegistrationProvisioningOutcome =
  | "pending"
  | "committed"
  | "failed";

let nextOperationId = 0;

export class RegistrationProvisioningOperation {
  readonly id = `registration-${++nextOperationId}`;
  readonly expectedEmail: string;
  readonly uidReady: Promise<string | null>;
  readonly profileReady: Promise<void>;

  uid: string | null = null;
  outcome: RegistrationProvisioningOutcome = "pending";

  private resolveUidReady!: (uid: string | null) => void;
  private resolveProfileReady!: () => void;
  private uidResolved = false;
  private profileResolved = false;

  constructor(expectedEmail: string) {
    this.expectedEmail = expectedEmail.trim().toLowerCase();
    this.uidReady = new Promise((resolve) => {
      this.resolveUidReady = resolve;
    });
    this.profileReady = new Promise((resolve) => {
      this.resolveProfileReady = resolve;
    });
  }

  bindUid(uid: string): void {
    if (this.uidResolved) return;
    this.uid = uid;
    this.uidResolved = true;
    this.resolveUidReady(uid);
  }

  settle(outcome: Exclude<RegistrationProvisioningOutcome, "pending">): void {
    if (this.outcome !== "pending") return;
    this.outcome = outcome;

    if (!this.uidResolved) {
      this.uidResolved = true;
      this.resolveUidReady(null);
    }
    if (!this.profileResolved) {
      this.profileResolved = true;
      this.resolveProfileReady();
    }
  }
}

export class RegistrationCoordinator {
  private active: RegistrationProvisioningOperation | null = null;

  begin(expectedEmail: string): RegistrationProvisioningOperation | null {
    if (this.active) return null;
    this.active = new RegistrationProvisioningOperation(expectedEmail);
    return this.active;
  }

  isCurrent(operation: RegistrationProvisioningOperation): boolean {
    return this.active === operation;
  }

  bindUid(
    operation: RegistrationProvisioningOperation,
    uid: string,
  ): boolean {
    if (!this.isCurrent(operation)) return false;
    operation.bindUid(uid);
    return true;
  }

  settle(
    operation: RegistrationProvisioningOperation,
    outcome: Exclude<RegistrationProvisioningOutcome, "pending">,
  ): boolean {
    if (!this.isCurrent(operation)) return false;
    operation.settle(outcome);
    return true;
  }

  finish(operation: RegistrationProvisioningOperation): void {
    if (this.isCurrent(operation)) {
      this.active = null;
    }
  }

  async waitForAuthOperation(
    uid: string,
    email: string | null | undefined,
  ): Promise<RegistrationProvisioningOperation | null> {
    const operation = this.active;
    if (
      !operation ||
      operation.expectedEmail !== String(email || "").trim().toLowerCase()
    ) {
      return null;
    }

    const provisionedUid = await operation.uidReady;
    return this.isCurrent(operation) && provisionedUid === uid
      ? operation
      : null;
  }

  canApplyUi(
    operation: RegistrationProvisioningOperation,
    mounted: boolean,
    currentUid: string | null | undefined,
  ): boolean {
    return Boolean(
      mounted &&
      this.isCurrent(operation) &&
      operation.uid &&
      operation.uid === currentUid,
    );
  }
}

export type AuthRollbackResult =
  | "deleted"
  | "signed_out"
  | "stale_identity"
  | "cleanup_failed";

interface AuthUserIdentity {
  uid: string;
}

export async function rollbackCreatedAuthIdentity<
  TUser extends AuthUserIdentity,
>(options: {
  createdUser: TUser;
  createdUid: string;
  getCurrentUid: () => string | null | undefined;
  deleteCreatedUser: (user: TUser) => Promise<void>;
  signOutCurrentIdentity: () => Promise<void>;
}): Promise<AuthRollbackResult> {
  const {
    createdUser,
    createdUid,
    getCurrentUid,
    deleteCreatedUser,
    signOutCurrentIdentity,
  } = options;

  if (
    !createdUid ||
    createdUser.uid !== createdUid ||
    getCurrentUid() !== createdUid
  ) {
    return "stale_identity";
  }

  try {
    await deleteCreatedUser(createdUser);
    return "deleted";
  } catch {
    // Firebase signOut targets auth.currentUser rather than a captured user.
    // Re-check immediately before invoking it so a newer login is untouched.
    if (getCurrentUid() !== createdUid) {
      return "stale_identity";
    }

    try {
      await signOutCurrentIdentity();
      return "signed_out";
    } catch {
      return "cleanup_failed";
    }
  }
}

export function shouldRollbackRegistration(
  outcome: RegistrationProvisioningOutcome,
  commitState: {
    commitAttempted?: boolean;
    failureCode?: string;
  } = {},
): boolean {
  if (outcome === "committed") return false;
  if (!commitState.commitAttempted) return true;

  const failureCode = String(commitState.failureCode || "")
    .toLowerCase()
    .replace(/^firestore\//, "");
  return [
    "permission-denied",
    "unauthenticated",
    "invalid-argument",
    "failed-precondition",
    "registration_trial_already_claimed",
    "registration_profile_conflict",
    "registration_workspace_conflict",
    "registration_input_invalid",
    "registration_phone_invalid",
  ].includes(failureCode);
}
