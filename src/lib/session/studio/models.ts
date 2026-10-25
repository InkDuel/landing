// InkDuel Studio — typed, defensive views of the backend contract
// (inkduel-backend/docs/INKDUEL_STUDIO_API.md). Unknown or missing fields fall
// back to empty values, never to whatever arrived.

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const str = (value: unknown): string => (typeof value === 'string' ? value : '');
export const bool = (value: unknown): boolean => value === true;
export const int = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
export const float = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const strList = (value: unknown): string[] => list(value).filter((v): v is string => typeof v === 'string');
const optInt = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null);
const optStr = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

export type DraftStatus = 'idea' | 'draft' | 'revising' | 'ready';
export const DRAFT_STATUSES: readonly DraftStatus[] = ['idea', 'draft', 'revising', 'ready'];
const draftStatus = (value: unknown): DraftStatus =>
  DRAFT_STATUSES.includes(value as DraftStatus) ? (value as DraftStatus) : 'draft';

export type StudioLimits = {
  draftBody: number;
  publishBody: number;
  title: number;
  synopsis: number;
  maxChapters: number;
  maxDrafts: number;
  shortText: number;
  longText: number;
  noteBody: number;
  tags: number;
  tagLength: number;
  snapshotLabel: number;
  manualSnapshots: number;
};

/** Mirrors internal/models/studio.go; used until the overview answers. */
export const DEFAULT_LIMITS: StudioLimits = {
  draftBody: 40000,
  publishBody: 5000,
  title: 120,
  synopsis: 1000,
  maxChapters: 100,
  maxDrafts: 200,
  shortText: 160,
  longText: 4000,
  noteBody: 20000,
  tags: 12,
  tagLength: 40,
  snapshotLabel: 80,
  manualSnapshots: 50,
};

function parseLimits(data: unknown): StudioLimits {
  if (!isRecord(data)) return DEFAULT_LIMITS;
  const pick = (key: keyof StudioLimits) => (int(data[key]) > 0 ? int(data[key]) : DEFAULT_LIMITS[key]);
  return {
    draftBody: pick('draftBody'),
    publishBody: pick('publishBody'),
    title: pick('title'),
    synopsis: pick('synopsis'),
    maxChapters: pick('maxChapters'),
    maxDrafts: pick('maxDrafts'),
    shortText: pick('shortText'),
    longText: pick('longText'),
    noteBody: pick('noteBody'),
    tags: pick('tags'),
    tagLength: pick('tagLength'),
    snapshotLabel: pick('snapshotLabel'),
    manualSnapshots: pick('manualSnapshots'),
  };
}

export type DraftSummary = {
  id: string;
  linkedChapterId: string | null;
  title: string;
  synopsis: string;
  status: DraftStatus;
  revision: number;
  metaRevision: number;
  wordCount: number;
  charCount: number;
  basePublishedRevision: number | null;
  pendingChanges: boolean;
  deleted: boolean;
  lastPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Draft = DraftSummary & { body: string };

export function parseDraftSummary(data: unknown): DraftSummary | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    linkedChapterId: optStr(data.linkedChapterId),
    title: str(data.title),
    synopsis: str(data.synopsis),
    status: draftStatus(data.status),
    revision: int(data.revision),
    metaRevision: int(data.metaRevision),
    wordCount: int(data.wordCount),
    charCount: int(data.charCount),
    basePublishedRevision: optInt(data.basePublishedRevision),
    pendingChanges: bool(data.pendingChanges),
    deleted: bool(data.deleted),
    lastPublishedAt: optStr(data.lastPublishedAt),
    createdAt: str(data.createdAt),
    updatedAt: str(data.updatedAt),
  };
}

export function parseDraft(data: unknown): Draft | null {
  const summary = parseDraftSummary(data);
  if (!summary || !isRecord(data)) return null;
  return { ...summary, body: str(data.body) };
}

/** One manuscript row: a chapter, its draft, or a draft not yet a chapter. */
export type ManuscriptEntry = {
  id: string;
  chapterId: string | null;
  orderIndex: number;
  published: boolean;
  chapterTitle: string;
  chapterRevision: number | null;
  chapterWordCount: number;
  chapterCharCount: number;
  seededFromDuel: boolean;
  draft: DraftSummary | null;
  publishedChanged: boolean;
};

