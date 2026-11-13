// Marca con cita (web): the pure rules. Spec:
// InkDuel/wiki/technical/marcas-con-cita-spec.md (§3.1, §3.3, §4.1, §5, §6.2).
//
// Keys are computed only by the backend (internal/services/work_chapter_paragraphs.go).
// The browser splits the text with the SAME rule just to line positions up with
// summary.passages.paragraphKeys, and switches the feature off for the chapter
// when the counts or the revision disagree.

import type { ChapterPassages } from './marks';

export const DEFAULT_MAX_QUOTE_RUNES = 300;

/** Where a quoted Marca was started: the `source` of the analytics events. */
export type PassageSource = 'selection' | 'gota' | 'end_cta' | 'margin' | 'a11y';

// ---- the backend's paragraph rule ----

/**
 * Go's unicode.IsSpace, which strings.TrimSpace uses: not JS's trim() (JS also
 * trims U+FEFF and leaves U+0085 alone). Parity matters because a line that
 * one side calls empty and the other does not shifts every later key.
 */
function isGoSpace(char: string): boolean {
  switch (char) {
    case '\t':
    case '\n':
    case '\v':
    case '\f':
    case '\r':
    case ' ':
    case '\u0085':
    case ' ':
    case ' ':
    case ' ':
    case ' ':
    case ' ':
    case ' ':
    case '　':
      return true;
    default:
      return char >= ' ' && char <= ' ';
  }
}

/** strings.TrimSpace. */
export function goTrim(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && isGoSpace(text[start])) start += 1;
  while (end > start && isGoSpace(text[end - 1])) end -= 1;
  return text.slice(start, end);
}

/** The lines of the text as the backend sees them: CRLF folded, split on «\n». */
export function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n');
}

/** Non-empty trimmed lines, in order: one per paragraph key. */
export function splitParagraphs(content: string): string[] {
  const paragraphs: string[] = [];
  for (const line of splitLines(content)) {
    const trimmed = goTrim(line);
    if (trimmed !== '') paragraphs.push(trimmed);
  }
  return paragraphs;
}

/** Length in Unicode code points (Go runes). */
export const runeCount = (text: string): number => Array.from(text).length;

// ---- layout ----

export type PassageLine = {
  /** Position among ALL lines of the text (blank ones included). */
  index: number;
  /** The original line, untrimmed: the same text StoryText draws. */
  text: string;
  /** Position among the paragraphs, null on a blank line. */
  paragraph: number | null;
  key: string | null;
  /** The key appears exactly once: only then can a Marca sit on it. */
  markable: boolean;
  /** The server says this paragraph has a visible thread. */
  marked: boolean;
};

export type PassageLayout = {
  lines: PassageLine[];
  maxQuoteRunes: number;
  /** null for layouts of texts that have no chapter revision (duel stories). */
  chapterRevision: number | null;
};

/** What a text layout needs from the backend, with or without a chapter. */
export type TextPassages = { paragraphKeys: string[]; markedKeys: string[]; maxQuoteRunes: number };

/**
 * The feature is on for a chapter only when the summary brought `passages`,
 * the paragraph count here equals paragraphKeys.length, and the chapter text
 * on screen is the revision the keys belong to. Anything else: null, and the
 * reader draws exactly what it drew before.
 */
export function buildPassageLayout(
  content: string,
  revision: number | null,
  passages: ChapterPassages | null,
): PassageLayout | null {
  if (!passages || revision === null || revision !== passages.chapterRevision) return null;
  const layout = buildTextPassageLayout(content, passages);
  return layout && { ...layout, chapterRevision: passages.chapterRevision };
}

/** Same layout rules with no revision check: the caller vouches the keys belong to this text. */
export function buildTextPassageLayout(content: string, passages: TextPassages): PassageLayout | null {
  const raw = splitLines(content);
  // A trailing newline is not a line of its own (pre-line draws none either).
  if (raw.length > 1 && raw[raw.length - 1] === '') raw.pop();
  const paragraphs = raw.filter((line) => goTrim(line) !== '').length;
  if (paragraphs !== passages.paragraphKeys.length) return null;

  const occurrences = new Map<string, number>();
  for (const key of passages.paragraphKeys) occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  const marked = new Set(passages.markedKeys);

  let paragraph = 0;
  const lines = raw.map<PassageLine>((text, index) => {
    if (goTrim(text) === '') return { index, text, paragraph: null, key: null, markable: false, marked: false };
    const key = passages.paragraphKeys[paragraph];
    const unique = key !== '' && occurrences.get(key) === 1;
    const line = { index, text, paragraph, key, markable: unique, marked: unique && marked.has(key) };
    paragraph += 1;
    return line;
  });
  return { lines, maxQuoteRunes: passages.maxQuoteRunes, chapterRevision: null };
}

