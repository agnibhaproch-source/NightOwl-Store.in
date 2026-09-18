import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

import { auth } from './firebase';

/**
 * Authenticate the user with Google.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);

    console.log('======================================');
    console.log('✅ NIGHTOWL GOOGLE LOGIN SUCCESS');
    console.log('======================================');
    console.log('UID:', result.user.uid);
    console.log('Name:', result.user.displayName);
    console.log('Email:', result.user.email);
    console.log('Photo:', result.user.photoURL);
    console.log('======================================');

    return result.user;
  } catch (error) {
    console.error('======================================');
    console.error('❌ NIGHTOWL GOOGLE LOGIN FAILED');
    console.error('======================================');
    console.error(error);
    console.error('======================================');

    throw error;
  }
}

/**
 * Sign out the Firebase user.
 */
export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}