import type { Locale } from '@/lib/i18n';

// Copy of the Universe area of InkDuel Studio: characters, places, lore notes
// and relationships. Neutral Spanish with tuteo (never voseo) is the editorial
// source; en and pt-BR are idiomatic equivalents. Nothing here is typed by the
// author, so none of it may reach analytics either way.

type N = (n: string) => string;
type Plural = (count: number, formatted: string) => string;
const plural =
  (one: string, other: N): Plural =>
  (count, formatted) =>
    count === 1 ? one : other(formatted);

/** Long-text fields of a character (age and pronouns are single-line). */
export type CharacterTextKey =
  | 'age'
  | 'pronouns'
  | 'appearance'
  | 'personality'
  | 'strengths'
  | 'flaws'
  | 'fear'
  | 'desire'
  | 'externalGoal'
  | 'internalNeed'
  | 'conflict'
  | 'secret'
  | 'motivation'
  | 'arcStart'
  | 'arcEnd'
  | 'voice'
  | 'notes';

type ListCopy = {
  add: string;
  searchLabel: string;
  searchPlaceholder: string;
  count: Plural;
  countOf: (shown: string, total: string) => string;
  emptyTitle: string;
  emptyMessage: string;
  noMatches: string;
  loadError: string;
  capReached: (max: string) => string;
};

export type UniverseCopy = {
  nav: { label: string; privacy: string; characters: string; places: string; notes: string; relations: string };
  common: {
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
    close: string;
    cancel: string;
    retry: string;
    loading: string;
    sortLabel: string;
    sortName: string;
    sortUpdated: string;
    filterAll: string;
    tagLabel: string;
    clearFilters: string;
    unnamed: string;
    saveFailed: string;
    saveFailedNetwork: string;
    saveFailedInvalid: string;
    saveFailedRate: string;
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
    duplicateAction: string;
    duplicateHint: string;
    duplicated: string;
    duplicateFailed: string;
    copySuffix: string;
    created: string;
    linkLimit: (max: string) => string;
    untitledScene: string;
    goPlan: string;
    povSuffix: string;
  };
  characters: ListCopy & {
    roleLabel: string;
    roleNone: string;
    roles: { protagonist: string; antagonist: string; secondary: string; other: string };
    states: { active: string; absent: string; deceased: string; unknown: string };
    newTitle: string;
    editTitle: string;
    nameLabel: string;
    nameRequired: string;
    aliases: string;
    aliasesHint: string;
    summary: string;
    summaryHint: string;
    tags: string;
    tagAdd: string;
    tagRemove: (tag: string) => string;
    moreDetails: string;
    lessDetails: string;
    moreHint: string;
    groups: { identity: string; inner: string; arc: string; voice: string; notes: string };
    texts: Record<CharacterTextKey, string>;
    stateLabel: string;
    stateNone: string;
    custom: {
      title: string;
      hint: string;
      add: string;
      key: string;
      value: string;
      remove: (key: string) => string;
      max: (n: string) => string;
      keyRequired: string;
    };
    appearsIn: string;
    appearsNone: string;
    relations: string;
    relationsNone: string;
    relationOpen: (other: string) => string;
  };
  places: ListCopy & {
    importanceLabel: string;
    importanceNone: string;
    importances: { major: string; minor: string };
    newTitle: string;
    editTitle: string;
    nameLabel: string;
    nameRequired: string;
    typeLabel: string;
    typeHint: string;
    description: string;
    history: string;
    atmosphere: string;
    rules: string;
    tags: string;
    tagAdd: string;
    tagRemove: (tag: string) => string;
    scenes: string;
    scenesNone: string;
  };
  notes: ListCopy & {
    categoryLabel: string;
    categoryNone: string;
    categories: { rule: string; faction: string; object: string; magic: string; culture: string; research: string; other: string };
    newTitle: string;
    editTitle: string;
    intro: string;
    titleLabel: string;
    titleRequired: string;
    bodyLabel: string;
    bodyHint: string;
    tags: string;
    tagAdd: string;
    tagRemove: (tag: string) => string;
    linkedNotes: string;
    linkedScenes: string;
    linkSearch: string;
    linkNone: string;
    linkSelected: Plural;
    untitled: string;
  };
  relations: ListCopy & {
    editAction: string;
    viewLabel: string;
    viewList: string;
    viewGraph: string;
    typeLabel: string;
    typeAll: string;
    types: { family: string; friendship: string; romance: string; rivalry: string; mentorship: string; alliance: string; antagonism: string; other: string };
    statusLabel: string;
    statuses: { active: string; past: string; unknown: string };
    newTitle: string;
    editTitle: string;
    from: string;
    to: string;
    pick: string;
    sameCharacter: string;
    typeField: string;
    label: string;
    labelHint: string;
    notes: string;
    directed: string;
    directedHelp: string;
    needTwoTitle: string;
    needTwoMessage: string;
    goCharacters: string;
    rowDirected: (a: string, b: string) => string;
    rowMutual: (a: string, b: string) => string;
    edit: (a: string, b: string) => string;
    trash: (a: string, b: string) => string;
    trashBody: string;
    listLabel: string;
    graph: {
      label: string;
      hint: string;
      canvasHelp: string;
      node: Plural;
      zoomIn: string;
      zoomOut: string;
      zoomReset: string;
      center: string;
      legend: string;
      directedNote: string;
      mutualNote: string;
      isolated: Plural;
      emptyTitle: string;
      emptyMessage: string;
      noRelations: string;
      narrow: string;
      edge: (a: string, b: string, what: string, directed: boolean) => string;
    };
  };
};

