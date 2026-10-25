# InkDuel Studio — Decisions and contracts

Durable record of architecture decisions. Append; never rewrite an entry
silently — add `Update YYYY-MM-DD` under it. Product source of truth: `PRD.md`.

## D1 · Integration surface (2026-10-24)
- Studio lives inside `/me/works/[workId]` (owner view). Areas via `?area=`:
  `write` (default) · `plan` · `universe` · `progress` · `publish`. Open document
  via `&doc=<draftId>`. No new app, host or `WorkV2`.
- `/me/works/[workId]/chapter/[chapterId]` keeps working: when Studio is
  available for the user it redirects (replace) to `?area=write&doc=<id>`
  (`new` → creates a draft); otherwise the legacy editor renders unchanged.
- Public `/work/[id]`, `/stories`, Flutter UI: untouched.

## D2 · Draft ≠ published (core invariant)
- Every Studio edit writes a **private editorial draft**
  `works/{workId}/studio_drafts/{draftId}`. `work_chapters/{id}` changes only in
  the explicit publish (promote) transaction.
- **draftId == chapterId** once linked. A draft for an existing chapter is
  created with `draftId = chapterId` and seeded server-side from the chapter
  (client body ignored). A Studio-born draft gets a client UUIDv4; on first
  publish the WorkChapter is created with that same id.
- Unlinked drafts do not consume `MaxChaptersPerWork` (100). On first publish a
  new chapter takes `orderIndex = work.nextChapterOrder` (append; the dialog
  says which number). No public reorder in P0.
- Linked drafts cannot be trashed; "Descartar cambios" = snapshot current, then
  replace body with the published text.
- Cross-client case (documented, safe): an old Flutter build can still edit or
  publish the WorkChapter directly. The draft then shows "la versión publicada
  cambió"; Studio publish requires `expectedPublishedRevision` and answers 409
  with the current published text — never last-write-wins.

## D3 · Limits
- Draft body ≤ 40,000 runes; title ≤ 120; synopsis ≤ 1,000.
- **Publication stays ≤ 5,000 runes** (`MaxChapterContent`). Flutter has no client
  limit and relies on the backend 400, so an old build could read but not edit a
  longer chapter → long publication is NOT enabled in P0. Studio blocks with an
  actionable message + "Mover el texto desde el cursor a un capítulo nuevo".
- Caps per work (soft, aggregation count): drafts 200, characters 300, places
  300, notes 500, scenes 500, relations 1000. Snapshots per draft: auto 30
  (≤ 90 days), backup 30, publish 50, manual 50 (409 when full).

## D4 · Concurrency
- Content OCC: `revision` (title+body) with `expectedRevision`; metadata OCC:
  `metaRevision` (synopsis+status) so a status change never 409s the editor.
- Publish: `expectedDraftRevision` + `expectedPublishedRevision` (null when the
  draft is unlinked) + `publishRequestId` (UUIDv4) idempotency key stored on
  the draft. Replay → same result, no writes, no notifications.
- Entities: `revision` with full-replace PATCH + `expectedRevision`; create is
  idempotent by client UUIDv4 id + payload fingerprint.
- Web: one autosave engine (`chapter-autosave.ts`, generalized with limits) — no
  second engine. Web Locks per draft (`inkduel-studio:{uid}:{draftId}`): a second
  tab is read-only with "Editar aquí" (steal). Cross-device: OCC + 409 UI with
  "Usar versión del servidor" / "Guardar mi versión como copia" / "Comparar"
  (keep-mine only after compare + confirm).

## D5 · Local emergency recovery
- IndexedDB `inkduel-studio-recovery`, key `{uid}:{workId}:{draftId}`, written
  only while dirty, deleted when the server confirms the same text, TTL 7 days,
  purged on sign-out. Toggle in editor settings (default on) with the shared-
  device warning. Status "Guardado en este dispositivo · Pendiente de
  sincronizar" only after a successful local write. Never claims offline mode.

