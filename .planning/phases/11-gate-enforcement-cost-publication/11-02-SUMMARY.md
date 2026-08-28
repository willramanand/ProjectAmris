---
phase: 11-gate-enforcement-cost-publication
plan: 02
subsystem: build-gates
tags: [ci, perf-gate, runtime-counts, enforcement, soak]
status: complete
requires:
  - "api/perf.baseline.json (committed reduced perf baseline — counts + wallClock band, Phase 9)"
  - "scripts/perf-diff.mjs report-only diff (Phase 9)"
  - "enforce->soak->CI pattern proven by the GATE-01 size tracer (11-01)"
provides:
  - "scripts/perf-diff.mjs --enforce mode (exit 1 on COUNT drift, wall-clock structurally excluded)"
  - "enforcePerfExitCode(result) pure exit-code helper (1 on count-only hasDrift, else 0)"
  - "enforceDetail(result) offender-name + reduction reporter for stderr"
  - "enforcing soak-staged `perf` CI job (GATE-02/GATE-03)"
affects:
  - ".github/workflows/ci.yml (perf job now enforcing under soak)"
tech-stack:
  added: []
  patterns:
    - "Pure exit-code helper mirroring size-baseline.mjs enforceSizeExitCode / cem-diff.mjs releaseGateExitCode (unit-testable, no process spawn)"
    - "Job-level continue-on-error as a soak wrapper: red-annotate without flipping workflow-run conclusion"
    - "Count-only gate: hasDrift computed from count deltas + scenario add/remove ONLY; wall-clock can never reach a non-zero exit"
    - "Reduction (negative count delta) is drift that prints a --write re-baseline reminder, still exit 1 until re-baselined"
key-files:
  created:
    - test/perf-diff.test.ts
  modified:
    - scripts/perf-diff.mjs
    - .github/workflows/ci.yml
decisions:
  - "Wall-clock exclusion is structural, not a filter: enforcePerfExitCode reads only result.hasDrift, which diff() computes from counts + scenario add/remove — wall-clock median/band are carried in a separate report-only field and cannot influence the exit code."
  - "No metric-name filter this plan: the timing-derived tick counts (computePosition/repositions) are gated with the deterministic counts and characterized under the Task-3 soak wrapper rather than excluded — removing the wrapper (hard-blocking) is the deferred counts-second decision."
  - "continue-on-error is job-level and soak-temporary; documented for removal to make the perf count gate hard-blocking post-soak, after the deterministic size gate un-soaks first."
metrics:
  duration: ~12m
  completed: 2026-08-27
  tasks: 3
  commits: 3
actuals:
  tokens: 4000
  tasks: 3
  commits: 3
requirements: [GATE-02, GATE-03]
---

# Phase 11 Plan 02: Enforcing Perf Count Gate Summary

Flipped the runtime-perf baseline guard from report-only to enforcing on COUNT metrics only (GATE-02), reusing the enforce->soak->CI pattern the GATE-01 size tracer proved (11-01), and wired it as a soak-staged CI `perf` job that red-annotates a count regression without blocking a publish (GATE-03). Wall-clock timing is structurally incapable of tripping the gate.

## What Was Built

