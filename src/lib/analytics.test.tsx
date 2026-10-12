import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const regionFetch = vi.fn<typeof fetch>();

async function load(debug: boolean, measure: boolean | 'error' = true) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ANALYTICS_DEBUG', debug ? '1' : '');
  regionFetch.mockReset();
  if (measure === 'error') regionFetch.mockRejectedValue(new TypeError('network'));
  else regionFetch.mockImplementation(async () => Response.json({ measure }));
  vi.stubGlobal('fetch', regionFetch);
  return import('./analytics');
}

const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const entries = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
const sent = () => JSON.stringify(entries());
const go = (url: string) => window.history.pushState({}, '', url);
const setReferrer = (value: string) => Object.defineProperty(document, 'referrer', { value, configurable: true });
const disabled = () => window['ga-disable-G-GEVG8ZZFS2'];

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.dataLayer;
  delete window['ga-disable-G-GEVG8ZZFS2'];
  document.head.innerHTML = '';
  setReferrer('');
  go('/');
});

describe('who is measured', () => {
  it('only a known country outside the EEA, UK and Switzerland', async () => {
    const { analyticsAllowedForCountry } = await load(false);
    expect(analyticsAllowedForCountry('AR')).toBe(true);
    expect(analyticsAllowedForCountry('mx')).toBe(true);
    for (const value of ['ES', 'DE', 'GB', 'CH', 'NO', 'IS', '', null, undefined, 'XXX', '1']) {
      expect(analyticsAllowedForCountry(value)).toBe(false);
    }
  });

  it.each([
    ['a consent region or unknown country', false],
    ['a failed region request', 'error'],
  ] as const)('%s: GA4 never loads and queued calls are discarded', async (_case, measure) => {
    const { track, trackPageView, setAnalyticsUser } = await load(true, measure);
    trackPageView();
    track('work_followed');
    setAnalyticsUser({ id: 'uid-1', rankTier: '', wins: 0, losses: 0 }, true);
    await settle();
    track('after_decision');
    trackPageView();
    await settle();
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector('script')).toBeNull();
    expect(regionFetch).toHaveBeenCalledTimes(1);
  });

  it('elsewhere: calls made while the region is pending are sent once it answers yes', async () => {
    const { track, trackPageView } = await load(true, true);
    go('/stories?tab=works');
    trackPageView();
    track('work_followed');
    expect(window.dataLayer).toBeUndefined();
    await settle();
    const list = entries();
    expect(list.filter((e) => e[0] === 'event').map((e) => e[1])).toEqual(['page_view', 'work_followed']);
    expect(list.find((e) => e[1] === 'page_view')?.[2]).toMatchObject({ page_location: `${window.location.origin}/stories` });
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });

  it('asks the server once per tab session', async () => {
    const first = await load(true, true);
    first.trackPageView();
    await settle();
    vi.resetModules();
    const second = await import('./analytics');
    second.trackPageView();
    await settle();
    expect(regionFetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('inkduel.analytics.measure')).toBe('1');
  });

  it('starts with ads and signals denied, plus the region consent default as a second layer', async () => {
    const { track, GA_MEASUREMENT_ID } = await load(true);
    track('work_followed');
    await settle();
    const list = entries();
    expect(list[0]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied', region: expect.arrayContaining(['ES', 'GB', 'CH']) })]);
    expect(list[1]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' }]);
    expect(list[3]).toEqual(['config', GA_MEASUREMENT_ID, expect.objectContaining({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })]);
  });
});

describe('URL hygiene', () => {
  it('sanitizes paths and URLs', async () => {
    const { sanitizePath, sanitizeUrl } = await load(false);
    const origin = 'https://inkduel.com';
    expect(sanitizePath('/friend-challenge/abc123')).toBe('/friend-challenge/[token]');
    expect(sanitizePath('/work/w1/chapter/c1')).toBe('/work/w1/chapter/c1');
    expect(sanitizeUrl('https://inkduel.com/auth/action?mode=resetPassword&oobCode=S3CRET#x', origin)).toBe('https://inkduel.com/auth/action');
    expect(sanitizeUrl('https://inkduel.com/friend-challenge/T0KEN?ref=1', origin)).toBe('https://inkduel.com/friend-challenge/[token]');
    expect(sanitizeUrl('https://www.google.com/search?q=private', origin)).toBe('https://www.google.com/');
    expect(sanitizeUrl('', origin)).toBe('');
    expect(sanitizeUrl('https://inkduel.com/?utm_source=ig&utm_campaign=otono&email=a%40b.com&oobCode=S', origin)).toBe(
      'https://inkduel.com/?utm_source=ig&utm_campaign=otono',
    );
    expect(sanitizeUrl('android-app://com.google.android.gm/', origin)).toBe('');
  });

  it('only production hosts and ordinary pages may start GA4', async () => {
    const { isAnalyticsAllowed } = await load(false);
    expect(isAnalyticsAllowed('inkduel.com', '/')).toBe(true);
    for (const path of ['/auth/action', '/reset-password', '/verify-email', '/friend-challenge/T0KEN']) {
      expect(isAnalyticsAllowed('inkduel.com', path)).toBe(false);
    }
    expect(isAnalyticsAllowed('localhost', '/')).toBe(false);
    expect(isAnalyticsAllowed('landing-git-x.vercel.app', '/')).toBe(false);
  });

  it('direct load of a sensitive URL: no region request, no gtag, nothing sent', async () => {
    const { trackPageView, track } = await load(true);
    for (const url of ['/friend-challenge/T0KEN?x=1', '/auth/action?mode=verifyEmail&oobCode=S3CRET', '/reset-password?oobCode=S3CRET']) {
      go(url);
      trackPageView();
      track('anything');
    }
    await settle();
    expect(regionFetch).not.toHaveBeenCalled();
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
    await settle();
    expect(sent()).not.toMatch(/T0KEN|S3CRET|from=email/);
    expect(entries()).toContainEqual([
      'event',
      'page_view',
      { page_location: `${window.location.origin}/`, page_referrer: `${window.location.origin}/friend-challenge/[token]`, page_title: '/' },
    ]);
  });

  it('SPA into a sensitive page suspends GA4: no page view, no event, and the referrer skips it', async () => {
    const { trackPageView, track } = await load(true);
    const origin = window.location.origin;
    document.title = 'Mi relato S3CRETO — InkDuel';
    go('/me?next=%2Fwork');
    trackPageView();
    await settle();
    expect(disabled()).toBe(false);

    go('/friend-challenge/T0KEN?k=v#frag');
    trackPageView();
    track('inside_sensitive');
    expect(disabled()).toBe(true);
    go('/auth/action?mode=resetPassword&oobCode=S3CRET&apiKey=K3Y');
    trackPageView();
    expect(disabled()).toBe(true);

    go('/stories');
    trackPageView();
    track('back_outside');
    expect(disabled()).toBe(false);

    expect(sent()).not.toMatch(/T0KEN|S3CRET|K3Y|k=v|frag|next=|relato|friend-challenge|auth\/action|inside_sensitive/);
    const views = entries().filter((e) => e[0] === 'event' && e[1] === 'page_view');
    expect(views.map((e) => e[2])).toEqual([
      { page_location: `${origin}/me`, page_referrer: '', page_title: '/me' },
      { page_location: `${origin}/stories`, page_referrer: `${origin}/me`, page_title: '/stories' },
    ]);
    expect(entries().at(-1)).toEqual(['event', 'back_outside', {}]);
  });

  it('the editor swapping /chapter/new for the created chapter is the same page view', async () => {
    const { trackPageView, track } = await load(true);
    go('/me/works/w1/chapter/new');
    trackPageView();
    window.history.replaceState({}, '', '/me/works/w1/chapter/c1');
    trackPageView();
    track('work_chapter_created');
    go('/me/works/w1');
    trackPageView();
    await settle();
    const origin = window.location.origin;
    const views = entries().filter((e) => e[1] === 'page_view').map((e) => e[2]);
    expect(views).toEqual([
      { page_location: `${origin}/me/works/w1/chapter/new`, page_referrer: '', page_title: '/me/works/w1/chapter/new' },
      { page_location: `${origin}/me/works/w1`, page_referrer: `${origin}/me/works/w1/chapter/c1`, page_title: '/me/works/w1' },
    ]);
  });

  it('one page_view per pathname, not per query change', async () => {
    const { trackPageView } = await load(true);
    go('/stories');
    trackPageView();
    go('/stories?tab=works');
    trackPageView();
    await settle();
    expect(entries().filter((e) => e[1] === 'page_view')).toHaveLength(1);
  });
});

describe('identity and params', () => {
  it('sends user_id only when identification is allowed', async () => {
    const { setAnalyticsUser } = await load(true);
    const user = { id: 'uid-1', rankTier: 'Escriba', wins: 0, losses: 0 };
    setAnalyticsUser(user, false);
    await settle();
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

  it('does nothing off production', async () => {
    const { track } = await load(false);
    track('work_followed');
    await settle();
    expect(regionFetch).not.toHaveBeenCalled();
    expect(window.dataLayer).toBeUndefined();
  });

  it('sends booleans as 1/0 and drops empty params', async () => {
    const { track } = await load(true);
    track('ink_mark_created', { work_id: 'w1', is_reply: false, is_author: true, order_index: null });
    await settle();
    expect(entries().at(-1)).toEqual(['event', 'ink_mark_created', { work_id: 'w1', is_reply: 0, is_author: 1 }]);
  });
});
