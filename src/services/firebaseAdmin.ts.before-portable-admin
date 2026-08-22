import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  firebaseConfig.projectId;

const databaseId =
  (firebaseConfig as any).firestoreDatabaseId ||
  "(default)";

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: applicationDefault(),
        projectId,
      });

export const adminAuth = getAuth(adminApp);

export const adminDb =
  databaseId === "(default)"
    ? getFirestore(adminApp)
    : getFirestore(adminApp, databaseId);

console.log(
  `🔐 [Firebase Admin] Initialized | Project=${projectId} | Database=${databaseId}`
);
