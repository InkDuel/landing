# InkDuel Studio — Handoff

- **Last agent:** Claude (Opus 5.5), 2026-10-24.
- **Overall state:** backend complete and tested; web shell, editor, versions,
  context panel, Universe, Publish and portability built and QA'd in a real
  browser against local emulators. Plan + Progress areas (W6/W7) in progress.
- **Branches:** web `web/inkduel-studio` · backend `feat/inkduel-studio`
  (backend commits `919f437`, `fe6860a`). Not pushed yet.
- **Uncommitted (web):** everything after `50acf95` — commit once W6/W7 land
  and `npm run typecheck && npm run lint && npm test && npm run build` pass.
- **Contracts:** `inkduel-backend/docs/INKDUEL_STUDIO_API.md`; decisions D1–D10.
- **Tests:** backend `go test ./...` green; emulator Studio suite green (84 new
  tests + smoke); web vitest green. Pre-existing failure NOT ours:
  `internal/controllers TestEmulatorGalleryReadingQueueRemembersWhatWasRead`
  (fails on origin/main too).
- **Local QA recipe:** Firestore emulator (backend `firebase.json`, port 8080) +
  Auth emulator (port 9099, `--only auth`, separate config) + backend binary
  with `ENV=development PORT=8090 FIRESTORE_EMULATOR_HOST FIREBASE_AUTH_EMULATOR_HOST
  FIREBASE_PROJECT_ID=demo-inkduel-studio FIREBASE_CREDENTIALS_JSON=<dummy SA>
  CONTINUE_STORIES_ENABLED=true STUDIO_ENABLED=true STUDIO_ROLLOUT_PERCENT=100
  ALLOWED_ORIGINS=http://localhost:3001` and web `.env.development.local` with
  `NEXT_PUBLIC_API_BASE_URL=http://localhost:8090` +
  `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` (dev-only hook).
  Sign in with an emulator account created via the Auth emulator REST API, then
  `POST /auth/login` to create the InkDuel user.
- **Verified in browser:** create chapter, autosave, Cmd+S, cursor-on-open,
  publish first chapter, publish Work, private revision invisible to a reader,
  old-app edit → 409 published_conflict → compare → explicit replace, versions
  (manual, restore with backup), quick notes, characters + relations graph,
  two tabs (read-only + «Editar aquí» handoff), 375 px layout.
- **Known risks / gaps:** see DECISIONS D2/D3/D10; long (>5k) publication not
  enabled; index exemptions only verifiable on real Firestore.
- **Next concrete task:** integrate W6/W7 from the subagent, run full web
  validation + build, commit, final review, push branches, open PRs.
