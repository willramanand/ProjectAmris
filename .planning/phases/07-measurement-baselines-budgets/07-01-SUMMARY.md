---
phase: 07-measurement-baselines-budgets
plan: 01
subsystem: testing
tags: [size-limit, brotli, bundle-size, baseline, measurement, floating-ui, zero-dep-node]

# Dependency graph
requires:
  - phase: 01-test-coverage-ci-gates
    provides: ".size-limit.json size gate + tree-shaking canary (the config re-scoped here)"
  - phase: 02-api-cleanup-cem-baseline
    provides: "scripts/cem-diff.mjs committed-baseline diff shape (cloned by size-baseline.mjs)"
provides:
  - "scripts/size-baseline.mjs — zero-dependency, report-only per-entry brotli size baseline + diff (the spine every later diff clones)"
  - "api/size.baseline.json — committed first-generation brotli baseline (JS entries + tokens.css + composite + marginal-over-core)"
  - "Re-scoped .size-limit.json — brotli unit (no gzip), @floating-ui/dom counted in delivered payload, lit still ignored; adds first-load composite entry"
affects: [07-02 no-bundled-lit, 07-04 perf-diff, 11 enforcing-gates, 08 floating-ui-deferral]

# Actuals (#2632)
actuals:
  tokens: 2130
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Report-only committed-baseline diff (cem-diff shape, exit code INVERTED to 0 — D-08)"
    - "Cross-platform size-limit invocation via process.execPath + require.resolve('size-limit/package.json') → bin.js (avoids npx/.cmd on Windows)"
    - "Brotli-consistent metric set: size-limit JS entries + node:zlib brotli for the CSS asset + arithmetic marginal-over-core"

key-files:
  created:
    - scripts/size-baseline.mjs
    - api/size.baseline.json
  modified:
    - .size-limit.json

key-decisions:
  - "tokens.css measured via node:zlib brotliCompressSync in the script (NOT added as a .size-limit.json entry) — size-limit measures JS entries only (Task 2 action)"
  - "marginal-over-core = component-entry brotli MINUS core-bundle brotli (arithmetic, brotli-consistent per Open Question 2); values are negative here because deep-import entries share (do not bundle) core"
  - "package.json left untouched — the size:baseline npm script is Plan 00's to own; this plan only creates the script file"

patterns-established:
  - "Report-only size baseline spine: re-scoped config → size-baseline.mjs → committed api/size.baseline.json → deterministic sorted diff, exit 0 always (Phase 11 flips to enforcing)"
  - "Deep-import purity signal: negative marginal-over-core confirms per-component entries do not duplicate the shared core chunk (Pitfall 2 avoided)"

requirements-completed: [MEAS-01, MEAS-04]

coverage:
  - id: D1
    description: "Reproducible committed per-entry brotli size baseline via scripts/size-baseline.mjs (--write/--check, report-only exit 0, empty-baseline edge, deterministic sorted diff)"
    requirement: "MEAS-01"
    verification:
      - kind: integration
        ref: "node scripts/size-baseline.mjs --write && node scripts/size-baseline.mjs --check (exit 0, no drift on unchanged dist)"
        status: pass
    human_judgment: false
  - id: D2
    description: ".size-limit.json re-scoped to brotli (no gzip) with @floating-ui/dom counted on all delivered-payload entries and lit still ignored"
    requirement: "MEAS-04"
    verification:
      - kind: unit
        ref: "node -e assert no entry has gzip, no ignore contains @floating-ui/dom, every ignore contains lit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Expanded metric set — tokens.css standalone brotli, first-load composite (core+button+input+dialog), and marginal-over-core per component"
    requirement: "MEAS-01"
    verification:
      - kind: unit
        ref: "node -e assert api/size.baseline.json contains tokens.css + composite + marginal"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-08-22
status: complete
---

# Phase 7 Plan 01: Brotli Size Baseline Spine Summary

