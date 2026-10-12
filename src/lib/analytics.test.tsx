import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(debug: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ANALYTICS_DEBUG', debug ? '1' : '');
  return import('./analytics');
}

const entries = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
const sent = () => JSON.stringify(entries());
const go = (url: string) => window.history.pushState({}, '', url);
const setReferrer = (value: string) => Object.defineProperty(document, 'referrer', { value, configurable: true });

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.dataLayer;
  document.head.innerHTML = '';
  setReferrer('');
  go('/');
});

describe('URL hygiene', () => {
  it('sanitizes paths and URLs', async () => {
    const { sanitizePath, sanitizeUrl } = await load(false);
    const origin = 'https://inkduel.com';
    expect(sanitizePath('/friend-challenge/abc123')).toBe('/friend-challenge/[token]');
    expect(sanitizePath('/work/w1/chapter/c1')).toBe('/work/w1/chapter/c1');
    expect(sanitizeUrl('https://inkduel.com/auth/action?mode=resetPassword&oobCode=S3CRET#x', origin)).toBe(
      'https://inkduel.com/auth/action',
    );
    expect(sanitizeUrl('https://inkduel.com/friend-challenge/T0KEN?ref=1', origin)).toBe(
      'https://inkduel.com/friend-challenge/[token]',
    );
    expect(sanitizeUrl('https://www.google.com/search?q=private', origin)).toBe('https://www.google.com/');
    expect(sanitizeUrl('', origin)).toBe('');
    expect(sanitizeUrl('https://inkduel.com/?utm_source=ig&utm_campaign=otono&email=a%40b.com&oobCode=S', origin)).toBe(
      'https://inkduel.com/?utm_source=ig&utm_campaign=otono',
    );
    expect(sanitizeUrl('android-app://com.google.android.gm/', origin)).toBe('');
  });

  it('never loads on production pages whose URL can carry a secret', async () => {
    const { isAnalyticsAllowed } = await load(false);
    expect(isAnalyticsAllowed('inkduel.com', '/')).toBe(true);
    expect(isAnalyticsAllowed('inkduel.com', '/me/works')).toBe(true);
    for (const path of ['/auth/action', '/reset-password', '/verify-email', '/friend-challenge/T0KEN']) {
      expect(isAnalyticsAllowed('inkduel.com', path)).toBe(false);
    }
    expect(isAnalyticsAllowed('localhost', '/')).toBe(false);
    expect(isAnalyticsAllowed('landing-git-x.vercel.app', '/')).toBe(false);
  });

  it('direct load of a sensitive URL: gtag never starts', async () => {
    const { trackPageView, track } = await load(true);
    for (const url of ['/friend-challenge/T0KEN?x=1', '/auth/action?mode=verifyEmail&oobCode=S3CRET', '/reset-password?oobCode=S3CRET']) {
      go(url);
      trackPageView();
      track('anything');
    }
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector('script')).toBeNull();
  });

  it('starts later on an ordinary page, without leaking the sensitive referrer', async () => {
    const { trackPageView } = await load(true);
    setReferrer('http://localhost:3000/friend-challenge/T0KEN?oobCode=S3CRET');
    go('/auth/action?oobCode=S3CRET');
    trackPageView();
    go('/?from=email');
    trackPageView();
    expect(sent()).not.toMatch(/T0KEN|S3CRET|from=email/);
    expect(entries()).toContainEqual([
      'event',
      'page_view',
      {
        page_location: `${window.location.origin}/`,
        page_referrer: `${window.location.origin}/friend-challenge/[token]`,
        page_title: '/',
      },
    ]);
  });

  it('SPA navigation into sensitive URLs: every hit carries the sanitized location', async () => {
    const { trackPageView, track } = await load(true);
    const origin = window.location.origin;
    document.title = 'Mi relato S3CRETO — InkDuel';
    go('/me?next=%2Fwork');
    trackPageView();
    go('/friend-challenge/T0KEN?k=v#frag');
    trackPageView();
    track('custom_after');
    go('/auth/action?mode=resetPassword&oobCode=S3CRET&apiKey=K3Y');
    trackPageView();

    expect(sent()).not.toMatch(/T0KEN|S3CRET|K3Y|k=v|frag|next=|relato/);
    const config = entries().find((e) => e[0] === 'config');
    expect(config?.[2]).toMatchObject({ send_page_view: false, page_location: `${origin}/me` });
    const views = entries().filter((e) => e[0] === 'event' && e[1] === 'page_view');
    expect(views.map((e) => e[2])).toEqual([
      { page_location: `${origin}/me`, page_referrer: '', page_title: '/me' },
      { page_location: `${origin}/friend-challenge/[token]`, page_referrer: `${origin}/me`, page_title: '/friend-challenge/[token]' },
      { page_location: `${origin}/auth/action`, page_referrer: `${origin}/friend-challenge/[token]`, page_title: '/auth/action' },
    ]);
    // gtag('set') precedes each page_view, so later automatic and custom hits use it.
    const sets = entries().filter((e) => e[0] === 'set' && typeof e[1] === 'object' && 'page_location' in (e[1] as object));
    expect(sets).toHaveLength(3);
  });

  it('one page_view per pathname, not per query change', async () => {
    const { trackPageView } = await load(true);
    go('/stories');
    trackPageView();
    go('/stories?tab=works');
    trackPageView();
    expect(entries().filter((e) => e[1] === 'page_view')).toHaveLength(1);
  });
});

