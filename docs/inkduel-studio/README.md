# InkDuel Studio — shared docs

Read in this order when (re)starting work: `HANDOFF.md` → `TASKS.md` →
`DECISIONS.md` → the relevant sections of `PRD.md`. `IMPLEMENTATION_BRIEF.md` is
the founder's execution brief. Then verify real Git state in both repos before
trusting HANDOFF.

## Repositories
- Web (this repo): `InkDuel/landing`, branch `web/inkduel-studio`.
- Backend: `InkDuel/inkduel-backend`, branch `feat/inkduel-studio`.
  - Founder machine: `/Users/facu/Desktop/Inkduel/inkduel-backend` (main checkout)
    and worktree `/Users/facu/Desktop/Inkduel/.worktrees/studio-backend`.
  - Web worktree: `/Users/facu/Desktop/Inkduel/.worktrees/studio-web`.
  - HTTP contract: `inkduel-backend/docs/INKDUEL_STUDIO_API.md`.
- Flutter (`InkDuel/inkduel_mobile`): read-only for compatibility; not changed.

## Local verification
- Backend: `go test ./...`; emulator suites need
  `firebase emulators:start --only firestore --project demo-inkduel-studio`
  then `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 go test ./internal/... -run Studio`.
- Web: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Never merge, deploy, flip flags or touch production data without the founder.
