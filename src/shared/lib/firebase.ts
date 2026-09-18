import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// The app's types have many optional fields (couponCode, cancelReason, rating, ...) that get
// constructed as literal `undefined`. Firestore rejects `undefined` unless told to ignore it,
// so this keeps every existing object shape writable without touching each call site.
export const firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });

export default app;

/**
 * Firestore security rules require `request.auth != null`. Every tab (user
 * or admin) signs in anonymously so products/orders/etc. can sync across
 * devices without building a full identity system. This does not replace
 * the app's own phone-OTP / admin-password checks — it only gives Firestore
 * something to gate on.
 *
 * If the Anonymous provider isn't enabled yet in the Firebase console, this
 * fails with auth/admin-restricted-operation. Rather than hang forever, it
 * retries every few seconds so an already-open tab recovers on its own the
 * moment the provider is turned on, with no page reload needed.
 */
function trySignInAnonymously() {
  signInAnonymously(auth).catch((err) => {
    console.error('[firebase] anonymous sign-in failed — Firestore reads/writes are rejected until this succeeds. Enable the Anonymous provider in Firebase Console > Authentication > Sign-in method.', err);
    setTimeout(trySignInAnonymously, 4000);
  });
}
trySignInAnonymously();

let resolveAuthReady: () => void;
export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});
const stopAuthWatch = onAuthStateChanged(auth, (user) => {
  if (user) {
    resolveAuthReady();
    stopAuthWatch();
  }
});