import type { Locale } from '@/lib/i18n';

// Copy of the signed-in area. Taken from the app's ARB files
// (inkduel_mobile/lib/l10n) unless marked «web»: those cover states the app
// does not have. Terminology: 07 - Copy y terminología (Historias, not
// Galería; Consigna / Prompt / Proposta).

type Plural = (count: number) => string;

export type SessionCopy = {
  nav: { stories: string; profile: string; signIn: string; mainLabel: string };
  login: {
    title: string;
    subtitle: string;
    apple: string;
    google: string;
    divider: string;
    email: string;
    password: string;
    submit: string;
    submitting: string;
    registerPrompt: string;
    registerCta: string;
    missingFields: string;
    errors: Record<'invalidCredentials' | 'tooManyRequests' | 'cancelled' | 'popupBlocked' | 'network' | 'generic', string>;
    /** web */
    unconfiguredTitle: string;
    /** web */
    unconfiguredBody: string;
    /** web */
    noAccountTitle: string;
    /** web */
    noAccountBody: string;
    userDataError: string;
    retry: string;
  };
  common: { loading: string; retry: string; back: string; untitled: string };
  profile: {
    rankKicker: string;
    lp: (points: number) => string;
    toNext: (points: number, rank: string) => string;
    maxRank: string;
    duels: string;
    won: string;
    lost: string;
    winRate: string;
    winRateValue: (rate: number) => string;
    writerLevelLabel: string;
    currentStreak: string;
    bestStreak: string;
    writerLevel: (level: number) => string;
    xp: (current: number, total: number) => string;
    works: string;
    worksSubtitle: string;
    signOut: string;
    signOutTitle: string;
    signOutBody: string;
    signOutConfirm: string;
    cancel: string;
    notFoundTitle: string;
    notFoundBody: string;
    loadError: string;
    socialLabel: string;
  };
  stories: {
    title: string;
    relatosTab: string;
    worksTab: string;
    latest: string;
    latestDated: (date: string) => string;
    promptLead: string;
    promptLabel: string;
    winReason: (strengths: string) => string;
    and: string;
    read: string;
    score: (score: number) => string;
    relatosError: string;
    relatosErrorBody: string;
    relatosEmptyTitle: string;
    relatosEmptyBody: string;
    worksError: string;
    worksEmpty: string;
    chapterCount: Plural;
  };
  reader: {
    chapter: (order: number) => string;
    readTime: Plural;
    endOfChapter: (order: number) => string;
    nextChapter: string;
    chapters: string;
    reachedEnd: string;
    loadError: string;
    unavailable: string;
    previous: string;
    next: string;
    position: (current: number, total: number) => string;
    emptyWork: string;
    close: string;
  };
};

const plural = (one: string, other: (n: number) => string, zero?: string): Plural => (n) =>
  n === 0 && zero ? zero : n === 1 ? one : other(n);

