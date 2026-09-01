---
phase: 11-gate-enforcement-cost-publication
plan: 03
subsystem: docs
tags: [cost-cards, brotli, perf-baseline, drift-gate, ci, esm, generator]

# Dependency graph
requires:
  - phase: 11-gate-enforcement-cost-publication (11-01/11-02)
    provides: committed api/size.baseline.json + api/perf.baseline.json measured numbers; docs/contract.md drift-gate precedent
provides:
  - scripts/build-cost-cards.mjs — zero-dep, code-point-sorted, cell()-escaped generator that reads the committed baselines only
  - docs/cost-cards.md — generated per-component cost cards (brotli size + deterministic runtime counts + report-only wall-clock)
  - build:cost-cards npm script
  - CI "Cost-cards drift check" step in the surface-diff job (blocking git diff --exit-code gate)
affects: [gsd-ship, cost-publication, docs-update, future baseline re-measures]

# Actuals
actuals:
  tokens: 4800
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generated-doc drift gate: baseline JSON -> zero-dep ESM generator -> committed markdown -> git diff --exit-code CI gate (clone of build-contract-doc.mjs)"
    - "Pure render() + I/O buildX() split with a main-module guard so the pure renderer is unit-testable without triggering file writes on import"

key-files:
  created:
    - scripts/build-cost-cards.mjs
    - docs/cost-cards.md
    - test/build-cost-cards.test.ts
  modified:
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "Wall-clock rendered under an explicit report-only / volatile section that states in prose it is NOT a budget/ceiling/limit; the enforced runtime budget is the deterministic count table."
  - "Code-point sort (a<b?-1:a>b?1:0), NOT localeCompare, so CI-vs-local ordering can never drift the git-diff gate (WR-01)."
  - "Generator reads committed api/*.baseline.json only — never invokes size-limit or the perf harness — so a local/jsdom re-measure can never publish wrong numbers."
  - "Cost-cards drift step is a blocking gate from the start (no soak wrapper) because a regenerated doc deterministically matches or does not, exactly like the contract-doc gate."

patterns-established:
  - "Pattern: mirror the proven build-contract-doc.mjs generator + its CI drift step for any new baseline-derived published doc."
  - "Pattern: main-module guard (process.argv[1] === fileURLToPath(import.meta.url)) keeps ESM generators importable as pure functions in tests."

requirements-completed: [DOCS-04]

coverage:
  - id: D1
    description: "build-cost-cards.mjs deterministically renders code-point-ordered, pipe-escaped cost cards; wall-clock is report-only, never a budget"
    requirement: DOCS-04
    verification:
      - kind: unit
        ref: "test/build-cost-cards.test.ts#renderCostCards + buildCostCards (5 tests: determinism, code-point order, pipe-escape, wall-clock-not-a-budget, I/O idempotency)"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/cost-cards.md is drift-gated in CI — regenerate + git diff --exit-code fails the surface-diff job on a stale committed copy"
    requirement: DOCS-04
    verification:
      - kind: integration
        ref: "node scripts/build-cost-cards.mjs && git diff --exit-code docs/cost-cards.md (clean twice); grep 'build-cost-cards.mjs' + 'git diff --exit-code docs/cost-cards.md' in .github/workflows/ci.yml"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-27
status: complete
---

# Phase 11 Plan 03: Per-Component Cost Cards Summary

**Published drift-gated `docs/cost-cards.md` — measured brotli size + deterministic runtime counts for the representative component set — via a zero-dependency `build-cost-cards.mjs` generator that reads the committed baselines only and is `git diff`-gated in CI, with wall-clock rendered as report-only/volatile rather than a budget.**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-08-27
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `scripts/build-cost-cards.mjs`: zero-dep ESM generator cloning `build-contract-doc.mjs` — exports a pure `renderCostCards({size, perf})` and an I/O `buildCostCards({sizePath, perfPath, outPath})`, code-point sorted, `cell()`-escapes `|`, reads `api/*.baseline.json` only (never re-measures).
- `docs/cost-cards.md`: generated deterministically with 7 size entries + 4 runtime-count scenarios + a report-only/volatile wall-clock table that states it is NOT a budget.
- `build:cost-cards` npm script added adjacent to `build:contract-doc`.
- CI `Cost-cards drift check` step added to the `surface-diff` job — regenerates the doc and `git diff --exit-code docs/cost-cards.md` blocks the job on any stale committed copy (no soak wrapper).

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave-0 test scaffold (RED)** - `708e0ee` (test)
2. **Task 2: Generator + generated doc + npm script (GREEN)** - `9cca8de` (feat)
3. **Task 3: CI cost-cards drift gate** - `063e381` (ci)

_TDD: Task 1 (RED) and Task 2 (GREEN) are separate commits per the plan's split-task structure._

## Files Created/Modified
- `scripts/build-cost-cards.mjs` - The cost-cards generator (pure render + I/O wrapper + main guard).
- `docs/cost-cards.md` - Generated cost cards (size / runtime counts / report-only wall-clock).
- `test/build-cost-cards.test.ts` - 5 unit tests (jsdom project): determinism, code-point ordering, pipe-escape, wall-clock-not-a-budget, I/O idempotency.
- `package.json` - Added `build:cost-cards` script.
- `.github/workflows/ci.yml` - Added blocking `Cost-cards drift check` step to the `surface-diff` job.

## Decisions Made
- Wall-clock is published only under a report-only / volatile heading with explicit "NOT a budget" prose; the enforced runtime budget remains the deterministic count table.
- Code-point comparison, not `localeCompare`, keeps the git-diff gate locale-independent (WR-01).
- Generator reads committed baselines only — no size-limit / perf-harness invocation — so numbers can never diverge from the enforced gates.
- The drift step blocks from the start (no soak), matching the contract-doc gate's deterministic shape.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Git reports `LF will be replaced by CRLF` warnings on the generated `.md`/`.mjs` (Windows worktree, `core.autocrlf`). No impact on the drift gate: the generator writes LF, the stored blob is LF, and `git diff --exit-code` was verified clean across repeated regenerations locally and will match on the Linux CI runner.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DOCS-04 satisfied: per-component cost cards are published, generated with zero new dependencies from the committed baselines, and drift-gated in CI.
- Follow-up (flagged assumption A4): expanding coverage from the representative span to all 60+ components would require adding size-limit entries + perf scenarios — a deliberate, larger scope decision, not silently narrowed here.

## Self-Check: PASSED

- FOUND: scripts/build-cost-cards.mjs
- FOUND: docs/cost-cards.md
- FOUND: test/build-cost-cards.test.ts
- FOUND: .planning/phases/11-gate-enforcement-cost-publication/11-03-SUMMARY.md
- FOUND commit: 708e0ee (test RED)
- FOUND commit: 9cca8de (feat GREEN)
- FOUND commit: 063e381 (ci drift gate)

---
*Phase: 11-gate-enforcement-cost-publication*
*Completed: 2026-08-27*
