import type { Locale } from '@/lib/i18n';

// Copy of the authoring screens (phase 2). From the app's ARB files
// (continueStories*) unless marked «web»: those are the decisions approved
// for the web editor (published notice, counter, inline validation).

type Plural = (count: number) => string;

const plural = (zero: string | null, one: string, other: (n: number) => string): Plural => (n) =>
  n === 0 && zero !== null ? zero : n === 1 ? one : other(n);

export type WorksCopy = {
  myWorks: string;
  myWorksSubtitle: string;
  headline: string;
  filterAll: string;
  filterDrafts: string;
  filterPublished: string;
  filtersLabel: string;
  newWork: string;
  newWorkTitle: string;
  newWorkLead: string;
  workTitleHint: string;
  startWriting: string;
  starting: string;
  createError: string;
  listError: string;
  listErrorDetail: string;
  emptyAllTitle: string;
  emptyAllBody: string;
  emptyAllCta: string;
  emptyDrafts: string;
  emptyPublished: string;
  untitled: string;
  untitledDraft: string;
  chipPublished: string;
  chipNotVisible: string;
  chipEmpty: string;
  chipDraft: string;
  chapterCount: Plural;
  publishedChapters: Plural;
  followers: Plural;
  publishedNoChapters: string;
  updatedOn: (date: string) => string;
  // Work page
  statusDraft: string;
  statusInStories: string;
  statusPublished: string;
  notReadableTitle: string;
  notReadableBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  editTitle: string;
  saveTitle: string;
  cancel: string;
  addTitleHeader: string;
  chapters: string;
  newChapter: string;
  writeNextChapter: string;
  emptyWork: string;
  chapterDefault: (order: number) => string;
  chapterPublished: string;
  words: Plural;
  edit: string;
  publishChapter: string;
  publishChapterTitle: (order: number) => string;
  publishChapterBody: string;
  publishChapterAction: string;
  deleteChapter: string;
  deleteChapterTitle: string;
  deleteChapterBody: string;
  requirementTitle: string;
  requirementChapter: string;
  readyToPublish: string;
  addTitleToPublish: string;
  needsChapter: string;
  onlyYouCanSee: string;
  publishWork: string;
  unpublishWork: string;
  mutationError: string;
  loadError: string;
  retry: string;
  backToWorks: string;
  // Editor
  chapterTitleHint: (number: number) => string;
  contentHint: string;
  saveIdle: string;
  saveSaving: string;
  saveSaved: string;
  saveRetrying: string;
  /** web: a save the editor will not retry by itself. */
  saveFailed: string;
  saveConflict: string;
  conflictMessage: string;
  keepMine: string;
  useServer: string;
  /** web: decision 3. */
  publishedLive: string;
  /** web: decision 4. */
  counter: (count: string, max: string) => string;
  /** web: decision 4. */
  tooLong: (max: string) => string;
  /** web: decision 4. */
  emptyDraft: string;
  /** web: decision 4. */
  emptyPublishedChapter: string;
  backToWork: string;
};

