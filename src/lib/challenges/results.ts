// Public results of a weekly Challenges v1 edition (GET /public/challenges/:slug/results).
// Pure mapping, no server-only imports, so it can be tested. The page never
// shows an author unless this mapper received a well-formed 200 response.

export type ResultsAuthor = { userId: string; displayName: string };

export type ResultsEntry = {
  entryId: string;
  duelId: string;
  storyId: string;
  firstLine: string;
  author: ResultsAuthor;
};

export type OpeningLine =
  | { kind: 'inherited'; text: string; authorUserId: string; authorDisplayName: string }
  | { kind: 'house'; text: string };

export type PublicResults = {
  slug: string;
  title: string;
  season: { id: string; edition: number; editionsInSeason: number } | null;
  publishedAt: string;
  /** null when the jury did not award (deserted, none or disabled). */
  jury: { entry: ResultsEntry; inheritedLine: string } | null;
  /** Empty when no story was chosen by all its readers. */
  favorites: ResultsEntry[];
  plumaGuia: ResultsAuthor | null;
  mentions: ResultsEntry[];
  next: { slug: string; opensAt: string; openingLine: OpeningLine | null } | null;
};

export type ResultsOutcome =
  | { kind: 'ok'; results: PublicResults }
  | { kind: 'not_published' }
  | { kind: 'not_found' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

function mapAuthor(value: unknown): ResultsAuthor | null {
  if (!isRecord(value)) return null;
  const userId = str(value.userId);
  const displayName = str(value.displayName);
  return userId && displayName ? { userId, displayName } : null;
}

function mapEntry(value: unknown): ResultsEntry | null {
  if (!isRecord(value)) return null;
  const author = mapAuthor(value.author);
  const entryId = str(value.entryId);
  if (!author || !entryId) return null;
  return {
    entryId,
    duelId: str(value.duelId),
    storyId: str(value.storyId),
    firstLine: str(value.firstLine),
    author,
  };
}

function mapEntries(value: unknown): ResultsEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapEntry).filter((entry): entry is ResultsEntry => entry !== null);
}

function mapOpeningLine(value: unknown): OpeningLine | null {
  if (!isRecord(value)) return null;
  const text = str(value.text);
  if (!text) return null;
  if (value.kind === 'inherited') {
    const authorDisplayName = str(value.authorDisplayName);
    // An inherited line without its author is shown as the house line: never anonymous credit.
    return authorDisplayName
      ? { kind: 'inherited', text, authorUserId: str(value.authorUserId), authorDisplayName }
      : { kind: 'house', text };
  }
  return value.kind === 'house' ? { kind: 'house', text } : null;
}

/** Maps a 200 body; null when it is not a usable results payload. */
export function mapPublicResults(data: unknown): PublicResults | null {
  if (!isRecord(data) || !str(data.slug) || !str(data.publishedAt)) return null;
  const jury = isRecord(data.jury) ? data.jury : {};
  const juryEntry = jury.status === 'awarded' ? mapEntry(jury.entry) : null;
  const favorites = isRecord(data.favorites) && data.favorites.status === 'awarded' ? mapEntries(data.favorites.entries) : [];
  const pluma = isRecord(data.plumaGuia) && data.plumaGuia.status === 'awarded' ? mapAuthor(data.plumaGuia.user) : null;
  const season = isRecord(data.season) && str(data.season.id) && typeof data.season.edition === 'number'
    ? {
        id: str(data.season.id),
        edition: data.season.edition,
        editionsInSeason: typeof data.season.editionsInSeason === 'number' ? data.season.editionsInSeason : 0,
      }
    : null;
  const next = isRecord(data.next) && str(data.next.opensAt)
    ? { slug: str(data.next.slug), opensAt: str(data.next.opensAt), openingLine: mapOpeningLine(data.next.openingLine) }
    : null;
  return {
    slug: str(data.slug),
    title: str(data.title),
    season,
    publishedAt: str(data.publishedAt),
    jury: juryEntry ? { entry: juryEntry, inheritedLine: str(jury.inheritedLine) || juryEntry.firstLine } : null,
    favorites,
    plumaGuia: pluma,
    mentions: mapEntries(data.mentions),
    next,
  };
}

/** Maps an HTTP status and parsed body to the page state. Only a 200 can carry authors. */
export function classifyResultsResponse(status: number, body: unknown): ResultsOutcome {
  if (status === 200) {
    const results = mapPublicResults(body);
    return results ? { kind: 'ok', results } : { kind: 'not_found' };
  }
  if (status === 409 && isRecord(body) && body.code === 'results_not_published') {
    return { kind: 'not_published' };
  }
  return { kind: 'not_found' };
}
