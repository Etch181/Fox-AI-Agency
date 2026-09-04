import crypto from 'crypto';
import { adminDb } from './firebaseAdmin.ts';
import { getWorkspaceSecret } from './workspaceSecretVault.ts';

export interface OtpRecord {
  workspaceId: string;
  email: string;
  hashedOtp: string; // sha256 hash, not plaintext
  salt: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
}

const OTP_COLLECTION = 'workspaceOtpRecords';
const OTP_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function sanitizeForLog(value: string): string {
  return value.replace(/[0-9]/g, '*').slice(0, 4) + '...REDACTED';
}

function generateSecureOtp(): string {
  // Cryptographically secure 6-digit OTP
  const bytes = crypto.randomBytes(3);
  const num = (bytes.readUIntBE(0, 3) % 900000) + 100000; // 6 digits
  return String(num);
}

function hashOtp(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(otp + salt).digest('hex');
}

export async function issueOtp(
  workspaceId: string,
  email: string
): Promise<{ otpSent: boolean; mode?: string; error?: string }> {
  // Normalize email
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { otpSent: false, error: 'INVALID_EMAIL' };
  }

  // Check recent OTP for same workspace/email (resend cooldown)
  const existingSnap = await adminDb
    .collection(OTP_COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('email', '==', cleanEmail)
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const latest = existingSnap.docs[0].data() as OtpRecord;
    const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;
    if (Date.now() - new Date(latest.createdAt).getTime() < cooldownMs) {
      return { otpSent: false, error: 'RESEND_COOLDOWN' };
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const otp = generateSecureOtp();
  const hashed = hashOtp(otp, salt);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const doc = adminDb.collection(OTP_COLLECTION).doc();
  const record: OtpRecord = {
    workspaceId,
    email: cleanEmail,
    hashedOtp: hashed,
    salt,
    createdAt: new Date().toISOString(),
    expiresAt,
    used: false,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    idempotencyKey: `${workspaceId}_${cleanEmail}_${Date.now()}`,
  };
  await doc.set(record);

  // Send email using existing emailService (fail-closed if SMTP missing)
  try {
    const { emailService } = await import('./emailService.ts');
    const workspaceName = workspaceId;
    const result = await emailService.sendVerificationEmail({
      toEmail: cleanEmail,
      ownerName: 'Customer',
      otpCode: otp,
      workspaceName,
    });
    // Never log the raw OTP
    console.log(`[OTP] OTP sent mode=${result.mode} workspace=${workspaceId} email=${cleanEmail.replace(/.+@/, '***@')}`);
    return { otpSent: true, mode: result.mode };
  } catch (e: any) {
    console.error(`[OTP] Send failed workspace=${workspaceId}`);
    return { otpSent: false, error: 'SMTP_FAILED' };
  }
}

export async function verifyOtp(
  workspaceId: string,
  email: string,
  otpCode: string
): Promise<{ verified: boolean; error?: string }> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return { verified: false, error: 'INVALID_EMAIL' };

  const snap = await adminDb
    .collection(OTP_COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('email', '==', cleanEmail)
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) return { verified: false, error: 'NO_OTP_FOUND' };

  const latest = snap.docs[0].data() as OtpRecord;
  if (new Date(latest.expiresAt) < new Date()) {
    return { verified: false, error: 'OTP_EXPIRED' };
  }

  if (latest.attempts >= latest.maxAttempts) {
    return { verified: false, error: 'ATTEMPT_LIMIT_REACHED' };
  }

  const hashedInput = hashOtp(String(otpCode || '').trim(), latest.salt);
  // Constant-time comparison
  const expected = Buffer.from(latest.hashedOtp, 'hex');
  const supplied = Buffer.from(hashedInput, 'hex');
  if (expected.length !== supplied.length) {
    // Increment attempts for wrong code length
    await snap.docs[0].ref.set({ attempts: latest.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { verified: false, error: 'WRONG_OTP' };
  }
  let match = true;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== supplied[i]) match = false;
  }

  if (!match) {
    await snap.docs[0].ref.set({ attempts: latest.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { verified: false, error: 'WRONG_OTP' };
  }

  // Success: mark used
  await snap.docs[0].ref.set({ used: true, attempts: latest.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
  return { verified: true };
}

export async function hasVerifiedOtp(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const snap = await adminDb
    .collection(OTP_COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('email', '==', cleanEmail)
    .where('used', '==', true)
    .limit(1)
    .get();
  return !snap.empty;
}
