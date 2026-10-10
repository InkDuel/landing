import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import {
  type ActiveDuel,
  type RankedDraft,
  parseActiveDuel,
  parseDuelHistory,
  parseRankedDraft,
  secondsLeft,
  storyLength,
  validStory,
} from './duels';
import { RankedSession, type RankedApi } from './ranked-session';

const startAt = '2026-10-10T12:00:00Z';
const endsAt = '2026-10-10T12:05:00Z';
const writing: ActiveDuel = {
  id: 'duel-1',
  state: 'writing',
  prompt: 'Una llave',
  writingStartedAt: startAt,
  writingEndsAt: endsAt,
  kind: 'ranked_human',
  mode: 'ranked',
  userHasSubmitted: false,
  userA: { id: 'me', username: 'Autor', rankTier: '' },
  userB: { id: 'rival', username: 'Rival', rankTier: '' },
};
const waiting: ActiveDuel = { ...writing, state: 'waiting_for_opponent', writingStartedAt: '', writingEndsAt: '', prompt: '', userB: null };
const draft: RankedDraft = { id: 'draft-1', prompt: 'Una llave', writingStartedAt: startAt, writingEndsAt: endsAt };
const story = 'Una historia que tiene más de cincuenta caracteres sin contar los espacios.';
function api() {
  return {
    pending: vi.fn<RankedApi['pending']>().mockResolvedValue(null),
    activeDraft: vi.fn<RankedApi['activeDraft']>().mockResolvedValue(null),
    create: vi.fn<RankedApi['create']>().mockResolvedValue(waiting),
    status: vi.fn<RankedApi['status']>().mockResolvedValue(waiting),
    heartbeat: vi.fn<RankedApi['heartbeat']>().mockResolvedValue(waiting),
    drain: vi.fn<RankedApi['drain']>().mockResolvedValue(null),
    prepare: vi.fn<RankedApi['prepare']>().mockResolvedValue({ draft, duel: null }),
    submit: vi.fn<RankedApi['submit']>().mockResolvedValue(undefined),
    submitDraft: vi.fn<RankedApi['submitDraft']>().mockResolvedValue(draft.id),
    queued: vi.fn<RankedApi['queued']>().mockResolvedValue([]),
    cancel: vi.fn<RankedApi['cancel']>().mockResolvedValue(true),
    forfeit: vi.fn<RankedApi['forfeit']>().mockResolvedValue(undefined),
    history: vi.fn<RankedApi['history']>(),
    detail: vi.fn<RankedApi['detail']>(),
  } satisfies RankedApi;
}
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
const sessions: RankedSession[] = [];
function runtime(a: RankedApi, user = 'me', storage: Storage = localStorage) {
  const session = new RankedSession(user, 'es', a, storage);
  sessions.push(session);
  session.start();
  return session;
}
// Models Web Locks across separate session instances, including a held editor
// lock and FIFO mutation locks. ifAvailable never steals or queues ownership.
function installLocks() {
  const held = new Map<string, Promise<void>>();
  const request = vi.fn(async (name: string, optionsOrWork: unknown, maybeWork?: unknown) => {
    const options = typeof optionsOrWork === 'function' ? {} : (optionsOrWork as { ifAvailable?: boolean });
    const work = (maybeWork || optionsOrWork) as (lock: { name: string; mode: string } | null) => Promise<unknown>;
    const prior = held.get(name);
    if (options.ifAvailable && prior) return work(null);
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    held.set(name, next);
    if (prior) await prior;
    try {
      return await work({ name, mode: 'exclusive' });
    } finally {
      if (held.get(name) === next) held.delete(name);
      release();
    }
  });
  vi.stubGlobal('navigator', { locks: { request } });
  return request;
}
beforeEach(() => {
  installLocks();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(startAt);
});
afterEach(() => {
  sessions.splice(0).forEach((session) => session.stop());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Ranked session recovery and timing', () => {
  it('forfeits an empty live story at timeout as Flutter does', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    const session = runtime(a);
    await flush();
    vi.setSystemTime(endsAt);
    await session.tick();
    expect(a.forfeit).toHaveBeenCalledWith(writing.id, 'es');
    expect(a.submit).not.toHaveBeenCalled();
    expect(session.getSnapshot().phase).toBe('pending');
  });
  it('recovers server writing deadlines and the same user/duel text after refresh without creating a duel', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    first.stop();
    vi.setSystemTime('2026-10-10T12:02:00Z');
    const second = runtime(a);
    await flush();
    expect(second.getSnapshot().story).toBe(story);
    expect(secondsLeft(second.getSnapshot().duel!.writingEndsAt)).toBe(180);
    expect(a.create).not.toHaveBeenCalled();
  });
  it('submits at timeout even when an earlier status poll has not resolved', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    let done!: (value: ActiveDuel) => void;
    a.status.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const session = runtime(a);
    await flush();
    session.setStory(story);
    const poll = session.tick();
    await flush();
    vi.setSystemTime(endsAt);
    await session.tick();
    expect(a.submit).toHaveBeenCalledTimes(1);
    done(writing);
    await poll;
    expect(session.getSnapshot().phase).toBe('pending');
  });
  it('does not recover another user or another duel text', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    first.stop();
    const second = runtime(a, 'someone');
    await flush();
    expect(second.getSnapshot().story).toBe('');
    second.stop();
    a.pending.mockResolvedValue({ ...writing, id: 'duel-2' });
    const third = runtime(a);
    await flush();
    expect(third.getSnapshot().story).toBe('');
  });
  it('fails closed when recovery is unavailable, including on the start action', async () => {
    const a = api();
    a.pending.mockRejectedValue(new ApiError(0, 'network'));
    const session = runtime(a);
    await flush();
    await session.begin();
    expect(session.getSnapshot().error).toBe('network');
    expect(a.create).not.toHaveBeenCalled();
  });
  it('recovers a server draft even when the feature flag is off', async () => {
    const a = api();
    a.activeDraft.mockResolvedValue(draft);
    const session = runtime(a);
    await flush();
    expect(session.getSnapshot().draft).toEqual(draft);
    expect(session.getSnapshot().phase).toBe('writing');
    expect(a.create).not.toHaveBeenCalled();
  });
  it('restores result waiting when the user already submitted', async () => {
    const a = api();
    a.pending.mockResolvedValue({ ...writing, userHasSubmitted: true });
    const session = runtime(a);
    await flush();
    await session.submit();
    expect(session.getSnapshot().phase).toBe('pending');
    expect(a.submit).not.toHaveBeenCalled();
  });
  it('recovers an evaluating duel through saved id when /pending is empty', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    await first.submit();
    first.stop();
    a.pending.mockResolvedValue(null);
    a.status.mockResolvedValue({ ...writing, state: 'evaluating' });
    const next = runtime(a);
    await flush();
    expect(next.getSnapshot().phase).toBe('pending');
    expect(a.create).not.toHaveBeenCalled();
  });
  it('drains after six seconds, exposes async only after none, and heartbeats every fifteen seconds', async () => {
    const a = api();
    const session = runtime(a);
    await flush();
    session.configureAsync(true);
    await session.begin();
    await vi.advanceTimersByTimeAsync(6000);
    expect(a.drain).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().asyncOffer).toBe(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(a.heartbeat).toHaveBeenCalledTimes(2);
    expect(a.drain).toHaveBeenCalledTimes(1);
  });
  it('enters live writing when drain or prepare finds an opponent', async () => {
    const a = api();
    a.drain.mockResolvedValue(writing);
    const session = runtime(a);
    await flush();
    session.configureAsync(true);
    await session.begin();
    await vi.advanceTimersByTimeAsync(6000);
    expect(session.getSnapshot().phase).toBe('writing');
    expect(session.getSnapshot().asyncOffer).toBe(false);
  });
  it('does not expose the async offer after an ambiguous drain failure', async () => {
    const a = api();
    a.drain.mockRejectedValue(new ApiError(503, 'http'));
    const session = runtime(a);
    await flush();
    session.configureAsync(true);
    await session.begin();
    await vi.advanceTimersByTimeAsync(6000);
    expect(session.getSnapshot().asyncOffer).toBe(false);
    expect(session.getSnapshot().phase).toBe('waiting');
  });
  it('creates a draft with a stable client request id and preserves the server deadline', async () => {
    const a = api();
    const session = runtime(a);
    await flush();
    session.configureAsync(true);
    await session.begin();
    await vi.advanceTimersByTimeAsync(6000);
    await session.prepare();
    expect(a.prepare.mock.calls[0][0]).toMatch(/^[a-f0-9-]{36}$/);
    expect(session.getSnapshot().draft?.writingEndsAt).toBe(endsAt);
    expect(session.getSnapshot().phase).toBe('writing');
  });
  it('resynchronizes when cancellation loses the race to a live opponent', async () => {
    const a = api();
    const session = runtime(a);
    await flush();
    await session.begin();
    a.cancel.mockResolvedValue(false);
    a.pending.mockResolvedValue(writing);
    await session.cancel();
    expect(session.getSnapshot().phase).toBe('writing');
  });
  it('keeps the current writing state when a stale poll resolves after a cancellation race', async () => {
    const a = api();
    const session = runtime(a);
    await flush();
    await session.begin();
    let resolve!: (value: ActiveDuel) => void;
    a.heartbeat.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const poll = session.tick();
    await flush();
    a.cancel.mockResolvedValue(false);
    a.pending.mockResolvedValue(writing);
    await session.cancel();
    resolve(waiting);
    await poll;
    expect(session.getSnapshot().phase).toBe('writing');
  });
  it('automatically submits exactly once at the absolute deadline and does not restart time', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    const session = runtime(a);
    await flush();
    session.setStory(story);
    vi.setSystemTime(endsAt);
    await session.tick();
    await session.tick();
    expect(a.submit).toHaveBeenCalledTimes(1);
    expect(a.submit).toHaveBeenCalledWith(writing.id, story, 'es');
    expect(session.getSnapshot().phase).toBe('pending');
  });
  it('sends short timeout text for server validation, preserving it on rejection', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    a.submit.mockRejectedValue(new ApiError(400, 'http'));
    const session = runtime(a);
    await flush();
    session.setStory('Breve');
    vi.setSystemTime(endsAt);
    await session.tick();
    expect(a.submit).toHaveBeenCalledWith(writing.id, 'Breve', 'es');
    expect(session.getSnapshot().error).toBe('invalid');
    expect(session.getSnapshot().story).toBe('Breve');
  });
});

