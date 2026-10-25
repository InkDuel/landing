import type { Locale } from '@/lib/i18n';

import type { SceneStatus } from './models';

// Copy of the «Planificar» and «Progreso» areas of InkDuel Studio. Neutral
// Spanish with tuteo (never voseo) is the editorial source; en and pt-BR are
// idiomatic equivalents. Nothing here is typed by the author, so none of it
// may reach analytics either way. Planning is optional and progress is for the
// author alone: no guilt, no ranking, no pressure.

type N = (n: string) => string;
type Plural = (count: number, formatted: string) => string;
const plural =
  (one: string, other: N): Plural =>
  (count, formatted) =>
    count === 1 ? one : other(formatted);

export type TemplateId = 'free' | 'three_acts' | 'short_story';
export type TemplateCard = { title: string; synopsis: string };
export type PlanTemplate = { id: TemplateId; name: string; description: string; cards: readonly TemplateCard[] };

// ---------------------------------------------------------------- Planificar

export type PlanCopy = {
  heading: string;
  privacy: string;
  status: Record<SceneStatus, string>;
  views: { label: string; list: string; board: string };
  add: string;
  templatesButton: string;
  count: Plural;
  countOf: (shown: string, total: string) => string;
  capReached: (max: string) => string;
  loading: string;
  loadError: string;
  retry: string;
  empty: { title: string; message: string; useTemplate: string };
  noMatches: string;
  clearFilters: string;
  unnamed: string;
  untitled: string;
  filters: {
    label: string;
    search: string;
    searchPlaceholder: string;
    status: string;
    allStatuses: string;
    group: string;
    allGroups: string;
    subplot: (name: string) => string;
    tag: (name: string) => string;
    character: string;
    allCharacters: string;
  };
  card: {
    pov: (name: string) => string;
    withCharacters: (names: string) => string;
    atPlace: (name: string) => string;
    chapter: (title: string) => string;
    subplot: (name: string) => string;
  };
  move: {
    dragHint: string;
    dragHandle: (title: string) => string;
    menu: string;
    menuLabel: (title: string) => string;
    up: string;
    down: string;
    upLabel: (title: string) => string;
    downLabel: (title: string) => string;
    toStatus: (status: string) => string;
    toStatusLabel: (title: string, status: string) => string;
    movedTo: (title: string, position: string, total: string) => string;
    statusChanged: (title: string, status: string) => string;
    failed: string;
    statusFailed: string;
    conflict: string;
  };
  layout: {
    listLabel: string;
    boardLabel: string;
    emptyColumn: string;
    dropHere: string;
  };
  subplots: {
    title: string;
    intro: string;
    none: string;
    scenes: Plural;
    show: string;
    showScenes: (name: string) => string;
  };
  templates: {
    title: string;
    description: string;
    choose: string;
    previewTitle: string;
    previewNone: string;
    add: (count: string) => string;
    keepFree: string;
    adding: string;
    partial: (done: string, total: string) => string;
    cap: (max: string) => string;
    done: Plural;
    items: Record<TemplateId, PlanTemplate>;
  };
  sheet: {
    newTitle: string;
    editTitle: string;
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
    close: string;
    cancel: string;
    created: string;
    titleLabel: string;
    titleRequired: string;
    statusLabel: string;
    synopsis: string;
    synopsisHint: string;
    purpose: string;
    purposeHint: string;
    conflict: string;
    conflictHint: string;
    outcome: string;
    outcomeHint: string;
    pov: string;
    povNone: string;
    characters: string;
    charactersSearch: string;
    charactersNone: string;
    charactersSelected: Plural;
    place: string;
    placeNone: string;
    subplot: string;
    subplotHint: string;
    tags: string;
    tagAdd: string;
    tagRemove: (tag: string) => string;
    chapter: string;
    chapterNone: string;
    chapterHint: string;
    openChapter: string;
    unavailable: string;
    notes: string;
    groups: { essentials: string; drama: string; cast: string; organize: string };
    saveFailed: string;
    saveFailedNetwork: string;
    saveFailedInvalid: string;
    saveFailedRate: string;
    capReached: (max: string) => string;
    discardTitle: string;
    discardBody: string;
    discardConfirm: string;
    discardKeep: string;
    conflictTitle: string;
    conflictBody: string;
    viewSaved: string;
    overwrite: string;
    overwriteTitle: string;
    overwriteBody: string;
    overwriteConfirm: string;
    trashAction: string;
    trashTitle: (name: string) => string;
    trashBody: string;
    trashConfirm: string;
    trashed: string;
    trashFailed: string;
  };
};

