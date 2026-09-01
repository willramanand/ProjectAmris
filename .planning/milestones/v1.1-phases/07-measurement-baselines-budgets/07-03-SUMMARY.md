---
phase: 07-measurement-baselines-budgets
plan: 03
subsystem: testing
tags: [vitest, playwright, cdp, chromium, perf, throttle, lit, floating-ui, instrumentation]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    provides: "Plan 00 — Chromium-only perf Vitest project, pinned cdp() write+exec grant, writeMetrics Node command stub"
provides:
  - "test/perf/harness.ts — THROTTLE_PROFILE + applyThrottle/resetThrottle/proveThrottleLive (cdp CPU+network), first-party count instrumentation (countLifecycle, countComputePosition, countRepositions), summarize (median + mean+3σ), writeScenario + assertStableCounts"
  - "Four D-06 throttled perf scenarios: data-grid (render+sort), combobox (filter-per-keystroke), overlay=am-popover (open+reposition), button (light control)"
  - "Finalized merge-writing writeMetrics command + serial perf project → a single api/perf.json aggregating all four scenarios' {counts, wallClock median+band}"
  - "Candidate-grid observation: the 6x-CPU corner cleanly separates heavy (combobox/data-grid) from light (button) components; Slow-3G tier is inert for these local-DOM scenarios"
affects: [07-04-perf-diff-baseline, 09-runtime-optimizations, 11-enforcing-gates]

actuals:
  tokens: 7800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Throttled runtime-perf harness: prove-throttle-live compute anchor + CDP CPU/network emulation via in-test cdp()"
    - "Engine-independent count instrumentation by wrapping first-party prototypes only (component lifecycle hooks + FloatingPositionController._updatePosition) plus a MutationObserver style cross-check — never patching @floating-ui/dom or Lit"
    - "Warm-up-then-N-repeats determinism: one discarded cold iteration so all recorded repeats have identical counts"
    - "Merge-by-scenario-key writeMetrics + serial perf project so N separate specs aggregate into one committed-shape api/perf.json race-free"

key-files:
  created:
    - test/perf/harness.ts
    - test/perf/data-grid.perf.test.ts
    - test/perf/combobox.perf.test.ts
    - test/perf/overlay.perf.test.ts
    - test/perf/button.perf.test.ts
  modified:
    - vitest.config.ts
    - .gitignore

key-decisions:
  - "Scenario row/option counts kept AT/BELOW VIRTUALIZE_ROW_THRESHOLD (data-grid 80 rows, combobox 80 options) so the deterministic table/repeat() render paths run — the virtualizer's ResizeObserver windowing would make DOM node counts non-deterministic, and counts are the GATED numbers"
  - "Throttle-liveness proven with a dedicated fixed compute anchor (proveThrottleLive), not the scenario's own wall-clock, so the check stays robust even for the light button control whose scenario work is near the noise floor"
  - "am-popover confirmed as the representative overlay (controller-routed); color-picker/rich-select excluded (Pitfall 6), documented in harness.ts"
  - "api/perf.json is emitted but GITIGNORED (fresh ephemeral output, like dist/custom-elements.json); the committed api/perf.baseline.json is Plan 04's deliverable"

patterns-established:
  - "First-party prototype instrumentation for engine-independent counts (never patch library internals)"
  - "Determinism via warm-up discard + assertStableCounts across all recorded repeats"
  - "Gate on counts, report wall-clock (median + mean+3σ band) — D-06/D-07"

requirements-completed: [MEAS-02]