export const SESSION_COPY: Record<Locale, SessionCopy> = {
  es: {
    nav: { stories: 'Historias', profile: 'Perfil', signIn: 'Inicia sesión', mainLabel: 'Navegación principal' },
    login: {
      title: 'Inicia sesión.',
      subtitle: 'Escribe, compite y descubre de qué está hecha tu voz.',
      apple: 'Continuar con Apple',
      google: 'Continuar con Google',
      divider: 'o con tu correo',
      email: 'Correo electrónico',
      password: 'Contraseña',
      submit: 'Entrar',
      submitting: 'Entrando…',
      registerPrompt: '¿No tienes cuenta?',
      registerCta: 'Crea una en la app',
      missingFields: 'Escribe tu correo y contraseña para entrar.',
      errors: {
        invalidCredentials: 'Revisa tu correo y contraseña e inténtalo otra vez.',
        tooManyRequests: 'Hubo demasiados intentos. Espera un poco y vuelve a probar.',
        cancelled: 'Cancelaste el inicio de sesión.',
        popupBlocked: 'Tu navegador bloqueó la ventana para iniciar sesión. Permite las ventanas emergentes e inténtalo otra vez.',
        network: 'No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.',
        generic: 'No pudimos completar la autenticación. Inténtalo otra vez.',
      },
      unconfiguredTitle: 'El inicio de sesión en la web todavía no está disponible.',
      unconfiguredBody: 'Mientras tanto, puedes seguir jugando y leyendo en la app.',
      noAccountTitle: 'Todavía no tienes una cuenta en InkDuel.',
      noAccountBody: 'Crea tu cuenta en la app y después vuelve a entrar aquí con el mismo acceso.',
      userDataError: 'No pudimos cargar tus datos de usuario.',
      retry: 'Reintentar',
    },
    common: { loading: 'Cargando…', retry: 'Reintentar', back: 'Volver', untitled: 'Sin título' },
    profile: {
      rankKicker: 'Rango',
      lp: (p) => `${p} LP`,
      toNext: (p, rank) => `Faltan ${p} para ${rank}`,
      maxRank: 'Rango máximo alcanzado.',
      duels: 'Duelos',
      won: 'Ganados',
      lost: 'Perdidos',
      winRate: 'de victorias',
      winRateValue: (r) => `${r} %`,
      writerLevelLabel: 'Nivel de escritor',
      currentStreak: 'Racha actual',
      bestStreak: 'Mejor racha',
      writerLevel: (l) => `Nivel de escritor ${l}`,
      xp: (c, t) => `${c} / ${t} XP`,
      works: 'Obras',
      worksSubtitle: 'Sus historias publicadas',
      signOut: 'Cerrar sesión',
      signOutTitle: '¿Cerrar sesión?',
      signOutBody: 'Vas a salir de InkDuel en este navegador.',
      signOutConfirm: 'Cerrar sesión',
      cancel: 'Cancelar',
      notFoundTitle: 'Usuario no encontrado',
      notFoundBody: 'Este perfil no existe o fue eliminado.',
      loadError: 'No pudimos cargar este perfil.',
      socialLabel: 'Redes',
    },
    stories: {
      title: 'Historias',
      relatosTab: 'Relatos de duelo',
      worksTab: 'Obras',
      latest: 'Lo último',
      latestDated: (d) => `Lo último · ${d}`,
      promptLead: 'Consigna.',
      promptLabel: 'Consigna',
      winReason: (s) => `Ganó por ${s}`,
      and: ' y ',
      read: 'Leer',
      score: (s) => `${s} pts`,
      relatosError: 'No pudimos cargar Historias.',
      relatosErrorBody: 'Inténtalo de nuevo en unos segundos.',
      relatosEmptyTitle: 'Historias todavía está juntando tinta.',
      relatosEmptyBody: 'Cuando haya historias ganadoras públicas, aparecerán aquí para inspirar a otros duelistas.',
      worksError: 'No se pudieron cargar las obras',
      worksEmpty: 'Todavía no hay obras publicadas',
      chapterCount: plural('1 capítulo', (n) => `${n} capítulos`, 'Sin capítulos'),
    },
    reader: {
      chapter: (o) => `Capítulo ${o}`,
      readTime: plural('1 min de lectura', (n) => `${n} min de lectura`),
      endOfChapter: (o) => `Fin del capítulo ${o}`,
      nextChapter: 'Siguiente capítulo',
      chapters: 'Capítulos',
      reachedEnd: 'Has llegado al final de esta obra.',
      loadError: 'No se pudo cargar esta obra',
      unavailable: 'Esta obra ya no está disponible',
      previous: 'Anterior',
      next: 'Siguiente',
      position: (c, t) => `${c} de ${t}`,
      emptyWork: 'Esta obra todavía no tiene capítulos.',
      close: 'Cerrar',
    },
  },
  en: {
    nav: { stories: 'Stories', profile: 'Profile', signIn: 'Sign in', mainLabel: 'Main navigation' },
    login: {
      title: 'Sign in.',
      subtitle: 'Write, compete, and discover what your voice is made of.',
      apple: 'Continue with Apple',
      google: 'Continue with Google',
      divider: 'or with your email',
      email: 'Email',
      password: 'Password',
      submit: 'Enter',
      submitting: 'Signing in…',
      registerPrompt: "Don't have an account?",
      registerCta: 'Create one in the app',
      missingFields: 'Enter your email and password to sign in.',
      errors: {
        invalidCredentials: 'Check your email and password and try again.',
        tooManyRequests: 'There were too many attempts. Wait a bit and try again.',
        cancelled: 'You cancelled the sign-in.',
        popupBlocked: 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
        network: "We couldn't connect. Check your connection and try again.",
        generic: 'We could not complete authentication. Try again.',
      },
      unconfiguredTitle: "Signing in on the web isn't available yet.",
      unconfiguredBody: 'In the meantime, you can keep playing and reading in the app.',
      noAccountTitle: "You don't have an InkDuel account yet.",
      noAccountBody: 'Create your account in the app, then come back and sign in here with the same method.',
      userDataError: 'We could not load your user data.',
      retry: 'Retry',
    },
    common: { loading: 'Loading…', retry: 'Retry', back: 'Back', untitled: 'Untitled' },
    profile: {
      rankKicker: 'Rank',
      lp: (p) => `${p} LP`,
      toNext: (p, rank) => `${p} to go for ${rank}`,
      maxRank: 'Highest rank reached.',
      duels: 'Duels',
      won: 'Won',
      lost: 'Lost',
      winRate: 'win rate',
      winRateValue: (r) => `${r}%`,
      writerLevelLabel: 'Writer level',
      currentStreak: 'Current streak',
      bestStreak: 'Best streak',
      writerLevel: (l) => `Writer Level ${l}`,
      xp: (c, t) => `${c} / ${t} XP`,
      works: 'Works',
      worksSubtitle: 'Their published stories',
      signOut: 'Sign out',
      signOutTitle: 'Sign out?',
      signOutBody: "You'll leave InkDuel on this browser.",
      signOutConfirm: 'Sign out',
      cancel: 'Cancel',
      notFoundTitle: 'User not found',
      notFoundBody: 'This profile doesn’t exist or was deleted.',
      loadError: "We couldn't load this profile.",
      socialLabel: 'Social',
    },
    stories: {
      title: 'Stories',
      relatosTab: 'Duel stories',
      worksTab: 'Works',
      latest: 'Latest',
      latestDated: (d) => `Latest · ${d}`,
      promptLead: 'Prompt.',
      promptLabel: 'Prompt',
      winReason: (s) => `Won for ${s}`,
      and: ' and ',
      read: 'Read',
      score: (s) => `${s} pts`,
      relatosError: "We couldn't load Stories.",
      relatosErrorBody: 'Try again in a few seconds.',
      relatosEmptyTitle: 'Stories is still gathering ink.',
      relatosEmptyBody: 'When there are public winning stories, they will appear here to inspire other duelists.',
      worksError: "Couldn't load the works",
      worksEmpty: 'No works published yet',
      chapterCount: plural('1 chapter', (n) => `${n} chapters`, 'No chapters'),
    },
    reader: {
      chapter: (o) => `Chapter ${o}`,
      readTime: plural('1 min read', (n) => `${n} min read`),
      endOfChapter: (o) => `End of chapter ${o}`,
      nextChapter: 'Next chapter',
      chapters: 'Chapters',
      reachedEnd: 'You have reached the end of this work.',
      loadError: "Couldn't load this work",
      unavailable: 'This work is no longer available',
      previous: 'Previous',
      next: 'Next',
      position: (c, t) => `${c} of ${t}`,
      emptyWork: 'This work has no chapters yet.',
      close: 'Close',
    },
  },
  pt: {
    nav: { stories: 'Histórias', profile: 'Perfil', signIn: 'Entrar', mainLabel: 'Navegação principal' },
    login: {
      title: 'Entre na sua conta.',
      subtitle: 'Escreva, compita e descubra do que a sua voz é feita.',
      apple: 'Continuar com Apple',
      google: 'Continuar com Google',
      divider: 'ou com seu e-mail',
      email: 'E-mail',
      password: 'Senha',
      submit: 'Entrar',
      submitting: 'Entrando…',
      registerPrompt: 'Ainda não tem conta?',
      registerCta: 'Crie uma no app',
      missingFields: 'Digite seu e-mail e sua senha para entrar.',
      errors: {
        invalidCredentials: 'Revise seu e-mail e sua senha e tente novamente.',
        tooManyRequests: 'Houve tentativas demais. Espere um pouco e tente novamente.',
        cancelled: 'Você cancelou o login.',
        popupBlocked: 'Seu navegador bloqueou a janela de login. Permita pop-ups e tente novamente.',
        network: 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
        generic: 'Não foi possível concluir a autenticação. Tente novamente.',
      },
      unconfiguredTitle: 'O login na web ainda não está disponível.',
      unconfiguredBody: 'Enquanto isso, você pode continuar jogando e lendo no app.',
      noAccountTitle: 'Você ainda não tem uma conta no InkDuel.',
      noAccountBody: 'Crie sua conta no app e depois volte a entrar aqui com o mesmo acesso.',
      userDataError: 'Não foi possível carregar seus dados de usuário.',
      retry: 'Tentar novamente',
    },
    common: { loading: 'Carregando…', retry: 'Tentar novamente', back: 'Voltar', untitled: 'Sem título' },
    profile: {
      rankKicker: 'Ranque',
      lp: (p) => `${p} LP`,
      toNext: (p, rank) => `Faltam ${p} para ${rank}`,
      maxRank: 'Ranque máximo alcançado.',
      duels: 'Duelos',
      won: 'Vencidos',
      lost: 'Perdidos',
      winRate: 'de vitórias',
      winRateValue: (r) => `${r} %`,
      writerLevelLabel: 'Nível de escritor',
      currentStreak: 'Sequência atual',
      bestStreak: 'Melhor sequência',
      writerLevel: (l) => `Nível de escritor ${l}`,
      xp: (c, t) => `${c} / ${t} XP`,
      works: 'Obras',
      worksSubtitle: 'Suas histórias publicadas',
      signOut: 'Sair da conta',
      signOutTitle: 'Sair da conta?',
      signOutBody: 'Você vai sair do InkDuel neste navegador.',
      signOutConfirm: 'Sair da conta',
      cancel: 'Cancelar',
      notFoundTitle: 'Usuário não encontrado',
      notFoundBody: 'Este perfil não existe ou foi excluído.',
      loadError: 'Não foi possível carregar este perfil.',
      socialLabel: 'Redes',
    },
    stories: {
      title: 'Histórias',
      relatosTab: 'Contos de duelo',
      worksTab: 'Obras',
      latest: 'O mais recente',
      latestDated: (d) => `O mais recente · ${d}`,
      promptLead: 'Proposta.',
      promptLabel: 'Proposta',
      winReason: (s) => `Venceu por ${s}`,
      and: ' e ',
      read: 'Ler',
      score: (s) => `${s} pts`,
      relatosError: 'Não foi possível carregar Histórias.',
      relatosErrorBody: 'Tente novamente em alguns segundos.',
      relatosEmptyTitle: 'Histórias ainda está juntando tinta.',
      relatosEmptyBody: 'Quando houver histórias vencedoras públicas, elas aparecerão aqui para inspirar outros duelistas.',
      worksError: 'Não foi possível carregar as obras',
      worksEmpty: 'Ainda não há obras publicadas',
      chapterCount: plural('1 capítulo', (n) => `${n} capítulos`, 'Sem capítulos'),
    },
    reader: {
      chapter: (o) => `Capítulo ${o}`,
      readTime: plural('1 min de leitura', (n) => `${n} min de leitura`),
      endOfChapter: (o) => `Fim do capítulo ${o}`,
      nextChapter: 'Próximo capítulo',
      chapters: 'Capítulos',
      reachedEnd: 'Você chegou ao final desta obra.',
      loadError: 'Não foi possível carregar esta obra',
      unavailable: 'Esta obra não está mais disponível',
      previous: 'Anterior',
      next: 'Próximo',
      position: (c, t) => `${c} de ${t}`,
      emptyWork: 'Esta obra ainda não tem capítulos.',
      close: 'Fechar',
    },
  },
};
