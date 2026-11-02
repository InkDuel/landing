'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import type { Locale } from '@/lib/i18n';
import { MARKS_COPY } from '@/lib/session/marks-copy';
import {
  LINE_ATTRIBUTE,
  type PassageLayout,
  type PassageLine,
  type PassageSource,
  type SelectionResult,
  dismissPassageHint,
  markPassageQuoted,
  quoteRange,
  readPassageHints,
  resolveSelection,
} from '@/lib/session/passages';

// Marca con cita, the reading side (spec §3.3, §6.2). When the chapter has
// places (see buildPassageLayout) the text is drawn one element per line with
// the SAME typography as StoryText; otherwise the reader keeps drawing
// StoryText untouched.

const FLASH_MS = 2200;
const LINE_HEIGHT = 30;

// ---- the brief highlight ----

type Flash = { line: number; quote: string | null };

/** Which line is highlighted for a moment, and how to bring one into view. */
export function usePassageFlash(layout: PassageLayout | null) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((line: number, quote: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    setFlash({ line, quote });
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  /** The gota: the whole paragraph, briefly. */
  const flashParagraph = useCallback(
    (key: string) => {
      const line = layout?.lines.find((item) => item.key === key && item.markable);
      if (line) show(line.index, null);
    },
    [layout, show],
  );

  /** A quote in the conversation: scroll to its paragraph and mark that quote. */
  const jumpTo = useCallback(
    (key: string, quote: string | null) => {
      const line = layout?.lines.find((item) => item.key === key && item.markable);
      if (!line) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(`passage-line-${line.index}`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      show(line.index, quote);
    },
    [layout, show],
  );

  return { flash, flashParagraph, jumpTo };
}

// ---- the one-time hint ----

/** Per account in this browser; hidden until storage has been read. */
export function usePassageHints(uid: string) {
  const [hints, setHints] = useState({ dismissed: true, quoted: true });
  useEffect(() => {
    setHints(readPassageHints(uid));
  }, [uid]);
  const dismiss = useCallback(() => {
    dismissPassageHint(uid);
    setHints((current) => ({ ...current, dismissed: true }));
  }, [uid]);
  const markQuoted = useCallback(() => {
    markPassageQuoted(uid);
    setHints({ dismissed: true, quoted: true });
  }, [uid]);
  return { hints, dismiss, markQuoted };
}

/** «Selecciona una frase…» under the header: once, closable. */
export function PassageHintStrip({ onDismiss, locale }: { onDismiss: () => void; locale: Locale }) {
  const copy = MARKS_COPY[locale].passage;
  return (
    <div className="mb-5 flex items-start gap-2 rounded-control bg-sunken py-1 pr-1 pl-3">
      <p className="min-w-0 flex-1 self-center py-1.5 type-caption text-[13px] text-secondary">{copy.hint}</p>
      <button
        type="button"
        aria-label={copy.hintDismiss}
        onClick={onDismiss}
        className="ink-focus ink-dim flex size-11 shrink-0 items-center justify-center rounded-control text-secondary"
      >
        <span aria-hidden="true" className="text-[20px] leading-none">
          ×
        </span>
      </button>
    </div>
  );
}

// ---- the text ----

type Picked = Extract<SelectionResult, { kind: 'ok' }> & { source: PassageSource };

function DropIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M6 0.5C6 0.5 0.5 6.4 0.5 10a5.5 5.5 0 0 0 11 0C11.5 6.4 6 0.5 6 0.5Z" />
    </svg>
  );
}

function LineText({ line, flash }: { line: PassageLine; flash: Flash | null }) {
  const own = flash?.line === line.index ? flash : null;
  const span = own ? quoteRange(line.text, own.quote) : null;
  if (!own || !span) return <>{line.text}</>;
  return (
    <>
      {line.text.slice(0, span.start)}
      <mark className="rounded-sm bg-tint-yellow text-inherit">{line.text.slice(span.start, span.end)}</mark>
      {line.text.slice(span.end)}
    </>
  );
}

/**
 * The chapter, one element per line. Marks the drop of every paragraph with a
 * visible thread (also for the author and readers who cannot mark), and — only
 * with [canQuote] — offers the quote: a floating «Dejar una Marca» over a
 * selection inside ONE paragraph, and a margin button per paragraph.
 */
