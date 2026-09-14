import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.ts';
import { getWorkspaceSecret } from './workspaceSecretVault.ts';
import type { FoxFeature } from './entitlementService.ts';
import { canWorkspaceUseFeature, isWorkspaceEntitlementActive } from './entitlementService.ts';
import type { Workspace } from '../types.ts';
import { sendInstagramDirectMessage } from './instagramService.ts';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export type ReminderStatus = 'pending' | 'claimed' | 'sent' | 'failed' | 'cancelled';
export type ReminderChannel = 'telegram' | 'whatsapp' | 'messenger' | 'instagram';

export interface AppointmentReminder {
  id?: string;
  workspaceId: string;
  appointmentId: string;
  customerId?: string;
  channel: ReminderChannel;
  scheduledAt: string; // ISO
  timezone: string;
  status: ReminderStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  dedupKey: string;
  messageContent?: string;
}

const COLLECTION = 'appointmentReminders';

export async function scheduleReminder(
  workspaceId: string,
  reminder: Partial<AppointmentReminder>
): Promise<string> {
  const doc = adminDb.collection(COLLECTION).doc();
  const now = new Date().toISOString();
  const record: AppointmentReminder = {
    workspaceId,
    appointmentId: reminder.appointmentId || '',
    channel: reminder.channel || 'whatsapp',
    scheduledAt: reminder.scheduledAt || now,
    timezone: reminder.timezone || 'Africa/Cairo',
    status: reminder.status || 'pending',
    attemptCount: reminder.attemptCount ?? 0,
    maxAttempts: reminder.maxAttempts ?? 3,
    dedupKey: reminder.dedupKey || `${workspaceId}_${reminder.appointmentId || ''}_${reminder.scheduledAt || now}`,
    createdAt: now,
    updatedAt: now,
    ...stripUndefined({
      customerId: reminder.customerId,
      messageContent: reminder.messageContent,
    } as Record<string, unknown>),
  };
  await doc.set(record);
  return doc.id;
}

export async function claimDueReminders(
  workspaceId: string,
  now: Date = new Date()
): Promise<AppointmentReminder[]> {
  // Atomic claim via query + transaction-like update (simplified for architecture)
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('status', '==', 'pending')
    .get();
  const due: AppointmentReminder[] = [];
  const nowStr = now.toISOString();
  for (const doc of snapshot.docs) {
    const data = doc.data() as AppointmentReminder;
    if (data.scheduledAt <= nowStr) {
      due.push({ ...data, id: doc.id });
    }
  }
  return due;
}

