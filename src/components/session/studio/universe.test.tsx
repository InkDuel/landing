import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import { studioApi } from '@/lib/session/studio/api';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { DEFAULT_LIMITS, parseEntity, type StudioOverview } from '@/lib/session/studio/models';
import { StudioStore } from '@/lib/session/studio/studio-store';

import { RelationshipGraph } from './relationship-graph';
import { type StudioContextValue, StudioProvider } from './studio-context';
import { UniverseArea } from './universe-area';

const nav = vi.hoisted(() => ({ search: new URLSearchParams(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.replace }),
  useSearchParams: () => nav.search,
  usePathname: () => '/me/works/w1',
}));
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className }: React.PropsWithChildren<{ href: string; replace?: boolean; scroll?: boolean; onClick?: React.MouseEventHandler; className?: string }>) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

const rawCharacter = (id: string, fields: Record<string, unknown>, revision = 3) => ({
  id,
  revision,
  order: 0,
  deleted: false,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-02T10:00:00Z',
  fields: { role: 'protagonist', tags: [], ...fields },
});

const ALVARO = '11111111-1111-4111-8111-111111111111';
const BEATRIZ = '22222222-2222-4222-8222-222222222222';
const CARLOS = '33333333-3333-4333-8333-333333333333';
const roster = [
  rawCharacter(ALVARO, { name: 'Álvaro Peña', summary: 'Un cartógrafo sin mapa.', tags: ['norte'] }),
  rawCharacter(BEATRIZ, { name: 'Beatriz', role: 'antagonist' }),
  rawCharacter(CARLOS, { name: 'Carlos', role: '' }),
];

function mountStudio(ui: React.ReactNode) {
  const store = new StudioStore('w1', () => 'es');
  const toast = vi.fn();
  const value: StudioContextValue = {
    workId: 'w1',
    uid: 'u1',
    locale: 'es',
    overview: {} as StudioOverview,
    limits: DEFAULT_LIMITS,
    store,
    area: 'universe',
    docId: null,
    goTo: vi.fn(async () => true),
    refresh: vi.fn(async () => {}),
    applyDraft: vi.fn(),
    registerEditor: vi.fn(),
    editor: () => null,
    openEntry: vi.fn(async () => true),
    createChapter: vi.fn(async () => null),
    toast,
  };
  render(<StudioProvider value={value}>{ui}</StudioProvider>);
  return { store, toast };
}

