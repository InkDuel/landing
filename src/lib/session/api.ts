'use client';

import type { Locale } from '@/lib/i18n';

import { API_BASE_URL } from './config';
import { getFirebaseAuth } from './firebase';

// The only way the browser talks to the backend. The ID token travels in
// the Authorization header and nowhere else: not in storage, not in the URL,
// not in logs. Errors carry a status, never the backend's text — except a
// 409's body, which the chapter autosave needs (the author's own text), and
// explicitly allowlisted machine codes used by Ranked's recovery flow.

const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly kind: 'http' | 'network' | 'timeout' | 'signedOut' | 'parse',
    /** A 409 conflict snapshot, or an explicitly allowlisted feature code. */
    readonly data?: unknown,
  ) {
    super(`api ${kind} ${status}`);
    this.name = 'ApiError';
  }
}

/** Retryable failures: network, timeout, rate limit, unavailable. */
export function isTransient(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === 'network' || error.kind === 'timeout' || error.status === 429 || error.status === 503 || error.status === 502 || error.status === 504)
  );
}

/** Joins path segments, encoding each one: IDs never become paths. */
export function apiPath(...segments: string[]): string {
  return '/' + segments.map((segment) => encodeURIComponent(segment)).join('/');
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  locale: Locale;
  query?: Record<string, string | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  /** Lets a best-effort save outlive the page (pagehide). */
  keepalive?: boolean;
  /** Only these known machine codes may reach feature-specific error mapping. */
  errorCodes?: readonly string[];
};

async function send(method: Method, path: string, token: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Accept-Language': options.locale,
    Accept: 'application/json',
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'strict-origin-when-cross-origin',
      keepalive: options.keepalive,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, options.signal?.aborted || controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

/**
 * Calls an authenticated endpoint. On a 401 the token is refreshed once and
 * the request retried, as Firebase tokens expire after an hour. Returns the
 * parsed JSON body, or null for an empty (204) response.
 */
export async function apiRequest(method: Method, path: string, options: RequestOptions): Promise<unknown> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new ApiError(401, 'signedOut');

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value) params.set(key, value);
  }
  const target = params.size > 0 ? `${path}?${params.toString()}` : path;

  let response = await send(method, target, await user.getIdToken(), options);
  if (response.status === 401) {
    response = await send(method, target, await user.getIdToken(true), options);
  }
  if (!response.ok) {
    let data: unknown;
    if (response.status === 409 || options.errorCodes) {
      try {
        data = await response.json();
        if (response.status !== 409) {
          const code = typeof data === 'object' && data && 'error' in data ? String(data.error) : '';
          data = options.errorCodes?.includes(code) ? { error: code } : undefined;
        }
      } catch {
        data = undefined;
      }
    }
    throw new ApiError(response.status, 'http', data);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, 'parse');
  }
}

export function apiGet(path: string, options: Omit<RequestOptions, 'body' | 'keepalive'>): Promise<unknown> {
  return apiRequest('GET', path, options);
}

/** A route param as the user typed it (Next may hand it over encoded). */
export function decodeParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] ?? '' : value ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
