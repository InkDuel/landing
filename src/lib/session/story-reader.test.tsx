import { describe, expect, it, vi } from 'vitest';

import type { GalleryReaction, GalleryStory } from './models';
import { NO_REACTIONS } from './models';
import type { ReactionResult, ReadingApi, ReadingQueue } from './reading';
import { StoryReader, type StoryReaderOptions } from './story-reader';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const story = (id: string, over: Partial<GalleryStory> = {}): GalleryStory => ({
  key: `duel_${id}~story_${id}`,
  duelId: `duel_${id}`,
  storyId: `story_${id}`,
  prompt: `Consigna ${id}`,
  storyPreview: `Relato ${id}`,
  storyText: `Relato ${id}`,
  authorId: `author_${id}`,
  authorDisplayName: `autor${id}`,
  authorRank: 'Aprendiz I',
  score: 70,
  strengths: [],
  commentsCount: 0,
  language: 'es',
  readByMe: false,
  myReaction: null,
  reactionCounts: NO_REACTIONS,
  ...over,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

function fakeApi(queue: () => Promise<ReadingQueue> = () => Promise.resolve({ items: [], exhausted: false })) {
  const marked: string[] = [];
  const reactions: { storyId: string; reaction: GalleryReaction | null; answer: ReturnType<typeof deferred<ReactionResult>> }[] = [];
  const api: ReadingApi = {
    next: vi.fn(queue),
    markRead: vi.fn(async (duelId: string, storyId: string) => {
      marked.push(`${duelId}:${storyId}`);
    }),
    setReaction: vi.fn((_duelId: string, storyId: string, reaction: GalleryReaction | null) => {
      const answer = deferred<ReactionResult>();
      reactions.push({ storyId, reaction, answer });
      return answer.promise;
    }),
  };
  return { api, marked, reactions };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function open(options: Partial<StoryReaderOptions> & Pick<StoryReaderOptions, 'story' | 'api'>) {
  const reader = new StoryReader({ queueEnabled: true, reactionsEnabled: true, viewerId: 'me', locale: 'es', ...options });
  reader.start();
  return reader;
}

describe('StoryReader: what counts as read', () => {
  it('landing in reading mode is not reading; the end of the text is, once', async () => {
    const { api, marked } = fakeApi();
    const read: string[] = [];
    const reader = open({ story: story('a'), api, markReadOnOpen: false, onStoryRead: (s) => read.push(s.key) });
    await flush();
    expect(marked).toEqual([]);

    reader.markEndReached();
    reader.markEndReached();
    expect(marked).toEqual(['duel_a:story_a']);
    expect(read).toEqual(['duel_a~story_a']);
  });

  it('a relato opened from the list counts at once; React mounting twice writes once', async () => {
    const { api, marked } = fakeApi();
    const reader = open({ story: story('a'), api });
    reader.close();
    reader.start();
    await flush();
    expect(marked).toEqual(['duel_a:story_a']);
    expect(api.next).toHaveBeenCalledTimes(1);
  });

  it('«Siguiente relato» marks the relato it leaves, not the one it opens', async () => {
    const { api, marked } = fakeApi(() => Promise.resolve({ items: [story('b')], exhausted: false }));
    const reader = open({ story: story('a'), api, markReadOnOpen: false });
    await flush();
    expect(reader.getSnapshot().nextStatus).toBe('ready');

    reader.openNext();
    expect(reader.getSnapshot().story.key).toBe('duel_b~story_b');
    expect(marked).toEqual(['duel_a:story_a']);
    // The next request excludes what this visit already showed.
    expect(vi.mocked(api.next).mock.calls[1].slice(0, 2)).toEqual(['duel_b:story_b', ['duel_a:story_a', 'duel_b:story_b']]);
  });

  it('with both switches off nothing is written or asked', async () => {
    const { api, marked } = fakeApi();
    const reader = open({ story: story('a'), api, queueEnabled: false, reactionsEnabled: false });
    reader.markEndReached();
    await reader.react('moved');
    await flush();
    expect(marked).toEqual([]);
    expect(api.next).not.toHaveBeenCalled();
    expect(api.setReaction).not.toHaveBeenCalled();
  });
});

describe('StoryReader: «Siguiente relato» without the queue', () => {
  it('falls back to the list: never read, never own, another author first', async () => {
    const { api } = fakeApi(() => Promise.reject(new Error('503')));
    const feed = [
      story('a'),
      story('read', { readByMe: true }),
      story('mine', { authorId: 'me' }),
      story('same', { authorId: 'author_a' }),
      story('other'),
    ];
    const reader = open({ story: feed[0], api, feed, markReadOnOpen: false });
    await flush();
    expect(reader.getSnapshot().nextStatus).toBe('ready');
    expect(reader.getSnapshot().nextFromQueue).toBe(false);
    expect(reader.getSnapshot().upcoming.map((s) => s.key)).toEqual(['duel_other~story_other']);
  });

  it('says so honestly when the queue is exhausted', async () => {
    const { api } = fakeApi(() => Promise.resolve({ items: [], exhausted: true }));
    const reader = open({ story: story('a'), api });
    await flush();
    expect(reader.getSnapshot().nextStatus).toBe('exhausted');
  });
});

describe('StoryReader: reactions', () => {
  const counts = (hooked: number, moved: number) => ({ hooked, moved, surprised: 0 });

  it('is optimistic, and the list hears only the canonical answer, even after the reader left', async () => {
    const { api, reactions } = fakeApi();
    const saved: GalleryStory[] = [];
    const reader = open({ story: story('a', { reactionCounts: counts(2, 0) }), api, onReactionSaved: (s) => saved.push(s) });

    const pending = reader.react('hooked');
    expect(reader.getSnapshot().story.myReaction).toBe('hooked');
    expect(reader.getSnapshot().story.reactionCounts).toEqual(counts(3, 0));
    expect(saved).toEqual([]);

    reader.close();
    reactions[0].answer.resolve({ storyId: 'story_a', myReaction: 'hooked', reactionCounts: counts(7, 1) });
    await pending;
    expect(saved.map((s) => [s.myReaction, s.reactionCounts])).toEqual([['hooked', counts(7, 1)]]);
  });

  it('tapping the same reaction clears it; a failure rolls back and tells nobody', async () => {
    const { api, reactions } = fakeApi();
    const saved: GalleryStory[] = [];
    const reader = open({ story: story('a', { myReaction: 'moved', reactionCounts: counts(0, 4) }), api, onReactionSaved: (s) => saved.push(s) });

    const pending = reader.react('moved');
    expect(reactions[0].reaction).toBeNull();
    expect(reader.getSnapshot().story.reactionCounts).toEqual(counts(0, 3));
    reactions[0].answer.reject(new Error('network'));
    await pending;

    expect(reader.getSnapshot().story.myReaction).toBe('moved');
    expect(reader.getSnapshot().story.reactionCounts).toEqual(counts(0, 4));
    expect(reader.getSnapshot().reactionFailures).toBe(1);
    expect(saved).toEqual([]);
  });

  it("A's late answer never releases B's pending reaction", async () => {
    const { api, reactions } = fakeApi(() => Promise.resolve({ items: [story('b')], exhausted: false }));
    const reader = open({ story: story('a'), api, markReadOnOpen: false });
    await flush();

    const onA = reader.react('hooked');
    reader.openNext();
    const onB = reader.react('moved');
    expect(reader.getSnapshot().reactionPending).toBe(true);

    reactions[0].answer.resolve({ storyId: 'story_a', myReaction: 'hooked', reactionCounts: counts(1, 0) });
    await onA;
    expect(reader.getSnapshot().story.key).toBe('duel_b~story_b');
    expect(reader.getSnapshot().reactionPending).toBe(true);
    expect(reader.getSnapshot().story.myReaction).toBe('moved');

    // A second tap on B while its request is in flight sends nothing.
    await reader.react('surprised');
    expect(reactions).toHaveLength(2);

    reactions[1].answer.resolve({ storyId: 'story_b', myReaction: 'moved', reactionCounts: counts(0, 1) });
    await onB;
    expect(reader.getSnapshot().reactionPending).toBe(false);
  });

  it('the author cannot react to their own relato', async () => {
    const { api } = fakeApi();
    const reader = open({ story: story('a', { authorId: 'me' }), api });
    await reader.react('hooked');
    expect(api.setReaction).not.toHaveBeenCalled();
  });
});