const es: UniverseCopy = {
  nav: {
    label: 'Secciones del universo',
    privacy: 'Lo que guardas aquí es privado: tus lectores no lo ven.',
    characters: 'Personajes',
    places: 'Lugares',
    notes: 'Notas y lore',
    relations: 'Relaciones',
  },
  common: {
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado',
    unsaved: 'Cambios sin guardar',
    close: 'Cerrar',
    cancel: 'Cancelar',
    retry: 'Reintentar',
    loading: 'Cargando…',
    sortLabel: 'Ordenar por',
    sortName: 'Nombre',
    sortUpdated: 'Modificado recientemente',
    filterAll: 'Todos',
    tagLabel: 'Etiqueta',
    clearFilters: 'Quitar filtros',
    unnamed: 'Sin nombre',
    saveFailed: 'No se pudo guardar. Tus cambios siguen aquí; inténtalo de nuevo.',
    saveFailedNetwork: 'No se pudo guardar. Revisa tu conexión; tus cambios siguen aquí.',
    saveFailedInvalid: 'Algún dato no es válido. Revisa los campos e inténtalo de nuevo.',
    saveFailedRate: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
    discardTitle: '¿Descartar los cambios?',
    discardBody: 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
    discardConfirm: 'Descartar cambios',
    discardKeep: 'Seguir editando',
    conflictTitle: 'Esta ficha cambió en otro lugar',
    conflictBody: 'Se guardó una versión más reciente, quizá desde otra pestaña o dispositivo. Tus cambios siguen aquí, sin guardar.',
    viewSaved: 'Ver la versión guardada',
    overwrite: 'Guardar la mía de todos modos',
    overwriteTitle: '¿Reemplazar la versión guardada?',
    overwriteBody: 'La versión guardada se reemplazará por la que ves ahora. No se puede deshacer.',
    overwriteConfirm: 'Guardar la mía',
    trashAction: 'Mover a la papelera',
    trashTitle: (name) => `¿Mover «${name}» a la papelera?`,
    trashBody: 'Podrás restaurarlo durante 30 días.',
    trashConfirm: 'Mover a la papelera',
    trashed: 'Movido a la papelera. Puedes restaurarlo durante 30 días.',
    trashFailed: 'No se pudo mover a la papelera. Inténtalo de nuevo.',
    duplicateAction: 'Duplicar como plantilla',
    duplicateHint: 'Guarda tus cambios para poder duplicar.',
    duplicated: 'Copia creada. Es una ficha nueva, independiente de la original.',
    duplicateFailed: 'No se pudo duplicar. Inténtalo de nuevo.',
    copySuffix: '(copia)',
    created: 'Creado.',
    linkLimit: (max) => `Puedes enlazar hasta ${max}.`,
    untitledScene: 'Escena sin título',
    goPlan: 'Ver en Planificar',
    povSuffix: 'punto de vista',
  },
  characters: {
    add: 'Añadir personaje',
    searchLabel: 'Buscar personajes',
    searchPlaceholder: 'Nombre, alias o etiqueta',
    count: plural('1 personaje', (n) => `${n} personajes`),
    countOf: (shown, total) => `${shown} de ${total} personajes`,
    emptyTitle: 'Los personajes pueden esperar. Tu historia, no.',
    emptyMessage: 'Puedes agregarlos cuando los necesites.',
    noMatches: 'Ningún personaje coincide.',
    loadError: 'No pudimos cargar tus personajes.',
    capReached: (max) => `Llegaste al máximo de ${max} personajes en esta obra.`,
    roleLabel: 'Rol',
    roleNone: 'Sin rol',
    roles: { protagonist: 'Protagonista', antagonist: 'Antagonista', secondary: 'Secundario', other: 'Otro' },
    states: { active: 'Activo', absent: 'Ausente', deceased: 'Fallecido', unknown: 'Desconocido' },
    newTitle: 'Nuevo personaje',
    editTitle: 'Personaje',
    nameLabel: 'Nombre',
    nameRequired: 'Escribe un nombre.',
    aliases: 'Alias o apodos',
    aliasesHint: 'Si tiene varios, sepáralos con comas.',
    summary: 'Descripción breve',
    summaryHint: 'Quién es, en una o dos frases.',
    tags: 'Etiquetas',
    tagAdd: 'Añadir etiqueta',
    tagRemove: (tag) => `Quitar etiqueta ${tag}`,
    moreDetails: 'Más detalles',
    lessDetails: 'Menos detalles',
    moreHint: 'Todo esto es opcional. Rellena solo lo que te ayude a escribir.',
    groups: { identity: 'Identidad', inner: 'Vida interior', arc: 'Arco', voice: 'Voz', notes: 'Notas libres' },
    texts: {
      age: 'Edad o etapa de vida',
      pronouns: 'Pronombres',
      appearance: 'Apariencia',
      personality: 'Personalidad',
      strengths: 'Fortalezas',
      flaws: 'Defectos',
      fear: 'Miedo',
      desire: 'Deseo',
      externalGoal: 'Objetivo externo',
      internalNeed: 'Necesidad interna',
      conflict: 'Conflicto',
      secret: 'Secreto',
      motivation: 'Motivación',
      arcStart: 'Dónde empieza',
      arcEnd: 'Dónde termina',
      voice: 'Cómo habla',
      notes: 'Notas',
    },
    stateLabel: 'Estado narrativo',
    stateNone: 'Sin definir',
    custom: {
      title: 'Campos propios',
      hint: 'Lo que tu historia necesite: un linaje, un rango, una manía.',
      add: 'Añadir campo',
      key: 'Nombre del campo',
      value: 'Valor',
      remove: (key) => `Quitar el campo ${key}`,
      max: (n) => `Máximo ${n} campos.`,
      keyRequired: 'Ponle un nombre al campo.',
    },
    appearsIn: 'Aparece en',
    appearsNone: 'Aún no aparece en ninguna escena.',
    relations: 'Relaciones',
    relationsNone: 'Sin relaciones todavía.',
    relationOpen: (other) => `Abrir la relación con ${other}`,
  },
  places: {
    add: 'Añadir lugar',
    searchLabel: 'Buscar lugares',
    searchPlaceholder: 'Nombre, tipo o etiqueta',
    count: plural('1 lugar', (n) => `${n} lugares`),
    countOf: (shown, total) => `${shown} de ${total} lugares`,
    emptyTitle: 'Todavía no hay lugares',
    emptyMessage: 'Una ciudad, una casa, un rincón: añádelos cuando tu historia los pida.',
    noMatches: 'Ningún lugar coincide.',
    loadError: 'No pudimos cargar tus lugares.',
    capReached: (max) => `Llegaste al máximo de ${max} lugares en esta obra.`,
    importanceLabel: 'Importancia',
    importanceNone: 'Sin definir',
    importances: { major: 'Principal', minor: 'Secundario' },
    newTitle: 'Nuevo lugar',
    editTitle: 'Lugar',
    nameLabel: 'Nombre',
    nameRequired: 'Escribe un nombre.',
    typeLabel: 'Tipo de lugar',
    typeHint: 'Ciudad, casa, bosque, nave…',
    description: 'Descripción',
    history: 'Historia',
    atmosphere: 'Atmósfera',
    rules: 'Reglas o particularidades',
    tags: 'Etiquetas',
    tagAdd: 'Añadir etiqueta',
    tagRemove: (tag) => `Quitar etiqueta ${tag}`,
    scenes: 'Escenas en este lugar',
    scenesNone: 'Ninguna escena ocurre aquí todavía.',
  },
  notes: {
    add: 'Añadir nota',
    searchLabel: 'Buscar notas',
    searchPlaceholder: 'Título, contenido o etiqueta',
    count: plural('1 nota', (n) => `${n} notas`),
    countOf: (shown, total) => `${shown} de ${total} notas`,
    emptyTitle: 'Aquí cabe lo que tu historia necesita recordar',
    emptyMessage: 'Reglas, facciones, objetos o investigación. Es privado y opcional.',
    noMatches: 'Ninguna nota coincide.',
    loadError: 'No pudimos cargar tus notas.',
    capReached: (max) => `Llegaste al máximo de ${max} notas en esta obra.`,
    categoryLabel: 'Categoría',
    categoryNone: 'Sin categoría',
    categories: {
      rule: 'Regla',
      faction: 'Facción',
      object: 'Objeto',
      magic: 'Magia',
      culture: 'Cultura',
      research: 'Investigación',
      other: 'Otra',
    },
    newTitle: 'Nueva nota',
    editTitle: 'Nota',
    intro: 'Para las reglas de tu mundo, o para el contexto y la investigación que necesita tu historia.',
    titleLabel: 'Título',
    titleRequired: 'Escribe un título.',
    bodyLabel: 'Contenido',
    bodyHint: 'Una regla, un dato, un contexto que no quieras olvidar.',
    tags: 'Etiquetas',
    tagAdd: 'Añadir etiqueta',
    tagRemove: (tag) => `Quitar etiqueta ${tag}`,
    linkedNotes: 'Notas relacionadas',
    linkedScenes: 'Escenas relacionadas',
    linkSearch: 'Buscar para enlazar',
    linkNone: 'Todavía no hay nada que enlazar.',
    linkSelected: plural('1 seleccionada', (n) => `${n} seleccionadas`),
    untitled: 'Nota sin título',
  },
  relations: {
    add: 'Añadir relación',
    searchLabel: 'Buscar relaciones',
    searchPlaceholder: 'Personaje, etiqueta o nota',
    count: plural('1 relación', (n) => `${n} relaciones`),
    countOf: (shown, total) => `${shown} de ${total} relaciones`,
    emptyTitle: 'Aún no hay relaciones',
    emptyMessage: 'Conecta a tus personajes cuando quieras: familia, rivalidad, alianzas…',
    noMatches: 'Ninguna relación coincide.',
    loadError: 'No pudimos cargar tus relaciones.',
    capReached: (max) => `Llegaste al máximo de ${max} relaciones en esta obra.`,
    editAction: 'Editar',
    viewLabel: 'Vista',
    viewList: 'Lista',
    viewGraph: 'Grafo',
    typeLabel: 'Tipo',
    typeAll: 'Todos los tipos',
    types: {
      family: 'Familia',
      friendship: 'Amistad',
      romance: 'Romance',
      rivalry: 'Rivalidad',
      mentorship: 'Mentoría',
      alliance: 'Alianza',
      antagonism: 'Antagonismo',
      other: 'Otra',
    },
    statusLabel: 'Estado',
    statuses: { active: 'Activa', past: 'Pasada', unknown: 'Desconocida' },
    newTitle: 'Nueva relación',
    editTitle: 'Editar relación',
    from: 'De',
    to: 'A',
    pick: 'Elige un personaje',
    sameCharacter: 'Elige dos personajes distintos.',
    typeField: 'Tipo de relación',
    label: 'Etiqueta propia',
    labelHint: 'Si la escribes, se muestra en lugar del tipo.',
    notes: 'Notas',
    directed: 'Va en una sola dirección',
    directedHelp: 'Actívalo si no es recíproca: por ejemplo, uno admira al otro.',
    needTwoTitle: 'Necesitas al menos dos personajes',
    needTwoMessage: 'Añade otro personaje y podrás conectarlos aquí.',
    goCharacters: 'Ir a Personajes',
    rowDirected: (a, b) => `${a} hacia ${b}`,
    rowMutual: (a, b) => `${a} y ${b}`,
    edit: (a, b) => `Editar la relación entre ${a} y ${b}`,
    trash: (a, b) => `Mover a la papelera la relación entre ${a} y ${b}`,
    trashBody: 'Podrás restaurarla durante 30 días.',
    listLabel: 'Relaciones entre personajes',
    graph: {
      label: 'Grafo de relaciones',
      hint: 'Recorre los personajes con Tab y abre su ficha con Enter. La lista tiene las mismas relaciones.',
      canvasHelp: 'Arrastra para mover el lienzo. Con el lienzo enfocado, usa las flechas para moverte y + o − para acercar.',
      node: plural('1 relación', (n) => `${n} relaciones`),
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      zoomReset: 'Restablecer zoom',
      center: 'Centrar',
      legend: 'Leyenda',
      directedNote: 'Línea con flecha: va en una dirección.',
      mutualNote: 'Línea sin flecha: es recíproca.',
      isolated: plural('1 personaje sin relaciones no aparece en el grafo.', (n) => `${n} personajes sin relaciones no aparecen en el grafo.`),
      emptyTitle: 'El grafo necesita dos personajes',
      emptyMessage: 'Añade otro personaje y conéctalos para verlos aquí.',
      noRelations: 'Aún no hay relaciones que mostrar.',
      narrow: 'El grafo se ve mejor en una pantalla más grande. La lista tiene lo mismo.',
      edge: (a, b, what, directed) => (directed ? `${a} hacia ${b}: ${what}` : `${a} y ${b}: ${what}`),
    },
  },
};

