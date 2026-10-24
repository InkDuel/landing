import { type NextRequest, NextResponse } from 'next/server';

import { GA_HIT_SOURCES, GA_SCRIPT_SOURCES } from '@/lib/analytics-csp';
import { API_BASE_URL, firebaseWebConfig } from '@/lib/session/config';

// Strict CSP with a per-request nonce, only for the signed-in area — /login,
// /me and /me/*, /stories, /profile/*, /work/* (founder
// decision B, 2026-10-04). Those pages render per request anyway; the public
// pages keep the static policy from next.config.ts and their CDN cache.
//
// Firebase Auth needs: its REST APIs (connect-src), the auth handler of the
// authDomain in an iframe (frame-src) and Google's gapi loader for the popup
// flow (allowed through 'strict-dynamic' from our nonced scripts). GA4's
// gtag.js is inserted by our own code, so 'strict-dynamic' trusts it too; its
// host stays listed for browsers without 'strict-dynamic'.

const isDev = process.env.NODE_ENV === 'development';

function sessionPolicy(nonce: string): string {
  const authDomain = firebaseWebConfig.authDomain ? `https://${firebaseWebConfig.authDomain}` : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com ${GA_SCRIPT_SOURCES}${isDev ? " 'unsafe-eval'" : ''}`,
    // Styles keep 'unsafe-inline': next/font and React style attributes.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${GA_HIT_SOURCES}`,
    "font-src 'self'",
    [
      "connect-src 'self'",
      API_BASE_URL,
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://firebaseinstallations.googleapis.com',
      'https://firebaseremoteconfig.googleapis.com',
      GA_HIT_SOURCES,
      isDev ? 'ws: wss:' : '',
      isDev && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ? `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}` : '',
    ]
      .filter(Boolean)
      .join(' '),
    `frame-src ${authDomain || "'none'"}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = sessionPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  // Private pages: never cached by a CDN or the browser's back-forward store.
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    {
      source: '/(login|me|stories|ranked)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    {
      source: '/(me|profile|work|duels)/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
