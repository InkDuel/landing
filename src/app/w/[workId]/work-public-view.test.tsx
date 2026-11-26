import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { workPaperColor } from '@/components/reading/work-cover';
import type { PublicWork, PublicWorkChapter } from '@/lib/public-api';

import { loginToChapterHref, WorkPublicView } from './work-public-view';

vi.mock('@/components/shell/localized-shell', () => ({
  LocalizedShell: ({ children }: { children: (locale: 'es') => React.ReactNode }) => <>{children('es')}</>,
}));

const work: PublicWork = {
  id: 'w1',
  title: 'La casa de los relojes parados',
  authorId: 'a1',
  authorDisplayName: '@noe_tinta',
  language: 'es',
  synopsis: 'Doce relojes.',
  genres: ['mystery'],
  completionStatus: 'ongoing',
  publishedChapterCount: 2,
  lastActivityAt: '2026-11-26T00:00:00Z',
  freeChapterId: 'c1',
  chapters: [
    { id: 'c1', title: 'La herencia', orderIndex: 1 },
    { id: 'c2', title: '', orderIndex: 2 },
  ],
};
const free: PublicWorkChapter = { id: 'c1', title: 'La herencia', orderIndex: 1, position: 1, locked: false, content: 'La carta llegó un martes.' };

afterEach(cleanup);

describe('WorkPublicView', () => {
  it('shows the ficha, the whole first chapter and asks for an account for the next', () => {
    render(<WorkPublicView work={work} freeChapter={free} initialLocale="es" resolveOnClient={false} />);
    expect(screen.getAllByText('La casa de los relojes parados').length).toBeGreaterThan(0);
    expect(screen.getByText('Misterio')).toBeTruthy();
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.getByText('Doce relojes.')).toBeTruthy();
    expect(screen.getByText('La carta llegó un martes.')).toBeTruthy();
    expect(screen.getByText('Sigue leyendo con tu cuenta')).toBeTruthy();
    const login = screen.getByText('Entrar').closest('a');
    expect(login?.getAttribute('href')).toBe(loginToChapterHref('w1', 'c2'));
    expect(screen.getByText('Con cuenta')).toBeTruthy();
  });

  it('a one-chapter work has no account gate', () => {
    render(<WorkPublicView work={{ ...work, chapters: [work.chapters[0]], publishedChapterCount: 1 }} freeChapter={free} initialLocale="es" resolveOnClient={false} />);
    expect(screen.queryByText('Sigue leyendo con tu cuenta')).toBeNull();
  });

  it('not found', () => {
    render(<WorkPublicView work={null} freeChapter={null} initialLocale="es" resolveOnClient={false} />);
    expect(screen.getByText('Esta obra no existe o ya no está publicada.')).toBeTruthy();
  });
});

describe('links and covers', () => {
  it('«Entrar» comes back to the signed-in reader at that chapter', () => {
    expect(loginToChapterHref('w1', 'c2')).toBe('/login?next=%2Fwork%2Fw1%2Fchapter%2Fc2');
  });

  it('the cover paper uses the same hash as the app spine', () => {
    // Same algorithm as historiasSpineColor (app) and spineClass (web).
    expect(workPaperColor('w1')).toBe(workPaperColor('w1'));
    expect(['#e9b4c4', '#b4c1ee', '#ead592', '#7c88b8', '#ede4cf']).toContain(workPaperColor('anything'));
  });
});
