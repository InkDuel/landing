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
// Who is measured (geolocation is not consent; it only keeps GA4 off where it
// would need consent we do not collect yet):
// - EEA, UK, Switzerland, and any visitor whose country is unknown: GA4 never
//   loads and nothing is sent. /api/analytics-region answers from Vercel's geo
//   header; until it answers, calls wait in a small queue, and a "no" (or any
//   failure) discards them. Public pages stay static.
// - Everywhere else: GA4 with analytics cookies (_ga client id), the events
//   below, sanitized URLs and, when signed in, user_id = the InkDuel uid.
// - Always: ad storage, ad user data, ad personalization and Google signals
//   denied. The EEA/UK/CH consent default stays as a second layer in case
//   Google's geolocation disagrees with Vercel's.
//
// URLs and sensitive pages. GA4 never sees a raw URL from this site:
// - page_location / page_referrer are set by us, always sanitized: no hash,
//   no query except utm_* campaign tags, and the invitation token of
//   /friend-challenge/{token} replaced. page_title is the sanitized path:
//   document titles carry story titles (user text). gtag('set') makes every
//   later hit (custom and automatic) carry them.
// - Page views are manual (send_page_view: false), one per pathname change.
// - gtag.js does not load while the real URL can carry a secret (email action
//   codes, invitation tokens). If a client-side navigation reaches one of
//   those pages later, GA4 is suspended there with window['ga-disable-<id>']
//   (checked by gtag.js on every hit, automatic ones included): no page view,
//   no event, and the next page's referrer is the last ordinary page.
// - Verified against the live stream config (2026-10-12), which has history
//   events enabled: with send_page_view false gtag.js sends no history page
//   views, so nothing duplicates the manual ones.

export const GA_MEASUREMENT_ID = 'G-GEVG8ZZFS2';

const PRODUCTION_HOSTS = new Set(['inkduel.com']);

/** Pages whose real URL can carry a secret: GA4 never loads or sends there. */
const SENSITIVE_PREFIXES = ['/auth/', '/reset-password', '/verify-email', '/friend-challenge/'];

export const CONSENT_REQUIRED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'GB', 'CH',
];

