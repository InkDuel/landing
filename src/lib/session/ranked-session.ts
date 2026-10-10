'use client';

import type { Locale } from '@/lib/i18n';
import { ApiError, isTransient } from './api';
import { type ActiveDuel, type RankedDraft, type QueuedRanked, duelErrorCode, duelsApi, secondsLeft, validStory } from './duels';

export type RankedPhase =
  | 'loading'
  | 'idle'
  | 'waiting'
  | 'writing'
  | 'pending'
  | 'queued'
  | 'finished'
  | 'cancelled'
  | 'expired'
  | 'unavailable'
  | 'otherMode';
export type RankedState = {
  phase: RankedPhase;
  duel: ActiveDuel | null;
  draft: RankedDraft | null;
  story: string;
  busy: boolean;
  error: string;
  asyncOffer: boolean;
  lowActivity: boolean;
  queued: QueuedRanked[];
  storageFailed: boolean;
  submissionAttempted: boolean;
};
type Checkpoint = {
  id: string;
  type: 'duel' | 'draft';
  story: string;
  submitted: boolean;
  attempted: boolean;
  requestId: string;
  searchAt: number;
};
const initial: RankedState = {
  phase: 'loading',
  duel: null,
  draft: null,
  story: '',
  busy: false,
  error: '',
  asyncOffer: false,
  lowActivity: false,
  queued: [],
  storageFailed: false,
  submissionAttempted: false,
};
export type RankedApi = typeof duelsApi;
export function rankedFailure(error: unknown): string {
  const code = duelErrorCode(error);
  if (code) return code;
  if (!(error instanceof ApiError)) return 'generic';
  if (isTransient(error)) return 'network';
  if (error.status === 410) return 'expired';
  if (error.status === 402) return 'insufficient_energy';
  if (error.status === 403) return 'forbidden';
  if (error.status === 400) return 'invalid';
  if (error.status === 404) return 'not_found';
  if (error.status === 401) return 'session';
  return 'generic';
}

/** One runtime per signed-in user, kept alive by SessionRoot across navigation.
 * localStorage holds only the user's text/checkpoint; server responses decide
 * every transition and the absolute deadline. Mutations share a Web Lock across
 * tabs where supported; backend claims/idempotency still arbitrate all devices.
 */