function parseEntry(data: unknown): ManuscriptEntry | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    chapterId: optStr(data.chapterId),
    orderIndex: int(data.orderIndex),
    published: bool(data.published),
    chapterTitle: str(data.chapterTitle),
    chapterRevision: optInt(data.chapterRevision),
    chapterWordCount: int(data.chapterWordCount),
    chapterCharCount: int(data.chapterCharCount),
    seededFromDuel: bool(data.seededFromDuel),
    draft: parseDraftSummary(data.draft),
    publishedChanged: bool(data.publishedChanged),
  };
}

export type StudioWork = {
  id: string;
  title: string;
  language: string;
  published: boolean;
  isGalleryEligible: boolean;
  moderationState: string;
  chapterCount: number;
  publishedChapterCount: number;
  nextChapterOrder: number;
  originType: string;
};

export type StudioSettings = {
  workGoalWords: number;
  dailyGoalWords: number;
  sessionGoalWords: number;
  streakEnabled: boolean;
  timezone: string;
  onboardingDismissed: boolean;
  lastDraftId: string;
  revision: number;
};

export function parseSettings(data: unknown): StudioSettings {
  const d = isRecord(data) ? data : {};
  return {
    workGoalWords: int(d.workGoalWords),
    dailyGoalWords: int(d.dailyGoalWords),
    sessionGoalWords: int(d.sessionGoalWords),
    streakEnabled: d.streakEnabled === undefined ? true : bool(d.streakEnabled),
    timezone: str(d.timezone),
    onboardingDismissed: bool(d.onboardingDismissed),
    lastDraftId: str(d.lastDraftId),
    revision: int(d.revision),
  };
}

export type StudioOverview = {
  work: StudioWork;
  limits: StudioLimits;
  manuscript: ManuscriptEntry[];
  settings: StudioSettings;
};

export function parseOverview(data: unknown): StudioOverview | null {
  if (!isRecord(data) || !isRecord(data.work) || !str(data.work.id)) return null;
  const w = data.work;
  return {
    work: {
      id: str(w.id),
      title: str(w.title),
      language: str(w.language),
      published: bool(w.published),
      isGalleryEligible: bool(w.isGalleryEligible),
      moderationState: str(w.moderationState) || 'active',
      chapterCount: int(w.chapterCount),
      publishedChapterCount: int(w.publishedChapterCount),
      nextChapterOrder: Math.max(1, int(w.nextChapterOrder)),
      originType: str(w.originType),
    },
    limits: parseLimits(data.limits),
    manuscript: list(data.manuscript)
      .map(parseEntry)
      .filter((e): e is ManuscriptEntry => e !== null),
    settings: parseSettings(data.settings),
  };
}

export type PublishResult = {
  draft: DraftSummary;
  chapterId: string;
  orderIndex: number;
  chapterRevision: number;
  kind: 'first_publish' | 'update';
  replayed: boolean;
  workBecameVisible: boolean;
};

export function parsePublishResult(data: unknown): PublishResult | null {
  if (!isRecord(data) || !isRecord(data.chapter)) return null;
  const draft = parseDraftSummary(data.draft);
  if (!draft) return null;
  return {
    draft,
    chapterId: str(data.chapter.id),
    orderIndex: int(data.chapter.orderIndex),
    chapterRevision: int(data.chapter.revision),
    kind: data.kind === 'update' ? 'update' : 'first_publish',
    replayed: bool(data.replayed),
    workBecameVisible: bool(data.workBecameVisible),
  };
}

export type SnapshotKind = 'manual' | 'auto' | 'publish' | 'backup';
export type SnapshotSummary = {
  id: string;
  kind: SnapshotKind;
  label: string;
  reason: string;
  title: string;
  wordCount: number;
  charCount: number;
  draftRevision: number;
  createdAt: string;
};
export type Snapshot = SnapshotSummary & { body: string };

export function parseSnapshotSummary(data: unknown): SnapshotSummary | null {
  if (!isRecord(data) || !str(data.id)) return null;
  const kind = (['manual', 'auto', 'publish', 'backup'] as const).find((k) => k === data.kind) ?? 'manual';
  return {
    id: str(data.id),
    kind,
    label: str(data.label),
    reason: str(data.reason),
    title: str(data.title),
    wordCount: int(data.wordCount),
    charCount: int(data.charCount),
    draftRevision: int(data.draftRevision),
    createdAt: str(data.createdAt),
  };
}

export function parseSnapshot(data: unknown): Snapshot | null {
  const s = parseSnapshotSummary(data);
  return s && isRecord(data) ? { ...s, body: str(data.body) } : null;
}

export type StudioDay = {
  date: string;
  wordsAdded: number;
  wordsRemoved: number;
  charsAdded: number;
  charsRemoved: number;
  importedWords: number;
  saves: number;
  sessions: number;
};

