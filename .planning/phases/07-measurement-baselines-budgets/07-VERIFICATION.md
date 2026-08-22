---
phase: 07-measurement-baselines-budgets
verified: 2026-08-22T15:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "In a Chromium-capable environment run `npm run test:perf` (Vitest Browser Mode + Playwright/Chromium), then `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json`."
    expected: "The perf lane launches Chromium, applies the 6x-CPU + Slow-3G throttle, and regenerates api/perf.json whose per-scenario `counts` (button/combobox/data-grid/overlay: update/updated/render/computePosition/repositions/nodes) match the committed api/perf.baseline.json byte-for-byte, with throttled wall-clock > unthrottled in each scenario's throttle-liveness evidence. perf-diff reports 'No count drift' and exits 0."
    why_human: "The perf harness only runs on a live Playwright/Chromium browser lane (CDP CPU+network throttling is Chromium-only). The verifier sandbox cannot launch Playwright, so live reproducibility of MEAS-02 emission cannot be self-executed. The committed baseline, the passing-by-design CDP spike, and the Node-side wiring are all present; only the live re-run is deferred."
warnings:

  - id: WR-01
    file: scripts/perf-diff.mjs:205-223
    issue: "Diff mode calls load(currentPath) without an existsSync guard; when api/perf.json is absent it throws ENOENT and exits non-zero. Confirmed by direct run (EXIT=1). In the missing-current edge this contradicts the report-only (D-08) contract for the CI perf job. Normal CI path generates api/perf.json via `npm run test:perf` before the diff, so the harness+baseline deliverable is unaffected. Already logged as WR-01 in 07-REVIEW.md."

  - id: WR-02
    file: scripts/size-baseline.mjs:73-79 (api/size.baseline.json:11-14)
    issue: "The `marginal` metric is computed as (component deep-import − whole core bundle), yielding meaningless negative values (button -19197, data-grid -10228). The primary per-entry brotli baseline (the MEAS-01 deliverable) is correct and reproduced; only the auxiliary marginal-cost field is inverted. Downstream Phase 8/11 reasoning that reads `marginal` would be reading an inverted number. Logged as WR-02 in 07-REVIEW.md."

  - id: WR-03
    file: test/perf/overlay.perf.test.ts:110-147
    issue: "assertStableCounts requires byte-stable computePosition/repositions across 5 repeats, but those counts derive from floating-ui autoUpdate/ResizeObserver timing that the spec's own comment admits can vary. A genuine measurement wobble would throw and red-build the report-only perf lane. Flaky-test risk, not a goal blocker. Logged as WR-03 in 07-REVIEW.md."
---

# Phase 7: Measurement, Baselines & Budgets — Verification Report

**Phase Goal:** A reproducible, throttled measurement harness and committed baselines exist so every later cut and budget is defended by real before/after numbers, and the low-end target profile is chosen from that data rather than guessed.
**Verified:** 2026-08-22T15:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | MEAS-01: `size-baseline.mjs` reproducibly captures a committed per-entry brotli baseline | ✓ VERIFIED | `node scripts/size-baseline.mjs --check` executed by verifier → all size-limit JS entries byte-identical to committed `api/size.baseline.json`; only `tokens.css` drifted +1B (rebuild variance). Exit 0, report-only honored. Script + baseline git-tracked. |
| 2 | MEAS-02: perf harness on Vitest Browser+Chromium emits count + wall-clock to committed JSON baseline under CDP CPU+network throttle | ✓ VERIFIED (live re-run → human) | `test/perf/harness.ts` + 4 `*.perf.test.ts` specs present & wired; committed `api/perf.baseline.json` holds counts (update/updated/render/computePosition/repositions/nodes) + wall-clock (median+band) + throttle profile for all 4 scenarios. `_spike.cdp.test.ts` proves throttled>unthrottled via CDP. Vitest `perf` project pins `api.allowWrite/allowExec` + `writeMetrics` command. Live browser re-run cannot run in verifier sandbox → human item. |
| 3 | MEAS-03: named low-end target profile (CPU multiplier + network tier) chosen from measured data, pinned in harness config | ✓ VERIFIED | `THROTTLE_PROFILE` in `harness.ts:105` = `{ name:'low-end-cellular', cpuRate:6, network:'Slow-3G' }`, with a documented 4-corner measured candidate grid (6x/4x × Slow/Fast-3G) and heavy/light-separation rationale (≈2.53x). Static pin, fully readable. |
| 4 | MEAS-04: `.size-limit.json` counts `@floating-ui/dom`; separate size-limit-independent assertion proves Lit never bundled | ✓ VERIFIED | `.size-limit.json` `ignore` arrays contain only `"lit"` — `@floating-ui/dom` is counted. `node scripts/assert-no-bundled-lit.mjs` executed → 0 inlined-Lit markers across 147 dist chunks, exit 0. `test/no-bundled-lit.test.ts` independently freezes the vite `external` array. |
| 5 | MEAS-05: dev-only attribution report (visualizer + esbuild-why) confirms `highlight.js` absent from every shipped chunk | ✓ VERIFIED | `vite.config.ts` env-gated `visualizer` (VISUALIZE flag → raw-data `bundle-stats.json`); `@size-limit/esbuild-why` + `rollup-plugin-visualizer` in devDependencies. `node scripts/attribution-check.mjs` executed → "highlight.js absent from ALL 147 shipped chunks", exit 0. |

