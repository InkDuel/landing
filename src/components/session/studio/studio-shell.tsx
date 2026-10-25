'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { ArrowUpRightIcon, ChevronLeftIcon, CloseIcon, PencilIcon } from '@/components/ink/icons';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { Kicker } from '@/components/ink/kicker';
import { ApiError } from '@/lib/session/api';
import { studioApi } from '@/lib/session/studio/api';
import type { DraftSummary, ManuscriptEntry, StudioOverview } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { StudioStore } from '@/lib/session/studio/studio-store';
import { newClientId, worksApi } from '@/lib/session/works';

import { useSessionLocale } from '../session-root';
import { TitleDialog } from '../work-manage';
import { myWorksHref, workManageHref } from '../works-parts';
import { PlanArea } from './plan-area';
import { ProgressArea } from './progress-area';
import { PublishArea } from './publish-area';
import {
  type EditorHandle,
  entryTitle,
  isStudioArea,
  STUDIO_AREAS,
  type StudioArea,
  type StudioContextValue,
  StudioProvider,
  useLatestRef,
} from './studio-context';
import { StudioToast } from './studio-ui';
import { UniverseArea } from './universe-area';
import { WriteArea } from './write-area';

/** URL of a Studio place. Areas push history (Back returns), documents replace. */
export function studioHref(workId: string, params: { area?: StudioArea; doc?: string | null; tab?: string; item?: string }) {
  const query = new URLSearchParams();
  if (params.area && params.area !== 'write') query.set('area', params.area);
  if (params.doc) query.set('doc', params.doc);
  if (params.tab) query.set('tab', params.tab);
  if (params.item) query.set('item', params.item);
  const q = query.toString();
  return `${workManageHref(workId)}${q ? `?${q}` : ''}`;
}

function mergeDraft(manuscript: ManuscriptEntry[], draft: DraftSummary): ManuscriptEntry[] {
  let found = false;
  const next = manuscript.map((entry) => {
    if (entry.id !== draft.id) return entry;
    found = true;
    return { ...entry, draft };
  });
  if (!found && !draft.deleted) {
    next.push({
      id: draft.id,
      chapterId: null,
      orderIndex: 0,
      published: false,
      chapterTitle: '',
      chapterRevision: null,
      chapterWordCount: 0,
      chapterCharCount: 0,
      seededFromDuel: false,
      draft,
      publishedChanged: false,
    });
  }
  return draft.deleted ? next.filter((e) => !(e.id === draft.id && !e.chapterId)) : next;
}

