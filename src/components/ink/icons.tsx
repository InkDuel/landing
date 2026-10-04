// Stroke icons (02: stroke 2, sizes 16 · 20 · 24). Inline SVG, no icon
// library. Decorative by default: the text next to them carries the meaning.

import type { SVGProps } from 'react';

type IconProps = { size?: 16 | 20 | 24 } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

function Svg({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Svg>
  );
}

export function AppleLogo({ size = 20 }: { size?: 16 | 20 | 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16.4 12.6c0-2 1.6-3 1.7-3.1-.9-1.4-2.3-1.6-2.8-1.6-1.2-.1-2.3.7-2.9.7s-1.5-.7-2.5-.7c-1.3 0-2.5.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.6-.7s1.6.7 2.7.7 1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4 0 0-2.2-.9-2.2-3zM14.5 6.6c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.5 1 .1 2-.5 2.5-1.2z"
      />
    </svg>
  );
}

/** Google Play mark in its own brand colours (store guideline). */
export function GooglePlayLogo({ size = 20 }: { size?: 16 | 20 | 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#00C3FF" d="M4.5 3.4c-.3.3-.5.8-.5 1.4v14.4c0 .6.2 1.1.5 1.4l8-8.6-8-8.6z" />
      <path fill="#00F076" d="m13.1 11.4 2.3-2.5L6.5 3.8c-.6-.4-1.1-.5-1.6-.5l8.2 8.1z" />
      <path fill="#FFD400" d="m13.1 12.6-8.2 8.1c.5.1 1-.1 1.6-.5l8.9-5.1-2.3-2.5z" />
      <path fill="#FF3A44" d="m19.3 11-3.2-1.8-2.5 2.8 2.5 2.8 3.2-1.8c1-.6 1-1.4 0-2z" />
    </svg>
  );
}
