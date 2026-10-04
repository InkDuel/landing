// Validates redirect targets that come from the URL (e.g. Firebase's
// `continueUrl`). Targets are parsed, never string-matched, and anything
// that is not explicitly allowed falls back to the home page.

const FALLBACK = '/';
const SITE_ORIGIN = 'https://inkduel.com';
const ALLOWED_WEB_HOSTS = new Set(['inkduel.com']);
const APP_SCHEME = 'inkduel:';

function isRelativePath(value: string): boolean {
  // `//host` and `/\host` are protocol-relative URLs, not paths.
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
}

function parse(value: string, base?: string): URL | null {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

/**
 * Returns a safe href for [raw], or `/` when it is missing, malformed or
 * points anywhere outside the allowlist:
 * - same-origin relative paths (`/story/abc`);
 * - `https://inkduel.com/...`;
 * - the app scheme (`inkduel://...`).
 */
export function safeRedirectHref(raw: string | null | undefined): string {
  if (!raw) return FALLBACK;

  // URLSearchParams already decodes once; links that were encoded twice
  // still arrive percent-encoded. Every candidate is validated below.
  let candidate = raw.trim();
  if (/%[0-9a-f]{2}/i.test(candidate)) {
    try {
      candidate = decodeURIComponent(candidate).trim();
    } catch {
      return FALLBACK;
    }
  }
  if (!candidate) return FALLBACK;

  if (isRelativePath(candidate)) {
    const url = parse(candidate, SITE_ORIGIN);
    if (!url || url.origin !== SITE_ORIGIN) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const url = parse(candidate);
  if (!url || url.username || url.password) return FALLBACK;

  if (url.protocol === 'https:' && ALLOWED_WEB_HOSTS.has(url.hostname) && url.port === '') {
    return url.href;
  }

  if (url.protocol === APP_SCHEME) {
    return url.href;
  }

  return FALLBACK;
}

/**
 * Where to go after signing in: only a same-origin path inside the site,
 * never back to /login. Anything else lands on Historias.
 */
export function postLoginHref(raw: string | null | undefined): string {
  const href = safeRedirectHref(raw);
  if (!href.startsWith('/') || href === '/' || href.startsWith('/login')) return '/stories';
  return href;
}
