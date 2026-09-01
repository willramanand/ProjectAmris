# Phase 7: Measurement, Baselines & Budgets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-22
**Phase:** 7-measurement-baselines-budgets
**Areas discussed:** Low-end target persona, Size-baseline breadth, Perf scenario set, Phase-7 CI footprint, First-load composite, Noise-floor characterization, Tachometer

---

## Low-End Target Persona (MEAS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Chromebook / corporate LAN | Mid-tier ARM Chromebook (~4× CPU) on a shared enterprise network (~Slow-4G). | |
| Older device on cellular | Low-end device (~6× CPU) on Fast/Slow-3G — worst-case field/mobile. | ✓ |
| Measure grid, pick from data | Candidate grid 4×&6× × {Slow-4G, Fast-3G}; pin the best separator, no persona assumption. | |

**User's choice:** Older device on cellular.
**Notes:** Persona intent = worst-case cellular. Candidate grid recentered on 6×+3G; exact profile still data-pinned per MEAS-03.

---

## Size-Baseline Breadth (MEAS-01, MEAS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Expand (entries+tokens+first-load+marginal) | Re-scope 4 to count floating-ui + tokens.css + first-load composite + marginal-cost-over-core. | ✓ |
| Moderate | Re-scope 4 + tokens.css + all per-component; no composite/marginal. | |
| Minimal | Only stop ignoring floating-ui in the current 4. | |

**User's choice:** Expand.
**Notes:** Makes deferral win + shared-chunk moves honestly visible without double-counting (Pitfall 2). `lit` stays ignored (peer dep). No-bundled-Lit assertion kept independent of size-limit (Pitfall 5).

---

## Perf Scenario Set (MEAS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Targets + light control | data-grid sort, combobox filter, overlay open/reposition + button control. | ✓ |
| Targets only | Just the three heavy targets. | |
| Broad heavy sweep | Targets + more overlays + select. | |

**User's choice:** Targets + light control.
**Notes:** Button control gives a variance/noise-floor contrast. Count metrics gated, wall-clock report-only.

---

## Phase-7 CI Footprint

| Option | Description | Selected |
|--------|-------------|----------|
| Report-only CI job now | Size + perf-diff post numbers every PR; Phase 11 flips to enforcing. | ✓ |
| Size in CI now, perf local until 11 | Size in CI (stable); perf local/manual until Phase 11. | |
| Local/manual until Phase 11 | No new CI job until Phase 11. | |

**User's choice:** Report-only CI job now.
**Notes:** "Report-only → enforcing" implies report-only exists first; catches drift during Phases 8–10. Mirrors cem-diff pattern.

---

## First-Load Composite (MEAS-01)

| Option | Description | Selected |
|--------|-------------|----------|
| button + input + dialog | Light + form + overlay; exercises floating-ui deferral target. | ✓ |
| button + input + select | Form-heavy; select pulls floating-ui + virtualizer. | |
| Data-driven pick | Most-imported-together from a demo. | |

**User's choice:** button + input + dialog.

---

## Noise-Floor Characterization (seeds Phase 11 GATE thresholds)

| Option | Description | Selected |
|--------|-------------|----------|
| 5 repeats — median + mean+3σ band | Median reported; mean+3σ band for Phase 11 thresholds. | ✓ |
| 10 repeats — tighter band | Better variance estimate, ~2× run time. | |
| 3 repeats — median only | Cheapest; band deferred to Phase 11. | |

**User's choice:** 5 repeats — median + mean+3σ band.

---

## Tachometer

| Option | Description | Selected |
|--------|-------------|----------|
| Add config, local-only, ungated | Committed local A/B config for heavy components; never in CI. | ✓ |
| Defer to Phase 8/9 | Add only when a specific optimization needs it. | |
| Skip entirely | CDP-harness counts are the source of truth. | |

**User's choice:** Add config, local-only, ungated.

---

## Claude's Discretion

- Exact file paths/names (scripts vs test/perf; `api/perf.baseline.json`), mirroring the cem-diff/baseline convention.
- Which single overlay represents "overlay" in the perf scenario (tooltip/dropdown/popover).
- Marginal-cost metric via size-limit `import` syntax vs per-entry-minus-core diff.
- Exact CPU multipliers/tiers in the candidate grid beyond the 6×+3G center.

## Deferred Ideas

- Gate enforcing flip → Phase 11; wall-clock stays report-only.
- WebKit/Firefox throttled perf → impossible (CDP Chromium-only); correctness-only in Phase 10.
- `manualChunks` shared-runtime dedupe → future PERF-V2-01, only if the chunk graph forces it.