const es: PlanCopy = {
  heading: 'Escenas',
  privacy: 'Este orden es tu plan privado: no cambia el orden de los capítulos publicados.',
  status: { idea: 'Idea', planned: 'Planificada', draft: 'En borrador', revising: 'En revisión', done: 'Hecha' },
  views: { label: 'Vista de las escenas', list: 'Lista', board: 'Tablero' },
  add: 'Añadir escena',
  templatesButton: 'Plantillas',
  count: plural('1 escena', (n) => `${n} escenas`),
  countOf: (shown, total) => `${shown} de ${total} escenas`,
  capReached: (max) => `Llegaste al máximo de ${max} escenas en esta obra.`,
  loading: 'Cargando…',
  loadError: 'No pudimos cargar tus escenas.',
  retry: 'Reintentar',
  empty: {
    title: 'Puedes escribir sin planificar.',
    message: 'Cuando quieras, organiza aquí tus escenas.',
    useTemplate: 'Usar una plantilla',
  },
  noMatches: 'Ninguna escena coincide.',
  clearFilters: 'Quitar filtros',
  unnamed: 'Sin nombre',
  untitled: 'Escena sin título',
  filters: {
    label: 'Filtrar escenas',
    search: 'Buscar escenas',
    searchPlaceholder: 'Título o sinopsis',
    status: 'Estado',
    allStatuses: 'Todos los estados',
    group: 'Subtrama o etiqueta',
    allGroups: 'Todas',
    subplot: (name) => `Subtrama: ${name}`,
    tag: (name) => `Etiqueta: ${name}`,
    character: 'Personaje',
    allCharacters: 'Todos',
  },
  card: {
    pov: (name) => `Punto de vista: ${name}`,
    withCharacters: (names) => `Con ${names}`,
    atPlace: (name) => `En ${name}`,
    chapter: (title) => `Capítulo vinculado: ${title}`,
    subplot: (name) => `Subtrama: ${name}`,
  },
  move: {
    dragHint: 'Arrastra una escena por su asa o usa los botones para reordenar.',
    dragHandle: (title) => `Arrastrar «${title}»`,
    menu: 'Mover',
    menuLabel: (title) => `Opciones para mover «${title}»`,
    up: 'Subir',
    down: 'Bajar',
    upLabel: (title) => `Subir «${title}» en el plan`,
    downLabel: (title) => `Bajar «${title}» en el plan`,
    toStatus: (status) => `A ${status}`,
    toStatusLabel: (title, status) => `Mover «${title}» a ${status}`,
    movedTo: (title, position, total) => `«${title}» ahora es la escena ${position} de ${total}.`,
    statusChanged: (title, status) => `«${title}» pasó a ${status}.`,
    failed: 'No se pudo mover la escena. Volvió a su lugar.',
    statusFailed: 'No se pudo cambiar el estado. Inténtalo de nuevo.',
    conflict: 'La escena cambió en otro lugar. Mostramos la versión guardada; inténtalo de nuevo.',
  },
  layout: {
    listLabel: 'Escenas en el orden de tu plan',
    boardLabel: 'Escenas por estado',
    emptyColumn: 'Sin escenas',
    dropHere: 'Suelta aquí',
  },
  subplots: {
    title: 'Subtramas',
    intro: 'Se calcula a partir de tus escenas. Escribe una subtrama en cada escena para verla aquí.',
    none: 'Aún no has asignado subtramas.',
    scenes: plural('1 escena', (n) => `${n} escenas`),
    show: 'Ver escenas',
    showScenes: (name) => `Ver las escenas de la subtrama «${name}»`,
  },
  templates: {
    title: 'Plantillas',
    description: 'Las plantillas solo añaden escenas: nunca cambian ni borran las que ya tienes.',
    choose: 'Elige una plantilla',
    previewTitle: 'Se añadirán estas escenas',
    previewNone: 'No se añade ninguna escena. Escribe sin plan y añade escenas cuando quieras.',
    add: (count) => `Añadir ${count} escenas`,
    keepFree: 'Seguir sin plantilla',
    adding: 'Añadiendo…',
    partial: (done, total) => `Se añadieron ${done} de ${total} escenas. Vuelve a intentarlo: las que ya existen no se duplican.`,
    cap: (max) => `Con estas escenas pasarías el máximo de ${max}. Elige una plantilla más corta o borra alguna escena.`,
    done: plural('Escena añadida.', (n) => `${n} escenas añadidas.`),
    items: {
      free: {
        id: 'free',
        name: 'Historia libre',
        description: 'Sin tarjetas. Escribe como quieras y añade escenas cuando las necesites.',
        cards: [],
      },
      three_acts: {
        id: 'three_acts',
        name: 'Tres actos',
        description: 'Ocho tarjetas sugeridas, de la apertura al desenlace. Cámbialas o bórralas libremente.',
        cards: [
          { title: 'Planteamiento', synopsis: 'Quién es tu protagonista y cómo es su mundo antes de que algo cambie.' },
          { title: 'Detonante', synopsis: 'El suceso que rompe la normalidad y pone la historia en marcha.' },
          { title: 'Primer punto de giro', synopsis: 'La decisión o el hecho que lleva al protagonista a entrar de lleno en el conflicto.' },
          { title: 'Confrontación', synopsis: 'Los obstáculos crecen y el protagonista prueba soluciones que no bastan.' },
          { title: 'Punto medio', synopsis: 'Una revelación o un cambio que da otro sentido a lo que está en juego.' },
          { title: 'Crisis', synopsis: 'El momento más bajo: todo parece perdido y hay que elegir.' },
          { title: 'Clímax', synopsis: 'El enfrentamiento decisivo donde se resuelve el conflicto central.' },
          { title: 'Desenlace', synopsis: 'Cómo queda el mundo después y qué ha cambiado en el protagonista.' },
        ],
      },
      short_story: {
        id: 'short_story',
        name: 'Relato breve',
        description: 'Cuatro tarjetas para una historia corta y directa.',
        cards: [
          { title: 'Inicio', synopsis: 'Presenta a quien protagoniza y la situación en pocas líneas.' },
          { title: 'Complicación', synopsis: 'Algo se tuerce o aparece un obstáculo que no se puede ignorar.' },
          { title: 'Giro', synopsis: 'Un cambio inesperado que da otra lectura a todo lo anterior.' },
          { title: 'Final', synopsis: 'El cierre: qué queda resuelto y qué se queda resonando.' },
        ],
      },
    },
  },
  sheet: {
    newTitle: 'Nueva escena',
    editTitle: 'Escena',
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado',
    unsaved: 'Cambios sin guardar',
    close: 'Cerrar',
    cancel: 'Cancelar',
    created: 'Escena creada.',
    titleLabel: 'Título',
    titleRequired: 'Escribe un título.',
    statusLabel: 'Estado',
    synopsis: 'Sinopsis',
    synopsisHint: 'Qué ocurre en esta escena, en pocas frases.',
    purpose: 'Propósito',
    purposeHint: 'Qué aporta a la historia.',
    conflict: 'Conflicto',
    conflictHint: 'Qué se opone a lo que quiere el personaje.',
    outcome: 'Desenlace de la escena',
    outcomeHint: 'Cómo termina y qué cambia.',
    pov: 'Punto de vista',
    povNone: 'Sin definir',
    characters: 'Personajes en la escena',
    charactersSearch: 'Buscar personaje',
    charactersNone: 'Aún no tienes personajes. Puedes crearlos en Universo.',
    charactersSelected: plural('1 elegido', (n) => `${n} elegidos`),
    place: 'Lugar',
    placeNone: 'Sin definir',
    subplot: 'Subtrama',
    subplotHint: 'Una línea, por ejemplo «La carta perdida».',
    tags: 'Etiquetas',
    tagAdd: 'Añadir etiqueta',
    tagRemove: (tag) => `Quitar etiqueta ${tag}`,
    chapter: 'Capítulo vinculado',
    chapterNone: 'Ninguno',
    chapterHint: 'Vincular solo relaciona la escena con un capítulo de tu manuscrito: no publica nada ni crea un capítulo.',
    openChapter: 'Abrir capítulo',
    unavailable: 'Ya no está disponible',
    notes: 'Notas',
    groups: { essentials: 'Lo esencial', drama: 'Dramaturgia', cast: 'Quién y dónde', organize: 'Organización' },
    saveFailed: 'No se pudo guardar. Tus cambios siguen aquí; inténtalo de nuevo.',
    saveFailedNetwork: 'No se pudo guardar. Revisa tu conexión; tus cambios siguen aquí.',
    saveFailedInvalid: 'Algún dato no es válido. Revisa los campos e inténtalo de nuevo.',
    saveFailedRate: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
    capReached: (max) => `Llegaste al máximo de ${max} escenas en esta obra.`,
    discardTitle: '¿Descartar los cambios?',
    discardBody: 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
    discardConfirm: 'Descartar cambios',
    discardKeep: 'Seguir editando',
    conflictTitle: 'Esta escena cambió en otro lugar',
    conflictBody: 'Se guardó una versión más reciente, quizá desde otra pestaña o dispositivo. Tus cambios siguen aquí, sin guardar.',
    viewSaved: 'Ver la versión guardada',
    overwrite: 'Guardar la mía de todos modos',
    overwriteTitle: '¿Reemplazar la versión guardada?',
    overwriteBody: 'La versión guardada se reemplazará por la que ves ahora. No se puede deshacer.',
    overwriteConfirm: 'Guardar la mía',
    trashAction: 'Mover a la papelera',
    trashTitle: (name) => `¿Mover «${name}» a la papelera?`,
    trashBody: 'Podrás restaurarla durante 30 días.',
    trashConfirm: 'Mover a la papelera',
    trashed: 'Movido a la papelera. Puedes restaurarlo durante 30 días.',
    trashFailed: 'No se pudo mover a la papelera. Inténtalo de nuevo.',
  },
};

