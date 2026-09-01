---
phase: 07-measurement-baselines-budgets
plan: 04
subsystem: testing
tags: [perf, baseline, cdp, chromium, throttle, report-only, zero-dep-node, meas-03]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    provides: "Plan 03 — test/perf/harness.ts (THROTTLE_PROFILE, count instrumentation, summarize) + four D-06 scenarios + merge-writing api/perf.json"
  - phase: 07-measurement-baselines-budgets
    provides: "Plan 01 — scripts/size-baseline.mjs report-only cem-diff inversion (the clone target for perf-diff)"
provides:
  - "scripts/perf-diff.mjs — zero-dependency, report-only perf baseline diff keyed by scenario+metric; counts gated, wall-clock report-only; exit 0 unconditionally (D-08); --write mode reduces a run to the committed baseline shape"
  - "Pinned data-derived THROTTLE_PROFILE (6x CPU + Slow-3G) in test/perf/harness.ts with the full candidate grid + rationale documented (MEAS-03)"
  - "api/perf.baseline.json — committed first-generation perf baseline: per scenario counts + wall-clock median + mean+3σ band (D-07)"
affects: [09-runtime-optimizations, 11-enforcing-gates]

actuals:
  tokens: 3050
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Report-only committed-baseline diff (cem-diff shape, exit code INVERTED to 0 — D-08), cloned from size-baseline.mjs into the perf lane"
    - "Gate on deterministic counts, report volatile wall-clock (median + mean+3σ band) — counts drive drift, wall-clock never gates (D-06)"
    - "Data-derived profile pin: run the candidate grid, pick the corner with the widest heavy/light separation (MEAS-03), never guess"
    - "Single-writer baseline: diff mode reads only; the committed baseline changes solely via an explicit --write regeneration (T-07-07)"

key-files:
  created:
    - scripts/perf-diff.mjs
    - api/perf.baseline.json
  modified:
    - test/perf/harness.ts

key-decisions:
  - "Pinned 6x CPU + Slow-3G — the only candidate-grid corner where BOTH heavy scenarios (combobox, data-grid) sit clearly above BOTH light ones (~2.53x heavy/light); 4x sinks data-grid below the overlay control, Fast-3G narrows the gap, 4x+Fast-3G collapses it"
  - "Baseline records wall-clock reduced to {median, band} (samples/mean/sd and throttle-liveness timings dropped as volatile) — committing raw samples would be machine-variable noise; counts are copied verbatim (the gated numbers)"
  - "perf-diff diff mode never writes the baseline (single-writer, T-07-07); the committed baseline is minted only via --write, so a run cannot silently mint a baseline from an unpinned profile"
  - "Absent-baseline edge reports 'new baseline' and exits 0 (points to --write) rather than auto-writing — keeps the committed baseline authoritative under the pinned profile"

patterns-established:
  - "Report-only perf baseline spine: harness → api/perf.json (ephemeral) → committed api/perf.baseline.json → deterministic count-keyed diff, exit 0 always (Phase 11 flips to enforcing)"
  - "Candidate-grid separation metric: pick the throttle profile that maximizes heavy/light wall-clock contrast, data-derived per MEAS-03"

requirements-completed: [MEAS-03]

coverage:
  - id: D1
    description: "scripts/perf-diff.mjs diffs committed api/perf.baseline.json vs fresh api/perf.json keyed by scenario+metric, sorts every compared list, treats wall-clock as report-only, and exits 0 unconditionally (D-08)"
    requirement: MEAS-03
    verification:
      - kind: integration
        ref: "node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json => exit 0; report-only exit-0 assertion + usage error exit 2"
        status: pass
    human_judgment: false
  - id: D2
    description: "A named low-end profile (single CPU multiplier + single tier) is pinned from measured candidate-grid data (4x/6x CPU x Slow/Fast-3G) with documented rationale — MEAS-03, not guessed"
    requirement: MEAS-03
    verification:
      - kind: integration
        ref: "candidate grid run (4 corners), 6x+Slow-3G pinned; npx tsc --noEmit + pin/rationale assertion => OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "First-generation api/perf.baseline.json committed with per-scenario counts + wall-clock median + mean+3σ band (D-07) for all four D-06 scenarios"
    requirement: MEAS-03
    verification:
      - kind: automated
        ref: "node -e check: all four scenario keys + band present in api/perf.baseline.json => OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "perf-diff is deterministic/idempotent: a zero-delta run reports no drift and exits 0; count drift is detected while wall-clock-only changes never drift; diff rows key-sorted"
    requirement: MEAS-03
    verification:
      - kind: unit
        ref: "reduceToBaseline+diff self-test: zero-delta hasDrift=false, mutated count hasDrift=true (single scenario:metric row), wall-clock-only hasDrift=false"
        status: pass
    human_judgment: false
  - id: D5
    description: "First-generation / empty-baseline behavior defined: absent baseline reports 'new baseline' and exits 0 rather than erroring (MEAS-05 empty edge)"
    requirement: MEAS-03
    verification:
      - kind: integration
        ref: "node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json with baseline absent => new-baseline message, exit 0"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-22
