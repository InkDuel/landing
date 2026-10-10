'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSession } from '@/lib/session/auth-context';
import type { Locale } from '@/lib/i18n';
import { rankedAsyncEnabled } from '@/lib/session/ranked-flags';
import { RankedSession } from '@/lib/session/ranked-session';

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const Context = createContext<RankedSession | null>(null);
export function RankedRuntime({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { user, status } = useSession();
  const id = status === 'signedIn' ? user?.id : undefined;
  // Locale changes must not recreate the active writing session.
  const runtime = useMemo(() => (id ? new RankedSession(id, locale, undefined, browserStorage()) : null), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (runtime) runtime.configure(locale);
  }, [runtime, locale]);
  useEffect(() => {
    if (!runtime) return;
    let active = true;
    runtime.start();
    void rankedAsyncEnabled().then((enabled) => {
      if (active) runtime.configureAsync(enabled);
    });
    const wake = () => runtime.wake();
    const storageChanged = (event: StorageEvent) => runtime.storageChanged(event.key);
    window.addEventListener('online', wake);
    window.addEventListener('storage', storageChanged);
    document.addEventListener('visibilitychange', wake);
    return () => {
      active = false;
      runtime.stop();
      window.removeEventListener('online', wake);
      window.removeEventListener('storage', storageChanged);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [runtime]);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useRanked() {
  const runtime = useContext(Context);
  if (!runtime) throw new Error('Ranked requires a signed-in session');
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  return { runtime, state };
}
