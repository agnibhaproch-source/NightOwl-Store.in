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

/**
 * Each part of the product gets its own Firebase app, and therefore its own saved sign-in.
 * Customers, the owner (/admin) and riders (/rider) can be signed in at the same time in one browser,
 * and signing out of one never touches the others. Every page load is exactly one of the three.
 */
export type Role = 'user' | 'admin' | 'rider';
export const role: Role = /^\/admin(\/|$)/.test(location.pathname) ? 'admin' : /^\/rider(\/|$)/.test(location.pathname) ? 'rider' : 'user';
// The customer app keeps the default app name so existing customer sessions survive.
const app = role === 'user' ? initializeApp(firebaseConfig) : initializeApp(firebaseConfig, role);

export const auth = getAuth(app);
// The app's types have many optional fields (couponCode, cancelReason, rating, ...) that get
// constructed as literal `undefined`. Firestore rejects `undefined` unless told to ignore it,
// so this keeps every existing object shape writable without touching each call site.
export const firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Dev-only: lets automated tests use Firebase's registered test phone numbers without a captcha.
if (import.meta.env.DEV && localStorage.getItem('no:skip-recaptcha') === '1') {
  auth.settings.appVerificationDisabledForTesting = true;
}

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
let signingIn = false;
function trySignInAnonymously() {
  if (signingIn) return;
  signingIn = true;
  signInAnonymously(auth)
    .catch((err) => {
      console.error('[firebase] anonymous sign-in failed — Firestore reads/writes are rejected until this succeeds. Enable the Anonymous provider in Firebase Console > Authentication > Sign-in method.', err);
      setTimeout(() => {
        signingIn = false;
        if (!auth.currentUser) trySignInAnonymously();
      }, 4000);
    })
    .finally(() => {
      if (auth.currentUser) signingIn = false;
    });
}

let resolveAuthReady: () => void;
export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});
// Wait for Firebase to restore any saved sign-in (owner, phone, Google) before deciding to go anonymous;
// signing in anonymously up front would silently replace it.
const stopAuthWatch = onAuthStateChanged(auth, (user) => {
  if (user) {
    resolveAuthReady();
    stopAuthWatch();
  } else {
    trySignInAnonymously();
  }
});
