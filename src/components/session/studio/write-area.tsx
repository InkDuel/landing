'use client';

import { useEffect, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';

import { ContextPanel } from './context-panel';
import { ManuscriptSidebar } from './manuscript-sidebar';
import { useStudio } from './studio-context';
import { StudioEditor } from './studio-editor';
import { StudioSheet } from './studio-ui';

// «Escribir»: manuscript on the left, the page in the middle (620–760 px),
// references on the right. Under 1024 px only the page stays; the index and
// the references open as sheets. Focus mode hides everything but the text and
// its save state.

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function WriteArea() {
  const studio = useStudio();
  const { overview, docId, locale } = studio;
  const copy = STUDIO_COPY[locale];
  const wide = useMediaQuery('(min-width: 1024px)');
  const xl = useMediaQuery('(min-width: 1280px)');
  const [manuscriptOpen, setManuscriptOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState<boolean | null>(null);
  const [focus, setFocus] = useState(false);
  const opened = useRef(false);

  // References start open only where there is room for them.
  const showContext = contextOpen ?? xl;

  // No document in the URL: continue where the author left off.
  useEffect(() => {
    if (docId || opened.current || overview.manuscript.length === 0) return;
    opened.current = true;
    const last = overview.manuscript.find((e) => e.id === overview.settings.lastDraftId);
    const target = last ?? overview.manuscript.find((e) => e.draft && !e.published) ?? overview.manuscript[overview.manuscript.length - 1];
    void studio.goTo('write', target.id);
  }, [docId, overview.manuscript, overview.settings.lastDraftId, studio]);

  // Focus mode: everything but the page and its save state steps aside.
  useEffect(() => {
    const root = document.documentElement;
    if (focus) root.dataset.studioFocus = '1';
    else delete root.dataset.studioFocus;
    return () => {
      delete root.dataset.studioFocus;
    };
  }, [focus]);

  const entry = docId ? overview.manuscript.find((e) => e.id === docId) : undefined;

  if (overview.manuscript.length === 0) {
    return (
      <section className="mx-auto flex max-w-[620px] flex-col items-start gap-3 py-12">
        <h2 className="font-literary text-[28px] leading-[1.15] font-bold text-primary">{copy.manuscript.emptyTitle}</h2>
        <p className="type-literary-body text-reader-muted italic">{copy.manuscript.empty}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <InkButton fullWidth={false} onClick={() => void studio.createChapter()}>
            {copy.manuscript.emptyAction}
          </InkButton>
          <InkButton variant="ghost" fullWidth={false} onClick={() => void studio.goTo('plan')}>
            {copy.manuscript.emptyPlan}
          </InkButton>
        </div>
        <p className="mt-4 type-caption text-tertiary">{copy.shell.privateNote}</p>
      </section>
    );
  }

  const sidebar = <ManuscriptSidebar onSelected={() => setManuscriptOpen(false)} />;
  const context = <ContextPanel draftId={entry?.id ?? null} onClose={() => setContextOpen(false)} />;

  return (
    <div
      className={cx(
        'grid gap-6',
        !focus && wide && (showContext && xl ? 'grid-cols-[250px_minmax(0,1fr)_300px]' : 'grid-cols-[250px_minmax(0,1fr)]'),
      )}
    >
      {!focus && wide ? <aside className="studio-chrome sticky top-4 -mx-1 max-h-[calc(100dvh-32px)] self-start overflow-y-auto px-1 pb-1">{sidebar}</aside> : null}
      <div className="ctx-reading min-w-0 rounded-card border-quiet border-divider px-3 sm:px-6">
        {entry ? (
          <StudioEditor
            entry={entry}
            focus={focus}
            onFocusChange={setFocus}
            onOpenManuscript={() => setManuscriptOpen(true)}
            onToggleContext={() => setContextOpen(!showContext)}
            contextOpen={showContext}
          />
        ) : (
          <div className="py-10">
            <InkInlineBanner tone="info" title={copy.editor.pickChapter} />
            {!wide ? (
              <InkButton variant="secondary" className="mt-3" onClick={() => setManuscriptOpen(true)}>
                {copy.manuscript.open}
              </InkButton>
            ) : null}
          </div>
        )}
      </div>
      {!focus && showContext && xl ? <aside className="studio-chrome sticky top-4 -mx-1 max-h-[calc(100dvh-32px)] self-start overflow-y-auto px-1 pb-1">{context}</aside> : null}

      {!wide ? (
        <StudioSheet open={manuscriptOpen} onClose={() => setManuscriptOpen(false)} title={copy.manuscript.title} closeLabel={copy.shell.close}>
          {sidebar}
        </StudioSheet>
      ) : null}
      {!xl ? (
        <StudioSheet open={showContext && !focus} onClose={() => setContextOpen(false)} title={copy.context.title} closeLabel={copy.shell.close}>
          <ContextPanel draftId={entry?.id ?? null} onClose={() => setContextOpen(false)} inSheet />
        </StudioSheet>
      ) : null}
    </div>
  );
}
