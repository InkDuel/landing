# InkDuel Studio — Handoff

- **Last agent:** Claude (Opus 5.5), 2026-10-24.
- **Overall state:** T0 done; backend implementation starting (T1).
- **Branches:** web `web/inkduel-studio` (from `origin/main` 7578bb1) · backend
  `feat/inkduel-studio` (from `origin/main` 8429b62). Nothing pushed yet.
- **Completed:** continuity docs, PRD versioned, architecture (DECISIONS.md),
  HTTP contract draft (`inkduel-backend/docs/INKDUEL_STUDIO_API.md`).
- **In progress:** T1–T3 (backend models, drafts, publish).
- **Uncommitted changes:** none expected outside the task in progress — run
  `git status` in both worktrees first.
- **Baseline (before Studio):** web typecheck OK, vitest 121/121, lint 0 errors
  / 18 warnings; backend `go test ./...` green; Works emulator tests green.
- **Known risks:** see DECISIONS D2 (old Flutter can edit the WorkChapter
  directly), D3 (no >5k publication).
- **Next concrete task:** T1 — `internal/models/studio*.go`, `internal/config/
  studio_config.go`, `internal/middleware/studio_gate.go`, i18n keys.
- **Done when:** `go build ./... && go test ./internal/models/...` green with
  word-count fixture tests.
