'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { cx } from '@/components/ink/cx';
import { FocusIcon, HistoryIcon, NoteIcon, SearchIcon, SidebarIcon, SlidersIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkChip } from '@/components/ink/ink-chip';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { INTL_LOCALE } from '@/lib/i18n';
import { ApiError, isTransient } from '@/lib/session/api';
import { ChapterAutosave, type ChapterEditorState, hasUnsavedWork, isDirty } from '@/lib/session/chapter-autosave';
import { conflictData, draftConflict, studioApi } from '@/lib/session/studio/api';
import {
  getRecovery,
  putRecovery,
  type RecoveryRecord,
  recoveryEnabled,
  removeRecovery,
  setRecoveryEnabled,
} from '@/lib/session/studio/local-recovery';
import { DRAFT_STATUSES, type Draft, type DraftStatus, type ManuscriptEntry } from '@/lib/session/studio/models';
import { useEditorPrefs } from '@/lib/session/studio/preferences';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { DraftTabLock, type LockState } from '@/lib/session/studio/tab-lock';
import { countChars, countWords, readingMinutes } from '@/lib/session/studio/words';
import { worksApi } from '@/lib/session/works';

import { useLeaveGuard } from '../chapter-editor';
import { CompareView, editorTextStyle, FindBar, PrefsSheet, SaveStatus, saveView, StudioMenu, ToolbarDivider } from './editor-parts';
import { entryTitle, useLatestRef, useStudio } from './studio-context';
import { StudioConfirm, StudioIconButton, StudioSheet } from './studio-ui';
import { VersionsSheet } from './versions-sheet';

// The Studio editor: plain text by design (P0, DECISIONS D3) — the public
// reader and old app builds consume plain text, so there is no bold or italic
// that could be lost on publish. One autosave engine (chapter-autosave.ts) with
// draft limits, OCC and coalescing; an emergency copy on this device; one
// editing tab per draft; explicit, never blind, conflict resolution.

