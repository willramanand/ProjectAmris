---
phase: 11
slug: gate-enforcement-cost-publication
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-27
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from 11-RESEARCH.md "Validation Architecture" + the three PLAN.md task maps.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 (projects: `jsdom`, `browser`, `perf`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `node scripts/size-baseline.mjs --enforce` (deterministic, seconds after a build) |
| **Full suite command** | `npx vitest run --project jsdom && npm run test:perf` |
| **Estimated runtime** | ~30–60 seconds (jsdom unit specs; perf lane separate) |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/size-baseline.mjs --enforce` (fast, deterministic) + the touched script's unit spec (`npx vitest run test/<script>.test.ts`)
- **After every plan wave:** Run `npx vitest run --project jsdom` + `npm run test:perf`
- **Before `/gsd-verify-work`:** Full jsdom suite + perf lane must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | GATE-01 | T-11-01 (fail-open) | Enforce path returns 1 on positive size delta, 0 on same/reduction, 2 on usage — never fail-open | unit (RED-first) | `npx vitest run test/size-baseline.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | GATE-01, GATE-03 | T-11-02 (permanent suppressor) | `--enforce` real `process.exit(1)`; CI size job soaks via job-level `continue-on-error` (temporary), release still gated on CI `conclusion=='success'` | unit + CI observation | `npx vitest run test/size-baseline.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | GATE-02 | T-11-02 (wall-clock gating) | Identical counts + divergent wall-clock ⇒ `hasDrift===false` / exit 0 — timing structurally excluded | unit (RED-first) | `npx vitest run test/perf-diff.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 2 | GATE-02 | T-11-01 (fail-open) | `enforcePerfExitCode` returns 1 only on count `hasDrift`; enforce mode reads baselines only (single-writer) | unit | `npx vitest run test/perf-diff.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 2 | GATE-03 | T-11-02 (permanent suppressor) | Soak-staged perf CI job annotates red without failing workflow conclusion | CI observation | one throwaway CI run (confirm A1) | ❌ manual | ⬜ pending |
| 11-03-01 | 03 | 3 | DOCS-04 | T-11-03 (stale/injected cards) | Deterministic markdown; code-point ordering (not localeCompare, WR-01); wall-clock never labeled a budget; `\|`-escaped cells | unit (RED-first) | `npx vitest run test/build-cost-cards.test.ts` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 3 | DOCS-04 | T-11-03 (self-writing baseline) | Generator reads committed `api/size.baseline.json` + `api/perf.baseline.json` only; never re-measures/invents data | unit | `node scripts/build-cost-cards.mjs && git diff --exit-code docs/cost-cards.md` | ❌ W0 | ⬜ pending |
| 11-03-03 | 03 | 3 | DOCS-04 | T-11-03 (drift) | CI drift gate `git diff --exit-code docs/cost-cards.md` red-builds on un-regenerated cards | CI drift gate | `git diff --exit-code docs/cost-cards.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/size-baseline.test.ts` — GATE-01: import `{ diff, enforceSizeExitCode }` from `scripts/size-baseline.mjs`; assert regression-ceiling exit-code decision (RED-first). Analog: `test/deep-import-purity.test.ts`.
- [ ] `test/perf-diff.test.ts` — GATE-02: import `{ diff, enforcePerfExitCode }`; assert wall-clock cannot set `hasDrift` (load-bearing) + count-drift exit 1.
- [ ] `test/build-cost-cards.test.ts` — DOCS-04: import `{ renderCostCards }`; assert determinism, code-point ordering, wall-clock-not-a-budget, cell escaping.
- [ ] No framework install needed — Vitest + the `.mjs`-import test pattern already exist.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Soak job annotates red without failing the CI workflow-run conclusion | GATE-03 | CI-runtime behavior — not unit-testable; depends on GitHub Actions `continue-on-error` semantics (Assumption A1) | Run one throwaway CI run with a deliberately-regressing entry; confirm the size/perf job shows red while the workflow `conclusion == 'success'` and `release.yml` still publishes. |
| Cross-CI-run tick-count stability (`computePosition`/`repositions`) | GATE-02 | Cross-run variance is only observable over N real CI runs (soak window) | Observe the soaking perf job over the soak window; characterize the count band before any future un-soak. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (set by /gsd-validate-phase after Wave-0 tests land green)

**Approval:** pending
