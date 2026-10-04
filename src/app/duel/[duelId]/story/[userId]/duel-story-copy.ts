import type { Locale } from '@/lib/i18n';

export type DuelStoryCopy = {
  notFoundTitle: string;
  notFoundBody: string;
  goHome: string;
  consignaLabel: string;
  by: string;
  seeResult: string;
  writeFirst: string;
  metaNotFound: string;
  metaTitle: (username: string) => string;
  ogTitle: (username: string) => string;
};

export const DUEL_STORY_COPY: Record<Locale, DuelStoryCopy> = {
  es: {
    notFoundTitle: 'Relato no encontrado',
    notFoundBody: 'Este relato no existe o el duelo aún no terminó.',
    goHome: 'Ir a InkDuel',
    consignaLabel: 'Consigna',
    by: 'por',
    seeResult: 'Ver resultado en InkDuel',
    writeFirst: 'Escribir mi primer duelo',
    metaNotFound: 'Relato no encontrado — InkDuel',
    metaTitle: (username) => `${username} en InkDuel — Duelo`,
    ogTitle: (username) => `Relato de @${username} en InkDuel`,
  },
  en: {
    notFoundTitle: 'Story not found',
    notFoundBody: 'This story doesn’t exist or the duel hasn’t finished yet.',
    goHome: 'Go to InkDuel',
    consignaLabel: 'Prompt',
    by: 'by',
    seeResult: 'See the result in InkDuel',
    writeFirst: 'Write my first duel',
    metaNotFound: 'Story not found — InkDuel',
    metaTitle: (username) => `${username} on InkDuel — Duel`,
    ogTitle: (username) => `@${username}’s story on InkDuel`,
  },
  pt: {
    notFoundTitle: 'Relato não encontrado',
    notFoundBody: 'Este relato não existe ou o duelo ainda não terminou.',
    goHome: 'Ir para o InkDuel',
    consignaLabel: 'Proposta',
    by: 'por',
    seeResult: 'Ver resultado no InkDuel',
    writeFirst: 'Escrever meu primeiro duelo',
    metaNotFound: 'Relato não encontrado — InkDuel',
    metaTitle: (username) => `${username} no InkDuel — Duelo`,
    ogTitle: (username) => `Relato de @${username} no InkDuel`,
  },
};
