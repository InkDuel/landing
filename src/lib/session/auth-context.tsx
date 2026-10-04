'use client';

import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from '@firebase/auth';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { Locale } from '@/lib/i18n';

import { ApiError, apiGet } from './api';
import { isFirebaseConfigured } from './config';
import { getFirebaseAuth } from './firebase';
import { type ProfileUser, parseProfileUser } from './models';

// Founder decision A (2026-10-04): in phase 1 the web only lets existing
// InkDuel accounts in. After Firebase signs someone in, the web asks
// GET /api/me; a 404 means there is no InkDuel account, so the web signs out
// again. It never calls /auth/login, which would create the account.

export type SessionStatus =
  | 'unconfigured' // the Firebase web config is not set yet
  | 'loading'
  | 'signedOut'
  | 'noAccount' // signed in to Firebase, but not an InkDuel user
  | 'error' // /api/me failed for another reason
  | 'signedIn';

export type SignInMethod = 'email' | 'google' | 'apple';

/** Firebase error codes mapped to the app's own auth messages. */
export type SignInError = 'invalidCredentials' | 'tooManyRequests' | 'cancelled' | 'popupBlocked' | 'network' | 'generic';

type SessionValue = {
  status: SessionStatus;
  user: ProfileUser | null;
  signIn: (method: SignInMethod, credentials?: { email: string; password: string }) => Promise<SignInError | null>;
  signOut: () => Promise<void>;
  retry: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

function mapSignInError(error: unknown): SignInError {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/user-disabled':
      return 'invalidCredentials';
    case 'auth/too-many-requests':
      return 'tooManyRequests';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return 'cancelled';
    case 'auth/popup-blocked':
      return 'popupBlocked';
    case 'auth/network-request-failed':
      return 'network';
    default:
      return 'generic';
  }
}

export function SessionProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>(isFirebaseConfigured ? 'loading' : 'unconfigured');
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [attempt, setAttempt] = useState(0);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  // Set when /api/me said «no account»: the sign-out that follows must not
  // turn the message back into a plain signed-out state.
  const noAccountRef = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    auth.languageCode = localeRef.current;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      if (!firebaseUser) {
        setUser(null);
        setStatus(noAccountRef.current ? 'noAccount' : 'signedOut');
        return;
      }
      noAccountRef.current = false;
      setStatus('loading');
      try {
        const me = parseProfileUser(await apiGet('/api/me', { locale: localeRef.current }));
        if (!active) return;
        if (!me) throw new ApiError(200, 'parse');
        setUser(me);
        setStatus('signedIn');
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          noAccountRef.current = true;
          await firebaseSignOut(auth);
          return;
        }
        setUser(null);
        setStatus('error');
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  const signIn = useCallback<SessionValue['signIn']>(async (method, credentials) => {
    const auth = getFirebaseAuth();
    if (!auth) return 'generic';
    noAccountRef.current = false;
    auth.languageCode = localeRef.current;
    try {
      if (method === 'email') {
        if (!credentials) return 'invalidCredentials';
        await signInWithEmailAndPassword(auth, credentials.email.trim(), credentials.password);
      } else if (method === 'google') {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } else {
        const apple = new OAuthProvider('apple.com');
        apple.addScope('email');
        await signInWithPopup(auth, apple);
      }
      return null;
    } catch (error) {
      return mapSignInError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    noAccountRef.current = false;
    if (auth) await firebaseSignOut(auth);
  }, []);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const value = useMemo(() => ({ status, user, signIn, signOut, retry }), [status, user, signIn, signOut, retry]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
