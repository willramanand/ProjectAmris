---
phase: 1
slug: test-coverage-ci-gates-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 01-RESEARCH.md `## Validation Architecture`. Planner refines the per-task map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (jsdom project = existing; browser project = Chromium via @vitest/browser-playwright) |
| **Config file** | `vitest.config.ts` (gains `projects: [jsdom, browser]` + `coverage.thresholds`) |
| **Quick run command** | `npm test` (jsdom only — no Playwright required locally) |
| **Full suite command** | `npm run test:run && npm run test:browser` |
| **Estimated runtime** | ~30s jsdom; browser lane adds Chromium boot (~CI only) |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (jsdom lane)
- **After every plan wave:** Run `npm run test:coverage` (branch + per-dir thresholds)
- **Before `/gsd-verify-work`:** Full suite (jsdom + browser + a11y + size-limit) must be green
- **Max feedback latency:** ~30s (jsdom); browser lane is CI-gated per D-06

---

## Per-Task Verification Map

> Plan/wave anchors set from the approved 8-plan set. `/gsd-validate-phase` refines Task IDs to the executor's actual per-task commits and flips `nyquist_compliant`.

| Task ID | Plan(s) | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|---------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| per-plan | 01,02,03,04,08 | 1–3 | TEST-01 | — | 23 dedicated 1:1 test files; 3 grouped files deleted | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| per-plan | 01,06 | 1–2 | TEST-02 | — | Real form submit/validation participation | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| per-plan | 05 | 2 | TEST-03 | — | Focus trap + restoration | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| per-plan | 07 | 2 | TEST-04 | — | Async option index clamp | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| per-plan | 07 | 2 | TEST-05 | — | Listener attach/detach teardown spies | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| per-plan | 01,05 | 1–2 | TEST-06 | — | 4 jsdom-unprovable areas in Chromium (virtualization scroll/focus sub-clause deferred to Phase 4 — feature not built yet) | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| per-plan | 01,08 | 1,3 | TEST-07 | — | Branch + per-dir coverage gate (jsdom project only, OQ-1) | CI gate | `npm run test:coverage` | ❌ W0 | ⬜ pending |
| per-plan | 01 | 1 | TEST-08 | — | Real-browser in-browser axe-core, color-contrast/region re-enabled (OQ-2) | a11y gate | `npm run test:a11y` (browser) | ❌ W0 | ⬜ pending |
| per-plan | 01,08 | 1,3 | PERF-01 | — | Per-entry size-limit + tree-shaking canary | CI gate | `npx size-limit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — `projects` split (jsdom + browser) + `coverage.thresholds` scaffolded
- [ ] `test/setup.ts` — mocks scoped to the jsdom project only (browser project omits them)
- [ ] `@vitest/browser-playwright@4.1.9`, `playwright`, `size-limit` + `@size-limit/preset-small-lib`, axe wiring installed (per 01-RESEARCH.md versions)
- [ ] `.size-limit.json` (or package.json field) — per-entry budgets scaffolded

*Existing jsdom infrastructure (46 test files, test/helpers.ts, test/a11y-helper.ts) covers the reuse surface; Wave 0 only adds the browser project + gate config.*

---

## Manual-Only Verifications

*All Phase 1 behaviors have automated verification — the phase's entire output is automated tests + CI gates. No manual-only verifications.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (jsdom lane)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
