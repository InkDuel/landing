'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { StoryText } from '@/components/reading/story-parts';
import { track } from '@/lib/analytics';
import type { Locale } from '@/lib/i18n';
import { SESSION_COPY } from '@/lib/session/copy';
import { type StoryCommentsSummary, storyCommentsApi } from '@/lib/session/marks';
import { MARKS_COPY } from '@/lib/session/marks-copy';
import { type PassageSource, buildTextPassageLayout } from '@/lib/session/passages';
import { useSession } from '@/lib/session/auth-context';

import { MarkAction, MarkComposer, MarkNotice, QuoteLine } from './marks-parts';
import { PassageHintStrip, PassageStoryText, usePassageFlash, usePassageHints } from './passage-reader';
import { PassageSheet } from './passage-sheet';
import { StoryMarkItems, storyCommentsSectionId } from './story-comments';
import { StoryMarksContext } from './story-marks-context';
import { useStoryMarks } from './use-story-marks';

// Marca con cita on the relatos of duels (Historias, the received-comment
// page). Spec: InkDuel/wiki/technical/marcas-con-cita-relatos-spec.md.
//
// The provider owns the ONE general conversation of a relato (so the text and
// StoryComments share it), the summary (the paragraph keys), the paragraph
// panel and the quote composer. It is mounted only when Remote Config says so;
// the layout exists only when the summary brought `passages`, the text is the
// full one and the paragraph count matches. Anything else: today's StoryText.

export type StoryMarksSurface = 'historias' | 'received_story' | 'duel_result_rival' | 'duel_result_own';

/** Once per relato and page session: the quote action became available. */
const shownQuoteAction = new Set<string>();

type Quote = { key: string; quote: string; source: PassageSource };

type TextView = {
  layout: NonNullable<ReturnType<typeof buildTextPassageLayout>> | null;
  canQuote: boolean;
  hiddenKeys: string[];
  flash: ReturnType<typeof usePassageFlash>['flash'];
  openPassage: (key: string) => void;
  quote: (selection: Quote) => void;
  showHint: boolean;
  dismissHint: () => void;
  active: boolean;
  locale: Locale;
};

const TextViewContext = createContext<TextView | null>(null);

/** The analytics `source` of a quote started from the text. */
const quoteSource = (source: PassageSource): 'selection' | 'a11y' => (source === 'a11y' ? 'a11y' : 'selection');