const en: UniverseCopy = {
  nav: {
    label: 'World sections',
    privacy: 'What you keep here is private: your readers never see it.',
    characters: 'Characters',
    places: 'Places',
    notes: 'Notes & lore',
    relations: 'Relationships',
  },
  common: {
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    close: 'Close',
    cancel: 'Cancel',
    retry: 'Try again',
    loading: 'Loading…',
    sortLabel: 'Sort by',
    sortName: 'Name',
    sortUpdated: 'Recently modified',
    filterAll: 'All',
    tagLabel: 'Tag',
    clearFilters: 'Clear filters',
    unnamed: 'Unnamed',
    saveFailed: 'Could not save. Your changes are still here; try again.',
    saveFailedNetwork: 'Could not save. Check your connection; your changes are still here.',
    saveFailedInvalid: 'Something is not valid. Check the fields and try again.',
    saveFailedRate: 'Too many attempts in a row. Wait a moment and try again.',
    discardTitle: 'Discard your changes?',
    discardBody: 'You have unsaved changes. If you leave now, they will be lost.',
    discardConfirm: 'Discard changes',
    discardKeep: 'Keep editing',
    conflictTitle: 'This entry changed somewhere else',
    conflictBody: 'A newer version was saved, maybe from another tab or device. Your changes are still here, unsaved.',
    viewSaved: 'See the saved version',
    overwrite: 'Save mine anyway',
    overwriteTitle: 'Replace the saved version?',
    overwriteBody: 'The saved version will be replaced by the one you see now. This cannot be undone.',
    overwriteConfirm: 'Save mine',
    trashAction: 'Move to trash',
    trashTitle: (name) => `Move “${name}” to the trash?`,
    trashBody: 'You can restore it for 30 days.',
    trashConfirm: 'Move to trash',
    trashed: 'Moved to the trash. You can restore it for 30 days.',
    trashFailed: 'Could not move it to the trash. Try again.',
    duplicateAction: 'Duplicate as template',
    duplicateHint: 'Save your changes to be able to duplicate.',
    duplicated: 'Copy created. It is a new entry, independent from the original.',
    duplicateFailed: 'Could not duplicate. Try again.',
    copySuffix: '(copy)',
    created: 'Created.',
    linkLimit: (max) => `You can link up to ${max}.`,
    untitledScene: 'Untitled scene',
    goPlan: 'See in Plan',
    povSuffix: 'point of view',
  },
  characters: {
    add: 'Add character',
    searchLabel: 'Search characters',
    searchPlaceholder: 'Name, alias or tag',
    count: plural('1 character', (n) => `${n} characters`),
    countOf: (shown, total) => `${shown} of ${total} characters`,
    emptyTitle: 'Characters can wait. Your story cannot.',
    emptyMessage: 'You can add them whenever you need them.',
    noMatches: 'No character matches.',
    loadError: 'We could not load your characters.',
    capReached: (max) => `You reached the limit of ${max} characters in this work.`,
    roleLabel: 'Role',
    roleNone: 'No role',
    roles: { protagonist: 'Protagonist', antagonist: 'Antagonist', secondary: 'Secondary', other: 'Other' },
    states: { active: 'Active', absent: 'Absent', deceased: 'Deceased', unknown: 'Unknown' },
    newTitle: 'New character',
    editTitle: 'Character',
    nameLabel: 'Name',
    nameRequired: 'Write a name.',
    aliases: 'Aliases or nicknames',
    aliasesHint: 'If there are several, separate them with commas.',
    summary: 'Short description',
    summaryHint: 'Who they are, in a sentence or two.',
    tags: 'Tags',
    tagAdd: 'Add tag',
    tagRemove: (tag) => `Remove tag ${tag}`,
    moreDetails: 'More details',
    lessDetails: 'Fewer details',
    moreHint: 'All of this is optional. Fill in only what helps you write.',
    groups: { identity: 'Identity', inner: 'Inner life', arc: 'Arc', voice: 'Voice', notes: 'Free notes' },
    texts: {
      age: 'Age or life stage',
      pronouns: 'Pronouns',
      appearance: 'Appearance',
      personality: 'Personality',
      strengths: 'Strengths',
      flaws: 'Flaws',
      fear: 'Fear',
      desire: 'Desire',
      externalGoal: 'External goal',
      internalNeed: 'Internal need',
      conflict: 'Conflict',
      secret: 'Secret',
      motivation: 'Motivation',
      arcStart: 'Where it begins',
      arcEnd: 'Where it ends',
      voice: 'How they speak',
      notes: 'Notes',
    },
    stateLabel: 'Narrative state',
    stateNone: 'Not set',
    custom: {
      title: 'Custom fields',
      hint: 'Whatever your story needs: a lineage, a rank, a habit.',
      add: 'Add field',
      key: 'Field name',
      value: 'Value',
      remove: (key) => `Remove the field ${key}`,
      max: (n) => `Up to ${n} fields.`,
      keyRequired: 'Give the field a name.',
    },
    appearsIn: 'Appears in',
    appearsNone: 'Not in any scene yet.',
    relations: 'Relationships',
    relationsNone: 'No relationships yet.',
    relationOpen: (other) => `Open the relationship with ${other}`,
  },
  places: {
    add: 'Add place',
    searchLabel: 'Search places',
    searchPlaceholder: 'Name, type or tag',
    count: plural('1 place', (n) => `${n} places`),
    countOf: (shown, total) => `${shown} of ${total} places`,
    emptyTitle: 'No places yet',
    emptyMessage: 'A city, a house, a corner: add them when your story asks for them.',
    noMatches: 'No place matches.',
    loadError: 'We could not load your places.',
    capReached: (max) => `You reached the limit of ${max} places in this work.`,
    importanceLabel: 'Importance',
    importanceNone: 'Not set',
    importances: { major: 'Major', minor: 'Minor' },
    newTitle: 'New place',
    editTitle: 'Place',
    nameLabel: 'Name',
    nameRequired: 'Write a name.',
    typeLabel: 'Type of place',
    typeHint: 'City, house, forest, spaceship…',
    description: 'Description',
    history: 'History',
    atmosphere: 'Atmosphere',
    rules: 'Rules or quirks',
    tags: 'Tags',
    tagAdd: 'Add tag',
    tagRemove: (tag) => `Remove tag ${tag}`,
    scenes: 'Scenes set here',
    scenesNone: 'No scene takes place here yet.',
  },
  notes: {
    add: 'Add note',
    searchLabel: 'Search notes',
    searchPlaceholder: 'Title, content or tag',
    count: plural('1 note', (n) => `${n} notes`),
    countOf: (shown, total) => `${shown} of ${total} notes`,
    emptyTitle: 'Room for whatever your story needs to remember',
    emptyMessage: 'Rules, factions, objects or research. Private and optional.',
    noMatches: 'No note matches.',
    loadError: 'We could not load your notes.',
    capReached: (max) => `You reached the limit of ${max} notes in this work.`,
    categoryLabel: 'Category',
    categoryNone: 'No category',
    categories: {
      rule: 'Rule',
      faction: 'Faction',
      object: 'Object',
      magic: 'Magic',
      culture: 'Culture',
      research: 'Research',
      other: 'Other',
    },
    newTitle: 'New note',
    editTitle: 'Note',
    intro: 'For the rules of your world, or the context and research your story needs.',
    titleLabel: 'Title',
    titleRequired: 'Write a title.',
    bodyLabel: 'Content',
    bodyHint: 'A rule, a fact, some context you do not want to forget.',
    tags: 'Tags',
    tagAdd: 'Add tag',
    tagRemove: (tag) => `Remove tag ${tag}`,
    linkedNotes: 'Related notes',
    linkedScenes: 'Related scenes',
    linkSearch: 'Search to link',
    linkNone: 'Nothing to link yet.',
    linkSelected: plural('1 selected', (n) => `${n} selected`),
    untitled: 'Untitled note',
  },
  relations: {
    add: 'Add relationship',
    searchLabel: 'Search relationships',
    searchPlaceholder: 'Character, label or note',
    count: plural('1 relationship', (n) => `${n} relationships`),
    countOf: (shown, total) => `${shown} of ${total} relationships`,
    emptyTitle: 'No relationships yet',
    emptyMessage: 'Connect your characters whenever you like: family, rivalry, alliances…',
    noMatches: 'No relationship matches.',
    loadError: 'We could not load your relationships.',
    capReached: (max) => `You reached the limit of ${max} relationships in this work.`,
    editAction: 'Edit',
    viewLabel: 'View',
    viewList: 'List',
    viewGraph: 'Graph',
    typeLabel: 'Type',
    typeAll: 'All types',
    types: {
      family: 'Family',
      friendship: 'Friendship',
      romance: 'Romance',
      rivalry: 'Rivalry',
      mentorship: 'Mentorship',
      alliance: 'Alliance',
      antagonism: 'Antagonism',
      other: 'Other',
    },
    statusLabel: 'Status',
    statuses: { active: 'Active', past: 'Past', unknown: 'Unknown' },
    newTitle: 'New relationship',
    editTitle: 'Edit relationship',
    from: 'From',
    to: 'To',
    pick: 'Choose a character',
    sameCharacter: 'Choose two different characters.',
    typeField: 'Type of relationship',
    label: 'Your own label',
    labelHint: 'If you write one, it shows instead of the type.',
    notes: 'Notes',
    directed: 'Goes one way only',
    directedHelp: 'Turn it on if it is not mutual: for example, one admires the other.',
    needTwoTitle: 'You need at least two characters',
    needTwoMessage: 'Add another character and you can connect them here.',
    goCharacters: 'Go to Characters',
    rowDirected: (a, b) => `${a} towards ${b}`,
    rowMutual: (a, b) => `${a} and ${b}`,
    edit: (a, b) => `Edit the relationship between ${a} and ${b}`,
    trash: (a, b) => `Move to trash the relationship between ${a} and ${b}`,
    trashBody: 'You can restore it for 30 days.',
    listLabel: 'Relationships between characters',
    graph: {
      label: 'Relationship graph',
      hint: 'Move through the characters with Tab and open a sheet with Enter. The list has the same relationships.',
      canvasHelp: 'Drag to move the canvas. With the canvas focused, use the arrow keys to move and + or − to zoom.',
      node: plural('1 relationship', (n) => `${n} relationships`),
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomReset: 'Reset zoom',
      center: 'Center',
      legend: 'Legend',
      directedNote: 'Line with an arrow: goes one way.',
      mutualNote: 'Line without an arrow: mutual.',
      isolated: plural('1 character without relationships is not in the graph.', (n) => `${n} characters without relationships are not in the graph.`),
      emptyTitle: 'The graph needs two characters',
      emptyMessage: 'Add another character and connect them to see them here.',
      noRelations: 'No relationships to show yet.',
      narrow: 'The graph looks better on a larger screen. The list has the same data.',
      edge: (a, b, what, directed) => (directed ? `${a} towards ${b}: ${what}` : `${a} and ${b}: ${what}`),
    },
  },
};