**Zero-dependency `size-baseline.mjs` + re-scoped brotli `.size-limit.json` + committed `api/size.baseline.json` — the report-only measurement spine (config → script → committed baseline → deterministic diff) that every later v1.1 diff clones.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-22T13:19Z (approx)
- **Completed:** 2026-08-22T13:31Z (approx)
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Re-scoped `.size-limit.json` to the honest on-the-wire unit: removed `gzip:true` from all 4 delivered-payload entries (size-limit v13 defaults to brotli) and stopped ignoring `@floating-ui/dom` so the shipped floating-ui payload is now counted — making the Phase-8 deferral win measurable. `lit` stays ignored (peer dep, never shipped).
- Created `scripts/size-baseline.mjs`: a zero-dependency Node clone of the `cem-diff.mjs` shape (load/normalize/diff/formatReport/isMain) but with the exit code INVERTED to report-only (`exit 0` even on drift, D-08). Modes `--write`/`--check` (default `--check`); usage error is the only non-zero exit (2). First-generation edge: writes the baseline and reports "new baseline" when `api/size.baseline.json` is absent.
- Extended the metric set (D-02/D-05): a first-load composite `.size-limit.json` entry (core+button+input+dialog, ignore lit), a standalone `tokens.css` brotli measurement via `node:zlib`, and a per-component marginal-over-core value so shared-chunk moves are not double-counted.
- Committed the first-generation `api/size.baseline.json`; `--check` re-runs are byte-identical (brotli integers are exact and deterministic).

## Measured Brotli Baseline (seeds Phase 11 enforcing limits)

| Entry | Brotli bytes |
|-------|-------------|
| core bundle | 21076 |
| full bundle | 59752 |
| button (light deep import) | 1879 |
| data-grid (heavy deep import) | 10848 |
| first-load composite (core+button+input+dialog) | 22971 |
| tokens.css | 2649 |

**Marginal-over-core** (component-entry brotli − core-bundle brotli, arithmetic):
- button (light deep import): −19197
- data-grid (heavy deep import): −10228

Negative marginals are an honest artifact of the shared-chunk architecture: the per-component deep-import entries import from shared chunks rather than bundling a copy of core, so each standalone entry is far smaller than the whole core bundle. This confirms deep-import purity (Pitfall 2 — no core duplication per component). These numbers are the pre-cut baseline; the enforcing limits land in Phase 11.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Re-scope .size-limit.json to brotli + create scripts/size-baseline.mjs** - `5325847` (feat)
2. **Task 2: Extend baseline to tokens.css, first-load composite, and marginal-over-core** - `fd85338` (feat)

_Tracer feedback gate: the Task 1 `<verify>` was re-run end-to-end (build → --write → --check → config assertion, plus usage-error exit 2 and report-only drift render) and passed before expanding into Task 2._

## Files Created/Modified
- `scripts/size-baseline.mjs` - Zero-dep report-only brotli baseline + diff (created)
- `api/size.baseline.json` - Committed first-generation brotli baseline (created)
- `.size-limit.json` - Re-scoped to brotli, floating-ui counted, composite entry added (modified)

## Decisions Made
- **tokens.css via `node:zlib`, not a `.size-limit.json` entry** — Task 2's action is explicit that size-limit measures JS entries only, so the CSS asset is brotli-compressed directly in the script. This avoids size-limit attempting to bundle CSS as JS.
- **Marginal = component − core (arithmetic)** — chosen per Open Question 2 (brotli-consistent, fewer moving parts) over size-limit `import` syntax. The plan's acceptance criterion fixes this exact formula; negative results are truthful and documented above.
- **package.json untouched** — per the plan, the `size:baseline` npm script is Plan 00's to own; the verify commands invoke the script directly (`node scripts/size-baseline.mjs`), so no package.json edit was needed.
- **Cross-platform size-limit invocation** — resolved `size-limit/package.json` → `bin.js` and ran it via `process.execPath` instead of `execFileSync('npx', ...)`, which fails on Windows (`.cmd` shim). Behaves identically on the Linux CI runner.

## Deviations from Plan

None - plan executed exactly as written. The one implementation choice worth flagging (cross-platform size-limit invocation) is within the plan's "clone the cem-diff shape" latitude and required no scope change.

## Issues Encountered
- **No node_modules/dist in the fresh worktree** — ran `npm ci` then `npm run build` inside the worktree to produce the measurement inputs before running the script. Resolved; not a plan deviation.
- **`docs/contract.md` regenerated by `npm run build`** — an out-of-scope build artifact; deliberately NOT staged (only the 3 task files were committed).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The report-only size baseline spine is proven end-to-end and is the clone target for Plan 04's `perf-diff.mjs` (CONTEXT D-08).
- `@floating-ui/dom` is now counted in the delivered payload, so Plan 02's no-bundled-Lit guard and Phase 8's floating-ui deferral both have a truthful before-number to move.
- The measured brotli figures above seed Phase 11's enforcing limits (floors just under measured, ratchet discipline).

## Self-Check: PASSED

- `scripts/size-baseline.mjs` — FOUND
- `api/size.baseline.json` — FOUND
- `.planning/phases/07-measurement-baselines-budgets/07-01-SUMMARY.md` — FOUND
- Commit `5325847` (Task 1) — FOUND
- Commit `fd85338` (Task 2) — FOUND

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