export class RankedSession {
  private state: RankedState = initial;
  private listeners = new Set<() => void>();
  private checkpoint: Checkpoint | null = null;
  private running = false;
  private polling = false;
  private operation = false;
  private nextPoll = 0;
  private nextHeartbeat = 0;
  private drainAttempted = false;
  private timeoutAttempted = '';
  private retryAt = 0;
  private retries = 0;
  private retryAutomatic = false;
  private epoch = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private key: string;
  locale: Locale;
  asyncEnabled = false;
  configure(locale: Locale) {
    this.locale = locale;
  }
  configureAsync(enabled: boolean) {
    this.asyncEnabled = enabled;
    if (enabled && this.state.phase === 'waiting' && this.state.lowActivity) {
      this.drainAttempted = false;
      this.nextPoll = 0;
    }
  }
  constructor(
    readonly userId: string,
    locale: Locale,
    private api: RankedApi = duelsApi,
    private storage?: Storage,
  ) {
    this.locale = locale;
    this.key = `inkduel-ranked:${userId}`;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private patch(update: Partial<RankedState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((listener) => listener());
  }
  private read(): Checkpoint | null {
    try {
      const d = JSON.parse(this.storage?.getItem(this.key) || 'null');
      return d && typeof d.id === 'string' && ['duel', 'draft'].includes(d.type) && typeof d.story === 'string'
        ? {
            id: d.id,
            type: d.type,
            story: d.story,
            submitted: d.submitted === true,
            attempted: d.attempted === true,
            requestId: typeof d.requestId === 'string' ? d.requestId : '',
            searchAt: typeof d.searchAt === 'number' ? d.searchAt : Date.now(),
          }
        : null;
    } catch {
      return null;
    }
  }
  private persist() {
    if (!this.storage) {
      this.patch({ storageFailed: true });
      return;
    }
    try {
      if (this.checkpoint) this.storage?.setItem(this.key, JSON.stringify(this.checkpoint));
      else this.storage?.removeItem(this.key);
    } catch {
      this.patch({ storageFailed: true });
    }
  }
  private remember(id: string, type: Checkpoint['type']) {
    const saved = this.read();
    if (this.checkpoint?.id !== id || this.checkpoint?.type !== type) {
      this.checkpoint =
        saved?.id === id && saved.type === type
          ? saved
          : { id, type, story: '', submitted: false, attempted: false, requestId: '', searchAt: Date.now() };
    }
    this.persist();
    this.patch({ story: this.checkpoint.story, submissionAttempted: this.checkpoint.attempted });
  }
  private acceptDuel(duel: ActiveDuel) {
    this.remember(duel.id, 'duel');
    const previous = this.state.duel?.id === duel.id ? this.state.duel : null;
    duel = { ...previous, ...duel, kind: duel.kind || previous?.kind || '', mode: duel.mode || previous?.mode || '' };
    const other = (duel.mode && duel.mode !== 'ranked') || (duel.kind && !['ranked_human', 'ranked_async'].includes(duel.kind));
    const submitted = duel.userHasSubmitted || this.checkpoint?.submitted;
    const phase: RankedPhase = other
      ? 'otherMode'
      : duel.state === 'writing'
        ? submitted
          ? 'pending'
          : 'writing'
        : duel.state === 'waiting_for_opponent'
          ? 'waiting'
          : duel.state === 'evaluating'
            ? 'pending'
            : duel.state === 'finished'
              ? 'finished'
              : 'cancelled';
    this.patch({ duel, draft: null, phase, ...(phase !== 'waiting' ? { asyncOffer: false, lowActivity: false } : {}) });
  }
  private acceptDraft(draft: RankedDraft) {
    this.remember(draft.id, 'draft');
    this.patch({ draft, duel: null, phase: 'writing', asyncOffer: false, lowActivity: false });
  }
  start() {
    this.running = true;
    this.checkpoint = this.read();
    void this.recover();
    this.interval = setInterval(() => {
      void this.tick();
    }, 1000);
  }
  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
  }
  setStory(story: string) {
    if (this.state.phase !== 'writing' || this.state.busy || this.checkpoint?.attempted) return;
    if (this.checkpoint) {
      this.checkpoint.story = story;
      this.persist();
    }
    this.patch({ story });
  }
  private async lock<T>(work: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(this.key, work);
    return work();
  }
  private async work(work: () => Promise<void>) {
    if (this.operation) return;
    this.operation = true;
    this.epoch++;
    this.patch({ busy: true, error: '' });
    try {
      await this.lock(async () => {
        if (this.running) await work();
      });
    } catch (e) {
      if (this.running) this.patch({ error: rankedFailure(e) });
    } finally {
      this.operation = false;
      if (this.running) this.patch({ busy: false });
    }
  }
  /** Errors never become an authoritative "no active game". */
  private async sync(): Promise<boolean> {
    const pending = await this.api.pending(this.locale);
    if (!this.running) return true;
    if (pending) {
      this.acceptDuel(pending);
      return true;
    }
    const draft = await this.api.activeDraft(this.locale);
    if (!this.running) return true;
    if (draft) {
      this.acceptDraft(draft);
      return true;
    }
    const saved = this.read();
    if (saved?.type === 'duel') {
      try {
        const status = await this.api.status(saved.id, this.locale);
        if (!this.running) return true;
        if (status.state !== 'cancelled') {
          this.acceptDuel(status);
          return true;
        }
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e;
      }
    }
    if (saved?.type === 'draft') {
      const queued = await this.api.queued(this.locale);
      if (!this.running) return true;
      if (queued.some((q) => q.id === saved.id)) {
        this.checkpoint = null;
        this.persist();
        this.patch({ phase: 'queued', draft: null, story: '', submissionAttempted: false, queued });
        return true;
      }
      this.checkpoint = saved;
      // /mine omits resolved/expired entries and carries no duelId. Without
      // a positive acknowledgement, do not invent which terminal state won.
      this.patch({ phase: 'unavailable', story: saved.story, draft: null, submissionAttempted: false });
      return true;
    }
    return false;
  }
  recover = async () => {
    await this.work(async () => {
      if (!(await this.sync()) && this.running) this.patch({ phase: 'idle', duel: null, draft: null, submissionAttempted: false });
    });
  };
  begin = async () => {
    await this.work(async () => {
      if ((await this.sync()) || !this.running) return;
      this.checkpoint = null;
      this.persist();
      this.drainAttempted = false;
      this.timeoutAttempted = '';
      this.retries = 0;
      try {
        const duel = await this.api.create(this.locale);
        if (this.running) this.acceptDuel(duel);
      } catch (e) {
        // Creation may have committed despite a lost response. /duel is also
        // idempotent for an existing live wait, but first recover M/D explicitly.
        if (duelErrorCode(e) === 'ranked_async_draft_in_progress') {
          await this.sync();
          return;
        }
        throw e;
      }
    });
  };
  prepare = async () => {
    await this.work(async () => {
      if (!this.asyncEnabled || !this.state.asyncOffer || this.state.phase !== 'waiting' || !this.checkpoint) return;
      await this.sync();
      if (!this.running || this.state.phase !== 'waiting' || !this.checkpoint) return;
      this.checkpoint.requestId ||= crypto.randomUUID();
      this.persist();
      let response;
      try {
        response = await this.api.prepare(this.checkpoint.requestId, this.locale);
      } catch (e) {
        if (!this.running) return;
        if (duelErrorCode(e) === 'invalid_client_request_id') {
          this.checkpoint.requestId = crypto.randomUUID();
          this.persist();
          response = await this.api.prepare(this.checkpoint.requestId, this.locale);
        } else {
          if (duelErrorCode(e) === 'ranked_async_disabled' || duelErrorCode(e) === 'ranked_async_unavailable_language')
            this.patch({ asyncOffer: false });
          await this.sync();
          throw e;
        }
      }
      if (!this.running) return;
      if (response.duel) this.acceptDuel(response.duel);
      else if (response.draft) this.acceptDraft(response.draft);
    });
  };
  cancel = async () => {
    await this.work(async () => {
      await this.sync();
      if (!this.running) return;
      const id = this.state.duel?.id;
      if (!id || this.state.phase !== 'waiting') return;
      const cancelled = await this.api.cancel(id, this.locale);
      if (!this.running) return;
      if (cancelled) {
        this.checkpoint = null;
        this.persist();
        this.patch({ phase: 'idle', duel: null, story: '', asyncOffer: false, lowActivity: false });
      } else await this.sync(); // Opponent won the cancellation race.
    });
  };
  forfeit = async () => {
    await this.work(async () => {
      await this.sync();
      if (!this.running) return;
      if (this.state.phase !== 'writing' || !this.state.duel) return;
      await this.api.forfeit(this.state.duel.id, this.locale);
      if (this.running) this.patch({ phase: 'pending', submissionAttempted: true });
      if (this.checkpoint) {
        this.checkpoint.submitted = true;
        this.persist();
      }
    });
  };
  submit = async (automatic = false) => {
    if (this.operation || this.state.phase !== 'writing') return;
    const { draft, duel, story } = this.state;
    if (!automatic && !validStory(story, !!draft || duel?.kind === 'ranked_async')) {
      this.patch({ error: 'invalid' });
      return;
    }
    this.retryAutomatic = automatic;
    await this.work(async () => {
      const stored = this.read();
      if (stored && (stored.id !== this.checkpoint?.id || stored.type !== this.checkpoint?.type)) {
        await this.sync();
        return;
      }
      if (stored && stored.id === this.checkpoint?.id && stored.submitted) {
        this.checkpoint = stored;
        await this.sync();
        return;
      }
      if (stored && stored.id === this.checkpoint?.id && stored.attempted) {
        this.checkpoint = stored;
        this.patch({ story: stored.story });
      }
      const text = this.checkpoint?.story ?? story;
      if (this.checkpoint) {
        this.checkpoint.attempted = true;
        this.persist();
      }
      this.patch({ submissionAttempted: true });
      try {
        if (draft) {
          await this.api.submitDraft(draft.id, text, this.locale);
          if (!this.running) return;
          this.checkpoint = null;
          this.persist();
          this.patch({ phase: 'queued', draft: null, story: '', submissionAttempted: false });
        } else if (duel) {
          await this.api.submit(duel.id, text, this.locale);
          if (!this.running) return;
          if (this.checkpoint) {
            this.checkpoint.submitted = true;
            this.persist();
          }
          this.patch({ phase: 'pending' });
        }
        this.retries = 0;
      } catch (e) {
        if (isTransient(e)) {
          const delays = [2000, 5000, 10000]; // Flutter's bounded submission retries.
          if (this.retries < delays.length) this.retryAt = Date.now() + delays[this.retries++];
        } else {
          if (this.checkpoint) {
            this.checkpoint.attempted = false;
            this.persist();
          }
          this.patch({ submissionAttempted: false });
          if (e instanceof ApiError && (e.status === 410 || e.status === 404)) this.patch({ phase: 'expired' });
          else if (e instanceof ApiError && e.status === 409) await this.sync();
        }
        throw e;
      }
    });
  };
  reset = () => {
    if (this.state.busy || !['finished', 'cancelled', 'expired', 'unavailable', 'queued'].includes(this.state.phase)) return;
    this.checkpoint = null;
    this.persist();
    this.timeoutAttempted = '';
    this.retries = 0;
    this.retryAt = 0;
    this.patch({ phase: 'idle', duel: null, draft: null, story: '', error: '', submissionAttempted: false });
  };
  private async lowActivity() {
    this.drainAttempted = true;
    if (!this.asyncEnabled) {
      this.patch({ lowActivity: true });
      return;
    }
    await this.work(async () => {
      try {
        await this.sync();
        if (!this.running || this.state.phase !== 'waiting') return;
        const match = await this.api.drain(this.locale);
        if (!this.running) return;
        if (match) this.acceptDuel(match);
        else this.patch({ lowActivity: true, asyncOffer: true });
      } catch (e) {
        const code = duelErrorCode(e);
        if (['ranked_async_disabled', 'ranked_async_unavailable_language'].includes(code))
          this.patch({ lowActivity: true, asyncOffer: false });
        else {
          await this.sync();
          throw e;
        }
      }
    });
  }
  wake = () => {
    this.nextPoll = 0;
    if (this.state.error && ['loading', 'idle'].includes(this.state.phase)) void this.recover();
    else void this.tick();
  };
  storageChanged = (key: string | null) => {
    if (key === this.key) void this.recover();
  };
  private checkpointChanged() {
    const saved = this.read();
    return saved && this.checkpoint && (saved.id !== this.checkpoint.id || saved.type !== this.checkpoint.type);
  }
  async tick(now = Date.now()) {
    if (!this.running || this.operation) return;
    if (this.checkpointChanged()) {
      await this.recover();
      return;
    }
    if (this.retryAt && now >= this.retryAt) {
      this.retryAt = 0;
      await this.submit(this.retryAutomatic);
      return;
    }
    const { phase, draft, duel, story } = this.state;
    if (phase === 'writing') {
      const active = draft || duel;
      if (active?.writingEndsAt && secondsLeft(active.writingEndsAt, now) === 0 && this.timeoutAttempted !== active.id) {
        this.timeoutAttempted = active.id;
        // Flutter sends any non-empty saved text at timeout; the backend
        // validates it. A live empty story forfeits; a draft simply expires.
        if (story.length > 0) {
          await this.submit(true);
          return;
        }
        if (duel) {
          await this.forfeit();
          return;
        }
        this.patch({ phase: 'expired', error: 'expired' });
      }
    }
    if (this.polling) return;
    if (phase === 'waiting' && !this.drainAttempted && now - (this.checkpoint?.searchAt ?? now) >= 6000) {
      await this.lowActivity();
      return;
    }
    // HTTP replaces Flutter's realtime listener. Five seconds keeps two open
    // editors below the backend's coarse 60 requests/minute IP budget; the
    // fifteen-second matchmaking heartbeat and deadline are independent.
    if (
      (now < this.nextPoll && !(phase === 'waiting' && now >= this.nextHeartbeat)) ||
      !['waiting', 'writing', 'pending', 'queued'].includes(phase)
    )
      return;
    this.nextPoll = now + 5000;
    this.polling = true;
    const epoch = this.epoch;
    try {
      if (duel) {
        const heartbeat = phase === 'waiting' && now >= this.nextHeartbeat;
        const status = heartbeat ? await this.api.heartbeat(duel.id, this.locale) : await this.api.status(duel.id, this.locale);
        if (!this.running || this.operation || epoch !== this.epoch || this.state.duel?.id !== duel.id) return;
        if (this.checkpointChanged()) {
          await this.recover();
          return;
        }
        if (heartbeat) this.nextHeartbeat = now + 15_000;
        this.acceptDuel(status);
        if (status.state === 'writing' && phase !== 'pending') {
          const pending = await this.api.pending(this.locale);
          if (this.running && !this.operation && epoch === this.epoch && pending?.id === duel.id) this.acceptDuel(pending);
        }
      } else if (draft) {
        const active = await this.api.activeDraft(this.locale);
        if (!this.running || this.operation || epoch !== this.epoch) return;
        if (active) this.acceptDraft(active);
        else await this.sync();
      } else if (phase === 'queued') {
        const queued = await this.api.queued(this.locale);
        if (this.running && !this.operation && epoch === this.epoch) this.patch({ queued });
      }
    } catch (e) {
      if (this.running && epoch === this.epoch) this.patch({ error: rankedFailure(e) });
    } finally {
      this.polling = false;
    }
  }
}