status: complete
---

# Phase 7 Plan 04: Perf-Diff + Data-Derived Profile Pin + Committed Baseline Summary

**Closes the perf lane for MEAS-03: a zero-dependency, report-only `perf-diff.mjs` (cem-diff/size-baseline clone) that gates on deterministic counts and reports volatile wall-clock; a `THROTTLE_PROFILE` pinned to 6x CPU + Slow-3G chosen from a measured 4-corner candidate grid; and a committed first-generation `api/perf.baseline.json` (counts + median + mean+3σ band) that diffs clean — the report-only input Phase 11 flips to enforcing.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-08-22
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- **`scripts/perf-diff.mjs`** — zero-dependency Node clone of the `cem-diff.mjs`/`size-baseline.mjs` shape (`load` / normalize / `diff` / `formatReport` / `isMain` guard), with the exit code INVERTED to report-only (`process.exit(0)` even on drift, D-08). Rows are keyed by a stable `scenario:metric` identifier (never array position) and every compared list is key-sorted, so re-runs never spuriously differ (MEAS-05). **Counts** are the gated, drift-visible metric; **wall-clock** median + mean+3σ band is carried into a separate report-only render and never contributes to drift (D-06). Raw `samples`, mean, sd, and the throttle-liveness timings are volatile and never compared. Absent baseline → "new baseline" message + exit 0 (empty edge); usage error → exit 2. A `--write` mode reduces a fresh `api/perf.json` to the committed baseline shape.

- **Data-derived `THROTTLE_PROFILE` pin (MEAS-03)** — ran the full candidate grid (CPU {4x, 6x} × network {Slow-3G, Fast-3G}, 5 repeats/scenario) and pinned the corner with the widest, most stable heavy/light separation. Grid + rationale documented in `harness.ts`. Counts are throttle-independent (identical across all four corners); the grid moves only the report-only wall-clock, which the separation rationale is read against.

- **`api/perf.baseline.json`** — committed first-generation perf baseline under the pinned profile: per scenario the gated counts + wall-clock `{median, band}` (D-07) for all four D-06 scenarios. Single committed source of truth (single-writer, T-07-07): a fresh same-profile run diffs to **zero count drift** while wall-clock varies (report-only). `api/` is outside `package.files`, so nothing ships.

## Candidate Grid Measured (MEAS-03 — the data behind the pin)

CPU-throttle × network, wall-clock medians (ms), Chromium-only (D-11). `heavy/light` = max(combobox, data-grid) / max(overlay, button):

| Corner | combobox | data-grid | overlay | button | heavy/light |
|--------|---------:|----------:|--------:|-------:|------------:|
| **6x + Slow-3G** | 80.6 | 70.7 | 31.8 | 15.7 | **≈2.53x ← PINNED** |
| 4x + Slow-3G | 54.0 | 25.2 | 31.8 | 16.3 | ≈1.70x (data-grid < overlay) |
| 6x + Fast-3G | 45.8 | 46.6 | 30.9 | 15.9 | ≈1.51x |
| 4x + Fast-3G | 29.6 | 18.5 | 32.1 | 16.5 | ≈0.92x (collapsed: overlay > heavy) |

**Rationale:** 6x + Slow-3G is the only corner where BOTH heavy scenarios sit clearly above BOTH light ones — the widest, most discriminating baseline for the Phase 8–9 cuts. Dropping to 4x CPU sinks data-grid below the overlay control; easing to Fast-3G narrows the heavy medians; 4x+Fast-3G collapses separation entirely. The pinned profile also encodes the D-01 worst-case-cellular intent. Reversible: re-pin from a grid re-run.

