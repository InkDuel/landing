import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signOut as firebaseSignOut } from '@firebase/auth';

import { ApiError, apiGet } from './api';
import { SessionProvider, useSession } from './auth-context';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Probe() {
  const { status, user } = useSession();
  return <output data-testid="session">{`${status}:${user?.id ?? '-'}`}</output>;
}

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

// /api/me answers in any order: only the answer for the latest auth change
// may set the session. An older one (a previous account, or one that signed
// out meanwhile) is dropped, and never signs anyone out.
describe('stale /api/me answers', () => {
  const me = (id: string) => ({ id, username: id });
  let view: ReturnType<typeof render>;
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
    vi.mocked(firebaseSignOut).mockClear();
    view = render(
      <SessionProvider locale="es">
        <Probe />
      </SessionProvider>,
    );
  });
  afterEach(cleanup);
  const shown = () => view.getByTestId('session').textContent;

  it("account A's answer arriving after account B's keeps B", async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    vi.mocked(apiGet).mockReturnValueOnce(a.promise as never).mockReturnValueOnce(b.promise as never);
    await act(async () => void emit({ uid: 'alice' }));
    await act(async () => void emit({ uid: 'bob' }));
    await act(async () => b.resolve(me('bob')));
    expect(shown()).toBe('signedIn:bob');
    await act(async () => a.resolve(me('alice')));
    expect(shown()).toBe('signedIn:bob');
  });

  it("an answer arriving after sign-out does not sign the old account back in", async () => {
    const a = deferred<unknown>();
    vi.mocked(apiGet).mockReturnValueOnce(a.promise as never);
    await act(async () => void emit({ uid: 'alice' }));
    await act(() => emit(null));
    await act(async () => a.resolve(me('alice')));
    expect(shown()).toBe('signedOut:-');
  });

  it("a stale 404 or error never signs out or breaks the newer session", async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    vi.mocked(apiGet).mockReturnValueOnce(a.promise as never).mockReturnValueOnce(b.promise as never);
    await act(async () => void emit({ uid: 'alice' }));
    await act(async () => void emit({ uid: 'bob' }));
    await act(async () => b.resolve(me('bob')));
    await act(async () => a.reject(new ApiError(404, 'http')));
    expect(firebaseSignOut).not.toHaveBeenCalled();
    expect(shown()).toBe('signedIn:bob');
  });

  it('normal flows are unchanged: login, logout, no-account and error', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce(me('alice') as never);
    await act(() => emit({ uid: 'alice' }));
    expect(shown()).toBe('signedIn:alice');
    await act(() => emit(null));
    expect(shown()).toBe('signedOut:-');

    vi.mocked(apiGet).mockRejectedValueOnce(new ApiError(404, 'http'));
    await act(() => emit({ uid: 'carol' }));
    expect(firebaseSignOut).toHaveBeenCalledTimes(1);
    await act(() => emit(null));
    expect(shown()).toBe('noAccount:-');

    vi.mocked(apiGet).mockRejectedValueOnce(new ApiError(503, 'http'));
    await act(() => emit({ uid: 'dave' }));
    expect(shown()).toBe('error:-');
  });
});

// The public pages read a local hint to say «Ir a InkDuel» instead of «Inicia
// sesión» (src/lib/web-session-hint.ts): only a confirmed InkDuel account sets
// it, and any sign-out (including «no account») removes it.
describe('signed-in hint for the public pages', () => {
  const hint = () => window.localStorage.getItem('inkduel.web.signedIn');
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(apiGet).mockReset();
    render(
      <SessionProvider locale="es">
        <span />
      </SessionProvider>,
    );
  });
  afterEach(cleanup);

  it('is set once /api/me confirms the account and removed on sign-out', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ id: 'alice', username: 'alice' } as never);
    await act(() => emit({ uid: 'alice' }));
    expect(hint()).toBe('1');
    await act(() => emit(null));
    expect(hint()).toBeNull();
  });

  it('is never set for a Firebase user without an InkDuel account, or when /api/me fails', async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(new ApiError(404, 'http'));
    await act(() => emit({ uid: 'carol' }));
    await act(() => emit(null));
    expect(hint()).toBeNull();

    vi.mocked(apiGet).mockRejectedValueOnce(new ApiError(503, 'http'));
    await act(() => emit({ uid: 'dave' }));
    expect(hint()).toBeNull();
  });
});
