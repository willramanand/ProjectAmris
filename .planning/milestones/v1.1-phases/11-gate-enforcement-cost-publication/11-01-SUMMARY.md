---
phase: 11-gate-enforcement-cost-publication
plan: 01
subsystem: build-gates
tags: [ci, size-gate, brotli, enforcement, tracer]
status: complete
requires:
  - "api/size.baseline.json (committed per-entry brotli baseline, Phase 7/8)"
  - "scripts/size-baseline.mjs report-only diff (Phase 7)"
provides:
  - "scripts/size-baseline.mjs --enforce mode (exit 1 on brotli regression)"
  - "enforceSizeExitCode(result,{tolerance}) pure exit-code helper"
  - "SIZE_TOLERANCE constant (per-row margin floor)"
  - "enforcing soak-staged `size` CI job (GATE-01/GATE-03)"
  - "enforce->soak->CI pattern proven end-to-end for GATE-02 reuse"
affects:
  - ".github/workflows/ci.yml (size job now enforcing under soak)"
  - "api/size.baseline.json (re-baselined to HEAD)"
tech-stack:
  added: []
  patterns:
    - "Pure exit-code helper mirroring cem-diff.mjs releaseGateExitCode (unit-testable, no process spawn)"
    - "Job-level continue-on-error as a soak wrapper: red-annotate without flipping workflow-run conclusion"
    - "Regression-ceiling size semantics (shrink/zero/null delta pass; positive delta beyond per-row margin fails)"
key-files:
  created:
    - test/size-baseline.test.ts
  modified:
    - scripts/size-baseline.mjs
    - .github/workflows/ci.yml
    - api/size.baseline.json
decisions:
  - "Re-baselined api/size.baseline.json to HEAD before enforcing — the Phase-8 baseline was two phases stale (Phase 9/10 growth accumulated silently under report-only)."
  - "Per-row tolerance = max(16 B, 0.5% of baseline) to survive a size-limit patch bump; exact-match (tolerance 0) is a one-flag change."
  - "continue-on-error is job-level and soak-temporary; documented for removal to make the gate hard-blocking post-soak."
metrics:
  duration: ~18m
  completed: 2026-08-27
  tasks: 2
  commits: 2
actuals:
  tokens: 4000
  tasks: 2
  commits: 2
requirements: [GATE-01, GATE-03]
---

# Phase 11 Plan 01: Enforcing Size Gate (TRACER) Summary

Flipped the per-entry brotli size baseline from report-only to enforcing (GATE-01) and wired it as a soak-staged CI `size` job that red-annotates a regression without blocking a publish (GATE-03) — proving the enforce->soak->CI pattern end-to-end for GATE-02 to reuse.

## What Was Built

- **`enforceSizeExitCode(result, { tolerance })`** — a pure, exported exit-code helper in `scripts/size-baseline.mjs` mirroring `cem-diff.mjs` `releaseGateExitCode`. Returns `1` when any `diff()` row has `delta != null && delta > perRowMargin`, else `0`. Regression-CEILING semantics: a shrink (negative delta), an unchanged row (zero), and an added/removed row (delta null) all pass. Never fails open.
- **`SIZE_TOLERANCE = 16`** — per-row brotli margin floor; the effective per-row margin is `max(16, round(0.005 * base))`.
- **`--enforce` CLI mode** — third mode alongside `--write`/`--check`. Reads the committed baseline only (never writes it), prints the report, prints offending rows to stderr, and `process.exit(1)` on regression / `0` otherwise. `--check`/`--write` stay byte-identical report-only; exit 2 remains reserved for a usage error (unknown mode).
- **CI `size` job flip** — the report-only `--check` step became "Brotli size regression gate (enforcing, soaking)" running `--enforce`; the job gained a documented job-level `continue-on-error: true` SOAK-ONLY wrapper.
- **`test/size-baseline.test.ts`** — 10 assertions pinning the exit-code contract (positive->1, negative->0, zero->0, within-tolerance->0, null-delta->0, any-row-regresses->1, 0.5% margin scaling).

## Verification Results

- `npx vitest run test/size-baseline.test.ts` — 10/10 pass (RED before Task 2, GREEN after).
- `npm run build && node scripts/size-baseline.mjs --enforce` — exit **0** on HEAD after re-baseline (no drift).
- Forced regression (temp-lowered baseline) — `--enforce` exit **1**, offending rows printed to stderr; restored after.
- `node scripts/size-baseline.mjs --check` — exit **0** even on drift (report-only preserved).
- `node scripts/size-baseline.mjs --bogus` — exit **2** (usage error).
- `grep -q 'size-baseline.mjs --enforce' .github/workflows/ci.yml` — OK; `grep -q 'continue-on-error: true'` — OK (in `size` job).
- `git diff --exit-code .github/workflows/release.yml` — clean (GATE-03 lever unchanged).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Re-baselined `api/size.baseline.json` to HEAD**
- **Found during:** Task 2 — `--enforce` against the committed baseline exited 1 with every entry showing a positive delta (core +589 B, full +871 B, first-load +821 B), contradicting the acceptance criterion "exits 0 on clean HEAD."
- **Root cause:** The committed baseline was last written at `195d46a chore(08-07)` (Phase 8). Phases 9 and 10 since landed real source growth — Phase 10 added `capabilities.ts`, `attachInternalsSafe()`, and the hidden-input form fallback across 16 components (COMPAT-01..06). Report-only `--check` let this legitimate, already-merged, validated growth accumulate silently in the baseline diff.
- **Why re-baseline (not "fix a regression"):** The drift is accepted feature cost from merged prior phases, not a regression this plan introduced. Flipping the gate to enforcing against a two-phase-stale baseline would fire on already-merged intended growth rather than on FUTURE regressions — defeating the objective ("lock in current sizes so a future regression red-builds"). The correct action is to re-baseline to HEAD via the sanctioned `--write` single-writer path, then enforce forward.
- **Fix:** `node scripts/size-baseline.mjs --write` (the plan's prohibition is that the enforce CODE PATH must not self-write — running `--write` as an explicit maintenance step is the sanctioned single-writer). Enforce then exits 0 on HEAD.
- **Files modified:** api/size.baseline.json
- **Commit:** c21fa83

## Flagged for Follow-up

- **Empirical soak confirmation (Assumption A1).** GATE-03 relies on a job-level `continue-on-error: true` FAILURE keeping `workflow_run.conclusion == 'success'` so `release.yml` still fires. This must be confirmed on one real CI run (Node 22) before the soak is trusted. The soak wrapper itself is what absorbs any first-run surprise.
- **Environmental caveat on re-baseline.** The baseline was re-written from a local Node 25 build; CI builds on Node 22. `esbuild` output is version-pinned (Go binary, Node-version-independent) so byte counts should match, but the first enforcing CI run should be checked — the soak `continue-on-error` contains any mismatch without blocking a publish.
- **Deferred one-way decision (not executed this plan):** removing `continue-on-error` from the `size` job to make the gate hard-blocking is a post-soak decision. Size is deterministic so its soak is short, but the removal is intentionally not performed here.

## Known Stubs

None — no placeholder values, TODOs, or unwired data sources introduced.

## Self-Check: PASSED
- test/size-baseline.test.ts — FOUND
- scripts/size-baseline.mjs (--enforce, enforceSizeExitCode, SIZE_TOLERANCE) — FOUND
- .github/workflows/ci.yml (--enforce step + soak continue-on-error) — FOUND
- api/size.baseline.json (re-baselined) — FOUND
- Commit 4520772 (RED test) — FOUND
- Commit c21fa83 (GREEN + tracer) — FOUND
