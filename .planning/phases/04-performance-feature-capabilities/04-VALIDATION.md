---
phase: 4
slug: performance-feature-capabilities
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0, two projects (`jsdom`, `browser`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` (jsdom project, watch) |
| **Full suite command** | `npm run test:run` (both projects) |
| **Browser lane** | `npm run test:browser` (Chromium, `test/browser/**`) |
| **A11y lane** | `npm run test:a11y` |
| **Estimated runtime** | ~30–90 seconds (full), browser lane adds Chromium startup |

**Critical lane boundary:** the jsdom project mocks `ElementInternals`, `ResizeObserver`, `matchMedia`, `HTMLDialogElement`; the browser project omits `setupFiles` and uses native APIs. Therefore **virtualization scroll/focus/ARIA, real `validationMessage`, `:user-invalid` timing, focus restoration, and composedPath suppression MUST live in `test/browser/`** — jsdom cannot prove any of them. Planner: assign these behaviors to browser-lane test files.

---

## Sampling Rate

- **After every task commit:** Run `npm test` (jsdom quick lane).
- **After every plan wave:** Run `npm run test:run` (both projects); add `npm run test:browser` for any virtualization / validation / shortcut wave.
- **Before `/gsd-verify-work`:** Full suite + `npm run test:a11y` green; CEM baseline regenerated and Changeset present for `am-shortcuts` + `setCustomError`.
- **Max feedback latency:** ~90 seconds (jsdom quick lane; browser lane on wave boundaries only).

---

## Per-Requirement Verification Map

> Requirement-level from research; the planner refines to `{N}-PP-TT` task IDs and fills Plan/Wave once PLAN.md files exist.

| Requirement | Behavior | Test Type | Lane / File | File Exists? |
|-------------|----------|-----------|-------------|-------------|
| FEAT-01 | Error visible on blur/submit, never first paint (D-01) | unit + browser | `test/browser/validation-timing.test.ts` | ❌ W0 |
| FEAT-01 | Inner input `aria-describedby`→same-root `id`, `aria-invalid` toggles, AT announces | browser | `test/browser/validation-aria.test.ts` | ❌ W0 |
| FEAT-01 | Error replaces hint, hint returns on clear (D-02) | jsdom | `test/components/field.test.ts` | ❌ W0 |
| FEAT-01 | Politeness: polite per-field / assertive on submit (D-04) | browser | `test/browser/validation-aria.test.ts` | ❌ W0 |
| FEAT-02 | `setCustomError` overrides native; `setCustomError('')` falls back (D-03) | jsdom (logic) + browser (real msg) | `test/components/validation-controller.test.ts` | ❌ W0 |
| FEAT-03 | Conflict refuse+report no-throw (D-11); reserved-combo refused (D-10) | jsdom | `test/internal/shortcut-registry.test.ts` | ❌ W0 |
| FEAT-03 | `mod`/`opt` platform normalization; scope-stacking resolution | jsdom | `test/internal/shortcut-registry.test.ts` | ❌ W0 |
| FEAT-03 | Single-key suppressed while typing; composedPath across shadow roots; `isComposing` | browser | `test/browser/shortcuts-context.test.ts` | ❌ W0 |
| FEAT-04 | Provider-present → registered/rebindable; absent → mod+k fallback (D-09) | jsdom + browser | `test/components/command-palette.test.ts` (+browser) | exists (extend) |
| PERF-02 | 1000+ rows: `aria-rowcount` full total, per-row `aria-rowindex`, selection survives scroll | browser | `test/browser/data-grid-virtual.test.ts` | ❌ W0 |
| PERF-03 | Option `aria-setsize`/`posinset` full total; `aria-activedescendant` scrolls target into window; form value preserved | browser | `test/browser/combobox-virtual.test.ts` | ❌ W0 |
| PERF-03 | Does NOT reintroduce FIX-02 clamp / FIX-03 focus regressions | jsdom + browser | existing combobox tests + new browser | partial |
| PERF-04 | `autoUpdate` starts only on open transition, stops on close+disconnect | jsdom (spy) | per-overlay teardown-spy tests (TEST-05 pattern) | partial (extend) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/browser/validation-timing.test.ts` — FEAT-01 D-01 timing (real ElementInternals)
- [ ] `test/browser/validation-aria.test.ts` — FEAT-01 same-root describedby + politeness (D-04)
- [ ] `test/components/validation-controller.test.ts` — FEAT-02 D-03 precedence logic
- [ ] `test/internal/shortcut-registry.test.ts` — FEAT-03 conflict/blocklist/scope/normalization
- [ ] `test/browser/shortcuts-context.test.ts` — FEAT-03 composedPath / typing suppression / isComposing
- [ ] `test/browser/data-grid-virtual.test.ts` — PERF-02 rowcount/rowindex/selection-under-scroll
- [ ] `test/browser/combobox-virtual.test.ts` — PERF-03 setsize/posinset/activedescendant-scroll/form value
- [ ] Extend `test/components/command-palette.test.ts` — D-09 fallback + provider path
- [ ] Re-baseline coverage thresholds (`vitest.config.ts`) after new controllers land (currently branches 67 / fns 82 / lines 84 / stmts 83)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile screen-reader `aria-activedescendant` behavior under virtualization | PERF-02/03 | Documented SR limitation — automated harness cannot assert real mobile SR; research says document, don't pretend | Verify documented limitation note exists in JSDoc/RESEARCH; no automated assertion attempted |

*Automated coverage proves the remaining phase behaviors.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (7 new test files above)
- [ ] Browser-lane behaviors (virtualization/validation-timing/composedPath) NOT placed in jsdom lane
- [ ] No watch-mode flags in CI commands
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
