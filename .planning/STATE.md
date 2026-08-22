---
gsd_state_version: 1.0
milestone: v1.1
current_phase: 7
current_phase_name: first v1.1 phase
status: planning
stopped_at: Phase 7 context gathered
last_updated: "2026-08-22T04:04:43.540Z"
last_activity: 2026-08-21
last_activity_desc: v1.1 roadmap created (Phases 7–11), 24/24 requirements mapped
state_head: 554f9c7afc8710383967170a7a31079036d7db0a
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
milestone_name: Performance & Compatibility Hardening
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-21)

**Core value:** Amris loads and runs well on low-end enterprise devices and slow networks and reaches as far down the browser stack as cheaply possible — without changing the frozen v1.0 public surface, locked in by CI perf/size gates.
**Current focus:** Phase 7 — Measurement, Baselines & Budgets (v1.1)

## Current Position

Phase: 7 of 11 (Measurement, Baselines & Budgets) — first v1.1 phase
Plan: — of — (roadmap just created; no plans yet)
Status: Ready to plan
Last activity: 2026-08-21 — v1.1 roadmap created (Phases 7–11), 24/24 requirements mapped

Progress: [█████░░░░░] 55% (6 of 11 phases complete; v1.0 shipped)

## Performance Metrics

**Velocity (v1.0, shipped 2026-08-20):**

- Total plans completed: 39 across 6 phases
- v1.1 plans: not yet planned

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Test Coverage + CI Gates | 8 | Complete |
| 2. API Cleanup + CEM Baseline | 9 | Complete |
| 3. Reliability & Leak Fixes | 4 | Complete |
| 4. Performance & Feature Capabilities | 10 | Complete |
| 5. Documentation | 4 | Complete |
| 6. API Freeze + Release | 4 | Complete |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full log in PROJECT.md Key Decisions table and the archived v1.0 roadmap. Decisions now active for v1.1:

- v1.1 is optimization/compat only — no new public API; hardening stays behavior- and surface-preserving against the frozen v1.0 CEM (COMPAT-03 hidden-input fallback is the one Changeset exception).
- Measure before optimizing — the perf + size baseline harness (Phase 7) is the universal prerequisite; the low-end target profile is chosen from real data.
- Degrade gracefully below Safari 16.4 via independent capability probing — no hard ElementInternals polyfill.
- Enforce CI perf + bundle-size budgets last (report-only → enforcing), mirroring the v1.0 coverage gates; size gates flip before count-metric gates; wall-clock stays report-only.
- Stay client-only ESM — no SSR in v1.1.
- Roadmap ordering: measure → cut (bundle deferral before runtime tuning) → reach (degradation before widened-engine matrix) → lock in (gates last). COMPAT-01 capabilities folded into the front of Phase 10.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **Phase 7** flagged for `--research-phase`: perf-gate noise characterization — whether shared CI run-to-run variance lets the count gate enforce, or needs a dedicated/manual-dispatch low-noise runner.
- **Phase 10** flagged for `--research-phase`: true per-capability browser floor (FACE vs ARIA reflection vs `:has()`/`adoptedStyleSheets`) resolved empirically on the widened matrix; Tier-2 hidden-input (COMPAT-03) Changeset decision pending enterprise-demand call.
- Open baseline unknowns (resolve in Phase 7): exact CPU/network throttle profile, per-entry brotli budget KB numbers.

## Deferred Items

Items acknowledged and carried forward, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Testing | TEST-V2-02 — api-extractor `.d.ts` surface guard | Deferred | v1.0 close | v2 |
| A11y/i18n | RTL-V2-01 — full RTL audit across overlays | Deferred | v1.0 close | v2 |
| Features | FEAT-V2-01/02 — shortcut persistence, editable grid | Deferred | v1.0 close | v2 |
| Performance | PERF-V2-01 — `manualChunks` dedupe if purity insufficient | Deferred | v1.1 scope | v2 |

## Session Continuity

Last session: 2026-08-22T04:04:43.531Z
Stopped at: Phase 7 context gathered
Resume file: .planning/phases/07-measurement-baselines-budgets/07-CONTEXT.md
