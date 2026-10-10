import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy, sent as a static header so public pages stay
// static and CDN-cacheable (no per-request nonce in phase 0).
// - 'unsafe-inline' scripts: Next inlines its hydration payload
//   (self.__next_f) without a nonce on static pages.
// - 'unsafe-inline' styles: next/font and React style attributes.
// - 'unsafe-eval' and the dev websocket only in development (Fast Refresh).
// - connect-src: the browser only talks to Firebase Auth's REST API
//   (email action links). Backend fetches happen on the server.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://identitytoolkit.googleapis.com${isDev ? " ws: wss:" : ""}`,
  "media-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // No includeSubDomains: not every inkduel.com subdomain is verified to be
  // HTTPS-only (www does not complete a TLS handshake today).
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // Allows the Google sign-in popup a later phase may open.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The static CSP covers every public page. The signed-in area
      // (/login, /me, /me/*, /stories, /profile/*, /work/*) gets a stricter policy
      // with a per-request nonce from src/proxy.ts instead.
      {
        source: "/((?!login$|me$|me/|stories$|ranked$|duels/|profile/|work/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ];
  },
};

export default nextConfig;
