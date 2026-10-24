import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveView, findMatches } from '@/components/session/studio/editor-parts';
import { ChapterAutosave, type ChapterEditorState } from '@/lib/session/chapter-autosave';

import { conflictData, draftConflict, publishedConflict } from './api';
import { ApiError } from '../api';
import { diffLines } from './diff';
import { normalizeImportedText, readImportFile, splitByHeadings } from './import-text';
import { parseEntity, parseOverview } from './models';
import { STUDIO_COPY } from './studio-copy';

const base: ChapterEditorState = {
  workId: 'w',
  chapterId: 'd',
  isNew: false,
  orderIndex: 0,
  published: false,
  localContent: '',
  localTitle: '',
  savedContent: '',
  savedTitle: '',
  savedRevision: 0,
  status: 'saved',
  invalid: null,
  conflict: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('import', () => {
  it('normalizes BOM and line endings, never interprets Markdown', () => {
    expect(normalizeImportedText('﻿uno\r\ndos\rtres')).toBe('uno\ndos\ntres');
    const chapters = splitByHeadings('Prólogo suelto\n\n# Uno\nTexto **literal** <b>sin HTML</b>\n```\n# no es título\n```\n## Dos\nFin');
    expect(chapters.map((c) => c.title)).toEqual(['', 'Uno', 'Dos']);
    expect(chapters[1].body).toContain('**literal** <b>sin HTML</b>');
    expect(chapters[1].body).toContain('# no es título');
  });

  it('rejects invalid UTF-8 and other file types', async () => {
    const bad = new File([new Uint8Array([0x66, 0xff, 0xfe, 0x6f])], 'roto.txt', { type: 'text/plain' });
    expect(await readImportFile(bad)).toEqual({ ok: false, reason: 'invalid' });
    const pdf = new File(['x'], 'libro.pdf', { type: 'application/pdf' });
    expect(await readImportFile(pdf)).toEqual({ ok: false, reason: 'type' });
    const ok = await readImportFile(new File(['¡Hola 🙂!\r\n'], 'Mi_capitulo.md', { type: 'text/markdown' }));
    expect(ok).toEqual({ ok: true, file: { name: 'Mi_capitulo.md', title: 'Mi capitulo', text: '¡Hola 🙂!\n', isMarkdown: true } });
  });
});

describe('compare and find', () => {
  it('diffs lines', () => {
    expect(diffLines('a\nb\nc', 'a\nc\nd')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'same', text: 'c' },
      { kind: 'added', text: 'd' },
    ]);
  });

  it('finds case-insensitively', () => {
    expect(findMatches('Mara y mara y MARA', 'mara')).toEqual([0, 7, 14]);
    expect(findMatches('texto', '')).toEqual([]);
  });
});

describe('honest save status', () => {
  const copy = STUDIO_COPY.es.save;
  it('says «Guardado en este dispositivo» only when that exact text was copied locally', () => {
    const failing = { ...base, localContent: 'nuevo', status: 'retrying' as const };
    expect(saveView(failing, false, copy).text).toBe(copy.retrying);
    expect(saveView(failing, true, copy).text).toBe(copy.local);
    expect(saveView({ ...base, status: 'saved' }, false, copy).text).toBe(copy.saved);
    expect(saveView({ ...base, localContent: 'x', status: 'saved' }, false, copy).text).toBe(copy.dirty);
    expect(saveView({ ...base, status: 'conflict' }, false, copy).tone).toBe('danger');
  });
});

describe('autosave engine with draft limits', () => {
  it('allows an empty draft and 40,000 characters, refuses more without sending', async () => {
    vi.useFakeTimers();
    const patch = vi.fn(async (_c: string, _t: string, expected: number) => ({ revision: expected + 1, orderIndex: 0, published: false }));
    const engine = new ChapterAutosave(
      { ...base, localContent: 'algo', savedContent: 'algo' },
      { add: vi.fn(), patch, remove: vi.fn(), readConflict: () => null, isTransient: () => false },
      { debounceMs: 10, minGapMs: 10, backoffBaseMs: 10, backoffMaxMs: 10 },
      () => Date.now(),
      { maxContent: 40000, maxTitle: 120, allowEmpty: true },
    );
    engine.setContent('');
    expect(engine.getState().invalid).toBeNull();
    await expect(engine.flush()).resolves.toBe(true);
    expect(patch).toHaveBeenCalledWith('', '', 0, false);

    engine.setContent('a'.repeat(40000));
    expect(engine.getState().invalid).toBeNull();
    engine.setContent('a'.repeat(40001));
    expect(engine.getState().invalid).toBe('tooLong');
    await expect(engine.flush()).resolves.toBe(false);
    expect(patch).toHaveBeenCalledTimes(1);
    engine.dispose();
  });

  it('adopts a restored version as saved text', () => {
    const engine = new ChapterAutosave(
      { ...base, localContent: 'mío', savedContent: 'viejo' },
      { add: vi.fn(), patch: vi.fn(), remove: vi.fn(), readConflict: () => null, isTransient: () => false },
    );
    engine.adopt({ revision: 7, title: 'T', content: 'restaurado' });
    expect(engine.getState()).toMatchObject({ localContent: 'restaurado', savedContent: 'restaurado', savedRevision: 7, status: 'saved' });
    engine.dispose();
  });
});

describe('contract parsing', () => {
  it('reads 409 codes and snapshots defensively', () => {
    const draft = new ApiError(409, 'http', { code: 'draft_conflict', currentRevision: 4, currentTitle: 'T', currentBody: 'B' });
    expect(draftConflict(draft)).toEqual({ revision: 4, title: 'T', body: 'B' });
    expect(publishedConflict(draft)).toBeNull();
    const pub = new ApiError(409, 'http', { code: 'published_conflict', currentPublishedRevision: 2, currentPublishedBody: 'P', currentPublished: true });
    expect(publishedConflict(pub)).toEqual({ revision: 2, title: '', body: 'P', published: true });
    expect(conflictData(new ApiError(500, 'http'))).toBeNull();
  });

  it('parses the overview without trusting unknown shapes', () => {
    expect(parseOverview({})).toBeNull();
    const o = parseOverview({
      work: { id: 'w', title: 'Obra', nextChapterOrder: 0 },
      limits: { draftBody: 'x' },
      manuscript: [{ id: 'c', chapterId: 'c', draft: { id: 'c', status: 'weird', pendingChanges: true } }, { nope: true }],
    });
    expect(o?.limits.draftBody).toBe(40000);
    expect(o?.work.nextChapterOrder).toBe(1);
    expect(o?.manuscript).toHaveLength(1);
    expect(o?.manuscript[0].draft?.status).toBe('draft');
    expect(o?.settings.streakEnabled).toBe(true);
  });

  it('defaults every entity field', () => {
    const e = parseEntity('relations', { id: 'r', fields: { type: 'enemies', directed: 'yes' } });
    expect(e?.fields).toMatchObject({ type: 'other', directed: false, status: 'active', fromCharacterId: '' });
  });
});
