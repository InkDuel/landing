import { describe, expect, it, vi } from 'vitest';

import { CHAPTER_LIMITS, ChapterAutosave, type ChapterEditorState } from './chapter-autosave';
import { DEFAULT_LIMITS, parseOverview } from './studio/models';
import { runeLength, WORK_LIMITS } from './works';

// Chapter length limit raised to 10,000 (vault: wiki/technical/
// editor-de-capitulos-app-spec.md §12). The backend is the authority
// (MaxChapterContent); these tests keep every web copy of the limit in step
// and pin how a length is counted.

// The counting table shared with the backend (work_chapter_limit_test.go) and
// the app (chapter_limits_test.dart): Go len([]rune), JS Array.from and Dart
// runes must agree on every row. Keep the three copies in sync.
const RUNE_CASES: ReadonlyArray<[string, string, number]> = [
  ['ascii', 'a', 1],
  ['spanish ñ (2 bytes)', 'ñ', 1],
  ['emoji (4 bytes, 2 UTF-16 units)', '🙂', 1],
  ['precomposed é', 'é', 1],
  ['decomposed é (e + combining accent)', 'é', 2],
  ['flag (two regional indicators)', '🇦🇷', 2],
  ['family (ZWJ sequence)', '👩‍👩‍👧', 5],
  ['CJK', '漢字', 2],
  ['CRLF', '\r\n', 2],
  ['raya de diálogo', '—', 1],
];

const base: ChapterEditorState = {
  workId: 'w',
  chapterId: 'c',
  isNew: false,
  orderIndex: 1,
  published: true,
  localContent: 'texto',
  localTitle: '',
  savedContent: 'texto',
  savedTitle: '',
  savedRevision: 3,
  status: 'saved',
  invalid: null,
  conflict: null,
};

function engineWithPatch() {
  const patch = vi.fn(async (_c: string, _t: string, expected: number) => ({ revision: expected + 1, orderIndex: 1, published: true }));
  const engine = new ChapterAutosave(
    base,
    { add: vi.fn(), patch, remove: vi.fn(), readConflict: () => null, isTransient: () => false },
    { debounceMs: 10, minGapMs: 10, backoffBaseMs: 10, backoffMaxMs: 10 },
  );
  return { engine, patch };
}

describe('chapter length limit (10,000)', () => {
  it('is the same value everywhere on the web', () => {
    expect(WORK_LIMITS.chapterContent).toBe(10000);
    expect(CHAPTER_LIMITS.maxContent).toBe(WORK_LIMITS.chapterContent);
    expect(DEFAULT_LIMITS.publishBody).toBe(WORK_LIMITS.chapterContent);
    // Studio drafts keep their own, larger limit.
    expect(DEFAULT_LIMITS.draftBody).toBe(40000);
  });

  it.each(RUNE_CASES)('counts %s like the backend', (_name, text, runes) => {
    expect(runeLength(text)).toBe(runes);
  });

  it.each(['a', 'ñ', '🙂', '—'])('the classic editor saves exactly 10,000 × %s and refuses one more without sending', async (unit) => {
    const { engine, patch } = engineWithPatch();
    const exact = unit.repeat(WORK_LIMITS.chapterContent);
    engine.setContent(exact);
    expect(engine.getState().invalid).toBeNull();
    await expect(engine.flush()).resolves.toBe(true);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(runeLength(patch.mock.calls[0][0])).toBe(10000);

    engine.setContent(exact + unit);
    expect(engine.getState().invalid).toBe('tooLong');
    await expect(engine.flush()).resolves.toBe(false);
    expect(patch).toHaveBeenCalledTimes(1);
    engine.dispose();
  });

  it('counts a decomposed accent as two characters, like the backend', () => {
    const { engine } = engineWithPatch();
    engine.setContent('é'.repeat(5000));
    expect(engine.getState().invalid).toBeNull();
    engine.setContent('é'.repeat(5001));
    expect(engine.getState().invalid).toBe('tooLong');
    engine.dispose();
  });

  it('Studio publishes up to what the server says, not the web default', () => {
    const overview = (publishBody: number) =>
      parseOverview({ work: { id: 'w', title: 'Obra' }, limits: { draftBody: 40000, publishBody } });
    // A backend still on 5,000 (before its deploy) keeps Studio at 5,000…
    expect(overview(5000)?.limits.publishBody).toBe(5000);
    // …and one on 10,000 opens it, with no web deploy needed.
    expect(overview(10000)?.limits.publishBody).toBe(10000);
  });
});
