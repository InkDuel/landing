import type { Locale } from '@/lib/i18n';

export type ProfileCopy = {
  notFoundTitle: string;
  notFoundBody: string;
  goHome: string;
  league: string;
  bio: string;
  stats: string;
  wins: string;
  winRate: string;
  bestStreak: string;
  writerLevel: string;
  openInApp: string;
  join: string;
  metaNotFound: string;
  metaTitle: (username: string) => string;
  metaDescription: (league: string) => string;
  ogDescription: (league: string, wins: number, level: number) => string;
};

export const PROFILE_COPY: Record<Locale, ProfileCopy> = {
  es: {
    notFoundTitle: 'Usuario no encontrado',
    notFoundBody: 'Este perfil no existe o fue eliminado.',
    goHome: 'Ir a InkDuel',
    league: 'Liga',
    bio: 'Descripción',
    stats: 'Estadísticas',
    wins: 'Victorias',
    winRate: '% de victorias',
    bestStreak: 'Mejor racha',
    writerLevel: 'Nivel de escritor',
    openInApp: 'Abrir perfil en la app',
    join: 'Unirse a InkDuel',
    metaNotFound: 'Usuario no encontrado — InkDuel',
    metaTitle: (username) => `${username} en InkDuel`,
    metaDescription: (league) => `${league}. Lee sus relatos y acepta el duelo.`,
    ogDescription: (league, wins, level) => `${league}. ${wins} victorias. Nivel de escritor ${level}.`,
  },
  en: {
    notFoundTitle: 'User not found',
    notFoundBody: 'This profile doesn’t exist or was deleted.',
    goHome: 'Go to InkDuel',
    league: 'League',
    bio: 'About',
    stats: 'Stats',
    wins: 'Wins',
    winRate: 'Win rate',
    bestStreak: 'Best streak',
    writerLevel: 'Writer level',
    openInApp: 'Open profile in the app',
    join: 'Join InkDuel',
    metaNotFound: 'User not found — InkDuel',
    metaTitle: (username) => `${username} on InkDuel`,
    metaDescription: (league) => `${league}. Read their stories and accept the duel.`,
    ogDescription: (league, wins, level) => `${league}. ${wins} wins. Writer level ${level}.`,
  },
  pt: {
    notFoundTitle: 'Usuário não encontrado',
    notFoundBody: 'Este perfil não existe ou foi excluído.',
    goHome: 'Ir para o InkDuel',
    league: 'Liga',
    bio: 'Descrição',
    stats: 'Estatísticas',
    wins: 'Vitórias',
    winRate: '% de vitórias',
    bestStreak: 'Melhor sequência',
    writerLevel: 'Nível de escritor',
    openInApp: 'Abrir perfil no app',
    join: 'Entrar no InkDuel',
    metaNotFound: 'Usuário não encontrado — InkDuel',
    metaTitle: (username) => `${username} no InkDuel`,
    metaDescription: (league) => `${league}. Leia os relatos e aceite o duelo.`,
    ogDescription: (league, wins, level) => `${league}. ${wins} vitórias. Nível de escritor ${level}.`,
  },
};
