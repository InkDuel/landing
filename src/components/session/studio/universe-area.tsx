'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cx } from '@/components/ink/cx';
import { GraphIcon, MapPinIcon, NoteIcon, UsersIcon } from '@/components/ink/icons';

import { UNIVERSE_TABS, type UniverseTab, useUniverseCopy, useUniverseRoute } from './universe-common';
import { CharactersTab, NotesTab, PlacesTab } from './universe-lists';
import { RelationsTab } from './universe-relations';

// Universe (PRD §8): characters, places, lore notes and relationships, all
// private to the author. The sub-navigation, the open entry and the filters'
// scope live in the URL (?area=universe&tab=…&item=…), so Back, reloads and
// links land where they should.

const ICONS: Record<UniverseTab, ReactNode> = {
  characters: <UsersIcon size={20} />,
  places: <MapPinIcon size={20} />,
  notes: <NoteIcon size={20} />,
  relations: <GraphIcon size={20} />,
};

export function UniverseArea() {
  const copy = useUniverseCopy();
  const route = useUniverseRoute();

  return (
    <div className="flex flex-col gap-5 pb-8">
      <nav aria-label={copy.nav.label} className="flex flex-col gap-2">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {UNIVERSE_TABS.map((tab) => {
            const current = tab === route.tab;
            return (
              <li key={tab}>
                <Link
                  href={route.hrefFor({ tab })}
                  replace
                  scroll={false}
                  aria-current={current ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    route.go({ tab });
                  }}
                  className={cx(
                    'ink-focus ink-dim inline-flex min-h-11 items-center gap-2 rounded-pill border-quiet px-4 type-button-sm no-underline',
                    current ? 'border-outline bg-inverse text-inverse' : 'border-control bg-surface text-primary',
                  )}
                >
                  {ICONS[tab]}
                  {copy.nav[tab]}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="type-caption text-secondary">{copy.nav.privacy}</p>
      </nav>

      {route.tab === 'characters' ? <CharactersTab /> : null}
      {route.tab === 'places' ? <PlacesTab /> : null}
      {route.tab === 'notes' ? <NotesTab /> : null}
      {route.tab === 'relations' ? <RelationsTab /> : null}
    </div>
  );
}
