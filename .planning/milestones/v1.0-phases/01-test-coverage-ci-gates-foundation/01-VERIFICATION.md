---
phase: 01-test-coverage-ci-gates-foundation
verified: 2026-08-11T23:07:03Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 1: Test Coverage + CI Gates Foundation — Verification Report

**Phase Goal:** Every component is guarded by tests and the CI pipeline blocks any merge that drops coverage, busts a bundle budget, or fails real-browser a11y — the safety net that makes the breaking API cleanup and feature work safe.
**Verified:** 2026-08-11T23:07:03Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

Verification was goal-backward and evidence-based: every gate was executed in this verifier's own process (not read from SUMMARY claims). All four CI gates run green-on-arrival on existing code, the 1:1 test invariant holds on disk, and the real-browser fidelity lane genuinely executes in Chromium.

### Observable Truths

| # | Truth (ROADMAP Success Criteria + plan truths) | Status | Evidence |
| - | ----------------------------------------------- | ------ | -------- |
| 1 | SC1 / TEST-01 — Every component has a dedicated 1:1 test file; the 20-component gap is closed and no grouped multi-component file remains. | ✓ VERIFIED | 66 `src/components/*/` dirs ↔ 66 `test/components/*.test.ts` files, exact 1:1 name mapping (0 missing, 0 extra). Grouped files `misc-display.test.ts`, `layout-primitives.test.ts`, `display-trivial.test.ts` all absent on disk. |
| 2 | SC2 / TEST-02,03,06 — The four jsdom-unprovable areas verified in a real browser: real `ElementInternals` form submission/validation, overlay focus trap + restoration, native `<dialog>`/top-layer, floating-ui positioning. | ✓ VERIFIED | `npx vitest run --project browser` → EXIT 0, 5 files / 39 tests pass in Chromium (Lit dev-mode client console warnings confirm real browser context). Files: `form-association.test.ts` (all form-associated controls, real `FormData`), `overlay-focus.test.ts` (dialog/drawer/command-palette/popover), `dialog-top-layer.test.ts`, `floating-position.test.ts`. No browser file imports `getMockInternals`/`test/setup.ts` (only comments documenting the deliberate absence). |
| 3 | SC3 / TEST-04,05 — Async/dynamic option updates keep the highlighted index clamped in bounds; teardown spies confirm attach-on-open / detach-on-close. | ✓ VERIFIED | `vi.spyOn(document,...)` teardown assertions in combobox, dropdown, context-menu, date-picker, popover, tooltip test files. Clamp assertions in combobox/select/rich-select (15–17 bound-related lines each). All run in jsdom project, EXIT 0. |
| 4 | SC4 / TEST-07,PERF-01 — CI fails when branch/per-directory coverage drops below threshold, and when any per-entry bundle exceeds its `size-limit` budget or a tree-shaking regression is detected. | ✓ VERIFIED | Coverage gate: `vitest run --project jsdom --coverage` → EXIT 0; numeric floors enforced (`branches:66` vs measured 67.54, plus per-dir overrides for combobox/select/dialog/date-picker) — a >1.5% branch regression hard-blocks. Size gate: `npx size-limit` → EXIT 0; 5 entries (core 21.3/23kB, full 51.09/55kB, button 2.2/2.5kB, data-grid 3.21/3.5kB) + tree-shaking canary (button 2.2kB vs 5kB limit; a barrel regression to ~51kB busts it). |
| 5 | SC5 / TEST-08 — axe a11y scans run in the real browser (color-contrast/region enabled) and gate CI. | ✓ VERIFIED | `test/browser/a11y.browser.test.ts` calls `checkA11y(el, [], { includeDefaultDisabled: false })`; `a11y-helper.ts` re-enables `color-contrast` and `region` when that flag is false. Runs inside the `browser` project (passed in the 39-test browser run) and is gated by the CI `browser` job. See TEST-08 tool-deviation note below. |
| 6 | Plan truth (D-06) — `npm test` runs the jsdom project only and does not require Playwright/Chromium. | ✓ VERIFIED | `package.json` `"test": "vitest --project jsdom"`; browser lane is a separate `test:browser` script. Contributor default needs no Chromium. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified — the browser fidelity behaviors are exercised by 39 passing Chromium tests, not merely present).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `vitest.config.ts` | jsdom + browser projects; root coverage thresholds (branches + per-dir) | ✓ VERIFIED | Two `test.projects`; browser project omits `setupFiles` (Pitfall 2); coverage `provider:'v8'`, numeric `branches` floor + combobox/select/dialog/date-picker overrides. |
| `.size-limit.json` | core/full/light/heavy entries + tree-shaking canary | ✓ VERIFIED | 5 entries, all with `ignore:["lit","@floating-ui/dom"]` + `gzip:true`; canary targets `dist/components/button/index.js`, not the full barrel. |
| `.github/workflows/ci.yml` | verify (coverage) / browser (Chromium+a11y) / size jobs; read-only | ✓ VERIFIED | `permissions: contents: read`; no `packages:write`. verify runs jsdom+coverage; browser installs chromium then `npm run test:browser`; size runs build then `npm run size` (Node 22 for size-limit@13). |
| `test/browser/*.test.ts` (5) | form-association, overlay-focus, dialog-top-layer, floating-position, a11y.browser | ✓ VERIFIED | All 5 present and pass in Chromium. |
| `test/helpers.ts` `deepActiveElement` | shadow-piercing active-element helper | ✓ VERIFIED | Exported at line 127; used by overlay-focus tests. |
| `package.json` deps/scripts | pinned `@vitest/browser-playwright@4.1.9`; lit peer-only; scripts | ✓ VERIFIED | Provider pinned exactly `4.1.9`; `playwright@^1.62.1`, `size-limit@^13.0.3`; `lit` only in `peerDependencies`; `test`/`test:coverage`/`test:browser`/`size` scripts present. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| browser project | native Chromium APIs (not jsdom mock) | `setupFiles` omitted; no `getMockInternals` import in `test/browser/**` | ✓ WIRED |
| `@vitest/browser-playwright` | provider load | pinned `4.1.9` == installed vitest 4.1.9 minor; browser run booted | ✓ WIRED |
| CI browser job | Chromium | `npx playwright install chromium` before `npm run test:browser` | ✓ WIRED |
| size-limit core entry | shipped size | `dist/amris-core.js` with lit/@floating-ui external; build present | ✓ WIRED |
| coverage gate | hard-block | numeric `thresholds.branches:66` above measured 67.54 | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| jsdom coverage gate green | `vitest run --project jsdom --coverage` | EXIT 0 · 67 files / 437 tests · br 67.54 ≥ 66 | ✓ PASS |
| size budget green + canary | `npx size-limit` | EXIT 0 · 5 entries under budget | ✓ PASS |
| real-browser fidelity + a11y | `vitest run --project browser` | EXIT 0 · 5 files / 39 tests in Chromium | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
| ----------- | -------------- | ------ | -------- |
| TEST-01 (1:1 dedicated test files) | 01-01/02/03/04/08 | ✓ SATISFIED | 66/66 mapping; grouped files removed |
| TEST-02 (real form-association) | 01-01/06 | ✓ SATISFIED | form-association.test.ts covers all controls with real `FormData` |
| TEST-03 (overlay focus trap/restore) | 01-05 | ✓ SATISFIED | overlay-focus.test.ts (dialog/drawer/command-palette/popover) |
| TEST-04 (async option clamp) | 01-07 | ✓ SATISFIED | clamp assertions in combobox/select/rich-select |
| TEST-05 (listener teardown spies) | 01-07 | ✓ SATISFIED | spyOn(document,...) in 6 component tests |
| TEST-06 (real-browser lane, 4 areas) | 01-01/05 | ✓ SATISFIED | form/focus/dialog-top-layer/floating-position all pass in Chromium. Virtualization scroll/focus clause of the requirement text is a Phase 4 feature (not yet built) and is excluded from SC2 — deferred, not a gap. |
| TEST-07 (branch + per-dir coverage gate) | 01-01/08 | ✓ SATISFIED | numeric branch floor + per-dir overrides; gate hard-blocks |
| TEST-08 (browser axe, contrast/region, gate CI) | 01-01 | ✓ SATISFIED (tool deviation) | in-browser axe-core with contrast/region enabled, gated by browser CI job. See note. |
| PERF-01 (size-limit budgets + tree-shaking) | 01-01/08 | ✓ SATISFIED | 5 entries + tree-shaking canary, hard-blocking |

