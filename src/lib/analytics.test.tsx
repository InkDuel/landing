import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(debug: boolean) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ANALYTICS_DEBUG', debug ? '1' : '');
  return import('./analytics');
}

const pushed = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.dataLayer;
  document.head.innerHTML = '';
});

describe('isAnalyticsAllowed', () => {
  it('only allows the production host, outside the email action pages', async () => {
    const { isAnalyticsAllowed } = await load(false);
    expect(isAnalyticsAllowed('inkduel.com', '/')).toBe(true);
    expect(isAnalyticsAllowed('inkduel.com', '/me/works')).toBe(true);
    expect(isAnalyticsAllowed('inkduel.com', '/auth/action')).toBe(false);
    expect(isAnalyticsAllowed('inkduel.com', '/reset-password')).toBe(false);
    expect(isAnalyticsAllowed('inkduel.com', '/verify-email')).toBe(false);
    expect(isAnalyticsAllowed('localhost', '/')).toBe(false);
    expect(isAnalyticsAllowed('landing-git-x.vercel.app', '/')).toBe(false);
  });
});

describe('track', () => {
  it('does nothing off production', async () => {
    const { track } = await load(false);
    track('work_followed');
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector('script')).toBeNull();
  });

  it('starts once with consent defaults, then sends app-shaped params', async () => {
    const { track, setAnalyticsUser, GA_MEASUREMENT_ID } = await load(true);
    track('ink_mark_created', { work_id: 'w1', is_reply: false, is_author: true, order_index: null });
    track('work_followed');
    setAnalyticsUser('uid-1');

    const entries = pushed();
    expect(entries[0]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied', region: expect.arrayContaining(['ES', 'GB']) })]);
    expect(entries[1]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' })]);
    expect(entries[3]).toEqual(['config', GA_MEASUREMENT_ID, expect.objectContaining({ allow_google_signals: false })]);
    expect(entries.slice(4)).toEqual([
      ['event', 'ink_mark_created', { work_id: 'w1', is_reply: 0, is_author: 1 }],
      ['event', 'work_followed', {}],
      ['set', { user_id: 'uid-1' }],
    ]);
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });
});
