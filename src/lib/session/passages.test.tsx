import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ChapterPassages } from './marks';
import {
  LINE_ATTRIBUTE,
  buildPassageLayout,
  buildTextPassageLayout,
  dismissPassageHint,
  goTrim,
  markPassageQuoted,
  quoteRange,
  readPassageHints,
  resolveSelection,
  runeCount,
  splitParagraphs,
} from './passages';

// The vectors mirror inkduel-backend/internal/services/work_chapter_paragraphs_test.go:
// both sides must split a chapter into the same paragraphs.

describe('paragraph split: parity with the backend rule', () => {
  it('folds CRLF, trims every line and skips blank, whitespace-only and NBSP-only lines', () => {
    const content = '  Primera línea.  \r\n\r\n   \r\n   \r\n—Segunda.\n\tTercera.\t\n';
    expect(splitParagraphs(content)).toEqual(['Primera línea.', '—Segunda.', 'Tercera.']);
  });

  it('gives no paragraphs for empty or blank content', () => {
    for (const content of ['', '\n\n', '   \r\n  ']) expect(splitParagraphs(content)).toEqual([]);
  });

  it('trims with Go TrimSpace, not JS trim(): U+0085 goes, a BOM stays', () => {
    expect(goTrim('\u0085 hola 　')).toBe('hola');
    expect(goTrim(' hola ')).toBe('hola');
    expect(goTrim('﻿hola')).toBe('﻿hola');
    // A line holding only a BOM is a paragraph for the backend, so it is one here.
    expect(splitParagraphs('a\n﻿\nb')).toEqual(['a', '﻿', 'b']);
    // A lone CR is not a separator (only CRLF is folded).
    expect(splitParagraphs('a\rb\nc')).toEqual(['a\rb', 'c']);
  });

  it('keeps repeated paragraphs, counts emoji as one rune', () => {
    expect(splitParagraphs('***\nUna sola vez.\n***\n—Sí.\n—Sí.')).toHaveLength(5);
    expect(runeCount('sí 🙂')).toBe(4);
  });
});

const passages = (over: Partial<ChapterPassages> = {}): ChapterPassages => ({
  paragraphKeys: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'],
  markedKeys: ['bbbbbbbbbbbb'],
  maxQuoteRunes: 300,
  chapterRevision: 7,
  ...over,
});
const TEXT = 'Uno.\n\nDos.\r\n\nTres.\n';

describe('activation: places only when summary, count and revision agree', () => {
  it('is on with matching count and revision, and keeps blank lines as lines', () => {
    const layout = buildPassageLayout(TEXT, 7, passages());
    expect(layout).not.toBeNull();
    expect(layout?.lines.map((line) => [line.text, line.key, line.markable, line.marked])).toEqual([
      ['Uno.', 'aaaaaaaaaaaa', true, false],
      ['', null, false, false],
      ['Dos.', 'bbbbbbbbbbbb', true, true],
      ['', null, false, false],
      ['Tres.', 'cccccccccccc', true, false],
    ]);
  });

  it('is off without passages', () => {
    expect(buildPassageLayout(TEXT, 7, null)).toBeNull();
  });

  it('is off when the paragraph count differs, either way', () => {
    expect(buildPassageLayout(TEXT, 7, passages({ paragraphKeys: ['a', 'b'] }))).toBeNull();
    expect(buildPassageLayout(TEXT, 7, passages({ paragraphKeys: ['a', 'b', 'c', 'd'] }))).toBeNull();
    expect(buildPassageLayout('Uno.\nDos.\nTres.\nCuatro.', 7, passages())).toBeNull();
  });

  it('is off when the chapter revision differs or is unknown', () => {
    expect(buildPassageLayout(TEXT, 6, passages())).toBeNull();
    expect(buildPassageLayout(TEXT, 8, passages())).toBeNull();
    expect(buildPassageLayout(TEXT, null, passages())).toBeNull();
  });

  it('accepts revision 0', () => {
    expect(buildPassageLayout(TEXT, 0, passages({ chapterRevision: 0 }))).not.toBeNull();
  });

  it('repeated keys are neither markable nor marked, even if the server listed them', () => {
    const layout = buildPassageLayout(
      '***\nUna sola vez.\n***',
      7,
      passages({ paragraphKeys: ['rrrrrrrrrrrr', 'uuuuuuuuuuuu', 'rrrrrrrrrrrr'], markedKeys: ['rrrrrrrrrrrr', 'uuuuuuuuuuuu'] }),
    );
    expect(layout?.lines.map((line) => [line.markable, line.marked])).toEqual([
      [false, false],
      [true, true],
      [false, false],
    ]);
  });
});

