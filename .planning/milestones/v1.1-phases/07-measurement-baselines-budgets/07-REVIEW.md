---
phase: 07-measurement-baselines-budgets
reviewed: 2026-08-22T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - .github/workflows/ci.yml
  - .gitignore
  - .size-limit.json
  - api/perf.baseline.json
  - api/size.baseline.json
  - package.json
  - scripts/assert-no-bundled-lit.mjs
  - scripts/attribution-check.mjs
  - scripts/perf-diff.mjs
  - scripts/size-baseline.mjs
  - scripts/visualize.mjs
  - tachometer/benches/button.html
  - tachometer/benches/combobox.html
  - tachometer/benches/data-grid.html
  - tachometer/benches/overlay.html
  - tachometer/combobox.json
  - tachometer/data-grid.json
  - tachometer/overlay.json
  - test/no-bundled-lit.test.ts
  - test/perf/_spike.cdp.test.ts
  - test/perf/_spike.lit-markers.test.ts
  - test/perf/button.perf.test.ts
  - test/perf/combobox.perf.test.ts
  - test/perf/data-grid.perf.test.ts
  - test/perf/harness.ts
  - test/perf/overlay.perf.test.ts
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-08-22
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Phase 07 adds dev-only measurement tooling: brotli size baseline, runtime-perf
harness (Chromium/CDP-throttled), no-bundled-Lit guards, bundle-attribution
check, tachometer fixtures, and a re-scoped CI workflow. The report-only contract
(scripts exit 0 on drift, per D-08) is honored consistently and correctly, and is
explicitly out of review scope.

Security posture is sound: the CI workflow declares top-level `permissions:
contents: read` (least-privilege), no `pull_request_target`, no secrets are
referenced, and every script invokes child processes via `execFileSync` /
`spawnSync` with fixed argument arrays and no shell — so there is no command-injection
surface. No hardcoded secrets, `eval`, or unsafe templating. No Critical findings.

Three Warnings concern correctness/robustness of the measurement math and test
reliability; three Info items are minor quality nits. The most consequential is
that the perf-diff script crashes (non-zero) when the current report is missing —
an asymmetric unhandled edge that would red-build the report-only perf job.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: `perf-diff.mjs` diff mode crashes on a missing current report — defeats the report-only contract

