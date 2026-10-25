# Agent instructions — InkDuel web (`landing`)

Next.js 16 · React 19 · TypeScript · Tailwind 4 (Ink tokens in
`src/styles/ink.css`) · Vitest (`src/**/*.test.tsx`). Product copy in neutral
Spanish (tuteo, never voseo) with `en` and `pt` equivalents; every user-facing
string lives in a `*-copy.ts` record keyed by `Locale`. The Go backend is the
authority for data; the browser never talks to Firestore for app data.

## InkDuel Studio (in progress)
Shared docs: `docs/inkduel-studio/`. Before working on Studio read
`HANDOFF.md`, `TASKS.md`, `DECISIONS.md`, then the PRD sections you need, and
verify Git state (`git status`, `git log`) in this repo and in
`inkduel-backend` (branch `feat/inkduel-studio`). Update `TASKS.md` and
`HANDOFF.md` after each verifiable block; small coherent commits. Never merge,
deploy, enable flags or touch production.
