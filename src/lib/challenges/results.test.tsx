import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResultsView, entryHref } from '@/app/challenge/[slug]/results/results-view';

import fixture from './__fixtures__/public_results.json';
import { classifyResultsResponse, mapPublicResults, type PublicResults } from './results';

vi.mock('@/components/shell/localized-shell', () => ({
  LocalizedShell: ({ children }: { children: (locale: 'es') => React.ReactNode }) => <>{children('es')}</>,
}));

afterEach(cleanup);

const ok = () => {
  const outcome = classifyResultsResponse(200, fixture);
  if (outcome.kind !== 'ok') throw new Error('fixture should map');
  return outcome.results;
};

const view = (state: Parameters<typeof ResultsView>[0]['state']) =>
  render(<ResultsView state={state} initialLocale="es" resolveOnClient={false} />);

describe('mapPublicResults', () => {
  it('maps the backend fixture', () => {
    const r = ok();
    expect(r.slug).toBe('consigna-t1-e3');
    expect(r.season).toEqual({ id: 't1', edition: 3, editionsInSeason: 12 });
    expect(r.jury?.entry.author.displayName).toBe('Marina');
    expect(r.jury?.inheritedLine).toBe('La llave pesaba más de lo que parecía.');
    expect(r.favorites).toHaveLength(1);
    expect(r.plumaGuia?.userId).toBe('u_win');
    expect(r.mentions).toHaveLength(1);
    expect(r.next?.openingLine).toMatchObject({ kind: 'inherited', authorDisplayName: 'Marina' });
  });

  it('treats deserted awards as absent and an empty favorites list as none', () => {
    const r = mapPublicResults({
      ...fixture,
      jury: { status: 'deserted' },
      favorites: { status: 'none', entries: [] },
      plumaGuia: { status: 'none' },
      mentions: [],
      next: { ...fixture.next, openingLine: { text: 'Había una vez una puerta.', kind: 'house' } },
    }) as PublicResults;
    expect(r.jury).toBeNull();
    expect(r.favorites).toEqual([]);
    expect(r.plumaGuia).toBeNull();
    expect(r.next?.openingLine).toEqual({ kind: 'house', text: 'Había una vez una puerta.' });
  });

  it('drops entries without author and rejects malformed bodies', () => {
    expect(mapPublicResults({ ...fixture, mentions: [{ entryId: 'x', firstLine: 'a' }] })?.mentions).toEqual([]);
    expect(mapPublicResults(null)).toBeNull();
    expect(mapPublicResults({})).toBeNull();
  });
});

describe('classifyResultsResponse', () => {
  it('maps 409 results_not_published and everything else to not found', () => {
    expect(classifyResultsResponse(409, { code: 'results_not_published' })).toEqual({ kind: 'not_published' });
    expect(classifyResultsResponse(409, { code: 'round_not_open' })).toEqual({ kind: 'not_found' });
    expect(classifyResultsResponse(404, { code: 'challenge_not_found' })).toEqual({ kind: 'not_found' });
    expect(classifyResultsResponse(500, null)).toEqual({ kind: 'not_found' });
    expect(classifyResultsResponse(200, { nope: true })).toEqual({ kind: 'not_found' });
  });

  it('never carries authors outside a 200', () => {
    // Even if a non-200 body contained results, nothing is mapped from it.
    expect(classifyResultsResponse(409, { code: 'results_not_published', ...fixture })).toEqual({ kind: 'not_published' });
    expect(classifyResultsResponse(404, fixture)).toEqual({ kind: 'not_found' });
  });
});

describe('ResultsView', () => {
  it('shows the waiting page with no author or story', () => {
    const { container } = view({ kind: 'not_published' });
    expect(screen.getByText(/domingo a las 18:00/)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Los resultados aún no están listos.');
    expect(container.textContent).not.toContain('Marina');
    expect(container.querySelector('a[href^="/u/"]')).toBeNull();
  });

  it('shows not found with no author', () => {
    const { container } = view({ kind: 'not_found' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Resultados no encontrados');
    expect(container.textContent).not.toContain('Marina');
  });

  it('renders awards in order with links to story and profile', () => {
    const { container } = view({ kind: 'ok', results: ok() });
    const titles = Array.from(container.querySelectorAll('h2')).map((h) => h.textContent);
    expect(titles).toEqual(['Premio del jurado', 'Favorito del público', 'Pluma Guía', 'Menciones literarias', 'La próxima Consigna']);
    expect(screen.getAllByText('Lo eligieron sus 3 lectores')).toHaveLength(1);
    expect(container.querySelector('a[href^="/duel/d_123/story/u_win"]')).not.toBeNull();
    expect(container.querySelector('a[href^="/u/u_win"]')).not.toBeNull();
    expect(screen.getByText(/El lunes empieza con:/)).toBeTruthy();
    expect(screen.getByText('Frase heredada de Marina · Abre el 16 de noviembre de 2026')).toBeTruthy();
  });

  it('presents deserted jury, no favorites and the house line', () => {
    const results = mapPublicResults({
      ...fixture,
      jury: { status: 'deserted' },
      favorites: { status: 'none', entries: [] },
      plumaGuia: { status: 'none' },
      mentions: [],
      next: { ...fixture.next, openingLine: { text: 'Nadie sabía quién había dejado la luz.', kind: 'house' } },
    }) as PublicResults;
    const { container } = view({ kind: 'ok', results });
    expect(screen.getByText('Esta semana el jurado no entregó su premio')).toBeTruthy();
    expect(screen.getByText('Esta semana ningún relato fue elegido por todos sus lectores')).toBeTruthy();
    expect(screen.getByText(/Frase de la casa/)).toBeTruthy();
    expect(container.textContent).not.toContain('Pluma Guía');
    expect(container.textContent).not.toContain('Menciones literarias');
  });
});

describe('entryHref', () => {
  it('prefers the duel page, then the story page, else none', () => {
    const author = { userId: 'u 1', displayName: 'A' };
    expect(entryHref({ entryId: 'e', duelId: 'd1', storyId: 's1', firstLine: '', author })).toBe('/duel/d1/story/u%201');
    expect(entryHref({ entryId: 'e', duelId: '', storyId: 's1', firstLine: '', author })).toBe('/story/s1');
    expect(entryHref({ entryId: 'e', duelId: '', storyId: '', firstLine: '', author })).toBeNull();
  });
});
