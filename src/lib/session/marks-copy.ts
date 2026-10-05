import { INTL_LOCALE, type Locale } from '@/lib/i18n';

import type { MarkFailure, ReportReason } from './marks';

// Copy of Marcas (phase 3). From the app's ARB files (galleryComments*,
// storyComments*, workInkMarks*, receivedMarks*) unless marked «web»: those
// cover surfaces the app does not have (the received-comment page).

type Plural = (count: number) => string;

const plural = (one: string, other: (n: number) => string): Plural => (n) => (n === 1 ? one : other(n));

export type MarksCopy = {
  anonymous: string;
  authorBadge: string;
  youBadge: string;
  today: string;
  yesterday: string;
  retry: string;
  cancel: string;
  publish: string;
  sending: string;
  counter: (current: string, max: string) => string;
  lengthHelp: (min: number, max: number) => string;
  reportReasons: Record<ReportReason, string>;
  alreadyReported: string;

  // Capítulos
  chapter: {
    count: Plural;
    title: Plural;
    titleEmpty: string;
    openConversation: string;
    leaveTitle: string;
    leaveAction: string;
    emptyTitle: string;
    emptyBody: string;
    emptyBodyCanMark: string;
    authorCannotStart: string;
    hintRoot: string;
    hintReply: string;
    replyingTo: (name: string) => string;
    reply: string;
    viewReplies: Plural;
    hideReplies: string;
    moreReplies: string;
    loadMore: string;
    deleted: string;
    delete: string;
    deleteTitle: string;
    deleteBody: string;
    deleteBodyWithReplies: string;
    deleteConfirm: string;
    report: string;
    reportTitle: string;
    created: string;
    deletedNotice: string;
    reported: string;
    createUnavailable: string;
    threadUnavailable: string;
    /** A write that failed for no specific reason (galleryCommentsGenericError). */
    actionFailed: string;
    failure: Record<MarkFailure, string>;
  };

  // Relatos de duelo
  story: {
    count: Plural;
    title: Plural;
    titleEmpty: string;
    emptyTitle: string;
    emptyBody: string;
    hint: string;
    selfComment: string;
    delete: string;
    deleteTitle: string;
    deleteBody: string;
    deleteConfirm: string;
    report: string;
    reportTitle: string;
    created: string;
    deletedNotice: string;
    reported: string;
    loadMore: string;
    failure: Record<MarkFailure, string>;
  };

  // Bandeja
  inbox: {
    title: string;
    headline: string;
    lead: string;
    viewAll: string;
    newBadge: Plural;
    emptyTitle: string;
    emptyBody: string;
    previewEmpty: string;
    partial: string;
    loadMore: string;
    storyContext: (prompt: string) => string;
    workContext: (work: string, order: number, chapter: string) => string;
    failure: Record<'unavailable' | 'session' | 'network' | 'generic', string>;
    /** web: the received-comment page (the app opens the duel result). */
    yourStory: string;
    storyLoadError: string;
    promptLabel: string;
    backToInbox: string;
  };
};