const en: PlanCopy = {
  heading: 'Scenes',
  privacy: 'This order is your private plan: it never changes the order of your published chapters.',
  status: { idea: 'Idea', planned: 'Planned', draft: 'Drafting', revising: 'Revising', done: 'Done' },
  views: { label: 'Scene view', list: 'List', board: 'Board' },
  add: 'Add scene',
  templatesButton: 'Templates',
  count: plural('1 scene', (n) => `${n} scenes`),
  countOf: (shown, total) => `${shown} of ${total} scenes`,
  capReached: (max) => `You have reached the limit of ${max} scenes in this work.`,
  loading: 'Loading…',
  loadError: 'We could not load your scenes.',
  retry: 'Try again',
  empty: {
    title: 'You can write without planning.',
    message: 'Whenever you want, organize your scenes here.',
    useTemplate: 'Use a template',
  },
  noMatches: 'No scene matches.',
  clearFilters: 'Clear filters',
  unnamed: 'Unnamed',
  untitled: 'Untitled scene',
  filters: {
    label: 'Filter scenes',
    search: 'Search scenes',
    searchPlaceholder: 'Title or synopsis',
    status: 'Status',
    allStatuses: 'All statuses',
    group: 'Subplot or tag',
    allGroups: 'All',
    subplot: (name) => `Subplot: ${name}`,
    tag: (name) => `Tag: ${name}`,
    character: 'Character',
    allCharacters: 'All',
  },
  card: {
    pov: (name) => `Point of view: ${name}`,
    withCharacters: (names) => `With ${names}`,
    atPlace: (name) => `At ${name}`,
    chapter: (title) => `Linked chapter: ${title}`,
    subplot: (name) => `Subplot: ${name}`,
  },
  move: {
    dragHint: 'Drag a scene by its handle or use the buttons to reorder.',
    dragHandle: (title) => `Drag “${title}”`,
    menu: 'Move',
    menuLabel: (title) => `Move options for “${title}”`,
    up: 'Move up',
    down: 'Move down',
    upLabel: (title) => `Move “${title}” up in the plan`,
    downLabel: (title) => `Move “${title}” down in the plan`,
    toStatus: (status) => `To ${status}`,
    toStatusLabel: (title, status) => `Move “${title}” to ${status}`,
    movedTo: (title, position, total) => `“${title}” is now scene ${position} of ${total}.`,
    statusChanged: (title, status) => `“${title}” moved to ${status}.`,
    failed: 'Could not move the scene. It went back to its place.',
    statusFailed: 'Could not change the status. Try again.',
    conflict: 'The scene changed somewhere else. We are showing the saved version; try again.',
  },
  layout: {
    listLabel: 'Scenes in your plan order',
    boardLabel: 'Scenes by status',
    emptyColumn: 'No scenes',
    dropHere: 'Drop here',
  },
  subplots: {
    title: 'Subplots',
    intro: 'Worked out from your scenes. Type a subplot on each scene to see it here.',
    none: 'You have not assigned any subplots yet.',
    scenes: plural('1 scene', (n) => `${n} scenes`),
    show: 'Show scenes',
    showScenes: (name) => `Show the scenes of the subplot “${name}”`,
  },
  templates: {
    title: 'Templates',
    description: 'Templates only add scenes: they never change or delete the ones you already have.',
    choose: 'Choose a template',
    previewTitle: 'These scenes will be added',
    previewNone: 'No scenes are added. Write without a plan and add scenes whenever you like.',
    add: (count) => `Add ${count} scenes`,
    keepFree: 'Continue without a template',
    adding: 'Adding…',
    partial: (done, total) => `${done} of ${total} scenes were added. Try again: the ones that already exist are not duplicated.`,
    cap: (max) => `These scenes would go over the limit of ${max}. Pick a shorter template or delete some scenes.`,
    done: plural('Scene added.', (n) => `${n} scenes added.`),
    items: {
      free: {
        id: 'free',
        name: 'Free story',
        description: 'No cards. Write however you like and add scenes when you need them.',
        cards: [],
      },
      three_acts: {
        id: 'three_acts',
        name: 'Three acts',
        description: 'Eight suggested cards, from the opening to the resolution. Change or delete them freely.',
        cards: [
          { title: 'Setup', synopsis: 'Who your protagonist is and what their world looks like before anything changes.' },
          { title: 'Inciting incident', synopsis: 'The event that breaks the ordinary and sets the story in motion.' },
          { title: 'First plot point', synopsis: 'The decision or event that pulls the protagonist fully into the conflict.' },
          { title: 'Confrontation', synopsis: 'Obstacles grow and the protagonist tries solutions that are not enough.' },
          { title: 'Midpoint', synopsis: 'A revelation or shift that changes what is at stake.' },
          { title: 'Crisis', synopsis: 'The lowest moment: everything seems lost and a choice must be made.' },
          { title: 'Climax', synopsis: 'The decisive confrontation where the central conflict is settled.' },
          { title: 'Resolution', synopsis: 'How the world looks afterwards and what has changed in the protagonist.' },
        ],
      },
      short_story: {
        id: 'short_story',
        name: 'Short story',
        description: 'Four cards for a short, direct story.',
        cards: [
          { title: 'Opening', synopsis: 'Introduce who the story follows and the situation in a few lines.' },
          { title: 'Complication', synopsis: 'Something goes wrong or an obstacle appears that cannot be ignored.' },
          { title: 'Twist', synopsis: 'An unexpected turn that changes how everything before it reads.' },
          { title: 'Ending', synopsis: 'The close: what is settled and what is left echoing.' },
        ],
      },
    },
  },
  sheet: {
    newTitle: 'New scene',
    editTitle: 'Scene',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    close: 'Close',
    cancel: 'Cancel',
    created: 'Scene created.',
    titleLabel: 'Title',
    titleRequired: 'Enter a title.',
    statusLabel: 'Status',
    synopsis: 'Synopsis',
    synopsisHint: 'What happens in this scene, in a few sentences.',
    purpose: 'Purpose',
    purposeHint: 'What it adds to the story.',
    conflict: 'Conflict',
    conflictHint: 'What stands in the way of what the character wants.',
    outcome: 'Scene outcome',
    outcomeHint: 'How it ends and what changes.',
    pov: 'Point of view',
    povNone: 'Not set',
    characters: 'Characters in the scene',
    charactersSearch: 'Search characters',
    charactersNone: 'You have no characters yet. You can create them in World.',
    charactersSelected: plural('1 selected', (n) => `${n} selected`),
    place: 'Place',
    placeNone: 'Not set',
    subplot: 'Subplot',
    subplotHint: 'One line, for example “The lost letter”.',
    tags: 'Tags',
    tagAdd: 'Add tag',
    tagRemove: (tag) => `Remove tag ${tag}`,
    chapter: 'Linked chapter',
    chapterNone: 'None',
    chapterHint: 'Linking only connects the scene to a chapter of your manuscript: it does not publish anything or create a chapter.',
    openChapter: 'Open chapter',
    unavailable: 'No longer available',
    notes: 'Notes',
    groups: { essentials: 'The essentials', drama: 'Drama', cast: 'Who and where', organize: 'Organization' },
    saveFailed: 'Could not save. Your changes are still here; try again.',
    saveFailedNetwork: 'Could not save. Check your connection; your changes are still here.',
    saveFailedInvalid: 'Some value is not valid. Check the fields and try again.',
    saveFailedRate: 'Too many attempts in a row. Wait a moment and try again.',
    capReached: (max) => `You have reached the limit of ${max} scenes in this work.`,
    discardTitle: 'Discard your changes?',
    discardBody: 'You have unsaved changes. If you leave now, they will be lost.',
    discardConfirm: 'Discard changes',
    discardKeep: 'Keep editing',
    conflictTitle: 'This scene changed somewhere else',
    conflictBody: 'A newer version was saved, maybe from another tab or device. Your changes are still here, unsaved.',
    viewSaved: 'See the saved version',
    overwrite: 'Save mine anyway',
    overwriteTitle: 'Replace the saved version?',
    overwriteBody: 'The saved version will be replaced by the one you see now. This cannot be undone.',
    overwriteConfirm: 'Save mine',
    trashAction: 'Move to trash',
    trashTitle: (name) => `Move “${name}” to the trash?`,
    trashBody: 'You will be able to restore it for 30 days.',
    trashConfirm: 'Move to trash',
    trashed: 'Moved to the trash. You can restore it for 30 days.',
    trashFailed: 'Could not move it to the trash. Try again.',
  },
};