export function StoryPassagesProvider({
  duelId,
  storyId,
  isOwnStory,
  initialCount,
  focusId = null,
  autoOpen = false,
  text,
  surface,
  active = true,
  enabled = true,
  locale,
  children,
}: {
  duelId: string;
  storyId: string;
  isOwnStory: boolean;
  initialCount: number;
  focusId?: string | null;
  autoOpen?: boolean;
  /** The FULL text of the relato; null while unknown or when only a preview exists. Never a preview. */
  text: string | null;
  surface: StoryMarksSurface;
  /** False while the reader is kept mounted but hidden. */
  active?: boolean;
  /**
   * The switch (Remote Config). Off or still unknown: the provider is inert —
   * no summary request, no layout — and the page reads exactly as before. It
   * may flip on later without remounting the conversation.
   */
  enabled?: boolean;
  locale: Locale;
  children: ReactNode;
}) {
  const all = MARKS_COPY[locale];
  const { user } = useSession();
  const hints = usePassageHints(user?.id ?? '');
  const [summary, setSummary] = useState<StoryCommentsSummary | null>(null);
  /** Paragraphs marked by a Marca of this visit, before the server says so. */
  const [optimistic, setOptimistic] = useState<string[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [quoteOff, setQuoteOff] = useState(false);
  const [panelKey, setPanelKey] = useState<string | null>(null);
  const [composer, setComposer] = useState<Quote | null>(null);
  const alive = useRef(true);
  const panelMutated = useRef(false);
  const panelOpen = useRef(false);
  const composerRef = useRef<Quote | null>(null);
  const composerTracked = useRef(false);
  const generalRef = useRef<{ reload: () => void; applySummary: (value: StoryCommentsSummary) => void } | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    composerRef.current = composer;
  }, [composer]);

  const adopt = useCallback((value: StoryCommentsSummary) => {
    if (!alive.current) return;
    setSummary(value);
    // The server's word replaces what this visit guessed.
    setOptimistic([]);
  }, []);

  const refreshSummary = useCallback(async (): Promise<StoryCommentsSummary> => {
    const value = await storyCommentsApi.summary(duelId, storyId, { locale });
    adopt(value);
    return value;
  }, [duelId, storyId, locale, adopt]);

  // The summary decides the feature and brings the first counters: once per relato.
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    storyCommentsApi
      .summary(duelId, storyId, { locale, signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        adopt(value);
        generalRef.current?.applySummary(value);
      })
      // No summary: the relato reads and talks as it always did.
      .catch(() => undefined);
    return () => controller.abort();
    // Language changes do not re-read the keys: they are language-free.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, storyId, enabled]);

  const marks = useStoryMarks({
    duelId,
    storyId,
    isOwnStory,
    initialCount,
    focusId,
    autoOpen,
    locale,
    quotes: {
      onPending: (key) => setOptimistic((keys) => (keys.includes(key) ? keys : [...keys, key])),
      onFailed: (key) => {
        // Only what this attempt added: a paragraph the server already marks stays.
        if (!summary?.passages?.markedKeys.includes(key)) setOptimistic((keys) => keys.filter((item) => item !== key));
      },
      onCreated: (key) => {
        const source = key ? quoteSource(composerRef.current?.source ?? 'selection') : 'composer';
        track('ink_mark_created', { surface: 'duel_story', context: surface, has_passage: !!key, source });
        if (!key) return;
        setHiddenKeys((keys) => keys.filter((item) => item !== key));
        hints.markQuoted();
      },
      onRemoved: () => void refreshSummary().catch(() => undefined),
      onUnavailable: () => setQuoteOff(true),
      stillAvailable: async () => !!(await refreshSummary()).passages,
    },
  });
  useEffect(() => {
    generalRef.current = { reload: marks.reload, applySummary: marks.applySummary };
  });

  const passages = summary?.passages ?? null;
  const layout = useMemo(() => {
    if (!text || !passages) return null;
    const markedKeys = [...new Set([...passages.markedKeys, ...optimistic])];
    return buildTextPassageLayout(text, { ...passages, markedKeys });
  }, [text, passages, optimistic]);
  const flash = usePassageFlash(layout);

  // Gotas for everyone who reads; the gesture, the hint and the composer only
  // for who can leave a root (never the author).
  const canQuote = !!layout && !isOwnStory && marks.canWrite && !quoteOff;

  useEffect(() => {
    if (!canQuote || shownQuoteAction.has(`${duelId}:${storyId}`)) return;
    shownQuoteAction.add(`${duelId}:${storyId}`);
    track('ink_mark_quote_action_shown', { surface: 'duel_story', context: surface });
  }, [canQuote, duelId, storyId, surface]);

  const openPanel = useCallback(
    (key: string) => {
      flash.flashParagraph(key);
      panelMutated.current = false;
      panelOpen.current = true;
      setPanelKey(key);
      track('ink_mark_passage_thread_opened', { surface: 'duel_story', context: surface, has_passage: true, source: 'gota' });
    },
    [flash, surface],
  );

  const closePanel = useCallback(() => {
    panelOpen.current = false;
    setPanelKey(null);
    // A reply or a delete changed what the conversation and the drops say.
    if (panelMutated.current) {
      panelMutated.current = false;
      generalRef.current?.reload();
      void refreshSummary().catch(() => undefined);
    }
  }, [refreshSummary]);

  const openComposer = useCallback(
    (selection: Quote) => {
      if (!canQuote) return;
      window.getSelection()?.removeAllRanges();
      setComposer(selection);
      track('ink_mark_composer_opened', {
        surface: 'duel_story',
        context: surface,
        has_passage: true,
        source: quoteSource(selection.source),
      });
    },
    [canQuote, surface],
  );

  const closeComposer = useCallback(() => {
    marks.dismissQuoteOffer();
    setComposer(null);
  }, [marks]);

  const jump = useCallback(
    (key: string, quote: string | null) => {
      closePanel();
      flash.jumpTo(key, quote);
    },
    [closePanel, flash],
  );

  const seeAll = useCallback(() => {
    closePanel();
    marks.request();
    const section = document.getElementById(storyCommentsSectionId(duelId, storyId));
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [closePanel, marks, duelId, storyId]);

  const composerFocused = useCallback(() => {
    if (composerTracked.current) return;
    composerTracked.current = true;
    track('ink_mark_composer_opened', { surface: 'duel_story', context: surface, has_passage: false, source: 'composer' });
  }, [surface]);

  /**
   * The panel's reply or delete reached the server. Panel still open: it is
   * synced once, on close. Already closed (the request was in flight): sync now.
   */
  const onPanelMutated = () => {
    if (panelOpen.current) {
      panelMutated.current = true;
      return;
    }
    generalRef.current?.reload();
    void refreshSummary().catch(() => undefined);
  };

  const view: TextView = {
    layout,
    canQuote,
    hiddenKeys,
    flash: flash.flash,
    openPassage: openPanel,
    quote: openComposer,
    showHint: canQuote && !hints.hints.dismissed && !hints.hints.quoted,
    dismissHint: hints.dismiss,
    active,
    locale,
  };

  const closeLabel = SESSION_COPY[locale].reader.close;
  const sp = all.storyPassage;
  const offer = marks.state.quoteOffer;

  return (
    <StoryMarksContext.Provider value={{ marks, onJumpQuote: layout ? jump : null, composerFocused }}>
      <TextViewContext.Provider value={view}>
        {children}

        <PassageSheet open={panelKey !== null} title={all.passage.threadTitle} closeLabel={closeLabel} onClose={closePanel}>
          {panelKey ? (
            <PassagePanelBody
              key={panelKey}
              passageKey={panelKey}
              duelId={duelId}
              storyId={storyId}
              isOwnStory={isOwnStory}
              locale={locale}
              canQuote={canQuote}
              onMutated={onPanelMutated}
              onEmpty={(key) => setHiddenKeys((keys) => (keys.includes(key) ? keys : [...keys, key]))}
              onJump={jump}
              onSeeAll={seeAll}
            />
          ) : null}
        </PassageSheet>

        <PassageSheet open={!!composer} title={all.passage.kicker} closeLabel={closeLabel} onClose={closeComposer} kicker>
          {composer ? (
            <div className="flex flex-col gap-3">
              <QuoteLine text={composer.quote} lines={3} />
              {offer ? (
                <div role="alert" className="flex flex-col gap-2 rounded-card bg-sunken p-3.5">
                  <p className="type-body-strong text-[15px] font-extrabold text-primary">{sp.offerTitle}</p>
                  <p className="type-body-sm text-secondary">{sp.offerBody}</p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <InkButton variant="ghost" fullWidth={false} onClick={marks.dismissQuoteOffer} disabled={marks.state.busy}>
                      {all.cancel}
                    </InkButton>
                    <InkButton
                      variant="secondary"
                      fullWidth={false}
                      busy={marks.state.busy}
                      onClick={() => void marks.leaveWithoutQuote().then((ok) => ok && setComposer(null))}
                    >
                      {sp.offerWithout}
                    </InkButton>
                  </div>
                </div>
              ) : null}
              <MarkComposer
                hint={all.story.hint}
                sending={marks.state.busy}
                error={marks.state.createError}
                blocked={marks.state.writesOff || !!offer}
                autoFocus
                onSubmit={async (value) => {
                  const ok = await marks.create(value, { paragraphKey: composer.key, quote: composer.quote });
                  if (ok) setComposer(null);
                  return ok;
                }}
                onCancel={closeComposer}
                locale={locale}
              />
            </div>
          ) : null}
        </PassageSheet>
      </TextViewContext.Provider>
    </StoryMarksContext.Provider>
  );
}

