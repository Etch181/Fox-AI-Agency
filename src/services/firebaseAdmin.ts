import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// SAFETY GATE (server-side): Never import firebase-applet-config.json here.
// That file is a legacy/production reference and its projectId + databaseId
// target the PRODUCTION project. Reading it would let the staging runtime
// reach production Firestore. Instead, require explicit staging env vars and
// fail closed if they are missing.
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT;
const databaseId =
  process.env.FIRESTORE_DATABASE_ID || "(default)";

if (!projectId) {
  throw new Error(
    "[Firebase Admin] Refusing production config fallback: GOOGLE_CLOUD_PROJECT is required."
  );
}

const serviceAccountJson =
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim();

let credential;

if (serviceAccountJson) {
  try {
    const serviceAccount =
      JSON.parse(serviceAccountJson);

    credential =
      cert(serviceAccount);

    console.log(
      "🔐 [Firebase Admin] Credential source=SERVICE_ACCOUNT_JSON"
    );
  } catch (error) {
    console.error(
      "❌ [Firebase Admin] FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is invalid JSON"
    );

    throw error;
  }
} else {
  credential =
    applicationDefault();

  console.log(
    "🔐 [Firebase Admin] Credential source=APPLICATION_DEFAULT"
  );
}

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential,
        projectId,
      });

export const adminAuth =
  getAuth(adminApp);

export const adminDb =
  databaseId === "(default)"
    ? getFirestore(adminApp)
    : getFirestore(
        adminApp,
        databaseId
      );

export const firebaseAdminRuntime = {
  projectId,
  databaseId,
  credentialSource:
    serviceAccountJson
      ? "service_account_json"
      : "application_default",
};

console.log(
  `🔐 [Firebase Admin] Initialized | Project=${projectId} | Database=${databaseId}`
);
