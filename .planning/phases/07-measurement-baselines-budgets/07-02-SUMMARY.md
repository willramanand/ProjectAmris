---
phase: 07-measurement-baselines-budgets
plan: 02
subsystem: tooling
tags: [lit, size-limit, vite, rollup, no-bundled-lit, dist-grep, snapshot, MEAS-04]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    plan: 00
    provides: Validated Lit inlined-version-marker set (LIT_INLINE_MARKERS) + assert:no-lit script stub
  - phase: 07-measurement-baselines-budgets
    plan: 01
    provides: size-limit re-scoped so @floating-ui/dom is counted (the first half of MEAS-04)
provides:
  - Report-only no-bundled-Lit dist grep guard (scripts/assert-no-bundled-lit.mjs)
  - Vite external-array snapshot unit test (test/no-bundled-lit.test.ts, jsdom verify lane)
  - Two independent, size-limit-independent guards proving Lit is never inlined (D-03)
affects: [11-enforce-budgets]

actuals:
  tokens: 3000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "isMain + report-only exit(0) build-time guard script (mirrors scripts/cem-diff.mjs; inverted to non-enforcing per D-08)"
    - "Config-freeze via text extraction + toEqual snapshot on the jsdom verify lane (no config execution, byte-stable source)"

key-files:
  created:
    - scripts/assert-no-bundled-lit.mjs
    - test/no-bundled-lit.test.ts
  modified: []

key-decisions:
  - "Confirmed marker set used as-is: reactiveElementVersions / litHtmlVersions / litElementVersions (Plan 00 A3 / LIT_INLINE_MARKERS) — no correction needed"
  - "Snapshot the vite external array by reading vite.config.ts as TEXT and freezing with toEqual, rather than importing/executing the config — avoids the config's filesystem side effects and the jsdom `import.meta.url` non-file-scheme limitation"
  - "Guard is report-only (exit 0) this phase; usage error exits 2; enforcing flip deferred to Phase 11 (D-08)"

metrics:
  duration: ~20min
  completed: 2026-08-22

requirements-completed: [MEAS-04]

status: complete
---

# Phase 7 Plan 02: No-Bundled-Lit Assertion Summary

**Closed the size-limit-independent half of MEAS-04 with two independent D-03 guards — a report-only dist-grep that scans every `dist/**/*.js` for the confirmed inlined-Lit version-marker globals (and asserts Lit is referenced only as a bare external specifier), plus a jsdom-lane unit test that freezes the `vite.config.ts` external array so a chunking refactor cannot silently stop externalizing Lit.**

## Performance
- **Duration:** ~20 min (incl. fresh-worktree `npm ci` + `npm run build`)
- **Completed:** 2026-08-22
- **Tasks:** 2
- **Files:** 2 created, 0 modified

## Accomplishments
- **Dist-grep guard (`scripts/assert-no-bundled-lit.mjs`):** zero-dependency Node script. Recursively collects every emitted `dist/**/*.js` (147 files on a clean build) and asserts none contains the confirmed Lit version-marker identifiers. Also collects every import/re-export specifier and asserts any Lit-looking one is a bare module specifier (`lit`, `lit/…`, `@lit/…`, `@lit-labs/…`), never a relative/bundled path. Verified on a clean build: 157 bare Lit imports observed, **zero** inlined markers, exit 0.
- **Grep hygiene (T-07-04):** strips sourcemap pragmas and block/license-banner comments before scanning, and matches markers with exact JS-identifier boundaries (`(?<![\w$])…(?![\w$])`), so an incidental comment mention cannot create a false positive or negative. Line comments are deliberately NOT stripped (minified dist files are often a single line — a naive `//`→EOL strip would nuke the whole file).
- **External-array snapshot (`test/no-bundled-lit.test.ts`):** runs on the jsdom verify lane (pure static config assertion). Reads `vite.config.ts` as text, extracts the `external:` array, and `toEqual`-freezes it. Reconstructs runtime matchers from the source tokens and asserts `lit`, every `lit`/`@lit`/`@lit-labs` subpath, and `@floating-ui/dom` stay externalized, while first-party specifiers (relative chunks, `@willramanand/amris`, `highlight.js`) do NOT — guarding against both a dropped Lit pattern and an over-broad one. 5 tests pass.

## Task Commits
1. **Task 1: report-only no-bundled-Lit dist grep guard** — `5779e0e` (feat)
2. **Task 2: snapshot the vite external array (jsdom verify lane)** — `7a91909` (test)

## Confirmed marker set
The guard consumes exactly the Plan 00 A3-validated set (`LIT_INLINE_MARKERS`), unchanged:
`reactiveElementVersions`, `litHtmlVersions`, `litElementVersions`. These appear verbatim only when a copy of Lit source is inlined; the current externalized build contains zero.

## Report-only status
Both guards are **report-only this phase (D-08)**: the dist grep exits 0 unconditionally (usage error exits 2), and the snapshot test is a config freeze, not a payload gate. The enforcing flip (exit non-zero on a detected inlined copy) is deferred to **Phase 11**.

## Verification
- `npm run build && node scripts/assert-no-bundled-lit.mjs` → 147 files scanned, 0 markers, exit 0.
- `node scripts/assert-no-bundled-lit.mjs dist extra` → exit 2 (usage error).
- Marker-detection sanity: pointing the guard at `node_modules/@lit/reactive-element` reports 4 marker hits (positive path works) while still exiting 0 report-only.
- `npx vitest run --project jsdom test/no-bundled-lit.test.ts` → 5 passed, exit 0.

## Deviations from Plan
None substantive. One implementation adjustment inside Task 2: resolved `vite.config.ts` via `resolve(process.cwd(), 'vite.config.ts')` instead of `import.meta.url`, because vitest's jsdom environment does not expose a `file:`-scheme `import.meta.url` (`TypeError: The URL must be of scheme file`). process.cwd() is the vitest root (repo root) where the config lives, so resolution is stable. No plan behavior changed.

## Known Stubs
None. Both guards are fully functional against real build output; only their CI enforcement disposition is deferred (report-only, by design per D-08).

## Prohibitions honored
- Did NOT rely on size-limit for the no-Lit check (independent dist grep + config snapshot).
- Did NOT modify the `vite.config.ts` external array — it stays byte-stable as the snapshot source.
- Did NOT flip the guard to enforcing (report-only exit 0 this phase).
- Did NOT edit `package.json` — the `assert:no-lit` script stub (Plan 00) already points at the new file.

## Self-Check: PASSED
- Files verified present: `scripts/assert-no-bundled-lit.mjs`, `test/no-bundled-lit.test.ts`
- Commits verified in git log: `5779e0e`, `7a91909`
- Both `<verify>` commands re-run green (guard exit 0 / 0 markers; 5 jsdom tests pass)

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
