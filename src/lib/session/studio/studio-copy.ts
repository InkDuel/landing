import type { Locale } from '@/lib/i18n';

// InkDuel Studio copy: shell, manuscript, editor, history, context panel,
// publish and portability. Neutral Spanish with tuteo (never voseo) is the
// editorial source; en and pt-BR are idiomatic equivalents. Universe, plan and
// progress keep their own files (studio-universe-copy.ts, studio-plan-copy.ts).

type N = (n: string) => string;
type Plural = (count: number, formatted: string) => string;
const plural = (one: string, other: N): Plural => (count, formatted) => (count === 1 ? one : other(formatted));

export type StudioCopy = {
  areas: { label: string; write: string; plan: string; universe: string; progress: string; publish: string };
  shell: {
    breadcrumbWorks: string;
    untitled: string;
    statusDraft: string;
    statusPublished: string;
    statusInStories: string;
    viewWork: string;
    editTitle: string;
    addTitle: string;
    titleLabel: string;
    saveTitle: string;
    loadError: string;
    notFound: string;
    retry: string;
    cancel: string;
    close: string;
    loading: string;
    hiddenTitle: string;
    hiddenBody: string;
    unavailableExport: string;
    unavailableExportBody: string;
    privateNote: string;
    commandPalette: string;
    commandPlaceholder: string;
    commandEmpty: string;
    commandChapters: string;
    commandGo: string;
    tipsTitle: string;
    tips: [string, string, string];
    tipsDismiss: string;
    cannotLeave: string;
  };
  manuscript: {
    title: string;
    open: string;
    filter: string;
    newChapter: string;
    creating: string;
    empty: string;
    emptyTitle: string;
    emptyAction: string;
    emptyPlan: string;
    chapterLabel: (order: number) => string;
    newDraftLabel: string;
    untitledDraft: string;
    published: string;
    publishedPending: string;
    unpublished: string;
    notChapterYet: string;
    changedElsewhere: string;
    seededFromDuel: string;
    words: Plural;
    limitReached: (n: string) => string;
    trash: string;
    import: string;
    noMatches: string;
  };
  status: { label: string; idea: string; draft: string; revising: string; ready: string };
  editor: {
    titleHint: string;
    bodyHint: string;
    synopsis: string;
    synopsisHint: string;
    synopsisSave: string;
    synopsisSaved: string;
    words: Plural;
    chars: (n: string) => string;
    reading: (n: string) => string;
    readingEstimate: string;
    session: (n: string) => string;
    sessionGoal: (n: string, goal: string) => string;
    publishLimit: (n: string, max: string) => string;
    overPublishLimit: (max: string) => string;
    splitAtCursor: string;
    splitTitle: string;
    splitBody: string;
    splitConfirm: string;
    splitDone: string;
    tooLong: (max: string) => string;
    find: string;
    findLabel: string;
    findNext: string;
    findPrev: string;
    findCount: (i: string, n: string) => string;
    findNone: string;
    findClose: string;
    focus: string;
    exitFocus: string;
    focusHint: string;
    settings: string;
    notes: string;
    versions: string;
    publishThis: string;
    menu: string;
    discard: string;
    discardTitle: string;
    discardBody: string;
    discardConfirm: string;
    trashDraft: string;
    trashTitle: string;
    trashBody: string;
    trashConfirm: string;
    publishedLive: string;
    publishedUnchanged: string;
    openFailed: string;
    pickChapter: string;
    shortcuts: string;
    shortcutSave: string;
    shortcutPalette: string;
    shortcutFind: string;
    shortcutFocus: string;
    changedOutsideTitle: string;
    changedOutsideBody: string;
    compareOutside: string;
    takeOutside: string;
    takeOutsideTitle: string;
    takeOutsideBody: string;
    outsideVersion: string;
    readOnly: string;
    metaFailed: string;
  };
  save: {
    clean: string;
    dirty: string;
    saving: string;
    saved: string;
    retrying: string;
    failed: string;
    conflict: string;
    local: string;
    invalid: string;
    savedNow: string;
    retry: string;
    exportCopy: string;
  };
  conflict: {
    title: string;
    body: string;
    useServer: string;
    saveCopy: string;
    compare: string;
    compareTitle: string;
    yours: string;
    server: string;
    keepMine: string;
    keepMineConfirm: string;
    keepMineConfirmBody: string;
    copyTitle: (title: string) => string;
    copySaved: string;
    useServerTitle: string;
    useServerBody: string;
    keepMineFailed: string;
  };
  recovery: {
    title: (when: string) => string;
    body: string;
    restore: string;
    discard: string;
    export: string;
    conflictBody: string;
    saveAsCopy: string;
    settingLabel: string;
    settingHelp: string;
    unavailable: string;
  };
  lock: { title: string; body: string; takeOver: string; taken: string; unsupported: string; otherUnsynced: string; unsyncedHere: string; taking: string };
  prefs: {
    title: string;
    font: string;
    serif: string;
    sans: string;
    size: string;
    sizes: [string, string, string, string];
    lineHeight: string;
    lineHeights: [string, string, string];
    width: string;
    widths: [string, string, string];
    spellcheck: string;
    appearance: string;
    smaller: string;
    larger: string;
    more: string;
    moreTitle: string;
  };
  versions: {
    title: string;
    intro: string;
    saveVersion: string;
    labelHint: string;
    saving: string;
    empty: string;
    kindManual: string;
    kindAuto: string;
    kindPublish: string;
    kindBackup: string;
    reasonBeforeImport: string;
    reasonBeforeRestore: string;
    reasonBeforeDiscard: string;
    reasonBeforeSplit: string;
    view: string;
    restore: string;
    restoreTitle: string;
    restoreBody: string;
    restoreConfirm: string;
    restored: string;
    delete: string;
    deleteTitle: string;
    deleteBody: string;
    limit: (n: string) => string;
    loadError: string;
    words: Plural;
    unsavedFirst: string;
  };
  context: {
    title: string;
    quickNotes: string;
    tabNotes: string;
    tabPinned: string;
    tabSearch: string;
    noteFilter: string;
    pinnedNote: string;
    quickNoteHint: string;
    addNote: string;
    noNotes: string;
    thisChapter: string;
    allChapters: string;
    pinned: string;
    pin: string;
    unpin: string;
    pinHint: string;
    pinPick: string;
    noPinned: string;
    search: string;
    searchHint: string;
    searchEmpty: string;
    searchTruncated: string;
    searchError: string;
    resultKinds: Record<string, string>;
    deleteNote: string;
    noteSaveError: string;
  };
  publish: {
    title: string;
    intro: string;
    chaptersTitle: string;
    upToDate: string;
    pendingChanges: string;
    neverPublished: string;
    willBe: (order: number) => string;
    review: string;
    reviewTitle: string;
    checklist: string;
    checkTitle: string;
    checkBody: string;
    checkLimit: (max: string) => string;
    checkSynced: string;
    checkReady: string;
    checkReadyHint: string;
    preview: string;
    previewHint: string;
    publishedNote: string;
    confirm: string;
    confirmNew: (order: number) => string;
    publishing: string;
    done: string;
    doneFirst: string;
    publishedConflictTitle: string;
    publishedConflictBody: string;
    replace: string;
    currentPublished: string;
    yourVersion: string;
    draftConflict: string;
    blockedTooLong: (max: string) => string;
    blockedEmpty: string;
    blockedHidden: string;
    blockedLimit: string;
    blockedUnsaved: string;
    failed: string;
    workTitle: string;
    workIntro: string;
    readerLink: string;
    moderationActive: string;
    moderationHidden: string;
    wordsDelta: (delta: string) => string;
    nothingToPublish: string;
    checkMet: string;
    checkMissing: string;
    blockedReason: string;
  };
  portability: {
    title: string;
    intro: string;
    exportTitle: string;
    formatTxt: string;
    formatMd: string;
    formatDocx: string;
    formatJson: string;
    formatJsonHint: string;
    versionLabel: string;
    versionDraft: string;
    versionPublished: string;
    download: string;
    downloading: string;
    exportFailed: string;
    exportDone: (name: string) => string;
    dirtyTitle: string;
    dirtyBody: string;
    dirtySaveFirst: string;
    dirtyLocalCopy: string;
    importTitle: string;
    importIntro: string;
    importPick: string;
    importInvalid: string;
    importTooBig: (kb: string) => string;
    importTooLong: (max: string) => string;
    importPreviewTitle: string;
    importStats: (words: string, chars: string) => string;
    importAsNew: string;
    importReplace: string;
    importReplaceHint: string;
    importSplit: string;
    importSplitHint: (n: string) => string;
    importConfirm: string;
    importing: string;
    importDone: string;
    importFailed: string;
    importChapters: Plural;
    importNoCurrent: string;
  };
  trash: {
    title: string;
    intro: string;
    empty: string;
    restore: string;
    purge: string;
    purgeTitle: string;
    purgeBody: string;
    purgeAt: (date: string) => string;
    kinds: Record<string, string>;
    error: string;
  };
};

