---
phase: 11-gate-enforcement-cost-publication
verified: 2026-08-28T00:10:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Push a throwaway PR that forces a size regression (temporarily lower one entry in api/size.baseline.json) OR a count regression, and observe the CI run: the size/perf job annotates RED but the overall workflow-run conclusion stays `success`, and release.yml/publish.yml (workflow_run gate) remains reachable."
    expected: "The soaking size/perf job shows a red X, but the CI workflow-run conclusion is `success` (green), so a publish is never blocked. This confirms GATE-03 Assumption A1 on the live GitHub Actions platform."
    why_human: "A job-level `continue-on-error: true` failure keeping `workflow_run.conclusion == 'success'` is documented GitHub Actions platform behavior that can only be confirmed by observing a real CI run — it is not inspectable from the codebase. Both 11-01 and 11-02 explicitly flag this as the one empirical confirmation the soak window exists to provide before the gates are un-soaked to hard-blocking."
---

# Phase 11: Gate Enforcement + Cost Publication Verification Report

**Phase Goal:** The banked gains are locked in and made visible — size and runtime-count budgets flip from report-only to enforcing (size first, wall-clock stays report-only, the flip staged off the release critical path during soak), and per-component cost cards publish the final measured numbers so enterprise consumers can budget.
**Verified:** 2026-08-28T00:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | GATE-01: per-entry brotli size budget flips report-only → ENFORCING first; a size regression red-builds CI | ✓ VERIFIED | `scripts/size-baseline.mjs` has `--enforce` mode (exit 1 regression / 0 clean-or-shrink / 2 usage). Unit tests 12/12 pass. Direct helper proof: absolute entry +600 → exit 1, core-shrink (marginals +665) → exit 0, derived-only +4000 → exit 0. CI `size` job runs `--enforce`. |
| 2 | GATE-02: runtime COUNT-metric budgets flip to enforcing; wall-clock stays report-only | ✓ VERIFIED | `scripts/perf-diff.mjs` `--enforce` gates only `hasDrift` (counts + scenario add/remove); wall-clock carried in a separate field, structurally excluded. Load-bearing test "identical counts + divergent wall-clock → hasDrift false / exit 0" passes. `--enforce` baseline-vs-itself → exit 0; no-path-pair → exit 2. |
| 3 | GATE-03: the gate flip is staged off the release critical path during soak | ✓ VERIFIED (mechanism) | Both `size` and `perf` jobs carry job-level `continue-on-error: true` with documented SOAK-ONLY/removal comments. `release.yml` + `publish.yml` last touched at Phase 6 commit `961b8ec` — provably untouched by Phase 11. (Live-platform confirmation of the conclusion-stays-`success` behavior routed to human verification.) |
| 4 | DOCS-04: per-component cost cards publish measured brotli size + runtime cost | ✓ VERIFIED | `scripts/build-cost-cards.mjs` generates `docs/cost-cards.md` deterministically from committed `api/*.baseline.json`; regen + `git diff --exit-code` clean across two runs. Doc has 7 size entries + 4 count scenarios; wall-clock under an explicit "report-only / volatile (NOT a budget)" section. CI `Cost-cards drift check` blocks on drift. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `scripts/size-baseline.mjs` | `--enforce` mode + `enforceSizeExitCode` + `SIZE_TOLERANCE` | ✓ VERIFIED | Exists, substantive, wired to CI `size` job. CR-01 fix present (`derived` tag + filter). |
| `scripts/perf-diff.mjs` | `--enforce` count-only + `enforcePerfExitCode` | ✓ VERIFIED | Exists, wired to CI `perf` step. Wall-clock structurally excluded. WR-02 fix present (missing-current → exit 2). |
| `scripts/build-cost-cards.mjs` | zero-dep generator, code-point sort, `cell()` escape | ✓ VERIFIED | Exists, wired to `build:cost-cards` npm script + CI drift step. Reads baselines only. |
| `docs/cost-cards.md` | 7 size entries + 4 scenarios + report-only wall-clock | ✓ VERIFIED | Present, deterministic, drift-clean. |
| `test/size-baseline.test.ts` | exit-code contract incl. CR-01 regression | ✓ VERIFIED | 12 it-blocks; dedicated CR-01 suite covers core-shrink + core-shrink-with-entry-growth. |
| `test/perf-diff.test.ts` | count-only + wall-clock exclusion | ✓ VERIFIED | Load-bearing wall-clock-exclusion assertion present, passes. |
| `test/build-cost-cards.test.ts` | determinism, code-point order, pipe-escape, wall-clock-not-a-budget | ✓ VERIFIED | Passes (part of 27/27). |
| `package.json` | `build:cost-cards` script | ✓ VERIFIED | Line 69, adjacent to `build:contract-doc`. |
| `.github/workflows/ci.yml` | enforcing soak-staged size/perf gates + cost-cards drift gate | ✓ VERIFIED | All three steps wired; both metric jobs soak-staged. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `size-baseline.mjs --enforce` exit code | CI `size` job | `node scripts/size-baseline.mjs --enforce` step | ✓ WIRED | ci.yml:178-179 |
| `perf-diff.mjs --enforce` count `hasDrift` | CI `perf` step | `... api/perf.json --enforce` | ✓ WIRED | ci.yml:140 |
| `api/*.baseline.json` | `docs/cost-cards.md` | `build-cost-cards.mjs` → `git diff --exit-code` | ✓ WIRED | ci.yml:82-85 |
| CI workflow conclusion | `release.yml` publish gate | `workflow_run.conclusion == 'success'` (soak lever) | ✓ WIRED (untouched) | release.yml unchanged since Phase 6 |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real Data | Status |
| --- | --- | --- | --- | --- |
| `docs/cost-cards.md` | size + count numbers | `api/size.baseline.json` + `api/perf.baseline.json` (committed measured) | ✓ Yes | ✓ FLOWING |
| `--enforce` gates | baseline deltas | committed baselines (READ only, never written by enforce) | ✓ Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase-11 unit tests | `vitest run size/perf/cost-cards specs` | 27 passed | ✓ PASS |
| perf `--enforce` baseline-vs-itself | `perf-diff ... --enforce` | exit 0 | ✓ PASS |
| perf usage error | `perf-diff --enforce` (no paths) | exit 2 | ✓ PASS |
| cost-cards drift (x2) | `build-cost-cards.mjs && git diff --exit-code` | clean both runs | ✓ PASS |
| CR-01: core shrink not a regression | `enforceSizeExitCode` direct | exit 0 | ✓ PASS |
| absolute entry regression gates | `enforceSizeExitCode` direct | exit 1 | ✓ PASS |
| derived-only regression excluded | `enforceSizeExitCode` direct | exit 0 | ✓ PASS |

