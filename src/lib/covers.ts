// Covers of obras: approved ones are public objects of the bucket; the
// author's pending one and the review queue use short-lived signed URLs on
// the same origin. Shared by server pages, the proxy's CSP and the browser.

/** Where cover images are served from. */
export const COVER_IMAGE_ORIGIN = 'https://storage.googleapis.com';

/** The one bucket covers live in. NEXT_PUBLIC_COVER_BUCKET overrides it for a dev build. */
export const COVER_BUCKET = process.env.NEXT_PUBLIC_COVER_BUCKET || 'inkduel-4540e.firebasestorage.app';

export const PUBLIC_COVER_PREFIX = `${COVER_IMAGE_ORIGIN}/${COVER_BUCKET}/covers/public/`;
export const PENDING_COVER_PREFIX = `${COVER_IMAGE_ORIGIN}/${COVER_BUCKET}/covers/pending/`;

/** Parses and normalizes (dot segments, host case) before any prefix check, so `/covers/public/../x` cannot escape. */
function normalizedUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

/** Approved, public cover of an obra: only `covers/public/` of our bucket is ever drawn on public pages. */
export function publicCoverUrl(value: unknown): string {
  const url = normalizedUrl(value);
  return url && url.href.startsWith(PUBLIC_COVER_PREFIX) ? url.href : '';
}

/** Signed, short-lived URL of a pending cover (review queue, author views): `covers/pending/` of our bucket with a signature. */
export function signedCoverUrl(value: unknown): string {
  const url = normalizedUrl(value);
  if (!url || !url.href.startsWith(PENDING_COVER_PREFIX)) return '';
  return url.searchParams.has('X-Goog-Signature') || url.searchParams.has('Signature') ? url.href : '';
}
