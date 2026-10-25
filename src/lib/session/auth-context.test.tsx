import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider } from './auth-context';
import { clearAllRecovery } from './studio/local-recovery';
import { clearOverviewCache } from './studio/overview-cache';

// Studio leaves nothing of an account on the device once the session ends,
// including when the sign-out happened in another tab: this tab may have
// written its emergency copy after that tab's clear, so it clears again as
// soon as it sees the account change.

let emit: (user: { uid: string } | null) => Promise<void> = async () => {};
vi.mock('@firebase/auth', () => ({
  GoogleAuthProvider: class {},
  OAuthProvider: class {},
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: (_auth: unknown, cb: (user: { uid: string } | null) => Promise<void>) => {
    emit = cb;
    return () => {};
  },
}));
vi.mock('./firebase', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('./config', () => ({ isFirebaseConfigured: true }));
vi.mock('@/lib/analytics', () => ({ setAnalyticsUser: vi.fn(), track: vi.fn() }));
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  apiGet: vi.fn(async () => ({ id: 'alice', username: 'alice' })),
}));
vi.mock('./studio/local-recovery', () => ({ clearAllRecovery: vi.fn(async () => {}) }));
vi.mock('./studio/overview-cache', () => ({ clearOverviewCache: vi.fn() }));

describe('session changes and Studio local data', () => {
  beforeEach(() => {
    vi.mocked(clearAllRecovery).mockClear();
    vi.mocked(clearOverviewCache).mockClear();
    render(
      <SessionProvider locale="es">
        <span />
      </SessionProvider>,
    );
  });
  afterEach(cleanup);

  it('a page that opens signed out deletes nothing (an unsynced copy waits for its author)', async () => {
    await act(() => emit(null));
    expect(clearAllRecovery).not.toHaveBeenCalled();
    await act(() => emit({ uid: 'alice' }));
    expect(clearAllRecovery).not.toHaveBeenCalled();
  });

  it('a sign-out seen from this tab (also one made in another tab) clears copies and cache', async () => {
    await act(() => emit({ uid: 'alice' }));
    vi.mocked(clearOverviewCache).mockClear();
    await act(() => emit(null));
    expect(clearAllRecovery).toHaveBeenCalledTimes(1);
    expect(clearOverviewCache).toHaveBeenCalledTimes(1);
  });

  it('switching straight to another account clears too', async () => {
    await act(() => emit({ uid: 'alice' }));
    await act(() => emit({ uid: 'bob' }));
    expect(clearAllRecovery).toHaveBeenCalledTimes(1);
  });
});
