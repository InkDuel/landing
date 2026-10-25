import React from 'react';
import { cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/session/api';
import { studioApi } from '@/lib/session/studio/api';
import { DEFAULT_LIMITS, type ManuscriptEntry, parseEntity, type StudioOverview } from '@/lib/session/studio/models';
import { studioAnalytics } from '@/lib/session/studio/studio-analytics';
import { StudioStore } from '@/lib/session/studio/studio-store';

import { PLAN_VIEW_KEY } from './plan-common';
import { PlanArea } from './plan-area';
import { type StudioContextValue, StudioProvider } from './studio-context';

const nav = vi.hoisted(() => ({ search: new URLSearchParams(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.replace }),
  useSearchParams: () => nav.search,
  usePathname: () => '/me/works/w1',
}));

const stamp = { deleted: false, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z' };
const scene = (id: string, order: number, fields: Record<string, unknown>, revision = 3) => ({
  id,
  order,
  revision,
  ...stamp,
  fields: { status: 'idea', ...fields },
});

const ANA = 'char-ana';
const BETO = 'char-beto';
const FARO = 'place-faro';
const A = 'sc-a';
const B = 'sc-b';
const C = 'sc-c';

let scenes: unknown[] = [];
const characters = [
  { id: ANA, order: 0, revision: 1, ...stamp, fields: { name: 'Ana' } },
  { id: BETO, order: 0, revision: 1, ...stamp, fields: { name: 'Beto' } },
];
const places = [{ id: FARO, order: 0, revision: 1, ...stamp, fields: { name: 'El faro' } }];

const entry = (id: string, title: string): ManuscriptEntry => ({
  id,
  chapterId: id,
  orderIndex: 1,
  published: true,
  chapterTitle: title,
  chapterRevision: 1,
  chapterWordCount: 100,
  chapterCharCount: 500,
  seededFromDuel: false,
  draft: null,
  publishedChanged: false,
});

function mountPlan() {
  const store = new StudioStore('w1', () => 'es');
  const toast = vi.fn();
  const value: StudioContextValue = {
    workId: 'w1',
    uid: 'u1',
    locale: 'es',
    overview: { manuscript: [entry('d1', 'La llegada')] } as unknown as StudioOverview,
    limits: DEFAULT_LIMITS,
    store,
    area: 'plan',
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
  render(
    <StudioProvider value={value}>
      <PlanArea />
    </StudioProvider>,
  );
  return { store, toast, value };
}


/** jsdom has no layout: stack the cards of a list 100 px apart so the pointer has somewhere to be. */
function stackRows(container: HTMLElement) {
  Array.from(container.querySelectorAll<HTMLElement>('[data-plan-card]')).forEach((card, i) => {
    card.getBoundingClientRect = () => ({ top: i * 100, bottom: i * 100 + 100, height: 100, left: 0, right: 300, width: 300, x: 0, y: i * 100, toJSON: () => ({}) }) as DOMRect;
  });
}
/** jsdom has no DragEvent, so the pointer position is attached by hand. */
function dragAt(type: 'dragOver' | 'drop', target: HTMLElement, clientY: number) {
  const event = createEvent[type](target, { dataTransfer: transfer() });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(target, event);
}
const transfer = () => ({ setData: () => {}, setDragImage: () => {}, effectAllowed: 'move', dropEffect: 'move' });

const titles = () => within(screen.getByRole('list', { name: 'Escenas en el orden de tu plan' })).getAllByRole('listitem').map((li) => li.querySelector('[data-move="open"]')?.textContent ?? '');

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

beforeEach(() => {
  nav.search = new URLSearchParams('area=plan');
  nav.replace.mockReset();
  try {
    window.localStorage.clear();
    window.localStorage.setItem(PLAN_VIEW_KEY, 'list');
  } catch {
    // No storage here: the default (list) is what these tests want anyway.
  }
  scenes = [
    scene(A, 1024, {
      title: 'Llegada al puerto',
      synopsis: 'Ana desembarca.',
      povCharacterId: ANA,
      characterIds: [ANA, BETO, 'gone-character'],
      placeId: FARO,
      chapterDraftId: 'd1',
      subplot: 'La carta',
      tags: ['mar'],
    }),
    scene(B, 2048, { title: 'El mensaje', status: 'planned' }),
    scene(C, 3072, { title: 'La traición', povCharacterId: 'gone-character', placeId: 'gone-place' }),
  ];
  vi.spyOn(studioApi, 'listEntities').mockImplementation((async (_w: string, kind: string) => ({
    items: ((kind === 'scenes' ? scenes : kind === 'characters' ? characters : kind === 'places' ? places : []) as unknown[]).map(
      (raw) => parseEntity(kind as 'scenes', raw)!,
    ),
    nextCursor: null,
  })) as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Plan · list', () => {
  it('lists the cards in plan order with their names, and says the order is private', async () => {
    mountPlan();
    expect(await screen.findByText('Llegada al puerto')).toBeTruthy();
    expect(titles().map((t) => t.split('Idea')[0].split('Planificada')[0])).toEqual([
      expect.stringContaining('Llegada al puerto'),
      expect.stringContaining('El mensaje'),
      expect.stringContaining('La traición'),
    ]);
    expect(screen.getByText('Este orden es tu plan privado: no cambia el orden de los capítulos publicados.')).toBeTruthy();
    expect(screen.getByText('3 escenas')).toBeTruthy();
    // Ids are resolved against the live characters, places and manuscript; unknown ones are ignored.
    expect(screen.getByText('Punto de vista: Ana')).toBeTruthy();
    expect(screen.getByText('Con Ana, Beto')).toBeTruthy();
    expect(screen.getByText('En El faro')).toBeTruthy();
    expect(screen.getByText('Capítulo vinculado: La llegada')).toBeTruthy();
    expect(screen.queryByText(/gone-/)).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Escenas en el orden de tu plan' })).getByText('La carta')).toBeTruthy();
    // The subplot summary is derived from the cards themselves.
    expect(within(screen.getByText('Subtramas').closest('details')!).getByText('1 escena')).toBeTruthy();
    // Counts by status.
    const summary = screen.getByRole('list', { name: 'Escenas' });
    expect(summary.textContent).toContain('Idea 2');
    expect(summary.textContent).toContain('Planificada 1');
  });

  it('moves a card down with the keyboard buttons using its neighbours in the global plan', async () => {
    const moveScene = vi.spyOn(studioApi, 'moveScene').mockImplementation((async (_w: string, id: string) =>
      parseEntity('scenes', scene(id, 2560, { title: 'Llegada al puerto' }))!) as never);
    mountPlan();
    await screen.findByText('Llegada al puerto');

    expect(screen.getByRole('button', { name: 'Subir «Llegada al puerto» en el plan' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Bajar «Llegada al puerto» en el plan' }));

    await waitFor(() => expect(moveScene).toHaveBeenCalledTimes(1));
    expect(moveScene).toHaveBeenCalledWith('w1', A, { afterId: B, beforeId: C }, { locale: 'es' });
    // The card moved at once and the screen reader is told.
    await waitFor(() => expect(titles()[0]).toContain('El mensaje'));
    expect(titles()[1]).toContain('Llegada al puerto');
    expect(await screen.findByText('«Llegada al puerto» ahora es la escena 2 de 3.')).toBeTruthy();
  });

  it('in a filtered view, lands after the VISIBLE predecessor, not after a hidden card', async () => {
    const moveScene = vi.spyOn(studioApi, 'moveScene').mockImplementation((async (_w: string, id: string) =>
      parseEntity('scenes', scene(id, 4096, { title: 'Llegada al puerto' }))!) as never);
    mountPlan();
    await screen.findByText('Llegada al puerto');

    // «Planificada» (El mensaje) is hidden: the author sees Llegada and La traición.
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'idea' } });
    expect(screen.getByText('2 de 3 escenas')).toBeTruthy();
    expect(screen.queryByText('El mensaje')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Bajar «Llegada al puerto» en el plan' }));
    await waitFor(() => expect(moveScene).toHaveBeenCalledTimes(1));
    expect(moveScene).toHaveBeenCalledWith('w1', A, { afterId: C, beforeId: null }, { locale: 'es' });
  });

  it('drops a dragged card at the slot under the pointer (drag is optional: the buttons do the same)', async () => {
    const moveScene = vi.spyOn(studioApi, 'moveScene').mockImplementation((async (_w: string, id: string) =>
      parseEntity('scenes', scene(id, 0, { title: 'La traición' }))!) as never);
    mountPlan();
    await screen.findByText('Llegada al puerto');
    const list = screen.getByRole('list', { name: 'Escenas en el orden de tu plan' });
    stackRows(list);

    const grip = screen.getByTitle('Arrastrar «La traición»');
    fireEvent.dragStart(grip, { dataTransfer: transfer() });
    dragAt('dragOver', list, 10); // above the first card
    dragAt('drop', list, 10);

    await waitFor(() => expect(moveScene).toHaveBeenCalledTimes(1));
    expect(moveScene).toHaveBeenCalledWith('w1', C, { afterId: null, beforeId: A }, { locale: 'es' });
  });

  it('puts the card back and says so when the move fails', async () => {
    vi.spyOn(studioApi, 'moveScene').mockRejectedValue(new ApiError(0, 'network'));
    const { toast } = mountPlan();
    await screen.findByText('Llegada al puerto');
    fireEvent.click(screen.getByRole('button', { name: 'Bajar «Llegada al puerto» en el plan' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('No se pudo mover la escena. Volvió a su lugar.'));
    expect(titles()[0]).toContain('Llegada al puerto');
  });

  it('searches ignoring case and accents', async () => {
    mountPlan();
    await screen.findByText('Llegada al puerto');
    fireEvent.change(screen.getByLabelText('Buscar escenas'), { target: { value: 'TRAICION' } });
    expect(screen.getByText('La traición')).toBeTruthy();
    expect(screen.queryByText('Llegada al puerto')).toBeNull();
    expect(screen.getByText('1 de 3 escenas')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Buscar escenas'), { target: { value: 'nadie' } });
    expect(screen.getByText('Ninguna escena coincide.')).toBeTruthy();
  });
});

describe('Plan · board', () => {
  it('changes status from the keyboard menu without touching the plan order', async () => {
    window.localStorage.setItem(PLAN_VIEW_KEY, 'board');
    const update = vi.spyOn(studioApi, 'updateEntity').mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) =>
      parseEntity('scenes', scene(id, 1024, fields, 4))!) as never);
    const moveScene = vi.spyOn(studioApi, 'moveScene');
    mountPlan();
    await screen.findByText('Llegada al puerto');

    const planned = screen.getByRole('list', { name: /^Planificada/ });
    expect(within(planned).getByText('El mensaje')).toBeTruthy();
    expect(within(planned).queryByText('Llegada al puerto')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Opciones para mover «Llegada al puerto»' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mover «Llegada al puerto» a Planificada' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('w1', 'scenes', A, 3, expect.objectContaining({ status: 'planned', title: 'Llegada al puerto' }), { locale: 'es' });
    expect(moveScene).not.toHaveBeenCalled();
    await waitFor(() => expect(within(screen.getByRole('list', { name: /^Planificada/ })).getByText('Llegada al puerto')).toBeTruthy());
    expect(await screen.findByText('«Llegada al puerto» pasó a Planificada.')).toBeTruthy();
  });

  it('drops a card into another column at the pointer: status first, then its place among that column’s cards', async () => {
    window.localStorage.setItem(PLAN_VIEW_KEY, 'board');
    const calls: string[] = [];
    const update = vi.spyOn(studioApi, 'updateEntity').mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) => {
      calls.push('update');
      return parseEntity('scenes', scene(id, 1024, fields, 4))!;
    }) as never);
    const moveScene = vi.spyOn(studioApi, 'moveScene').mockImplementation((async (_w: string, id: string) => {
      calls.push('move');
      return parseEntity('scenes', scene(id, 2560, { title: 'Llegada al puerto', status: 'planned' }, 4))!;
    }) as never);
    mountPlan();
    await screen.findByText('Llegada al puerto');
    const planned = screen.getByRole('list', { name: /^Planificada/ });
    stackRows(planned);

    fireEvent.dragStart(screen.getByTitle('Arrastrar «Llegada al puerto»'), { dataTransfer: transfer() });
    dragAt('dragOver', planned, 500); // below «El mensaje»
    dragAt('drop', planned, 500);

    await waitFor(() => expect(moveScene).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('w1', 'scenes', A, 3, expect.objectContaining({ status: 'planned' }), { locale: 'es' });
    expect(moveScene).toHaveBeenCalledWith('w1', A, { afterId: B, beforeId: C }, { locale: 'es' });
    expect(calls).toEqual(['update', 'move']);
  });
});

describe('Plan · scene sheet', () => {
  it('creates a card once per success, counts only that success, and never publishes', async () => {
    nav.search = new URLSearchParams('area=plan&item=new');
    const create = vi
      .spyOn(studioApi, 'createEntity')
      .mockRejectedValueOnce(new ApiError(0, 'network'))
      .mockImplementation((async (_w: string, _k: string, id: string, fields: Record<string, unknown>) =>
        parseEntity('scenes', scene(id, 4096, fields, 1))!) as never);
    const created = vi.spyOn(studioAnalytics, 'sceneCreated').mockImplementation(() => {});
    const { toast } = mountPlan();

    const save = await screen.findByRole('button', { name: 'Guardar' });
    expect((save as HTMLButtonElement).disabled).toBe(true); // nothing typed yet
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Un nuevo comienzo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo guardar. Revisa tu conexión; tus cambios siguen aquí.')).toBeTruthy();
    expect(created).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/^Título/) as HTMLInputElement).value).toBe('Un nuevo comienzo');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledWith('w1');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][2]).toBe(create.mock.calls[0][2]); // a retry is the same create
    expect(toast).toHaveBeenCalledWith('Escena creada.');
    expect(String(nav.replace.mock.calls.at(-1)?.[0])).not.toContain('item=');
  });

  it('opens the card of a deep link, saves under its revision and links a chapter without creating one', async () => {
    nav.search = new URLSearchParams(`area=plan&item=${B}`);
    const update = vi.spyOn(studioApi, 'updateEntity').mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) =>
      parseEntity('scenes', scene(id, 2048, fields, 4))!) as never);
    const createDraft = vi.spyOn(studioApi, 'createDraft');
    mountPlan();

    expect(await screen.findByDisplayValue('El mensaje')).toBeTruthy();
    expect(screen.getByText(/no publica nada ni crea un capítulo/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Capítulo vinculado'), { target: { value: 'd1' } });
    expect(screen.getByRole('button', { name: 'Abrir capítulo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('w1', 'scenes', B, 3, expect.objectContaining({ chapterDraftId: 'd1', title: 'El mensaje' }), { locale: 'es' });
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('keeps the author’s text on a 409 and re-saves against the current revision', async () => {
    nav.search = new URLSearchParams(`area=plan&item=${B}`);
    const current = scene(B, 2048, { title: 'El mensaje (servidor)', status: 'planned' }, 7);
    const update = vi
      .spyOn(studioApi, 'updateEntity')
      .mockRejectedValueOnce(new ApiError(409, 'http', { code: 'entity_conflict', current }))
      .mockImplementation((async (_w: string, _k: string, id: string, _rev: number, fields: Record<string, unknown>) =>
        parseEntity('scenes', scene(id, 2048, fields, 8))!) as never);
    mountPlan();

    fireEvent.change(await screen.findByLabelText(/^Título/), { target: { value: 'El mensaje mío' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Esta escena cambió en otro lugar')).toBeTruthy();
    expect((screen.getByLabelText(/^Título/) as HTMLInputElement).value).toBe('El mensaje mío');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar la mía de todos modos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar la mía' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][3]).toBe(7);
    expect(update.mock.calls[1][4]).toEqual(expect.objectContaining({ title: 'El mensaje mío' }));
  });
});

describe('Plan · empty state and templates', () => {
  beforeEach(() => {
    scenes = [];
  });

  it('is calm and optional, and a template only adds cards after saying which', async () => {
    const create = vi
      .spyOn(studioApi, 'createEntity')
      .mockImplementation((async (_w: string, _k: string, id: string, fields: Record<string, unknown>) =>
        parseEntity('scenes', scene(id, 1024, fields, 1))!) as never);
    const created = vi.spyOn(studioAnalytics, 'sceneCreated').mockImplementation(() => {});
    const { toast } = mountPlan();

    expect(await screen.findByText('Puedes escribir sin planificar.')).toBeTruthy();
    expect(screen.getByText('Cuando quieras, organiza aquí tus escenas.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir escena' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Usar una plantilla' }));
    const dialog = await screen.findByRole('dialog', { name: 'Plantillas', hidden: true });
    expect(within(dialog).getByText('Se añadirán estas escenas')).toBeTruthy();
    for (const title of ['Planteamiento', 'Detonante', 'Primer punto de giro', 'Confrontación', 'Punto medio', 'Crisis', 'Clímax', 'Desenlace']) {
      expect(within(dialog).getByText(title)).toBeTruthy();
    }
    expect(create).not.toHaveBeenCalled(); // choosing is not applying

    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir 8 escenas' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(8));
    expect(new Set(create.mock.calls.map((c) => c[2])).size).toBe(8);
    expect(create.mock.calls.every((c) => (c[3] as { status: string }).status === 'idea')).toBe(true);
    expect(create.mock.calls.map((c) => (c[3] as { title: string }).title)).toEqual([
      'Planteamiento', 'Detonante', 'Primer punto de giro', 'Confrontación', 'Punto medio', 'Crisis', 'Clímax', 'Desenlace',
    ]);
    await waitFor(() => expect(created).toHaveBeenCalledTimes(8));
    expect(toast).toHaveBeenCalledWith('8 escenas añadidas.');
  });

  it('a retry after a failure keeps the same ids and never duplicates what was created', async () => {
    let calls = 0;
    const create = vi.spyOn(studioApi, 'createEntity').mockImplementation((async (_w: string, _k: string, id: string, fields: Record<string, unknown>) => {
      calls += 1;
      if (calls === 3) throw new ApiError(0, 'network');
      return parseEntity('scenes', scene(id, 1024 * calls, fields, 1))!;
    }) as never);
    const created = vi.spyOn(studioAnalytics, 'sceneCreated').mockImplementation(() => {});
    mountPlan();

    fireEvent.click(await screen.findByRole('button', { name: 'Usar una plantilla' }));
    const dialog = await screen.findByRole('dialog', { name: 'Plantillas', hidden: true });
    fireEvent.click(within(dialog).getByLabelText(/Relato breve/));
    expect(within(dialog).getByText('Complicación')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir 4 escenas' }));

    expect(await within(dialog).findByText('Se añadieron 2 de 4 escenas. Vuelve a intentarlo: las que ya existen no se duplican.')).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(3);
    expect(created).toHaveBeenCalledTimes(2); // only the successes

    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir 4 escenas' }));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(4));
    expect(create).toHaveBeenCalledTimes(5); // the two that existed are not sent again
    const ids = create.mock.calls.map((c) => c[2]);
    expect(ids[3]).toBe(ids[2]); // the failed one is retried under its own id
    expect(new Set(ids).size).toBe(4);
  });
});
