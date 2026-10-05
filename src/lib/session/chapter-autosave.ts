// Autosave engine for one chapter, ported from the app's ChapterEditorCubit
// (inkduel_mobile/lib/features/continue_stories/presentation/cubit/
// chapter_editor_cubit.dart) with the web timing approved for phase 2:
//
// - a save 2 s after the author stops typing;
// - at least 20 s between automatic saves (240 chapter writes/hour budget);
// - while typing without pause, a periodic save every 20 s;
// - at most one request in flight; edits made meanwhile are coalesced;
// - create-on-first-save with a PINNED payload (same id + same content on
//   every retry, so an ambiguous response never becomes an id conflict);
// - a 409 keeps the local text and surfaces the server snapshot;
// - transient errors back off; other errors wait for an explicit retry;
// - invalid text (empty, over 5,000) is never sent.
//
// Framework-free so it can be tested with a fake backend and short timers.

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed' | 'conflict' | 'invalid';
export type Invalid = 'empty' | 'tooLong' | null;

export type ConflictSnapshot = { revision: number; content: string; title: string };

export type ChapterEditorState = {
  workId: string;
  chapterId: string;
  isNew: boolean;
  orderIndex: number;
  published: boolean;
  localContent: string;
  localTitle: string;
  savedContent: string;
  savedTitle: string;
  savedRevision: number;
  status: SaveStatus;
  invalid: Invalid;
  conflict: ConflictSnapshot | null;
};

type SavedChapter = { revision: number; orderIndex: number; published: boolean };

export type AutosaveDeps = {
  add: (content: string, title: string, keepalive: boolean) => Promise<SavedChapter>;
  patch: (content: string, title: string, expectedRevision: number, keepalive: boolean) => Promise<SavedChapter>;
  remove: () => Promise<void>;
  /** The 409 body, read into a snapshot (null if it is not a revision conflict). */
  readConflict: (error: unknown) => ConflictSnapshot | null;
  isTransient: (error: unknown) => boolean;
};

export type AutosaveTiming = { debounceMs: number; minGapMs: number; backoffBaseMs: number; backoffMaxMs: number };

export const WEB_TIMING: AutosaveTiming = { debounceMs: 2_000, minGapMs: 20_000, backoffBaseMs: 1_000, backoffMaxMs: 30_000 };

const MAX_CONTENT = 5000;
const MAX_TITLE = 120;
const runes = (value: string) => Array.from(value).length;

export function isDirty(state: ChapterEditorState): boolean {
  return state.localContent !== state.savedContent || state.localTitle !== state.savedTitle;
}

/** Whether leaving now could lose text (drives beforeunload and navigation). */
export function hasUnsavedWork(state: ChapterEditorState): boolean {
  if (state.isNew && state.localContent.trim() === '') return false;
  return isDirty(state) || state.status === 'saving' || state.status === 'conflict';
}

export class ChapterAutosave {
  private state: ChapterEditorState;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private lastChangeAt = 0;
  private dirtySince: number | null = null;
  private lastAutoSaveAt = Number.NEGATIVE_INFINITY;
  private backoffAttempt = 0;
  private backoffUntil = 0;
  private createContent: string | null = null;
  private createTitle: string | null = null;
  private disposed = false;
  private readonly deps: AutosaveDeps;
  private readonly timing: AutosaveTiming;
  private readonly now: () => number;

  constructor(
    initial: ChapterEditorState,
    deps: AutosaveDeps,
    timing: AutosaveTiming = WEB_TIMING,
    now: () => number = () => Date.now(),
  ) {
    this.state = initial;
    this.deps = deps;
    this.timing = timing;
    this.now = now;
  }

  // --- store API ---

  getState = (): ChapterEditorState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<ChapterEditorState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  // --- author input ---

  setContent(content: string) {
    if (content === this.state.localContent) return;
    this.edited({ localContent: content });
  }

  setTitle(title: string) {
    if (title === this.state.localTitle) return;
    this.edited({ localTitle: title });
  }