coverage:
  - id: D1
    description: "test/perf/harness.ts provides throttle (cdp CPU+network), first-party count instrumentation (lifecycle + controller chokepoint + MutationObserver cross-check), and the median+mean+3σ summarizer"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/button.perf.test.ts + test/perf/data-grid.perf.test.ts + test/perf/combobox.perf.test.ts + test/perf/overlay.perf.test.ts (all consume harness; all pass under `npm run test:perf`)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The four D-06 scenarios exist and pass under 6x-CPU + Slow-3G throttle: data-grid (render+sort), combobox (filter-per-keystroke), overlay=am-popover (open+reposition), button (light control)"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "npx vitest run --project perf test/perf/*.perf.test.ts => 4 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Count metrics asserted identical across all 5 recorded repeats (determinism) — assertStableCounts throws on any drift"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/harness.ts#assertStableCounts, invoked by each scenario spec"
        status: pass
    human_judgment: false
  - id: D4
    description: "Throttle proven live: throttled compute-anchor wall-clock measurably exceeds the unthrottled control (~90-118ms → ~600-770ms, ~6x) in every scenario"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/harness.ts#proveThrottleLive; expect(throttled).toBeGreaterThan(unthrottled) in each spec"
        status: pass
    human_judgment: false
  - id: D5
    description: "Overlay reposition cross-check: FloatingPositionController._updatePosition count corroborated by an independent MutationObserver style-write count (computePosition >= repositions >= 1)"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/overlay.perf.test.ts (countComputePosition vs countRepositions)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A single `npm run test:perf` writes a well-formed api/perf.json with all four scenarios, each carrying {counts, wallClock: {median, mean, sd, band}} via the merge-writing writeMetrics command"
    requirement: MEAS-02
    verification:
      - kind: automated
        ref: "node -e check: all four scenario keys + median + band present in api/perf.json => Task3 verify OK"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-22
status: complete
---

# Phase 7 Plan 03: Throttled Runtime-Perf Harness Summary

**A Chromium-only, CDP-throttled (6x CPU + Slow-3G) perf harness that instruments first-party prototypes for engine-independent, deterministic count metrics and reports wall-clock (median + mean+3σ), running the four D-06 scenarios ×5 and aggregating {counts, wall-clock} into a single api/perf.json.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-22
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- **`test/perf/harness.ts`** — the shared harness: `THROTTLE_PROFILE` (pinned placeholder: low-end-cellular 6x + Slow-3G), `NETWORK_TIERS`, `applyThrottle`/`resetThrottle`/`proveThrottleLive` via in-test `cdp()`; first-party count instrumentation `countLifecycle` (component update/updated/render), `countComputePosition` (wraps `FloatingPositionController.prototype._updatePosition`), and `countRepositions` (a MutationObserver on the panel `style` attribute — the zero-instrumentation cross-check); `summarize` (median + mean+3σ band); `writeScenario` + `assertStableCounts`. No `@floating-ui/dom` or Lit export is patched; no `test/setup.ts` import.
- **Four D-06 scenario specs** — each proves the throttle is live, runs one warm-up + 5 measured repeats, asserts count metrics identical across all repeats (determinism), summarizes wall-clock, and persists to api/perf.json. The overlay spec (am-popover) cross-checks the controller call count against the independent MutationObserver style-write count.
- **Finalized perf project + merge-writing `writeMetrics`** — the command read-merge-writes api/perf.json by top-level scenario key so the four separate spec files aggregate into one file; `fileParallelism: false` keeps the merge race-free and prevents cross-spec throttle bleed. Perf project stays Chromium-only, no setupFiles, with the pinned cdp() write+exec grant; `api/` stays outside `package.files`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build test/perf/harness.ts (throttle, instrument, summarize)** — `784704a` (feat)
2. **Task 2: Write the four D-06 scenario specs** — `bfacd13` (test)
3. **Task 3: Finalize the perf project + writeMetrics command** — `aaab758` (chore)

**Plan metadata:** committed after this summary (docs).

## Files Created/Modified
- `test/perf/harness.ts` (created) — throttle + first-party count instrumentation + summarizer + persistence helpers.
- `test/perf/data-grid.perf.test.ts` (created) — render + sort; 80-row table path (deterministic).
- `test/perf/combobox.perf.test.ts` (created) — filter-per-keystroke; 80-option repeat() path.
- `test/perf/overlay.perf.test.ts` (created) — am-popover open + reposition; dual reposition cross-check.
- `test/perf/button.perf.test.ts` (created) — light control / noise-floor contrast.
- `vitest.config.ts` (modified) — writeMetrics now merges by scenario key; perf project runs files serially.
- `.gitignore` (modified) — ignore fresh api/perf.json output + test/perf/__screenshots__.

## Decisions Made
- **Deterministic render paths.** Scenario data sizes sit just below `VIRTUALIZE_ROW_THRESHOLD` (100) so the plain `<table>` / `repeat()` paths render. The virtualizer's ResizeObserver-driven windowing yields non-deterministic DOM node counts, and counts are the gated numbers that MUST be identical across repeats.
- **Throttle-liveness via a compute anchor.** `proveThrottleLive` times a fixed busy loop before/after applying throttle, so the "throttle is live" assertion holds even for the light button control whose scenario work is near the noise floor. This also applies the throttle as a side effect, so the scenario runs that follow are measured under throttle.
- **api/perf.json is ephemeral output, not a committed baseline.** It is gitignored (mirroring dist/custom-elements.json vs the committed api/custom-elements.baseline.json). Plan 04 owns the committed api/perf.baseline.json and the perf-diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Overlay reposition cross-check is `computePosition >= repositions >= 1`, not strict equality**
- **Found during:** Task 2 (overlay scenario)
- **Issue:** The plan's implicit assumption was that the `_updatePosition` count and the MutationObserver style-write count would be equal. In reality floating-ui's autoUpdate recomputes the position several times per open (immediate call + ResizeObserver initial fire), and recomputes that yield identical coordinates re-serialize the `style` attribute to the same string — which a MutationObserver does NOT report. Strict equality is therefore physically false and flaked (observed 6 vs 4).
- **Fix:** Asserted the honest, meaningful relationship instead: `repositions >= 1` (the panel genuinely moved) AND `computePosition >= repositions` (the controller wrap never under-counts real repositioning). Both remain deterministic across repeats. Documented the reasoning in the spec header.
- **Files modified:** test/perf/overlay.perf.test.ts
- **Verification:** overlay spec passes; counts stable (computePosition=4, repositions=2 each repeat).
- **Committed in:** `bfacd13` (Task 2 commit)

**2. [Rule 1 - Bug] Added a discarded warm-up iteration for count determinism**
- **Found during:** Task 2 (combobox scenario)
- **Issue:** The first cold mount ran one fewer host update cycle than the warmed steady state (combobox: repeat 0 = 11 updates, repeat 1 = 12), tripping the "counts identical across all 5 repeats" requirement.
- **Fix:** Each scenario now runs one unmeasured warm-up iteration before the 5 recorded repeats, so every recorded repeat is in the warmed state and byte-identical.
- **Files modified:** all four *.perf.test.ts
- **Verification:** all four specs pass assertStableCounts.
- **Committed in:** `bfacd13` (Task 2 commit)

**3. [Rule 3 - Blocking] Removed a manual `panel.style.removeProperty` that corrupted the MutationObserver cross-check**
- **Found during:** Task 2 (overlay scenario)
- **Issue:** Clearing the panel's inline left/top between open cycles was itself a `style`-attribute mutation counted by the reposition MutationObserver, inflating its count above the controller's.
- **Fix:** Removed the manual style writes; the reopen's autoUpdate re-runs `_updatePosition` on the already-populated coords, and only floating-ui's own writes are observed.
- **Files modified:** test/perf/overlay.perf.test.ts
- **Verification:** overlay spec passes; the two counters are consistent.
- **Committed in:** `bfacd13` (Task 2 commit)

**4. [Rule 3 - Blocking] Gitignored ephemeral perf artifacts**
- **Found during:** Task 2/3
- **Issue:** Vitest browser writes failure screenshots to `test/perf/__screenshots__`, and `npm run test:perf` regenerates api/perf.json each run (machine-variable wall-clock).
- **Fix:** Added both to `.gitignore` (the committed baseline is Plan 04's api/perf.baseline.json).
- **Files modified:** .gitignore
- **Committed in:** `bfacd13` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 bug, 2 blocking)
**Impact on plan:** All fixes were necessary for correct, deterministic measurement and clean artifacts. No scope creep — all four scenarios and every plan artifact were delivered.

## Issues Encountered
- **Count non-determinism (cold-start + observer semantics)** — resolved via the warm-up iteration (deviation 2) and the corrected observer relationship (deviations 1, 3). All counts are now byte-stable across the 5 recorded repeats.
- **A stray `docs/contract.md` diff** appeared from `npm run build` (build:contract-doc regeneration); it is unrelated to this plan and was left uncommitted (not part of the plan's file set).

## Candidate-Grid Observation (for Plan 04's profile pin)
Under the harsh **6x-CPU + Slow-3G** corner:
- **Throttle is unmistakably live:** the fixed compute anchor went from ~90-118 ms unthrottled to ~600-770 ms throttled (~6x) in every scenario.
- **Heavy/light separation is clear at 6x CPU:** scenario wall-clock medians (report-only) were combobox ~63 ms and data-grid ~39 ms (heavy) vs overlay ~31 ms and button ~16 ms (light). The 6x CPU multiplier separates heavy from light cleanly — **favor keeping cpuRate=6 in Plan 04's pin**.
- **Slow-3G is effectively inert for these local-DOM scenarios** (no network fetch). Plan 04's network-tier choice should be driven by components with real async/remote loading (e.g. remote-mode combobox), not these four; the tier here only proves the command applies.

## Known Stubs

| Stub | File | Status / Resolving plan |
|------|------|-------------------------|
| `THROTTLE_PROFILE` values (6x + Slow-3G) | `test/perf/harness.ts` | Intentional placeholder centered on the worst-case-cellular corner (D-01). Plan 04 re-pins the single named profile from measured candidate-grid data (MEAS-03). Intent (worst-case field/mobile) is frozen; the numbers are data-derived. |
| `api/perf.json` (emitted, gitignored) | (generated) | Fresh per-run output. The committed baseline `api/perf.baseline.json` + perf-diff are Plan 04's deliverables. |

## Next Phase Readiness
- **Plan 04** (perf-diff + baseline): run `npm run test:perf` to emit api/perf.json, commit the first-generation `api/perf.baseline.json`, build `scripts/perf-diff.mjs` (clone of cem-diff.mjs, report-only exit), and re-pin `THROTTLE_PROFILE` from the candidate-grid observation above (cpuRate=6 recommended).
- No blockers. The harness, scenarios, and persistence channel are proven end-to-end on real throttled Chromium.

## Self-Check: PASSED

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
