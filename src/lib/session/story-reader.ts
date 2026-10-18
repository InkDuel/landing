import type { Locale } from '@/lib/i18n';

import type { GalleryReaction, GalleryStory } from './models';
import { type ReadingApi, readingAnalytics, readingRef, transitionCounts } from './reading';

// Continuous reading in Historias, ported from the app's
// gallery_reader_cubit.dart: the relato on screen, its reaction, and what
// «Siguiente relato» offers next. With both switches off it only holds the
// relato, so the reader renders exactly as before the feature.

/** Where «Siguiente relato» stands for the relato being read. */
export type NextStatus = 'idle' | 'loading' | 'ready' | 'exhausted' | 'none';

export type StoryReaderState = {
  story: GalleryStory;
  /** Bumps each time «Siguiente relato» swaps the relato in place. */
  storyVersion: number;
  upcoming: GalleryStory[];
  nextStatus: NextStatus;
  /** Whether [upcoming] came from the server queue (vs. the loaded list). */
  nextFromQueue: boolean;
  /** Whether the current relato was reached through the server queue. */
  openedFromQueue: boolean;
  reactionPending: boolean;
  /** Bumps on every failed reaction, so the view can say so once. */
  reactionFailures: number;
};

export type StoryReaderOptions = {
  story: GalleryStory;
  api: ReadingApi;
  queueEnabled: boolean;
  reactionsEnabled: boolean;
  viewerId: string | null;
  locale: Locale;
  /** The list the reader came from: the fallback when the queue is off. */
  feed?: GalleryStory[];
  onStoryRead?: (story: GalleryStory) => void;
  /** Only the canonical answer, never the optimistic one. */
  onReactionSaved?: (story: GalleryStory) => void;
  initialUpcoming?: GalleryStory[];
  openedFromQueue?: boolean;
  /**
   * A relato opened on purpose from the list counts as read right away; the
   * one reading mode lands on does not (the reader may only be passing by).
   */
  markReadOnOpen?: boolean;
};

const MAX_EXCLUDED = 20;
const QUEUE_BATCH = 3;

export class StoryReader {
  readonly queueEnabled: boolean;
  readonly reactionsEnabled: boolean;
  private state: StoryReaderState;
  private readonly listeners = new Set<() => void>();
  /** Refs shown in this visit, newest last, sent as `exclude`. */
  private readonly sessionRefs: string[] = [];
  /** Refs already sent to the reading memory: a relato is written once. */
  private readonly markedRefs = new Set<string>();
  private started = false;
  private closed = false;

