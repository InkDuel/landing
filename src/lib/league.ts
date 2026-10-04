// Mirrors InkLeague in inkduel_mobile/lib/core/presentation/theme/ink_league.dart.
// The backend still sends «Duellista» and «Maestro de Tinta»; both resolve
// here, at the presentation layer.

export type League = 'aprendiz' | 'escriba' | 'narrador' | 'duelista' | 'maestro' | 'leyenda';

const BY_RANK_TIER: Record<string, League> = {
  aprendiz: 'aprendiz',
  escriba: 'escriba',
  narrador: 'narrador',
  duellista: 'duelista',
  duelista: 'duelista',
  'maestro de tinta': 'maestro',
  maestro: 'maestro',
  leyenda: 'leyenda',
};

export function leagueFromRankTier(rankTier: string | null | undefined): League | null {
  if (!rankTier) return null;
  return BY_RANK_TIER[rankTier.trim().toLowerCase()] ?? null;
}

export const LEAGUE_ORDER: readonly League[] = [
  'aprendiz',
  'escriba',
  'narrador',
  'duelista',
  'maestro',
  'leyenda',
];

// League names as the app shows them (ARB profileRankTier*), with the
// «Duelista» normalization of 07 - Copy y terminología.
export const LEAGUE_NAMES: Record<League, Record<'es' | 'en' | 'pt', string>> = {
  aprendiz: { es: 'Aprendiz', en: 'Apprentice', pt: 'Aprendiz' },
  escriba: { es: 'Escriba', en: 'Scribe', pt: 'Escriba' },
  narrador: { es: 'Narrador', en: 'Narrator', pt: 'Narrador' },
  duelista: { es: 'Duelista', en: 'Duelist', pt: 'Duelista' },
  maestro: { es: 'Maestro de Tinta', en: 'Ink Master', pt: 'Mestre da Tinta' },
  leyenda: { es: 'Leyenda', en: 'Legend', pt: 'Lenda' },
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** «Narrador II». The division is shown as in the app, in roman numerals. */
export function leagueLabel(league: League, division: number | null | undefined, locale: 'es' | 'en' | 'pt'): string {
  const name = LEAGUE_NAMES[league][locale];
  const roman = division && division >= 1 && division <= ROMAN.length ? ROMAN[division - 1] : null;
  return roman ? `${name} ${roman}` : name;
}