export const lineOfKey = (layout: PassageLayout, key: string): PassageLine | null =>
  layout.lines.find((line) => line.key === key && line.markable) ?? null;

// ---- selection ----

export type SelectionResult =
  | { kind: 'none' }
  /** Crosses paragraphs, or leaves the text: «Dejar una Marca» is not offered. */
  | { kind: 'cross' }
  | { kind: 'ok'; line: PassageLine; key: string; quote: string; tooLong: boolean; rect: DOMRect };

export const LINE_ATTRIBUTE = 'data-passage-line';

const EMPTY_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) } as DOMRect;

/**
 * What the browser selection means for the chapter. The quote is the text of
 * the selected DOM, trimmed at the ends — never altered and never cut: a
 * selection past the limit is reported as tooLong and the caller refuses it.
 */
export function resolveSelection(range: Range | null, root: HTMLElement | null, layout: PassageLayout): SelectionResult {
  if (!range || !root || range.collapsed) return { kind: 'none' };
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return { kind: 'cross' };

  const selected: { line: PassageLine; text: string; part: Range }[] = [];
  root.querySelectorAll<HTMLElement>(`[${LINE_ATTRIBUTE}]`).forEach((element) => {
    if (!range.intersectsNode(element)) return;
    const part = element.ownerDocument.createRange();
    part.selectNodeContents(element);
    // Clamp the line to the selection, then read what is left of it.
    if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) part.setStart(range.startContainer, range.startOffset);
    if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) part.setEnd(range.endContainer, range.endOffset);
    const text = part.toString();
    if (goTrim(text) === '') return;
    const line = layout.lines[Number(element.getAttribute(LINE_ATTRIBUTE))];
    if (line) selected.push({ line, text, part });
  });

  if (selected.length === 0) return { kind: 'none' };
  if (selected.length > 1) return { kind: 'cross' };
  const [{ line, text, part }] = selected;
  // Range geometry is not there in every environment (jsdom): the bar then has no place.
  const rect = typeof part.getBoundingClientRect === 'function' ? part.getBoundingClientRect() : EMPTY_RECT;
  // A repeated paragraph cannot be marked: nothing to offer.
  if (!line.markable || !line.key) return { kind: 'none' };
  const quote = goTrim(text);
  return { kind: 'ok', line, key: line.key, quote, tooLong: runeCount(quote) > layout.maxQuoteRunes, rect };
}

/** Where the quote sits inside its original line, for the brief highlight. First occurrence. */
export function quoteRange(lineText: string, quote: string | null): { start: number; end: number } | null {
  if (!quote) return null;
  const start = lineText.indexOf(quote);
  return start < 0 ? null : { start, end: start + quote.length };
}

// ---- the one-time hint ----
// Per account in this browser, no content (a convenience, never state that
// must persist): both flags live in localStorage, behind try/catch.

const HINT_DISMISSED = 'inkduel-passage-hint-dismissed:';
const HINT_QUOTED = 'inkduel-passage-quoted:';

export type PassageHints = { dismissed: boolean; quoted: boolean };

function readFlag(prefix: string, uid: string): boolean {
  try {
    return window.localStorage.getItem(prefix + uid) === '1';
  } catch {
    return false;
  }
}

function writeFlag(prefix: string, uid: string) {
  try {
    window.localStorage.setItem(prefix + uid, '1');
  } catch {
    // Storage blocked: the hint simply comes back next time.
  }
}

export function readPassageHints(uid: string): PassageHints {
  if (!uid) return { dismissed: true, quoted: true };
  return { dismissed: readFlag(HINT_DISMISSED, uid), quoted: readFlag(HINT_QUOTED, uid) };
}

export function dismissPassageHint(uid: string) {
  if (uid) writeFlag(HINT_DISMISSED, uid);
}

/** The reader's first quoted Marca: both the strip and the end line retire. */
export function markPassageQuoted(uid: string) {
  if (uid) writeFlag(HINT_QUOTED, uid);
}