const pt: PlanCopy = {
  heading: 'Cenas',
  privacy: 'Esta ordem é o seu plano privado: ela não muda a ordem dos capítulos publicados.',
  status: { idea: 'Ideia', planned: 'Planejada', draft: 'Em rascunho', revising: 'Em revisão', done: 'Concluída' },
  views: { label: 'Visualização das cenas', list: 'Lista', board: 'Quadro' },
  add: 'Adicionar cena',
  templatesButton: 'Modelos',
  count: plural('1 cena', (n) => `${n} cenas`),
  countOf: (shown, total) => `${shown} de ${total} cenas`,
  capReached: (max) => `Você chegou ao máximo de ${max} cenas nesta obra.`,
  loading: 'Carregando…',
  loadError: 'Não conseguimos carregar suas cenas.',
  retry: 'Tentar de novo',
  empty: {
    title: 'Você pode escrever sem planejar.',
    message: 'Quando quiser, organize suas cenas aqui.',
    useTemplate: 'Usar um modelo',
  },
  noMatches: 'Nenhuma cena corresponde.',
  clearFilters: 'Limpar filtros',
  unnamed: 'Sem nome',
  untitled: 'Cena sem título',
  filters: {
    label: 'Filtrar cenas',
    search: 'Buscar cenas',
    searchPlaceholder: 'Título ou sinopse',
    status: 'Status',
    allStatuses: 'Todos os status',
    group: 'Subtrama ou etiqueta',
    allGroups: 'Todas',
    subplot: (name) => `Subtrama: ${name}`,
    tag: (name) => `Etiqueta: ${name}`,
    character: 'Personagem',
    allCharacters: 'Todos',
  },
  card: {
    pov: (name) => `Ponto de vista: ${name}`,
    withCharacters: (names) => `Com ${names}`,
    atPlace: (name) => `Em ${name}`,
    chapter: (title) => `Capítulo vinculado: ${title}`,
    subplot: (name) => `Subtrama: ${name}`,
  },
  move: {
    dragHint: 'Arraste uma cena pela alça ou use os botões para reordenar.',
    dragHandle: (title) => `Arrastar “${title}”`,
    menu: 'Mover',
    menuLabel: (title) => `Opções para mover “${title}”`,
    up: 'Subir',
    down: 'Descer',
    upLabel: (title) => `Subir “${title}” no plano`,
    downLabel: (title) => `Descer “${title}” no plano`,
    toStatus: (status) => `Para ${status}`,
    toStatusLabel: (title, status) => `Mover “${title}” para ${status}`,
    movedTo: (title, position, total) => `“${title}” agora é a cena ${position} de ${total}.`,
    statusChanged: (title, status) => `“${title}” passou para ${status}.`,
    failed: 'Não foi possível mover a cena. Ela voltou ao lugar.',
    statusFailed: 'Não foi possível mudar o status. Tente de novo.',
    conflict: 'A cena mudou em outro lugar. Mostramos a versão salva; tente de novo.',
  },
  layout: {
    listLabel: 'Cenas na ordem do seu plano',
    boardLabel: 'Cenas por status',
    emptyColumn: 'Sem cenas',
    dropHere: 'Solte aqui',
  },
  subplots: {
    title: 'Subtramas',
    intro: 'Calculado a partir das suas cenas. Escreva uma subtrama em cada cena para vê-la aqui.',
    none: 'Você ainda não atribuiu subtramas.',
    scenes: plural('1 cena', (n) => `${n} cenas`),
    show: 'Ver cenas',
    showScenes: (name) => `Ver as cenas da subtrama “${name}”`,
  },
  templates: {
    title: 'Modelos',
    description: 'Os modelos só adicionam cenas: nunca mudam nem apagam as que você já tem.',
    choose: 'Escolha um modelo',
    previewTitle: 'Estas cenas serão adicionadas',
    previewNone: 'Nenhuma cena é adicionada. Escreva sem plano e adicione cenas quando quiser.',
    add: (count) => `Adicionar ${count} cenas`,
    keepFree: 'Continuar sem modelo',
    adding: 'Adicionando…',
    partial: (done, total) => `${done} de ${total} cenas foram adicionadas. Tente de novo: as que já existem não são duplicadas.`,
    cap: (max) => `Com estas cenas você passaria do máximo de ${max}. Escolha um modelo menor ou apague algumas cenas.`,
    done: plural('Cena adicionada.', (n) => `${n} cenas adicionadas.`),
    items: {
      free: {
        id: 'free',
        name: 'História livre',
        description: 'Sem cartões. Escreva como quiser e adicione cenas quando precisar.',
        cards: [],
      },
      three_acts: {
        id: 'three_acts',
        name: 'Três atos',
        description: 'Oito cartões sugeridos, da abertura ao desfecho. Mude ou apague à vontade.',
        cards: [
          { title: 'Apresentação', synopsis: 'Quem é o protagonista e como é o mundo dele antes de algo mudar.' },
          { title: 'Incidente incitante', synopsis: 'O acontecimento que rompe a normalidade e põe a história em movimento.' },
          { title: 'Primeiro ponto de virada', synopsis: 'A decisão ou o fato que leva o protagonista a entrar de vez no conflito.' },
          { title: 'Confronto', synopsis: 'Os obstáculos crescem e o protagonista tenta soluções que não bastam.' },
          { title: 'Ponto médio', synopsis: 'Uma revelação ou mudança que dá outro sentido ao que está em jogo.' },
          { title: 'Crise', synopsis: 'O momento mais baixo: tudo parece perdido e é preciso escolher.' },
          { title: 'Clímax', synopsis: 'O confronto decisivo em que o conflito central se resolve.' },
          { title: 'Desfecho', synopsis: 'Como fica o mundo depois e o que mudou no protagonista.' },
        ],
      },
      short_story: {
        id: 'short_story',
        name: 'Conto curto',
        description: 'Quatro cartões para uma história curta e direta.',
        cards: [
          { title: 'Início', synopsis: 'Apresente quem protagoniza e a situação em poucas linhas.' },
          { title: 'Complicação', synopsis: 'Algo dá errado ou surge um obstáculo que não dá para ignorar.' },
          { title: 'Virada', synopsis: 'Uma mudança inesperada que dá outra leitura a tudo o que veio antes.' },
          { title: 'Final', synopsis: 'O fechamento: o que fica resolvido e o que continua ecoando.' },
        ],
      },
    },
  },
  sheet: {
    newTitle: 'Nova cena',
    editTitle: 'Cena',
    save: 'Salvar',
    saving: 'Salvando…',
    saved: 'Salvo',
    unsaved: 'Alterações não salvas',
    close: 'Fechar',
    cancel: 'Cancelar',
    created: 'Cena criada.',
    titleLabel: 'Título',
    titleRequired: 'Escreva um título.',
    statusLabel: 'Status',
    synopsis: 'Sinopse',
    synopsisHint: 'O que acontece nesta cena, em poucas frases.',
    purpose: 'Propósito',
    purposeHint: 'O que ela acrescenta à história.',
    conflict: 'Conflito',
    conflictHint: 'O que se opõe ao que o personagem quer.',
    outcome: 'Desfecho da cena',
    outcomeHint: 'Como termina e o que muda.',
    pov: 'Ponto de vista',
    povNone: 'Não definido',
    characters: 'Personagens na cena',
    charactersSearch: 'Buscar personagem',
    charactersNone: 'Você ainda não tem personagens. Pode criá-los em Universo.',
    charactersSelected: plural('1 escolhido', (n) => `${n} escolhidos`),
    place: 'Lugar',
    placeNone: 'Não definido',
    subplot: 'Subtrama',
    subplotHint: 'Uma linha, por exemplo “A carta perdida”.',
    tags: 'Etiquetas',
    tagAdd: 'Adicionar etiqueta',
    tagRemove: (tag) => `Remover etiqueta ${tag}`,
    chapter: 'Capítulo vinculado',
    chapterNone: 'Nenhum',
    chapterHint: 'Vincular só relaciona a cena a um capítulo do seu manuscrito: não publica nada nem cria um capítulo.',
    openChapter: 'Abrir capítulo',
    unavailable: 'Não está mais disponível',
    notes: 'Notas',
    groups: { essentials: 'O essencial', drama: 'Dramaturgia', cast: 'Quem e onde', organize: 'Organização' },
    saveFailed: 'Não foi possível salvar. Suas alterações continuam aqui; tente de novo.',
    saveFailedNetwork: 'Não foi possível salvar. Verifique sua conexão; suas alterações continuam aqui.',
    saveFailedInvalid: 'Algum dado não é válido. Revise os campos e tente de novo.',
    saveFailedRate: 'Muitas tentativas seguidas. Espere um momento e tente de novo.',
    capReached: (max) => `Você chegou ao máximo de ${max} cenas nesta obra.`,
    discardTitle: 'Descartar as alterações?',
    discardBody: 'Você tem alterações não salvas. Se sair agora, elas serão perdidas.',
    discardConfirm: 'Descartar alterações',
    discardKeep: 'Continuar editando',
    conflictTitle: 'Esta cena mudou em outro lugar',
    conflictBody: 'Uma versão mais recente foi salva, talvez de outra aba ou dispositivo. Suas alterações continuam aqui, sem salvar.',
    viewSaved: 'Ver a versão salva',
    overwrite: 'Salvar a minha mesmo assim',
    overwriteTitle: 'Substituir a versão salva?',
    overwriteBody: 'A versão salva será substituída pela que você vê agora. Isso não pode ser desfeito.',
    overwriteConfirm: 'Salvar a minha',
    trashAction: 'Mover para a lixeira',
    trashTitle: (name) => `Mover “${name}” para a lixeira?`,
    trashBody: 'Você poderá restaurá-la por 30 dias.',
    trashConfirm: 'Mover para a lixeira',
    trashed: 'Movido para a lixeira. Você pode restaurar por 30 dias.',
    trashFailed: 'Não foi possível mover para a lixeira. Tente de novo.',
  },
};