  private edited(patch: Partial<ChapterEditorState>) {
    const next = { ...this.state, ...patch };
    const invalid = this.validate(next);
    this.lastChangeAt = this.now();
    if (!isDirty(next)) this.dirtySince = null;
    else if (this.dirtySince === null) this.dirtySince = this.lastChangeAt;
    this.set({ ...patch, invalid, status: this.statusAfterEdit(next, invalid) });
    this.schedule();
  }

  private statusAfterEdit(next: ChapterEditorState, invalid: Invalid): SaveStatus {
    const current = this.state.status;
    if (current === 'conflict') return 'conflict';
    if (invalid) return 'invalid';
    // A pending backoff or a failure that needs an explicit retry stays visible.
    if (current === 'retrying' || current === 'failed') return current;
    if (current === 'saving') return 'saving';
    return isDirty(next) ? 'idle' : 'saved';
  }

  private validate(state: ChapterEditorState): Invalid {
    if (runes(state.localContent) > MAX_CONTENT || runes(state.localTitle) > MAX_TITLE) return 'tooLong';
    // A new chapter with no body yet is simply not created; only an existing
    // chapter cannot be emptied (the backend rejects empty content).
    if (!state.isNew && state.localContent.trim() === '') return 'empty';
    return null;
  }

  // --- scheduling ---

  private schedule() {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const { status } = this.state;
    if (status === 'conflict' || status === 'failed' || status === 'invalid') return;
    if (!isDirty(this.state) && !this.createPending) return;
    const idleDue = this.lastChangeAt + this.timing.debounceMs;
    const periodicDue = (this.dirtySince ?? this.lastChangeAt) + this.timing.minGapMs;
    const due = Math.max(Math.min(idleDue, periodicDue), this.lastAutoSaveAt + this.timing.minGapMs, this.backoffUntil);
    this.timer = setTimeout(() => void this.attempt({ automatic: true }), Math.max(0, due - this.now()));
  }

  private get createPending(): boolean {
    return this.state.isNew && this.createContent !== null;
  }

  // --- saving ---

  private async attempt({ automatic, keepalive = false }: { automatic: boolean; keepalive?: boolean }): Promise<void> {
    if (this.disposed && !keepalive) return;
    if (this.inFlight) return this.inFlight;
    const state = this.state;
    if (state.status === 'conflict') return;
    if (!isDirty(state) && !this.createPending) return;
    if (this.validate(state) && !this.createPending) {
      this.set({ status: 'invalid', invalid: this.validate(state) });
      return;
    }
    if (state.isNew && this.createContent === null && state.localContent.trim() === '') return;

    if (automatic) this.lastAutoSaveAt = this.now();
    const run = this.runSave(keepalive);
    this.inFlight = run;
    try {
      await run;
    } finally {
      this.inFlight = null;
    }
  }

  private async runSave(keepalive: boolean): Promise<void> {
    const creating = this.state.isNew;
    if (creating) {
      this.createContent ??= this.state.localContent;
      this.createTitle ??= this.state.localTitle;
    }
    const content = creating ? (this.createContent as string) : this.state.localContent;
    const title = creating ? (this.createTitle as string) : this.state.localTitle;
    const expected = this.state.savedRevision;
    this.set({ status: 'saving' });
    try {
      const saved = creating
        ? await this.deps.add(content, title, keepalive)
        : await this.deps.patch(content, title, expected, keepalive);
      this.backoffAttempt = 0;
      this.backoffUntil = 0;
      if (creating) {
        this.createContent = null;
        this.createTitle = null;
        if (this.state.localContent.trim() === '') {
          // The author erased the body while the create was in flight: honour
          // that by removing the chapter that may now exist (app behaviour).
          await this.reconcileErasedCreate(saved);
          return;
        }
      }
      const savedState = {
        ...this.state,
        isNew: false,
        savedContent: content,
        savedTitle: title,
        savedRevision: saved.revision,
        orderIndex: saved.orderIndex || this.state.orderIndex,
        published: saved.published,
      };
      const stillDirty = isDirty(savedState);
      const invalid = this.validate(savedState);
      this.dirtySince = stillDirty ? this.dirtySince ?? this.now() : null;
      this.set({
        isNew: false,
        savedContent: content,
        savedTitle: title,
        savedRevision: saved.revision,
        orderIndex: savedState.orderIndex,
        published: saved.published,
        invalid,
        status: invalid ? 'invalid' : stillDirty ? 'idle' : 'saved',
      });
      if (stillDirty) this.schedule();
    } catch (error) {
      const snapshot = this.deps.readConflict(error);
      if (snapshot && !creating) {
        this.set({ status: 'conflict', conflict: snapshot });
      } else if (this.deps.isTransient(error)) {
        this.backoffUntil = this.now() + this.nextBackoff();
        this.set({ status: 'retrying' });
        this.schedule();
      } else {
        this.set({ status: 'failed' });
      }
    }
  }

