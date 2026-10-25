# InkDuel Studio — Release notes, QA and rollout

Nothing here is deployed or enabled. Flags stay off until the founder decides.

## Deploy order
1. **Firestore indexes** (backend `firestore.indexes.json`): only `fieldOverrides`
   were added (exempt Studio long text from indexing). No composite index is
   required; deploying first just avoids indexing long text while the flag is off.
2. **Backend** (`feat/inkduel-studio`): additive routes under
   `/api/works/:workId/studio/*`, behind `CONTINUE_STORIES_ENABLED` and the new
   `StudioGate`. Default env = Studio off for everyone. CORS now exposes
   `Content-Disposition`.
3. **Web** (`web/inkduel-studio`): with Studio off the owner page renders the
   existing Works UI plus an «Exportar tu obra» panel; `/chapter/[id]` keeps the
   legacy editor.
4. **Rollout** (env on Railway, no redeploy of code):
   `STUDIO_ENABLED=true` + `STUDIO_ALLOWLIST=<founder uids>` → internal QA →
   `STUDIO_ROLLOUT_PERCENT=5` → `25` → `100`, watching 409/429/5xx and
   Firestore writes per active author.

## Rollback / kill switch
- `STUDIO_ENABLED=false` (or unset): every Studio route answers 503 except
  export; the web falls back to the legacy Works page automatically. Drafts,
  fichas and history stay stored untouched; authors can still export.
- Code rollback of the web alone is safe (Studio data is only reachable via the
  new routes). Code rollback of the backend makes Studio data unreachable but
  not lost (Firestore subcollections remain).

## Flags and limits
| Env | Default | Meaning |
|---|---|---|
| `STUDIO_ENABLED` | off | Master switch (fail-closed) |
| `STUDIO_ALLOWLIST` | empty | Comma-separated uids always in |
| `STUDIO_ROLLOUT_PERCENT` | 0 | Stable per-uid bucket (raising only adds users) |

Limits: draft 40,000 runes · publish 5,000 (unchanged) · 100 chapters
(unchanged) · drafts 200/work · characters 300 · places 300 · notes 500 ·
scenes 500 · relations 1,000 · snapshots per draft: auto 30 (90 days), backup
30, publish 50, manual 50 · trash 30 days.

## Costs (Firestore)
- Autosave: ≤ 1 save / 20 s per open editor → per save 3 reads + 2–3 writes
  (draft, day rollup, Work.updatedAt at most every 10 min), + 1 snapshot write
  every 15 min of editing.
- Open Studio: chapters + drafts (no bodies) + settings ≈ N+M+1 reads.
- Search (`POST`, query in the body) reads every Studio document of the Work (rate-limited 240/h/user).
- Rate limits per user/hour: read 1,200 · draft write 720 · write 600 ·
  publish 60 · search 240 · export 30.

## Compatibility (installed apps)
| Case | Behaviour |
|---|---|
| Old app reads a chapter published from Studio | Same `content` string, ≤ 5,000 runes, same id/order |
| Old app edits a chapter that has a Studio draft | Allowed (legacy PATCH). Studio shows «El capítulo cambió fuera del Studio»; publishing from Studio answers 409 and asks to compare/replace — never last-write-wins |
| Old app publishes an unpublished chapter | Publishes the chapter's own text (not the private draft) — documented, safe |
| New fields | None in existing DTOs; Studio data lives only in new subcollections |
| Long chapters (> 5,000) | Not publishable (old app could read but not save them); Studio offers «Dividir en el cursor» |
| Old app creates/publishes a chapter with Studio on | Unchanged legacy flow; Studio lists it as a published chapter without a draft until opened |
| Flutter reading Firestore directly | Only `duels` (duel repository/result page); Works always go through the backend, so `studio_*` subcollections are invisible to it |

Replayed live on 2026-10-24 (emulators, Studio on) with the exact legacy
requests: Studio-published chapter read through `GET /works/:id/chapters[/:id]`
(same title/content/revision); legacy PATCH with the current revision → 200,
stale → 409 `currentRevision`, 5,001 runes → 400; Studio then shows «cambió
fuera del Studio» and its publish with the stale published revision answers
409 `published_conflict` (nothing overwritten). Backend diff vs `main`: no
existing service, controller or model changed; `routes.go` only adds the
Studio block; `go.mod` only promotes `golang.org/x/text` from indirect to
direct (same version); index exemptions only on `studio_*` groups.

