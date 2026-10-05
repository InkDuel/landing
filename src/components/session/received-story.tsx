'use client';

import { useEffect, useState } from 'react';

import { Consigna } from '@/components/ink/consigna';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton } from '@/components/ink/ink-states';
import { BackLink } from '@/components/legal/legal-page';
import { StoryText } from '@/components/reading/story-parts';
import { apiGet, apiPath } from '@/lib/session/api';
import { useSession } from '@/lib/session/auth-context';
import { MARKS_COPY } from '@/lib/session/marks-copy';

import { receivedMarksHref } from './received-marks';
import { useSessionLocale } from './session-root';
import { StoryComments } from './story-comments';

// The received-comment page (web): a stable, refreshable link for a Marca on
// one of your relatos. The app opens the duel result, which the web does not
// have. Existing contracts only: the relato through the public duel story
// (duelId + your own uid), the conversation through duelId + storyId.

type Story = { prompt: string; text: string; authorId: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function ReceivedStoryView({ duelId, storyId, commentId }: { duelId: string; storyId: string; commentId: string | null }) {
  const { locale } = useSessionLocale();
  const { user } = useSession();
  const copy = MARKS_COPY[locale].inbox;
  const [story, setStory] = useState<Story | 'loading' | 'error'>('loading');
  const uid = user?.id ?? '';

  useEffect(() => {
    if (!uid) return;
    const controller = new AbortController();
    setStory('loading');
    apiGet(apiPath('public', 'duels', duelId, 'story', uid), { locale, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const author = isRecord(data) && isRecord(data.author) ? data.author : null;
        setStory(
          isRecord(data) && author
            ? { prompt: typeof data.prompt === 'string' ? data.prompt : '', text: typeof data.text === 'string' ? data.text : '', authorId: typeof author.id === 'string' ? author.id : '' }
            : 'error',
        );
      })
      .catch(() => !controller.signal.aborted && setStory('error'));
    return () => controller.abort();
  }, [duelId, uid, locale]);

  return (
    <article className="mx-auto flex w-full max-w-[680px] flex-col gap-4 pt-2">
      <BackLink href={receivedMarksHref()} label={copy.backToInbox} />
      <p className="type-label text-secondary">{copy.yourStory}</p>
      {story === 'loading' ? <InkSkeleton lines={4} height="h-6" label={copy.yourStory} /> : null}
      {/* Without the relato the conversation still opens: it has its own contract. */}
      {story === 'error' ? <InkInlineBanner tone="info" title={copy.storyLoadError} /> : null}
      {typeof story === 'object' ? (
        <>
          {story.prompt.trim() ? <Consigna label={copy.promptLabel} text={story.prompt.trim()} /> : null}
          <div className="mt-2">
            <StoryText text={story.text} />
          </div>
        </>
      ) : null}
      <StoryComments
        duelId={duelId}
        storyId={storyId}
        isOwnStory={typeof story === 'object' && !!uid && story.authorId === uid}
        initialCount={0}
        focusId={commentId}
        autoOpen
        locale={locale}
      />
    </article>
  );
}
