import type { Locale } from '@/lib/i18n';

import type { GalleryReaction } from './models';

// Copy of the Historias reading flow, from the app's ARB files
// (galleryReader*, galleryReaction*, historias*, gallerySearchDuelCta).

export type ReadingCopy = {
  reactions: Record<GalleryReaction, string>;
  /** «Me atrapó: 3 lectores» for assistive tech. */
  reactionCount: (reaction: string, count: number) => string;
  endMark: string;
  endQuestion: string;
  ownReactionsTitle: string;
  ownReactionsEmpty: string;
  leaveMark: string;
  nextStory: string;
  exhaustedTitle: string;
  exhaustedBody: string;
  readMarker: string;
  showList: string;
  seeList: string;
  readContinuously: string;
  reactionError: string;
  searchDuel: string;
};

export const READING_COPY: Record<Locale, ReadingCopy> = {
  es: {
    reactions: { hooked: 'Me atrapó', moved: 'Me emocionó', surprised: 'No lo vi venir' },
    reactionCount: (reaction, n) => `${reaction}: ${n === 1 ? '1 lector' : `${n} lectores`}`,
    endMark: 'Fin del relato',
    endQuestion: '¿Qué te dejó este relato?',
    ownReactionsTitle: 'Cómo reaccionaron tus lectores',
    ownReactionsEmpty: 'Todavía no hay reacciones.',
    leaveMark: 'Deja tu Marca',
    nextStory: 'Siguiente relato',
    exhaustedTitle: 'Leíste todos los relatos nuevos',
    exhaustedBody: 'El próximo puede ser el tuyo.',
    readMarker: 'Leído',
    showList: 'Ver la lista',
    seeList: 'Ver lista',
    readContinuously: 'Leer de corrido',
    reactionError: 'No pudimos guardar tu reacción. Inténtalo de nuevo.',
    searchDuel: 'Buscar duelo',
  },
  en: {
    reactions: { hooked: 'It hooked me', moved: 'It moved me', surprised: "Didn't see it coming" },
    reactionCount: (reaction, n) => `${reaction}: ${n === 1 ? '1 reader' : `${n} readers`}`,
    endMark: 'End of the story',
    endQuestion: 'What did this story leave you with?',
    ownReactionsTitle: 'How your readers reacted',
    ownReactionsEmpty: 'No reactions yet.',
    leaveMark: 'Leave your Mark',
    nextStory: 'Next story',
    exhaustedTitle: "You've read every new story",
    exhaustedBody: 'The next one could be yours.',
    readMarker: 'Read',
    showList: 'See the list',
    seeList: 'See list',
    readContinuously: 'Read on',
    reactionError: "We couldn't save your reaction. Try again.",
    searchDuel: 'Find a duel',
  },
  pt: {
    reactions: { hooked: 'Me prendeu', moved: 'Me emocionou', surprised: 'Não esperava por essa' },
    reactionCount: (reaction, n) => `${reaction}: ${n === 1 ? '1 leitor' : `${n} leitores`}`,
    endMark: 'Fim do conto',
    endQuestion: 'O que este conto deixou em você?',
    ownReactionsTitle: 'Como seus leitores reagiram',
    ownReactionsEmpty: 'Ainda não há reações.',
    leaveMark: 'Deixe sua Marca',
    nextStory: 'Próximo conto',
    exhaustedTitle: 'Você leu todos os contos novos',
    exhaustedBody: 'O próximo pode ser o seu.',
    readMarker: 'Lido',
    showList: 'Ver a lista',
    seeList: 'Ver lista',
    readContinuously: 'Ler em sequência',
    reactionError: 'Não conseguimos salvar sua reação. Tente de novo.',
    searchDuel: 'Buscar duelo',
  },
};