function useEngineState(engine: ChapterAutosave): ChapterEditorState {
  return useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Loaded = { draft: Draft; generation: number; recovery: RecoveryRecord | null };

export function StudioEditor({
  entry,
  focus,
  onFocusChange,
  onOpenManuscript,
  onToggleContext,
  contextOpen,
}: {
  entry: ManuscriptEntry;
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
  onOpenManuscript: () => void;
  onToggleContext: () => void;
  contextOpen: boolean;
}) {
  const studio = useStudio();
  const { workId, uid, locale } = studio;
  const copy = STUDIO_COPY[locale];
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const localeRef = useLatestRef(locale);
  const entryRef = useLatestRef(entry);

  // Open: the draft of an existing chapter is created (seeded by the server)
  // the first time; then the draft and any local copy are read.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const current = entryRef.current;
        if (!current.draft && current.chapterId) {
          const { draft } = await studioApi.createDraft(workId, { draftId: current.id, chapterId: current.chapterId }, { locale: localeRef.current });
          if (!cancelled) studio.applyDraft(draft);
        }
        const draft = await studioApi.draft(workId, current.id, { locale: localeRef.current });
        const recovery = await getRecovery(uid, workId, draft.id);
        if (cancelled) return;
        setLoaded((prev) => ({ draft, recovery, generation: (prev?.generation ?? 0) + 1 }));
        setStatus('ready');
        void studioApi.rememberDocument(workId, draft.id, { locale: localeRef.current }).catch(() => {});
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // The manuscript entry object changes after every save; only its id opens a document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId, uid, entry.id, attempt]);

  // Only ever show the document the entry names: after switching chapters a
  // failed load must not leave the previous draft on screen under the new
  // chapter's label (its actions would hit the wrong document).
  if (status !== 'ready' || !loaded || loaded.draft.id !== entry.id) {
    return status === 'error' ? (
      <InkInlineBanner
        className="mt-4"
        title={copy.editor.openFailed}
        action={<InkTextAction onClick={() => setAttempt((n) => n + 1)}>{copy.shell.retry}</InkTextAction>}
      />
    ) : (
      <InkSkeleton className="mt-4" lines={6} height="h-6" label={copy.shell.loading} />
    );
  }
  return (
    <EditorSession
      key={`${loaded.draft.id}:${loaded.generation}`}
      loaded={loaded}
      entry={entry}
      focus={focus}
      onFocusChange={onFocusChange}
      onOpenManuscript={onOpenManuscript}
      onToggleContext={onToggleContext}
      contextOpen={contextOpen}
      onReload={() => setAttempt((n) => n + 1)}
    />
  );
}

type SessionProps = {
  loaded: Loaded;
  entry: ManuscriptEntry;
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
  onOpenManuscript: () => void;
  onToggleContext: () => void;
  contextOpen: boolean;
  onReload: () => void;
};

/**
 * Owns the autosave engine of one opened draft. It is created in an effect,
 * like the legacy editor's, so a remount (StrictMode, navigation) disposes
 * one engine and builds a fresh one instead of reusing a disposed engine.
 */
function EditorSession(props: SessionProps) {
  const { loaded, entry } = props;
  const studio = useStudio();
  const { workId, locale, limits } = studio;
  const { draft } = loaded;
  const localeRef = useLatestRef(locale);
  const publishedRef = useLatestRef(entry.published);
  const studioRef = useLatestRef(studio);
  const [engine, setEngine] = useState<ChapterAutosave | null>(null);

  useEffect(() => {
    let firstSaveTracked = draft.revision > 0 || draft.body.trim() !== '';
    const created = new ChapterAutosave(
      {
        workId,
        chapterId: draft.id,
        isNew: false,
        orderIndex: entry.orderIndex,
        published: publishedRef.current,
        localContent: draft.body,
        localTitle: draft.title,
        savedContent: draft.body,
        savedTitle: draft.title,
        savedRevision: draft.revision,
        status: 'saved',
        invalid: null,
        conflict: null,
      },
      {
        add: () => Promise.reject(new Error('Studio drafts exist before they are edited')),
        patch: async (content, title, expectedRevision, keepalive) => {
          try {
            const saved = await studioApi.saveDraft(workId, draft.id, { expectedRevision, title, body: content }, { locale: localeRef.current, keepalive });
            studioRef.current.applyDraft(saved);
            if (!firstSaveTracked && content.trim() !== '') {
              firstSaveTracked = true;
              studioAnalytics.firstTextSaved(workId, entry.chapterId);
            }
            return { revision: saved.revision, orderIndex: 0, published: publishedRef.current };
          } catch (error) {
            if (draftConflict(error)) studioAnalytics.conflict(workId, 'draft_revision');
            else if (!isTransient(error)) studioAnalytics.saveFailed(workId, error);
            throw error;
          }
        },
        remove: () => Promise.resolve(),
        readConflict: (error) => {
          const c = draftConflict(error);
          return c ? { revision: c.revision, content: c.body, title: c.title } : null;
        },
        isTransient,
      },
      undefined,
      undefined,
      { maxContent: limits.draftBody, maxTitle: limits.title, allowEmpty: true },
    );
    setEngine(created);
    return () => {
      // Leaving without the guard (the page itself goes away): best effort.
      if (isDirty(created.getState())) created.flushBestEffort();
      created.dispose();
    };
    // One engine per opened draft revision (the parent keys this component).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!engine) return <InkSkeleton className="mt-4" lines={6} height="h-6" label={STUDIO_COPY[locale].shell.loading} />;
  // Effects of the surface depend on [engine]: a new engine re-binds them.
  return <EditorSurface {...props} engine={engine} />;
}

function EditorSurface({
  loaded,
  entry,
  focus,
  onFocusChange,
  onOpenManuscript,
  onToggleContext,
  contextOpen,
  onReload,
  engine,
}: SessionProps & { engine: ChapterAutosave }) {
  const studio = useStudio();
  const { workId, uid, locale, limits } = studio;
  const copy = STUDIO_COPY[locale];
  const fmt = useCallback((n: number) => n.toLocaleString(INTL_LOCALE[locale]), [locale]);
  const { draft } = loaded;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [openedAt] = useState(() => Date.now());
  // Words written in this sitting: only persisted edits count. A version
  // adopted from the server (restore, discard, import, split) moves the
  // baseline instead of counting as writing.
  const [sessionBase, setSessionBase] = useState(draft.wordCount);
  const adoptVersion = useCallback(
    (snapshot: { revision: number; title: string; content: string }) => {
      const before = countWords(engine.getState().savedContent);
      engine.adopt(snapshot);
      setSessionBase((b) => b + countWords(snapshot.content) - before);
    },
    [engine],
  );

  const state = useEngineState(engine);
  useLeaveGuard(engine);
  const studioRef = useLatestRef(studio);

  // ---- one editing tab per draft ----
  const [lockState, setLockState] = useState<LockState>('pending');
  const [lostLock, setLostLock] = useState(false);
  const [taking, setTaking] = useState(false);
  const lockRef = useRef<DraftTabLock | null>(null);
  useEffect(() => {
    let active = true;
    const lock = new DraftTabLock(
      `inkduel-studio:${uid}:${workId}:${draft.id}`,
      () => {
        if (!active) return;
        setLockState('readonly');
        setLostLock(true);
      },
      () => engine.flush(),
    );
    lockRef.current = lock;
    void lock.acquire().then((next) => {
      if (active) setLockState(next);
    });
    return () => {
      active = false;
      lock.dispose();
    };
  }, [uid, workId, draft.id, engine]);
  const readOnly = lockState === 'readonly' || lockState === 'pending';
  const readOnlyRef = useLatestRef(readOnly);

  async function takeOver() {
    if (taking) return;
    // Never trade this tab's unsynced text for the other tab's: keep it as a
    // copy first, then let it go from here.
    const s = engine.getState();
    if (hasUnsavedWork(s)) {
      const id = await saveLocalAsCopy(s.localTitle, s.localContent);
      if (!id) return;
      engine.adopt({ revision: s.savedRevision, title: s.savedTitle, content: s.savedContent });
      studio.toast(copy.conflict.copySaved);
    }
    setTaking(true);
    const result = await lockRef.current?.takeOver();
    setTaking(false);
    if (result?.state === 'owner') {
      if (!result.otherSynced) studio.toast(copy.lock.otherUnsynced);
      onReload();
    }
  }

  // ---- emergency local copy (only of text the server has not confirmed) ----
  const [recoveryOn, setRecoveryOn] = useState(() => recoveryEnabled(uid));
  const [recoveryAvailable] = useState(() => typeof indexedDB !== 'undefined');
  const [localCopied, setLocalCopied] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoveryRecord | null>(() => {
    const r = loaded.recovery;
    if (!r) return null;
    if (r.body === draft.body && r.title === draft.title) {
      void removeRecovery(uid, workId, draft.id);
      return null;
    }
    return r;
  });
  // While an older copy waits for the author's decision it is never
  // overwritten or deleted by the copy of what is typed now.
  const recoveryPending = recovery !== null;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sync = () => {
      const s = engine.getState();
      if (timer) clearTimeout(timer);
      if (recoveryPending) return;
      if (!isDirty(s)) {
        if (s.status === 'saved') {
          setLocalCopied(null);
          void removeRecovery(uid, workId, draft.id);
        }
        return;
      }
      if (!recoveryOn) return;
      timer = setTimeout(() => {
        const now = engine.getState();
        void putRecovery({ uid, workId, draftId: draft.id, baseRevision: now.savedRevision, title: now.localTitle, body: now.localContent }).then(
          (ok) => setLocalCopied(ok ? now.localContent + '\u0000' + now.localTitle : null),
        );
      }, 600);
    };
    const unsubscribe = engine.subscribe(sync);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [engine, uid, workId, draft.id, recoveryOn, recoveryPending]);
  const copiedNow = localCopied === state.localContent + '\u0000' + state.localTitle;

  // ---- synopsis and status (their own revision, saved one at a time) ----
  const [synopsisOpen, setSynopsisOpen] = useState(draft.synopsis !== '');
  const [synopsis, setSynopsis] = useState(draft.synopsis);
  const synopsisRef = useLatestRef(synopsis);
  const metaRef = useRef({ synopsis: draft.synopsis, status: draft.status, metaRevision: draft.metaRevision });
  const [meta, setMeta] = useState(metaRef.current);
  const [metaSaving, setMetaSaving] = useState(false);
  const metaQueue = useRef<Promise<unknown>>(Promise.resolve());

  function saveMeta(next: { synopsis?: string; status?: DraftStatus }): Promise<boolean> {
    const run = metaQueue.current.then(async () => {
      const before = metaRef.current;
      setMeta({ ...before, ...next });
      setMetaSaving(true);
      try {
        const saved = await studioApi.saveDraftMeta(workId, draft.id, { expectedMetaRevision: before.metaRevision, ...next }, { locale: studioRef.current.locale });
        metaRef.current = { synopsis: saved.synopsis, status: saved.status, metaRevision: saved.metaRevision };
        setMeta(metaRef.current);
        studioRef.current.applyDraft(saved);
        return true;
      } catch (error) {
        // A 409 carries the current values: adopt them so later saves work.
        const data = conflictData(error);
        if (data?.code === 'meta_conflict') {
          metaRef.current = {
            synopsis: typeof data.currentSynopsis === 'string' ? data.currentSynopsis : before.synopsis,
            status: (DRAFT_STATUSES as readonly string[]).includes(String(data.currentStatus)) ? (data.currentStatus as DraftStatus) : before.status,
            metaRevision: typeof data.currentMetaRevision === 'number' ? data.currentMetaRevision : before.metaRevision,
          };
        }
        setMeta(metaRef.current);
        studioRef.current.toast(STUDIO_COPY[studioRef.current.locale].editor.metaFailed);
        return false;
      } finally {
        setMetaSaving(false);
      }
    });
    metaQueue.current = run.catch(() => undefined);
    return run;
  }

  /** The synopsis is part of «everything saved» for navigation and publish. */
  function flushSynopsis(): Promise<boolean> {
    return synopsisRef.current !== metaRef.current.synopsis ? saveMeta({ synopsis: synopsisRef.current }) : Promise.resolve(true);
  }

  // ---- register for area navigation; session analytics ----
  const sessionBaseRef = useLatestRef(sessionBase);
  useEffect(() => {
    studio.registerEditor({
      draftId: draft.id,
      flush: async () => (await engine.flush()) && (await flushSynopsis()),
      hasUnsaved: () => hasUnsavedWork(engine.getState()) || synopsisRef.current !== metaRef.current.synopsis,
      localText: () => {
        const s = engine.getState();
        return { title: s.localTitle, body: s.localContent, revision: s.savedRevision };
      },
      adopt: adoptVersion,
      readOnly: () => readOnlyRef.current,
    });
    studioAnalytics.editorOpened(workId, entry.chapterId ? 'chapter' : 'draft', draft.revision === 0 && draft.body === '');
    const started = openedAt;
    return () => {
      studio.registerEditor(null);
      const s = engine.getState();
      const added = countWords(s.savedContent) - sessionBaseRef.current;
      if (Date.now() - started > 60_000 || added > 0) studioAnalytics.sessionCompleted(workId, Date.now() - started, Math.max(0, added));
    };
    // Registered once per editor session; everything it reads goes through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // ---- prefs, panels, dialogs ----
  const [prefs, setPrefs] = useEditorPrefs(uid);
  const [findOpen, setFindOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [compare, setCompare] = useState<null | { kind: 'conflict' | 'outside'; text: string }>(null);
  const [confirm, setConfirm] = useState<null | 'keepMine' | 'useServer' | 'discard' | 'takeOutside' | 'trash' | 'split'>(null);
  const [busy, setBusy] = useState(false);
  const splitAt = useRef<number | null>(null);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void engine.flush().then((clean) => clean && studio.toast(copy.save.savedNow));
      } else if (mod && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindOpen(true);
      } else if (mod && event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        onFocusChange(!focus);
      } else if (event.key === 'Escape' && focus && !document.querySelector('dialog[open]')) {
        onFocusChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, focus, onFocusChange, studio, copy.save.savedNow]);

  // Cursor in the text on open (two interactions from a Work to writing).
  useEffect(() => {
    if (lockState !== 'owner' && lockState !== 'unsupported') return;
    const el = textareaRef.current;
    if (!el || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    el.focus({ preventScroll: true });
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [lockState]);

  // ---- counters (deferred so typing never waits for them) ----
  const deferredBody = useDeferredValue(state.localContent);
  const words = useMemo(() => countWords(deferredBody), [deferredBody]);
  const chars = useMemo(() => countChars(deferredBody), [deferredBody]);
  const savedWords = useMemo(() => countWords(state.savedContent), [state.savedContent]);
  const sessionWords = Math.max(0, savedWords - sessionBase);
  const sessionGoal = studio.overview.settings.sessionGoalWords;
  const overPublish = chars > limits.publishBody;

  const view = saveView(state, copiedNow, copy.save);
  const label = entry.chapterId ? copy.manuscript.chapterLabel(entry.orderIndex) : copy.manuscript.newDraftLabel;
  const linkedUnpublishedExists = Boolean(entry.chapterId) && !entry.published;
  const pending = studio.overview.manuscript.find((e) => e.id === entry.id)?.draft?.pendingChanges ?? false;

  async function saveLocalAsCopy(title: string, body: string) {
    setBusy(true);
    const id = await studio.createChapter({ title: copy.conflict.copyTitle(title), body, open: false });
    setBusy(false);
    return id;
  }

  async function runDiscard() {
    setBusy(true);
    try {
      if (!(await engine.flush()) && engine.getState().status !== 'conflict') return;
      const next = await studioApi.discardDraft(workId, draft.id, engine.getState().savedRevision, { locale });
      adoptVersion({ revision: next.revision, title: next.title, content: next.body });
      studio.applyDraft(next);
      await studio.refresh();
      setConfirm(null);
    } catch {
      studio.toast(copy.editor.openFailed);
    } finally {
      setBusy(false);
    }
  }

  async function runTrash() {
    setBusy(true);
    try {
      if (!(await engine.flush())) {
        studio.toast(copy.shell.cannotLeave);
        return;
      }
      if (linkedUnpublishedExists && entry.chapterId) {
        try {
          await worksApi.deleteChapter(workId, entry.chapterId, { locale });
        } catch (error) {
          // Already gone (an earlier attempt): continue with the draft.
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
      const trashed = await studioApi.trashDraft(workId, draft.id, { locale });
      void removeRecovery(uid, workId, draft.id);
      studio.registerEditor(null);
      studio.applyDraft(trashed);
      await studio.refresh();
      setConfirm(null);
      const next = studio.overview.manuscript.find((e) => e.id !== draft.id);
      await studio.goTo('write', next?.id ?? null);
    } catch {
      studio.toast(copy.trash.error);
    } finally {
      setBusy(false);
    }
  }

  async function runSplit() {
    const at = splitAt.current;
    if (at === null) return;
    setBusy(true);
    try {
      // Over the draft limit nothing can be saved, which is exactly when the
      // split is needed: then it splits the local text without a flush first.
      if (engine.getState().status !== 'invalid' && !(await engine.flush())) {
        studio.toast(copy.shell.cannotLeave);
        return;
      }
      const s = engine.getState();
      const head = s.localContent.slice(0, at).replace(/\s+$/, '');
      const tail = s.localContent.slice(at).replace(/^\s+/, '');
      if (!tail) return;
      if (countChars(head) > limits.draftBody || countChars(tail) > limits.draftBody) {
        studio.toast(copy.editor.tooLong(fmt(limits.draftBody)));
        return;
      }
      // Tail first: if the second step fails the text exists twice, never zero times.
      const newId = await studio.createChapter({ title: '', body: tail, source: 'split', open: false });
      if (!newId) return;
      const saved = await studioApi.saveDraft(workId, draft.id, { expectedRevision: s.savedRevision, title: s.localTitle, body: head, source: 'split' }, { locale });
      adoptVersion({ revision: saved.revision, title: s.localTitle, content: head });
      studio.applyDraft(saved);
      studio.toast(copy.editor.splitDone);
      setConfirm(null);
    } catch {
      studio.toast(copy.save.failed);
    } finally {
      setBusy(false);
    }
  }

  async function openOutsideCompare() {
    if (!entry.chapterId) return;
    try {
      const chapter = await worksApi.chapter(workId, entry.chapterId, { locale });
      setCompare({ kind: 'outside', text: chapter.content });
    } catch {
      studio.toast(copy.editor.openFailed);
    }
  }

  const textStyle = editorTextStyle(prefs);
  const recoveryWhen = recovery
    ? new Date(recovery.savedAt).toLocaleString(INTL_LOCALE[locale], { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <article aria-label={entryTitle(entry, { chapter: copy.manuscript.chapterLabel, untitled: copy.manuscript.untitledDraft })} className="flex min-w-0 flex-col">
      {/* Toolbar: where I am, whether it is saved, the tools. */}
      <div className="sticky top-0 z-20 -mx-2 flex min-h-12 flex-wrap items-center gap-x-1 gap-y-1 border-b border-divider bg-page px-2 py-1">
        {!focus ? (
          <StudioIconButton label={copy.manuscript.open} onClick={onOpenManuscript} className="lg:hidden">
            <SidebarIcon size={20} />
          </StudioIconButton>
        ) : null}
        <div className="flex min-w-0 basis-[calc(100%-52px)] flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 sm:flex-1 sm:basis-auto">
          <span className="type-caption text-secondary">{label}</span>
          {entry.published ? (
            <InkChip tone={pending ? 'draw' : 'success'}>{pending ? copy.manuscript.publishedPending : copy.manuscript.published}</InkChip>
          ) : null}
          {readOnly ? <InkChip tone="outline">{copy.editor.readOnly}</InkChip> : null}
          <SaveStatus view={view} />
        </div>
        <StudioIconButton label={copy.editor.find} aria-keyshortcuts="Meta+Shift+F Control+Shift+F" pressed={findOpen} onClick={() => setFindOpen((v) => !v)}>
          <SearchIcon size={20} />
        </StudioIconButton>
        {!focus ? (
          <>
            <StudioIconButton label={copy.editor.versions} onClick={() => setVersionsOpen(true)}>
              <HistoryIcon size={20} />
            </StudioIconButton>
            <StudioIconButton label={copy.editor.notes} pressed={contextOpen} onClick={onToggleContext}>
              <NoteIcon size={20} />
            </StudioIconButton>
          </>
        ) : null}
        <StudioIconButton label={copy.editor.settings} onClick={() => setPrefsOpen(true)}>
          <SlidersIcon size={20} />
        </StudioIconButton>
        <StudioIconButton label={focus ? copy.editor.exitFocus : copy.editor.focus} aria-keyshortcuts="Meta+Shift+Enter Control+Shift+Enter" pressed={focus} onClick={() => onFocusChange(!focus)}>
          <FocusIcon size={20} />
        </StudioIconButton>
        {!focus ? (
          <>
            <ToolbarDivider />
            <StudioMenu
              label={copy.editor.menu}
              items={[
                { key: 'publish', label: copy.editor.publishThis, onSelect: () => void studio.goTo('publish', draft.id) },
                {
                  key: 'split',
                  label: copy.editor.splitAtCursor,
                  hidden: readOnly,
                  onSelect: () => {
                    splitAt.current = textareaRef.current?.selectionStart ?? null;
                    if (splitAt.current !== null && splitAt.current < state.localContent.length) setConfirm('split');
                  },
                },
                { key: 'discard', label: copy.editor.discard, hidden: readOnly || !entry.published || !pending, onSelect: () => setConfirm('discard') },
                {
                  key: 'trash',
                  label: copy.editor.trashDraft,
                  danger: true,
                  hidden: readOnly || entry.published,
                  onSelect: () => setConfirm('trash'),
                },
              ]}
            />
            <span className="hidden sm:inline-flex">
              <InkButton variant="link" fullWidth={false} onClick={() => void studio.goTo('publish', draft.id)}>
                {copy.editor.publishThis}
              </InkButton>
            </span>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pt-3">
        {lockState === 'readonly' ? (
          <InkInlineBanner
            tone="notice"
            title={lostLock ? copy.lock.taken : copy.lock.title}
            detail={
              lostLock && hasUnsavedWork(state) ? copy.lock.unsyncedHere : lostLock ? undefined : copy.lock.body
            }
            action={
              <div className="flex flex-wrap gap-x-4">
                {lostLock && hasUnsavedWork(state) ? (
                  <InkTextAction onClick={() => downloadText(`InkDuel-copia-${draft.id.slice(0, 8)}.txt`, `${state.localTitle}\n\n${state.localContent}`)}>
                    {copy.save.exportCopy}
                  </InkTextAction>
                ) : null}
                <InkTextAction onClick={() => void takeOver()}>{taking ? copy.lock.taking : copy.lock.takeOver}</InkTextAction>
              </div>
            }
          />
        ) : null}

        {recovery && !readOnly ? (
          <InkInlineBanner
            tone="notice"
            title={copy.recovery.title(recoveryWhen)}
            detail={recovery.baseRevision === state.savedRevision ? copy.recovery.body : copy.recovery.conflictBody}
            action={
              <div className="flex flex-wrap gap-x-4">
                {recovery.baseRevision === state.savedRevision && !isDirty(state) ? (
                  <InkTextAction
                    onClick={() => {
                      engine.setTitle(recovery.title);
                      engine.setContent(recovery.body);
                      setRecovery(null);
                    }}
                  >
                    {copy.recovery.restore}
                  </InkTextAction>
                ) : (
                  <InkTextAction
                    onClick={async () => {
                      const id = await saveLocalAsCopy(recovery.title, recovery.body);
                      if (id) {
                        await removeRecovery(uid, workId, draft.id);
                        setRecovery(null);
                        studio.toast(copy.conflict.copySaved);
                      }
                    }}
                  >
                    {copy.recovery.saveAsCopy}
                  </InkTextAction>
                )}
                <InkTextAction onClick={() => downloadText(`InkDuel-recuperado-${draft.id.slice(0, 8)}.txt`, `${recovery.title}\n\n${recovery.body}`)}>
                  {copy.recovery.export}
                </InkTextAction>
                <InkTextAction
                  onClick={() => {
                    void removeRecovery(uid, workId, draft.id);
                    setRecovery(null);
                  }}
                >
                  {copy.recovery.discard}
                </InkTextAction>
              </div>
            }
          />
        ) : null}

        {state.status === 'conflict' && state.conflict ? (
          <InkInlineBanner
            tone="notice"
            title={copy.conflict.title}
            detail={copy.conflict.body}
            action={
              <div className="flex flex-wrap gap-x-4">
                <InkTextAction onClick={() => setCompare({ kind: 'conflict', text: state.conflict?.content ?? '' })}>{copy.conflict.compare}</InkTextAction>
                <InkTextAction
                  onClick={async () => {
                    const s = engine.getState();
                    const id = await saveLocalAsCopy(s.localTitle, s.localContent);
                    if (id) {
                      engine.useServer();
                      studio.toast(copy.conflict.copySaved);
                    }
                  }}
                >
                  {copy.conflict.saveCopy}
                </InkTextAction>
                <InkTextAction onClick={() => setConfirm('useServer')}>{copy.conflict.useServer}</InkTextAction>
              </div>
            }
          />
        ) : null}
        {state.status === 'failed' ? (
          <InkInlineBanner
            title={copiedNow ? copy.save.local : copy.save.failed}
            action={
              <div className="flex flex-wrap gap-x-4">
                <InkTextAction onClick={() => engine.retryNow()}>{copy.save.retry}</InkTextAction>
                <InkTextAction onClick={() => downloadText(`InkDuel-copia-${draft.id.slice(0, 8)}.txt`, `${state.localTitle}\n\n${state.localContent}`)}>
                  {copy.save.exportCopy}
                </InkTextAction>
              </div>
            }
          />
        ) : null}
        {entry.publishedChanged ? (
          <InkInlineBanner
            tone="notice"
            title={copy.editor.changedOutsideTitle}
            detail={copy.editor.changedOutsideBody}
            action={
              <div className="flex flex-wrap gap-x-4">
                <InkTextAction onClick={() => void openOutsideCompare()}>{copy.editor.compareOutside}</InkTextAction>
                {!readOnly ? <InkTextAction onClick={() => setConfirm('takeOutside')}>{copy.editor.takeOutside}</InkTextAction> : null}
              </div>
            }
          />
        ) : entry.published && pending ? (
          <p className="type-caption text-secondary">{copy.editor.publishedUnchanged}</p>
        ) : null}

        {findOpen ? <FindBar
            textareaRef={textareaRef}
            text={state.localContent}
            copy={copy.editor}
            onClose={() => {
              setFindOpen(false);
              textareaRef.current?.focus({ preventScroll: true });
            }}
          /> : null}
      </div>

      <div className={cx('mx-auto flex w-full flex-col gap-3 pt-4 pb-10', focus && 'pt-10')} style={{ maxWidth: textStyle.maxWidth }}>
        <label className="sr-only" htmlFor={`title-${draft.id}`}>
          {copy.editor.titleHint}
        </label>
        <input
          id={`title-${draft.id}`}
          value={state.localTitle}
          readOnly={readOnly}
          onChange={(event) => engine.setTitle(event.target.value)}
          maxLength={limits.title + 20}
          placeholder={copy.editor.titleHint}
          spellCheck={prefs.spellcheck}
          className="w-full bg-transparent font-literary text-[26px] leading-[1.15] font-bold text-content outline-none placeholder:font-normal placeholder:text-placeholder sm:text-[31px]"
        />
        {!focus ? (
          <div className="studio-chrome flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="inline-flex items-center gap-2 type-caption text-secondary">
              {copy.status.label}
              <select
                value={meta.status}
                disabled={readOnly || metaSaving}
                onChange={(event) => void saveMeta({ status: event.target.value as DraftStatus })}
                className="ink-focus min-h-9 rounded-control border-quiet border-control bg-surface px-2 type-body-sm text-primary"
              >
                {DRAFT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {copy.status[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-expanded={synopsisOpen}
              onClick={() => setSynopsisOpen((v) => !v)}
              className="ink-focus ink-dim inline-flex min-h-9 items-center rounded-control px-1 type-caption text-blue"
            >
              {copy.editor.synopsis}
            </button>
          </div>
        ) : null}
        {synopsisOpen && !focus ? (
          <div className="studio-chrome flex flex-col gap-2 rounded-control border-quiet border-divider bg-surface p-3">
            <label className="sr-only" htmlFor={`synopsis-${draft.id}`}>
              {copy.editor.synopsis}
            </label>
            <textarea
              id={`synopsis-${draft.id}`}
              value={synopsis}
              readOnly={readOnly}
              maxLength={limits.synopsis}
              onChange={(event) => setSynopsis(event.target.value)}
              onBlur={() => {
                if (!readOnly && synopsis !== meta.synopsis) void saveMeta({ synopsis });
              }}
              placeholder={copy.editor.synopsisHint}
              rows={2}
              className="w-full resize-y bg-transparent type-body-sm text-content outline-none placeholder:text-placeholder [field-sizing:content]"
            />
            {synopsis !== meta.synopsis && !readOnly ? (
              <InkButton variant="link" fullWidth={false} className="self-end" onClick={() => void saveMeta({ synopsis })}>
                {copy.editor.synopsisSave}
              </InkButton>
            ) : null}
          </div>
        ) : null}

        <label className="sr-only" htmlFor={`body-${draft.id}`}>
          {copy.editor.bodyHint}
        </label>
        <textarea
          ref={textareaRef}
          id={`body-${draft.id}`}
          value={state.localContent}
          readOnly={readOnly}
          onChange={(event) => engine.setContent(event.target.value)}
          placeholder={copy.editor.bodyHint}
          spellCheck={prefs.spellcheck}
          lang={studio.overview.work.language || locale}
          aria-invalid={state.invalid ? true : undefined}
          aria-describedby={`counter-${draft.id} limit-${draft.id}`}
          style={{ fontSize: textStyle.fontSize, lineHeight: textStyle.lineHeight }}
          className={cx(
            'min-h-[55vh] w-full resize-none bg-transparent text-content outline-none [field-sizing:content] placeholder:text-placeholder',
            prefs.font === 'serif' ? 'font-literary' : 'font-ui',
          )}
        />

        <footer className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-divider bg-page px-2 py-2">
          <p id={`counter-${draft.id}`} className="m-0 flex flex-wrap gap-x-3 type-caption tabular-nums text-secondary">
            <span>{copy.editor.words(words, fmt(words))}</span>
            <span>{copy.editor.chars(fmt(chars))}</span>
            <span>
              {copy.editor.reading(fmt(readingMinutes(words)))} <span className="text-tertiary">({copy.editor.readingEstimate})</span>
            </span>
            {sessionWords > 0 || sessionGoal > 0 ? (
              <span className={sessionGoal > 0 && sessionWords >= sessionGoal ? 'text-success' : undefined}>
                {sessionGoal > 0 ? copy.editor.sessionGoal(fmt(sessionWords), fmt(sessionGoal)) : copy.editor.session(fmt(sessionWords))}
              </span>
            ) : null}
          </p>
          <p id={`limit-${draft.id}`} aria-live="polite" className={cx('m-0 type-caption tabular-nums', overPublish ? 'text-warning' : 'text-tertiary')}>
            {state.invalid === 'tooLong'
              ? copy.editor.tooLong(fmt(limits.draftBody))
              : chars > limits.publishBody * 0.8
                ? copy.editor.publishLimit(fmt(chars), fmt(limits.publishBody))
                : null}
          </p>
        </footer>
        {overPublish && !readOnly ? (
          <InkInlineBanner
            tone="notice"
            title={copy.editor.overPublishLimit(fmt(limits.publishBody))}
            action={
              <InkTextAction
                onClick={() => {
                  splitAt.current = textareaRef.current?.selectionStart ?? null;
                  if (splitAt.current !== null && splitAt.current > 0 && splitAt.current < state.localContent.length) setConfirm('split');
                  else textareaRef.current?.focus();
                }}
              >
                {copy.editor.splitAtCursor}
              </InkTextAction>
            }
          />
        ) : null}
      </div>

      <PrefsSheet
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        prefs={prefs}
        onChange={setPrefs}
        copy={copy}
        closeLabel={copy.shell.close}
        recovery={{
          enabled: recoveryOn,
          available: recoveryAvailable,
          onChange: (on) => {
            setRecoveryOn(on);
            void setRecoveryEnabled(uid, on);
            if (!on) setLocalCopied(null);
          },
        }}
      />
      <VersionsSheet
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        draftId={draft.id}
        engine={engine}
        adopt={adoptVersion}
        readOnly={readOnly}
      />
      <StudioSheet
        open={compare !== null}
        onClose={() => setCompare(null)}
        title={copy.conflict.compareTitle}
        closeLabel={copy.shell.close}
        wide
        footer={
          compare?.kind === 'conflict' ? (
            <>
              <InkButton variant="secondary" fullWidth={false} onClick={() => setCompare(null)}>
                {copy.shell.cancel}
              </InkButton>
              <InkButton variant="destructive" fullWidth={false} onClick={() => setConfirm('keepMine')}>
                {copy.conflict.keepMine}
              </InkButton>
            </>
          ) : undefined
        }
      >
        {compare ? (
          <CompareView
            before={compare.text}
            after={state.localContent}
            beforeLabel={compare.kind === 'conflict' ? copy.conflict.server : copy.editor.outsideVersion}
            afterLabel={copy.conflict.yours}
          />
        ) : null}
      </StudioSheet>

      <StudioConfirm
        open={confirm === 'keepMine'}
        title={copy.conflict.keepMineConfirm}
        body={copy.conflict.keepMineConfirmBody}
        confirmLabel={copy.conflict.keepMineConfirm}
        cancelLabel={copy.shell.cancel}
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          // The server's version stays in history before mine replaces it;
          // without that backup nothing is replaced.
          try {
            await studioApi.createSnapshot(
              workId,
              draft.id,
              { snapshotId: crypto.randomUUID().toLowerCase(), label: copy.conflict.server.slice(0, limits.snapshotLabel) },
              { locale },
            );
          } catch {
            studio.toast(copy.conflict.keepMineFailed);
            setConfirm(null);
            return;
          }
          engine.keepMine();
          setConfirm(null);
          setCompare(null);
        }}
      />
      <StudioConfirm
        open={confirm === 'useServer'}
        title={copy.conflict.useServerTitle}
        body={copy.conflict.useServerBody}
        confirmLabel={copy.conflict.useServer}
        cancelLabel={copy.shell.cancel}
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          engine.useServer();
          setConfirm(null);
          setCompare(null);
        }}
      />
      <StudioConfirm
        open={confirm === 'discard' || confirm === 'takeOutside'}
        title={confirm === 'takeOutside' ? copy.editor.takeOutsideTitle : copy.editor.discardTitle}
        body={confirm === 'takeOutside' ? copy.editor.takeOutsideBody : copy.editor.discardBody}
        confirmLabel={confirm === 'takeOutside' ? copy.editor.takeOutside : copy.editor.discardConfirm}
        cancelLabel={copy.shell.cancel}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runDiscard()}
      />
      <StudioConfirm
        open={confirm === 'trash'}
        title={copy.editor.trashTitle}
        body={copy.editor.trashBody}
        confirmLabel={copy.editor.trashConfirm}
        cancelLabel={copy.shell.cancel}
        destructive
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runTrash()}
      />
      <StudioConfirm
        open={confirm === 'split'}
        title={copy.editor.splitTitle}
        body={copy.editor.splitBody}
        confirmLabel={copy.editor.splitConfirm}
        cancelLabel={copy.shell.cancel}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runSplit()}
      />
    </article>
  );
}
