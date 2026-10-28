import type { Locale } from '@/lib/i18n';

import type { CalendarCell } from './writing-calendar';

// Copy of the writing calendar view, shared by Studio's «Progreso» (one work)
// and «Tu escritura» on the profile (duels + works). Neutral Spanish with
// tuteo (never voseo) is the editorial source; en and pt-BR are idiomatic
// equivalents.

export type CalendarCopy = {
  gridLabel: string;
  legend: string;
  less: string;
  more: string;
  levels: [string, string, string, string, string];
  /** Spoken label of a day that counts. */
  cell: (label: string, cell: CalendarCell, format: (n: number) => string) => string;
  cellNone: (label: string) => string;
  viewList: string;
  hideList: string;
  listTitle: string;
  listEmpty: string;
  colDate: string;
  colWords: string;
};

// ------------------------------------------------- «Tu escritura» (perfil)

type Plural = (count: number, formatted: string) => string;
const plural =
  (one: string, other: (n: string) => string): Plural =>
  (n, formatted) =>
    n === 1 ? one : other(formatted);

export type WritingCopy = {
  title: string;
  intro: string;
  loading: string;
  loadError: string;
  retry: string;
  numbersLabel: string;
  streak: string;
  days: Plural;
  streakHint: string;
  streakZero: string;
  bestStreak: string;
  weekWords: string;
  weekHint: string;
  monthDays: string;
  goal: {
    label: string;
    hint: string;
    bar: (done: string, goal: string) => string;
    reached: string;
    invalid: (max: string) => string;
    save: string;
    saving: string;
    saved: string;
    unsaved: string;
    conflict: string;
    saveFailed: string;
    saveFailedNetwork: string;
    saveFailedInvalid: string;
  };
  calendar: CalendarCopy & { title: string; summary: Plural; empty: string };
  rules: {
    title: string;
    counted: string;
    imports: string;
    activeDay: (chars: string) => string;
    timezone: (zone: string) => string;
  };
};

const es: WritingCopy = {
  title: 'Tu escritura',
  intro: 'Cuenta lo que escribes en duelos y en tus obras. Solo tú ves este resumen.',
  loading: 'Cargando…',
  loadError: 'No pudimos cargar tu escritura.',
  retry: 'Reintentar',
  numbersLabel: 'Resumen',
  streak: 'Racha de escritura',
  days: plural('1 día', (n) => `${n} días`),
  streakHint: 'Días seguidos escribiendo.',
  streakZero: 'Puedes volver a escribir cuando quieras.',
  bestStreak: 'Mejor racha',
  weekWords: 'Palabras esta semana',
  weekHint: 'Últimos 7 días, en duelos y obras.',
  monthDays: 'Días de escritura este mes',
  goal: {
    label: 'Meta diaria (palabras)',
    hint: 'Palabras que te gustaría escribir en un día, entre duelos y obras. Déjala en 0 si no la quieres.',
    bar: (done, goal) => `${done} de ${goal} palabras hoy`,
    reached: 'Meta cumplida.',
    invalid: (max) => `Escribe un número entero entre 0 y ${max}.`,
    save: 'Guardar meta',
    saving: 'Guardando…',
    saved: 'Meta guardada.',
    unsaved: 'Cambios sin guardar',
    conflict: 'Tu meta cambió en otro lugar, quizá en otra pestaña. Actualizamos los datos: revisa y vuelve a guardar si quieres conservar tu cambio.',
    saveFailed: 'No se pudo guardar la meta. Tu cambio sigue aquí; inténtalo de nuevo.',
    saveFailedNetwork: 'No se pudo guardar la meta. Revisa tu conexión; tu cambio sigue aquí.',
    saveFailedInvalid: 'El valor no es válido. Revísalo e inténtalo de nuevo.',
  },
  calendar: {
    title: 'Calendario de escritura',
    summary: plural('1 día con escritura en el último año', (n) => `${n} días con escritura en el último año`),
    empty: 'Tu calendario empieza con tu primer duelo o con el primer texto que guardes en una obra.',
    gridLabel: 'Calendario de escritura de las últimas 53 semanas. Usa las flechas para moverte entre días.',
    legend: 'Leyenda',
    less: 'Menos',
    more: 'Más',
    levels: ['Sin escritura', '1–99 palabras', '100–499 palabras', '500–999 palabras', '1.000 palabras o más'],
    cell: (label, { words, duelWords, studioWords }, f) =>
      `${label}: ${words === 1 ? '1 palabra' : `${f(words)} palabras`} (${f(duelWords)} en duelos, ${f(studioWords)} en obras)`,
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
    counted: 'Cuentan los relatos que entregas en duelos y el texto nuevo que guardas en tus obras.',
    imports: 'Los textos importados no cuentan.',
    activeDay: (chars) => `Un día cuenta cuando escribes al menos ${chars} caracteres.`,
    timezone: (zone) => `Los días se calculan con tu zona horaria (${zone}).`,
  },
};