export const WORKS_COPY: Record<Locale, WorksCopy> = {
  es: {
    myWorks: 'Tus obras',
    myWorksSubtitle: 'Tus obras y borradores',
    headline: 'Tus obras.',
    filterAll: 'Todas',
    filterDrafts: 'Borradores',
    filterPublished: 'Publicadas',
    filtersLabel: 'Filtrar obras',
    newWork: 'Nueva obra',
    newWorkTitle: 'Nueva obra',
    newWorkLead: 'Ponle un título. Lo puedes cambiar después.',
    workTitleHint: 'Título de la obra',
    startWriting: 'Empezar a escribir',
    starting: 'Creando…',
    createError: 'No pudimos crear la obra. Inténtalo de nuevo.',
    listError: 'No pudimos cargar tus obras.',
    listErrorDetail: 'Revisa tu conexión.',
    emptyAllTitle: 'Empieza tu obra',
    emptyAllBody: 'Crea una historia original desde cero y hazla crecer capítulo a capítulo.',
    emptyAllCta: 'Crear primera obra',
    emptyDrafts: 'No tienes borradores.',
    emptyPublished: 'No tienes obras publicadas.',
    untitled: 'Sin título',
    untitledDraft: 'Borrador sin título',
    chipPublished: 'Publicada',
    chipNotVisible: 'No visible',
    chipEmpty: 'Vacía',
    chipDraft: 'Borrador',
    chapterCount: plural('Sin capítulos', '1 capítulo', (n) => `${n} capítulos`),
    publishedChapters: plural(null, ' · 1 publicado', (n) => ` · ${n} publicados`),
    followers: plural(null, ' · 1 seguidor', (n) => ` · ${n} seguidores`),
    publishedNoChapters: 'Publicada · ningún capítulo publicado',
    updatedOn: (d) => ` · Actualizada el ${d}`,
    statusDraft: 'Borrador',
    statusInStories: 'Publicada · en Historias',
    statusPublished: 'Publicada',
    notReadableTitle: 'Nadie puede leerla todavía',
    notReadableBody: 'Tu obra está publicada, pero ningún capítulo lo está. Publica uno para que aparezca en Historias.',
    unavailableTitle: 'Esta obra no está disponible',
    unavailableBody: 'Por ahora no se puede publicar. Puedes seguir editándola; solo tú la ves.',
    editTitle: 'Editar título',
    saveTitle: 'Guardar',
    cancel: 'Cancelar',
    addTitleHeader: 'Añade un título a tu obra',
    chapters: 'Capítulos',
    newChapter: 'Nuevo capítulo',
    writeNextChapter: '+ Escribir el siguiente capítulo',
    emptyWork: 'Esta obra todavía no tiene capítulos.',
    chapterDefault: (o) => `Capítulo ${o}`,
    chapterPublished: 'Publicado',
    words: plural(null, '1 palabra', (n) => `${n} palabras`),
    edit: 'Editar',
    publishChapter: 'Publicar',
    publishChapterTitle: (o) => `¿Publicar el capítulo ${o}?`,
    publishChapterBody: 'Una vez publicado, podrás editarlo, pero no eliminarlo de la obra.',
    publishChapterAction: 'Publicar capítulo',
    deleteChapter: 'Eliminar',
    deleteChapterTitle: '¿Eliminar este capítulo?',
    deleteChapterBody: 'No se puede deshacer.',
    requirementTitle: 'Título',
    requirementChapter: 'Un capítulo publicado',
    readyToPublish: 'Lista para publicar. Va a aparecer en Historias.',
    addTitleToPublish: 'Añade un título antes de publicar',
    needsChapter: 'Para que otros puedan leerla, publica al menos un capítulo.',
    onlyYouCanSee: 'Solo tú puedes verla',
    publishWork: 'Publicar obra',
    unpublishWork: 'Despublicar obra',
    mutationError: 'Algo salió mal. Intenta de nuevo.',
    loadError: 'No pudimos cargar esta obra.',
    retry: 'Reintentar',
    backToWorks: 'Tus obras',
    chapterTitleHint: (n) => `Capítulo ${n} (opcional)`,
    contentHint: 'Escribe tu capítulo…',
    saveIdle: 'Cambios sin guardar',
    saveSaving: 'Guardando…',
    saveSaved: 'Guardado',
    saveRetrying: 'No se pudo guardar · Reintentando…',
    saveFailed: 'No se pudo guardar.',
    saveConflict: 'Este capítulo cambió en otro lugar',
    conflictMessage: 'Se editó en otro dispositivo. Conserva tu texto o usa la última versión.',
    keepMine: 'Conservar mi texto',
    useServer: 'Usar la última versión',
    publishedLive: 'Publicado · Los cambios se reflejan al guardar',
    counter: (c, m) => `${c} / ${m}`,
    tooLong: (m) => `Superaste los ${m} caracteres. Acorta el texto para poder guardarlo.`,
    emptyDraft: 'Un capítulo no puede quedar vacío. Si ya no lo quieres, elimínalo desde la obra.',
    emptyPublishedChapter: 'Un capítulo publicado no puede quedar vacío.',
    backToWork: 'Volver a la obra',
  },
  en: {
    myWorks: 'Your works',
    myWorksSubtitle: 'Your works and drafts',
    headline: 'Your works.',
    filterAll: 'All',
    filterDrafts: 'Drafts',
    filterPublished: 'Published',
    filtersLabel: 'Filter works',
    newWork: 'New work',
    newWorkTitle: 'New work',
    newWorkLead: 'Give it a title. You can change it later.',
    workTitleHint: 'Work title',
    startWriting: 'Start writing',
    starting: 'Creating…',
    createError: "Couldn't create the work. Please try again.",
    listError: "We couldn't load your works.",
    listErrorDetail: 'Check your connection.',
    emptyAllTitle: 'Start your work',
    emptyAllBody: 'Create an original story from scratch and grow it chapter by chapter.',
    emptyAllCta: 'Create first work',
    emptyDrafts: 'You have no drafts.',
    emptyPublished: 'You have no published works.',
    untitled: 'Untitled',
    untitledDraft: 'Untitled draft',
    chipPublished: 'Published',
    chipNotVisible: 'Not visible',
    chipEmpty: 'Empty',
    chipDraft: 'Draft',
    chapterCount: plural('No chapters', '1 chapter', (n) => `${n} chapters`),
    publishedChapters: plural(null, ' · 1 published', (n) => ` · ${n} published`),
    followers: plural(null, ' · 1 follower', (n) => ` · ${n} followers`),
    publishedNoChapters: 'Published · no chapter published',
    updatedOn: (d) => ` · Updated ${d}`,
    statusDraft: 'Draft',
    statusInStories: 'Published · in Stories',
    statusPublished: 'Published',
    notReadableTitle: 'Nobody can read it yet',
    notReadableBody: 'Your work is published, but none of its chapters is. Publish one so it shows up in Stories.',
    unavailableTitle: "This work isn't available",
    unavailableBody: "It can't be published for now. You can keep editing it; only you can see it.",
    editTitle: 'Edit title',
    saveTitle: 'Save',
    cancel: 'Cancel',
    addTitleHeader: 'Add a title to your work',
    chapters: 'Chapters',
    newChapter: 'New chapter',
    writeNextChapter: '+ Write the next chapter',
    emptyWork: 'This work has no chapters yet.',
    chapterDefault: (o) => `Chapter ${o}`,
    chapterPublished: 'Published',
    words: plural(null, '1 word', (n) => `${n} words`),
    edit: 'Edit',
    publishChapter: 'Publish',
    publishChapterTitle: (o) => `Publish chapter ${o}?`,
    publishChapterBody: 'Once published, you can edit it, but not remove it from the work.',
    publishChapterAction: 'Publish chapter',
    deleteChapter: 'Delete',
    deleteChapterTitle: 'Delete this chapter?',
    deleteChapterBody: "This can't be undone.",
    requirementTitle: 'Title',
    requirementChapter: 'One published chapter',
    readyToPublish: 'Ready to publish. It will show up in Stories.',
    addTitleToPublish: 'Add a title before publishing',
    needsChapter: 'For others to read it, publish at least one chapter.',
    onlyYouCanSee: 'Only you can see it',
    publishWork: 'Publish work',
    unpublishWork: 'Unpublish work',
    mutationError: 'Something went wrong. Please try again.',
    loadError: "We couldn't load this work.",
    retry: 'Retry',
    backToWorks: 'Your works',
    chapterTitleHint: (n) => `Chapter ${n} (optional)`,
    contentHint: 'Write your chapter…',
    saveIdle: 'Unsaved changes',
    saveSaving: 'Saving…',
    saveSaved: 'Saved',
    saveRetrying: "Couldn't save · Retrying…",
    saveFailed: "Couldn't save.",
    saveConflict: 'This chapter changed elsewhere',
    conflictMessage: 'It was edited on another device. Keep your text or use the latest version.',
    keepMine: 'Keep my text',
    useServer: 'Use the latest version',
    publishedLive: 'Published · Changes go live when saved',
    counter: (c, m) => `${c} / ${m}`,
    tooLong: (m) => `You went over ${m} characters. Shorten the text to save it.`,
    emptyDraft: "A chapter can't be empty. If you no longer want it, delete it from the work.",
    emptyPublishedChapter: "A published chapter can't be empty.",
    backToWork: 'Back to the work',
  },
  pt: {
    myWorks: 'Suas obras',
    myWorksSubtitle: 'Suas obras e rascunhos',
    headline: 'Suas obras.',
    filterAll: 'Todas',
    filterDrafts: 'Rascunhos',
    filterPublished: 'Publicadas',
    filtersLabel: 'Filtrar obras',
    newWork: 'Nova obra',
    newWorkTitle: 'Nova obra',
    newWorkLead: 'Dê um título. Você pode mudar depois.',
    workTitleHint: 'Título da obra',
    startWriting: 'Começar a escrever',
    starting: 'Criando…',
    createError: 'Não foi possível criar a obra. Tente novamente.',
    listError: 'Não foi possível carregar suas obras.',
    listErrorDetail: 'Verifique sua conexão.',
    emptyAllTitle: 'Comece sua obra',
    emptyAllBody: 'Crie uma história original do zero e faça-a crescer capítulo a capítulo.',
    emptyAllCta: 'Criar primeira obra',
    emptyDrafts: 'Você não tem rascunhos.',
    emptyPublished: 'Você não tem obras publicadas.',
    untitled: 'Sem título',
    untitledDraft: 'Rascunho sem título',
    chipPublished: 'Publicada',
    chipNotVisible: 'Não visível',
    chipEmpty: 'Vazia',
    chipDraft: 'Rascunho',
    chapterCount: plural('Sem capítulos', '1 capítulo', (n) => `${n} capítulos`),
    publishedChapters: plural(null, ' · 1 publicado', (n) => ` · ${n} publicados`),
    followers: plural(null, ' · 1 seguidor', (n) => ` · ${n} seguidores`),
    publishedNoChapters: 'Publicada · nenhum capítulo publicado',
    updatedOn: (d) => ` · Atualizada em ${d}`,
    statusDraft: 'Rascunho',
    statusInStories: 'Publicada · em Histórias',
    statusPublished: 'Publicada',
    notReadableTitle: 'Ninguém pode lê-la ainda',
    notReadableBody: 'Sua obra está publicada, mas nenhum capítulo está. Publique um para ela aparecer em Histórias.',
    unavailableTitle: 'Esta obra não está disponível',
    unavailableBody: 'Por enquanto ela não pode ser publicada. Você pode continuar editando; só você a vê.',
    editTitle: 'Editar título',
    saveTitle: 'Salvar',
    cancel: 'Cancelar',
    addTitleHeader: 'Adicione um título à sua obra',
    chapters: 'Capítulos',
    newChapter: 'Novo capítulo',
    writeNextChapter: '+ Escrever o próximo capítulo',
    emptyWork: 'Esta obra ainda não tem capítulos.',
    chapterDefault: (o) => `Capítulo ${o}`,
    chapterPublished: 'Publicado',
    words: plural(null, '1 palavra', (n) => `${n} palavras`),
    edit: 'Editar',
    publishChapter: 'Publicar',
    publishChapterTitle: (o) => `Publicar o capítulo ${o}?`,
    publishChapterBody: 'Depois de publicado, você poderá editá-lo, mas não removê-lo da obra.',
    publishChapterAction: 'Publicar capítulo',
    deleteChapter: 'Excluir',
    deleteChapterTitle: 'Excluir este capítulo?',
    deleteChapterBody: 'Não dá para desfazer.',
    requirementTitle: 'Título',
    requirementChapter: 'Um capítulo publicado',
    readyToPublish: 'Pronta para publicar. Vai aparecer em Histórias.',
    addTitleToPublish: 'Adicione um título antes de publicar',
    needsChapter: 'Para que outras pessoas possam lê-la, publique pelo menos um capítulo.',
    onlyYouCanSee: 'Só você pode vê-la',
    publishWork: 'Publicar obra',
    unpublishWork: 'Despublicar obra',
    mutationError: 'Algo deu errado. Tente novamente.',
    loadError: 'Não foi possível carregar esta obra.',
    retry: 'Tentar novamente',
    backToWorks: 'Suas obras',
    chapterTitleHint: (n) => `Capítulo ${n} (opcional)`,
    contentHint: 'Escreva seu capítulo…',
    saveIdle: 'Alterações não salvas',
    saveSaving: 'Salvando…',
    saveSaved: 'Salvo',
    saveRetrying: 'Não foi possível salvar · Tentando de novo…',
    saveFailed: 'Não foi possível salvar.',
    saveConflict: 'Este capítulo mudou em outro lugar',
    conflictMessage: 'Foi editado em outro dispositivo. Mantenha seu texto ou use a versão mais recente.',
    keepMine: 'Manter meu texto',
    useServer: 'Usar a versão mais recente',
    publishedLive: 'Publicado · As alterações aparecem ao salvar',
    counter: (c, m) => `${c} / ${m}`,
    tooLong: (m) => `Você passou de ${m} caracteres. Encurte o texto para poder salvá-lo.`,
    emptyDraft: 'Um capítulo não pode ficar vazio. Se não quiser mais, exclua-o na obra.',
    emptyPublishedChapter: 'Um capítulo publicado não pode ficar vazio.',
    backToWork: 'Voltar à obra',
  },
};