export type StudioProgress = {
  days: StudioDay[];
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  wordsAdded: number;
  wordsRemoved: number;
  importedWords: number;
  sessions: number;
  activeDayMinChars: number;
};

export function parseProgress(data: unknown): StudioProgress {
  const d = isRecord(data) ? data : {};
  return {
    days: list(d.days)
      .filter(isRecord)
      .map((day) => ({
        date: str(day.date),
        wordsAdded: int(day.wordsAdded),
        wordsRemoved: int(day.wordsRemoved),
        charsAdded: int(day.charsAdded),
        charsRemoved: int(day.charsRemoved),
        importedWords: int(day.importedWords),
        saves: int(day.saves),
        sessions: int(day.sessions),
      }))
      .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date)),
    currentStreak: int(d.currentStreak),
    longestStreak: int(d.longestStreak),
    activeDays: int(d.activeDays),
    wordsAdded: int(d.wordsAdded),
    wordsRemoved: int(d.wordsRemoved),
    importedWords: int(d.importedWords),
    sessions: int(d.sessions),
    activeDayMinChars: int(d.activeDayMinChars) || 20,
  };
}

export type SearchHit = { kind: string; id: string; title: string; field: string; snippet: string };

export function parseSearch(data: unknown): { hits: SearchHit[]; truncated: boolean } {
  const d = isRecord(data) ? data : {};
  return {
    hits: list(d.hits)
      .filter(isRecord)
      .map((h) => ({ kind: str(h.kind), id: str(h.id), title: str(h.title), field: str(h.field), snippet: str(h.snippet) }))
      .filter((h) => h.id),
    truncated: bool(d.truncated),
  };
}

export type TrashItem = { kind: string; id: string; title: string; deletedAt: string; purgeAt: string };

export function parseTrash(data: unknown): TrashItem[] {
  const d = isRecord(data) ? data : {};
  return list(d.items)
    .filter(isRecord)
    .map((t) => ({ kind: str(t.kind), id: str(t.id), title: str(t.title), deletedAt: str(t.deletedAt), purgeAt: str(t.purgeAt) }))
    .filter((t) => t.id);
}

// ---- Entities ----

export type CustomField = { key: string; value: string };

export type CharacterFields = {
  name: string;
  aliases: string;
  role: '' | 'protagonist' | 'antagonist' | 'secondary' | 'other';
  summary: string;
  tags: string[];
  age: string;
  pronouns: string;
  appearance: string;
  personality: string;
  strengths: string;
  flaws: string;
  fear: string;
  desire: string;
  externalGoal: string;
  internalNeed: string;
  conflict: string;
  secret: string;
  motivation: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  notes: string;
  narrativeState: '' | 'active' | 'absent' | 'deceased' | 'unknown';
  customFields: CustomField[];
};

export type PlaceFields = {
  name: string;
  placeType: string;
  importance: '' | 'major' | 'minor';
  description: string;
  history: string;
  atmosphere: string;
  rules: string;
  tags: string[];
};

export type NoteFields = {
  kind: 'lore' | 'quick';
  title: string;
  category: '' | 'rule' | 'faction' | 'object' | 'magic' | 'culture' | 'research' | 'other';
  body: string;
  tags: string[];
  pinned: boolean;
  chapterDraftId: string;
  linkedNoteIds: string[];
  sceneIds: string[];
};

export type SceneStatus = 'idea' | 'planned' | 'draft' | 'revising' | 'done';
export const SCENE_STATUSES: readonly SceneStatus[] = ['idea', 'planned', 'draft', 'revising', 'done'];

export type SceneFields = {
  title: string;
  synopsis: string;
  purpose: string;
  conflict: string;
  outcome: string;
  status: SceneStatus;
  povCharacterId: string;
  characterIds: string[];
  placeId: string;
  subplot: string;
  tags: string[];
  chapterDraftId: string;
  notes: string;
};

export type RelationType = 'family' | 'friendship' | 'romance' | 'rivalry' | 'mentorship' | 'alliance' | 'antagonism' | 'other';
export const RELATION_TYPES: readonly RelationType[] = [
  'family',
  'friendship',
  'romance',
  'rivalry',
  'mentorship',
  'alliance',
  'antagonism',
  'other',
];

export type RelationFields = {
  fromCharacterId: string;
  toCharacterId: string;
  type: RelationType;
  label: string;
  notes: string;
  directed: boolean;
  status: 'active' | 'past' | 'unknown';
};