/** Cmd/Ctrl+K: jump to an area or a chapter by name. */
function CommandPalette({
  open,
  onClose,
  overview,
  onArea,
  onEntry,
}: {
  open: boolean;
  onClose: () => void;
  overview: StudioOverview;
  onArea: (area: StudioArea) => void;
  onEntry: (entry: ManuscriptEntry) => void;
}) {
  const { locale } = useSessionLocale();
  const copy = STUDIO_COPY[locale];
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const items = useMemo(() => {
    const q = fold(query.trim());
    const areas = STUDIO_AREAS.map((area) => ({ key: `area:${area}`, label: copy.areas[area], hint: copy.areas.label, run: () => onArea(area) }));
    const chapters = overview.manuscript.map((entry) => ({
      key: `doc:${entry.id}`,
      label: entryTitle(entry, { chapter: copy.manuscript.chapterLabel, untitled: copy.manuscript.untitledDraft }),
      hint: entry.chapterId ? copy.manuscript.chapterLabel(entry.orderIndex) : copy.manuscript.newDraftLabel,
      run: () => onEntry(entry),
    }));
    const all = [...areas, ...chapters];
    return q ? all.filter((item) => fold(item.label).includes(q) || fold(item.hint).includes(q)) : all;
  }, [query, overview.manuscript, copy, onArea, onEntry]);

  const choose = (index: number) => {
    const item = items[index];
    if (!item) return;
    onClose();
    item.run();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  };
  const listId = 'studio-palette-list';
  return (
    <dialog
      ref={ref}
      aria-label={copy.shell.commandPalette}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="mx-auto mt-[12vh] w-[calc(100%-32px)] max-w-[560px] rounded-modal border-brand border-outline bg-elevated p-0 text-primary ink-shadow-lift backdrop:bg-[var(--ink-overlay-scrim)]"
    >
      {open ? (
        <div className="flex flex-col">
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `palette-${active}` : undefined}
            aria-label={copy.shell.commandPlaceholder}
            placeholder={copy.shell.commandPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="min-h-14 w-full border-b border-divider bg-transparent px-5 type-body text-[17px] text-primary outline-none placeholder:text-placeholder"
          />
          <ul id={listId} role="listbox" className="m-0 max-h-[50vh] list-none overflow-y-auto p-2">
            {items.length === 0 ? <li className="px-3 py-4 type-body text-secondary">{copy.shell.commandEmpty}</li> : null}
            {items.map((item, index) => (
              <li
                key={item.key}
                id={`palette-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={cx(
                  'flex cursor-pointer items-baseline justify-between gap-3 rounded-control px-3 py-2.5',
                  index === active ? 'bg-tint-yellow' : '',
                )}
              >
                <span className="truncate type-body-strong text-primary">{item.label}</span>
                <span className="shrink-0 type-caption text-secondary">{item.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </dialog>
  );
}

export function StudioShell({ initial, uid }: { initial: StudioOverview; uid: string }) {
  const { locale } = useSessionLocale();
  const copy = STUDIO_COPY[locale];
  const router = useRouter();
  const params = useSearchParams();
  const [overview, setOverview] = useState(initial);
  const [editingTitle, setEditingTitle] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tipsHidden, setTipsHidden] = useState(initial.settings.onboardingDismissed);
  const editorRef = useRef<EditorHandle | null>(null);
  const localeRef = useLatestRef(locale);
  const [store] = useState(() => new StudioStore(initial.work.id, () => localeRef.current));
  const workId = overview.work.id;

  useEffect(() => setOverview(initial), [initial]);

  const rawArea = params.get('area');
  const area: StudioArea = isStudioArea(rawArea) ? rawArea : 'write';
  const docParam = params.get('doc');

  useEffect(() => {
    studioAnalytics.opened(workId, initial.work.originType);
  }, [workId, initial.work.originType]);

  const go = useCallback(
    async (nextArea: StudioArea, docId?: string | null, extra?: { tab?: string; item?: string }) => {
      const ed = editorRef.current;
      const leavingDoc = ed && (nextArea !== 'write' || (docId !== undefined && docId !== ed.draftId));
      if (leavingDoc && !(await ed.flush())) {
        setToast(copy.shell.cannotLeave);
        return false;
      }
      const doc = docId === undefined ? (nextArea === 'write' ? docParam : null) : docId;
      const href = studioHref(workId, { area: nextArea, doc, ...extra });
      if (nextArea === area) router.replace(href, { scroll: false });
      else router.push(href);
      return true;
    },
    [workId, area, docParam, router, copy.shell.cannotLeave],
  );

  const refresh = useCallback(async () => {
    try {
      setOverview(await studioApi.overview(workId, { locale: localeRef.current }));
    } catch {
      // The view keeps the last overview; the next action reloads.
    }
  }, [workId, localeRef]);

  const applyDraft = useCallback((draft: DraftSummary) => {
    setOverview((prev) => ({ ...prev, manuscript: mergeDraft(prev.manuscript, draft) }));
  }, []);

  const createChapter = useCallback(
    async (input?: { title?: string; body?: string; source?: 'edit' | 'import' | 'split' }, id: string = newClientId()) => {
      try {
        const { draft } = await studioApi.createDraft(workId, { draftId: id, ...input }, { locale: localeRef.current });
        applyDraft(draft);
        return draft.id;
      } catch (error) {
        setToast(
          error instanceof ApiError && error.status === 409
            ? copy.manuscript.limitReached(overview.limits.maxDrafts.toLocaleString())
            : copy.editor.openFailed,
        );
        return null;
      }
    },
    [workId, applyDraft, copy, overview.limits.maxDrafts, localeRef],
  );

  // /chapter/new (legacy route) lands here as doc=new: create once, then
  // open it under its real id.
  const newDocId = useRef<string | null>(null);
  useEffect(() => {
    if (docParam !== 'new') return;
    newDocId.current ??= newClientId();
    const id = newDocId.current;
    void createChapter(undefined, id).then((created) => {
      router.replace(studioHref(workId, { doc: created ?? undefined }), { scroll: false });
    });
  }, [docParam, createChapter, router, workId]);

  // Cmd/Ctrl+K anywhere in Studio (never a system shortcut).
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value: StudioContextValue = useMemo(
    () => ({
      workId,
      uid,
      locale,
      overview,
      limits: overview.limits,
      store,
      area,
      docId: docParam === 'new' ? null : docParam,
      goTo: (next, docId, extra) => go(next, docId, extra),
      refresh,
      applyDraft,
      registerEditor: (handle) => {
        editorRef.current = handle;
      },
      editor: () => editorRef.current,
      openEntry: (entry) => go('write', entry.id),
      createChapter: async (input) => {
        const { open = true, id: pinned, ...rest } = input ?? {};
        const id = await createChapter(rest, pinned ?? newClientId());
        if (id && open) await go('write', id);
        return id;
      },
      toast: setToast,
    }),
    [workId, uid, locale, overview, store, area, docParam, go, refresh, applyDraft, createChapter],
  );

  const work = overview.work;
  const hasTitle = work.title.trim() !== '';
  const kicker = !work.published ? copy.shell.statusDraft : work.isGalleryEligible ? copy.shell.statusInStories : copy.shell.statusPublished;

  async function saveTitle(title: string) {
    try {
      const updated = await worksApi.updateTitle(workId, title, { locale });
      setOverview((prev) => ({ ...prev, work: { ...prev.work, title: updated.title } }));
      return true;
    } catch {
      setToast(copy.shell.loadError);
      return false;
    }
  }

  async function dismissTips() {
    setTipsHidden(true);
    const s = overview.settings;
    try {
      const saved = await studioApi.saveSettings(
        workId,
        {
          expectedRevision: s.revision,
          workGoalWords: s.workGoalWords,
          dailyGoalWords: s.dailyGoalWords,
          sessionGoalWords: s.sessionGoalWords,
          streakEnabled: s.streakEnabled,
          timezone: s.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          onboardingDismissed: true,
        },
        { locale },
      );
      setOverview((prev) => ({ ...prev, settings: saved }));
    } catch {
      // Hidden for this visit; it may show again next time. Nothing is lost.
    }
  }

  return (
    <StudioProvider value={value}>
      <div className="studio-shell flex flex-col pt-1" data-area={area}>
        <header className="studio-chrome flex flex-col gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={myWorksHref()}
              className="ink-focus ink-dim -ml-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 type-button-sm text-secondary no-underline"
            >
              <ChevronLeftIcon size={20} />
              {copy.shell.breadcrumbWorks}
            </Link>
            <span aria-hidden="true" className="text-tertiary">
              /
            </span>
            <Kicker as="span" className={work.isGalleryEligible ? 'text-success' : undefined}>
              {kicker}
            </Kicker>
            {work.isGalleryEligible ? (
              <Link
                href={`/work/${encodeURIComponent(workId)}`}
                className="ink-focus ink-dim ml-auto inline-flex min-h-11 items-center gap-1 rounded-control px-2 type-button-sm text-blue no-underline"
              >
                {copy.shell.viewWork}
                <ArrowUpRightIcon size={16} />
              </Link>
            ) : null}
          </div>
          {/* The title is the edit control: click it (or its pencil) to rename. */}
          <h1 className="m-0 min-w-0">
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              aria-label={hasTitle ? `${copy.shell.editTitle}: ${work.title}` : copy.shell.addTitle}
              className="ink-focus group -mx-1 inline-flex max-w-full items-center gap-2 rounded-control px-1 text-left"
            >
              <span
                className={cx(
                  'min-w-0 font-literary text-[26px] leading-[1.15] font-bold break-words sm:text-[30px]',
                  hasTitle ? 'text-primary' : 'text-placeholder italic',
                )}
              >
                {hasTitle ? work.title : copy.shell.addTitle}
              </span>
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-tertiary group-hover:bg-sunken group-hover:text-primary"
              >
                <PencilIcon size={16} />
              </span>
            </button>
          </h1>
          <nav aria-label={copy.areas.label} className="-mx-1 flex gap-1 overflow-x-auto border-b border-divider">
            {STUDIO_AREAS.map((a) => (
              <Link
                key={a}
                href={studioHref(workId, { area: a, doc: a === 'write' ? docParam : undefined })}
                aria-current={a === area ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  void go(a, a === 'write' ? (editorRef.current?.draftId ?? docParam) : undefined);
                }}
                className={cx(
                  'ink-focus relative inline-flex min-h-11 shrink-0 items-center px-3 type-button-sm no-underline',
                  a === area ? 'text-primary' : 'text-secondary hover:text-primary',
                )}
              >
                <span className={a === area ? 'ink-highlight' : undefined}>{copy.areas[a]}</span>
                {a === area ? <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-[var(--ink-brand-ink)]" /> : null}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-keyshortcuts="Meta+K Control+K"
              className="ink-focus ink-dim ml-auto hidden min-h-11 shrink-0 items-center gap-2 rounded-control px-3 type-caption text-secondary sm:inline-flex"
            >
              {copy.shell.commandPalette}
              <kbd className="rounded-chip border-quiet border-default px-1.5 font-ui text-[11px]">⌘K</kbd>
            </button>
          </nav>
        </header>

        {work.moderationState !== 'active' ? (
          <InkInlineBanner tone="notice" className="mb-4" title={copy.shell.hiddenTitle} detail={copy.shell.hiddenBody} />
        ) : null}
        {!tipsHidden && area === 'write' ? (
          <aside aria-label={copy.shell.tipsTitle} className="studio-chrome mb-4 flex items-start gap-3 rounded-card border-quiet border-divider bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="type-body-strong text-[15px] text-primary">{copy.shell.tipsTitle}</p>
              <ol className="m-0 mt-1 flex list-decimal flex-col gap-1 pl-5 type-body-sm text-secondary">
                {copy.shell.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ol>
            </div>
            <button
              type="button"
              aria-label={copy.shell.tipsDismiss}
              onClick={() => void dismissTips()}
              className="ink-focus ink-dim inline-flex size-11 shrink-0 items-center justify-center rounded-control"
            >
              <CloseIcon size={20} />
            </button>
          </aside>
        ) : null}

        <div id="studio-area" className="min-w-0">
          {area === 'write' ? <WriteArea /> : null}
          {area === 'plan' ? <PlanArea /> : null}
          {area === 'universe' ? <UniverseArea /> : null}
          {area === 'progress' ? <ProgressArea /> : null}
          {area === 'publish' ? <PublishArea /> : null}
        </div>

        <TitleDialog open={editingTitle} initial={work.title} onClose={() => setEditingTitle(false)} onSave={saveTitle} />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          overview={overview}
          onArea={(a) => void go(a)}
          onEntry={(entry) => void go('write', entry.id)}
        />
        <StudioToast message={toast} onDone={() => setToast(null)} />
      </div>
    </StudioProvider>
  );
}