const en: WritingCopy = {
  title: 'Your writing',
  intro: 'It counts what you write in duels and in your works. Only you can see this summary.',
  loading: 'Loading…',
  loadError: 'We could not load your writing.',
  retry: 'Try again',
  numbersLabel: 'Summary',
  streak: 'Writing streak',
  days: plural('1 day', (n) => `${n} days`),
  streakHint: 'Days in a row writing.',
  streakZero: 'You can come back to writing whenever you like.',
  bestStreak: 'Best streak',
  weekWords: 'Words this week',
  weekHint: 'Last 7 days, in duels and works.',
  monthDays: 'Writing days this month',
  goal: {
    label: 'Daily goal (words)',
    hint: 'Words you would like to write in a day, across duels and works. Leave it at 0 if you do not want one.',
    bar: (done, goal) => `${done} of ${goal} words today`,
    reached: 'Goal reached.',
    invalid: (max) => `Enter a whole number between 0 and ${max}.`,
    save: 'Save goal',
    saving: 'Saving…',
    saved: 'Goal saved.',
    unsaved: 'Unsaved changes',
    conflict: 'Your goal changed somewhere else, maybe in another tab. We refreshed the data: review it and save again if you want to keep your change.',
    saveFailed: 'Could not save your goal. Your change is still here; try again.',
    saveFailedNetwork: 'Could not save your goal. Check your connection; your change is still here.',
    saveFailedInvalid: 'That value is not valid. Check it and try again.',
  },
  calendar: {
    title: 'Writing calendar',
    summary: plural('1 writing day in the last year', (n) => `${n} writing days in the last year`),
    empty: 'Your calendar starts with your first duel or the first text you save in a work.',
    gridLabel: 'Writing calendar for the last 53 weeks. Use the arrow keys to move between days.',
    legend: 'Legend',
    less: 'Less',
    more: 'More',
    levels: ['No writing', '1–99 words', '100–499 words', '500–999 words', '1,000 words or more'],
    cell: (label, { words, duelWords, studioWords }, f) =>
      `${label}: ${words === 1 ? '1 word' : `${f(words)} words`} (${f(duelWords)} in duels, ${f(studioWords)} in works)`,
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
    counted: 'The stories you submit in duels and the new text you save in your works count.',
    imports: 'Imported text does not count.',
    activeDay: (chars) => `A day counts when you write at least ${chars} characters.`,
    timezone: (zone) => `Days are worked out in your time zone (${zone}).`,
  },
};

const pt: WritingCopy = {
  title: 'Sua escrita',
  intro: 'Conta o que você escreve em duelos e nas suas obras. Só você vê este resumo.',
  loading: 'Carregando…',
  loadError: 'Não conseguimos carregar sua escrita.',
  retry: 'Tentar de novo',
  numbersLabel: 'Resumo',
  streak: 'Sequência de escrita',
  days: plural('1 dia', (n) => `${n} dias`),
  streakHint: 'Dias seguidos escrevendo.',
  streakZero: 'Você pode voltar a escrever quando quiser.',
  bestStreak: 'Melhor sequência',
  weekWords: 'Palavras esta semana',
  weekHint: 'Últimos 7 dias, em duelos e obras.',
  monthDays: 'Dias de escrita neste mês',
  goal: {
    label: 'Meta diária (palavras)',
    hint: 'Palavras que você gostaria de escrever em um dia, entre duelos e obras. Deixe em 0 se não quiser.',
    bar: (done, goal) => `${done} de ${goal} palavras hoje`,
    reached: 'Meta cumprida.',
    invalid: (max) => `Digite um número inteiro entre 0 e ${max}.`,
    save: 'Salvar meta',
    saving: 'Salvando…',
    saved: 'Meta salva.',
    unsaved: 'Alterações não salvas',
    conflict: 'Sua meta mudou em outro lugar, talvez em outra aba. Atualizamos os dados: revise e salve de novo se quiser manter sua alteração.',
    saveFailed: 'Não foi possível salvar a meta. Sua alteração continua aqui; tente de novo.',
    saveFailedNetwork: 'Não foi possível salvar a meta. Verifique sua conexão; sua alteração continua aqui.',
    saveFailedInvalid: 'O valor não é válido. Revise e tente de novo.',
  },
  calendar: {
    title: 'Calendário de escrita',
    summary: plural('1 dia de escrita no último ano', (n) => `${n} dias de escrita no último ano`),
    empty: 'Seu calendário começa com o seu primeiro duelo ou com o primeiro texto que você salvar em uma obra.',
    gridLabel: 'Calendário de escrita das últimas 53 semanas. Use as setas para se mover entre os dias.',
    legend: 'Legenda',
    less: 'Menos',
    more: 'Mais',
    levels: ['Sem escrita', '1–99 palavras', '100–499 palavras', '500–999 palavras', '1.000 palavras ou mais'],
    cell: (label, { words, duelWords, studioWords }, f) =>
      `${label}: ${words === 1 ? '1 palavra' : `${f(words)} palavras`} (${f(duelWords)} em duelos, ${f(studioWords)} em obras)`,
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
    counted: 'Contam os relatos que você entrega em duelos e o texto novo que você salva nas suas obras.',
    imports: 'Textos importados não contam.',
    activeDay: (chars) => `Um dia conta quando você escreve pelo menos ${chars} caracteres.`,
    timezone: (zone) => `Os dias são calculados no seu fuso horário (${zone}).`,
  },
};

export const WRITING_COPY: Record<Locale, WritingCopy> = { es, en, pt };