- **`enforcePerfExitCode(result)`** — a pure, exported exit-code helper in `scripts/perf-diff.mjs` mirroring `size-baseline.mjs` `enforceSizeExitCode` / `cem-diff.mjs` `releaseGateExitCode`. Returns `1` when the COUNT-only `result.hasDrift` is true, else `0`. Because `diff()` computes `hasDrift` from count deltas + scenario add/remove ONLY, wall-clock median/band (carried in a separate report-only field) can never reach the exit path — the volatile metric is structurally excluded, not filtered.
- **`enforceDetail(result)`** — collects drifted `scenario:metric` offender names and flags whether any drifted row is a count REDUCTION (negative delta), so `--enforce` can name offenders on stderr and prompt a `--write` re-baseline on an improvement.
- **`--enforce` CLI mode** — opt-in flag alongside the report-only diff and `--write`. Filtered out of the positional path pair before validation, it runs the existing `diff()`, prints the report, and on count drift prints offenders to stderr and `process.exit(1)`; otherwise exit 0. Reads both files only — never writes the committed baseline (single-writer, T-07-07). Absent-baseline still prints `new baseline` and exits 0; report-only mode (no flag) is byte-unchanged; exit 2 stays reserved for a usage error.
- **CI `perf` job flip** — the report-only harness step became "Perf harness (Chromium, throttled) — count gate (enforcing, soaking)" running `perf-diff.mjs ... --enforce`; the job gained a documented job-level `continue-on-error: true` SOAK-ONLY wrapper. Node 20 and Chromium-only preserved; no bare error-suppressor on the step; `release.yml` untouched.
- **`test/perf-diff.test.ts`** — 8 assertions pinning the count-only contract: the load-bearing identical-counts + divergent-wall-clock -> `hasDrift === false` / exit 0; count-up -> exit 1; count-down (reduction) -> exit 1 with negative delta; added/removed scenario -> drift; added/removed metric -> drift; exact-equal count -> `same` / exit 0; exact integer deltas (no float rounding).

## Verification Results

- `npx vitest run test/perf-diff.test.ts` — 8/8 pass (RED before Task 2 on the missing `enforcePerfExitCode` export, GREEN after).
- `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.baseline.json --enforce` — exit **0** (baseline vs itself, no drift).
- Synthetic count-up (overlay.computePosition 4->5) — `--enforce` exit **1**; same input WITHOUT `--enforce` — exit **0** (report-only preserved).
- Synthetic wall-clock-only change (all medians +500, bands +999, counts untouched) — `--enforce` exit **0** (wall-clock never gates).
- Synthetic count-down (overlay.computePosition 4->3) — `--enforce` exit **1**, offender `overlay:computePosition` named on stderr with a `--write` re-baseline reminder.
- `node scripts/perf-diff.mjs --enforce` with no path pair — exit **2** (usage).
- `git diff --exit-code api/perf.baseline.json` — clean after every enforce run (enforce never writes the baseline).
- `grep -q 'perf-diff.mjs api/perf.baseline.json api/perf.json --enforce' .github/workflows/ci.yml` — OK; perf job carries `continue-on-error: true`; Node 20 + Chromium-only preserved; `git diff --exit-code .github/workflows/release.yml` — clean.

## Deviations from Plan

None — plan executed exactly as written. Unlike 11-01, no re-baseline was needed: `api/perf.baseline.json` was already at HEAD (Phase 9 counts are deterministic and were not touched by Phase 10), so `--enforce` against the committed baseline exits 0 with no drift.

## Flagged for Follow-up

- **Cross-run count stability soak (GATE-02 backstop / RESEARCH Open Question 1).** The timing-derived tick counts `computePosition`/`repositions` hard-assert 4/2 in-test today but are gated with the deterministic counts; their cross-CI-run stability on shared runners is confirmed only empirically via the soak before being trusted as hard-blocking.
- **GATE-03 Assumption A1 (shared with 11-01).** A job-level `continue-on-error: true` failure must keep `workflow_run.conclusion == 'success'` so `release.yml` still fires — confirm once on a real CI run.
- **Deferred one-way decision (not executed this plan):** removing `continue-on-error` from the `perf` job (hard-blocking counts) happens counts-second, only after the size gate un-soaks and the count soak shows zero cross-run variance.

## Known Stubs

None — no placeholder values, TODOs, or unwired data sources introduced.

## TDD Gate Compliance

- RED gate: commit `7747e74 test(11-02)` — spec failed on the missing `enforcePerfExitCode` export.
- GREEN gate: commit `a339d4a feat(11-02)` — export + `--enforce` added; 8/8 pass.
- No REFACTOR commit needed (implementation landed clean).

## Self-Check: PASSED
- test/perf-diff.test.ts — FOUND
- scripts/perf-diff.mjs (--enforce, enforcePerfExitCode, enforceDetail) — FOUND
- .github/workflows/ci.yml (--enforce step + soak continue-on-error) — FOUND
- Commit 7747e74 (RED test) — FOUND
- Commit a339d4a (GREEN feat) — FOUND
- Commit b89b55a (CI wiring) — FOUND