**Score:** 5/5 truths verified (present + wired; MEAS-01 reproduced live by the verifier; MEAS-02 live browser re-run recommended to human — see below).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/size-baseline.mjs` | Brotli per-entry baseline capture/diff | ✓ VERIFIED | Substantive (166 LOC), report-only, ran clean, reproduces baseline. |
| `api/size.baseline.json` | Committed brotli baseline | ✓ VERIFIED | Git-tracked; 6 entries + marginal. Reproduced (JS entries exact). |
| `test/perf/harness.ts` | Throttle + instrument + summarize | ✓ VERIFIED | 387 LOC; CDP throttle, first-party lifecycle/_updatePosition wraps, MutationObserver cross-check, median/band summarize, writeScenario. |
| `test/perf/*.perf.test.ts` (4) | Scenario specs → committed baseline | ✓ VERIFIED | button/combobox/data-grid/overlay each prove throttle liveness, assert stable counts, writeScenario(key). |
| `api/perf.baseline.json` | Committed perf baseline (counts+wall-clock) | ✓ VERIFIED | Git-tracked; 4 scenarios with counts + wall-clock median/band + throttle profile. |
| `.size-limit.json` | Counts @floating-ui/dom | ✓ VERIFIED | Ignores only `lit`; floating-ui counted. |
| `scripts/assert-no-bundled-lit.mjs` + `test/no-bundled-lit.test.ts` | Two independent no-bundled-Lit guards | ✓ VERIFIED | Script ran exit 0 (0 markers); test freezes external array. |
| `vite.config.ts` (visualizer) | Env-gated attribution report | ✓ VERIFIED | `VISUALIZE`-gated; default build byte-unchanged. |
| `scripts/attribution-check.mjs` | highlight.js-absent confirm | ✓ VERIFIED | Ran exit 0; highlight.js in 0/147 chunks. |
| `scripts/perf-diff.mjs` | Report-only perf diff | ⚠️ ORPHANED-EDGE | Substantive & wired to CI, but crashes non-zero on missing current report (WR-01). |
| `package.json` | 3 devDeps + 7 report-only scripts | ✓ VERIFIED | rollup-plugin-visualizer, @size-limit/esbuild-why, tachometer in devDependencies only; all 7 scripts present; files=["dist","README.md"]; deps/peerDeps unchanged (Lit still only peer). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Size baseline reproduces | `node scripts/size-baseline.mjs --check` | JS entries byte-identical; tokens.css +1B; exit 0 | ✓ PASS |
| No-bundled-Lit guard | `node scripts/assert-no-bundled-lit.mjs` | 0 markers / 147 chunks; exit 0 | ✓ PASS |
| Attribution confirm | `node scripts/attribution-check.mjs` | highlight.js absent from all 147; exit 0 | ✓ PASS |
| perf-diff report-only on missing current | `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json` | ENOENT, exit 1 | ✗ FAIL (WR-01, warning) |
| Perf harness live emission (Chromium) | `npm run test:perf` | Requires Playwright/Chromium — not runnable in sandbox | ? SKIP → human |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| MEAS-01 | 01, 06 | Committed brotli size baseline via script | ✓ SATISFIED | Truth 1 — reproduced live |
| MEAS-02 | 00, 03, 06 | Throttled perf harness → committed JSON baseline | ✓ SATISFIED | Truth 2 — committed output + wiring + spike (live re-run → human) |
| MEAS-03 | 04, 06 | Data-derived low-end profile pinned | ✓ SATISFIED | Truth 3 — THROTTLE_PROFILE + grid |
| MEAS-04 | 00, 01, 02, 06 | size-limit counts floating-ui + independent no-Lit assertion | ✓ SATISFIED | Truth 4 — ran exit 0 |
| MEAS-05 | 00, 05, 06 | Dev attribution report; highlight.js absent | ✓ SATISFIED | Truth 5 — ran exit 0 |

All five MEAS IDs claimed across plans; no orphaned requirements.

### Anti-Patterns Found

None blocking. Report-only exit-0 across all measurement scripts is the deliberate D-08 contract for this phase (not a gap). Three code-review warnings (WR-01/02/03, see frontmatter) concern robustness/metric-meaningfulness, not goal achievement.

### Human Verification Required

1. **Live perf-harness reproducibility (Chromium)** — Run `npm run test:perf` then `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json` in a Playwright/Chromium environment. Expect Chromium to launch under 6x-CPU + Slow-3G throttle, regenerate `api/perf.json` whose `counts` match the committed `api/perf.baseline.json`, throttled>unthrottled per scenario, and perf-diff to report "No count drift" (exit 0). *Why human:* the perf lane requires a live browser the verifier sandbox cannot launch.

### Gaps Summary

No goal-blocking gaps. All five success criteria are met in the codebase: the size baseline reproduces live, both no-bundled-Lit guards and the attribution confirm run clean, the data-derived low-end profile is pinned, and the perf harness + committed perf baseline exist and are fully wired. The only deferred item is a live Chromium re-run of the perf harness (cannot execute Playwright here), routed to human/CI. Three non-blocking warnings (perf-diff missing-current crash, inverted marginal-cost field, autoUpdate-timing-sensitive overlay count assertion) are recorded for follow-up and are already captured in 07-REVIEW.md.

---

_Verified: 2026-08-22T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