  private async reconcileErasedCreate(saved: SavedChapter) {
    try {
      await this.deps.remove();
      // Back to a fresh new chapter that keeps whatever the author typed since.
      this.set({ isNew: true, savedContent: '', savedTitle: '', savedRevision: 0, status: 'idle', invalid: null });
      if (this.state.localContent.trim() !== '') this.schedule();
    } catch {
      this.set({
        isNew: false,
        savedRevision: saved.revision,
        orderIndex: saved.orderIndex || this.state.orderIndex,
        status: 'failed',
      });
    }
  }

  private nextBackoff(): number {
    const exp = this.timing.backoffBaseMs * 2 ** this.backoffAttempt;
    this.backoffAttempt = Math.min(this.backoffAttempt + 1, 8);
    return Math.min(exp, this.timing.backoffMaxMs) + Math.floor(Math.random() * 250);
  }

  // --- explicit actions ---

  /**
   * Saves everything now (navigation, publish) and resolves whether the
   * chapter is clean. False when a conflict, an invalid text or a failure
   * leaves unsaved text: the caller must stay in the editor.
   */
  async flush(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (let i = 0; i < 5; i += 1) {
      if (this.inFlight) {
        await this.inFlight;
        continue;
      }
      const state = this.state;
      if (state.status === 'conflict' || state.status === 'invalid') return false;
      if (!this.createPending) {
        if (!isDirty(state)) return true;
        if (state.isNew && state.localContent.trim() === '') return true;
      }
      // An explicit flush does not wait for a backoff: it tries now, once.
      this.backoffUntil = 0;
      await this.attempt({ automatic: false });
      if (this.state.status === 'retrying' || this.state.status === 'failed') {
        if (this.state.status === 'retrying') this.schedule();
        return false;
      }
    }
    return !isDirty(this.state) && this.state.status !== 'conflict';
  }

  /** Best effort when the tab hides or the page goes away (keepalive request). */
  flushBestEffort() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.attempt({ automatic: false, keepalive: true }).then(() => this.schedule());
  }

  retryNow() {
    this.backoffUntil = 0;
    if (this.state.status === 'failed' || this.state.status === 'retrying') this.set({ status: 'idle' });
    void this.attempt({ automatic: false });
  }

  /** Conflict: keep the local text on top of the server's revision. */
  keepMine() {
    const snapshot = this.state.conflict;
    if (!snapshot) return;
    this.set({
      savedRevision: snapshot.revision,
      savedContent: snapshot.content,
      savedTitle: snapshot.title,
      conflict: null,
      status: 'idle',
    });
    void this.attempt({ automatic: false });
  }

  /** Conflict: discard the local text for the server's version. */
  useServer() {
    const snapshot = this.state.conflict;
    if (!snapshot) return;
    this.dirtySince = null;
    this.set({
      savedRevision: snapshot.revision,
      savedContent: snapshot.content,
      savedTitle: snapshot.title,
      localContent: snapshot.content,
      localTitle: snapshot.title,
      conflict: null,
      invalid: null,
      status: 'saved',
    });
  }

  markPublished() {
    this.set({ published: true });
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }
}
