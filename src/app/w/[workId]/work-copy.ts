import type { Locale } from '@/lib/i18n';

export type WorkCopy = {
  metaNotFound: string;
  notFoundTitle: string;
  notFoundBody: string;
  goHome: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  chapters: (n: number) => string;
  genres: Record<string, string>;
  status: Record<string, string>;
  synopsis: string;
  index: string;
  chapterN: (n: number) => string;
  open: string;
  withAccount: string;
  startReading: string;
  endOfChapter: (n: number) => string;
  gateTitle: string;
  gateBody: string;
  gateLogin: string;
  gateNoAccount: string;
  gateAfterInstall: string;
  writeFirst: string;
  ogDescription: (author: string) => string;
  lockedTitle: string;
};

const genres = {
  es: { horror: 'Terror', mystery: 'Misterio', comedy: 'Comedia', romance: 'Romance', adventure: 'Aventura', scifi: 'Ciencia ficción', fantasy: 'Fantasía', suspense: 'Suspenso', drama: 'Drama' },
  en: { horror: 'Horror', mystery: 'Mystery', comedy: 'Comedy', romance: 'Romance', adventure: 'Adventure', scifi: 'Science fiction', fantasy: 'Fantasy', suspense: 'Suspense', drama: 'Drama' },
  pt: { horror: 'Terror', mystery: 'Mistério', comedy: 'Comédia', romance: 'Romance', adventure: 'Aventura', scifi: 'Ficção científica', fantasy: 'Fantasia', suspense: 'Suspense', drama: 'Drama' },
};

export const WORK_COPY: Record<Locale, WorkCopy> = {
  es: {
    metaNotFound: 'Obra no encontrada — InkDuel',
    notFoundTitle: 'Obra no encontrada',
    notFoundBody: 'Esta obra no existe o ya no está publicada.',
    goHome: 'Ir a InkDuel',
    errorTitle: 'No pudimos cargar la obra',
    errorBody: 'Algo falló de nuestro lado. Prueba de nuevo en unos minutos.',
    retry: 'Reintentar',
    chapters: (n) => (n === 1 ? '1 capítulo' : `${n} capítulos`),
    genres: genres.es,
    status: { ongoing: 'En curso', complete: 'Completa' },
    synopsis: 'Sinopsis',
    index: 'Capítulos',
    chapterN: (n) => `Capítulo ${n}`,
    open: 'Abierto',
    withAccount: 'Con cuenta',
    startReading: 'Empezar a leer',
    endOfChapter: (n) => `Fin del capítulo ${n}`,
    gateTitle: 'Sigue leyendo con tu cuenta',
    gateBody: 'El primer capítulo es abierto. Para el resto de la obra, entra a InkDuel: te traemos de vuelta a este capítulo.',
    gateLogin: 'Entrar',
    gateNoAccount: '¿No tienes cuenta? Se crea en la app.',
    gateAfterInstall: 'Cuando tengas tu cuenta, vuelve a tocar este enlace.',
    writeFirst: '¿Escribes? Gana tu primer duelo',
    ogDescription: (author) => `Una obra de ${author} en InkDuel. Lee el primer capítulo.`,
    lockedTitle: 'Este capítulo se lee con cuenta',
  },
  en: {
    metaNotFound: 'Work not found — InkDuel',
    notFoundTitle: 'Work not found',
    notFoundBody: 'This work doesn’t exist or is no longer published.',
    goHome: 'Go to InkDuel',
    errorTitle: 'We couldn’t load this work',
    errorBody: 'Something went wrong on our side. Try again in a few minutes.',
    retry: 'Try again',
    chapters: (n) => (n === 1 ? '1 chapter' : `${n} chapters`),
    genres: genres.en,
    status: { ongoing: 'Ongoing', complete: 'Complete' },
    synopsis: 'Synopsis',
    index: 'Chapters',
    chapterN: (n) => `Chapter ${n}`,
    open: 'Open',
    withAccount: 'With an account',
    startReading: 'Start reading',
    endOfChapter: (n) => `End of chapter ${n}`,
    gateTitle: 'Keep reading with your account',
    gateBody: 'The first chapter is open. For the rest of the work, sign in to InkDuel: we’ll bring you back to this chapter.',
    gateLogin: 'Sign in',
    gateNoAccount: 'No account yet? You create it in the app.',
    gateAfterInstall: 'Once you have your account, tap this link again.',
    writeFirst: 'Do you write? Win your first duel',
    ogDescription: (author) => `A work by ${author} on InkDuel. Read the first chapter.`,
    lockedTitle: 'This chapter is read with an account',
  },
  pt: {
    metaNotFound: 'Obra não encontrada — InkDuel',
    notFoundTitle: 'Obra não encontrada',
    notFoundBody: 'Esta obra não existe ou não está mais publicada.',
    goHome: 'Ir para o InkDuel',
    errorTitle: 'Não conseguimos carregar a obra',
    errorBody: 'Algo falhou do nosso lado. Tente novamente em alguns minutos.',
    retry: 'Tentar de novo',
    chapters: (n) => (n === 1 ? '1 capítulo' : `${n} capítulos`),
    genres: genres.pt,
    status: { ongoing: 'Em andamento', complete: 'Completa' },
    synopsis: 'Sinopse',
    index: 'Capítulos',
    chapterN: (n) => `Capítulo ${n}`,
    open: 'Aberto',
    withAccount: 'Com conta',
    startReading: 'Começar a ler',
    endOfChapter: (n) => `Fim do capítulo ${n}`,
    gateTitle: 'Continue lendo com a sua conta',
    gateBody: 'O primeiro capítulo é aberto. Para o resto da obra, entre no InkDuel: trazemos você de volta a este capítulo.',
    gateLogin: 'Entrar',
    gateNoAccount: 'Ainda não tem conta? Ela é criada no app.',
    gateAfterInstall: 'Quando tiver sua conta, toque neste link de novo.',
    writeFirst: 'Você escreve? Ganhe seu primeiro duelo',
    ogDescription: (author) => `Uma obra de ${author} no InkDuel. Leia o primeiro capítulo.`,
    lockedTitle: 'Este capítulo se lê com conta',
  },
};