describe('Submission idempotency and failures', () => {
  it('blocks concurrent double clicks', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    let done!: () => void;
    a.submit.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          done = resolve;
        }),
    );
    const session = runtime(a);
    await flush();
    session.setStory(story);
    const submit = session.submit();
    await flush();
    await session.submit();
    expect(a.submit).toHaveBeenCalledTimes(1);
    done();
    await submit;
    expect(session.getSnapshot().phase).toBe('pending');
  });
  it('freezes the attempted payload across refresh after a lost response, then retries identically', async () => {
    const a = api();
    a.status.mockResolvedValue(writing);
    a.pending.mockResolvedValue(writing);
    a.submit.mockRejectedValueOnce(new ApiError(0, 'timeout'));
    const first = runtime(a);
    await flush();
    first.setStory(story);
    await first.submit();
    first.setStory('Changed');
    first.stop();
    await flush();
    const second = runtime(a);
    await flush();
    expect(second.getSnapshot().editorBlocked).toBe('');
    second.setStory('Changed again');
    expect(second.getSnapshot().editorBlocked).toBe('');
    await second.submit();
    expect(a.submit.mock.calls.map((call) => call[1])).toEqual([story, story]);
    expect(second.getSnapshot().phase).toBe('pending');
  });
  it('bounds automatic retries and retains text when disconnected', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    a.submit.mockRejectedValue(new ApiError(0, 'network'));
    const session = runtime(a);
    await flush();
    session.setStory(story);
    await session.submit();
    await vi.advanceTimersByTimeAsync(22000);
    expect(a.submit).toHaveBeenCalledTimes(4);
    expect(session.getSnapshot().story).toBe(story);
    expect(session.getSnapshot().submissionAttempted).toBe(true);
  });
  it('does not overwrite an accepted submission from a second tab', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    const second = runtime(a);
    await flush();
    first.setStory(story);
    second.setStory(story);
    await first.submit();
    await second.submit();
    expect(a.submit).toHaveBeenCalledTimes(1);
    expect(second.getSnapshot().phase).toBe('pending');
  });
  it('handles async submission acknowledgement loss through /mine without creating another draft', async () => {
    const a = api();
    a.activeDraft.mockResolvedValue(draft);
    a.submitDraft.mockRejectedValue(new ApiError(0, 'timeout'));
    const first = runtime(a);
    await flush();
    first.setStory(story);
    await first.submit();
    first.stop();
    a.activeDraft.mockResolvedValue(null);
    a.queued.mockResolvedValue([{ id: draft.id, status: 'pending', createdAt: startAt, expiresAt: endsAt }]);
    const next = runtime(a);
    await flush();
    expect(next.getSnapshot().phase).toBe('queued');
    expect(a.create).not.toHaveBeenCalled();
  });
  it('keeps text available when the draft expires', async () => {
    const a = api();
    a.activeDraft.mockResolvedValue(draft);
    a.submitDraft.mockRejectedValue(new ApiError(410, 'http'));
    const session = runtime(a);
    await flush();
    session.setStory(story);
    await session.submit();
    expect(session.getSnapshot().phase).toBe('expired');
    expect(session.getSnapshot().story).toBe(story);
  });
});

