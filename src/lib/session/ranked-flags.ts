'use client';

import { getApp } from '@firebase/app';
import { getFirebaseAuth } from './firebase';

/** Same Remote Config key/default as Flutter. Backend gates remain authoritative. */
export async function rankedAsyncEnabled(): Promise<boolean> {
  try {
    if (!getFirebaseAuth()) return false;
    const { getRemoteConfig, fetchAndActivate, getBoolean, isSupported } = await import('@firebase/remote-config');
    if (!(await isSupported())) return false;
    const config = getRemoteConfig(getApp());
    config.defaultConfig = { ...config.defaultConfig, ranked_async_enabled: false };
    config.settings = { fetchTimeoutMillis: 20_000, minimumFetchIntervalMillis: 15 * 60_000 };
    await fetchAndActivate(config);
    return getBoolean(config, 'ranked_async_enabled');
  } catch {
    return false;
  }
}