export const PLAN_COPY: Record<Locale, PlanCopy> = { es, en, pt };

// ------------------------------------------------------------------ Progreso

export type ProgressCopy = {
  heading: string;
  intro: string;
  loading: string;
  loadError: string;
  retry: string;
  numbers: {
    label: string;
    words: string;
    wordsUnit: Plural;
    reading: (duration: string) => string;
    readingNone: string;
    weekWords: string;
    weekHint: string;
    monthDays: string;
    monthDaysHint: string;
    days: Plural;
    streak: string;
    streakHint: string;
    streakZero: string;
  };
  goals: {
    title: string;
    intro: string;
    work: string;
    workHint: string;
    daily: string;
    dailyHint: string;
    session: string;
    sessionHint: string;
    invalid: (max: string) => string;
    streakToggle: string;
    streakHelp: string;
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
    conflict: string;
    saveFailed: string;
    saveFailedNetwork: string;
    saveFailedInvalid: string;
    workBar: string;
    dailyBar: string;
    barText: (done: string, goal: string, percent: string) => string;
    reached: string;
    todayLoading: string;
  };
  calendar: {
    title: string;
    gridLabel: string;
    summary: Plural;
    empty: string;
    legend: string;
    less: string;
    more: string;
    levels: [string, string, string, string, string];
    cell: (label: string, words: number, formatted: string) => string;
    cellNone: (label: string) => string;
    viewList: string;
    hideList: string;
    listTitle: string;
    listEmpty: string;
    colDate: string;
    colWords: string;
  };
  rules: {
    title: string;
    saved: string;
    imports: string;
    activeDay: (chars: string) => string;
    timezone: (zone: string) => string;
  };
};

