'use client';

import { useId, useRef, useState } from 'react';

import { cx } from '@/components/ink/cx';
import { DownloadIcon } from '@/components/ink/icons';
import { InkButton } from '@/components/ink/ink-button';
import { InkInlineBanner } from '@/components/ink/ink-inline-banner';
import { INTL_LOCALE } from '@/lib/i18n';
import { studioApi } from '@/lib/session/studio/api';
import { downloadBlob, type ImportedFile, readImportFile, splitByHeadings } from '@/lib/session/studio/import-text';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { STUDIO_COPY } from '@/lib/session/studio/studio-copy';
import { countChars, countWords } from '@/lib/session/studio/words';
import { newClientId } from '@/lib/session/works';

import { useSessionLocale } from '../session-root';
import { type EditorHandle, useStudio } from './studio-context';
import { StudioConfirm, StudioRadioCards, StudioSelect, StudioSheet } from './studio-ui';

// «Tu obra es tuya. Llévala contigo.» Export is never gated (it also renders
// on the legacy Works page when Studio is off). Import creates private drafts
// only; replacing a chapter makes a backup version first (server side).

type Format = 'txt' | 'md' | 'docx' | 'json';

export function StudioExportPanel({
  workId,
  editor,
  compact = false,
  className,
}: {
  workId: string;
  editor?: () => EditorHandle | null;
  compact?: boolean;
  className?: string;
}) {
  const { locale } = useSessionLocale();
  const copy = STUDIO_COPY[locale];
  const x = copy.portability;
  const [format, setFormat] = useState<Format>('docx');
  const [version, setVersion] = useState<'draft' | 'published'>('draft');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dirtyAsk, setDirtyAsk] = useState(false);

  async function run(includeLocal: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const ed = editor?.();
      if (ed && includeLocal) {
        const local = ed.localText();
        downloadBlob(`InkDuel-local-${ed.draftId.slice(0, 8)}.txt`, new Blob([`${local.title}\n\n${local.body}`], { type: 'text/plain;charset=utf-8' }));
      }
      const { blob, filename } = await studioApi.exportFile(workId, format, version, { locale });
      downloadBlob(filename, blob);
      studioAnalytics.exported(workId, format, true);
      setMessage({ tone: 'success', text: x.exportDone(filename) });
    } catch {
      studioAnalytics.exported(workId, format, false);
      setMessage({ tone: 'error', text: x.exportFailed });
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    const ed = editor?.();
    if (ed && ed.hasUnsaved()) {
      // Export what is synced: try to sync now; if it cannot, ask.
      if (!(await ed.flush())) {
        setDirtyAsk(true);
        return;
      }
    }
    await run(false);
  }

  return (
    <section aria-labelledby="studio-export" className={cx('flex flex-col gap-3 rounded-card border-quiet border-divider bg-surface p-4', className)}>
      <div>
        <h2 id="studio-export" className="type-title-section text-[20px] text-primary">
          {compact ? copy.shell.unavailableExport : x.title}
        </h2>
        <p className="mt-1 type-body-sm text-secondary">{compact ? copy.shell.unavailableExportBody : x.intro}</p>
      </div>
      <StudioRadioCards
        label={x.exportTitle}
        value={format}
        onChange={setFormat}
        options={[
          { value: 'docx', label: x.formatDocx, hint: x.formatDocxHint },
          { value: 'md', label: x.formatMd, hint: x.formatMdHint },
          { value: 'txt', label: x.formatTxt, hint: x.formatTxtHint },
          { value: 'json', label: x.formatJson, hint: x.formatJsonShort },
        ]}
      />
      {format === 'json' ? (
        <p className="type-caption text-secondary">{x.formatJsonHint}</p>
      ) : (
        <StudioSelect
          label={x.versionLabel}
          value={version}
          onChange={setVersion}
          options={[
            { value: 'draft', label: x.versionDraft },
            { value: 'published', label: x.versionPublished },
          ]}
        />
      )}
      <InkButton variant="secondary" leading={<DownloadIcon size={20} />} busy={busy} busyLabel={x.downloading} onClick={() => void start()}>
        {x.download}
      </InkButton>
      {message ? <InkInlineBanner tone={message.tone === 'success' ? 'success' : 'error'} title={message.text} /> : null}
      <StudioConfirm
        open={dirtyAsk}
        title={x.dirtyTitle}
        body={x.dirtyBody}
        confirmLabel={x.dirtyLocalCopy}
        cancelLabel={copy.shell.cancel}
        onClose={() => setDirtyAsk(false)}
        onConfirm={() => {
          setDirtyAsk(false);
          void run(true);
        }}
      />
    </section>
  );
}