describe('the one-time hint store', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('is per account, and the first quoted Marca is remembered', () => {
    expect(readPassageHints('u1')).toEqual({ dismissed: false, quoted: false });
    dismissPassageHint('u1');
    expect(readPassageHints('u1')).toEqual({ dismissed: true, quoted: false });
    markPassageQuoted('u1');
    expect(readPassageHints('u1')).toEqual({ dismissed: true, quoted: true });
    expect(readPassageHints('u2')).toEqual({ dismissed: false, quoted: false });
  });

  it('shows nothing without an account, and survives blocked storage', () => {
    expect(readPassageHints('')).toEqual({ dismissed: true, quoted: true });
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(readPassageHints('u1')).toEqual({ dismissed: false, quoted: false });
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('quote position', () => {
  it('finds the first occurrence in the original line, none for a missing quote', () => {
    expect(quoteRange('la casa, la casa', 'la casa')).toEqual({ start: 0, end: 7 });
    expect(quoteRange('  hola mundo', 'mundo')).toEqual({ start: 7, end: 12 });
    expect(quoteRange('hola', 'adiós')).toBeNull();
    expect(quoteRange('hola', null)).toBeNull();
  });
});

// ---- selection (real DOM ranges in jsdom) ----

function mount(content: string, passageOver: Partial<ChapterPassages> = {}) {
  const paragraphs = splitParagraphs(content);
  const keys = paragraphs.map((_, i) => `k${String(i).padStart(11, '0')}`);
  const layout = buildPassageLayout(content, 7, passages({ paragraphKeys: keys, markedKeys: [], ...passageOver }));
  if (!layout) throw new Error('layout off');
  const root = document.createElement('div');
  for (const line of layout.lines) {
    const element = document.createElement(line.key ? 'p' : 'div');
    if (line.key) element.setAttribute(LINE_ATTRIBUTE, String(line.index));
    element.textContent = line.text;
    root.appendChild(element);
  }
  document.body.appendChild(root);
  return { root, layout, line: (i: number) => root.children[i].firstChild as Text };
}

describe('selection: one markable paragraph only', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function rangeOf(start: Node, startOffset: number, end: Node, endOffset: number) {
    const range = document.createRange();
    range.setStart(start, startOffset);
    range.setEnd(end, endOffset);
    return range;
  }

  it('a selection inside one paragraph resolves to its trimmed quote and key', () => {
    const { root, layout, line } = mount('Era un ritmo lento.\nOtro párrafo.');
    const result = resolveSelection(rangeOf(line(0), 4, line(0), 19), root, layout);
    expect(result).toMatchObject({ kind: 'ok', key: layout.lines[0].key, quote: 'un ritmo lento.', tooLong: false });
  });

  it('trims the ends of the quote', () => {
    const { root, layout, line } = mount('Era un ritmo lento.');
    const result = resolveSelection(rangeOf(line(0), 0, line(0), 7), root, layout);
    expect(result).toMatchObject({ kind: 'ok', quote: 'Era un' });
  });

  it('a selection across two paragraphs offers nothing', () => {
    const { root, layout, line } = mount('Uno dos.\nTres cuatro.');
    expect(resolveSelection(rangeOf(line(0), 4, line(1), 4), root, layout)).toEqual({ kind: 'cross' });
  });

  it('a whole paragraph picked with a triple click (it ends at the start of the next) stays one paragraph', () => {
    const { root, layout, line } = mount('Uno dos.\nTres cuatro.');
    const result = resolveSelection(rangeOf(line(0), 0, line(1), 0), root, layout);
    expect(result).toMatchObject({ kind: 'ok', quote: 'Uno dos.' });
  });

  it('a selection reaching outside the text offers nothing', () => {
    const { root, layout, line } = mount('Uno dos.');
    const outside = document.body.appendChild(document.createElement('footer'));
    outside.textContent = 'fin';
    expect(resolveSelection(rangeOf(line(0), 0, outside.firstChild as Text, 2), root, layout)).toEqual({ kind: 'cross' });
  });

  it('a collapsed or empty selection offers nothing', () => {
    const { root, layout, line } = mount('Uno dos.');
    expect(resolveSelection(rangeOf(line(0), 3, line(0), 3), root, layout)).toEqual({ kind: 'none' });
    expect(resolveSelection(null, root, layout)).toEqual({ kind: 'none' });
  });

  it('a repeated paragraph is not markable: nothing offered', () => {
    const { root, layout, line } = mount('***\nUna.\n***', { paragraphKeys: ['r00000000000', 'u00000000000', 'r00000000000'] });
    expect(resolveSelection(rangeOf(line(0), 0, line(0), 3), root, layout)).toEqual({ kind: 'none' });
    expect(resolveSelection(rangeOf(line(1), 0, line(1), 4), root, layout)).toMatchObject({ kind: 'ok', quote: 'Una.' });
  });

  it('300 runes is the limit: 300 passes, 301 is flagged and never cut', () => {
    const exact = 'a'.repeat(300);
    const over = 'é'.repeat(301);
    const { root, layout, line } = mount(`${exact}\n${over}`);
    expect(resolveSelection(rangeOf(line(0), 0, line(0), 300), root, layout)).toMatchObject({ kind: 'ok', tooLong: false });
    const long = resolveSelection(rangeOf(line(1), 0, line(1), 301), root, layout);
    expect(long).toMatchObject({ kind: 'ok', tooLong: true });
    if (long.kind === 'ok') expect(long.quote).toBe(over);
  });

  it('counts runes, not UTF-16 units, against the limit', () => {
    const emojis = '🙂'.repeat(300);
    const { root, layout, line } = mount(emojis);
    expect(resolveSelection(rangeOf(line(0), 0, line(0), 600), root, layout)).toMatchObject({ kind: 'ok', tooLong: false });
  });
});

describe('buildTextPassageLayout: no revision check', () => {
  const passages = (keys: string[], marked: string[] = []) => ({ paragraphKeys: keys, markedKeys: marked, maxQuoteRunes: 300 });

  it('returns null when the paragraph count differs from the keys', () => {
    expect(buildTextPassageLayout('Uno.\nDos.', passages(['a']))).toBeNull();
    expect(buildTextPassageLayout('Uno.', passages(['a', 'b']))).toBeNull();
  });

  it('lines paragraphs up with keys, skipping blank lines, with no chapter revision', () => {
    const layout = buildTextPassageLayout('Uno.\n\nDos.\n', passages(['a', 'b']));
    expect(layout?.chapterRevision).toBeNull();
    expect(layout?.maxQuoteRunes).toBe(300);
    expect(layout?.lines.map((line) => line.key)).toEqual(['a', null, 'b']);
    expect(layout?.lines.every((line) => line.paragraph === null || line.markable)).toBe(true);
  });

  it('does not make repeated or empty keys markable', () => {
    const layout = buildTextPassageLayout('Uno.\nDos.\nTres.\nCuatro.', passages(['a', 'a', '', 'b'], ['a', 'b']));
    expect(layout?.lines.map((line) => line.markable)).toEqual([false, false, false, true]);
    expect(layout?.lines.map((line) => line.marked)).toEqual([false, false, false, true]);
  });

  it('flags the marked keys', () => {
    const layout = buildTextPassageLayout('Uno.\nDos.', passages(['a', 'b'], ['b']));
    expect(layout?.lines.map((line) => line.marked)).toEqual([false, true]);
  });
});