All 9 declared requirement IDs are accounted for; none orphaned (REQUIREMENTS.md maps exactly TEST-01…TEST-08 + PERF-01 to Phase 1, all marked Complete).

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX` debt markers in `test/`, `vitest.config.ts`, `.size-limit.json`, or `.github/workflows/ci.yml`. split-view behavioral test correctly asserts only the real implementation surface (am-resize + clamp + aria-orientation) and explicitly avoids the out-of-scope `aria-valuenow`/keyboard-resize assertions (line 9 is a comment documenting the deliberate omission).

### Notes / Intentional Deviations

- **TEST-08 tool choice (OQ-2):** The requirement text names `@axe-core/playwright`, but the implementation uses in-browser `axe-core` (already a dependency) run inside the Vitest browser project. This is a documented research decision (OQ-2): `AxeBuilder` needs a Node-side Playwright `Page` that Vitest Browser Mode does not expose. The observable Success Criterion #5 ("axe a11y scans run in the real browser with color-contrast/region enabled and gate CI") is fully met; only the parenthetical package suggestion differs. Not a gap — the intent and observable outcome are satisfied.
- **Test-only/config-only phase:** Component source was intentionally not modified; behavior-documenting tests assert current real behavior. Consistent with green-on-arrival across all four gates. Findings surfaced for Phase 3 (FIX-02/FIX-03) and Phase 4 (PERF-04) were captured, not fixed — correct per scope.

### Gaps Summary

No gaps. The Phase 1 safety net is complete and proven: 66/66 components have dedicated 1:1 tests; the coverage, bundle-size (incl. tree-shaking canary), real-browser fidelity, and in-browser a11y gates all run green on existing code and hard-block on regression; CI is PR-triggered and read-only; local `npm test` stays jsdom-only.

---

_Verified: 2026-08-11T23:07:03Z_
_Verifier: Claude (gsd-verifier)_
