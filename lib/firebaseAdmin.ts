import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function parseServiceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();

  // Strip surrounding single or double quotes if pasted into Vercel env vars
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1);
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.private_key && typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  return undefined;
}

let app: App;

if (getApps().length === 0) {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount && serviceAccount.project_id) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lunes-bacanal",
    });
  }
} else {
  app = getApps()[0];
}

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { adminDb, adminAuth };
