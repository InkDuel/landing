import { describe, expect, it } from 'vitest';

import fixtures from './studio-word-fixtures.json';
import { countChars, countWords, readingMinutes } from './words';

// Same fixtures as inkduel-backend/internal/models/testdata: the editor's
// counters must agree with the limits and stats the backend enforces.
describe('studio word count (shared with Go)', () => {
  it.each(fixtures.cases)('counts %j', ({ text, words, chars }) => {
    expect(countWords(text)).toBe(words);
    expect(countChars(text)).toBe(chars);
  });

  it('estimates reading time, never zero for real text', () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(2300)).toBe(10);
  });
});