**Observation (refines Plan 03's "Slow-3G inert" note):** in these runs the Slow-3G tier materially *raised* the heavy-scenario medians vs Fast-3G at the same CPU (e.g. combobox 80.6 vs 45.8 at 6x), *widening* the heavy/light gap rather than being inert. Whichever mechanism (true network effect vs run variance), 6x + Slow-3G empirically gives the clearest separation and matches the worst-case-cellular intent.

## Committed Count Baseline (seeds Phase 11 enforcing count gates)

| Scenario | Counts (gated, deterministic) | Wall-clock median / band (report-only) |
|----------|-------------------------------|----------------------------------------|
| button | update=4, updated=4, render=4, nodes=5 | 15.7ms / 21.8ms |
| combobox | update=11, updated=11, render=11, nodes=20 | 60.1ms / 81.8ms |
| data-grid | update=3, updated=3, render=3, nodes=250 | 49.6ms / 77.3ms |
| overlay | update=4, updated=4, render=4, computePosition=4, repositions=2, nodes=5 | 31.4ms / 46.6ms |

Counts are byte-stable across runs (a fresh same-profile run reports zero drift); wall-clock median/band are machine-variable and report-only.

## Task Commits

Each task was committed atomically:

1. **Task 1: add report-only perf-diff.mjs (zero-dep cem-diff clone)** — `9dfc8a1` (feat)
2. **Task 2: pin low-end THROTTLE_PROFILE from measured candidate grid (MEAS-03)** — `4990a8f` (feat)
3. **Task 3: commit first-generation api/perf.baseline.json (D-07)** — `8d720de` (feat)

## Files Created/Modified

- `scripts/perf-diff.mjs` (created) — report-only perf baseline diff; counts gated, wall-clock report-only; `--write` reducer.
- `api/perf.baseline.json` (created) — committed first-generation perf baseline (counts + median + band, four scenarios).
- `test/perf/harness.ts` (modified) — `THROTTLE_PROFILE` doc comment expanded with the measured candidate grid + data-derived rationale; pinned values (6x + Slow-3G) unchanged from Plan 03's placeholder but now justified by data.

## Decisions Made

- **6x + Slow-3G pinned** — sole corner with clean BOTH-heavy > BOTH-light separation (~2.53x). The value coincides with Plan 03's placeholder, but is now data-derived per MEAS-03 (the placeholder is no longer a guess — the grid confirms it).
- **Baseline stores reduced wall-clock ({median, band})** — raw `samples`, mean, sd, and throttle-liveness timings are volatile machine noise and are dropped; counts are copied verbatim as the gated numbers.
- **Single-writer discipline (T-07-07)** — diff mode reads only; the committed baseline is minted exclusively via `--write`, so parallel CI runs (each writing its own `api/perf.json`) cannot corrupt the committed baseline, and a run can never silently mint a baseline from an unpinned profile.
- **Absent-baseline edge reports rather than auto-writes** — points the operator at `--write` and exits 0, keeping the committed baseline authoritative under the pinned profile (vs size-baseline's `--check` which auto-writes; perf's baseline must be minted under the deliberately-pinned throttle).

## Deviations from Plan

None — plan executed exactly as written. Two environment steps were required in the fresh worktree (not plan deviations): `npm ci` (no `node_modules` in a fresh git worktree, matching Plan 01/03) and regenerating `api/perf.json` via `npm run test:perf` before Task 1 (the ephemeral, gitignored Plan 03 output does not exist in a fresh worktree, per the execution note).

## Issues Encountered

- **No `node_modules` in the fresh worktree** — ran `npm ci` + `npx playwright install chromium` before measuring. Resolved; not a plan deviation.
- **`docs/contract.md` regenerated by `npm run build`** (Task 3 verify) — an out-of-scope build artifact, deliberately left uncommitted (only `api/perf.baseline.json` was staged), matching Plan 01/03 precedent.

## Known Stubs

None. This plan **resolves** Plan 03's `THROTTLE_PROFILE` placeholder stub (now data-derived and documented). `api/perf.json` remains intentionally ephemeral/gitignored (the committed baseline is `api/perf.baseline.json`, this plan's deliverable) — by design, not a stub.

## Next Phase Readiness

- **Phase 11** (enforcing gates): flip `perf-diff.mjs` from report-only (`exit 0`) to enforcing on **counts** (non-zero on count drift), mirroring the cem-diff enforcing flip; wall-clock stays report-only. The committed baseline + variance bands are the thresholds-outside-the-band inputs.
- **Phases 8–9** (deferral/optimization cuts): the committed count baseline is the pre-cut before-number; the pinned 6x+Slow-3G profile gives a trustworthy heavy/light contrast for measuring the cuts.
- No blockers. perf-diff, the pinned profile, and the committed baseline are proven end-to-end (zero-drift same-profile re-run) on real throttled Chromium.

## Self-Check: PASSED

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