/** One paragraph's panel: its own instance, which lists `?passage=` and can never start a root. */
function PassagePanelBody({
  passageKey,
  duelId,
  storyId,
  isOwnStory,
  locale,
  canQuote,
  onMutated,
  onEmpty,
  onJump,
  onSeeAll,
}: {
  passageKey: string;
  duelId: string;
  storyId: string;
  isOwnStory: boolean;
  locale: Locale;
  canQuote: boolean;
  onMutated: () => void;
  onEmpty: (key: string) => void;
  onJump: (key: string, quote: string | null) => void;
  onSeeAll: () => void;
}) {
  const panel = useStoryMarks({ duelId, storyId, isOwnStory, initialCount: 0, autoOpen: true, locale, passageKey, onMutated });
  const all = MARKS_COPY[locale];
  const copy = all.story;
  const { state } = panel;
  const empty = state.status === 'ready' && state.items.length === 0 && !state.nextCursor;

  useEffect(() => {
    // The server has nothing here: the drop was stale, hide it for this visit.
    if (empty) onEmpty(passageKey);
  }, [empty, onEmpty, passageKey]);

  return (
    <div className="flex flex-col gap-3">
      {state.status === 'loading' || (state.requested && state.status === 'idle') ? (
        <InkSkeleton lines={2} height="h-16" label={all.passage.threadTitle} />
      ) : null}
      {state.status === 'error' && state.failure ? (
        <InkInlineBanner
          tone={state.failure === 'unavailable' ? 'info' : 'error'}
          title={state.failure === 'unavailable' ? copy.failure.unavailable : all.chapter.failure[state.failure === 'notFound' ? 'generic' : state.failure]}
          action={
            state.failure === 'unavailable' ? undefined : <InkTextAction onClick={() => void panel.load(null)}>{all.retry}</InkTextAction>
          }
        />
      ) : null}
      {empty ? <p className="type-body text-secondary">{all.passage.empty}</p> : null}
      <MarkNotice text={panel.notice} />
      <StoryMarkItems marks={panel} locale={locale} onJumpQuote={onJump} />
      {state.nextCursor && state.status === 'ready' ? (
        <div>
          <InkButton variant="secondary" fullWidth={false} busy={state.loadingMore} onClick={() => void panel.load(state.nextCursor)}>
            {state.moreFailed ? all.retry : copy.loadMore}
          </InkButton>
        </div>
      ) : null}
      <div className="flex flex-col gap-1 border-t border-divider pt-3">
        <div className="-ml-2">
          <MarkAction tone="blue" onClick={onSeeAll}>
            {all.storyPassage.seeAll}
          </MarkAction>
        </div>
        {canQuote ? <p className="type-caption text-[13px] text-secondary">{all.passage.threadHelp}</p> : null}
      </div>
    </div>
  );
}

