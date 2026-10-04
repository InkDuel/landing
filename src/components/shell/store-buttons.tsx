import { cx } from '@/components/ink/cx';
import { AppleLogo, GooglePlayLogo } from '@/components/ink/icons';
import type { Locale } from '@/lib/i18n';
import { APP_STORE_URL, GOOGLE_PLAY_URL, SITE_COPY } from '@/lib/site-copy';

/**
 * Store links as inverse buttons (surface.inverse, like the Apple button in
 * Acceso). They are secondary to the page's yellow action when there is one.
 */
export function StoreButtons({ locale, className }: { locale: Locale; className?: string }) {
  const copy = SITE_COPY[locale].stores;
  const stores = [
    { href: APP_STORE_URL, aria: copy.appStoreAria, kicker: copy.appStoreKicker, name: 'App Store', logo: <AppleLogo size={24} /> },
    { href: GOOGLE_PLAY_URL, aria: copy.googlePlayAria, kicker: copy.googlePlayKicker, name: 'Google Play', logo: <GooglePlayLogo size={24} /> },
  ];
  return (
    <ul aria-label={copy.groupAria} className={cx('m-0 flex list-none flex-wrap gap-3 p-0', className)}>
      {stores.map((store) => (
        <li key={store.name} className="min-w-[168px] flex-1 sm:flex-none">
          <a
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={store.aria}
            className="ink-focus ink-dim flex min-h-[52px] items-center gap-3 rounded-button border-brand border-inverse bg-inverse px-4 py-2 text-inverse no-underline"
          >
            {store.logo}
            <span className="flex flex-col text-left leading-none">
              <span className="font-ui text-[11px] font-semibold opacity-80">{store.kicker}</span>
              <span className="font-ui text-[17px] font-extrabold">{store.name}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