## D6 · Stats (no keystrokes, no text)
- Draft PATCH computes word/char deltas server-side and upserts
  `works/{w}/studio_days/{YYYY-MM-DD}` (date in the client's IANA `timezone`,
  validated; UTC fallback) in the same transaction. Only `source=edit` counts;
  `import`/`restore`/`split`/`seed` never count as written words.
- Session = saves < 30 min apart. Active day = ≥ 20 net chars added that day.
  Streak = consecutive active local dates ending today or yesterday (`today`
  param from client). Opt-out via `streakEnabled`.
- Word count = shared algorithm (Go `models.CountWords` ≡ TS `countWords`):
  runs of letters/marks/digits joined by inner `'’-`; each Han/Hiragana/
  Katakana/Hangul-syllable rune counts as one word (CJK approximation,
  documented). Fixture `studio-word-fixtures.json` in both repos.

## D7 · Storage layout (Firestore, all subcollections of `works/{workId}`)
`studio_meta/settings` · `studio_drafts/{id}` (+ `studio_snapshots/{id}`) ·
`studio_characters` · `studio_places` · `studio_notes` · `studio_scenes` ·
`studio_relations` · `studio_days/{date}`.
- Subcollections: no collection-group queries; gallery/public reads never touch
  them. Listing = equality on `deleted` + doc-id order (no composite index).
- `fieldOverrides` exempt `body` (drafts/snapshots) from indexing.
- Every doc carries `workId` + `authorId` (server-set). Ownership is checked on
  the parent Work in every handler (non-owner → 404, never 403).

## D8 · Flags and rollout
- `STUDIO_ENABLED` (default off, fail-closed), `STUDIO_ALLOWLIST` (comma uids),
  `STUDIO_ROLLOUT_PERCENT` (0–100, default 0 → allowlist only). Gate on every
  Studio route **except export** (portability survives the kill switch).
- Web discovers availability from `GET /studio` (503 `studio.unavailable` →
  legacy Works UI + an "Exportar" action).

## D9 · Export / import
- Server export: `txt`, `md`, `docx` (stdlib OOXML writer, no dependency,
  round-trip tested), `json` backup (`schemaVersion`, drafts, chapters,
  entities, settings; no snapshots, no tokens, no other users' data).
- Import is client-side parsing (`.txt`/`.md`, UTF-8 fatal decode, ≤ 256 KB,
  Markdown kept as literal text; optional split by `#` headings with preview)
  then normal draft create/PATCH with `source=import`; replacing a draft first
  creates a backup snapshot server-side.

## D10 · Out of P0 (documented gaps, no fake UI)
Rich text, EPUB/PDF, public reorder, long (>5k) publication, multi-layer
timeline, visual diff beyond simple line compare, global replace, beta readers,
offline mode, AI of any kind.

## D11 · Review hardening (2026-10-24)
- Search is `POST /studio/search {q}`: the query is the author's text and must
  never sit in a URL (access logs).
- «Usar la versión del servidor» requires a confirmation; «Conservar mi versión»
  aborts unless the server's text was first kept as a version.
- A 409 whose server text equals the text being saved is a lost ACK, not a
  conflict: the engine adopts that revision.
- Taking over a draft from another tab first saves this tab's unsynced text as
  a copy; the owner reports whether it managed to sync.
- An emergency copy waiting for the author's decision is never overwritten;
  expired copies are swept on open; nothing is written after sign-out.
- Synopsis edits count as unsaved work for navigation and publish.

## D12 · Page colour while writing (2026-10-25)
- Founder decision: Studio offers «Fondo» in the «Aa» control — Claro
  (default), Sepia, Noche. Long sessions at night were the reason; a free
  colour picker was rejected (contrast can't be guaranteed).
- It is the one exception to the light-only web (2026-10-04): Studio sets
  `data-theme` (`dark` for Noche, `sepia`) on the page only while it is open
  and removes it on the way out. «Noche» darkens the whole page, not just the
  sheet, so nothing bright frames the text.
- Choice per account and browser (`inkduel-studio-paper:<uid>`), shared by
  the control and the shell, in step across tabs. Not synced to the server.
- Text contrast is AA in both themes (night tertiary raised to `#8f95b5`).
  «Automático» (follow the system) is left for later, after seeing use.