/** GA4 (and user_id) only for a known country outside the consent regions. */
export function analyticsAllowedForCountry(country: string | null | undefined): boolean {
  const code = (country ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !CONSENT_REQUIRED_REGIONS.includes(code);
}

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const debug = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1';
const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
const REGION_CACHE_KEY = 'inkduel.analytics.measure';
const QUEUE_LIMIT = 50;

/** idle: not started; checking: waiting for the region; on/off: decided. */
let gate: 'idle' | 'checking' | 'on' | 'off' = 'idle';
let queue: Array<() => void> = [];
/** The region said yes; boot waits if that answer found a sensitive page. */
let measureAllowed = false;
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

/** Runs now once GA4 is on, later while the region is pending, never when off. */
function whenReady(run: () => void): void {
  if (gate === 'on') run();
  else if (gate === 'checking' && queue.length < QUEUE_LIMIT) queue.push(run);
}

/** Whether this visitor may be measured; any doubt (or failure) is a no. */
async function measureThisVisitor(): Promise<boolean> {
  try {
    const cached = window.sessionStorage.getItem(REGION_CACHE_KEY);
    if (cached === '1' || cached === '0') return cached === '1';
  } catch {
    // Storage blocked: ask the server.
  }
  try {
    const response = await fetch('/api/analytics-region', { cache: 'no-store', credentials: 'same-origin' });
    const data: unknown = response.ok ? await response.json() : null;
    const measure = typeof data === 'object' && data !== null && (data as { measure?: unknown }).measure === true;
    try {
      window.sessionStorage.setItem(REGION_CACHE_KEY, measure ? '1' : '0');
    } catch {
      // Not cached: the next page load asks again.
    }
    return measure;
  } catch {
    return false;
  }
}

function boot(): void {
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

/**
 * Decides once per document, on the first ordinary production page, whether
 * GA4 loads (see "Who is measured" above).
 */
export function startAnalytics(): void {
  if (gate !== 'idle' || typeof window === 'undefined') return;
  if (!isAnalyticsAllowed(window.location.hostname, window.location.pathname)) return;
  gate = 'checking';
  void measureThisVisitor().then((measure) => {
    if (gate !== 'checking') return;
    if (!measure) {
      gate = 'off';
      queue = [];
      return;
    }
    measureAllowed = true;
    bootIfOrdinaryPage();
  });
}

const onSensitivePage = () => isSensitivePath(window.location.pathname);

/**
 * Loads gtag.js and flushes the queue, but never on a sensitive page: if the
 * region answers while the user is on one, the next ordinary page view boots.
 */
function bootIfOrdinaryPage(): void {
  if (gate !== 'checking' || !measureAllowed || onSensitivePage()) return;
  boot();
  gate = 'on';
  const pending = queue;
  queue = [];
  pending.forEach((run) => run());
}

/**
 * One page_view per pathname, with sanitized location and referrer. On a
 * sensitive page it suspends GA4 instead (every hit, automatic ones included).
 */
export function trackPageView(): void {
  if (typeof window === 'undefined') return;
  const sensitive = onSensitivePage();
  window[DISABLE_KEY] = sensitive;
  if (sensitive) return;
  startAnalytics();
  if (gate !== 'checking' && gate !== 'on') return;
  const origin = window.location.origin;
  const path = sanitizePath(window.location.pathname);
  if (path === lastPagePath) return;
  const pageLocation = sanitizeUrl(window.location.href, origin);
  if (lastPagePath?.endsWith('/chapter/new') && path.startsWith(lastPagePath.slice(0, -'new'.length))) {
    // The chapter editor swaps /chapter/new for the created chapter's URL
    // (replaceState, same screen): adopt it without another page_view.
    lastPagePath = path;
    lastPageLocation = pageLocation;
    whenReady(() => gtag('set', { page_location: pageLocation, page_title: path }));
    return;
  }
  const pageReferrer = lastPageLocation ?? sanitizeUrl(document.referrer, origin);
  lastPagePath = path;
  lastPageLocation = pageLocation;
  const page = { page_location: pageLocation, page_referrer: pageReferrer, page_title: path };
  whenReady(() => {
    gtag('set', page);
    gtag('event', 'page_view', page);
  });
  bootIfOrdinaryPage();
}

function normalize(params: AnalyticsParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }
  return out;
}

/** Logs one event. Dropped off production, on sensitive pages and where GA4 is off. */
export function track(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === 'undefined' || onSensitivePage()) return;
  startAnalytics();
  const payload = normalize(params);
  whenReady(() => {
    try {
      gtag('event', name, payload);
    } catch {
      // Analytics must never break the page.
    }
  });
}

// What duel events need from the signed-in profile (the app reads the same
// fields: rank_tier, and is_first_duel from wins + losses).
let profile: { rankTier: string; completedDuels: number } | null = null;

export type AnalyticsUser = { id: string; rankTier: string; wins: number; losses: number };

/**
 * Signed-in profile for event params, and user_id like the app's setUserId.
 * [identify] comes from the session layout's server-side country check, the
 * same rule as /api/analytics-region (a second layer). null on sign-out.
 */
export function setAnalyticsUser(user: AnalyticsUser | null, identify: boolean): void {
  profile = user ? { rankTier: user.rankTier, completedDuels: user.wins + user.losses } : null;
  if (typeof window === 'undefined') return;
  startAnalytics();
  const userId = user && identify ? user.id : null;
  whenReady(() => gtag('set', { user_id: userId }));
}

/** `is_first_duel` ('yes'/'no', the app's values) and `rank_tier`, when known. */
export function duelProfileParams(): AnalyticsParams {
  if (!profile) return {};
  return { is_first_duel: profile.completedDuels > 0 ? 'no' : 'yes', rank_tier: profile.rankTier || null };
}

/** Test-only: forget module state between cases. */
export function resetAnalyticsForTests(): void {
  gate = 'idle';
  queue = [];
  measureAllowed = false;
  lastPageLocation = null;
  lastPagePath = null;
  profile = null;
}
