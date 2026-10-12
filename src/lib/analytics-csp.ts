// CSP sources GA4 needs (Google's published list for GA4 without Signals).
// Shared by the static policy (next.config.ts) and the nonce one (proxy.ts).
export const GA_SCRIPT_SOURCES = 'https://www.googletagmanager.com';
export const GA_HIT_SOURCES =
  'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';
