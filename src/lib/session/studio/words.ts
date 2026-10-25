// Editorial counts shared with the backend (internal/models/studio_words.go —
// same algorithm, same fixtures in studio-word-fixtures.json):
//
// - a word is a maximal run of letters, combining marks and numbers;
// - an apostrophe (' ’) or hyphen (- ‐ ‑) between two word characters joins
//   them ("don't", "bien-estar" are one word);
// - every Han, Hiragana or Katakana character counts as one word, an
//   approximation for unspaced CJK text (Korean is spaced and counts normally).
//
// Characters are Unicode code points, exactly what the backend limits count.

const WORD = /[\p{L}\p{M}\p{N}]/u;
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const JOINERS = new Set(["'", '’', '-', '‐', '‑']);

export function countWords(text: string): number {
  const chars = Array.from(text);
  let count = 0;
  let inWord = false;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (UNSPACED.test(ch)) {
      count += 1;
      inWord = false;
    } else if (WORD.test(ch)) {
      if (!inWord) {
        count += 1;
        inWord = true;
      }
    } else if (inWord && JOINERS.has(ch) && i + 1 < chars.length && WORD.test(chars[i + 1]) && !UNSPACED.test(chars[i + 1])) {
      // stays inside the word
    } else {
      inWord = false;
    }
  }
  return count;
}

/** Code points, as Go's []rune counts them. */
export function countChars(text: string): number {
  let n = 0;
  for (const ch of text) n += ch ? 1 : 0;
  return n;
}

/** Estimated reading minutes (230 words per minute), always labelled «estimado». */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 230));
}