describe('Verified wire contracts', () => {
  it('distinguishes UTF-8 byte limits and async rune limits', () => {
    expect(storyLength('á'.repeat(2600), false)).toBe(5200);
    expect(storyLength('á'.repeat(2600), true)).toBe(2600);
    expect(validStory('á'.repeat(2600), false)).toBe(false);
    expect(validStory('á'.repeat(2600), true)).toBe(true);
    expect(validStory(' '.repeat(100), true)).toBe(false);
  });
  it('does not invent a writing duration for missing server timestamps', () => {
    expect(() => parseRankedDraft({ draftId: 'x', prompt: { text: 'Idea' } })).toThrow(ApiError);
    expect(parseActiveDuel({ id: 'x', state: 'writing', promptText: 'Idea', finishAt: endsAt }).writingEndsAt).toBe(endsAt);
  });
  it('uses the history cursor and preserves redacted prompts and absent scores', () => {
    const page = parseDuelHistory({
      duels: [{ id: 'd', prompt: '', outcome: 'in_progress', userA: { id: 'me', username: 'Autor' } }],
      cursor: 'next',
    });
    expect(page.nextCursor).toBe('next');
    expect(page.items[0].prompt).toBe('');
    expect(page.items[0].scoreMine).toBeNull();
  });
});