const es: StudioCopy = {
  areas: { label: 'Áreas de la obra', write: 'Escribir', plan: 'Planificar', universe: 'Universo', progress: 'Progreso', publish: 'Publicar' },
  shell: {
    breadcrumbWorks: 'Mis obras',
    untitled: 'Sin título',
    statusDraft: 'Borrador',
    statusPublished: 'Publicada',
    statusInStories: 'Publicada · en Historias',
    viewWork: 'Ver obra',
    editTitle: 'Editar título',
    addTitle: 'Añadir título',
    titleLabel: 'Título de la obra',
    saveTitle: 'Guardar título',
    loadError: 'No pudimos abrir esta obra.',
    notFound: 'Esta obra no existe o no es tuya.',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    loading: 'Cargando…',
    hiddenTitle: 'Esta obra no está disponible para lectores',
    hiddenBody: 'Puedes seguir escribiendo y exportarla, pero no publicarla.',
    unavailableExport: 'Exportar tu obra',
    unavailableExportBody: 'Tus borradores y fichas siguen guardados. Descárgalos cuando quieras.',
    privateNote: 'Borradores, fichas y notas son privados aunque la obra esté publicada.',
    commandPalette: 'Ir a…',
    commandPlaceholder: 'Busca un capítulo o un área',
    commandEmpty: 'Nada coincide.',
    commandChapters: 'Capítulos',
    commandGo: 'Ir',
    tipsTitle: 'Tres consejos',
    tips: [
      'Escribe primero: los personajes y el plan pueden esperar.',
      'Cmd/Ctrl+S guarda al instante; el resto se guarda solo.',
      'Publicar es siempre una decisión tuya: tus lectores ven la versión publicada hasta que confirmes otra.',
    ],
    tipsDismiss: 'Entendido',
    cannotLeave: 'Primero resuelve los cambios sin guardar de este capítulo.',
  },
  manuscript: {
    title: 'Manuscrito',
    open: 'Capítulos',
    filter: 'Buscar capítulo',
    newChapter: 'Nuevo capítulo',
    creating: 'Creando…',
    empty: 'Cada gran historia comienza con una línea.',
    emptyTitle: 'Tu historia comienza aquí',
    emptyAction: 'Escribir primer capítulo',
    emptyPlan: 'Planificar primero',
    chapterLabel: (o) => `Capítulo ${o}`,
    newDraftLabel: 'Capítulo nuevo',
    untitledDraft: 'Sin título',
    published: 'Publicado',
    publishedPending: 'Cambios sin publicar',
    unpublished: 'Sin publicar',
    notChapterYet: 'Aún no publicado',
    changedElsewhere: 'Cambió en otro dispositivo',
    seededFromDuel: 'Nació en un duelo',
    words: plural('1 palabra', (n) => `${n} palabras`),
    limitReached: (n) => `Llegaste al máximo de ${n} borradores en esta obra.`,
    trash: 'Papelera',
    import: 'Importar',
    noMatches: 'Ningún capítulo coincide.',
  },
  status: { label: 'Estado', idea: 'Idea', draft: 'Borrador', revising: 'En revisión', ready: 'Listo' },
  editor: {
    titleHint: 'Título del capítulo',
    bodyHint: 'Empieza a escribir…',
    synopsis: 'Sinopsis privada',
    synopsisHint: 'De qué trata este capítulo, para ti.',
    synopsisSave: 'Guardar sinopsis',
    synopsisSaved: 'Sinopsis guardada',
    words: plural('1 palabra', (n) => `${n} palabras`),
    chars: (n) => `${n} caracteres`,
    reading: (n) => `${n} min de lectura`,
    readingEstimate: 'estimado',
    session: (n) => `+${n} en esta sesión`,
    sessionGoal: (n, g) => `+${n} de ${g} en esta sesión`,
    publishLimit: (n, max) => `${n} / ${max} para publicar`,
    overPublishLimit: (max) =>
      `Supera el límite de publicación (${max} caracteres). Puedes seguir escribiendo; para publicarlo, divídelo en dos capítulos.`,
    splitAtCursor: 'Mover el texto desde el cursor a un capítulo nuevo',
    splitTitle: '¿Dividir el capítulo aquí?',
    splitBody: 'El texto desde el cursor pasa a un capítulo nuevo, sin publicar. Antes guardamos una versión de este capítulo.',
    splitConfirm: 'Dividir',
    splitDone: 'Listo: el resto del texto está en un capítulo nuevo.',
    tooLong: (max) => `Un borrador admite hasta ${max} caracteres.`,
    find: 'Buscar en el capítulo',
    findLabel: 'Texto a buscar',
    findNext: 'Siguiente',
    findPrev: 'Anterior',
    findCount: (i, n) => `${i} de ${n}`,
    findNone: 'Sin resultados',
    findClose: 'Cerrar búsqueda',
    focus: 'Modo foco',
    exitFocus: 'Salir del foco',
    focusHint: 'Esc para salir',
    settings: 'Ajustes de escritura',
    notes: 'Notas y referencias',
    versions: 'Versiones',
    publishThis: 'Publicar…',
    menu: 'Más acciones',
    discard: 'Descartar cambios sin publicar',
    discardTitle: '¿Volver a la versión publicada?',
    discardBody: 'Tu borrador actual se guarda en Versiones antes de reemplazarlo.',
    discardConfirm: 'Volver a la versión publicada',
    trashDraft: 'Mover a la papelera',
    trashTitle: '¿Mover este capítulo a la papelera?',
    trashBody: 'Nunca se publicó. Podrás recuperarlo durante 30 días.',
    trashConfirm: 'Mover a la papelera',
    publishedLive: 'Este capítulo está publicado.',
    publishedUnchanged: 'Tu versión publicada no cambiará hasta que confirmes.',
    openFailed: 'No pudimos abrir este capítulo.',
    pickChapter: 'Elige un capítulo o crea uno nuevo.',
    shortcuts: 'Atajos',
    shortcutSave: 'Guardar ahora',
    shortcutPalette: 'Ir a un capítulo o área',
    shortcutFind: 'Buscar en el capítulo',
    shortcutFocus: 'Modo foco',
    changedOutsideTitle: 'El capítulo cambió fuera del Studio',
    changedOutsideBody: 'Alguien lo editó desde otro dispositivo o desde la app. Tu borrador no incluye esos cambios.',
    compareOutside: 'Comparar',
    takeOutside: 'Traer ese texto',
    takeOutsideTitle: '¿Reemplazar tu borrador con el texto del capítulo?',
    takeOutsideBody: 'Tu borrador actual se guarda en Versiones antes de reemplazarlo.',
    outsideVersion: 'Texto del capítulo',
    readOnly: 'Solo lectura',
    metaFailed: 'No se pudo guardar. Vuelve a intentarlo.',
  },
  save: {
    clean: 'Sincronizado',
    dirty: 'Cambios sin guardar',
    saving: 'Guardando cambios…',
    saved: 'Sincronizado',
    retrying: 'No se pudo sincronizar · Reintentando…',
    failed: 'No se pudo sincronizar.',
    conflict: 'Este capítulo cambió en otro lugar',
    local: 'Guardado en este dispositivo · Pendiente de sincronizar',
    invalid: 'No se puede guardar así',
    savedNow: 'Guardado',
    retry: 'Reintentar',
    exportCopy: 'Exportar copia',
  },
  conflict: {
    title: 'Este capítulo cambió en otro dispositivo',
    body: 'Tu texto sigue aquí. Elige qué hacer: nada se sobrescribe sin tu confirmación.',
    useServer: 'Usar la versión del servidor',
    saveCopy: 'Guardar mi versión como copia',
    compare: 'Comparar',
    compareTitle: 'Comparar versiones',
    yours: 'Tu versión (en este dispositivo)',
    server: 'Versión guardada',
    keepMine: 'Conservar mi versión',
    keepMineConfirm: 'Reemplazar la versión guardada',
    keepMineConfirmBody: 'La versión guardada se conserva en Versiones y la tuya pasa a ser la actual.',
    copyTitle: (t) => (t ? `${t} (copia)` : 'Copia'),
    copySaved: 'Tu versión se guardó como un capítulo nuevo.',
    useServerTitle: '¿Reemplazar tu texto por la versión guardada?',
    useServerBody: 'El texto de este dispositivo se perderá. Si quieres conservarlo, guárdalo antes como copia.',
    keepMineFailed: 'No pudimos guardar la versión del servidor en Versiones, así que no la reemplazamos. Guarda tu versión como copia.',
  },
  recovery: {
    title: (when) => `Encontramos texto sin sincronizar de ${when}`,
    body: 'Quedó guardado en este navegador. Puedes recuperarlo o descartarlo.',
    restore: 'Recuperar',
    discard: 'Descartar',
    export: 'Exportar copia',
    conflictBody: 'Desde entonces el capítulo cambió en el servidor. Guarda tu texto como copia para no perder nada.',
    saveAsCopy: 'Guardar como copia',
    settingLabel: 'Copia de emergencia en este navegador',
    settingHelp:
      'Si falla la conexión, tu texto se guarda aquí hasta sincronizarse. Quien use este dispositivo podría verlo. No está cifrado. Se borra al sincronizar o al cerrar sesión.',
    unavailable: 'Este navegador no permite guardar una copia local.',
  },
  lock: {
    title: 'Este capítulo está abierto en otra pestaña',
    body: 'Para evitar sobrescrituras, aquí solo puedes leerlo.',
    takeOver: 'Editar aquí',
    taken: 'Seguiste en otra pestaña. Aquí el capítulo quedó en modo lectura.',
    unsupported: 'Este navegador no puede coordinar pestañas: edita este capítulo en una sola.',
    otherUnsynced: 'La otra pestaña no pudo sincronizar todo: su texto sigue allí.',
    unsyncedHere: 'Este texto no se sincronizó. Descárgalo o guárdalo como copia antes de seguir.',
    taking: 'Pasando a esta pestaña…',
  },
  prefs: {
    title: 'Ajustes de escritura',
    font: 'Tipografía',
    serif: 'Literaria',
    sans: 'Sin serifa',
    size: 'Tamaño',
    sizes: ['Pequeño', 'Normal', 'Grande', 'Muy grande'],
    lineHeight: 'Interlineado',
    lineHeights: ['Compacto', 'Normal', 'Amplio'],
    width: 'Ancho del texto',
    widths: ['Estrecho', 'Normal', 'Amplio'],
    spellcheck: 'Corrector ortográfico del navegador',
    appearance: 'Apariencia del texto',
    smaller: 'Texto más pequeño',
    larger: 'Texto más grande',
    more: 'Más ajustes…',
    moreTitle: 'Más ajustes',
  },
  versions: {
    title: 'Versiones',
    intro: 'Guarda una versión antes de un cambio grande. Restaurar crea una versión nueva: nada se pierde.',
    saveVersion: 'Guardar versión',
    labelHint: 'Nombre (opcional)',
    saving: 'Guardando…',
    empty: 'Todavía no hay versiones de este capítulo.',
    kindManual: 'Guardada por ti',
    kindAuto: 'Automática',
    kindPublish: 'Publicada',
    kindBackup: 'Copia de seguridad',
    reasonBeforeImport: 'Antes de importar',
    reasonBeforeRestore: 'Antes de restaurar',
    reasonBeforeDiscard: 'Antes de descartar cambios',
    reasonBeforeSplit: 'Antes de dividir',
    view: 'Ver',
    restore: 'Restaurar',
    restoreTitle: '¿Restaurar esta versión?',
    restoreBody: 'Tu texto actual se guarda como copia de seguridad. La versión publicada no cambia.',
    restoreConfirm: 'Restaurar versión',
    restored: 'Versión restaurada.',
    delete: 'Eliminar versión',
    deleteTitle: '¿Eliminar esta versión?',
    deleteBody: 'No se puede deshacer.',
    limit: (n) => `Puedes guardar hasta ${n} versiones a mano por capítulo. Elimina alguna para guardar otra.`,
    loadError: 'No pudimos cargar las versiones.',
    words: plural('1 palabra', (n) => `${n} palabras`),
    unsavedFirst: 'Guardamos tus cambios antes de continuar.',
  },
  context: {
    title: 'Notas y referencias',
    quickNotes: 'Notas rápidas',
    tabNotes: 'Notas',
    tabPinned: 'Fijados',
    tabSearch: 'Buscar',
    noteFilter: 'Mostrar notas',
    pinnedNote: 'Fijada',
    quickNoteHint: 'Anota una idea sin salir del capítulo',
    addNote: 'Añadir nota',
    noNotes: 'Sin notas por ahora.',
    thisChapter: 'De este capítulo',
    allChapters: 'Todas',
    pinned: 'Fijados',
    pin: 'Fijar',
    unpin: 'Quitar',
    pinHint: 'Fija un personaje, lugar o escena para tenerlo a la vista mientras escribes.',
    pinPick: 'Elegir para fijar',
    noPinned: 'Nada fijado.',
    search: 'Buscar en la obra',
    searchHint: 'Palabras, nombres, lugares…',
    searchEmpty: 'Sin resultados.',
    searchTruncated: 'Hay más resultados: afina la búsqueda.',
    searchError: 'No pudimos buscar.',
    resultKinds: {
      draft: 'Capítulo',
      chapter: 'Capítulo',
      characters: 'Personaje',
      places: 'Lugar',
      notes: 'Nota',
      scenes: 'Escena',
      relations: 'Relación',
    },
    deleteNote: 'Eliminar nota',
    noteSaveError: 'No se pudo guardar la nota.',
  },
  publish: {
    title: 'Publicar',
    intro: 'Tus lectores ven la versión publicada. Publicar una versión nueva es siempre tu decisión.',
    chaptersTitle: 'Capítulos',
    upToDate: 'Publicado · al día',
    pendingChanges: 'Publicado · con cambios sin publicar',
    neverPublished: 'Sin publicar',
    willBe: (o) => `Se publicará como Capítulo ${o}`,
    review: 'Revisar y publicar',
    reviewTitle: 'Revisión antes de publicar',
    checklist: 'Lista de revisión',
    checkTitle: 'Tiene título',
    checkBody: 'Tiene texto',
    checkLimit: (max) => `Hasta ${max} caracteres (lo que admite la app)`,
    checkSynced: 'Todo está guardado',
    checkReady: 'Marcado como listo',
    checkReadyHint: 'Es una sugerencia, no un requisito.',
    preview: 'Vista previa',
    previewHint: 'Así lo leerán tus lectores',
    publishedNote: 'Tu versión publicada no cambiará hasta que confirmes.',
    confirm: 'Publicar esta versión',
    confirmNew: (o) => `Publicar como Capítulo ${o}`,
    publishing: 'Publicando…',
    done: 'Publicado. Tus lectores ya ven esta versión.',
    doneFirst: 'Publicado. El capítulo ya está disponible para tus lectores.',
    publishedConflictTitle: 'La versión publicada cambió',
    publishedConflictBody: 'Alguien la modificó desde otro dispositivo o desde la app. Revisa antes de reemplazarla.',
    replace: 'Reemplazar con mi versión',
    currentPublished: 'Publicada ahora',
    yourVersion: 'Tu versión',
    draftConflict: 'El capítulo cambió mientras revisabas. Vuelve a revisarlo.',
    blockedTooLong: (max) => `Supera los ${max} caracteres que admite la app. Divídelo para publicarlo.`,
    blockedEmpty: 'Escribe algo antes de publicar.',
    blockedHidden: 'Esta obra no está disponible y no se puede publicar.',
    blockedLimit: 'Esta obra llegó al máximo de capítulos.',
    blockedUnsaved: 'Hay cambios sin sincronizar. Sincroniza antes de publicar.',
    failed: 'No se pudo publicar. Tu texto está a salvo.',
    workTitle: 'La obra',
    workIntro: 'Para aparecer en Historias, la obra necesita título y al menos un capítulo publicado.',
    readerLink: 'Ver como lector',
    moderationActive: 'Moderación: activa',
    moderationHidden: 'Moderación: no disponible para lectores',
    wordsDelta: (d) => `${d} palabras respecto a la versión publicada`,
    nothingToPublish: 'No hay cambios por publicar.',
    checkMet: 'Cumplido',
    checkMissing: 'Pendiente',
    blockedReason: 'No se puede publicar todavía: revisa la lista.',
  },
  portability: {
    title: 'Tu obra es tuya. Llévala contigo.',
    intro: 'Exportar es gratis y está siempre disponible.',
    exportTitle: 'Exportar',
    formatTxt: 'Texto (.txt)',
    formatMd: 'Markdown (.md)',
    formatDocx: 'Word (.docx)',
    formatJson: 'Respaldo completo (.json)',
    formatJsonHint: 'Incluye borradores, personajes, lugares, notas, escenas, relaciones y metas. Es un respaldo; todavía no se puede importar.',
    versionLabel: 'Versión',
    versionDraft: 'Manuscrito de trabajo',
    versionPublished: 'Solo lo publicado',
    download: 'Descargar',
    downloading: 'Preparando…',
    exportFailed: 'No se pudo exportar. Inténtalo de nuevo.',
    exportDone: (n) => `Descargado: ${n}`,
    dirtyTitle: 'Hay cambios sin sincronizar',
    dirtyBody: 'La exportación incluye lo que está en el servidor.',
    dirtySaveFirst: 'Sincronizar y exportar',
    dirtyLocalCopy: 'Exportar también mi copia local',
    importTitle: 'Importar',
    importIntro: 'Archivos .txt o .md en UTF-8. El Markdown se importa como texto, sin interpretarlo.',
    importPick: 'Elegir archivo',
    importInvalid: 'El archivo no es texto UTF-8 válido.',
    importTooBig: (kb) => `El archivo supera ${kb} KB.`,
    importTooLong: (max) => `Un capítulo admite hasta ${max} caracteres.`,
    importPreviewTitle: 'Antes de importar',
    importStats: (w, c) => `${w} palabras · ${c} caracteres`,
    importAsNew: 'Como un capítulo nuevo',
    importReplace: 'Reemplazar el capítulo abierto',
    importReplaceHint: 'Antes guardamos una versión del capítulo actual.',
    importSplit: 'Un capítulo por cada encabezado #',
    importSplitHint: (n) => `Se crearán ${n} capítulos nuevos, sin publicar.`,
    importConfirm: 'Importar',
    importing: 'Importando…',
    importDone: 'Importado. Nada se publicó.',
    importFailed: 'No se pudo importar.',
    importChapters: plural('1 capítulo', (n) => `${n} capítulos`),
    importNoCurrent: 'Abre un capítulo para poder reemplazarlo.',
  },
  trash: {
    title: 'Papelera',
    intro: 'Lo que borras se guarda aquí 30 días.',
    empty: 'La papelera está vacía.',
    restore: 'Restaurar',
    purge: 'Eliminar para siempre',
    purgeTitle: '¿Eliminar para siempre?',
    purgeBody: 'No se puede deshacer.',
    purgeAt: (d) => `Se elimina el ${d}`,
    kinds: { drafts: 'Capítulo', characters: 'Personaje', places: 'Lugar', notes: 'Nota', scenes: 'Escena', relations: 'Relación' },
    error: 'No pudimos cargar la papelera.',
  },
};

