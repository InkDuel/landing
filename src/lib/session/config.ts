// Public configuration of the signed-in area. Nothing here is secret: the
// Firebase web config ships to every browser by design (23 - Web con cuenta).

const PRODUCTION_API = 'https://inkduel-backend-production.up.railway.app';

export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** False until the Firebase web app exists and its config is set. */
export const isFirebaseConfigured = Object.values(firebaseWebConfig).every((value) => value.length > 0);

function apiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return PRODUCTION_API;
  try {
    const url = new URL(raw);
    // Only https, or plain http for a local backend during development.
    if (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')) {
      return url.origin;
    }
  } catch {
    // Fall through to production.
  }
  return PRODUCTION_API;
}

export const API_BASE_URL = apiBaseUrl();