const percent = (n: string, space: boolean) => (space ? `${n} %` : `${n}%`);

const progressEs: ProgressCopy = {
  heading: 'Tu escritura',
  intro: 'Un registro para ti, sin comparaciones. Solo cuenta lo que escribes y se guarda.',
  loading: 'Cargando…',
  loadError: 'No pudimos cargar tu progreso.',
  retry: 'Reintentar',
  numbers: {
    label: 'Resumen',
    words: 'Palabras en tu obra',
    wordsUnit: plural('1 palabra', (n) => `${n} palabras`),
    reading: (duration) => `Lectura estimada: ${duration}`,
    readingNone: 'Aún no hay texto para estimar la lectura.',
    weekWords: 'Palabras escritas esta semana',
    weekHint: 'Últimos 7 días. Las importaciones no cuentan.',
    monthDays: 'Días de escritura este mes',
    monthDaysHint: 'Días en que guardaste texto nuevo.',
    days: plural('1 día', (n) => `${n} días`),
    streak: 'Racha actual',
    streakHint: 'Días seguidos con escritura.',
    streakZero: 'Puedes volver a escribir cuando quieras.',
  },
  goals: {
    title: 'Metas',
    intro: 'Son voluntarias y solo tuyas. Déjalas en 0 si no las quieres.',
    work: 'Meta de la obra (palabras)',
    workHint: 'Cuántas palabras quieres que tenga la obra.',
    daily: 'Meta diaria (palabras)',
    dailyHint: 'Palabras nuevas que te gustaría escribir en un día.',
    session: 'Meta por sesión (palabras)',
    sessionHint: 'Palabras nuevas que te gustaría escribir en una sentada.',
    invalid: (max) => `Escribe un número entero entre 0 y ${max}.`,
    streakToggle: 'Mostrar mi racha',
    streakHelp: 'Cuenta los días seguidos con escritura. Puedes ocultarla cuando quieras sin perder tu calendario.',
    save: 'Guardar metas',
    saving: 'Guardando…',
    saved: 'Metas guardadas.',
    unsaved: 'Cambios sin guardar',
    conflict: 'Tus metas cambiaron en otro lugar, quizá en otra pestaña. Actualizamos los datos: revisa y vuelve a guardar si quieres conservar tus cambios.',
    saveFailed: 'No se pudieron guardar las metas. Tus cambios siguen aquí; inténtalo de nuevo.',
    saveFailedNetwork: 'No se pudieron guardar las metas. Revisa tu conexión; tus cambios siguen aquí.',
    saveFailedInvalid: 'Algún valor no es válido. Revisa los campos e inténtalo de nuevo.',
    workBar: 'Avance de la meta de la obra',
    dailyBar: 'Avance de la meta de hoy',
    barText: (done, goal, pct) => `${done} de ${goal} palabras (${percent(pct, true)})`,
    reached: 'Meta cumplida.',
    todayLoading: 'Calculando lo de hoy…',
  },
  calendar: {
    title: 'Calendario de escritura',
    gridLabel: 'Calendario de escritura de las últimas 53 semanas. Usa las flechas para moverte entre días.',
    summary: plural('1 día con escritura en el último año', (n) => `${n} días con escritura en el último año`),
    empty: 'Tu calendario empieza con tu primer guardado.',
    legend: 'Leyenda',
    less: 'Menos',
    more: 'Más',
    levels: ['Sin escritura', '1–99 palabras', '100–499 palabras', '500–999 palabras', '1.000 palabras o más'],
    cell: (label, words, formatted) => `${label}: ${words === 1 ? '1 palabra' : `${formatted} palabras`}`,
    cellNone: (label) => `${label}: sin escritura`,
    viewList: 'Ver como lista',
    hideList: 'Ocultar la lista',
    listTitle: 'Días con escritura',
    listEmpty: 'Aún no hay días con escritura.',
    colDate: 'Fecha',
    colWords: 'Palabras',
  },
  rules: {
    title: 'Cómo se cuenta',
    saved: 'Solo cuenta el texto guardado.',
    imports: 'Los textos importados no cuentan como palabras escritas.',
    activeDay: (chars) => `Un día cuenta como día de escritura cuando guardas al menos ${chars} caracteres nuevos.`,
    timezone: (zone) => `Los días se calculan con tu zona horaria (${zone}).`,
  },
};

