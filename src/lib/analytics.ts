// Web analytics: the same GA4 property as the app, through the web data stream
// that Firebase already created for the InkduelWeb app. Events land in the
// same BigQuery export as Android and iOS with platform = 'WEB', so one query
// compares both clients.
//
// - gtag.js, not @firebase/analytics: the Firebase SDK would fetch its config
//   with the Browser key, which is restricted to an exact API list.
// - Event and parameter names copy the app's (AnalyticsEvents/AnalyticsParams
//   in inkduel_mobile) whenever the action is the same one. Booleans go as 1/0,
//   which is how the app's booleans arrive in BigQuery.
// - Never user-written text, usernames or emails. Opaque ids only.
// - Production host only, so local runs and Vercel previews stay out of the
//   data. NEXT_PUBLIC_ANALYTICS_DEBUG=1 sends from any host to DebugView.
//
// URLs. GA4 never sees a raw URL from this site:
// - page_location / page_referrer are set by us, always sanitized: no hash,
//   no query except utm_* campaign tags, and the invitation token of
//   /friend-challenge/{token} replaced. page_title is the sanitized path:
//   document titles carry story titles (user text). gtag('set') makes every
//   later hit (custom and automatic) carry them.
// - Page views are manual (send_page_view: false), one per pathname change.
// - gtag.js does not load while the real URL can carry a secret (email action
//   codes, invitation tokens); it starts on the first ordinary page instead.
// - Verified with the live stream config (2026-10-12): with send_page_view
//   false, GA4 sends no history page views of its own, so nothing duplicates
//   the manual ones and no raw URL goes out on client-side navigation.
//
// Consent Mode, and what each state sends:
// - EEA, UK, Switzerland (analytics_storage denied by default, no banner):
//   cookieless pings only. No _ga cookie and no persistent client id; events
//   keep their name and params, with the sanitized URL. Never a user_id.
// - Everywhere else (analytics_storage granted): the _ga cookie (client id),
//   events, sanitized URLs, and, when signed in, user_id = the InkDuel uid —
//   only if the server saw a country outside those regions (see
//   identifyAllowed in the session layout); unknown country means no user_id.
// - Always: ad storage, ad user data, ad personalization and Google signals
//   denied. InkDuel does not advertise with this data.

export const GA_MEASUREMENT_ID = 'G-GEVG8ZZFS2';

const PRODUCTION_HOSTS = new Set(['inkduel.com']);

/** Pages whose real URL can carry a secret: gtag.js never loads on them. */
const SENSITIVE_PREFIXES = ['/auth/', '/reset-password', '/verify-email', '/friend-challenge/'];

export const CONSENT_REQUIRED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'GB', 'CH',
];

/** user_id needs a known country outside the consent regions (Vercel's geo header). */
export function identifyAllowedForCountry(country: string | null | undefined): boolean {
  const code = (country ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !CONSENT_REQUIRED_REGIONS.includes(code);
}

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const debug = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1';
let started = false;
let lastPageLocation: string | null = null;
let lastPagePath: string | null = null;

// gtag.js only reads the Arguments object, not an array: the rest parameter
// exists for the types, `arguments` is what gets pushed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments);
}

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isAnalyticsAllowed(hostname: string, pathname: string): boolean {
  if (!debug && !PRODUCTION_HOSTS.has(hostname)) return false;
  return !isSensitivePath(pathname);
}

/** The path GA4 may see: the invitation token is never part of it. */
export function sanitizePath(pathname: string): string {
  if (pathname.startsWith('/friend-challenge/')) return '/friend-challenge/[token]';
  return pathname || '/';
}

/** Campaign tags we put in our own links: the only query GA4 may see. */
const CAMPAIGN_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);

/**
 * Same-origin URL: origin + sanitized path (+ utm_* tags). Other http(s) origins: the bare
 * origin. Empty (a direct visit) or anything else: ''. An empty referrer only
 * comes out when the raw one holds nothing of ours to hide.
 */
export function sanitizeUrl(raw: string, origin: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return url.protocol.startsWith('http') ? `${url.origin}/` : '';
    const campaign = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (CAMPAIGN_PARAMS.has(key)) campaign.set(key, value.slice(0, 100));
    });
    const query = campaign.size > 0 ? `?${campaign.toString()}` : '';
    return `${url.origin}${sanitizePath(url.pathname)}${query}`;
  } catch {
    return '';
  }
}

/** Loads gtag.js once per document, on the first ordinary production page. */
export function startAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  if (!isAnalyticsAllowed(window.location.hostname, window.location.pathname)) return;
  started = true;

  const origin = window.location.origin;
  window.dataLayer = window.dataLayer ?? [];
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  gtag('consent', 'default', { ...denied, analytics_storage: 'denied', region: CONSENT_REQUIRED_REGIONS });
  gtag('consent', 'default', { ...denied, analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    page_location: sanitizeUrl(window.location.href, origin),
    page_referrer: sanitizeUrl(document.referrer, origin),
    page_title: sanitizePath(window.location.pathname),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(debug ? { debug_mode: true } : {}),
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** One page_view per pathname, with sanitized location and referrer. */
export function trackPageView(): void {
  startAnalytics();
  if (!started) return;
  const origin = window.location.origin;
  const path = sanitizePath(window.location.pathname);
  if (path === lastPagePath) return;
  const pageLocation = sanitizeUrl(window.location.href, origin);
  const pageReferrer = lastPageLocation ?? sanitizeUrl(document.referrer, origin);
  lastPagePath = path;
  lastPageLocation = pageLocation;
  const page = { page_location: pageLocation, page_referrer: pageReferrer, page_title: path };
  gtag('set', page);
  gtag('event', 'page_view', page);
}

function normalize(params: AnalyticsParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }
  return out;
}

/** Logs one event. Silently dropped off production and on sensitive pages. */
export function track(name: string, params: AnalyticsParams = {}): void {
  startAnalytics();
  if (!started) return;
  try {
    gtag('event', name, normalize(params));
  } catch {
    // Analytics must never break the page.
  }
}

// What duel events need from the signed-in profile (the app reads the same
// fields: rank_tier, and is_first_duel from wins + losses).
let profile: { rankTier: string; completedDuels: number } | null = null;

export type AnalyticsUser = { id: string; rankTier: string; wins: number; losses: number };

/**
 * Signed-in profile for event params, and user_id like the app's setUserId —
 * only when [identify] (see the consent notes above). null on sign-out.
 */
export function setAnalyticsUser(user: AnalyticsUser | null, identify: boolean): void {
  profile = user ? { rankTier: user.rankTier, completedDuels: user.wins + user.losses } : null;
  startAnalytics();
  if (!started) return;
  gtag('set', { user_id: user && identify ? user.id : null });
}

/** `is_first_duel` ('yes'/'no', the app's values) and `rank_tier`, when known. */
export function duelProfileParams(): AnalyticsParams {
  if (!profile) return {};
  return { is_first_duel: profile.completedDuels > 0 ? 'no' : 'yes', rank_tier: profile.rankTier || null };
}

/** Test-only: forget module state between cases. */
export function resetAnalyticsForTests(): void {
  started = false;
  lastPageLocation = null;
  lastPagePath = null;
  profile = null;
}
