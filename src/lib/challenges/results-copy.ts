import type { Locale } from '@/lib/i18n';

export type ResultsCopy = {
  kicker: string;
  seasonLine: (edition: number, total: number) => string;
  publishedOn: (date: string) => string;
  juryTitle: string;
  juryDeserted: string;
  juryInherited: string;
  favoritesTitle: string;
  favoritesBadge: string;
  favoritesNote: string;
  favoritesNone: string;
  plumaTitle: string;
  plumaBody: string;
  mentionsTitle: string;
  nextTitle: string;
  nextLead: string;
  nextInherited: (name: string) => string;
  nextHouse: string;
  nextOpens: (date: string) => string;
  readStory: string;
  viewProfile: (name: string) => string;
  waitingTitle: string;
  waitingBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  goHome: string;
  cta: string;
  metaTitle: (title: string) => string;
  metaDescription: string;
  metaWaitingTitle: string;
  metaNotFound: string;
};

export const RESULTS_COPY: Record<Locale, ResultsCopy> = {
  es: {
    kicker: 'Resultados',
    seasonLine: (edition, total) => (total > 0 ? `Edición ${edition} de ${total}` : `Edición ${edition}`),
    publishedOn: (date) => `Publicados el ${date}`,
    juryTitle: 'Premio del jurado',
    juryDeserted: 'Esta semana el jurado no entregó su premio',
    juryInherited: 'La frase que hereda la próxima edición',
    favoritesTitle: 'Favorito del público',
    favoritesBadge: 'Lo eligieron sus 3 lectores',
    favoritesNote: 'Un reconocimiento de la comunidad: no mide cuál es el mejor relato, y el azar también influye.',
    favoritesNone: 'Esta semana ningún relato fue elegido por todos sus lectores',
    plumaTitle: 'Pluma Guía',
    plumaBody: 'Reconocida por ayudar a otros a escribir mejor.',
    mentionsTitle: 'Menciones literarias',
    nextTitle: 'La próxima Consigna',
    nextLead: 'El lunes empieza con:',
    nextInherited: (name) => `Frase heredada de ${name}`,
    nextHouse: 'Frase de la casa',
    nextOpens: (date) => `Abre el ${date}`,
    readStory: 'Leer el relato',
    viewProfile: (name) => `Ver perfil de ${name}`,
    waitingTitle: 'Los resultados aún no están listos.',
    waitingBody: 'Los resultados se publican el domingo a las 18:00. Hasta entonces los relatos siguen siendo anónimos.',
    notFoundTitle: 'Resultados no encontrados',
    notFoundBody: 'Esta edición no existe o no está disponible.',
    goHome: 'Ir a InkDuel',
    cta: 'Escribir en la próxima Consigna',
    metaTitle: (title) => `Resultados de ${title} — InkDuel`,
    metaDescription: 'Premio del jurado, Favorito del público y la frase con la que empieza la próxima Consigna semanal de InkDuel.',
    metaWaitingTitle: 'Resultados de la Consigna — InkDuel',
    metaNotFound: 'Resultados no encontrados — InkDuel',
  },
  en: {
    kicker: 'Results',
    seasonLine: (edition, total) => (total > 0 ? `Edition ${edition} of ${total}` : `Edition ${edition}`),
    publishedOn: (date) => `Published ${date}`,
    juryTitle: 'Jury prize',
    juryDeserted: 'This week the jury did not award its prize',
    juryInherited: 'Inherited line',
    favoritesTitle: 'Audience favorite',
    favoritesBadge: 'Chosen by all 3 of their readers',
    favoritesNote: 'A community recognition: it does not measure which story is the best, and chance plays a part.',
    favoritesNone: 'This week no story was chosen by all of its readers',
    plumaTitle: 'Pluma Guía',
    plumaBody: 'Recognized for helping others write better.',
    mentionsTitle: 'Literary mentions',
    nextTitle: 'The next Prompt',
    nextLead: 'On Monday it starts with:',
    nextInherited: (name) => `Inherited line from ${name}`,
    nextHouse: 'House line',
    nextOpens: (date) => `Opens ${date}`,
    readStory: 'Read the story',
    viewProfile: (name) => `View ${name}’s profile`,
    waitingTitle: 'The results are not ready yet.',
    waitingBody: 'Results are published on Sunday at 6:00 PM. Until then the stories stay anonymous.',
    notFoundTitle: 'Results not found',
    notFoundBody: 'This edition does not exist or is not available.',
    goHome: 'Go to InkDuel',
    cta: 'Write in the next Prompt',
    metaTitle: (title) => `${title} results — InkDuel`,
    metaDescription: 'Jury Prize, Readers’ Favorite and the line that opens the next weekly InkDuel Prompt.',
    metaWaitingTitle: 'Weekly Prompt results — InkDuel',
    metaNotFound: 'Results not found — InkDuel',
  },
  pt: {
    kicker: 'Resultados',
    seasonLine: (edition, total) => (total > 0 ? `Edição ${edition} de ${total}` : `Edição ${edition}`),
    publishedOn: (date) => `Publicados em ${date}`,
    juryTitle: 'Prêmio do júri',
    juryDeserted: 'Esta semana o júri não entregou seu prêmio',
    juryInherited: 'Frase herdada',
    favoritesTitle: 'Favorito do público',
    favoritesBadge: 'Escolhido pelos 3 leitores',
    favoritesNote: 'Um reconhecimento da comunidade: não mede qual é o melhor relato, e o acaso também influencia.',
    favoritesNone: 'Esta semana nenhum relato foi escolhido por todos os seus leitores',
    plumaTitle: 'Pluma Guía',
    plumaBody: 'Reconhecida por ajudar outros a escrever melhor.',
    mentionsTitle: 'Menções literárias',
    nextTitle: 'A próxima Proposta',
    nextLead: 'Na segunda-feira começa com:',
    nextInherited: (name) => `Frase herdada de ${name}`,
    nextHouse: 'Frase da casa',
    nextOpens: (date) => `Abre em ${date}`,
    readStory: 'Ler o relato',
    viewProfile: (name) => `Ver perfil de ${name}`,
    waitingTitle: 'Os resultados ainda não estão prontos.',
    waitingBody: 'Os resultados são publicados no domingo às 18:00. Até lá, os relatos continuam anônimos.',
    notFoundTitle: 'Resultados não encontrados',
    notFoundBody: 'Esta edição não existe ou não está disponível.',
    goHome: 'Ir para o InkDuel',
    cta: 'Escrever na próxima Proposta',
    metaTitle: (title) => `Resultados de ${title} — InkDuel`,
    metaDescription: 'Prêmio do júri, Favorito do público e a frase que abre a próxima Proposta semanal do InkDuel.',
    metaWaitingTitle: 'Resultados da Proposta — InkDuel',
    metaNotFound: 'Resultados não encontrados — InkDuel',
  },
};
