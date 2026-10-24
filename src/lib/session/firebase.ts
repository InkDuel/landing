'use client';

import { getApp, getApps, initializeApp } from '@firebase/app';
import {
  type Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from '@firebase/auth';

import { firebaseWebConfig, isFirebaseConfigured } from './config';

let auth: Auth | null = null;

/**
 * The Firebase Auth instance, created on first use in the browser. The
 * session persists like the app's (founder decision C): Firebase keeps it in
 * IndexedDB; this code never copies the token anywhere.
 */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined' || !isFirebaseConfigured) return null;
  if (auth) return auth;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseWebConfig);
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  // Local QA only (never in a production build): the Firebase Auth emulator,
  // so the signed-in area can be exercised against local emulators.
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (process.env.NODE_ENV === 'development' && emulator) {
    connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  }
  return auth;
}
