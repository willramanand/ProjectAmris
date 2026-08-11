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

> Planner replaces these placeholder rows with the actual per-task IDs. One row per requirement anchor below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | TEST-01 | — | N/A | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-02 | — | Real form submit/validation participation | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-03 | — | Focus trap + restoration | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-04 | — | Async option index clamp | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-05 | — | Listener attach/detach teardown spies | unit (jsdom) | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-06 | — | 4 jsdom-unprovable areas in Chromium | browser | `npm run test:browser` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-07 | — | Branch + per-dir coverage gate | CI gate | `npm run test:coverage` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEST-08 | — | Real-browser axe (color-contrast/region) | a11y gate | `npm run test:a11y` (browser) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PERF-01 | — | Per-entry size-limit + tree-shaking assertion | CI gate | `npx size-limit` | ❌ W0 | ⬜ pending |

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