export const MARKS_COPY: Record<Locale, MarksCopy> = {
  es: {
    anonymous: 'Usuario de InkDuel',
    authorBadge: 'Autor',
    youBadge: 'Tú',
    today: 'Hoy',
    yesterday: 'Ayer',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    publish: 'Dejarla',
    sending: 'Enviando Marca',
    counter: (current, max) => `${current} de ${max} caracteres`,
    lengthHelp: (min, max) => `Usa entre ${min} y ${max} caracteres.`,
    reportReasons: {
      spam: 'Spam',
      harassment: 'Acoso',
      hate: 'Discurso de odio',
      sexual: 'Contenido sexual',
      violence: 'Violencia',
      self_harm: 'Autolesión',
      other: 'Otro',
    },
    alreadyReported: 'Ya reportada',
    chapter: {
      count: plural('1 Marca', (n) => `${n} Marcas`),
      title: plural('1 Marca de tinta', (n) => `${n} Marcas de tinta`),
      titleEmpty: 'Marcas de tinta',
      openConversation: 'Abrir las Marcas de este capítulo',
      leaveTitle: '¿Qué te dejó este capítulo?',
      leaveAction: 'Deja tu Marca',
      emptyTitle: 'Todavía no hay Marcas',
      emptyBody: 'Nadie dejó su huella en este capítulo todavía.',
      emptyBodyCanMark: 'Sé quien deja la primera huella en este capítulo.',
      authorCannotStart: 'Puedes responderle a tus lectores, pero la primera Marca la dejan ellos.',
      hintRoot: 'Escribe tu Marca',
      hintReply: 'Escribe tu respuesta',
      replyingTo: (name) => `En respuesta a ${name}`,
      reply: 'Responder',
      viewReplies: plural('Ver 1 respuesta', (n) => `Ver ${n} respuestas`),
      hideReplies: 'Ocultar respuestas',
      moreReplies: 'Ver más respuestas',
      loadMore: 'Ver más Marcas',
      deleted: '[Marca eliminada]',
      delete: 'Borrar Marca',
      deleteTitle: '¿Borrar esta Marca?',
      deleteBody: 'Desaparece del capítulo al instante.',
      deleteBodyWithReplies:
        'Tu texto desaparece al instante. Las respuestas que dejaron otros lectores quedan, debajo de una Marca eliminada.',
      deleteConfirm: 'Borrar',
      report: 'Reportar Marca',
      reportTitle: '¿Por qué reportas esta Marca?',
      created: 'Tu Marca quedó.',
      deletedNotice: 'Marca borrada.',
      reported: 'Gracias. Lo vamos a revisar.',
      createUnavailable: 'Por ahora no puedes dejar una Marca.',
      threadUnavailable: 'Este hilo ya no está disponible.',
      actionFailed: 'No pudimos completar la acción. Inténtalo de nuevo.',
      failure: {
        invalid: 'Revisa el texto e inténtalo de nuevo.',
        session: 'Inicia sesión de nuevo para leer las Marcas.',
        forbidden: 'Esta acción no está permitida.',
        notFound: 'Este hilo ya no está disponible.',
        conflict: 'Esa Marca ya quedó. No se duplicó nada.',
        rateLimited: 'Demasiados intentos. Espera un momento.',
        unavailable: 'Las Marcas no están disponibles por ahora.',
        network: 'Revisa tu conexión e inténtalo de nuevo.',
        generic: 'No pudimos cargar las Marcas.',
      },
    },
    story: {
      count: plural('1 Marca', (n) => `${n} Marcas`),
      title: plural('1 Marca de tinta', (n) => `${n} Marcas de tinta`),
      titleEmpty: 'Marcas de tinta',
      emptyTitle: 'Todavía no hay Marcas',
      emptyBody: 'Deja la primera Marca.',
      hint: 'Deja tu Marca en este relato…',
      selfComment: 'No puedes dejar Marcas en tu propio relato.',
      delete: 'Borrar Marca',
      deleteTitle: '¿Borrar esta Marca?',
      deleteBody: 'Desaparece del relato al instante.',
      deleteConfirm: 'Borrar',
      report: 'Reportar Marca',
      reportTitle: '¿Por qué reportas esta Marca?',
      created: 'Tu Marca quedó.',
      deletedNotice: 'Marca borrada.',
      reported: 'Recibimos el reporte. Gracias.',
      loadMore: 'Cargar más',
      failure: {
        invalid: 'Revisa el comentario e inténtalo de nuevo.',
        session: 'Inicia sesión de nuevo para leer las Marcas.',
        forbidden: 'Esta acción no está permitida.',
        notFound: 'Esta Marca o relato ya no está disponible.',
        conflict: 'Ese intento ya no puede reutilizarse. Revisa el comentario antes de publicarlo nuevamente.',
        rateLimited: 'Demasiados intentos. Inténtalo más tarde.',
        unavailable: 'Las Marcas no están disponibles por ahora.',
        network: 'Revisa tu conexión e inténtalo de nuevo.',
        generic: 'No pudimos completar la acción. Inténtalo de nuevo.',
      },
    },
    inbox: {
      title: 'Marcas recibidas',
      headline: 'Marcas recibidas.',
      lead: 'Lo que tus lectores dejaron en tus relatos y capítulos.',
      viewAll: 'Ver todas',
      newBadge: plural('1 nueva', (n) => `${n} nuevas`),
      emptyTitle: 'Todavía no recibiste Marcas',
      emptyBody: 'Cuando alguien deje una Marca en tus relatos o capítulos, aparece aquí.',
      previewEmpty: 'Todavía no recibiste Marcas. Escribe un relato y empezarán a aparecer aquí.',
      partial: 'Algunas Marcas no se pudieron cargar.',
      loadMore: 'Cargar más',
      storyContext: (prompt) => `en tu relato de «${prompt}»`,
      workContext: (work, order, chapter) =>
        chapter ? `en ${work} · Capítulo ${order}: ${chapter}` : `en ${work} · Capítulo ${order}`,
      failure: {
        unavailable: 'Las Marcas recibidas no están disponibles por ahora.',
        session: 'Inicia sesión de nuevo para ver tus Marcas.',
        network: 'Revisa tu conexión e inténtalo de nuevo.',
        generic: 'No pudimos cargar tus Marcas.',
      },
      yourStory: 'Tu relato',
      storyLoadError: 'No pudimos cargar tu relato.',
      promptLabel: 'Consigna',
      backToInbox: 'Marcas recibidas',
    },
  },
  en: {
    anonymous: 'InkDuel user',
    authorBadge: 'Author',
    youBadge: 'You',
    today: 'Today',
    yesterday: 'Yesterday',
    retry: 'Retry',
    cancel: 'Cancel',
    publish: 'Leave it',
    sending: 'Sending Mark',
    counter: (current, max) => `${current} of ${max} characters`,
    lengthHelp: (min, max) => `Use between ${min} and ${max} characters.`,
    reportReasons: {
      spam: 'Spam',
      harassment: 'Harassment',
      hate: 'Hate speech',
      sexual: 'Sexual content',
      violence: 'Violence',
      self_harm: 'Self-harm',
      other: 'Other',
    },
    alreadyReported: 'Already reported',
    chapter: {
      count: plural('1 Ink Mark', (n) => `${n} Ink Marks`),
      title: plural('1 Ink Mark', (n) => `${n} Ink Marks`),
      titleEmpty: 'Ink marks',
      openConversation: 'Open the Ink Marks on this chapter',
      leaveTitle: 'What did this chapter leave you with?',
      leaveAction: 'Leave your Ink Mark',
      emptyTitle: 'No Ink Marks yet',
      emptyBody: 'Nobody has left their mark on this chapter yet.',
      emptyBodyCanMark: 'Be the one who leaves the first mark on this chapter.',
      authorCannotStart: 'You can reply to your readers, but the first Ink Mark is theirs to leave.',
      hintRoot: 'Write your Ink Mark',
      hintReply: 'Write your reply',
      replyingTo: (name) => `Replying to ${name}`,
      reply: 'Reply',
      viewReplies: plural('See 1 reply', (n) => `See ${n} replies`),
      hideReplies: 'Hide replies',
      moreReplies: 'See more replies',
      loadMore: 'See more Ink Marks',
      deleted: '[Ink Mark deleted]',
      delete: 'Delete Ink Mark',
      deleteTitle: 'Delete this Ink Mark?',
      deleteBody: 'It disappears from the chapter right away.',
      deleteBodyWithReplies: 'Your text disappears right away. The replies other readers left stay, under a deleted Ink Mark.',
      deleteConfirm: 'Delete',
      report: 'Report Ink Mark',
      reportTitle: 'Why are you reporting this Ink Mark?',
      created: 'Your Ink Mark is in.',
      deletedNotice: 'Ink Mark deleted.',
      reported: "Thanks. We'll review it.",
      createUnavailable: "You can't leave an Ink Mark right now.",
      threadUnavailable: 'This thread is no longer available.',
      actionFailed: "We couldn't complete that action. Try again.",
      failure: {
        invalid: 'Check the text and try again.',
        session: 'Sign in again to read the Ink Marks.',
        forbidden: "This action isn't allowed.",
        notFound: 'This thread is no longer available.',
        conflict: 'That Ink Mark is already in. Nothing was duplicated.',
        rateLimited: 'Too many attempts. Give it a moment.',
        unavailable: "Ink Marks aren't available right now.",
        network: 'Check your connection and try again.',
        generic: "We couldn't load the Ink Marks.",
      },
    },
    story: {
      count: plural('1 Mark', (n) => `${n} Marks`),
      title: plural('1 Ink Mark', (n) => `${n} Ink Marks`),
      titleEmpty: 'Ink marks',
      emptyTitle: 'No Marks yet',
      emptyBody: 'Leave the first Mark.',
      hint: 'Leave your Mark on this story…',
      selfComment: "You can't leave Marks on your own story.",
      delete: 'Delete Mark',
      deleteTitle: 'Delete this Mark?',
      deleteBody: 'It disappears from the story right away.',
      deleteConfirm: 'Delete',
      report: 'Report Mark',
      reportTitle: 'Why are you reporting this Mark?',
      created: 'Your Mark is in.',
      deletedNotice: 'Mark deleted.',
      reported: 'Report received. Thank you.',
      loadMore: 'Load more',
      failure: {
        invalid: 'Check the comment and try again.',
        session: 'Sign in again to read the Ink Marks.',
        forbidden: "This action isn't allowed.",
        notFound: 'This Mark or story is no longer available.',
        conflict: 'That attempt can no longer be reused. Review the comment before posting it again.',
        rateLimited: 'Too many attempts. Try again later.',
        unavailable: "Marks aren't available right now.",
        network: 'Check your connection and try again.',
        generic: "We couldn't complete that action. Try again.",
      },
    },
    inbox: {
      title: 'Received marks',
      headline: 'Marks received.',
      lead: 'What your readers left on your stories and chapters.',
      viewAll: 'See all',
      newBadge: plural('1 new', (n) => `${n} new`),
      emptyTitle: "You haven't received Marks yet",
      emptyBody: 'When someone leaves a Mark on your stories or chapters, it shows up here.',
      previewEmpty: "No Marks yet. Write a story and they'll start showing up here.",
      partial: "Some marks couldn't be loaded.",
      loadMore: 'Load more',
      storyContext: (prompt) => `on your story for “${prompt}”`,
      workContext: (work, order, chapter) =>
        chapter ? `on ${work} · Chapter ${order}: ${chapter}` : `on ${work} · Chapter ${order}`,
      failure: {
        unavailable: "Received marks aren't available right now.",
        session: 'Sign in again to see your marks.',
        network: 'Check your connection and try again.',
        generic: "We couldn't load your marks.",
      },
      yourStory: 'Your story',
      storyLoadError: "We couldn't load your story.",
      promptLabel: 'Prompt',
      backToInbox: 'Received marks',
    },
  },
  pt: {
    anonymous: 'Usuário do InkDuel',
    authorBadge: 'Autor',
    youBadge: 'Você',
    today: 'Hoje',
    yesterday: 'Ontem',
    retry: 'Tentar de novo',
    cancel: 'Cancelar',
    publish: 'Deixar',
    sending: 'Enviando Marca',
    counter: (current, max) => `${current} de ${max} caracteres`,
    lengthHelp: (min, max) => `Use entre ${min} e ${max} caracteres.`,
    reportReasons: {
      spam: 'Spam',
      harassment: 'Assédio',
      hate: 'Discurso de ódio',
      sexual: 'Conteúdo sexual',
      violence: 'Violência',
      self_harm: 'Automutilação',
      other: 'Outro',
    },
    alreadyReported: 'Já denunciada',
    chapter: {
      count: plural('1 Marca', (n) => `${n} Marcas`),
      title: plural('1 Marca de tinta', (n) => `${n} Marcas de tinta`),
      titleEmpty: 'Marcas de tinta',
      openConversation: 'Abrir as Marcas deste capítulo',
      leaveTitle: 'O que este capítulo deixou em você?',
      leaveAction: 'Deixe sua Marca',
      emptyTitle: 'Ainda não há Marcas',
      emptyBody: 'Ninguém deixou sua marca neste capítulo ainda.',
      emptyBodyCanMark: 'Seja quem deixa a primeira marca neste capítulo.',
      authorCannotStart: 'Você pode responder aos seus leitores, mas a primeira Marca é deles.',
      hintRoot: 'Escreva sua Marca',
      hintReply: 'Escreva sua resposta',
      replyingTo: (name) => `Em resposta a ${name}`,
      reply: 'Responder',
      viewReplies: plural('Ver 1 resposta', (n) => `Ver ${n} respostas`),
      hideReplies: 'Ocultar respostas',
      moreReplies: 'Ver mais respostas',
      loadMore: 'Ver mais Marcas',
      deleted: '[Marca apagada]',
      delete: 'Apagar Marca',
      deleteTitle: 'Apagar esta Marca?',
      deleteBody: 'Ela desaparece do capítulo na hora.',
      deleteBodyWithReplies: 'Seu texto desaparece na hora. As respostas que outros leitores deixaram ficam, sob uma Marca apagada.',
      deleteConfirm: 'Apagar',
      report: 'Denunciar Marca',
      reportTitle: 'Por que você está denunciando esta Marca?',
      created: 'Sua Marca ficou.',
      deletedNotice: 'Marca apagada.',
      reported: 'Obrigado. Vamos analisar.',
      createUnavailable: 'Por enquanto você não pode deixar uma Marca.',
      threadUnavailable: 'Esta conversa não está mais disponível.',
      actionFailed: 'Não foi possível concluir a ação. Tente novamente.',
      failure: {
        invalid: 'Revise o texto e tente de novo.',
        session: 'Entre de novo para ler as Marcas.',
        forbidden: 'Esta ação não é permitida.',
        notFound: 'Esta conversa não está mais disponível.',
        conflict: 'Essa Marca já ficou. Nada foi duplicado.',
        rateLimited: 'Muitas tentativas. Espere um instante.',
        unavailable: 'As Marcas não estão disponíveis por enquanto.',
        network: 'Verifique sua conexão e tente de novo.',
        generic: 'Não conseguimos carregar as Marcas.',
      },
    },
    story: {
      count: plural('1 Marca', (n) => `${n} Marcas`),
      title: plural('1 Marca de tinta', (n) => `${n} Marcas de tinta`),
      titleEmpty: 'Marcas de tinta',
      emptyTitle: 'Ainda não há Marcas',
      emptyBody: 'Deixe a primeira Marca.',
      hint: 'Deixe sua Marca neste conto…',
      selfComment: 'Você não pode deixar Marcas no seu próprio conto.',
      delete: 'Apagar Marca',
      deleteTitle: 'Apagar esta Marca?',
      deleteBody: 'Ela some do conto na hora.',
      deleteConfirm: 'Apagar',
      report: 'Denunciar Marca',
      reportTitle: 'Por que você está denunciando esta Marca?',
      created: 'Sua Marca ficou.',
      deletedNotice: 'Marca apagada.',
      reported: 'Denúncia recebida. Obrigado.',
      loadMore: 'Carregar mais',
      failure: {
        invalid: 'Revise o comentário e tente novamente.',
        session: 'Entre de novo para ler as Marcas.',
        forbidden: 'Esta ação não é permitida.',
        notFound: 'Esta Marca ou conto não está mais disponível.',
        conflict: 'Essa tentativa não pode mais ser reutilizada. Revise o comentário antes de publicá-lo novamente.',
        rateLimited: 'Muitas tentativas. Tente novamente mais tarde.',
        unavailable: 'As Marcas não estão disponíveis por enquanto.',
        network: 'Verifique sua conexão e tente novamente.',
        generic: 'Não foi possível concluir a ação. Tente novamente.',
      },
    },
    inbox: {
      title: 'Marcas recebidas',
      headline: 'Marcas recebidas.',
      lead: 'O que seus leitores deixaram nos seus contos e capítulos.',
      viewAll: 'Ver todas',
      newBadge: plural('1 nova', (n) => `${n} novas`),
      emptyTitle: 'Você ainda não recebeu Marcas',
      emptyBody: 'Quando alguém deixar uma Marca nos seus contos ou capítulos, ela aparece aqui.',
      previewEmpty: 'Você ainda não recebeu Marcas. Escreva um conto e elas vão começar a aparecer aqui.',
      partial: 'Algumas Marcas não puderam ser carregadas.',
      loadMore: 'Carregar mais',
      storyContext: (prompt) => `no seu conto de “${prompt}”`,
      workContext: (work, order, chapter) =>
        chapter ? `em ${work} · Capítulo ${order}: ${chapter}` : `em ${work} · Capítulo ${order}`,
      failure: {
        unavailable: 'As Marcas recebidas não estão disponíveis por enquanto.',
        session: 'Entre de novo para ver suas Marcas.',
        network: 'Verifique sua conexão e tente de novo.',
        generic: 'Não conseguimos carregar suas Marcas.',
      },
      yourStory: 'Seu conto',
      storyLoadError: 'Não conseguimos carregar seu conto.',
      promptLabel: 'Proposta',
      backToInbox: 'Marcas recebidas',
    },
  },
};

/** «Hoy», «Ayer», «4 oct» or «4 oct 2025»: inkShortDate in the app. */
export function shortMarkDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const copy = MARKS_COPY[locale];
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return copy.today;
  if (days === 1) return copy.yesterday;
  return date
    .toLocaleDateString(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'short',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    })
    .replace(/\./g, '');
}
