'use client';

import type { Locale } from '@/lib/i18n';

import { API_BASE_URL } from './config';
import { getFirebaseAuth } from './firebase';

// The only way the browser talks to the backend. The ID token travels in
// the Authorization header and nowhere else: not in storage, not in the URL,
// not in logs. Errors carry a status, never the backend's text.

const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly kind: 'http' | 'network' | 'timeout' | 'signedOut' | 'parse',
  ) {
    super(`api ${kind} ${status}`);
    this.name = 'ApiError';
  }
}

/** Joins path segments, encoding each one: IDs never become paths. */
export function apiPath(...segments: string[]): string {
  return '/' + segments.map((segment) => encodeURIComponent(segment)).join('/');
}

async function send(path: string, token: string, locale: Locale, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': locale,
        Accept: 'application/json',
      },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, signal?.aborted || controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/**
 * GET an authenticated endpoint. On a 401 the token is refreshed once and
 * the request retried, as Firebase tokens expire after an hour.
 */
export async function apiGet(
  path: string,
  { locale, query, signal }: { locale: Locale; query?: Record<string, string | undefined>; signal?: AbortSignal },
): Promise<unknown> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new ApiError(401, 'signedOut');

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  const target = params.size > 0 ? `${path}?${params.toString()}` : path;

  let response = await send(target, await user.getIdToken(), locale, signal);
  if (response.status === 401) {
    response = await send(target, await user.getIdToken(true), locale, signal);
  }
  if (!response.ok) throw new ApiError(response.status, 'http');
  try {
    return await response.json();
  } catch {
    throw new ApiError(response.status, 'parse');
  }
}
