---
phase: 7
slug: measurement-baselines-budgets
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 (browser mode: @vitest/browser-playwright, Chromium) + node scripts |
| **Config file** | `vitest.config.ts` (browser project) — Wave 0 confirms `cdp()` privilege (A2) |
| **Quick run command** | `npm run build && node scripts/size-baseline.mjs --check` |
| **Full suite command** | `npm run build && npx vitest run --project perf && node scripts/perf-diff.mjs` |
| **Estimated runtime** | ~90 seconds (build + throttled Chromium perf lane) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (size baseline diff)
- **After every plan wave:** Run the full suite command (perf lane + diff)
- **Before `/gsd-verify-work`:** Full suite must be green (report-only exit 0 this phase)
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

> Seeded by plan-phase (draft). The gsd-planner / validate-phase populate exact task IDs and commands per PLAN.md.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-00-01 | 00 | 0 | MEAS-02 | — | `cdp()` grants CPU+network throttling in Chromium perf lane | spike | `npx vitest run --project perf` (cdp spike) | ❌ W0 | ⬜ pending |
| 7-01-01 | 01 | 1 | MEAS-01 | — | brotli per-entry baseline reproducible & committed | script | `node scripts/size-baseline.mjs --check` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | MEAS-04 | T-7-01 | size-limit counts `@floating-ui/dom`; Lit never bundled | script | `npx size-limit && node scripts/assert-no-bundled-lit.mjs` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 2 | MEAS-02 | — | perf harness emits count metrics + wall-clock JSON under throttle | browser | `npx vitest run --project perf` | ❌ W0 | ⬜ pending |
| 7-04-01 | 04 | 2 | MEAS-03 | — | named low-end profile pinned from measured data | script | `node scripts/perf-diff.mjs --check` | ❌ W0 | ⬜ pending |
| 7-05-01 | 05 | 2 | MEAS-05 | T-7-02 | bundle-attribution report confirms `highlight.js` ships nowhere | script | `SIZE_WHY=1 npm run build && node scripts/attribution-check.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/perf/_spike.cdp.test.ts` — proves `cdp()` returns a usable CDPSession with CPU + network throttle in the browser lane (research assumption A2); fallback: `ctx.page.context().newCDPSession(page)` custom command
- [ ] `test/perf/lit-markers.fixture` — validates the inlined-Lit marker strings used by the no-bundled-Lit assertion (research assumption A3)
- [ ] Install `rollup-plugin-visualizer@7`, `@size-limit/esbuild-why@13`, `tachometer@0.7.2` (new devDependencies) — run `npm install` after the dep-adding task

*Wave 0 de-risks the two MEDIUM-confidence research assumptions before the harness is built on them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Low-end profile *intent* (worst-case cellular) reflects a defensible pick | MEAS-03 | Judgment over the measured candidate grid (4×/6× × Slow/Fast-3G) | Inspect committed baseline; confirm pinned profile separates heavy from light components |
| Report-only CI jobs post numbers without red-building | MEAS-01/02 | Requires a live PR to observe the posted comment | Open a draft PR; confirm size + perf-diff comments appear, build stays green |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (A2 cdp privilege, A3 Lit markers)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