type Mode = 'new' | 'replace' | 'split';

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const studio = useStudio();
  const { workId, locale, limits, overview } = studio;
  const copy = STUDIO_COPY[locale];
  const x = copy.portability;
  const fmt = (n: number) => n.toLocaleString(INTL_LOCALE[locale]);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ImportedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('new');
  const [busy, setBusy] = useState(false);
  // Ids fixed at preview time: a retried import never duplicates chapters.
  const ids = useRef<string[]>([]);

  const reset = () => {
    setFile(null);
    setError(null);
    setMode('new');
    ids.current = [];
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const chapters = file && mode === 'split' ? splitByHeadings(file.text) : file ? [{ title: file.title, body: file.text }] : [];
  const canSplit = file?.isMarkdown && splitByHeadings(file.text).length > 1;
  const ed = studio.editor();
  const tooLong = chapters.some((c) => countChars(c.body) > limits.draftBody);
  const freeDrafts = limits.maxDrafts - overview.manuscript.filter((e) => !e.chapterId).length;
  const overCap = mode !== 'replace' && chapters.length > freeDrafts;

  async function pick(f: File | undefined) {
    reset();
    if (!f) return;
    const result = await readImportFile(f);
    if (!result.ok) {
      setError(result.reason === 'tooBig' ? x.importTooBig(fmt(1024)) : x.importInvalid);
      return;
    }
    setFile(result.file);
    ids.current = splitByHeadings(result.file.text).map(() => newClientId());
    ids.current.unshift(newClientId());
  }

  async function run() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'replace') {
        const editor = studio.editor();
        if (!editor || editor.readOnly()) {
          setError(x.importNoCurrent);
          return;
        }
        if (!(await editor.flush())) {
          setError(copy.publish.blockedUnsaved);
          return;
        }
        const local = editor.localText();
        const saved = await studioApi.saveDraft(workId, editor.draftId, { expectedRevision: local.revision, title: local.title, body: file.text, source: 'import' }, { locale });
        editor.adopt({ revision: saved.revision, title: local.title, content: file.text });
        studio.applyDraft(saved);
      } else if (mode === 'new') {
        // The id fixed at preview time makes a retry idempotent.
        const id = await studio.createChapter({ title: file.title, body: file.text, source: 'import', id: ids.current[0] });
        if (!id) {
          setError(x.importFailed);
          return;
        }
      } else {
        let first: string | null = null;
        for (const [i, chapter] of chapters.entries()) {
          const { draft } = await studioApi.createDraft(
            workId,
            { draftId: ids.current[i + 1], title: chapter.title, body: chapter.body, source: 'import' },
            { locale },
          );
          studio.applyDraft(draft);
          first ??= draft.id;
        }
        if (first) await studio.goTo('write', first);
      }
      studio.toast(x.importDone);
      reset();
      onClose();
    } catch {
      setError(x.importFailed);
    } finally {
      setBusy(false);
    }
  }

  const words = chapters.reduce((n, c) => n + countWords(c.body), 0);
  const chars = chapters.reduce((n, c) => n + countChars(c.body), 0);

  return (
    <StudioSheet
      open={open}
      onClose={close}
      title={x.importTitle}
      description={x.importIntro}
      closeLabel={copy.shell.close}
      footer={
        file ? (
          <>
            <InkButton variant="secondary" fullWidth={false} onClick={close} disabled={busy}>
              {copy.shell.cancel}
            </InkButton>
            <InkButton fullWidth={false} busy={busy} busyLabel={x.importing} disabled={tooLong || overCap || (mode === 'replace' && (!ed || ed.readOnly()))} onClick={() => void run()}>
              {x.importConfirm}
            </InkButton>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            onChange={(event) => void pick(event.target.files?.[0])}
            className="sr-only"
          />
          <label htmlFor={inputId} className="ink-focus inline-flex min-h-[52px] cursor-pointer items-center rounded-button border-brand border-outline bg-surface px-4 type-button-ui text-primary ink-dim">
            {x.importPick}
          </label>
        </div>
        {error ? <InkInlineBanner title={error} /> : null}
        {file ? (
          <section aria-labelledby="import-preview" className="flex flex-col gap-3">
            <h3 id="import-preview" className="type-label text-secondary">
              {x.importPreviewTitle}
            </h3>
            <p className="type-body-sm break-words text-primary">
              <span className="font-extrabold">{file.name}</span> · {x.importStats(fmt(words), fmt(chars))}
              {mode === 'split' ? ` · ${x.importChapters(chapters.length, fmt(chapters.length))}` : ''}
            </p>
            <StudioRadioCards
              label={x.importTitle}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'new', label: x.importAsNew },
                ...(ed && !ed.readOnly() ? [{ value: 'replace' as const, label: x.importReplace, hint: x.importReplaceHint }] : []),
                ...(canSplit ? [{ value: 'split' as const, label: x.importSplit, hint: x.importSplitHint(fmt(splitByHeadings(file.text).length)) }] : []),
              ]}
            />
            {mode === 'split' ? (
              <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 type-body-sm text-primary">
                {chapters.map((c, i) => (
                  <li key={i} className="break-words">
                    {c.title || copy.manuscript.untitledDraft} <span className="text-tertiary">· {fmt(countWords(c.body))}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {tooLong ? <InkInlineBanner title={x.importTooLong(fmt(limits.draftBody))} /> : null}
            {overCap ? <InkInlineBanner title={copy.manuscript.limitReached(fmt(limits.maxDrafts))} /> : null}
            <pre className="ctx-reading m-0 max-h-[40vh] overflow-y-auto rounded-control border-quiet border-divider p-4 font-literary text-[15px] leading-[1.6] whitespace-pre-wrap break-words text-content">
              {(mode === 'split' ? chapters[0]?.body ?? '' : file.text).slice(0, 1200)}
              {file.text.length > 1200 ? '…' : ''}
            </pre>
          </section>
        ) : null}
      </div>
    </StudioSheet>
  );
}