export type EntityKindFields = {
  characters: CharacterFields;
  places: PlaceFields;
  notes: NoteFields;
  scenes: SceneFields;
  relations: RelationFields;
};
export type EntityKind = keyof EntityKindFields;
export const ENTITY_KINDS: readonly EntityKind[] = ['characters', 'places', 'notes', 'scenes', 'relations'];

export type Entity<K extends EntityKind> = {
  id: string;
  fields: EntityKindFields[K];
  order: number;
  revision: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

const enumOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Field parsers: every field present, typed, defaulted. */
export const FIELD_PARSERS: { [K in EntityKind]: (data: Record<string, unknown>) => EntityKindFields[K] } = {
  characters: (f) => ({
    name: str(f.name),
    aliases: str(f.aliases),
    role: enumOf(f.role, ['', 'protagonist', 'antagonist', 'secondary', 'other'] as const, ''),
    summary: str(f.summary),
    tags: strList(f.tags),
    age: str(f.age),
    pronouns: str(f.pronouns),
    appearance: str(f.appearance),
    personality: str(f.personality),
    strengths: str(f.strengths),
    flaws: str(f.flaws),
    fear: str(f.fear),
    desire: str(f.desire),
    externalGoal: str(f.externalGoal),
    internalNeed: str(f.internalNeed),
    conflict: str(f.conflict),
    secret: str(f.secret),
    motivation: str(f.motivation),
    arcStart: str(f.arcStart),
    arcEnd: str(f.arcEnd),
    voice: str(f.voice),
    notes: str(f.notes),
    narrativeState: enumOf(f.narrativeState, ['', 'active', 'absent', 'deceased', 'unknown'] as const, ''),
    customFields: list(f.customFields)
      .filter(isRecord)
      .map((c) => ({ key: str(c.key), value: str(c.value) })),
  }),
  places: (f) => ({
    name: str(f.name),
    placeType: str(f.placeType),
    importance: enumOf(f.importance, ['', 'major', 'minor'] as const, ''),
    description: str(f.description),
    history: str(f.history),
    atmosphere: str(f.atmosphere),
    rules: str(f.rules),
    tags: strList(f.tags),
  }),
  notes: (f) => ({
    kind: enumOf(f.kind, ['lore', 'quick'] as const, 'lore'),
    title: str(f.title),
    category: enumOf(f.category, ['', 'rule', 'faction', 'object', 'magic', 'culture', 'research', 'other'] as const, ''),
    body: str(f.body),
    tags: strList(f.tags),
    pinned: bool(f.pinned),
    chapterDraftId: str(f.chapterDraftId),
    linkedNoteIds: strList(f.linkedNoteIds),
    sceneIds: strList(f.sceneIds),
  }),
  scenes: (f) => ({
    title: str(f.title),
    synopsis: str(f.synopsis),
    purpose: str(f.purpose),
    conflict: str(f.conflict),
    outcome: str(f.outcome),
    status: enumOf(f.status, SCENE_STATUSES, 'idea'),
    povCharacterId: str(f.povCharacterId),
    characterIds: strList(f.characterIds),
    placeId: str(f.placeId),
    subplot: str(f.subplot),
    tags: strList(f.tags),
    chapterDraftId: str(f.chapterDraftId),
    notes: str(f.notes),
  }),
  relations: (f) => ({
    fromCharacterId: str(f.fromCharacterId),
    toCharacterId: str(f.toCharacterId),
    type: enumOf(f.type, RELATION_TYPES, 'other'),
    label: str(f.label),
    notes: str(f.notes),
    directed: bool(f.directed),
    status: enumOf(f.status, ['active', 'past', 'unknown'] as const, 'active'),
  }),
};

/** Empty fields for a new entity of each kind. */
export function emptyFields<K extends EntityKind>(kind: K): EntityKindFields[K] {
  return FIELD_PARSERS[kind]({}) as EntityKindFields[K];
}

export function parseEntity<K extends EntityKind>(kind: K, data: unknown): Entity<K> | null {
  if (!isRecord(data) || !str(data.id)) return null;
  return {
    id: str(data.id),
    fields: FIELD_PARSERS[kind](isRecord(data.fields) ? data.fields : {}) as EntityKindFields[K],
    order: float(data.order),
    revision: int(data.revision),
    deleted: bool(data.deleted),
    createdAt: str(data.createdAt),
    updatedAt: str(data.updatedAt),
  };
}

/** A 409's machine code, when the backend sent one. */
export function conflictCode(data: unknown): string {
  return isRecord(data) ? str(data.code) : '';
}
