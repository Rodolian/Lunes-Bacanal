import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App;

if (getApps().length === 0) {
  // Parse the full service account JSON from environment variable
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
  );

  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApps()[0];
}

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { adminDb, adminAuth };
