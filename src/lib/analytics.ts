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
// - Page views come from GA4 itself: the first one from `config`, client-side
//   navigations from enhanced measurement (browser history events).
// - Production host only, so local runs and Vercel previews stay out of the
//   data. NEXT_PUBLIC_ANALYTICS_DEBUG=1 sends from any host to DebugView.

export const GA_MEASUREMENT_ID = 'G-GEVG8ZZFS2';

const PRODUCTION_HOSTS = new Set(['inkduel.com']);

// Email action pages carry one-time codes (oobCode) in the URL: GA never loads
// there, so those URLs never reach it.
const EXCLUDED_PREFIXES = ['/auth/', '/reset-password', '/verify-email'];

// Consent Mode: no analytics cookies by default in the EEA, the UK and
// Switzerland (GA4 sends cookieless pings there). Ads storage and signals are
// denied everywhere: InkDuel does not advertise with this data.
const CONSENT_REQUIRED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  'GB', 'CH',
];

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const debug = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1';
let started = false;

// gtag.js only reads the Arguments object, not an array: the rest parameter
// exists for the types, `arguments` is what gets pushed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments);
}

export function isAnalyticsAllowed(hostname: string, pathname: string): boolean {
  if (!debug && !PRODUCTION_HOSTS.has(hostname)) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Loads gtag.js once per document. A no-op off production or on excluded pages. */
export function startAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  if (!isAnalyticsAllowed(window.location.hostname, window.location.pathname)) return;
  started = true;

  window.dataLayer = window.dataLayer ?? [];
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  gtag('consent', 'default', { ...denied, analytics_storage: 'denied', region: CONSENT_REQUIRED_REGIONS });
  gtag('consent', 'default', { ...denied, analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(debug ? { debug_mode: true } : {}),
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

function normalize(params: AnalyticsParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }
  return out;
}

/** Logs one event. Silently dropped off production and on excluded pages. */
export function track(name: string, params: AnalyticsParams = {}): void {
  startAnalytics();
  if (!started) return;
  try {
    gtag('event', name, normalize(params));
  } catch {
    // Analytics must never break the page.
  }
}

/** The InkDuel user id (= Firebase uid), like the app's setUserId; null on sign-out. */
export function setAnalyticsUser(userId: string | null): void {
  startAnalytics();
  if (!started) return;
  gtag('set', { user_id: userId });
}
