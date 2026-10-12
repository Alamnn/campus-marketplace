import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Environment-driven Firebase configuration (optional cloud sync)
const env = typeof import.meta !== 'undefined' ? (import.meta.env || {}) : {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const hasFirebaseCredentials = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let db = null;

if (hasFirebaseCredentials) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (err) {
    console.warn('[Firebase] Initialization skipped or failed:', err.message);
  }
}

export { app, db };
export default app;
