import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export interface OAuthState {
  workspaceId: string;
  userRole: string; // verified from session/auth
  nonce: string;
  expiresAt: number; // timestamp ms
  used: boolean;
}

export function generateOAuthState(
  workspaceId: string,
  userRole: string,
  ttlMs: number = 600_000 // 10 minutes
): { stateToken: string; stateData: OAuthState } {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlMs;
  const stateData: OAuthState = {
    workspaceId,
    userRole,
    nonce,
    expiresAt,
    used: false,
  };
  const payload = JSON.stringify(stateData);
  const hash = scryptSync(payload, nonce, 64).toString("hex");
  const stateToken = Buffer.from(`${Buffer.from(payload).toString("base64url")}:${hash}`).toString("base64url");
  return { stateToken, stateData };
}

export function verifyOAuthState(
  stateToken: string,
  workspaceId: string,
  userRole: string
): { valid: boolean; expired: boolean; reused: boolean; workspaceMismatch: boolean; error?: string } {
  try {
    const decoded = Buffer.from(stateToken, "base64url").toString("utf-8");
    const [payloadB64, hash] = decoded.split(":");
    if (!payloadB64 || !hash) return { valid: false, expired: false, reused: false, workspaceMismatch: false, error: "INVALID_STATE_FORMAT" };
    const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const state: OAuthState = JSON.parse(payload);
    // Recompute hash to verify integrity
    const expectedHash = scryptSync(payload, state.nonce, 64).toString("hex");
    if (!timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      return { valid: false, expired: false, reused: false, workspaceMismatch: false, error: "STATE_TAMPERED" };
    }
    if (state.used) return { valid: false, expired: false, reused: true, workspaceMismatch: false, error: "STATE_REUSED" };
    if (state.workspaceId !== workspaceId) return { valid: false, expired: false, reused: false, workspaceMismatch: true, error: "WORKSPACE_MISMATCH" };
    if (state.userRole !== userRole) return { valid: false, expired: false, reused: false, workspaceMismatch: false, error: "ROLE_MISMATCH" };
    if (Date.now() > state.expiresAt) return { valid: false, expired: true, reused: false, workspaceMismatch: false, error: "STATE_EXPIRED" };
    return { valid: true, expired: false, reused: false, workspaceMismatch: false };
  } catch (e) {
    return { valid: false, expired: false, reused: false, workspaceMismatch: false, error: "STATE_DECODE_ERROR" };
  }
}