/**
 * The relato's text. Inside a provider and with a layout: one element per
 * paragraph with the gotas and the quote gesture. In every other case it is
 * exactly the StoryText of before.
 */
export function StoryPassageText({
  text,
  plain,
  typographyClass,
  lineHeight,
  whiteSpaceClass,
  placesClassName,
}: {
  text: string;
  /** What draws the text without places, when the surface has its own markup (default: StoryText). */
  plain?: (text: string) => ReactNode;
  /** With places the lines keep the surface's typography: class and the px height of one line. */
  typographyClass?: string;
  lineHeight?: number;
  whiteSpaceClass?: string;
  /** Margin and gutter of the text box, only while it is drawn with places. */
  placesClassName?: string;
}) {
  const view = useContext(TextViewContext);
  if (!view || !view.layout) return plain ? <>{plain(text)}</> : <StoryText text={text} />;
  return (
    <>
      {view.showHint ? <PassageHintStrip onDismiss={view.dismissHint} locale={view.locale} /> : null}
      <PassageStoryText
        typographyClass={typographyClass}
        lineHeight={lineHeight}
        whiteSpaceClass={whiteSpaceClass}
        className={placesClassName}
        layout={view.layout}
        canQuote={view.canQuote}
        hiddenKeys={view.hiddenKeys}
        flash={view.flash}
        onOpenPassage={view.openPassage}
        onQuote={view.quote}
        active={view.active}
        locale={view.locale}
      />
    </>
  );
}
