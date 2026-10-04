'use client';

import { getApp, getApps, initializeApp } from '@firebase/app';
import {
  type Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
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
  return auth;
}
