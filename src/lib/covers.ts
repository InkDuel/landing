// Covers of obras: approved ones are public objects of the bucket; the
// author's pending one and the review queue use short-lived signed URLs on
// the same origin. Shared by server pages, the proxy's CSP and the browser.

/** Where cover images are served from. */
export const COVER_IMAGE_ORIGIN = 'https://storage.googleapis.com';

/** Only cover images from the bucket are ever drawn. */
export function coverImageUrl(value: unknown): string {
  return typeof value === 'string' && value.startsWith(`${COVER_IMAGE_ORIGIN}/`) ? value : '';
}