**File:** `scripts/perf-diff.mjs:205-223`
**Issue:** In diff mode the script guards the *baseline* path with `existsSync`
(line 211, gracefully exits 0 when absent) but never guards the *current* report
path. Line 221 calls `load(currentPath)` directly, and `load` does
`JSON.parse(readFileSync(p, 'utf8'))`. If `api/perf.json` is missing (e.g. the
perf specs were skipped/filtered, or the harness never reached `writeScenario`),
`readFileSync` throws `ENOENT`, which is unhandled → the process exits non-zero.
The CI `perf` step (`ci.yml:110-113`) runs this immediately after `npm run
test:perf`, so a missing report red-builds the perf job — directly contradicting
the report-only intent (D-08) that the whole lane is built around. The `--write`
mode already checks its current path (line 187); diff mode is inconsistent.
**Fix:**
```js
if (!existsSync(currentPath)) {
  console.error(`perf-diff: current report not found: ${currentPath} — run \`npm run test:perf\` first.`);
  process.exit(2); // usage error, the only non-zero exit
}
const result = diff(load(baselinePath), load(currentPath));
```
(Or, to keep the lane green even when the report is absent, print a notice and
`process.exit(0)` — matching the missing-baseline branch.)

#### WR-02: `size-baseline.mjs` "marginal cost over core" is inverted — produces meaningless negative values

**File:** `scripts/size-baseline.mjs:73-79` (result visible in `api/size.baseline.json:11-14`)
**Issue:** `marginal[name] = entries[name] - core` subtracts the *entire core
bundle* brotli from a *single component* deep-import brotli. Because a component
deep import is far smaller than the whole core bundle, the result is a large
negative number: the committed baseline records `"button (light deep import)":
-19197` and `"data-grid (heavy deep import)": -10228`. A "marginal cost over the
shared core" that is negative is nonsensical and actively misleading — it does not
represent the incremental payload of adding the component to an app that already
loads core (which is what the comment on lines 61-65 claims it measures). Downstream
Phase 8/11 decisions read against this metric would be reasoning off an inverted
number.
**Fix:** Compute marginal cost as the delta of the component's own (non-shared)
code — e.g. measure a `core + component` composite entry via size-limit and
subtract the standalone core, so the value is the true incremental cost:
```js
// marginal = (core + component) − core, using a size-limit composite entry per component,
// NOT (component − core). As written the sign and magnitude are both wrong.
```
At minimum, rename/relabel the field so a negative value is not presented as a
"cost", and document what the subtraction actually represents.

#### WR-03: overlay perf spec asserts byte-stable `computePosition`/`repositions` counts that depend on floating-ui `autoUpdate` timing

**File:** `test/perf/overlay.perf.test.ts:110-147` (with `test/perf/harness.ts:288-302`)
**Issue:** `assertStableCounts` (harness.ts:371-381) throws if *any* count metric
differs across the 5 repeats, and the overlay counts include `computePosition` and
`repositions`. The spec's own doc comment (lines 37-44) acknowledges floating-ui's
`autoUpdate` "recomputes the position several times per open (immediate call +
ResizeObserver initial fire)". ResizeObserver/autoUpdate fire counts are timing-
and layout-dependent, not deterministic, so `computePosition` can legitimately vary
run-to-run. When it does, `assertStableCounts` throws → the vitest perf test fails
→ `npm run test:perf` exits non-zero → the CI `perf` job goes red. That is a flaky-
test risk that also breaks the report-only guarantee for this lane (a genuine
measurement wobble becomes a hard build failure rather than a reported diff).
**Fix:** Either derive the gated count from a deterministic signal (e.g. count only
distinct `repositions` observed via the MutationObserver, which the doc already
argues collapses identical writes), or relax the overlay stability assertion to a
tolerance/`>=` invariant instead of exact cross-repeat equality for the
autoUpdate-driven counters. Keep exact equality only for the truly deterministic
Lit lifecycle counts.

### Info

#### IN-01: `summarize` median is the upper-middle element for even-length samples; no empty-sample guard

**File:** `test/perf/harness.ts:327-333`
**Issue:** `sorted[Math.floor(sorted.length / 2)]` returns the upper of the two
middle values for even-length arrays rather than their average, and `mean`/`sd`
divide by `samples.length` with no guard for an empty array (would yield `NaN`).
Harmless today (REPEATS is fixed at 5, odd, non-empty, and wall-clock is report-only
per D-06), but the median definition is technically off and the empty case is
unguarded.
**Fix:** Average the two central values for even lengths and early-return a zeroed
`Summary` when `samples.length === 0`.

#### IN-02: `scanVisualizerReport` leak filter has a redundant/shadowing condition

**File:** `scripts/attribution-check.mjs:66`
**Issue:** `ids.filter((id) => /(^|[\\/])highlight\.js([\\/]|$)/i.test(id) ||
/highlight\.js/i.test(id))` — the second alternative `/highlight\.js/i.test(id)`
is a strict superset of the first (any string matching the boundary-anchored
pattern also matches the loose one), so the first term is dead. The loose pattern
also matches substrings like `highlightXjs` (`.` is unescaped-as-any). Report-only,
so no correctness impact.
**Fix:** Drop the redundant first alternative, or keep only the boundary-anchored
form and escape the dot: `/(^|[\\/])highlight\.js([\\/]|$)/i`.

#### IN-03: `assertStableCounts` dereferences `perRepeat[0]` with no non-empty guard

**File:** `test/perf/harness.ts:371-381`
**Issue:** With an empty input array, `JSON.stringify(perRepeat[0])` yields
`undefined` (not a string), the loop is skipped, and the function returns
`undefined` as the "canonical counts" — a silent bad value rather than a clear
error. Not reachable with the current fixed REPEATS=5 callers, but defensively
weak.
**Fix:** `if (perRepeat.length === 0) throw new Error('assertStableCounts: no repeats');`

---

_Reviewed: 2026-08-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