const progressEn: ProgressCopy = {
  heading: 'Your writing',
  intro: 'A record for you, with no comparisons. Only what you write and save counts.',
  loading: 'Loading…',
  loadError: 'We could not load your progress.',
  retry: 'Try again',
  numbers: {
    label: 'Summary',
    words: 'Words in your work',
    wordsUnit: plural('1 word', (n) => `${n} words`),
    reading: (duration) => `Estimated reading time: ${duration}`,
    readingNone: 'There is no text yet to estimate the reading time.',
    weekWords: 'Words written this week',
    weekHint: 'Last 7 days. Imports do not count.',
    monthDays: 'Writing days this month',
    monthDaysHint: 'Days when you saved new text.',
    days: plural('1 day', (n) => `${n} days`),
    streak: 'Current streak',
    streakHint: 'Days in a row with writing.',
    streakZero: 'You can come back to writing whenever you like.',
  },
  goals: {
    title: 'Goals',
    intro: 'They are optional and only yours. Leave them at 0 if you do not want them.',
    work: 'Work goal (words)',
    workHint: 'How many words you would like the work to have.',
    daily: 'Daily goal (words)',
    dailyHint: 'New words you would like to write in a day.',
    session: 'Session goal (words)',
    sessionHint: 'New words you would like to write in one sitting.',
    invalid: (max) => `Enter a whole number between 0 and ${max}.`,
    streakToggle: 'Show my streak',
    streakHelp: 'Counts days in a row with writing. You can hide it any time without losing your calendar.',
    save: 'Save goals',
    saving: 'Saving…',
    saved: 'Goals saved.',
    unsaved: 'Unsaved changes',
    conflict: 'Your goals changed somewhere else, maybe in another tab. We refreshed the data: review and save again if you want to keep your changes.',
    saveFailed: 'Could not save your goals. Your changes are still here; try again.',
    saveFailedNetwork: 'Could not save your goals. Check your connection; your changes are still here.',
    saveFailedInvalid: 'Some value is not valid. Check the fields and try again.',
    workBar: 'Progress toward the work goal',
    dailyBar: 'Progress toward today’s goal',
    barText: (done, goal, pct) => `${done} of ${goal} words (${percent(pct, false)})`,
    reached: 'Goal reached.',
    todayLoading: 'Working out today…',
  },
  calendar: {
    title: 'Writing calendar',
    gridLabel: 'Writing calendar for the last 53 weeks. Use the arrow keys to move between days.',
    summary: plural('1 writing day in the last year', (n) => `${n} writing days in the last year`),
    empty: 'Your calendar starts with your first save.',
    legend: 'Legend',
    less: 'Less',
    more: 'More',
    levels: ['No writing', '1–99 words', '100–499 words', '500–999 words', '1,000 words or more'],
    cell: (label, words, formatted) => `${label}: ${words === 1 ? '1 word' : `${formatted} words`}`,
    cellNone: (label) => `${label}: no writing`,
    viewList: 'View as a list',
    hideList: 'Hide the list',
    listTitle: 'Writing days',
    listEmpty: 'There are no writing days yet.',
    colDate: 'Date',
    colWords: 'Words',
  },
  rules: {
    title: 'How it is counted',
    saved: 'Only saved text counts.',
    imports: 'Imported text does not count as written words.',
    activeDay: (chars) => `A day counts as a writing day when you save at least ${chars} new characters.`,
    timezone: (zone) => `Days are worked out in your time zone (${zone}).`,
  },
};

