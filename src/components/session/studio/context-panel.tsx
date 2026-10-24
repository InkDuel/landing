'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { CloseIcon, PinIcon, TrashIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { InkSkeleton, InkTextAction } from '@/components/ink/ink-states';
import { studioApi } from '@/lib/session/studio/api';
import { emptyFields, type Entity, type SearchHit } from '@/lib/session/studio/models';
import { type PinnedRef, usePinnedRefs } from '@/lib/session/studio/preferences';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { useStudioCollection } from '@/lib/session/studio/studio-store';

import { useStudio } from './studio-context';
import { StudioIconButton, StudioSegmented } from './studio-ui';

// The editor's side panel, closed by default on small screens: quick notes a
// click away, references pinned in sight, and a search of the whole Work —
// all without leaving the chapter. Nothing here goes to a third party.

type Tab = 'notes' | 'pinned' | 'search';

function QuickNotes({ draftId }: { draftId: string | null }) {
  const studio = useStudio();
  const { store, locale, limits, workId } = studio;
  const copy = STUDIO_COPY[locale].context;
  const notes = useStudioCollection(store, 'notes');
  const [scope, setScope] = useState<'chapter' | 'all'>(draftId ? 'chapter' : 'all');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const quick = useMemo(
    () =>
      notes.items
        .filter((n) => n.fields.kind === 'quick' && (scope === 'all' || n.fields.chapterDraftId === draftId || n.fields.pinned))
        .sort((a, b) => Number(b.fields.pinned) - Number(a.fields.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    [notes.items, scope, draftId],
  );

  async function add() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(false);
    try {
      await store.create('notes', { ...emptyFields('notes'), kind: 'quick', body, chapterDraftId: scope === 'chapter' && draftId ? draftId : '' });
      studioAnalytics.entityCreated(workId, 'quick_note');
      setText('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(note: Entity<'notes'>) {
    try {
      await store.update('notes', note, { ...note.fields, pinned: !note.fields.pinned });
    } catch {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {draftId ? (
        <StudioSegmented
          label={copy.quickNotes}
          hideLabel
          value={scope}
          onChange={setScope}
          options={[
            { value: 'chapter', label: copy.thisChapter },
            { value: 'all', label: copy.allChapters },
          ]}
        />
      ) : null}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <label htmlFor="studio-quick-note" className="sr-only">
          {copy.quickNoteHint}
        </label>
        <textarea
          id="studio-quick-note"
          value={text}
          maxLength={limits.noteBody}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void add();
            }
          }}
          placeholder={copy.quickNoteHint}
          rows={2}
          className="w-full resize-y rounded-control border-quiet border-control bg-surface px-3 py-2 type-body-sm text-content outline-none placeholder:text-placeholder focus:border-outline [field-sizing:content]"
        />
        <InkButton type="submit" variant="secondary" fullWidth={false} className="self-end" disabled={!text.trim()} busy={busy}>
          {copy.addNote}
        </InkButton>
      </form>
      {error ? <InkInlineBanner title={copy.noteSaveError} /> : null}
      {notes.status === 'loading' && notes.items.length === 0 ? <InkSkeleton lines={2} height="h-12" label={STUDIO_COPY[locale].shell.loading} /> : null}
      {notes.status === 'error' ? (
        <InkInlineBanner title={copy.noteSaveError} action={<InkTextAction onClick={() => void store.reload('notes')}>{STUDIO_COPY[locale].shell.retry}</InkTextAction>} />
      ) : null}
      {notes.status === 'ready' && quick.length === 0 ? <p className="type-body-sm text-secondary">{copy.noNotes}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {quick.map((note) => (
          <li key={note.id} className="flex items-start gap-1 rounded-control border-quiet border-divider bg-surface p-2 pl-3">
            <p className="min-w-0 flex-1 py-1.5 type-body-sm whitespace-pre-wrap break-words text-content">{note.fields.body}</p>
            <StudioIconButton label={note.fields.pinned ? copy.unpin : copy.pin} pressed={note.fields.pinned} onClick={() => void togglePin(note)}>
              <PinIcon size={16} />
            </StudioIconButton>
            <StudioIconButton label={copy.deleteNote} onClick={() => void store.trash('notes', note.id).catch(() => setError(true))}>
              <TrashIcon size={16} />
            </StudioIconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pinned() {
  const studio = useStudio();
  const { store, locale, uid, workId } = studio;
  const copy = STUDIO_COPY[locale].context;
  const characters = useStudioCollection(store, 'characters');
  const places = useStudioCollection(store, 'places');
  const scenes = useStudioCollection(store, 'scenes');
  const [pins, setPins] = usePinnedRefs(uid, workId);

  const options = [
    ...characters.items.map((e) => ({ ref: { kind: 'characters', id: e.id } as PinnedRef, label: e.fields.name })),
    ...places.items.map((e) => ({ ref: { kind: 'places', id: e.id } as PinnedRef, label: e.fields.name })),
    ...scenes.items.map((e) => ({ ref: { kind: 'scenes', id: e.id } as PinnedRef, label: e.fields.title })),
  ].filter((o) => !pins.some((p) => p.id === o.ref.id));

  const cards = pins
    .map((pin) => {
      if (pin.kind === 'characters') {
        const c = characters.items.find((e) => e.id === pin.id);
        return c
          ? {
              pin,
              title: c.fields.name,
              lines: [c.fields.aliases, c.fields.summary, c.fields.externalGoal, c.fields.voice].filter(Boolean),
            }
          : null;
      }
      if (pin.kind === 'places') {
        const p = places.items.find((e) => e.id === pin.id);
        return p ? { pin, title: p.fields.name, lines: [p.fields.placeType, p.fields.description, p.fields.atmosphere].filter(Boolean) } : null;
      }
      const s = scenes.items.find((e) => e.id === pin.id);
      return s ? { pin, title: s.fields.title, lines: [s.fields.synopsis, s.fields.conflict, s.fields.outcome].filter(Boolean) } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const kindLabel = (k: PinnedRef['kind']) => copy.resultKinds[k] ?? '';

  return (
    <div className="flex flex-col gap-3">
      <p className="type-body-sm text-secondary">{copy.pinHint}</p>
      {options.length > 0 ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-[12.5px] font-extrabold text-primary">{copy.pinPick}</span>
          <select
            value=""
            onChange={(event) => {
              const option = options.find((o) => o.ref.id === event.target.value);
              if (option) setPins([...pins, option.ref]);
            }}
            className="ink-focus min-h-11 rounded-control border-quiet border-control bg-surface px-3 type-body-sm text-primary"
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.ref.id} value={o.ref.id}>
                {kindLabel(o.ref.kind)} · {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {cards.length === 0 ? <p className="type-body-sm text-tertiary">{copy.noPinned}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {cards.map((card) => (
          <li key={card.pin.id} className="rounded-control border-quiet border-divider bg-surface p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="type-label text-[10.5px] text-tertiary">{kindLabel(card.pin.kind)}</p>
                <p className="font-literary text-[16px] font-semibold break-words text-primary">{card.title}</p>
              </div>
              <StudioIconButton label={copy.unpin} onClick={() => setPins(pins.filter((p) => p.id !== card.pin.id))}>
                <CloseIcon size={16} />
              </StudioIconButton>
            </div>
            {card.lines.slice(0, 3).map((line, i) => (
              <p key={i} className="mt-1 line-clamp-4 type-body-sm whitespace-pre-wrap break-words text-secondary">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkSearch() {
  const studio = useStudio();
  const { workId, locale } = studio;
  const copy = STUDIO_COPY[locale].context;
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ hits: SearchHit[]; truncated: boolean } | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResult(null);
      setState('idle');
      return;
    }
    const id = ++seq.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState('loading');
      studioApi
        .search(workId, q, { locale, signal: controller.signal })
        .then((r) => {
          if (id === seq.current) {
            setResult(r);
            setState('idle');
          }
        })
        .catch(() => id === seq.current && !controller.signal.aborted && setState('error'));
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, workId, locale]);

  function open(hit: SearchHit) {
    if (hit.kind === 'draft' || hit.kind === 'chapter') void studio.goTo('write', hit.id);
    else if (hit.kind === 'scenes') void studio.goTo('plan', null, { item: hit.id });
    else if (hit.kind === 'relations') void studio.goTo('universe', null, { tab: 'relations' });
    else void studio.goTo('universe', null, { tab: hit.kind, item: hit.id });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{copy.search}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchHint}
          className="ink-focus min-h-11 rounded-control border-quiet border-control bg-surface px-3 type-body-sm text-primary outline-none placeholder:text-placeholder"
        />
      </label>
      <div aria-live="polite" className="sr-only">
        {result ? `${result.hits.length}` : ''}
      </div>
      {state === 'loading' ? <InkSkeleton lines={2} height="h-12" label={STUDIO_COPY[locale].shell.loading} /> : null}
      {state === 'error' ? <InkInlineBanner title={copy.searchError} /> : null}
      {result && result.hits.length === 0 ? <p className="type-body-sm text-secondary">{copy.searchEmpty}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {result?.hits.map((hit, i) => (
          <li key={`${hit.kind}-${hit.id}-${hit.field}-${i}`}>
            <button type="button" onClick={() => open(hit)} className="ink-focus flex w-full flex-col items-start rounded-control px-2 py-2 text-left hover:bg-surface">
              <span className="type-label text-[10.5px] text-tertiary">{copy.resultKinds[hit.kind] ?? hit.kind}</span>
              {hit.title ? <span className="type-body-strong text-[14px] break-words text-primary">{hit.title}</span> : null}
              <span className="type-body-sm break-words text-secondary">{hit.snippet}</span>
            </button>
          </li>
        ))}
      </ul>
      {result?.truncated ? <p className="type-caption text-tertiary">{copy.searchTruncated}</p> : null}
    </div>
  );
}

export function ContextPanel({
  draftId,
  onClose,
  className,
  inSheet = false,
}: {
  draftId: string | null;
  onClose: () => void;
  className?: string;
  /** Inside a sheet the sheet already shows the title and the close button. */
  inSheet?: boolean;
}) {
  const { locale } = useStudio();
  const copy = STUDIO_COPY[locale];
  const [tab, setTab] = useState<Tab>('notes');
  return (
    <section aria-label={copy.context.title} className={cx('flex min-h-0 flex-col gap-3', className)}>
      {!inSheet ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="type-label text-secondary">{copy.context.title}</h2>
          <StudioIconButton label={copy.shell.close} onClick={onClose}>
            <CloseIcon size={20} />
          </StudioIconButton>
        </div>
      ) : null}
      <StudioSegmented
        label={copy.context.title}
        hideLabel
        value={tab}
        onChange={setTab}
        options={[
          { value: 'notes', label: copy.context.quickNotes },
          { value: 'pinned', label: copy.context.pinned },
          { value: 'search', label: copy.context.search },
        ]}
      />
      {tab === 'notes' ? <QuickNotes draftId={draftId} /> : tab === 'pinned' ? <Pinned /> : <WorkSearch />}
    </section>
  );
}