beforeAll(() => {
  // jsdom has no modal <dialog>; the sheets only need open/close to exist.
  const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

let relationRows: unknown[] = [];

beforeEach(() => {
  nav.search = new URLSearchParams('area=universe&tab=characters');
  nav.replace.mockReset();
  relationRows = [];
  try {
    window.localStorage.clear();
  } catch {
    // No storage in this environment: the tests below do not need it.
  }
  vi.spyOn(studioApi, 'listEntities').mockImplementation((async (_workId: string, kind: 'characters' | 'relations') => ({
    items:
      kind === 'characters'
        ? roster.map((r) => parseEntity('characters', r)!)
        : kind === 'relations'
          ? relationRows.map((r) => parseEntity('relations', r)!)
          : [],
    nextCursor: null,
  })) as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Universe · characters', () => {
  it('lists the characters and searches ignoring case and accents', async () => {
    mountStudio(<UniverseArea />);
    expect(await screen.findByText('Álvaro Peña')).toBeTruthy();
    expect(screen.getByText('Beatriz')).toBeTruthy();
    expect(screen.getByText('3 personajes')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar personajes'), { target: { value: 'ALVARO pena' } });
    expect(screen.getByText('Álvaro Peña')).toBeTruthy();
    expect(screen.queryByText('Beatriz')).toBeNull();
    expect(screen.queryByText('Carlos')).toBeNull();
    expect(screen.getByText('1 de 3 personajes')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar personajes'), { target: { value: 'nadie' } });
    expect(screen.getByText('Ningún personaje coincide.')).toBeTruthy();
  });

  it('saves with the entity revision and shows the canonical answer', async () => {
    nav.search = new URLSearchParams(`area=universe&tab=characters&item=${BEATRIZ}`);
    const update = vi.spyOn(studioApi, 'updateEntity').mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) =>
      parseEntity('characters', rawCharacter(id, { ...fields, name: String(fields.name).trim() }, 4))!) as never);
    mountStudio(<UniverseArea />);

    const save = await screen.findByRole('button', { name: 'Guardar' });
    expect((save as HTMLButtonElement).disabled).toBe(true); // unchanged

    fireEvent.change(await screen.findByLabelText(/^Nombre/), { target: { value: 'Beatriz Ríos ' } });
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('w1', 'characters', BEATRIZ, 3, expect.objectContaining({ name: 'Beatriz Ríos ', role: 'antagonist' }), { locale: 'es' });
    expect(await screen.findByText('Guardado')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the author’s text on a 409 and re-saves against the current revision', async () => {
    nav.search = new URLSearchParams(`area=universe&tab=characters&item=${BEATRIZ}`);
    const current = rawCharacter(BEATRIZ, { name: 'Beatriz (servidor)', role: 'antagonist' }, 7);
    const update = vi
      .spyOn(studioApi, 'updateEntity')
      .mockRejectedValueOnce(new ApiError(409, 'http', { code: 'entity_conflict', current }))
      .mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) =>
        parseEntity('characters', rawCharacter(id, fields, 8))!) as never);
    mountStudio(<UniverseArea />);

    fireEvent.change(await screen.findByLabelText(/^Nombre/), { target: { value: 'Beatriz mía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Esta ficha cambió en otro lugar')).toBeTruthy();
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('Beatriz mía');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar la mía de todos modos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar la mía' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][3]).toBe(7);
    expect(update.mock.calls[1][4]).toEqual(expect.objectContaining({ name: 'Beatriz mía' }));
    await waitFor(() => expect(screen.queryByText('Esta ficha cambió en otro lugar')).toBeNull());
  });

  it('creates once per success: a failed save keeps the text, the retry reuses the id, analytics fires only on success', async () => {
    nav.search = new URLSearchParams('area=universe&tab=characters&item=new');
    const create = vi
      .spyOn(studioApi, 'createEntity')
      .mockRejectedValueOnce(new ApiError(0, 'network'))
      .mockImplementation((async (_w: string, _k: string, id: string, fields: Record<string, unknown>) =>
        parseEntity('characters', rawCharacter(id, fields, 1))!) as never);
    const created = vi.spyOn(studioAnalytics, 'entityCreated').mockImplementation(() => {});
    const { toast } = mountStudio(<UniverseArea />);

    expect((await screen.findByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Dana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo guardar. Revisa tu conexión; tus cambios siguen aquí.')).toBeTruthy();
    expect(created).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('Dana');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledWith('w1', 'character');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][2]).toBe(create.mock.calls[0][2]);
    expect(toast).toHaveBeenCalledWith('Creado.');
    expect(String(nav.replace.mock.calls.at(-1)?.[0])).not.toContain('item=');
  });

  it('asks before discarding unsaved edits when closing', async () => {
    nav.search = new URLSearchParams(`area=universe&tab=characters&item=${CARLOS}`);
    mountStudio(<UniverseArea />);
    fireEvent.change(await screen.findByLabelText(/^Nombre/), { target: { value: 'Carlos Otro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(await screen.findByText('¿Descartar los cambios?')).toBeTruthy();
    expect(nav.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(String(nav.replace.mock.calls[0][0])).not.toContain('item=');
  });
});

describe('Universe · relationships', () => {
  const rel = (id: string, from: string, to: string, extra: Record<string, unknown> = {}) => ({
    id,
    revision: 1,
    order: 0,
    deleted: false,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z',
    fields: { fromCharacterId: from, toCharacterId: to, type: 'rivalry', label: '', notes: '', directed: true, status: 'active', ...extra },
  });

  it('lists live relations only and remembers the Lista | Grafo choice', async () => {
    nav.search = new URLSearchParams('area=universe&tab=relations');
    relationRows = [
      rel('r1', ALVARO, BEATRIZ, { label: 'Antiguos socios' }),
      rel('r2', CARLOS, '99999999-9999-4999-8999-999999999999'), // character gone or in the trash
    ];
    mountStudio(<UniverseArea />);

    expect(await screen.findByText('Álvaro Peña → Beatriz')).toBeTruthy();
    const list = within(screen.getByRole('list', { name: 'Relaciones entre personajes' }));
    expect(list.getAllByRole('listitem')).toHaveLength(1);
    expect(list.getByText('Antiguos socios')).toBeTruthy();
    expect(list.getByText('Rivalidad')).toBeTruthy();
    expect(list.getByText('Activa')).toBeTruthy();
    expect(screen.getByText('1 relación')).toBeTruthy();
    expect(screen.queryByText(/Carlos →/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar la relación entre Álvaro Peña y Beatriz' })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Grafo'));
    expect(await screen.findByRole('button', { name: 'Álvaro Peña, 1 relación' })).toBeTruthy();
    expect(window.localStorage.getItem('inkduel-studio-relations-view')).toBe('graph');
    fireEvent.click(screen.getByLabelText('Lista'));
    expect(window.localStorage.getItem('inkduel-studio-relations-view')).toBe('list');
  });
});

describe('Relationship graph', () => {
  const people = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Carla' },
  ];
  const relations = [
    { id: 'r1', from: 'a', to: 'b', type: 'rivalry' as const, label: '', directed: true, status: 'active' as const },
    { id: 'r2', from: 'a', to: 'c', type: 'family' as const, label: 'Hermanas', directed: false, status: 'active' as const },
  ];

  it('exposes nodes as buttons that open the character, with the legend written out', () => {
    const open = vi.fn();
    mountStudio(<RelationshipGraph characters={people} relations={relations} isolated={0} onOpenCharacter={open} />);
    const ana = screen.getByRole('button', { name: 'Ana, 2 relaciones' });
    expect(screen.getByRole('button', { name: 'Beto, 1 relación' })).toBeTruthy();
    act(() => ana.focus());
    fireEvent.keyDown(ana, { key: 'Enter' });
    expect(open).toHaveBeenCalledWith('a');
    fireEvent.click(screen.getByRole('button', { name: 'Carla, 1 relación' }));
    expect(open).toHaveBeenCalledWith('c');
    // Colour is never alone: the legend names every type in use.
    const legend = screen.getByRole('region', { name: 'Leyenda' });
    expect(legend.textContent).toContain('Rivalidad');
    expect(legend.textContent).toContain('Familia');
  });
});