## Manual QA checklist (desktop 1280+, tablet 768, phone 375)
Verified on 2026-10-24 against local emulators (marked ✓); repeat on staging.
- ✓ Open a Work → editor with cursor in the text (≤ 2 interactions); empty Work shows «Tu historia comienza aquí».
- ✓ Type, autosave («Guardando cambios…» → «Sincronizado»), Cmd/Ctrl+S, reload keeps text (emoji, accents, new lines).
- ✓ Publish a new chapter (checklist + reader-style preview), publish the Work.
- ✓ Edit a published chapter → reader still sees the old text → «Publicar esta versión».
- ✓ Edit the chapter from the old app/API → banner in Studio → publish → 409 → compare → «Reemplazar con mi versión».
- ✓ Versions: save named version, restore (creates «Antes de restaurar»).
- ✓ Quick note from the editor; character create; relations list + graph.
- ✓ Two tabs: second is read-only → «Editar aquí» → first becomes read-only.
- ✓ `/me/works/:id/chapter/:id` and `/chapter/new` hand over to Studio (one draft created).
- ✓ Kill switch: legacy page + export; API overview 503, export 200.
- ✓ Conflict from another device: banner → «Usar la versión del servidor» asks first → «Guardar mi versión como copia» keeps the local text as a new chapter.
- ✓ Plan: «Tres actos» template adds 8 cards; move to «Planificada» from the keyboard menu. Progress: totals, streak, calendar and how-it-counts with real data.
- ✓ 375 px: no horizontal scroll; toolbar in two rows.
- ✓ Backend down while typing → «Guardado en este dispositivo · Pendiente de sincronizar» → reload → recovery banner → «Recuperar» → synced.
- ✓ Import from the UI: `.md` split by `#` (fenced `#` ignored) → 2 chapters; network cut on the 2nd → «No se pudo importar.», sheet stays open → retry reuses the same ids (no duplicates). `.txt` «Reemplazar el capítulo abierto» → `backup` version of the previous text first. CRLF/CR → LF, BOM dropped, accents, «», ‘’ and emoji byte-exact on the server. Rejected: invalid UTF-8, > 1 MB, `.docx`. Imports count as `importedWords`, never as written words or streak.
- ✓ Export from the UI (txt, md, docx, json): names `InkDuel-<obra>-YYYYMMDD.*`, right MIME types; `.docx` is a valid package (6 well-formed parts, Title/Heading1) that macOS opens; JSON backup has no uid, email, `authorId` or token.
- ✓ Network cut while typing, no reload: first save fails, copy stays on the device, automatic retry syncs once the network is back and deletes the copy; words counted = words typed.
- ☐ Account switch on one device (sign out, sign in as another account, open the same Work URL): covered by regression tests; repeat once by hand on staging.
- ☐ Screen reader pass (VoiceOver) on editor, publish review and graph; 200% zoom.
- ☐ Plan board drag-and-drop + keyboard moves; Progress calendar keyboard navigation.

## Pre-merge review (2026-10-24)
- **Fixed — overview cache across accounts (P1).** The 5 s overview cache was
  keyed by work only. Now keyed by uid + work, StudioRoot remounts per account,
  and every Firebase auth change clears it. Tests: `studio-root.test.tsx`
  (immediate logout → login as another account; late response of the previous
  account never shown).
- **Fixed — emergency copy surviving a sign-out made in another tab.** Same-tab
  ordering is safe (IndexedDB runs read-write transactions in creation order,
  and sign-out lives on `/me`, where no editor is mounted). Across tabs, a tab
  with the editor open still saw the account for a moment after another tab's
  sign-out and could write its copy after the clear. Every tab now clears again
  when it sees the signed-in account leave or change (never on a page that
  opens signed out). Tests: `auth-context.test.tsx`.
- **Verified, no change — put vs remove after a sync.** A pending debounced copy
  is cancelled by the «saved» state; a copy already being written is ordered
  before the removal, so the removal wins.
- **Noted, not fixed (minor):** the empty state of a new Work has no «Importar»
  (create a chapter first); a `.docx` import says «no es texto UTF-8 válido»
  instead of pointing to .txt/.md; export file dates are UTC (a 23:00 export in
  America shows the next day); an empty untitled draft exports as «Sin título»
  with no body.
- **Fixed — stale `/api/me` answers (follow-up review).** Every
  `onAuthStateChanged` callback now takes a generation number; an `/api/me`
  answer for an older auth change is dropped. Before, an older answer could
  set the previous account over the newer one, sign an account back in after
  sign-out, or (a stale 404) sign out the newer session. Tests in
  `auth-context.test.tsx` reproduce the three cases (they failed before the
  fix) and pin the normal login, logout, no-account and error flows.

## Known gaps (documented, no fake UI)
Rich text, EPUB/PDF, public chapter reorder, publication > 5,000, multi-layer
timeline, granular visual diff, global search & replace, beta readers, offline
mode, AI. JSON backup is not importable yet. A general work synopsis field does
not exist (not invented).
