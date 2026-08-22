import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Add Gmail scopes requested for email sending and reading
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleGmail = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token for Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Gmail Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = () => cachedAccessToken;

export const logoutGmail = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const sendGmailMessage = async (
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string
) => {
  // Confirmation required before sending email on user's behalf
  const confirmed = window.confirm(
    `هل أنت تأكد من إرسال هذا البريد الإلكتروني عبر حساب Gmail الخاص بك إلى: ${to}؟`
  );
  if (!confirmed) {
    throw new Error('تم إلغاء الإرسال بواسطة المستخدم.');
  }

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyText,
  ];
  const message = messageParts.join('\r\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error?.message || 'Failed to send email via Gmail API');
  }

  return await res.json();
};

export const listGmailMessages = async (accessToken: string, maxResults = 10) => {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error?.message || 'Failed to list emails from Gmail API');
  }

  return await res.json();
};