const pt: UniverseCopy = {
  nav: {
    label: 'Seções do universo',
    privacy: 'O que você guarda aqui é privado: seus leitores não veem.',
    characters: 'Personagens',
    places: 'Lugares',
    notes: 'Notas e lore',
    relations: 'Relações',
  },
  common: {
    save: 'Salvar',
    saving: 'Salvando…',
    saved: 'Salvo',
    unsaved: 'Alterações não salvas',
    close: 'Fechar',
    cancel: 'Cancelar',
    retry: 'Tentar de novo',
    loading: 'Carregando…',
    sortLabel: 'Ordenar por',
    sortName: 'Nome',
    sortUpdated: 'Modificado recentemente',
    filterAll: 'Todos',
    tagLabel: 'Etiqueta',
    clearFilters: 'Limpar filtros',
    unnamed: 'Sem nome',
    saveFailed: 'Não foi possível salvar. Suas alterações continuam aqui; tente de novo.',
    saveFailedNetwork: 'Não foi possível salvar. Verifique sua conexão; suas alterações continuam aqui.',
    saveFailedInvalid: 'Algum dado não é válido. Verifique os campos e tente de novo.',
    saveFailedRate: 'Muitas tentativas seguidas. Espere um momento e tente de novo.',
    discardTitle: 'Descartar as alterações?',
    discardBody: 'Você tem alterações não salvas. Se sair agora, elas serão perdidas.',
    discardConfirm: 'Descartar alterações',
    discardKeep: 'Continuar editando',
    conflictTitle: 'Esta ficha mudou em outro lugar',
    conflictBody: 'Uma versão mais recente foi salva, talvez de outra aba ou dispositivo. Suas alterações continuam aqui, sem salvar.',
    viewSaved: 'Ver a versão salva',
    overwrite: 'Salvar a minha mesmo assim',
    overwriteTitle: 'Substituir a versão salva?',
    overwriteBody: 'A versão salva será substituída pela que você vê agora. Não dá para desfazer.',
    overwriteConfirm: 'Salvar a minha',
    trashAction: 'Mover para a lixeira',
    trashTitle: (name) => `Mover “${name}” para a lixeira?`,
    trashBody: 'Você poderá restaurar por 30 dias.',
    trashConfirm: 'Mover para a lixeira',
    trashed: 'Movido para a lixeira. Você pode restaurar por 30 dias.',
    trashFailed: 'Não foi possível mover para a lixeira. Tente de novo.',
    duplicateAction: 'Duplicar como modelo',
    duplicateHint: 'Salve suas alterações para poder duplicar.',
    duplicated: 'Cópia criada. É uma ficha nova, independente da original.',
    duplicateFailed: 'Não foi possível duplicar. Tente de novo.',
    copySuffix: '(cópia)',
    created: 'Criado.',
    linkLimit: (max) => `Você pode vincular até ${max}.`,
    untitledScene: 'Cena sem título',
    goPlan: 'Ver em Planejar',
    povSuffix: 'ponto de vista',
  },
  characters: {
    add: 'Adicionar personagem',
    searchLabel: 'Buscar personagens',
    searchPlaceholder: 'Nome, apelido ou etiqueta',
    count: plural('1 personagem', (n) => `${n} personagens`),
    countOf: (shown, total) => `${shown} de ${total} personagens`,
    emptyTitle: 'Os personagens podem esperar. A sua história, não.',
    emptyMessage: 'Você pode adicioná-los quando precisar.',
    noMatches: 'Nenhum personagem corresponde.',
    loadError: 'Não conseguimos carregar seus personagens.',
    capReached: (max) => `Você chegou ao máximo de ${max} personagens nesta obra.`,
    roleLabel: 'Papel',
    roleNone: 'Sem papel',
    roles: { protagonist: 'Protagonista', antagonist: 'Antagonista', secondary: 'Secundário', other: 'Outro' },
    states: { active: 'Ativo', absent: 'Ausente', deceased: 'Falecido', unknown: 'Desconhecido' },
    newTitle: 'Novo personagem',
    editTitle: 'Personagem',
    nameLabel: 'Nome',
    nameRequired: 'Escreva um nome.',
    aliases: 'Apelidos',
    aliasesHint: 'Se tiver vários, separe por vírgulas.',
    summary: 'Descrição breve',
    summaryHint: 'Quem é, em uma ou duas frases.',
    tags: 'Etiquetas',
    tagAdd: 'Adicionar etiqueta',
    tagRemove: (tag) => `Remover etiqueta ${tag}`,
    moreDetails: 'Mais detalhes',
    lessDetails: 'Menos detalhes',
    moreHint: 'Tudo isto é opcional. Preencha só o que ajudar você a escrever.',
    groups: { identity: 'Identidade', inner: 'Vida interior', arc: 'Arco', voice: 'Voz', notes: 'Notas livres' },
    texts: {
      age: 'Idade ou fase da vida',
      pronouns: 'Pronomes',
      appearance: 'Aparência',
      personality: 'Personalidade',
      strengths: 'Qualidades',
      flaws: 'Defeitos',
      fear: 'Medo',
      desire: 'Desejo',
      externalGoal: 'Objetivo externo',
      internalNeed: 'Necessidade interna',
      conflict: 'Conflito',
      secret: 'Segredo',
      motivation: 'Motivação',
      arcStart: 'Onde começa',
      arcEnd: 'Onde termina',
      voice: 'Como fala',
      notes: 'Notas',
    },
    stateLabel: 'Estado narrativo',
    stateNone: 'Não definido',
    custom: {
      title: 'Campos próprios',
      hint: 'O que a sua história precisar: uma linhagem, um posto, uma mania.',
      add: 'Adicionar campo',
      key: 'Nome do campo',
      value: 'Valor',
      remove: (key) => `Remover o campo ${key}`,
      max: (n) => `Máximo de ${n} campos.`,
      keyRequired: 'Dê um nome ao campo.',
    },
    appearsIn: 'Aparece em',
    appearsNone: 'Ainda não aparece em nenhuma cena.',
    relations: 'Relações',
    relationsNone: 'Ainda sem relações.',
    relationOpen: (other) => `Abrir a relação com ${other}`,
  },
  places: {
    add: 'Adicionar lugar',
    searchLabel: 'Buscar lugares',
    searchPlaceholder: 'Nome, tipo ou etiqueta',
    count: plural('1 lugar', (n) => `${n} lugares`),
    countOf: (shown, total) => `${shown} de ${total} lugares`,
    emptyTitle: 'Ainda não há lugares',
    emptyMessage: 'Uma cidade, uma casa, um canto: adicione-os quando a história pedir.',
    noMatches: 'Nenhum lugar corresponde.',
    loadError: 'Não conseguimos carregar seus lugares.',
    capReached: (max) => `Você chegou ao máximo de ${max} lugares nesta obra.`,
    importanceLabel: 'Importância',
    importanceNone: 'Não definida',
    importances: { major: 'Principal', minor: 'Secundário' },
    newTitle: 'Novo lugar',
    editTitle: 'Lugar',
    nameLabel: 'Nome',
    nameRequired: 'Escreva um nome.',
    typeLabel: 'Tipo de lugar',
    typeHint: 'Cidade, casa, floresta, nave…',
    description: 'Descrição',
    history: 'História',
    atmosphere: 'Atmosfera',
    rules: 'Regras ou particularidades',
    tags: 'Etiquetas',
    tagAdd: 'Adicionar etiqueta',
    tagRemove: (tag) => `Remover etiqueta ${tag}`,
    scenes: 'Cenas neste lugar',
    scenesNone: 'Nenhuma cena acontece aqui ainda.',
  },
  notes: {
    add: 'Adicionar nota',
    searchLabel: 'Buscar notas',
    searchPlaceholder: 'Título, conteúdo ou etiqueta',
    count: plural('1 nota', (n) => `${n} notas`),
    countOf: (shown, total) => `${shown} de ${total} notas`,
    emptyTitle: 'Cabe aqui o que a sua história precisa lembrar',
    emptyMessage: 'Regras, facções, objetos ou pesquisa. É privado e opcional.',
    noMatches: 'Nenhuma nota corresponde.',
    loadError: 'Não conseguimos carregar suas notas.',
    capReached: (max) => `Você chegou ao máximo de ${max} notas nesta obra.`,
    categoryLabel: 'Categoria',
    categoryNone: 'Sem categoria',
    categories: {
      rule: 'Regra',
      faction: 'Facção',
      object: 'Objeto',
      magic: 'Magia',
      culture: 'Cultura',
      research: 'Pesquisa',
      other: 'Outra',
    },
    newTitle: 'Nova nota',
    editTitle: 'Nota',
    intro: 'Para as regras do seu mundo, ou para o contexto e a pesquisa de que a sua história precisa.',
    titleLabel: 'Título',
    titleRequired: 'Escreva um título.',
    bodyLabel: 'Conteúdo',
    bodyHint: 'Uma regra, um dado, um contexto que você não quer esquecer.',
    tags: 'Etiquetas',
    tagAdd: 'Adicionar etiqueta',
    tagRemove: (tag) => `Remover etiqueta ${tag}`,
    linkedNotes: 'Notas relacionadas',
    linkedScenes: 'Cenas relacionadas',
    linkSearch: 'Buscar para vincular',
    linkNone: 'Ainda não há nada para vincular.',
    linkSelected: plural('1 selecionada', (n) => `${n} selecionadas`),
    untitled: 'Nota sem título',
  },
  relations: {
    add: 'Adicionar relação',
    searchLabel: 'Buscar relações',
    searchPlaceholder: 'Personagem, rótulo ou nota',
    count: plural('1 relação', (n) => `${n} relações`),
    countOf: (shown, total) => `${shown} de ${total} relações`,
    emptyTitle: 'Ainda não há relações',
    emptyMessage: 'Conecte seus personagens quando quiser: família, rivalidade, alianças…',
    noMatches: 'Nenhuma relação corresponde.',
    loadError: 'Não conseguimos carregar suas relações.',
    capReached: (max) => `Você chegou ao máximo de ${max} relações nesta obra.`,
    editAction: 'Editar',
    viewLabel: 'Visualização',
    viewList: 'Lista',
    viewGraph: 'Grafo',
    typeLabel: 'Tipo',
    typeAll: 'Todos os tipos',
    types: {
      family: 'Família',
      friendship: 'Amizade',
      romance: 'Romance',
      rivalry: 'Rivalidade',
      mentorship: 'Mentoria',
      alliance: 'Aliança',
      antagonism: 'Antagonismo',
      other: 'Outra',
    },
    statusLabel: 'Estado',
    statuses: { active: 'Ativa', past: 'Passada', unknown: 'Desconhecida' },
    newTitle: 'Nova relação',
    editTitle: 'Editar relação',
    from: 'De',
    to: 'Para',
    pick: 'Escolha um personagem',
    sameCharacter: 'Escolha dois personagens diferentes.',
    typeField: 'Tipo de relação',
    label: 'Rótulo próprio',
    labelHint: 'Se você escrever um, ele aparece no lugar do tipo.',
    notes: 'Notas',
    directed: 'Vai em uma só direção',
    directedHelp: 'Ative se não for recíproca: por exemplo, um admira o outro.',
    needTwoTitle: 'Você precisa de pelo menos dois personagens',
    needTwoMessage: 'Adicione outro personagem e você poderá conectá-los aqui.',
    goCharacters: 'Ir para Personagens',
    rowDirected: (a, b) => `${a} para ${b}`,
    rowMutual: (a, b) => `${a} e ${b}`,
    edit: (a, b) => `Editar a relação entre ${a} e ${b}`,
    trash: (a, b) => `Mover para a lixeira a relação entre ${a} e ${b}`,
    trashBody: 'Você poderá restaurar por 30 dias.',
    listLabel: 'Relações entre personagens',
    graph: {
      label: 'Grafo de relações',
      hint: 'Percorra os personagens com Tab e abra a ficha com Enter. A lista tem as mesmas relações.',
      canvasHelp: 'Arraste para mover a tela. Com a tela em foco, use as setas para mover e + ou − para aproximar.',
      node: plural('1 relação', (n) => `${n} relações`),
      zoomIn: 'Aproximar',
      zoomOut: 'Afastar',
      zoomReset: 'Redefinir zoom',
      center: 'Centralizar',
      legend: 'Legenda',
      directedNote: 'Linha com seta: vai em uma direção.',
      mutualNote: 'Linha sem seta: é recíproca.',
      isolated: plural('1 personagem sem relações não aparece no grafo.', (n) => `${n} personagens sem relações não aparecem no grafo.`),
      emptyTitle: 'O grafo precisa de dois personagens',
      emptyMessage: 'Adicione outro personagem e conecte-os para vê-los aqui.',
      noRelations: 'Ainda não há relações para mostrar.',
      narrow: 'O grafo fica melhor em uma tela maior. A lista tem os mesmos dados.',
      edge: (a, b, what, directed) => (directed ? `${a} para ${b}: ${what}` : `${a} e ${b}: ${what}`),
    },
  },
};

export const UNIVERSE_COPY: Record<Locale, UniverseCopy> = { es, en, pt };
