# InkDuel Studio — Handoff

- **Last agent:** Claude (Opus 5.5), 2026-10-24.
- **Overall state:** P0 implemented end to end (backend + web), reviewed
  independently, QA'd in a real browser against local emulators. PRs open for
  review; nothing merged, deployed or enabled.
- **Branches:** web `web/inkduel-studio` · backend `feat/inkduel-studio`.
  Check `git log` in both; PR links are in the PR list of each repo.
- **Contracts:** `inkduel-backend/docs/INKDUEL_STUDIO_API.md`; decisions D1–D11;
  rollout/QA/compatibility in `RELEASE.md`.
- **Tests:** backend `go test ./...` and emulator suites green except the
  pre-existing `internal/controllers TestEmulatorGalleryReadingQueueRemembersWhatWasRead`
  (fails on origin/main too). Web: typecheck OK, lint 0 errors (29 warnings,
  18 pre-existing), vitest 232/232, `next build` OK.
- **Pre-merge review (2026-10-24):** done; findings, fixes and what remains
  manual are in `RELEASE.md` → «Pre-merge review».
- **Local QA recipe:** Firestore emulator (backend `firebase.json`, 8080) + Auth
  emulator (9099, `--only auth`, separate config) + backend binary with
  `ENV=development PORT=8090 FIRESTORE_EMULATOR_HOST FIREBASE_AUTH_EMULATOR_HOST
  FIREBASE_PROJECT_ID=demo-inkduel-studio FIREBASE_CREDENTIALS_JSON=<dummy SA>
  CONTINUE_STORIES_ENABLED=true STUDIO_ENABLED=true STUDIO_ROLLOUT_PERCENT=100
  ALLOWED_ORIGINS=http://localhost:3000` and web `.env.development.local` with
  `NEXT_PUBLIC_API_BASE_URL=http://localhost:8090`, fake `NEXT_PUBLIC_FIREBASE_*`
  values and `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` (dev-only
  hook). Create accounts through the Auth emulator REST API, then
  `POST /auth/login` to create the InkDuel user.
- **Open items (not blocking review):** account switch by hand on staging;
  manual pass with a screen reader and at
  200 % zoom; real-browser drag-and-drop on touch devices; staging QA with old
  app builds; index exemptions only verifiable on real Firestore; unify the
  scene sheet with the Universe sheet (small duplication, see plan-scene-sheet).
- **Next concrete task:** founder review of both PRs → deploy indexes + backend
  with flags off → allowlist QA (RELEASE.md).
