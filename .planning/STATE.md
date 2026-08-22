---
gsd_state_version: 1.0
milestone: v1.1
current_phase: 08
current_phase_name: Bundle-Size Deferral
status: executing
stopped_at: Phase 8 context gathered
last_updated: "2026-08-22T23:06:27.804Z"
last_activity: 2026-08-22
last_activity_desc: Phase 08 execution started
state_head: f29a8962019c2eeec34dc5e0eddb269005fc3776
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 14
  completed_plans: 7
  percent: 20
milestone_name: Performance & Compatibility Hardening
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-22)

**Core value:** Amris loads and runs well on low-end enterprise devices and slow networks and reaches as far down the browser stack as cheaply possible — without changing the frozen v1.0 public surface, locked in by CI perf/size gates.
**Current focus:** Phase 08 — Bundle-Size Deferral

## Current Position

Phase: 08 (Bundle-Size Deferral) — EXECUTING
Plan: 1 of 7
Status: Executing Phase 08
Last activity: 2026-08-22 — Phase 08 execution started

Progress: [██████░░░░] 64% (7 of 11 phases complete; v1.0 shipped, v1.1 Phase 7 done)

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

- **Phase 11** (was Phase 7 concern): perf-gate noise characterization — whether shared CI run-to-run variance lets the count gate enforce, or needs a dedicated/manual-dispatch low-noise runner. Phase 7 kept counts gated but wall-clock report-only; the enforcing flip is staged off the release critical path (GATE-03).
- **Phase 10** flagged for `--research-phase`: true per-capability browser floor (FACE vs ARIA reflection vs `:has()`/`adoptedStyleSheets`) resolved empirically on the widened matrix; Tier-2 hidden-input (COMPAT-03) Changeset decision pending enterprise-demand call.
- ✓ Resolved (Phase 7): throttle profile pinned to `low-end-cellular` (6×-CPU + Slow-3G); per-entry brotli baseline committed in `api/size.baseline.json`.

## Deferred Items

Items acknowledged and carried forward, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Testing | TEST-V2-02 — api-extractor `.d.ts` surface guard | Deferred | v1.0 close | v2 |
| A11y/i18n | RTL-V2-01 — full RTL audit across overlays | Deferred | v1.0 close | v2 |
| Features | FEAT-V2-01/02 — shortcut persistence, editable grid | Deferred | v1.0 close | v2 |
| Performance | PERF-V2-01 — `manualChunks` dedupe if purity insufficient | Deferred | v1.1 scope | v2 |

## Session Continuity

Last session: 2026-08-22T20:07:43.062Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-bundle-size-deferral/08-CONTEXT.md