export async function claimReminder(
  workspaceId: string,
  reminderId: string
): Promise<boolean> {
  const snap = await adminDb.collection(COLLECTION).doc(reminderId).get();
  if (!snap.exists) return false;
  const data = snap.data() as AppointmentReminder;
  if (data.workspaceId !== workspaceId || data.status !== 'pending') return false;
  await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'claimed', updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function deliverReminder(
  workspaceId: string,
  reminderId: string
): Promise<{ success: boolean; error?: string }> {
  const snap = await adminDb.collection(COLLECTION).doc(reminderId).get();
  if (!snap.exists) return { success: false, error: 'REMINDER_NOT_FOUND' };
  const data = snap.data() as AppointmentReminder;
  if (data.workspaceId !== workspaceId) return { success: false, error: 'WORKSPACE_MISMATCH' };
  if (data.status !== 'claimed') return { success: false, error: 'NOT_CLAIMED' };

  // Entitlement + credentials check (load real workspace from Firestore)
  const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
  const workspace = wsSnap.exists ? (wsSnap.data() as Workspace) : null;
  const feature: FoxFeature = 'appointment_reminder';
  const entitled = !!workspace && isWorkspaceEntitlementActive(workspace) && canWorkspaceUseFeature(workspace, feature);
  if (!entitled) {
    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'failed', lastError: 'ENTITLEMENT_DENIED', updatedAt: new Date().toISOString(), attemptCount: (data.attemptCount || 0) + 1 }, { merge: true });
    return { success: false, error: 'ENTITLEMENT_DENIED' };
  }

  const tokenKey: string = data.channel === 'whatsapp' ? 'whatsappAccessToken' : data.channel === 'telegram' ? 'telegramBotToken' : data.channel === 'messenger' ? 'facebookPageAccessToken' : 'instagramAccessToken';
  const token = await getWorkspaceSecret(workspaceId, tokenKey as any);
  if (!token) {
    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'failed', lastError: 'CREDENTIALS_MISSING', updatedAt: new Date().toISOString(), attemptCount: (data.attemptCount || 0) + 1 }, { merge: true });
    return { success: false, error: 'CREDENTIALS_MISSING' };
  }

  // Bounded retry
  const nextAttempts = (data.attemptCount || 0) + 1;
  if (nextAttempts > (data.maxAttempts || 3)) {
    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'failed', lastError: 'MAX_ATTEMPTS', updatedAt: new Date().toISOString(), attemptCount: nextAttempts }, { merge: true });
    return { success: false, error: 'MAX_ATTEMPTS' };
  }

  const message = data.messageContent || 'تذكير: لديك موعد قادم معنا.';
  const recipient = String(data.customerId || '').trim();
  if (!recipient) {
    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'failed', lastError: 'RECIPIENT_MISSING', updatedAt: new Date().toISOString(), attemptCount: nextAttempts }, { merge: true });
    return { success: false, error: 'RECIPIENT_MISSING' };
  }

  try {
    if (data.channel === 'telegram') {
      const result = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: recipient, text: message }),
      });
      const payload: any = await result.json();
      if (!result.ok || !payload?.ok) throw new Error('TELEGRAM_SEND_FAILED');
    } else if (data.channel === 'instagram') {
      const result = await sendInstagramDirectMessage(workspaceId, recipient, message);
      if (!result.success) throw new Error(result.error || 'INSTAGRAM_SEND_FAILED');
    } else if (data.channel === 'whatsapp') {
      const phoneNumberId = String((workspace as any).whatsappPhoneNumberId || '').trim();
      if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID_MISSING');
      const result = await fetch(`https://graph.facebook.com/v18.0/${encodeURIComponent(phoneNumberId)}/messages?access_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { preview_url: false, body: message } }),
      });
      const payload: any = await result.json();
      if (!result.ok || payload?.error) throw new Error(payload?.error?.message || 'WHATSAPP_SEND_FAILED');
    } else if (data.channel === 'messenger') {
      const result = await fetch('https://graph.facebook.com/v19.0/me/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: recipient }, message: { text: message }, access_token: token }),
      });
      const payload: any = await result.json();
      if (!result.ok || payload?.error) throw new Error(payload?.error?.message || 'MESSENGER_SEND_FAILED');
    }

    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: 'sent', updatedAt: new Date().toISOString(), sentAt: new Date().toISOString(), attemptCount: nextAttempts }, { merge: true });
    return { success: true };
  } catch (error: any) {
    const safeError = String(error?.message || 'DELIVERY_FAILED').slice(0, 300);
    await adminDb.collection(COLLECTION).doc(reminderId).set({ status: nextAttempts >= (data.maxAttempts || 3) ? 'failed' : 'pending', lastError: safeError, updatedAt: new Date().toISOString(), attemptCount: nextAttempts }, { merge: true });
    return { success: false, error: safeError };
  }
}

export async function cancelAppointmentReminders(workspaceId: string, appointmentId: string): Promise<number> {
  const snapshot = await adminDb.collection(COLLECTION).where('workspaceId', '==', workspaceId).where('appointmentId', '==', appointmentId).where('status', '==', 'pending').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    await adminDb.collection(COLLECTION).doc(doc.id).set({ status: 'cancelled', updatedAt: new Date().toISOString() }, { merge: true });
    count++;
  }
  return count;
}

export async function suppressStaleReminders(workspaceId: string, appointmentId?: string): Promise<number> {
  // Suppress reminders for past scheduled times
  const nowStr = new Date().toISOString();
  const snapshot = await adminDb.collection(COLLECTION).where('workspaceId', '==', workspaceId).where('status', '==', 'pending').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() as AppointmentReminder;
    if (data.scheduledAt < nowStr || (appointmentId && data.appointmentId === appointmentId)) {
      await adminDb.collection(COLLECTION).doc(doc.id).set({ status: 'cancelled', updatedAt: new Date().toISOString(), lastError: 'STALE_OR_RESCHEDULED' }, { merge: true });
      count++;
    }
  }
  return count;
}