const en: StudioCopy = {
  areas: { label: 'Work areas', write: 'Write', plan: 'Plan', universe: 'World', progress: 'Progress', publish: 'Publish' },
  shell: {
    breadcrumbWorks: 'My works',
    untitled: 'Untitled',
    statusDraft: 'Draft',
    statusPublished: 'Published',
    statusInStories: 'Published · in Stories',
    viewWork: 'View work',
    editTitle: 'Edit title',
    addTitle: 'Add a title',
    titleLabel: 'Work title',
    saveTitle: 'Save title',
    loadError: "We couldn't open this work.",
    notFound: "This work doesn't exist or isn't yours.",
    retry: 'Try again',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading…',
    hiddenTitle: 'This work is not available to readers',
    hiddenBody: 'You can keep writing and export it, but not publish it.',
    unavailableExport: 'Export your work',
    unavailableExportBody: 'Your drafts and notes are still saved. Download them whenever you want.',
    privateNote: 'Drafts, profiles and notes stay private even when the work is published.',
    commandPalette: 'Go to…',
    commandPlaceholder: 'Find a chapter or an area',
    commandEmpty: 'Nothing matches.',
    commandChapters: 'Chapters',
    commandGo: 'Go',
    tipsTitle: 'Three tips',
    tips: [
      'Write first: characters and plans can wait.',
      'Cmd/Ctrl+S saves right away; everything else saves itself.',
      'Publishing is always your call: readers see the published version until you confirm a new one.',
    ],
    tipsDismiss: 'Got it',
    cannotLeave: 'First resolve the unsaved changes in this chapter.',
  },
  manuscript: {
    title: 'Manuscript',
    open: 'Chapters',
    filter: 'Find a chapter',
    newChapter: 'New chapter',
    creating: 'Creating…',
    empty: 'Every great story starts with a line.',
    emptyTitle: 'Your story starts here',
    emptyAction: 'Write the first chapter',
    emptyPlan: 'Plan first',
    chapterLabel: (o) => `Chapter ${o}`,
    newDraftLabel: 'New chapter',
    untitledDraft: 'Untitled',
    published: 'Published',
    publishedPending: 'Unpublished changes',
    unpublished: 'Not published',
    notChapterYet: 'Not published yet',
    changedElsewhere: 'Changed on another device',
    seededFromDuel: 'Born in a duel',
    words: plural('1 word', (n) => `${n} words`),
    limitReached: (n) => `You reached the maximum of ${n} drafts in this work.`,
    trash: 'Trash',
    import: 'Import',
    noMatches: 'No chapter matches.',
  },
  status: { label: 'Status', idea: 'Idea', draft: 'Draft', revising: 'Revising', ready: 'Ready' },
  editor: {
    titleHint: 'Chapter title',
    bodyHint: 'Start writing…',
    synopsis: 'Private synopsis',
    synopsisHint: 'What this chapter is about, for you.',
    synopsisSave: 'Save synopsis',
    synopsisSaved: 'Synopsis saved',
    words: plural('1 word', (n) => `${n} words`),
    chars: (n) => `${n} characters`,
    reading: (n) => `${n} min read`,
    readingEstimate: 'estimated',
    session: (n) => `+${n} this session`,
    sessionGoal: (n, g) => `+${n} of ${g} this session`,
    publishLimit: (n, max) => `${n} / ${max} to publish`,
    overPublishLimit: (max) =>
      `Over the publishing limit (${max} characters). Keep writing; to publish it, split it into two chapters.`,
    splitAtCursor: 'Move the text from the cursor to a new chapter',
    splitTitle: 'Split the chapter here?',
    splitBody: 'The text from the cursor moves to a new, unpublished chapter. We save a version of this chapter first.',
    splitConfirm: 'Split',
    splitDone: 'Done: the rest of the text is in a new chapter.',
    tooLong: (max) => `A draft holds up to ${max} characters.`,
    find: 'Find in chapter',
    findLabel: 'Text to find',
    findNext: 'Next',
    findPrev: 'Previous',
    findCount: (i, n) => `${i} of ${n}`,
    findNone: 'No results',
    findClose: 'Close search',
    focus: 'Focus mode',
    exitFocus: 'Exit focus',
    focusHint: 'Esc to exit',
    settings: 'Writing settings',
    notes: 'Notes and references',
    versions: 'Versions',
    publishThis: 'Publish…',
    menu: 'More actions',
    discard: 'Discard unpublished changes',
    discardTitle: 'Go back to the published version?',
    discardBody: 'Your current draft is kept in Versions before it is replaced.',
    discardConfirm: 'Go back to the published version',
    trashDraft: 'Move to trash',
    trashTitle: 'Move this chapter to the trash?',
    trashBody: 'It was never published. You can recover it for 30 days.',
    trashConfirm: 'Move to trash',
    publishedLive: 'This chapter is published.',
    publishedUnchanged: "Your published version won't change until you confirm.",
    openFailed: "We couldn't open this chapter.",
    pickChapter: 'Pick a chapter or start a new one.',
    shortcuts: 'Shortcuts',
    shortcutSave: 'Save now',
    shortcutPalette: 'Go to a chapter or area',
    shortcutFind: 'Find in chapter',
    shortcutFocus: 'Focus mode',
    changedOutsideTitle: 'The chapter changed outside Studio',
    changedOutsideBody: "It was edited from another device or the app. Your draft doesn't include those changes.",
    compareOutside: 'Compare',
    takeOutside: 'Bring that text in',
    takeOutsideTitle: "Replace your draft with the chapter's text?",
    takeOutsideBody: 'Your current draft is kept in Versions before it is replaced.',
    outsideVersion: "Chapter's text",
    readOnly: 'Read only',
    metaFailed: "Couldn't save. Please try again.",
  },
  save: {
    clean: 'Synced',
    dirty: 'Unsaved changes',
    saving: 'Saving changes…',
    saved: 'Synced',
    retrying: "Couldn't sync · Retrying…",
    failed: "Couldn't sync.",
    conflict: 'This chapter changed somewhere else',
    local: 'Saved on this device · Waiting to sync',
    invalid: "Can't be saved like this",
    savedNow: 'Saved',
    retry: 'Try again',
    exportCopy: 'Export a copy',
  },
  conflict: {
    title: 'This chapter changed on another device',
    body: 'Your text is still here. Choose what to do: nothing is overwritten without your confirmation.',
    useServer: 'Use the saved version',
    saveCopy: 'Save my version as a copy',
    compare: 'Compare',
    compareTitle: 'Compare versions',
    yours: 'Your version (on this device)',
    server: 'Saved version',
    keepMine: 'Keep my version',
    keepMineConfirm: 'Replace the saved version',
    keepMineConfirmBody: 'The saved version is kept in Versions and yours becomes the current one.',
    copyTitle: (t) => (t ? `${t} (copy)` : 'Copy'),
    copySaved: 'Your version was saved as a new chapter.',
    useServerTitle: 'Replace your text with the saved version?',
    useServerBody: 'The text on this device will be lost. To keep it, save it as a copy first.',
    keepMineFailed: "We couldn't keep the server's version in Versions, so we didn't replace it. Save your version as a copy.",
  },
  recovery: {
    title: (when) => `We found unsynced text from ${when}`,
    body: 'It was kept in this browser. You can recover it or discard it.',
    restore: 'Recover',
    discard: 'Discard',
    export: 'Export a copy',
    conflictBody: 'The chapter changed on the server since then. Save your text as a copy so nothing is lost.',
    saveAsCopy: 'Save as a copy',
    settingLabel: 'Emergency copy in this browser',
    settingHelp:
      "If the connection fails, your text is kept here until it syncs. Anyone using this device could see it. It isn't encrypted. It's deleted once synced or when you sign out.",
    unavailable: "This browser can't keep a local copy.",
  },
  lock: {
    title: 'This chapter is open in another tab',
    body: 'To avoid overwriting, you can only read it here.',
    takeOver: 'Edit here',
    taken: 'You continued in another tab. This one is now read-only.',
    unsupported: "This browser can't coordinate tabs: edit this chapter in a single one.",
    otherUnsynced: "The other tab couldn't sync everything: its text is still there.",
    unsyncedHere: "This text wasn't synced. Download it or save it as a copy before continuing.",
    taking: 'Moving to this tab…',
  },
  prefs: {
    title: 'Writing settings',
    font: 'Typeface',
    serif: 'Literary',
    sans: 'Sans serif',
    size: 'Size',
    sizes: ['Small', 'Normal', 'Large', 'Extra large'],
    lineHeight: 'Line spacing',
    lineHeights: ['Compact', 'Normal', 'Wide'],
    width: 'Text width',
    widths: ['Narrow', 'Normal', 'Wide'],
    spellcheck: "Browser's spell checker",
    appearance: 'Text appearance',
    smaller: 'Smaller text',
    larger: 'Larger text',
    more: 'More settings…',
    moreTitle: 'More settings',
  },
  versions: {
    title: 'Versions',
    intro: 'Save a version before a big change. Restoring creates a new version: nothing is lost.',
    saveVersion: 'Save version',
    labelHint: 'Name (optional)',
    saving: 'Saving…',
    empty: 'No versions of this chapter yet.',
    kindManual: 'Saved by you',
    kindAuto: 'Automatic',
    kindPublish: 'Published',
    kindBackup: 'Backup',
    reasonBeforeImport: 'Before importing',
    reasonBeforeRestore: 'Before restoring',
    reasonBeforeDiscard: 'Before discarding changes',
    reasonBeforeSplit: 'Before splitting',
    view: 'View',
    restore: 'Restore',
    restoreTitle: 'Restore this version?',
    restoreBody: "Your current text is kept as a backup. The published version doesn't change.",
    restoreConfirm: 'Restore version',
    restored: 'Version restored.',
    delete: 'Delete version',
    deleteTitle: 'Delete this version?',
    deleteBody: "This can't be undone.",
    limit: (n) => `You can save up to ${n} versions by hand per chapter. Delete one to save another.`,
    loadError: "We couldn't load the versions.",
    words: plural('1 word', (n) => `${n} words`),
    unsavedFirst: 'We save your changes before continuing.',
  },
  context: {
    title: 'Notes and references',
    quickNotes: 'Quick notes',
    tabNotes: 'Notes',
    tabPinned: 'Pinned',
    tabSearch: 'Search',
    noteFilter: 'Show notes',
    pinnedNote: 'Pinned',
    quickNoteHint: 'Jot down an idea without leaving the chapter',
    addNote: 'Add note',
    noNotes: 'No notes yet.',
    thisChapter: 'This chapter',
    allChapters: 'All',
    pinned: 'Pinned',
    pin: 'Pin',
    unpin: 'Remove',
    pinHint: 'Pin a character, place or scene to keep it in sight while you write.',
    pinPick: 'Choose something to pin',
    noPinned: 'Nothing pinned.',
    search: 'Search the work',
    searchHint: 'Words, names, places…',
    searchEmpty: 'No results.',
    searchTruncated: 'There are more results: narrow the search.',
    searchError: "We couldn't search.",
    resultKinds: {
      draft: 'Chapter',
      chapter: 'Chapter',
      characters: 'Character',
      places: 'Place',
      notes: 'Note',
      scenes: 'Scene',
      relations: 'Relationship',
    },
    deleteNote: 'Delete note',
    noteSaveError: "The note couldn't be saved.",
  },
  publish: {
    title: 'Publish',
    intro: 'Readers see the published version. Publishing a new one is always your decision.',
    chaptersTitle: 'Chapters',
    upToDate: 'Published · up to date',
    pendingChanges: 'Published · with unpublished changes',
    neverPublished: 'Not published',
    willBe: (o) => `Will be published as Chapter ${o}`,
    review: 'Review and publish',
    reviewTitle: 'Review before publishing',
    checklist: 'Checklist',
    checkTitle: 'Has a title',
    checkBody: 'Has text',
    checkLimit: (max) => `Up to ${max} characters (what the app supports)`,
    checkSynced: 'Everything is saved',
    checkReady: 'Marked as ready',
    checkReadyHint: "It's a suggestion, not a requirement.",
    preview: 'Preview',
    previewHint: 'This is how your readers will see it',
    publishedNote: "Your published version won't change until you confirm.",
    confirm: 'Publish this version',
    confirmNew: (o) => `Publish as Chapter ${o}`,
    publishing: 'Publishing…',
    done: 'Published. Your readers now see this version.',
    doneFirst: 'Published. The chapter is now available to your readers.',
    publishedConflictTitle: 'The published version changed',
    publishedConflictBody: 'It was modified from another device or the app. Review it before replacing it.',
    replace: 'Replace with my version',
    currentPublished: 'Published now',
    yourVersion: 'Your version',
    draftConflict: 'The chapter changed while you were reviewing. Review it again.',
    blockedTooLong: (max) => `It goes over the ${max} characters the app supports. Split it to publish.`,
    blockedEmpty: 'Write something before publishing.',
    blockedHidden: 'This work is unavailable and cannot be published.',
    blockedLimit: 'This work reached the maximum number of chapters.',
    blockedUnsaved: 'There are unsynced changes. Sync before publishing.',
    failed: "Couldn't publish. Your text is safe.",
    workTitle: 'The work',
    workIntro: 'To appear in Stories, the work needs a title and at least one published chapter.',
    readerLink: 'View as a reader',
    moderationActive: 'Moderation: active',
    moderationHidden: 'Moderation: not available to readers',
    wordsDelta: (d) => `${d} words compared to the published version`,
    nothingToPublish: 'Nothing new to publish.',
    checkMet: 'Done',
    checkMissing: 'Missing',
    blockedReason: "It can't be published yet: check the list.",
  },
  portability: {
    title: 'Your work is yours. Take it with you.',
    intro: 'Exporting is free and always available.',
    exportTitle: 'Export',
    formatTxt: 'Text (.txt)',
    formatMd: 'Markdown (.md)',
    formatDocx: 'Word (.docx)',
    formatJson: 'Full backup (.json)',
    formatJsonHint: "Includes drafts, characters, places, notes, scenes, relationships and goals. It's a backup; it can't be imported yet.",
    versionLabel: 'Version',
    versionDraft: 'Working manuscript',
    versionPublished: 'Published only',
    download: 'Download',
    downloading: 'Preparing…',
    exportFailed: "Couldn't export. Please try again.",
    exportDone: (n) => `Downloaded: ${n}`,
    dirtyTitle: 'There are unsynced changes',
    dirtyBody: 'The export includes what is on the server.',
    dirtySaveFirst: 'Sync and export',
    dirtyLocalCopy: 'Also export my local copy',
    importTitle: 'Import',
    importIntro: ".txt or .md files in UTF-8. Markdown is imported as text, it isn't interpreted.",
    importPick: 'Choose a file',
    importInvalid: "The file isn't valid UTF-8 text.",
    importTooBig: (kb) => `The file is over ${kb} KB.`,
    importTooLong: (max) => `A chapter holds up to ${max} characters.`,
    importPreviewTitle: 'Before importing',
    importStats: (w, c) => `${w} words · ${c} characters`,
    importAsNew: 'As a new chapter',
    importReplace: 'Replace the open chapter',
    importReplaceHint: 'We save a version of the current chapter first.',
    importSplit: 'One chapter per # heading',
    importSplitHint: (n) => `${n} new, unpublished chapters will be created.`,
    importConfirm: 'Import',
    importing: 'Importing…',
    importDone: 'Imported. Nothing was published.',
    importFailed: "Couldn't import.",
    importChapters: plural('1 chapter', (n) => `${n} chapters`),
    importNoCurrent: 'Open a chapter to replace it.',
  },
  trash: {
    title: 'Trash',
    intro: 'What you delete stays here for 30 days.',
    empty: 'The trash is empty.',
    restore: 'Restore',
    purge: 'Delete forever',
    purgeTitle: 'Delete forever?',
    purgeBody: "This can't be undone.",
    purgeAt: (d) => `Deleted on ${d}`,
    kinds: { drafts: 'Chapter', characters: 'Character', places: 'Place', notes: 'Note', scenes: 'Scene', relations: 'Relationship' },
    error: "We couldn't load the trash.",
  },
};

