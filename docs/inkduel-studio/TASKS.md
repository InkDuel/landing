# InkDuel Studio — Tasks

States: `pending` · `in_progress` · `done` (verified) · `blocked`.
PRD codes in brackets. Update after every verifiable block.

| # | Module | Repo | Depends | State |
|---|---|---|---|---|
| T0 | Continuity docs, branches, PRD versioned | both | — | done |
| T1 | Models, limits, word count, flags, gate, i18n keys | backend | T0 | pending |
| T2 | Drafts: create/seed, get, PATCH content (OCC+stats+auto snapshot), meta, trash, discard [F02 F04 F11] | backend | T1 | pending |
| T3 | Publish/promote transaction + idempotency [F05 F14] | backend | T2 | pending |
| T4 | Snapshots list/get/create/delete/restore + retention [F12] | backend | T2 | pending |
| T5 | Entities CRUD generic (characters, places, notes, scenes, relations), trash/purge, scene move [F06–F10] | backend | T1 | pending |
| T6 | Settings/goals, progress (days, streaks) [F11] | backend | T2 | pending |
| T7 | Search + export txt/md/docx/json [F13 F15] | backend | T2 T5 | pending |
| T8 | Controllers, routes, rate limits, index overrides | backend | T2–T7 | pending |
| T9 | Unit + emulator tests (authz, OCC, idempotency, leak, duel immutability) [F17] | backend | T8 | pending |
| W1 | API client, models, words, copy (es/en/pt), analytics | web | T8 | pending |
| W2 | Studio shell in WorkManageView + legacy fallback + chapter route redirect [F01 F16] | web | W1 | pending |
| W3 | Editor: autosave generalization, find, prefs, focus, shortcuts, locks, recovery, conflict UI [F03 F04] | web | W2 | pending |
| W4 | Versions panel (snapshots/restore) + context panel (quick notes, pinned) [F10 F12] | web | W3 | pending |
| W5 | Universe: characters, places, lore/notes, relations list + SVG graph, trash [F06–F08] | web | W2 | pending |
| W6 | Planner: scene cards list/board, move, templates [F09] | web | W2 | pending |
| W7 | Progress: goals, stats, calendar, streak [F11] | web | W2 | pending |
| W8 | Publish: checklist, preview, confirm, conflicts; work publish panel; import/export [F05 F13 F14] | web | W3 | pending |
| W9 | Web tests (autosave, words, import/export, api parsing, publish flow) + typecheck/lint/build | web | W3–W8 | pending |
| V1 | Integrated QA (local backend + emulator + web), review, PRs | both | all | pending |
