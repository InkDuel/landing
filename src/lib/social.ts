// Profile social links (Instagram, X, TikTok), as the app builds them.
// Handles are re-validated here with the backend's own rules
// (internal/models/social_handle.go) before they become a URL: anything
// else is not rendered as a link (23 - Web con cuenta, «Links de usuarios»).

export type SocialPlatform = 'instagram' | 'x' | 'tiktok';

const PATTERNS: Record<SocialPlatform, RegExp> = {
  instagram: /^[A-Za-z0-9_.]{1,30}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  tiktok: /^[A-Za-z0-9_.]{1,24}$/,
};

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
};

/** https URL on the platform's own domain, or null for an invalid handle. */
export function socialProfileUrl(platform: SocialPlatform, rawHandle: string): string | null {
  const handle = rawHandle.trim().replace(/^@/, '');
  if (!PATTERNS[platform].test(handle)) return null;
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`;
  }
}
