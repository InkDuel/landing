import { describe, expect, it } from 'vitest';

import { publicCoverUrl, signedCoverUrl } from './covers';

const B = 'https://storage.googleapis.com/inkduel-4540e.firebasestorage.app';

describe('publicCoverUrl', () => {
  it('accepts only covers/public of our bucket', () => {
    expect(publicCoverUrl(`${B}/covers/public/w1/c.jpg`)).toBe(`${B}/covers/public/w1/c.jpg`);
    for (const bad of [
      `${B}/covers/pending/w1/c.jpg?X-Goog-Signature=a`,
      `${B}/other/w1/c.jpg`,
      'https://storage.googleapis.com/another-bucket/covers/public/w1/c.jpg',
      'https://storage.googleapis.com.evil.example/inkduel-4540e.firebasestorage.app/covers/public/c.jpg',
      'https://storage.googleapis.com@evil.example/inkduel-4540e.firebasestorage.app/covers/public/c.jpg',
      `${B}/covers/public/../../another/c.jpg`,
      `${B}/covers/public/%2e%2e/%2e%2e/another/c.jpg`,
      `http://storage.googleapis.com/inkduel-4540e.firebasestorage.app/covers/public/c.jpg`,
      'https://evil.example/x.jpg',
      'javascript:alert(1)',
      '',
      null,
      42,
    ]) {
      expect(publicCoverUrl(bad), String(bad)).toBe('');
    }
  });
});

describe('signedCoverUrl', () => {
  it('accepts only signed covers/pending of our bucket', () => {
    const ok = `${B}/covers/pending/w1/r1_thumb.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc`;
    expect(signedCoverUrl(ok)).toBe(ok);
    for (const bad of [
      `${B}/covers/pending/w1/r1.jpg`,
      `${B}/covers/public/w1/c.jpg?X-Goog-Signature=abc`,
      'https://storage.googleapis.com/another/covers/pending/w1/r1.jpg?X-Goog-Signature=abc',
      'https://storage.googleapis.com.evil.example/inkduel-4540e.firebasestorage.app/covers/pending/r1.jpg?X-Goog-Signature=abc',
      `${B}/covers/pending/../../x/r.jpg?X-Goog-Signature=abc`,
    ]) {
      expect(signedCoverUrl(bad), bad).toBe('');
    }
  });
});
