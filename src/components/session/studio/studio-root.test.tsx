import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { studioApi } from '@/lib/session/studio/api';
import type { StudioOverview } from '@/lib/session/studio/models';
import { clearOverviewCache, loadOverview } from '@/lib/session/studio/overview-cache';

import { StudioRoot } from './studio-root';

// Privacy regression: the overview cache must never hand one account's
// manuscript to another that signs in right after it on the same device.

const session: { user: { id: string } | null } = { user: null };
vi.mock('@/lib/session/auth-context', () => ({ useSession: () => session }));
vi.mock('../session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('../work-manage', () => ({ WorkManageView: () => null }));
vi.mock('./portability', () => ({ StudioExportPanel: () => null }));
vi.mock('./studio-shell', () => ({
  StudioShell: ({ initial, uid }: { initial: StudioOverview & { owner: string }; uid: string }) => (
    <p data-testid="shell">
      {initial.owner} as {uid}
    </p>
  ),
}));

const overviewOf = (owner: string) => ({ owner }) as unknown as StudioOverview;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('overview cache', () => {
  beforeEach(() => {
    clearOverviewCache();
    session.user = null;
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reuses a response only for the same account and work, and forgets it on auth changes', async () => {
    const spy = vi.spyOn(studioApi, 'overview').mockImplementation(async () => overviewOf('x'));
    void loadOverview('a', 'w1', 'es');
    void loadOverview('a', 'w1', 'es');
    expect(spy).toHaveBeenCalledTimes(1);
    void loadOverview('b', 'w1', 'es');
    expect(spy).toHaveBeenCalledTimes(2);
    clearOverviewCache();
    void loadOverview('b', 'w1', 'es');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('an immediate logout and login with another account fetches again and shows only the new account', async () => {
    const spy = vi.spyOn(studioApi, 'overview').mockImplementation(async () => overviewOf(session.user!.id));
    session.user = { id: 'alice' };
    const view = render(<StudioRoot workId="w1" />);
    expect((await screen.findByTestId('shell')).textContent).toBe('alice as alice');

    // Sign-out then sign-in as someone else, well inside the reuse window.
    session.user = null;
    view.rerender(<StudioRoot workId="w1" />);
    expect(screen.queryByTestId('shell')).toBeNull();
    session.user = { id: 'bob' };
    view.rerender(<StudioRoot workId="w1" />);

    expect((await screen.findByTestId('shell')).textContent).toBe('bob as bob');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('a late response for the previous account is never shown to the next one', async () => {
    const alice = deferred<StudioOverview>();
    const bob = deferred<StudioOverview>();
    vi.spyOn(studioApi, 'overview').mockImplementationOnce(() => alice.promise).mockImplementationOnce(() => bob.promise);
    session.user = { id: 'alice' };
    const view = render(<StudioRoot workId="w1" />);
    session.user = { id: 'bob' };
    view.rerender(<StudioRoot workId="w1" />);

    alice.resolve(overviewOf('alice'));
    await Promise.resolve();
    expect(screen.queryByTestId('shell')).toBeNull();
    bob.resolve(overviewOf('bob'));
    expect((await screen.findByTestId('shell')).textContent).toBe('bob as bob');
  });
});
