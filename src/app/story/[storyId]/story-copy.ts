import type { Locale } from '@/lib/i18n';

export type StoryCopy = {
  notFoundTitle: string;
  notFoundBody: string;
  goHome: string;
  by: string;
  readInApp: string;
  writeFirst: string;
  metaNotFound: string;
};

export const STORY_COPY: Record<Locale, StoryCopy> = {
  es: {
    notFoundTitle: 'Relato no encontrado',
    notFoundBody: 'Este relato no existe o fue eliminado.',
    goHome: 'Ir a InkDuel',
    by: 'por',
    readInApp: 'Leer en InkDuel',
    writeFirst: 'Crear mi primer relato',
    metaNotFound: 'Relato no encontrado — InkDuel',
  },
  en: {
    notFoundTitle: 'Story not found',
    notFoundBody: 'This story doesn’t exist or was deleted.',
    goHome: 'Go to InkDuel',
    by: 'by',
    readInApp: 'Read in InkDuel',
    writeFirst: 'Write my first story',
    metaNotFound: 'Story not found — InkDuel',
  },
  pt: {
    notFoundTitle: 'Relato não encontrado',
    notFoundBody: 'Este relato não existe ou foi excluído.',
    goHome: 'Ir para o InkDuel',
    by: 'por',
    readInApp: 'Ler no InkDuel',
    writeFirst: 'Escrever meu primeiro relato',
    metaNotFound: 'Relato não encontrado — InkDuel',
  },
};
