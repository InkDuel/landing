'use client';

import { useSyncExternalStore } from 'react';

// A hint, not a session: the signed-in area writes it when /api/me confirms
// the account and removes it on sign-out, so the public pages can say «Ir a
// InkDuel» instead of «Inicia sesión» without loading Firebase or calling the
// backend (they stay static, with the static CSP). It can be stale — a session
// that expired elsewhere — and that only costs one redirect to /login.

const KEY = 'inkduel.web.signedIn';
const CHANGE_EVENT = 'inkduel:web-session-hint';

export function setWebSessionHint(signedIn: boolean): void {
  try {
    if (signedIn) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** False on the server and on the first client render (no hydration mismatch). */
export function useWebSessionHint(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