Note: `size-baseline.mjs --enforce` against real `dist/` requires `npm run build` (Node-22 size-limit lane); not re-run here. The enforce exit-code logic is fully unit-proven and directly exercised; 11-01-SUMMARY reports an empirical exit-0-on-HEAD (post re-baseline) and exit-1-on-forced-regression run.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| GATE-01 | 11-01 | Per-entry brotli budgets flip to enforcing (size first) | ✓ SATISFIED | Truth 1 |
| GATE-02 | 11-02 | Count-metric budgets flip to enforcing; wall-clock report-only | ✓ SATISFIED | Truth 2 |
| GATE-03 | 11-01, 11-02 | Gate flip staged off release critical path during soak | ✓ SATISFIED (pending live A1) | Truth 3 |
| DOCS-04 | 11-03 | Per-component cost cards published | ✓ SATISFIED | Truth 4 |

All four requirement IDs are accounted for in plan frontmatter and mapped to Phase 11 in REQUIREMENTS.md. (REQUIREMENTS.md traceability checkboxes still read "Pending"/unticked — a post-verification bookkeeping update, not a deliverable gap.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `ci.yml` | 118, 152 | `continue-on-error: true` soak wrappers | ℹ️ Info | Intentional, documented SOAK-ONLY with explicit removal instructions and rationale referencing the deferred hard-block decision. Prohibition against a permanent suppressor is honored by documentation. No `TBD`/`FIXME`/`XXX` debt markers anywhere in phase files. |

### Human Verification Required

**1. GATE-03 live-platform soak confirmation (Assumption A1)**

**Test:** Push a throwaway PR that forces a size or count regression and observe the CI run.
**Expected:** The soaking `size`/`perf` job annotates RED, but the overall CI workflow-run conclusion stays `success`, keeping the `release.yml` / `publish.yml` `workflow_run.conclusion == 'success'` publish gate reachable.
**Why human:** Whether a job-level `continue-on-error: true` failure keeps `workflow_run.conclusion == 'success'` is GitHub Actions platform behavior observable only on a live run — not inspectable from the codebase. Both plans explicitly flag this as the empirical confirmation the soak window exists to provide before un-soaking to hard-blocking.

### Gaps Summary

No blocking gaps. All four success criteria (GATE-01, GATE-02, GATE-03, DOCS-04) are achieved in the codebase: the size and perf gates are enforcing and correctly wired, wall-clock is structurally report-only, the flip is soak-staged with the release path provably untouched, and drift-gated cost cards publish the measured numbers. The code-review Critical (CR-01, derived-marginal false-fail) and all three Warnings (WR-01/02/03) were fixed post-execution (commits 99a14f5, 423f455, 6a120bf, aac11a5) and are verified in the current source with a dedicated CR-01 regression test.

The single open item is a live-CI observation of GATE-03's underlying GitHub Actions platform behavior — the exact confirmation the soak design defers by construction. It is low-risk (documented platform behavior) but can only be confirmed on a real run, so it routes to human verification.

---

_Verified: 2026-08-28T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