describe('Cross-tab checkpoint regression', () => {
  it.each(['duel', 'draft'] as const)('allows only one %s editor and never replaces fresh text with a stale recovery', async (type) => {
    const a = api();
    a.status.mockResolvedValue(writing);
    if (type === 'duel') a.pending.mockResolvedValue(writing);
    else a.activeDraft.mockResolvedValue(draft);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    const second = runtime(a);
    await flush();
    const recent = story + ' Versión reciente.';
    first.setStory(recent);
    // The second tab still displays an older snapshot before event delivery.
    expect(second.getSnapshot().story).toBe(story);
    expect(second.getSnapshot().editorBlocked).toBe('otherTab');
    second.setStory(story + ' Edición obsoleta.');
    second.storageChanged('inkduel-ranked:me');
    await flush();
    await second.recover();
    expect(JSON.parse(localStorage.getItem('inkduel-ranked:me')!).story).toBe(recent);
    expect(second.getSnapshot().story).toBe(recent);
  });
  it('does not write checkpoints or query the server for repeated text storage events', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    const second = runtime(a);
    await flush();
    first.setStory(story + ' Versión reciente.');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    a.pending.mockClear();
    for (let i = 0; i < 4; i++) {
      first.storageChanged('inkduel-ranked:me');
      second.storageChanged('inkduel-ranked:me');
      await flush();
    }
    expect(write).not.toHaveBeenCalled();
    expect(a.pending).not.toHaveBeenCalled();
  });
  it('keeps a refresh read-only until the writer closes, then adopts its last saved text and deadline', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    const observer = runtime(a);
    await flush();
    observer.stop();
    const refreshed = runtime(a);
    await flush();
    expect(refreshed.getSnapshot().editorBlocked).toBe('otherTab');
    first.setStory(story + ' Última frase.');
    // Focus/visibility wakes must not steal a live editor's lock.
    refreshed.wake();
    await flush();
    expect(refreshed.getSnapshot().editorBlocked).toBe('otherTab');
    first.stop();
    await flush();
    vi.setSystemTime('2026-10-10T12:02:00Z');
    refreshed.wake();
    await flush();
    expect(refreshed.getSnapshot().editorBlocked).toBe('');
    expect(refreshed.getSnapshot().story).toBe(story + ' Última frase.');
    expect(secondsLeft(refreshed.getSnapshot().duel!.writingEndsAt)).toBe(180);
    refreshed.setStory(story + ' Continuación.');
    expect(JSON.parse(localStorage.getItem('inkduel-ranked:me')!).story).toBe(story + ' Continuación.');
    first.setStory('Una escritura desde el editor cerrado');
    expect(JSON.parse(localStorage.getItem('inkduel-ranked:me')!).story).toBe(story + ' Continuación.');
  });
  it.each(['duel', 'draft'] as const)('submits the %s writer payload once while another tab tries editing and submitting', async (type) => {
    const a = api();
    a.status.mockResolvedValue(writing);
    if (type === 'duel') a.pending.mockResolvedValue(writing);
    else a.activeDraft.mockResolvedValue(draft);
    let done!: () => void;
    const send = type === 'duel' ? a.submit : a.submitDraft;
    if (type === 'duel')
      a.submit.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            done = resolve;
          }),
      );
    else
      a.submitDraft.mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            done = () => resolve(draft.id);
          }),
      );
    const first = runtime(a);
    await flush();
    first.setStory(story);
    const second = runtime(a);
    await flush();
    first.setStory(story + ' Relato definitivo.');
    const pending = first.submit();
    await flush();
    second.storageChanged('inkduel-ranked:me');
    second.setStory(story + ' Otro relato.');
    await second.submit();
    await second.tick(Date.parse(endsAt));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toBe(story + ' Relato definitivo.');
    done();
    await pending;
    if (type === 'draft') {
      a.activeDraft.mockResolvedValue(null);
      a.queued.mockResolvedValue([{ id: draft.id, status: 'pending', createdAt: startAt, expiresAt: endsAt }]);
    }
    second.storageChanged('inkduel-ranked:me');
    await flush();
    expect(second.getSnapshot().phase).toBe(type === 'duel' ? 'pending' : 'queued');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('preserves the frozen payload after the writer closes during a lost acknowledgement', async () => {
    const a = api();
    a.status.mockResolvedValue(writing);
    a.pending.mockResolvedValue(writing);
    a.submit.mockRejectedValueOnce(new ApiError(0, 'timeout'));
    const first = runtime(a);
    await flush();
    first.setStory(story);
    const second = runtime(a);
    await flush();
    await first.submit();
    first.stop();
    await flush();
    second.wake();
    await flush();
    second.setStory(story + ' Cambio después de enviar.');
    expect(second.getSnapshot().story).toBe(story);
    expect(second.getSnapshot().submissionAttempted).toBe(true);
    expect(second.getSnapshot().editorBlocked).toBe('');
    await second.submit();
    expect(a.submit.mock.calls.map((call) => call[1])).toEqual([story, story]);
  });
  it('recovers an acknowledged async submission after refresh without writing its checkpoint again', async () => {
    const a = api();
    a.activeDraft.mockResolvedValue(draft);
    const first = runtime(a);
    await flush();
    first.setStory(story);
    await first.submit();
    first.stop();
    await flush();
    a.activeDraft.mockResolvedValue(null);
    a.queued.mockResolvedValue([{ id: draft.id, status: 'pending', createdAt: startAt, expiresAt: endsAt }]);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const refreshed = runtime(a);
    await flush();
    expect(refreshed.getSnapshot().phase).toBe('queued');
    expect(writes).not.toHaveBeenCalled();
    expect(a.submitDraft).toHaveBeenCalledTimes(1);
  });
  it('reads the latest text when a slow recovery response arrives after editing', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const writer = runtime(a);
    await flush();
    writer.setStory(story);
    const observer = runtime(a);
    await flush();
    let done!: (duel: ActiveDuel) => void;
    a.pending.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const recovering = observer.recover();
    await flush();
    writer.setStory(story + ' Nuevo final.');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    done(writing);
    await recovering;
    expect(observer.getSnapshot().story).toBe(story + ' Nuevo final.');
    expect(writes).not.toHaveBeenCalled();
  });
  it('rejects a stale write or submit if storage changed before its event was delivered', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    const writer = runtime(a);
    await flush();
    writer.setStory(story);
    const saved = JSON.parse(localStorage.getItem('inkduel-ranked:me')!);
    // A prior app version or another storage writer may not use our lock.
    localStorage.setItem('inkduel-ranked:me', JSON.stringify({ ...saved, story: story + ' Texto más reciente.' }));
    writer.setStory(story + ' Texto obsoleto.');
    expect(writer.getSnapshot().story).toBe(story + ' Texto más reciente.');
    expect(JSON.parse(localStorage.getItem('inkduel-ranked:me')!).story).toBe(story + ' Texto más reciente.');
    localStorage.setItem('inkduel-ranked:me', JSON.stringify({ ...saved, story: story + ' Otro cambio reciente.' }));
    await writer.submit();
    expect(a.submit).not.toHaveBeenCalled();
    expect(writer.getSnapshot().story).toBe(story + ' Otro cambio reciente.');
    await writer.submit();
    expect(a.submit).toHaveBeenCalledWith(writing.id, story + ' Otro cambio reciente.', 'es');
  });
  it('adopts a legacy checkpoint without changing its text on recovery', async () => {
    localStorage.setItem('inkduel-ranked:me', JSON.stringify({ id: writing.id, type: 'duel', story }));
    const a = api();
    a.pending.mockResolvedValue(writing);
    const writer = runtime(a);
    await flush();
    vi.setSystemTime('2026-10-10T12:02:00Z');
    writer.setStory(story + ' Actualizado.');
    expect(JSON.parse(localStorage.getItem('inkduel-ranked:me')!).story).toBe(story + ' Actualizado.');
  });
  it('keeps unsaved in-memory text through polling if browser storage fails', async () => {
    const a = api();
    a.pending.mockResolvedValue(writing);
    a.status.mockResolvedValue(writing);
    const session = runtime(a);
    await flush();
    session.setStory(story);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    session.setStory(story + ' Continuación sin guardar.');
    await session.tick();
    expect(session.getSnapshot().story).toBe(story + ' Continuación sin guardar.');
    expect(session.getSnapshot().storageFailed).toBe(true);
    await session.submit();
    expect(a.submit).toHaveBeenCalledWith(writing.id, story + ' Continuación sin guardar.', 'es');
  });
  it('keeps shared editing read-only without Web Locks instead of using a racy storage lease', async () => {
    vi.stubGlobal('navigator', {});
    const a = api();
    a.pending.mockResolvedValue(writing);
    const first = runtime(a);
    const second = runtime(a);
    await flush();
    first.setStory(story);
    second.setStory(story + ' Otra versión.');
    await Promise.all([first.submit(true), second.submit(true)]);
    await Promise.all([first.tick(Date.parse(endsAt)), second.tick(Date.parse(endsAt))]);
    expect(first.getSnapshot().editorBlocked).toBe('unsupported');
    expect(second.getSnapshot().editorBlocked).toBe('unsupported');
    expect(localStorage.getItem('inkduel-ranked:me')).toBeNull();
    expect(a.submit).not.toHaveBeenCalled();
    expect(a.forfeit).not.toHaveBeenCalled();
    a.pending.mockResolvedValue(null);
    await first.recover();
    await first.begin();
    expect(a.create).not.toHaveBeenCalled();
  });
});