  constructor(private readonly options: StoryReaderOptions) {
    this.queueEnabled = options.queueEnabled;
    this.reactionsEnabled = options.reactionsEnabled;
    const upcoming = options.queueEnabled ? [...(options.initialUpcoming ?? [])] : [];
    this.state = {
      story: options.story,
      storyVersion: 0,
      upcoming,
      nextStatus: upcoming.length > 0 ? 'ready' : 'idle',
      nextFromQueue: upcoming.length > 0,
      openedFromQueue: options.openedFromQueue ?? false,
      reactionPending: false,
      reactionFailures: 0,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  get isOwnStory(): boolean {
    const viewer = this.options.viewerId;
    return !!viewer && this.state.story.authorId === viewer;
  }

  /** Side effects of opening, once (React may mount twice in development). */
  start() {
    this.closed = false;
    if (this.started) return;
    this.started = true;
    if (this.options.markReadOnOpen ?? true) this.markRead(this.state.story);
    readingAnalytics.storyViewed(this.state.story, this.state.openedFromQueue ? 'reading_queue' : 'gallery', this.isOwnStory, this.options.locale);
    this.storyShown();
  }

  /** The view left. Answers still in flight touch nothing but the list. */
  close() {
    this.closed = true;
  }

  private emit(next: Partial<StoryReaderState>) {
    if (this.closed) return;
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  /** A shown relato stays out of this visit's queue; read only via markRead. */
  private storyShown() {
    const ref = readingRef(this.state.story);
    if (!this.sessionRefs.includes(ref)) this.sessionRefs.push(ref);
    if (this.queueEnabled && this.state.upcoming.length === 0) void this.loadNext();
  }

  /** Opened from the list, end reached, left with «Siguiente», reacted to. */
  private markRead(story: GalleryStory) {
    if (!this.queueEnabled) return;
    const ref = readingRef(story);
    if (this.markedRefs.has(ref)) return;
    this.markedRefs.add(ref);
    this.options.onStoryRead?.(story);
    // Best effort: a lost mark only risks a repeat on another visit, and
    // this visit's exclusions already cover it.
    this.options.api.markRead(story.duelId, story.storyId, { locale: this.options.locale }).catch(() => undefined);
  }

  /** The reader scrolled to the end of the text of the current relato. */
  markEndReached() {
    this.markRead(this.state.story);
  }

  private async loadNext() {
    this.emit({ nextStatus: 'loading' });
    const requestedFor = this.state.story.key;
    try {
      const page = await this.options.api.next(readingRef(this.state.story), this.recentRefs(), QUEUE_BATCH, {
        locale: this.options.locale,
      });
      if (this.closed || this.state.story.key !== requestedFor) return;
      const items = page.items.filter((story) => this.isNewCandidate(story));
      if (items.length === 0) {
        if (page.exhausted) {
          this.emit({ upcoming: [], nextStatus: 'exhausted', nextFromQueue: true });
          return;
        }
        this.useFeedFallback();
        return;
      }
      this.emit({ upcoming: items, nextStatus: 'ready', nextFromQueue: true });
    } catch {
      if (this.closed || this.state.story.key !== requestedFor) return;
      // Queue off (503) or unreachable: keep reading from the loaded list.
      this.useFeedFallback();
    }
  }

  /**
   * The next relato of the list the reader came from: after the current one
   * first, never one already read, never two by the same author in a row
   * when another author is available.
   */
  private useFeedFallback() {
    const feed = this.options.feed ?? [];
    const current = this.state.story;
    const index = feed.findIndex((story) => story.key === current.key);
    const ordered = (index >= 0 ? [...feed.slice(index + 1), ...feed.slice(0, index)] : feed).filter(
      (story) => this.isNewCandidate(story) && !story.readByMe,
    );
    const pick = ordered.find((story) => story.authorId !== current.authorId) ?? ordered[0] ?? null;
    this.emit({ upcoming: pick ? [pick] : [], nextStatus: pick ? 'ready' : 'none', nextFromQueue: false });
  }

  private isNewCandidate(story: GalleryStory): boolean {
    if (this.sessionRefs.includes(readingRef(story)) || story.key === this.state.story.key) return false;
    const viewer = this.options.viewerId;
    return !viewer || story.authorId !== viewer;
  }

  private recentRefs(): string[] {
    return this.sessionRefs.slice(-MAX_EXCLUDED);
  }

  /** «Siguiente relato»: swaps the relato in place. */
  openNext() {
    const next = this.state.upcoming[0];
    if (!next) return;
    this.markRead(this.state.story);
    const fromQueue = this.state.nextFromQueue;
    readingAnalytics.nextStoryOpened(fromQueue);
    const rest = this.state.upcoming.slice(1).filter((story) => story.key !== next.key && this.isNewCandidate(story));
    this.emit({
      story: next,
      storyVersion: this.state.storyVersion + 1,
      upcoming: rest,
      nextStatus: rest.length > 0 ? 'ready' : 'idle',
      openedFromQueue: fromQueue,
      reactionPending: false,
    });
    readingAnalytics.storyViewed(next, fromQueue ? 'reading_queue' : 'reading_feed', this.isOwnStory, this.options.locale);
    this.storyShown();
  }

  /** Picks a reaction, switches to it, or clears it when it was already the reader's. */
  async react(tapped: GalleryReaction) {
    const story = this.state.story;
    if (!this.reactionsEnabled || this.state.reactionPending || this.isOwnStory) return;
    this.markRead(story);
    const previous = story.myReaction;
    const next = previous === tapped ? null : tapped;
    this.emit({
      story: { ...story, myReaction: next, reactionCounts: transitionCounts(story.reactionCounts, previous, next) },
      reactionPending: true,
    });
    try {
      const result = await this.options.api.setReaction(story.duelId, story.storyId, next, { locale: this.options.locale });
      readingAnalytics.reactionSet(next, previous !== null);
      const saved = { ...story, myReaction: result.myReaction, reactionCounts: result.reactionCounts };
      // The list hears the canonical answer even if the reader already left.
      this.options.onReactionSaved?.(saved);
      // The reader moved on: openNext released the pending flag and a newer
      // request may own it now, so this answer touches nothing here.
      if (this.state.story.key !== story.key) return;
      this.emit({ story: { ...this.state.story, myReaction: result.myReaction, reactionCounts: result.reactionCounts }, reactionPending: false });
    } catch {
      if (this.state.story.key !== story.key) return;
      this.emit({
        story: { ...this.state.story, myReaction: previous, reactionCounts: story.reactionCounts },
        reactionPending: false,
        reactionFailures: this.state.reactionFailures + 1,
      });
    }
  }
}