export function PassageStoryText({
  layout,
  canQuote,
  hiddenKeys,
  flash,
  onOpenPassage,
  onQuote,
  locale,
}: {
  layout: PassageLayout;
  canQuote: boolean;
  hiddenKeys: string[];
  flash: Flash | null;
  onOpenPassage: (key: string) => void;
  onQuote: (selection: { key: string; quote: string; source: PassageSource }) => void;
  locale: Locale;
}) {
  const copy = MARKS_COPY[locale].passage;
  const root = useRef<HTMLDivElement>(null);
  const [pickedState, setPicked] = useState<Picked | null>(null);
  const [limitShown, setLimitShown] = useState(false);
  // Who started the selection: a margin button says so, the mouse does not.
  const origin = useRef<PassageSource>('selection');
  // A tap on the floating button may clear the selection first on touch.
  const holdUntil = useRef(0);

  useEffect(() => {
    if (!canQuote) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const result = resolveSelection(range, root.current, layout);
      if (result.kind === 'ok') {
        setPicked((previous) => {
          if (previous && previous.key !== result.key) setLimitShown(false);
          return { ...result, source: origin.current };
        });
        return;
      }
      if (Date.now() < holdUntil.current) return;
      origin.current = 'selection';
      setPicked(null);
      setLimitShown(false);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    document.addEventListener('selectionchange', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [canQuote, layout]);

  /** The margin button: the whole paragraph, ready to narrow with the mouse. */
  function selectParagraph(line: PassageLine, event: React.MouseEvent) {
    const element = document.getElementById(`passage-line-${line.index}`);
    const selection = window.getSelection();
    if (!element || !selection) return;
    // detail 0 is a keyboard or assistive-technology activation.
    origin.current = event.detail === 0 ? 'a11y' : 'margin';
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function leaveMark() {
    if (!picked) return;
    if (picked.tooLong) {
      setLimitShown(true);
      return;
    }
    onQuote({ key: picked.key, quote: picked.quote, source: picked.source });
    setPicked(null);
    setLimitShown(false);
  }

  const picked = canQuote ? pickedState : null;
  const showLimit = !!picked?.tooLong && (limitShown || picked.source !== 'selection');
  const hidden = new Set(hiddenKeys);

  return (
    <>
      <div ref={root} className="type-literary-body text-content whitespace-pre-line break-words">
        {layout.lines.map((line) => {
          if (line.key === null) return <div key={line.index} aria-hidden="true" style={{ minHeight: LINE_HEIGHT }} />;
          const flashed = flash?.line === line.index && !quoteRange(line.text, flash.quote);
          return (
            <div key={line.index} className="group relative">
              <p
                id={`passage-line-${line.index}`}
                {...{ [LINE_ATTRIBUTE]: line.index }}
                className={cx('rounded-sm', flashed && 'bg-tint-yellow')}
              >
                <LineText line={line} flash={flash} />
              </p>
              {line.marked && !hidden.has(line.key) ? (
                <button
                  type="button"
                  aria-label={copy.threadTitle}
                  onClick={() => onOpenPassage(line.key as string)}
                  className="ink-focus ink-dim absolute top-0 -right-5 flex w-5 items-center justify-center rounded-control text-reader-muted select-none"
                  style={{ height: LINE_HEIGHT }}
                >
                  <DropIcon />
                </button>
              ) : null}
              {canQuote && line.markable ? (
                <button
                  type="button"
                  aria-label={copy.a11yAction}
                  onClick={(event) => selectParagraph(line, event)}
                  className={cx(
                    'ink-focus absolute top-0 -left-5 flex w-5 items-center justify-center rounded-control text-[14px] text-reader-muted select-none',
                    'opacity-0 focus-visible:opacity-100 group-hover:opacity-70 hover:opacity-100',
                    '[@media(hover:none)]:pointer-events-none [@media(hover:none)]:focus-visible:pointer-events-auto',
                  )}
                  style={{ height: LINE_HEIGHT }}
                >
                  <span aria-hidden="true">✎</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {canQuote && picked ? <SelectionBar
          picked={picked}
          showLimit={showLimit}
          onLeave={leaveMark}
          onHold={() => {
            holdUntil.current = Date.now() + 800;
          }}
          locale={locale}
        /> : null}
    </>
  );
}

const BAR_WIDTH = 170;

/** The floating «Dejar una Marca» over the selection (fixed, follows scroll). */
function SelectionBar({
  picked,
  showLimit,
  onLeave,
  onHold,
  locale,
}: {
  picked: Picked;
  showLimit: boolean;
  onLeave: () => void;
  onHold: () => void;
  locale: Locale;
}) {
  const copy = MARKS_COPY[locale].passage;
  const { rect } = picked;
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - BAR_WIDTH / 2, window.innerWidth - BAR_WIDTH - 8));
  const below = rect.bottom + 14;
  const top = below + 56 > window.innerHeight ? Math.max(8, rect.top - 60) : below;
  return (
    <div className="fixed z-30 flex flex-col items-start gap-1" style={{ left, top, width: showLimit ? Math.max(BAR_WIDTH, 220) : undefined }}>
      <button
        type="button"
        // Keep the selection alive while the button is pressed.
        onMouseDown={(event) => event.preventDefault()}
        onPointerDown={onHold}
        onClick={onLeave}
        className="ink-focus ink-press min-h-11 rounded-button border-brand border-outline bg-yellow px-4 type-button-sm text-[14px] text-on-accent ink-shadow-button"
      >
        {copy.menuAction}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={cx('rounded-control bg-elevated px-2 py-1 type-caption text-[12.5px] text-danger', !showLimit && 'sr-only')}
      >
        {showLimit ? copy.quoteTooLong : ''}
      </p>
    </div>
  );
}
