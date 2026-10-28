import { describe, expect, it } from 'vitest';

import { initialOf } from './player-identity';

describe('initialOf', () => {
  it('uppercases the first letter', () => {
    expect(initialOf('beto')).toBe('B');
    expect(initialOf('  ñandú')).toBe('Ñ');
  });

  it('skips a leading @ (comments pass handles)', () => {
    expect(initialOf('@beto')).toBe('B');
    expect(initialOf('@@ tinta')).toBe('T');
  });

  it('falls back to ? when nothing is left', () => {
    expect(initialOf('')).toBe('?');
    expect(initialOf('@')).toBe('?');
  });
});