const progressPt: ProgressCopy = {
  heading: 'Sua escrita',
  intro: 'Um registro para você, sem comparações. Só conta o que você escreve e salva.',
  loading: 'Carregando…',
  loadError: 'Não conseguimos carregar seu progresso.',
  retry: 'Tentar de novo',
  numbers: {
    label: 'Resumo',
    words: 'Palavras na sua obra',
    wordsUnit: plural('1 palavra', (n) => `${n} palavras`),
    reading: (duration) => `Leitura estimada: ${duration}`,
    readingNone: 'Ainda não há texto para estimar a leitura.',
    weekWords: 'Palavras escritas esta semana',
    weekHint: 'Últimos 7 dias. Importações não contam.',
    monthDays: 'Dias de escrita neste mês',
    monthDaysHint: 'Dias em que você salvou texto novo.',
    days: plural('1 dia', (n) => `${n} dias`),
    streak: 'Sequência atual',
    streakHint: 'Dias seguidos com escrita.',
    streakZero: 'Você pode voltar a escrever quando quiser.',
  },
  goals: {
    title: 'Metas',
    intro: 'São voluntárias e só suas. Deixe em 0 se não quiser.',
    work: 'Meta da obra (palavras)',
    workHint: 'Quantas palavras você quer que a obra tenha.',
    daily: 'Meta diária (palavras)',
    dailyHint: 'Palavras novas que você gostaria de escrever em um dia.',
    session: 'Meta por sessão (palavras)',
    sessionHint: 'Palavras novas que você gostaria de escrever de uma vez.',
    invalid: (max) => `Digite um número inteiro entre 0 e ${max}.`,
    streakToggle: 'Mostrar minha sequência',
    streakHelp: 'Conta os dias seguidos com escrita. Você pode ocultá-la quando quiser sem perder seu calendário.',
    save: 'Salvar metas',
    saving: 'Salvando…',
    saved: 'Metas salvas.',
    unsaved: 'Alterações não salvas',
    conflict: 'Suas metas mudaram em outro lugar, talvez em outra aba. Atualizamos os dados: revise e salve de novo se quiser manter suas alterações.',
    saveFailed: 'Não foi possível salvar as metas. Suas alterações continuam aqui; tente de novo.',
    saveFailedNetwork: 'Não foi possível salvar as metas. Verifique sua conexão; suas alterações continuam aqui.',
    saveFailedInvalid: 'Algum valor não é válido. Revise os campos e tente de novo.',
    workBar: 'Andamento da meta da obra',
    dailyBar: 'Andamento da meta de hoje',
    barText: (done, goal, pct) => `${done} de ${goal} palavras (${percent(pct, true)})`,
    reached: 'Meta cumprida.',
    todayLoading: 'Calculando o de hoje…',
  },
  calendar: {
    title: 'Calendário de escrita',
    gridLabel: 'Calendário de escrita das últimas 53 semanas. Use as setas para se mover entre os dias.',
    summary: plural('1 dia de escrita no último ano', (n) => `${n} dias de escrita no último ano`),
    empty: 'Seu calendário começa com o seu primeiro salvamento.',
    legend: 'Legenda',
    less: 'Menos',
    more: 'Mais',
    levels: ['Sem escrita', '1–99 palavras', '100–499 palavras', '500–999 palavras', '1.000 palavras ou mais'],
    cell: (label, words, formatted) => `${label}: ${words === 1 ? '1 palavra' : `${formatted} palavras`}`,
    cellNone: (label) => `${label}: sem escrita`,
    viewList: 'Ver como lista',
    hideList: 'Ocultar a lista',
    listTitle: 'Dias com escrita',
    listEmpty: 'Ainda não há dias com escrita.',
    colDate: 'Data',
    colWords: 'Palavras',
  },
  rules: {
    title: 'Como é contado',
    saved: 'Só conta o texto salvo.',
    imports: 'Textos importados não contam como palavras escritas.',
    activeDay: (chars) => `Um dia conta como dia de escrita quando você salva pelo menos ${chars} caracteres novos.`,
    timezone: (zone) => `Os dias são calculados no seu fuso horário (${zone}).`,
  },
};

export const PROGRESS_COPY: Record<Locale, ProgressCopy> = { es: progressEs, en: progressEn, pt: progressPt };