describe('consent and identity', () => {
  it('starts with region consent defaults, ads denied everywhere and no signals', async () => {
    const { track, GA_MEASUREMENT_ID } = await load(true);
    track('work_followed');
    const list = entries();
    expect(list[0]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied', region: expect.arrayContaining(['ES', 'GB', 'CH']) })]);
    expect(list[1]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' }]);
    expect(list[3]).toEqual(['config', GA_MEASUREMENT_ID, expect.objectContaining({ allow_google_signals: false, allow_ad_personalization_signals: false })]);
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });

  it('identifies only with a known country outside the consent regions', async () => {
    const { identifyAllowedForCountry } = await load(false);
    expect(identifyAllowedForCountry('AR')).toBe(true);
    expect(identifyAllowedForCountry('mx')).toBe(true);
    for (const value of ['ES', 'DE', 'GB', 'CH', 'NO', '', null, undefined, 'XXX', '1']) {
      expect(identifyAllowedForCountry(value)).toBe(false);
    }
  });

  it('sends user_id only when identification is allowed', async () => {
    const { setAnalyticsUser } = await load(true);
    const user = { id: 'uid-1', rankTier: 'Escriba', wins: 0, losses: 0 };
    setAnalyticsUser(user, false);
    expect(sent()).not.toContain('uid-1');
    expect(entries().at(-1)).toEqual(['set', { user_id: null }]);
    setAnalyticsUser(user, true);
    expect(entries().at(-1)).toEqual(['set', { user_id: 'uid-1' }]);
    setAnalyticsUser(null, true);
    expect(entries().at(-1)).toEqual(['set', { user_id: null }]);
  });

  it('derives the app duel params from the profile', async () => {
    const { setAnalyticsUser, duelProfileParams } = await load(false);
    expect(duelProfileParams()).toEqual({});
    setAnalyticsUser({ id: 'u', rankTier: 'Escriba', wins: 0, losses: 0 }, false);
    expect(duelProfileParams()).toEqual({ is_first_duel: 'yes', rank_tier: 'Escriba' });
    setAnalyticsUser({ id: 'u', rankTier: '', wins: 1, losses: 2 }, false);
    expect(duelProfileParams()).toEqual({ is_first_duel: 'no', rank_tier: null });
  });
});

describe('track', () => {
  it('does nothing off production', async () => {
    const { track } = await load(false);
    track('work_followed');
    expect(window.dataLayer).toBeUndefined();
  });

  it('sends booleans as 1/0 and drops empty params', async () => {
    const { track } = await load(true);
    track('ink_mark_created', { work_id: 'w1', is_reply: false, is_author: true, order_index: null });
    expect(entries().at(-1)).toEqual(['event', 'ink_mark_created', { work_id: 'w1', is_reply: 0, is_author: 1 }]);
  });
});