const pt: StudioCopy = {
  areas: { label: 'Áreas da obra', write: 'Escrever', plan: 'Planejar', universe: 'Universo', progress: 'Progresso', publish: 'Publicar' },
  shell: {
    breadcrumbWorks: 'Minhas obras',
    untitled: 'Sem título',
    statusDraft: 'Rascunho',
    statusPublished: 'Publicada',
    statusInStories: 'Publicada · em Histórias',
    viewWork: 'Ver obra',
    editTitle: 'Editar título',
    addTitle: 'Adicionar título',
    titleLabel: 'Título da obra',
    saveTitle: 'Salvar título',
    loadError: 'Não conseguimos abrir esta obra.',
    notFound: 'Esta obra não existe ou não é sua.',
    retry: 'Tentar de novo',
    cancel: 'Cancelar',
    close: 'Fechar',
    loading: 'Carregando…',
    hiddenTitle: 'Esta obra não está disponível para leitores',
    hiddenBody: 'Você pode continuar escrevendo e exportá-la, mas não publicá-la.',
    unavailableExport: 'Exportar sua obra',
    unavailableExportBody: 'Seus rascunhos e fichas continuam salvos. Baixe-os quando quiser.',
    privateNote: 'Rascunhos, fichas e notas são privados mesmo com a obra publicada.',
    commandPalette: 'Ir para…',
    commandPlaceholder: 'Busque um capítulo ou uma área',
    commandEmpty: 'Nada corresponde.',
    commandChapters: 'Capítulos',
    commandGo: 'Ir',
    tipsTitle: 'Três dicas',
    tips: [
      'Escreva primeiro: personagens e planos podem esperar.',
      'Cmd/Ctrl+S salva na hora; o resto se salva sozinho.',
      'Publicar é sempre decisão sua: os leitores veem a versão publicada até você confirmar outra.',
    ],
    tipsDismiss: 'Entendi',
    cannotLeave: 'Primeiro resolva as alterações não salvas deste capítulo.',
  },
  manuscript: {
    title: 'Manuscrito',
    open: 'Capítulos',
    filter: 'Buscar capítulo',
    newChapter: 'Novo capítulo',
    creating: 'Criando…',
    empty: 'Toda grande história começa com uma linha.',
    emptyTitle: 'Sua história começa aqui',
    emptyAction: 'Escrever o primeiro capítulo',
    emptyPlan: 'Planejar primeiro',
    chapterLabel: (o) => `Capítulo ${o}`,
    newDraftLabel: 'Capítulo novo',
    untitledDraft: 'Sem título',
    published: 'Publicado',
    publishedPending: 'Alterações não publicadas',
    unpublished: 'Não publicado',
    notChapterYet: 'Ainda não publicado',
    changedElsewhere: 'Mudou em outro dispositivo',
    seededFromDuel: 'Nasceu em um duelo',
    words: plural('1 palavra', (n) => `${n} palavras`),
    limitReached: (n) => `Você chegou ao máximo de ${n} rascunhos nesta obra.`,
    trash: 'Lixeira',
    import: 'Importar',
    noMatches: 'Nenhum capítulo corresponde.',
  },
  status: { label: 'Status', idea: 'Ideia', draft: 'Rascunho', revising: 'Em revisão', ready: 'Pronto' },
  editor: {
    titleHint: 'Título do capítulo',
    bodyHint: 'Comece a escrever…',
    synopsis: 'Sinopse privada',
    synopsisHint: 'Do que trata este capítulo, para você.',
    synopsisSave: 'Salvar sinopse',
    synopsisSaved: 'Sinopse salva',
    words: plural('1 palavra', (n) => `${n} palavras`),
    chars: (n) => `${n} caracteres`,
    reading: (n) => `${n} min de leitura`,
    readingEstimate: 'estimado',
    session: (n) => `+${n} nesta sessão`,
    sessionGoal: (n, g) => `+${n} de ${g} nesta sessão`,
    publishLimit: (n, max) => `${n} / ${max} para publicar`,
    overPublishLimit: (max) =>
      `Passa do limite de publicação (${max} caracteres). Continue escrevendo; para publicá-lo, divida-o em dois capítulos.`,
    splitAtCursor: 'Mover o texto a partir do cursor para um capítulo novo',
    splitTitle: 'Dividir o capítulo aqui?',
    splitBody: 'O texto a partir do cursor vai para um capítulo novo, não publicado. Antes salvamos uma versão deste capítulo.',
    splitConfirm: 'Dividir',
    splitDone: 'Pronto: o resto do texto está em um capítulo novo.',
    tooLong: (max) => `Um rascunho comporta até ${max} caracteres.`,
    find: 'Buscar no capítulo',
    findLabel: 'Texto a buscar',
    findNext: 'Próximo',
    findPrev: 'Anterior',
    findCount: (i, n) => `${i} de ${n}`,
    findNone: 'Sem resultados',
    findClose: 'Fechar busca',
    focus: 'Modo foco',
    exitFocus: 'Sair do foco',
    focusHint: 'Esc para sair',
    settings: 'Ajustes de escrita',
    notes: 'Notas e referências',
    versions: 'Versões',
    publishThis: 'Publicar…',
    menu: 'Mais ações',
    discard: 'Descartar alterações não publicadas',
    discardTitle: 'Voltar para a versão publicada?',
    discardBody: 'Seu rascunho atual fica em Versões antes de ser substituído.',
    discardConfirm: 'Voltar para a versão publicada',
    trashDraft: 'Mover para a lixeira',
    trashTitle: 'Mover este capítulo para a lixeira?',
    trashBody: 'Ele nunca foi publicado. Você pode recuperá-lo por 30 dias.',
    trashConfirm: 'Mover para a lixeira',
    publishedLive: 'Este capítulo está publicado.',
    publishedUnchanged: 'Sua versão publicada não muda até você confirmar.',
    openFailed: 'Não conseguimos abrir este capítulo.',
    pickChapter: 'Escolha um capítulo ou crie um novo.',
    shortcuts: 'Atalhos',
    shortcutSave: 'Salvar agora',
    shortcutPalette: 'Ir para um capítulo ou área',
    shortcutFind: 'Buscar no capítulo',
    shortcutFocus: 'Modo foco',
    changedOutsideTitle: 'O capítulo mudou fora do Studio',
    changedOutsideBody: 'Alguém o editou em outro dispositivo ou no app. Seu rascunho não inclui essas mudanças.',
    compareOutside: 'Comparar',
    takeOutside: 'Trazer esse texto',
    takeOutsideTitle: 'Substituir seu rascunho pelo texto do capítulo?',
    takeOutsideBody: 'Seu rascunho atual fica em Versões antes de ser substituído.',
    outsideVersion: 'Texto do capítulo',
    readOnly: 'Só leitura',
    metaFailed: 'Não foi possível salvar. Tente de novo.',
  },
  save: {
    clean: 'Sincronizado',
    dirty: 'Alterações não salvas',
    saving: 'Salvando alterações…',
    saved: 'Sincronizado',
    retrying: 'Não foi possível sincronizar · Tentando de novo…',
    failed: 'Não foi possível sincronizar.',
    conflict: 'Este capítulo mudou em outro lugar',
    local: 'Salvo neste dispositivo · Aguardando sincronizar',
    invalid: 'Não dá para salvar assim',
    savedNow: 'Salvo',
    retry: 'Tentar de novo',
    exportCopy: 'Exportar cópia',
  },
  conflict: {
    title: 'Este capítulo mudou em outro dispositivo',
    body: 'Seu texto continua aqui. Escolha o que fazer: nada é sobrescrito sem a sua confirmação.',
    useServer: 'Usar a versão salva',
    saveCopy: 'Salvar minha versão como cópia',
    compare: 'Comparar',
    compareTitle: 'Comparar versões',
    yours: 'Sua versão (neste dispositivo)',
    server: 'Versão salva',
    keepMine: 'Manter minha versão',
    keepMineConfirm: 'Substituir a versão salva',
    keepMineConfirmBody: 'A versão salva fica em Versões e a sua passa a ser a atual.',
    copyTitle: (t) => (t ? `${t} (cópia)` : 'Cópia'),
    copySaved: 'Sua versão foi salva como um capítulo novo.',
    useServerTitle: 'Substituir seu texto pela versão salva?',
    useServerBody: 'O texto deste dispositivo será perdido. Para mantê-lo, salve-o antes como cópia.',
    keepMineFailed: 'Não conseguimos guardar a versão do servidor em Versões, então não a substituímos. Salve sua versão como cópia.',
  },
  recovery: {
    title: (when) => `Encontramos texto não sincronizado de ${when}`,
    body: 'Ficou salvo neste navegador. Você pode recuperá-lo ou descartá-lo.',
    restore: 'Recuperar',
    discard: 'Descartar',
    export: 'Exportar cópia',
    conflictBody: 'Desde então o capítulo mudou no servidor. Salve seu texto como cópia para não perder nada.',
    saveAsCopy: 'Salvar como cópia',
    settingLabel: 'Cópia de emergência neste navegador',
    settingHelp:
      'Se a conexão falhar, seu texto fica salvo aqui até sincronizar. Quem usar este dispositivo poderia vê-lo. Não é criptografado. É apagado ao sincronizar ou ao sair da conta.',
    unavailable: 'Este navegador não permite salvar uma cópia local.',
  },
  lock: {
    title: 'Este capítulo está aberto em outra aba',
    body: 'Para evitar sobrescritas, aqui você só pode lê-lo.',
    takeOver: 'Editar aqui',
    taken: 'Você continuou em outra aba. Aqui o capítulo ficou só para leitura.',
    unsupported: 'Este navegador não consegue coordenar abas: edite este capítulo em uma só.',
    otherUnsynced: 'A outra aba não conseguiu sincronizar tudo: o texto dela continua lá.',
    unsyncedHere: 'Este texto não foi sincronizado. Baixe-o ou salve-o como cópia antes de continuar.',
    taking: 'Passando para esta aba…',
  },
  prefs: {
    title: 'Ajustes de escrita',
    font: 'Tipografia',
    serif: 'Literária',
    sans: 'Sem serifa',
    size: 'Tamanho',
    sizes: ['Pequeno', 'Normal', 'Grande', 'Muito grande'],
    lineHeight: 'Entrelinha',
    lineHeights: ['Compacta', 'Normal', 'Ampla'],
    width: 'Largura do texto',
    widths: ['Estreita', 'Normal', 'Ampla'],
    spellcheck: 'Corretor ortográfico do navegador',
    appearance: 'Aparência do texto',
    smaller: 'Texto menor',
    larger: 'Texto maior',
    more: 'Mais ajustes…',
    moreTitle: 'Mais ajustes',
  },
  versions: {
    title: 'Versões',
    intro: 'Salve uma versão antes de uma grande mudança. Restaurar cria uma versão nova: nada se perde.',
    saveVersion: 'Salvar versão',
    labelHint: 'Nome (opcional)',
    saving: 'Salvando…',
    empty: 'Ainda não há versões deste capítulo.',
    kindManual: 'Salva por você',
    kindAuto: 'Automática',
    kindPublish: 'Publicada',
    kindBackup: 'Cópia de segurança',
    reasonBeforeImport: 'Antes de importar',
    reasonBeforeRestore: 'Antes de restaurar',
    reasonBeforeDiscard: 'Antes de descartar alterações',
    reasonBeforeSplit: 'Antes de dividir',
    view: 'Ver',
    restore: 'Restaurar',
    restoreTitle: 'Restaurar esta versão?',
    restoreBody: 'Seu texto atual fica como cópia de segurança. A versão publicada não muda.',
    restoreConfirm: 'Restaurar versão',
    restored: 'Versão restaurada.',
    delete: 'Excluir versão',
    deleteTitle: 'Excluir esta versão?',
    deleteBody: 'Não dá para desfazer.',
    limit: (n) => `Você pode salvar até ${n} versões manualmente por capítulo. Exclua alguma para salvar outra.`,
    loadError: 'Não conseguimos carregar as versões.',
    words: plural('1 palavra', (n) => `${n} palavras`),
    unsavedFirst: 'Salvamos suas alterações antes de continuar.',
  },
  context: {
    title: 'Notas e referências',
    quickNotes: 'Notas rápidas',
    tabNotes: 'Notas',
    tabPinned: 'Fixados',
    tabSearch: 'Buscar',
    noteFilter: 'Mostrar notas',
    pinnedNote: 'Fixada',
    quickNoteHint: 'Anote uma ideia sem sair do capítulo',
    addNote: 'Adicionar nota',
    noNotes: 'Sem notas por enquanto.',
    thisChapter: 'Deste capítulo',
    allChapters: 'Todas',
    pinned: 'Fixados',
    pin: 'Fixar',
    unpin: 'Remover',
    pinHint: 'Fixe um personagem, lugar ou cena para tê-lo à vista enquanto escreve.',
    pinPick: 'Escolher para fixar',
    noPinned: 'Nada fixado.',
    search: 'Buscar na obra',
    searchHint: 'Palavras, nomes, lugares…',
    searchEmpty: 'Sem resultados.',
    searchTruncated: 'Há mais resultados: refine a busca.',
    searchError: 'Não conseguimos buscar.',
    resultKinds: {
      draft: 'Capítulo',
      chapter: 'Capítulo',
      characters: 'Personagem',
      places: 'Lugar',
      notes: 'Nota',
      scenes: 'Cena',
      relations: 'Relação',
    },
    deleteNote: 'Excluir nota',
    noteSaveError: 'Não foi possível salvar a nota.',
  },
  publish: {
    title: 'Publicar',
    intro: 'Seus leitores veem a versão publicada. Publicar uma versão nova é sempre decisão sua.',
    chaptersTitle: 'Capítulos',
    upToDate: 'Publicado · em dia',
    pendingChanges: 'Publicado · com alterações não publicadas',
    neverPublished: 'Não publicado',
    willBe: (o) => `Será publicado como Capítulo ${o}`,
    review: 'Revisar e publicar',
    reviewTitle: 'Revisão antes de publicar',
    checklist: 'Lista de revisão',
    checkTitle: 'Tem título',
    checkBody: 'Tem texto',
    checkLimit: (max) => `Até ${max} caracteres (o que o app comporta)`,
    checkSynced: 'Tudo está salvo',
    checkReady: 'Marcado como pronto',
    checkReadyHint: 'É uma sugestão, não um requisito.',
    preview: 'Prévia',
    previewHint: 'É assim que seus leitores vão ler',
    publishedNote: 'Sua versão publicada não muda até você confirmar.',
    confirm: 'Publicar esta versão',
    confirmNew: (o) => `Publicar como Capítulo ${o}`,
    publishing: 'Publicando…',
    done: 'Publicado. Seus leitores já veem esta versão.',
    doneFirst: 'Publicado. O capítulo já está disponível para seus leitores.',
    publishedConflictTitle: 'A versão publicada mudou',
    publishedConflictBody: 'Ela foi alterada em outro dispositivo ou no app. Revise antes de substituí-la.',
    replace: 'Substituir pela minha versão',
    currentPublished: 'Publicada agora',
    yourVersion: 'Sua versão',
    draftConflict: 'O capítulo mudou enquanto você revisava. Revise de novo.',
    blockedTooLong: (max) => `Passa dos ${max} caracteres que o app comporta. Divida-o para publicar.`,
    blockedEmpty: 'Escreva algo antes de publicar.',
    blockedHidden: 'Esta obra não está disponível e não pode ser publicada.',
    blockedLimit: 'Esta obra chegou ao máximo de capítulos.',
    blockedUnsaved: 'Há alterações não sincronizadas. Sincronize antes de publicar.',
    failed: 'Não foi possível publicar. Seu texto está seguro.',
    workTitle: 'A obra',
    workIntro: 'Para aparecer em Histórias, a obra precisa de título e de pelo menos um capítulo publicado.',
    readerLink: 'Ver como leitor',
    moderationActive: 'Moderação: ativa',
    moderationHidden: 'Moderação: indisponível para leitores',
    wordsDelta: (d) => `${d} palavras em relação à versão publicada`,
    nothingToPublish: 'Nada novo para publicar.',
    checkMet: 'Feito',
    checkMissing: 'Pendente',
    blockedReason: 'Ainda não dá para publicar: revise a lista.',
  },
  portability: {
    title: 'Sua obra é sua. Leve-a com você.',
    intro: 'Exportar é grátis e está sempre disponível.',
    exportTitle: 'Exportar',
    formatTxt: 'Texto (.txt)',
    formatMd: 'Markdown (.md)',
    formatDocx: 'Word (.docx)',
    formatJson: 'Backup completo (.json)',
    formatJsonHint: 'Inclui rascunhos, personagens, lugares, notas, cenas, relações e metas. É um backup; ainda não pode ser importado.',
    versionLabel: 'Versão',
    versionDraft: 'Manuscrito de trabalho',
    versionPublished: 'Só o publicado',
    download: 'Baixar',
    downloading: 'Preparando…',
    exportFailed: 'Não foi possível exportar. Tente de novo.',
    exportDone: (n) => `Baixado: ${n}`,
    dirtyTitle: 'Há alterações não sincronizadas',
    dirtyBody: 'A exportação inclui o que está no servidor.',
    dirtySaveFirst: 'Sincronizar e exportar',
    dirtyLocalCopy: 'Exportar também minha cópia local',
    importTitle: 'Importar',
    importIntro: 'Arquivos .txt ou .md em UTF-8. O Markdown é importado como texto, sem interpretação.',
    importPick: 'Escolher arquivo',
    importInvalid: 'O arquivo não é texto UTF-8 válido.',
    importTooBig: (kb) => `O arquivo passa de ${kb} KB.`,
    importTooLong: (max) => `Um capítulo comporta até ${max} caracteres.`,
    importPreviewTitle: 'Antes de importar',
    importStats: (w, c) => `${w} palavras · ${c} caracteres`,
    importAsNew: 'Como um capítulo novo',
    importReplace: 'Substituir o capítulo aberto',
    importReplaceHint: 'Antes salvamos uma versão do capítulo atual.',
    importSplit: 'Um capítulo por cabeçalho #',
    importSplitHint: (n) => `Serão criados ${n} capítulos novos, não publicados.`,
    importConfirm: 'Importar',
    importing: 'Importando…',
    importDone: 'Importado. Nada foi publicado.',
    importFailed: 'Não foi possível importar.',
    importChapters: plural('1 capítulo', (n) => `${n} capítulos`),
    importNoCurrent: 'Abra um capítulo para substituí-lo.',
  },
  trash: {
    title: 'Lixeira',
    intro: 'O que você apaga fica aqui por 30 dias.',
    empty: 'A lixeira está vazia.',
    restore: 'Restaurar',
    purge: 'Excluir para sempre',
    purgeTitle: 'Excluir para sempre?',
    purgeBody: 'Não dá para desfazer.',
    purgeAt: (d) => `Será excluído em ${d}`,
    kinds: { drafts: 'Capítulo', characters: 'Personagem', places: 'Lugar', notes: 'Nota', scenes: 'Cena', relations: 'Relação' },
    error: 'Não conseguimos carregar a lixeira.',
  },
};

export const STUDIO_COPY: Record<Locale, StudioCopy> = { es, en, pt };
