# Phase 1: Test Coverage + CI Gates Foundation - Research

**Researched:** 2026-08-10
**Domain:** Test-safety-net + CI quality gates for a Lit 3 / Web Components library (Vitest 4 hybrid jsdom+browser, coverage/bundle/a11y gates)
**Confidence:** HIGH (test gap, config shapes, versions); MEDIUM (browser-project coverage provider, `@axe-core/playwright` vs in-browser axe mechanics)

> This is **phase-scoped planning research** layered on top of the authoritative project research. The tooling *survey* is already settled in `.planning/research/STACK.md` (versions, install commands, "what NOT to add", version-compat matrix) and is not re-derived here. This document answers the concrete, phase-specific questions the planner needs: the exact test gap, how to measure the coverage baseline, the precise `projects`/coverage/size-limit/a11y config for *this* repo, the real-browser assertion patterns, and the CI job shape — plus two flagged mechanics the planner must resolve.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Coverage ratchet):** Ratchet-from-baseline — measure current coverage, set the gate at that floor immediately (blocks any regression from PR one), raise it as the 20 components land, converge on a committed end-of-phase floor. Reversible (threshold numbers in `vitest.config.ts`).
- **D-02 (Branch + per-directory tiers):** Gate on **branch coverage** (not lines-only) with **per-directory tiers** — stricter on form/overlay directories, looser on simple display. Reversible.
- **D-03 (Claude's discretion):** Exact end-of-phase threshold numbers per tier are Claude's to set during planning from the measured baseline + per-component risk. Research starting point: branch ≥80, lines/functions/statements ≥85 (STACK.md) — a ceiling to ratchet toward, NOT a day-one gate.
- **D-04 (Tiered test depth):** Simple/stateless display (icon, divider, spinner, badge, skeleton): render + attribute/ARIA-reflection smoke. Interactive/stateful: full behavioral (events, keyboard, disabled/readonly, state transitions). User explicitly chose tiered over a mandatory required-scenarios checklist — do NOT impose a heavyweight per-component scenario contract. Reversible.
- **D-05 (Enforce-as-it-lands):** Each gate hard-blocks the moment its wiring PR lands (no report-only-then-flip). Baselines captured in the same change so the gate is green-on-arrival and only fails on regression. Reversible.
- **D-06 (Local vs CI split):** Real-browser lane (+ real-browser a11y) runs on **every PR** in CI via headless Chromium. Local default `npm test` stays **jsdom-only** (no Playwright required to contribute); browser lane is an opt-in script (`npm run test:browser`). Reversible.
- **D-07 (Size ratchet):** Set per-entry `size-limit` budgets by measuring each entry's current min+gzip and adding ~5–10% headroom; ratchet down later. Reversible.
- **D-08 (What to budget):** Budget the **core** bundle, the **full** bundle, a few **representative single-component deep imports** (e.g. button + a heavy one like data-grid), plus a **tree-shaking assertion** (import one component, assert output stays tiny) to catch a barrel silently pulling in all components. Not every per-component entry gets a budget. Reversible.
- **D-09 (Claude's discretion):** Exact per-entry kB numbers and which representative components to budget are Claude's to set during planning from real build output.

### Pre-decided upstream (LOCKED — do NOT re-litigate)
- **Vitest 4 Browser Mode + Playwright provider (`@vitest/browser-playwright`)** for the real-browser lane — NOT `@web/test-runner`. Hybrid: keep all existing jsdom tests as a `jsdom` project; add a `browser` (Chromium) project via Vitest `projects`. Provider minor MUST track `vitest`. Costly to reverse.
- **`size-limit` + `@size-limit/preset-small-lib`** for bundle budgets (not `bundlesize`).
- **`@axe-core/playwright`** runs the a11y suite in the real browser so `color-contrast`/`region` (disabled under jsdom) actually execute. *(See Open Question OQ-2 — package mechanics vs Vitest browser mode.)*
- **`@vitest/coverage-v8`** (installed) for the coverage gate — enable thresholds, no new dep. If browser-project V8 instrumentation misbehaves, fall back to `@vitest/coverage-istanbul` for that project only *(see OQ-1 — this is a global provider setting, nuance).* MEDIUM-confidence, flagged for this research.
- **The 4 jsdom-unprovable browser-lane areas** are fixed: (1) real `ElementInternals` form submission/validation, (2) overlay focus trap + restoration, (3) native `<dialog>`/top-layer, (4) floating-ui positioning. WebKit/Safari lane deferred to v2 (TEST-V2-01) — Chromium only for v1.

### Deferred Ideas (OUT OF SCOPE)
- Mutation testing (Stryker) spot-check on combobox/dialog/form base — follow-up hardening only, NOT Phase 1.
- WebKit/Safari 16.4 real-browser lane (TEST-V2-01) — v2, Chromium-only for v1.
- `@microsoft/api-extractor` `.d.ts` surface guard (TEST-V2-02) — deferred; CEM diff (Phase 2/6) is the primary surface guard.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Every component has a dedicated test file (1:1) | §Test Gap — **exact 23-component list** + D-04 tier classification + which 3 grouped files to split |
| TEST-02 | Form controls verified for real form submission/validation (real `ElementInternals`) | §Browser-Lane Assertion Patterns → form-association pattern; §Component→Lane map |
| TEST-03 | Overlay focus trap + restoration verified (dialog, drawer, command-palette, popover) | §Browser-Lane Assertion Patterns → focus-trap pattern |
| TEST-04 | Async/dynamic option updates — combobox/select rapid updates, highlighted index clamped | §jsdom-Lane Assertion Patterns → clamp pattern (runs in jsdom, not browser) |
| TEST-05 | Global listener lifecycle with teardown spies (attach on open, detach on close/disconnect) | §jsdom-Lane Assertion Patterns → listener-spy pattern (runs in jsdom) |
| TEST-06 | Minimal real-browser lane (Vitest 4 Browser Mode + Playwright/Chromium) covering the 4 areas | §Vitest `projects` Split config |
| TEST-07 | Branch + per-directory coverage threshold gate (`@vitest/coverage-v8`) | §Coverage Gate — baseline measurement + per-dir thresholds + OQ-1 |
| TEST-08 | axe a11y in the real browser (color-contrast/region enabled), gates CI (`@axe-core/playwright`) | §a11y Browser Lane + OQ-2 |
| PERF-01 | Bundle-size budgets in CI — `size-limit`, min+gzip, per-entry, tree-shaking assertion | §Bundle-Size Gate config |
</phase_requirements>

## Summary

Every one of the **66 components already has *some* test coverage** — the "20-component gap" is really a **1:1-file gap of 23 components** whose tests currently live inside three *grouped* files (`layout-primitives.test.ts`, `misc-display.test.ts`, `display-trivial.test.ts`). TEST-01 ("1:1 test-per-component") therefore means **splitting those three grouped files into 23 dedicated `test/components/{name}.test.ts` files**, expanding depth per D-04 (22 stay smoke, only `split-view` is genuinely interactive). This reframes TEST-01 from "write 23 tests from scratch" to "split + lightly harden 23 existing test blocks," which is materially less work and changes how the planner should size tasks. `.planning/codebase/CONCERNS.md` says "20" but its own list enumerates 23 — the correct number is **23** (verified this session by diffing `src/components/*/` against `test/components/*.test.ts`).

The **coverage gate** (TEST-07) is a global root-level `test.coverage` config with `thresholds` (branch + per-file `perFile`/`thresholds['directory/**']` glob overrides for the per-directory tiers). Measure the baseline by running `vitest run --coverage` against the **jsdom project only** and reading the branch/line/function/statement numbers, then set thresholds at that floor (D-01). Recommendation: **fold coverage over the jsdom project, not the browser project** — the jsdom project (46 files) exercises essentially all component logic; the browser lane is a small fidelity harness. This sidesteps the flagged v8-in-browser question entirely (OQ-1).

The **browser lane** (TEST-06) is a second Vitest `project` (`browser`, Playwright/Chromium) that OMITS `test/setup.ts` mocks and holds only the 4 fidelity areas + the a11y suite. **TEST-04 (index clamp) and TEST-05 (listener teardown) do NOT need the browser** — they are logic/lifecycle assertions that run in the jsdom project. The **a11y lane** wants axe to run in a real browser with `color-contrast`/`region` re-enabled; note OQ-2 — in Vitest browser mode the idiomatic path is `axe-core` in-browser (the existing `checkA11y` helper, minus the two disables), because `@axe-core/playwright`'s `AxeBuilder` targets a Node-side Playwright `Page` that Vitest browser mode does not hand you directly.

**Primary recommendation:** Split the 3 grouped files into 23 dedicated files (22 smoke / 1 behavioral); add a `browser` Vitest project for the 4 fidelity areas + a11y (deleting the jsdom mocks there); measure coverage on the jsdom project and set branch+per-dir thresholds at the baseline; wire `size-limit` at 4–5 dist entries + 1 tree-shaking assertion; add a CI `browser` job (`playwright install chromium`) and coverage/size gates, each hard-blocking, keeping local `npm test` jsdom-only.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Component logic tests (props/events/ARIA/state) | jsdom project (Node + jsdom) | — | Fast, no browser boot; covers 66 components' logic; keeps local `npm test` contributor-friendly (D-06) |
| Real `ElementInternals` form submission/validation (TEST-02) | browser project (Chromium) | — | Not polyfillable; jsdom mocks it — must assert the real API in a real `<form>` |
| Overlay focus trap + restoration (TEST-03) | browser project (Chromium) | — | jsdom has no focus model / `:focus-visible` / top-layer |
| Native `<dialog>` / top-layer, floating-ui positioning (TEST-06) | browser project (Chromium) | — | Real layout + top-layer semantics only exist in a real browser |
| Async option-update index clamping (TEST-04) | jsdom project | — | Pure logic (highlighted-index bounds) — no real-browser dependency |
| Global listener attach/detach lifecycle (TEST-05) | jsdom project | — | Spy on `document.addEventListener`/`removeEventListener` — runs anywhere |
| a11y scan with color-contrast/region (TEST-08) | browser project (in-browser `axe-core`) | — | Needs real computed styles; runs inside the browser project (OQ-2) |
| Coverage measurement + gate (TEST-07) | jsdom project (root `test.coverage`) | (browser optional) | Root-level global config; jsdom covers ~all logic; browser excluded to avoid v8-in-browser complexity |
| Bundle-size + tree-shaking budget (PERF-01) | CI job over `dist/` (Node, `size-limit`) | — | Post-build artifact measurement; independent of the test runner |

## Test Gap — The Exact 23-Component 1:1 Gap (TEST-01)

**Verified this session:** `src/components/*/index.ts` → **66 component directories** [VERIFIED: Glob `src/components/**/index.ts`, 66 results]. `test/components/*.test.ts` → **46 test files**, of which **43 are dedicated 1:1** and **3 are grouped** multi-component files [VERIFIED: Glob `test/components/*.test.ts` + Read of the 3 grouped files].

Every component has coverage; **23 lack a *dedicated* file** because they are bundled into 3 grouped files:

| Grouped file | Components covered (need splitting into dedicated files) | Count |
|---|---|---|
| `test/components/layout-primitives.test.ts` | `stack`, `grid`, `surface`, `panel`, `card` | 5 |
| `test/components/misc-display.test.ts` | `table`, `link-button`, `icon` | 3 |
| `test/components/display-trivial.test.ts` | `button-group`, `empty-state`, `error-text`, `field`, `hint-text`, `label`, `nav-bar`, `progress-ring`, `side-nav`, `split-view`, `stat`, `status-dot`, `timeline`, `visually-hidden`, `app-shell` (+ `am-breadcrumb-item`, whose parent `breadcrumb` already has a dedicated file) | 15 |

[VERIFIED: `test/components/layout-primitives.test.ts:3-7`, `test/components/misc-display.test.ts:3-5`, `test/components/display-trivial.test.ts:3-18` — imports read verbatim this session]

**The 23:** `app-shell, button-group, card, empty-state, error-text, field, grid, hint-text, icon, label, link-button, nav-bar, panel, progress-ring, side-nav, split-view, stack, stat, status-dot, surface, table, timeline, visually-hidden`.

**Correction for the planner:** `.planning/codebase/CONCERNS.md:104` header says "20 untested components" but the enumerated list at `CONCERNS.md:154` contains **23** names (matching the diff above). **The number is 23, not 20.** [VERIFIED: independent diff of Glob results this session]

**What TEST-01 actually requires:** create 23 dedicated `test/components/{name}.test.ts` files (mirroring `src/components/{name}/`, the established 1:1 layout) and remove/retire the 3 grouped files once their content is redistributed. The existing grouped assertions are mostly smoke-level and can be lifted directly, then hardened per D-04.

### D-04 Tier Classification of the 23

| Tier | Components | Depth |
|------|-----------|-------|
| **Smoke** (render + attribute/ARIA-reflection) | `app-shell`, `button-group`, `card`, `empty-state`, `error-text`, `field`, `grid`, `hint-text`, `icon`, `label`, `link-button`, `nav-bar`, `panel`, `progress-ring`, `side-nav`, `stack`, `stat`, `status-dot`, `surface`, `table`, `timeline`, `visually-hidden` (22) | Render, slot presence, attribute/`role`/`aria-*` reflection, part exposure. The grouped files already do most of this. |
| **Full behavioral** (events/keyboard/state) | `split-view` (1) | Has a draggable/keyboard-resizable divider + dynamic `position` prop — assert drag/keyboard resize, `position` clamping, orientation. |

Notes for the planner:
- `link-button` and `side-nav-item` have minor conditional logic (`disabled` → omits `href`, sets `aria-disabled`/`tabindex="-1"`; `active` reflection). These stay **smoke** per D-04 but merit 2–3 targeted assertions (the existing `misc-display`/`display-trivial` blocks already cover them — carry them over). [VERIFIED: `test/components/misc-display.test.ts:49-57`, `display-trivial.test.ts:131-139`]
- Several directories register **multiple elements** — the dedicated file per directory must cover all: `breadcrumb` (`am-breadcrumb` + `am-breadcrumb-item`), `side-nav` (`am-side-nav` + `am-side-nav-item`), `timeline` (`am-timeline` + `am-timeline-item`). `am-breadcrumb-item` currently lives in `display-trivial` while `am-breadcrumb` has its own file — consolidate the item into `breadcrumb.test.ts`. [VERIFIED: `display-trivial.test.ts:21-33`]

### Component → Lane Map for TEST-02/03/04/05 (existing components, new assertions)

These requirements add assertions to **existing** well-covered components; they are separate from the 23-file split.

| Req | Lane | Components | Assertion focus |
|-----|------|-----------|-----------------|
| TEST-02 | **browser** | `input, textarea, checkbox, radio, switch, select, combobox, rich-select, slider, number-field, search-field, input-otp, date-picker, time-picker, color-picker, file-upload` (all `formAssociated`) | Real `ElementInternals`: `setFormValue`, participation in a real `<form>`, `FormData` on submit, `setValidity`/`validationMessage`, `:user-invalid` timing |
| TEST-03 | **browser** | `dialog, drawer, command-palette, popover` | Focus trap (Tab cycles within), focus **restoration** to opener on close, `isConnected` guard when opener removed, Escape |
| TEST-04 | **jsdom** | `combobox, select, rich-select` | Rapid/async `options` replacement while open → highlighted index stays clamped in `[0, len-1]`; stale filter not retained |
| TEST-05 | **jsdom** | `combobox, dropdown, context-menu, date-picker, popover, tooltip` | Spy `document.addEventListener`/`removeEventListener` (or per-instance handler counts): attach on open, detach on close AND on `disconnectedCallback` |

[Component lists CITED: `.planning/codebase/CONCERNS.md:45,65,72,78,84`; formAssociated set cross-checked against ElementInternals users listed there.]

## Standard Stack

The full survey (rationale, alternatives, "what NOT to add") lives in `.planning/research/STACK.md`. Versions below were **re-verified against the npm registry this session** and reconciled to the **installed Vitest 4.1.9**.

### Additions (dev-only)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@vitest/browser-playwright` | **4.1.9** | Playwright provider for Vitest Browser Mode | **Pin to match installed `vitest` (4.1.9)** — provider minor MUST track vitest. Latest is 4.1.10; 4.1.9 exists and aligns exactly. Bump both together. [VERIFIED: npm registry — versions include `4.1.9` and `4.1.10`] |
| `playwright` | 1.62.1 | Chromium binaries/driver behind the provider | `npx playwright install chromium` (Chromium only for v1; WebKit deferred). [VERIFIED: npm registry] |
| `size-limit` | 13.0.3 | Per-entry bundle budgets, fails CI on regression | Understands tree-shaking + gzip. [VERIFIED: npm registry] |
| `@size-limit/preset-small-lib` | 13.0.3 | size-limit preset for libraries (esbuild + gzip) | [VERIFIED: npm registry] |
| `@axe-core/playwright` | 4.12.1 | Real-browser axe | LOCKED upstream, but see OQ-2 — the in-browser `axe-core` path is the mechanically clean fit for Vitest browser mode. [VERIFIED: npm registry] |

### Already installed (no new dep)

| Library | Installed | Use in this phase |
|---------|-----------|-------------------|
| `vitest` | 4.1.9 | Gains `projects` array (`jsdom` + `browser`) + `test.coverage.thresholds` [VERIFIED: `node_modules/vitest/package.json`] |
| `@vitest/coverage-v8` | 4.1.9 | Enable `coverage.thresholds`; browser variant is `@vitest/coverage-v8/browser` if browser coverage is ever wanted (OQ-1) [VERIFIED: `node_modules/@vitest/coverage-v8/package.json`] |
| `axe-core` | 4.11.1 | Runs in-browser in the browser project with `color-contrast`/`region` re-enabled (existing `test/a11y-helper.ts`) [VERIFIED: `package.json:84`] |
| `jsdom` | 29.0.0 | Backs the `jsdom` project only [VERIFIED: `package.json:87`] |

**Installation:**
```bash
npm install -D @vitest/browser-playwright@4.1.9 playwright@1.62.1
npx playwright install chromium
npm install -D size-limit@13 @size-limit/preset-small-lib@13
# @axe-core/playwright only if OQ-2 resolves toward the AxeBuilder path:
# npm install -D @axe-core/playwright@4.12.1
```

### Alternatives Considered (settled upstream — do not revisit)
| Instead of | Rejected alternative | Why |
|------------|----------------------|-----|
| Vitest Browser Mode | `@web/test-runner` + `@open-wc/testing` | Second runner + full helper rewrite mid-hardening; 46 existing files carry over on Vitest |
| `size-limit` | `bundlesize` | Unmaintained, no tree-shaking awareness |
| In-CI coverage gate | Codecov/Coveralls | Adds secrets for a private lib; in-CI `thresholds` suffice |

## Package Legitimacy Audit

Ran `npm view` per package this session; all are mainstream, high-adoption, long-lived packages under the Vitest / Playwright / `ai` (size-limit) orgs.

| Package | Registry | Age/Maturity | Source Repo | Verdict | Disposition |
|---------|----------|--------------|-------------|---------|-------------|
| `@vitest/browser-playwright` | npm | Vitest 4 org package, active | github.com/vitest-dev/vitest | OK | Approved (pin 4.1.9) |
| `playwright` | npm | Microsoft, years, ~M/wk | github.com/microsoft/playwright | OK | Approved |
| `size-limit` | npm | 8+ yrs, ai/size-limit | github.com/ai/size-limit | OK | Approved |
| `@size-limit/preset-small-lib` | npm | same monorepo as size-limit | github.com/ai/size-limit | OK | Approved |
| `@axe-core/playwright` | npm | Deque official | github.com/dequelabs/axe-core-npm | OK | Approved (pending OQ-2) |

**Removed (SLOP):** none. **Flagged (SUS):** none. All five resolve to well-known org repos and were version-verified this session.

## Architecture Patterns

### System Architecture Diagram (test + CI data flow)

```
                         ┌──────────────────────── Local dev ────────────────────────┐
   npm test  ───────────▶│  Vitest (jsdom project ONLY)                                │
   (contributor default) │   • test/**/*.test.ts minus browser/*                       │
                         │   • setupFiles: test/setup.ts (ElementInternals/dialog/... mocks) │
                         └────────────────────────────────────────────────────────────┘

   npm run test:browser ─▶ Vitest (browser project) ─▶ @vitest/browser-playwright ─▶ Chromium
                              • test/browser/**/*.test.ts (4 fidelity areas + a11y)
                              • NO test/setup.ts mocks (native ElementInternals/<dialog>/RO/matchMedia)

   ┌──────────────────────────────── CI (.github/workflows/ci.yml, Node 20) ───────────────────────────────┐
   │  job: verify            npm ci → tsc --noEmit → vitest run (jsdom) --coverage → build                   │
   │       coverage gate ────▶ test.coverage.thresholds (branch + per-dir)  ── hard block (D-05)             │
   │  job: browser           npm ci → playwright install chromium → vitest run --project browser              │
   │       (incl. a11y)  ────▶ real-browser form/focus/dialog/floating-ui + axe(color-contrast/region) block  │
   │  job: size              npm ci → build → size-limit                                                       │
   │       budget gate  ─────▶ per-entry min+gzip + tree-shaking assertion  ── hard block                     │
   └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Test Structure
```
test/
├── components/              # jsdom project — 1:1 dedicated files (43 today → 66 after split)
│   ├── {component}.test.ts  # split the 3 grouped files into 23 new dedicated files (TEST-01)
│   └── ...
├── browser/                 # browser project — 4 fidelity areas + a11y (NEW)
│   ├── form-association.test.ts   # TEST-02
│   ├── overlay-focus.test.ts      # TEST-03
│   ├── dialog-top-layer.test.ts   # TEST-06 (native <dialog>)
│   ├── floating-position.test.ts  # TEST-06 (floating-ui)
│   └── a11y.browser.test.ts       # TEST-08 (axe in-browser, color-contrast/region ON)
├── a11y.test.ts             # existing — either move to browser/ or keep a jsdom smoke subset
├── a11y-helper.ts           # reused; drop the color-contrast/region disables in the browser lane
├── helpers.ts               # reused across BOTH projects (goal: minimal divergence)
└── setup.ts                 # jsdom project ONLY (scoped via project.setupFiles)
```

### Pattern 1: Vitest `projects` split (TEST-06)
**What:** One config, two projects. `setupFiles` are **per-project** — the mocks stay only on `jsdom`.
```ts
// vitest.config.ts — Source: vitest.dev/guide/browser + projects config
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // logic lane — keeps existing mocks; local default
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['test/**/*.test.ts'],
          exclude: ['test/browser/**'],
          setupFiles: ['./test/setup.ts'],   // ElementInternals/dialog/RO/matchMedia mocks
          restoreMocks: true,
        },
      },
      {
        // fidelity lane — NO mocks; real Chromium
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          // setupFiles intentionally OMITTED — Chromium implements these natively
          browser: {
            enabled: true,
            provider: 'playwright',          // from @vitest/browser-playwright
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    // coverage is ROOT-level (global) — see Coverage Gate / OQ-1
    coverage: { /* ... */ },
  },
});
```
`package.json` scripts: `"test": "vitest --project jsdom"` (contributor default, D-06), `"test:browser": "vitest run --project browser"`, `"test:coverage": "vitest run --project jsdom --coverage"`, keep `"test:run"`. [Config shape CITED: vitest.dev projects/browser docs; current single-env config VERIFIED: `vitest.config.ts:1-10`]

### Pattern 2: Real ElementInternals form submission (TEST-02, browser lane)
**What:** Assert against a **real** `<form>` + `FormData`, NOT `getMockInternals()`.
```ts
// test/browser/form-association.test.ts — browser project
import '../../src/components/checkbox/checkbox';
import { fixture } from '../helpers';

it('participates in a real form submit', async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><am-checkbox name="terms" checked>Accept</am-checkbox></form>');
  const el = form.querySelector('am-checkbox')!;
  const data = new FormData(form);
  expect(data.get('terms')).toBe('on');          // real ElementInternals.setFormValue
  // validity:
  (el as any).required = true; (el as any).checked = false;
  expect(form.checkValidity()).toBe(false);        // real setValidity participation
});
```
**Do NOT** import `getMockInternals` in the browser project — the mock does not exist there. [Pattern basis CITED: `.planning/research/STACK.md:33`; mock boundary VERIFIED: `test/setup.ts:1-30` + `.planning/codebase/TESTING.md:280-293`]

### Pattern 3: Focus trap + restoration (TEST-03, browser lane)
**What:** Real focus model — assert `document.activeElement` (pierce shadow with `deepActiveElement`), Tab cycling, and restoration to the opener guarded by `isConnected`.
```ts
it('restores focus to the opener on close', async () => {
  const opener = await fixture<HTMLButtonElement>('<button>open</button>');
  opener.focus();
  const dlg = document.createElement('am-dialog'); document.body.append(dlg);
  (dlg as any).open = true; await (dlg as any).updateComplete;
  // ...focus is trapped inside; Tab cycles within dlg...
  (dlg as any).open = false; await (dlg as any).updateComplete;
  expect(document.activeElement).toBe(opener);     // restoration
});
```
Cross-references FIX-03 (Phase 3) — this test *reveals* the `isConnected` guard need but does not fix it here (capture for Phase 3). [CITED: `.planning/codebase/CONCERNS.md:83-87`]

### Pattern 4: Async index clamp (TEST-04) + listener teardown spy (TEST-05) — jsdom lane
```ts
// TEST-04 — clamp stays in bounds after rapid option replacement (jsdom)
el.options = manyOptions; (el as any).highlightedIndex = 40;
el.options = [oneOption]; await waitForUpdate(el);
expect((el as any).highlightedIndex).toBeLessThan((el as any).options.length);

// TEST-05 — listener attach on open, detach on close/disconnect (jsdom)
const add = vi.spyOn(document, 'addEventListener');
const remove = vi.spyOn(document, 'removeEventListener');
(el as any).open = true;  await waitForUpdate(el);  expect(add).toHaveBeenCalled();
(el as any).open = false; await waitForUpdate(el);  expect(remove).toHaveBeenCalled();
el.remove();                                        expect(remove).toHaveBeenCalledTimes(/* balanced */);
```
These need no real browser — keep them in `test/components/` (jsdom project). [CITED: `.planning/codebase/CONCERNS.md:71-81`]

### Anti-Patterns to Avoid
- **Carrying `getMockInternals()`/`showModal` mocks into the browser project.** The whole point of the lane is native APIs — scope `test/setup.ts` to the `jsdom` project only. [VERIFIED: `01-CONTEXT.md:75`]
- **Forcing every contributor to `playwright install`.** Keep `npm test` = jsdom project (D-06). Browser lane is opt-in locally, mandatory in CI.
- **Counting browser-lane runs into the coverage number** — invites the v8-in-browser flakiness (OQ-1) with little gain; measure coverage on jsdom.
- **A `size-limit` `import` entry that counts `lit`/`@floating-ui`.** They are `external` in the build (`vite.config.ts:195`) and peer-provided — add `ignore` so budgets reflect *shipped* size, not consumer-supplied deps.

## Coverage Gate (TEST-07, D-01/D-02/D-03)

### How to measure the baseline
```bash
npm run test:coverage        # after rewiring: vitest run --project jsdom --coverage
```
Read the branch / line / function / statement percentages from the summary; set thresholds at (or just below) the measured floor so day-one CI is green (D-01), then ratchet up as the 23 dedicated files land. There is **no threshold today** [VERIFIED: `vitest.config.ts` has no `coverage` block; `.planning/codebase/TESTING.md:182` "No coverage threshold enforced"].

### Per-directory tiers (D-02)
Vitest supports **glob-keyed threshold overrides** inside `coverage.thresholds` — this is how the per-directory tiers are expressed:
```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json-summary', 'html'],
  include: ['src/components/**', 'src/utilities/**'],
  exclude: ['**/*.stories.ts', 'test/**', 'dist/**', '**/index.ts'],
  thresholds: {
    // global floor (ratchet toward branch≥80, lines/fns/stmts≥85 — D-03 ceiling)
    branches: <baseline>, functions: <baseline>, lines: <baseline>, statements: <baseline>,
    // stricter tiers on complex interactive directories:
    'src/components/combobox/**':   { branches: <higher>, functions: <higher> },
    'src/components/select/**':     { branches: <higher> },
    'src/components/dialog/**':     { branches: <higher> },
    'src/components/date-picker/**':{ branches: <higher> },
    // looser tier is just the global floor for simple display dirs
  },
}
```
[CITED: vitest.dev coverage `thresholds` glob overrides; config sketch basis `.planning/research/STACK.md:111-119`]

### OQ-1 — provider under the browser project (the flagged MEDIUM item)
- **Fact:** `coverage.provider` is a **single global (root-level)** setting in Vitest — it applies to **all projects**, not per-project. You cannot set `v8` for jsdom and `istanbul` for browser via project config. [VERIFIED via research this session — deepwiki/vitest coverage docs; provider selected by `test.coverage.provider`]
- **Fact:** V8 coverage **is supported in browser mode** in Vitest 4 via `@vitest/coverage-v8/browser` (CDP-based); since v3.2.0 AST remapping gives Istanbul-level accuracy. So the CONTEXT's "fall back to istanbul for that project only" is **not literally achievable** — istanbul would apply globally.
- **Recommendation (HIGH-value, resolves the flag):** **Measure coverage on the jsdom project only** (`--project jsdom --coverage`, provider `v8`, no new dep). The jsdom project exercises essentially all 66 components' logic; the browser lane is a ~5-file fidelity harness. This makes the coverage gate deterministic, fast, and sidesteps browser-coverage entirely. If (and only if) the team later wants browser-lane lines counted, switch the **global** provider to `istanbul` (works in jsdom too) or add `@vitest/coverage-v8/browser` — do that as a follow-up, not a Phase 1 blocker.

## Bundle-Size Gate (PERF-01, D-07/D-08)

Build output confirmed: multi-entry ESM with `lit`/`@lit/*`/`@floating-ui/*` marked **external** (not bundled) → measuring `dist/*.js` directly yields the true *shipped* size. [VERIFIED: `vite.config.ts:186-196`; dist entries present: `dist/amris.js`, `dist/amris-core.js`, `dist/components/*/index.js` — `ls dist/` this session]

### `.size-limit.json` (measure real build output; set `limit` from D-07 baseline + ~5–10%)
```json
[
  { "name": "core bundle",  "path": "dist/amris-core.js",              "limit": "<baseline+headroom>" },
  { "name": "full bundle",  "path": "dist/amris.js",                   "limit": "<baseline+headroom>" },
  { "name": "button (light deep import)",   "path": "dist/components/button/index.js",    "limit": "<baseline+headroom>" },
  { "name": "data-grid (heavy deep import)","path": "dist/components/data-grid/index.js", "limit": "<baseline+headroom>" },
  { "name": "tree-shaking: one component only",
    "path": "dist/amris.js", "import": "{ AmButton }",
    "ignore": ["lit", "@floating-ui/dom"],
    "limit": "<small, e.g. a few kB>" }
]
```
- `path`-only entries → min+gzip of the built file (D-08 core/full/representative). `preset-small-lib` provides the gzip+esbuild calc.
- The last entry is the **tree-shaking assertion** (D-08): importing a single component from the full barrel must stay tiny; if a barrel side-effect drags in all ~66 components it blows the small limit (Pitfall 10). `ignore` keeps peer/external deps out of the number.
- Representative heavy component: `data-grid` (renders all rows, `repeat()` — the largest display component) [CITED: `.planning/codebase/CONCERNS.md:51-56`]; `combobox`/`dialog` are secondary candidates (D-09 — Claude's call from real sizes).
- Run `npm run build` before `size-limit` in CI (budgets need `dist/`). Add script `"size": "size-limit"`.

[Config basis CITED: `.planning/research/STACK.md:123`; tree-shaking `import`+`ignore` is standard size-limit usage]

## a11y Browser Lane (TEST-08)

**Goal (locked):** run axe in a real browser so `color-contrast` and `region` — currently disabled "because jsdom has no computed styles" — actually execute. [VERIFIED: `test/a11y-helper.ts` defaults, per `.planning/codebase/TESTING.md:431-434`]

**Mechanics (OQ-2 — flagged):** The existing `checkA11y()` calls `axe.run(element)` **in the test realm**. In the `jsdom` project that realm is jsdom (no computed styles → the two rules are off). In the **browser project**, that same `axe.run()` executes **inside Chromium with real computed styles**, so the two rules work **with the plain `axe-core` dep already installed** — simply pass a browser-lane `checkA11y` variant that does NOT disable `color-contrast`/`region`.

`@axe-core/playwright` (the locked package) is built for **Playwright Test**: its `AxeBuilder({ page })` needs a Node-side Playwright `Page`. Vitest browser mode runs the test **inside** the browser and does not hand you a Playwright `Page` object the way Playwright Test does, so `AxeBuilder` does not map cleanly onto the chosen single-Vitest-config architecture. **Recommendation:** satisfy TEST-08's *intent* (real-browser axe, contrast/region ON) by running `axe-core` in-browser in the `browser` project (reusing `a11y-helper.ts` minus the two disables). Only reach for `@axe-core/playwright` if the team accepts a **separate Playwright Test runner** — which conflicts with the "single Vitest config, no second runner" upstream decision. Flag OQ-2 for the planner to lock before wiring.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-browser test env | Custom Karma/puppeteer harness | Vitest `browser` project + `@vitest/browser-playwright` | Reuses existing helpers/config; zero test-API rewrite |
| Bundle budget + gzip + tree-shaking | Custom `gzip-size` script in CI | `size-limit` + `@size-limit/preset-small-lib` | Tree-shaking-aware, PR deltas, per-entry |
| Focus/active-element across shadow roots | Manual shadow walk in every test | Small shared `deepActiveElement()` helper in `test/helpers.ts` | One helper both projects reuse (minimal divergence goal) |
| a11y rule execution | Hand-written contrast math | `axe-core` in-browser | Real computed styles do the work once in a real browser |
| Coverage instrumentation | Manual istanbul wiring | `@vitest/coverage-v8` `thresholds` (installed) | No new dep; AST-remapped accuracy |

**Key insight:** Almost everything this phase needs is *enabling configuration on tools already present* (coverage thresholds, a second Vitest project, size-limit over existing dist entries) — the only genuinely new test-authoring work is the 23-file split (mostly smoke) + the ~5-file browser fidelity suite.

## Common Pitfalls

### Pitfall 1: Treating TEST-01 as "23 tests from scratch"
**What goes wrong:** Over-sizing the phase; duplicating assertions already in the grouped files.
**Why:** The 23 are already smoke-covered in 3 grouped files.
**Avoid:** Plan TEST-01 as a *split + light hardening* of `layout-primitives`/`misc-display`/`display-trivial`, then delete the grouped files. Verify no component loses coverage in the move.
**Warning sign:** A task says "write new tests for `icon`/`grid`/`stack`" without referencing the existing grouped blocks.

### Pitfall 2: jsdom mocks leaking into the browser project (Pitfall 3, jsdom blind spots)
**What goes wrong:** Browser lane "passes" but is silently asserting the mock, not Chromium.
**Avoid:** Scope `setupFiles: ['./test/setup.ts']` to the `jsdom` project only; browser project has NO `setupFiles`. Add one guard assertion in the browser suite that a native API is present (e.g. `expect(HTMLDialogElement.prototype.showModal).toBeTruthy()` and that it is NOT the mock). [CITED: `.planning/research/PITFALLS.md` Pitfall 3]

### Pitfall 3: Gamed coverage (Pitfall 4)
**What goes wrong:** Lines-only threshold met by render-only smoke tests while interactive branches stay unhit.
**Avoid:** Gate on **branches** with stricter per-directory tiers on `combobox/select/dialog/date-picker` (D-02). The smoke tier is fine for display dirs *because* the branch+per-dir gate keeps the complex dirs honest. [CITED: `.planning/research/PITFALLS.md` Pitfall 4]

### Pitfall 4: size-limit counting peer deps / barrel side-effects (Pitfall 10)
**What goes wrong:** Budgets balloon (counting `lit`) or a barrel silently ships all components.
**Avoid:** Measure `dist/*.js` directly (externals already excluded); add the tree-shaking `import`+`ignore` assertion. [CITED: `.planning/research/PITFALLS.md` Pitfall 10; `vite.config.ts:195` externals]

### Pitfall 5: provider version drift
**What goes wrong:** `@vitest/browser-playwright` minor ≠ `vitest` minor → runtime errors.
**Avoid:** Pin `@vitest/browser-playwright@4.1.9` to match installed `vitest@4.1.9`; bump together. [VERIFIED: installed 4.1.9; provider 4.1.9 exists]

## Runtime State Inventory

Not a rename/refactor/migration phase (adds tests + CI config). No stored data, live-service config, OS-registered state, secrets, or build artifacts are renamed or migrated. **None — verified: this phase only adds test files, `vitest.config.ts` projects/coverage, `.size-limit.json`, `package.json` scripts/devDeps, and CI jobs; it changes no component source beyond what a test legitimately requires (CONTEXT scope note).**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20 | All (CI + local) | ✓ (CI pinned) | 20 | — [VERIFIED: `.github/workflows/ci.yml:16`] |
| npm + lockfile | `npm ci` | ✓ | — | — [VERIFIED: `package.json`] |
| vitest | test runner | ✓ | 4.1.9 | — [VERIFIED: node_modules] |
| @vitest/coverage-v8 | coverage gate | ✓ | 4.1.9 | — [VERIFIED: node_modules] |
| Chromium (Playwright) | browser lane (TEST-02/03/06/08) | ✗ locally until `npx playwright install chromium` | 1.62.1 | CI installs it; local contributors skip via jsdom-only default (D-06) |
| `@vitest/browser-playwright` | browser lane | ✗ (to install) | 4.1.9 | none — required for TEST-06 |
| `size-limit` (+preset) | PERF-01 | ✗ (to install) | 13.0.3 | none — required for PERF-01 |

**Missing with no fallback (must install in Phase 1):** `@vitest/browser-playwright`, `playwright`+Chromium, `size-limit`, `@size-limit/preset-small-lib`.
**Missing with fallback:** Chromium locally — jsdom-only default means contributors don't need it (D-06); CI provides it.

## Validation Architecture

Test framework and Nyquist mapping (`nyquist_validation: true` in `.planning/config.json` [VERIFIED this session]).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (jsdom project) + Vitest Browser Mode 4.1.9 / Chromium (browser project) |
| Config file | `vitest.config.ts` (gains `projects` + root `coverage`) |
| Quick run command | `vitest --project jsdom` (local default) |
| Full suite command | `vitest run --project jsdom` && `vitest run --project browser` (+ `size-limit` after build) |

### Success Criterion / Requirement → Validation Map
| Req / Criterion | Behavior | Validation type | Command / gate | Exists? |
|-----------------|----------|-----------------|----------------|---------|
| TEST-01 | 1:1 dedicated test file per component (66/66) | file-count + unit | `vitest run --project jsdom`; assert no grouped files remain | ❌ Wave 0 — 23 dedicated files to create (split 3 grouped) |
| TEST-02 | Real form submit + validity | browser unit | `vitest run --project browser` (`test/browser/form-association.test.ts`) | ❌ Wave 0 |
| TEST-03 | Focus trap + restoration | browser unit | `vitest run --project browser` (`test/browser/overlay-focus.test.ts`) | ❌ Wave 0 |
| TEST-04 | Rapid option update index clamp | jsdom unit | `vitest run --project jsdom` (combobox/select/rich-select) | ⚠️ partial — combobox has a basic async test; add clamp cases |
| TEST-05 | Listener attach/detach lifecycle | jsdom unit (spies) | `vitest run --project jsdom` | ❌ Wave 0 |
| TEST-06 | Browser lane infra (4 areas) | config + browser suite | `vitest.config.ts` browser project; `npm run test:browser` | ❌ Wave 0 |
| TEST-07 | Branch + per-dir coverage gate | coverage threshold | `vitest run --project jsdom --coverage` (`coverage.thresholds`) exits non-zero | ❌ Wave 0 (no thresholds today) |
| TEST-08 | Real-browser axe (contrast/region ON) | browser a11y | `vitest run --project browser` (`a11y.browser.test.ts`, axe-core in-browser) | ❌ Wave 0 (rules disabled today) |
| PERF-01 | Per-entry min+gzip budgets + tree-shaking | build-artifact gate | `npm run build && size-limit` (`.size-limit.json`) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run --project jsdom` (fast; no browser boot).
- **Per wave merge:** add `vitest run --project browser` + `npm run build && size-limit`.
- **Phase gate:** all four CI gates green (coverage, browser incl. a11y, size) before `/gsd-verify-work`; every gate hard-blocks from its landing PR (D-05).

### Wave 0 Gaps
- [ ] `vitest.config.ts` — add `projects` (`jsdom` + `browser`) + root `coverage.thresholds` (branch + per-dir)
- [ ] `@vitest/browser-playwright@4.1.9` + `playwright@1.62.1` install + `npx playwright install chromium`
- [ ] `size-limit@13` + `@size-limit/preset-small-lib@13` + `.size-limit.json`
- [ ] `test/browser/` suite: form-association, overlay-focus, dialog-top-layer, floating-position, a11y.browser
- [ ] 23 dedicated `test/components/{name}.test.ts` files (split `layout-primitives`/`misc-display`/`display-trivial`), then remove the grouped files
- [ ] `package.json` scripts: `test` → `--project jsdom`, add `test:browser`, `size`; `test:coverage` → `--project jsdom --coverage`
- [ ] `.github/workflows/ci.yml`: browser job (`playwright install chromium`), coverage gate, size job — each hard-block
- [ ] Shared `deepActiveElement()` helper in `test/helpers.ts` for focus assertions

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` [VERIFIED: `.planning/config.json` this session]. This phase adds tests + CI + dev tooling; it introduces no runtime code paths, network surfaces, auth, or data handling. The security-relevant surfaces are supply-chain (new devDeps) and CI credentials.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture / Supply chain | yes | Pin new devDep versions; all 5 additions org-backed + registry-verified (§Package Legitimacy Audit); `npm ci` against committed lockfile |
| V5 Input Validation | no (test infra only) | — (library's Lit-safe templating unchanged; no `innerHTML`/`eval` — CONCERNS.md) |
| V6 Cryptography | no | — |
| V14 Config / CI | yes | Browser job runs untrusted PR code — keep least-privilege `GITHUB_TOKEN`; do not expose publish/`packages:write` in the PR-triggered CI workflow (publishing is Phase 6) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/typosquatted devDep | Tampering | Registry-verified names + pinned versions + lockfile `npm ci` (audit done this session) |
| `playwright install` pulling binaries in CI | Tampering/Supply chain | Official `playwright@1.62.1`; Chromium fetched via Playwright's pinned revision |
| PR CI job with write scope | Elevation | Keep `ci.yml` (PR-triggered) read-only; no `packages:write`/publish here (that belongs to a separate release workflow, Phase 6) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsdom-only component tests | Hybrid jsdom + Vitest Browser Mode (Playwright) | Browser Mode stable (non-experimental) in **Vitest 4** | Real ElementInternals/focus/dialog/positioning become assertable without a second runner |
| Browser provider bundled in `@vitest/browser` | Separate `@vitest/browser-playwright` provider package (minor must match vitest) | Vitest 4 | Install provider explicitly; pin to vitest minor |
| `bundlesize` | `size-limit` + preset-small-lib | — | Tree-shaking + gzip aware, per-entry, PR deltas |
| Coverage without gate | `@vitest/coverage-v8` `thresholds` (AST-remapped ≈ istanbul accuracy since v3.2.0) | Vitest 3.2+ | v8 speed with istanbul-grade numbers; gate in-CI, no SaaS |

**Deprecated/outdated:**
- Wholesale migration to `@web/test-runner` for this repo — rejected upstream (second runner + helper rewrite mid-hardening).
- `experimental-ct` Playwright component testing — non-Lit, experimental, overlaps Browser Mode.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Only `split-view` among the 23 warrants full behavioral tests; the other 22 are smoke per D-04 | Test Gap / D-04 | Low — planner can bump `side-nav`/`nav-bar`/`app-shell` to behavioral if desired; conservative default |
| A2 | The 3 grouped files' existing assertions can be lifted into dedicated files without loss | Test Gap | Low — verified the grouped files are render/attribute smoke; direct carry-over |
| A3 | Measuring coverage on the jsdom project alone yields an acceptable gate (browser lane excluded) | Coverage Gate / OQ-1 | Medium — if a component's key branches only run under real browser APIs, those branches won't count; mitigated because jsdom exercises nearly all logic |
| A4 | `@axe-core/playwright`'s `AxeBuilder` does not map onto Vitest browser-mode's in-browser execution; in-browser `axe-core` is the right fit | a11y Lane / OQ-2 | Medium — LOCKED decision named `@axe-core/playwright`; needs planner lock. Intent (real-browser contrast/region) is satisfiable either way |
| A5 | `size-limit` measuring `dist/*.js` reflects shipped size because lit/@floating-ui are external | Bundle Gate | Low — verified externals in `vite.config.ts:195` |

## Open Questions

1. **OQ-1 — Coverage provider under the browser project.** `coverage.provider` is global in Vitest, so "istanbul for the browser project only" (as CONTEXT phrased the fallback) is not literally achievable. **Recommendation:** measure coverage on the jsdom project only (v8, no new dep); treat the browser lane as fidelity, not coverage. Planner should lock this so TEST-07 tasks target `--project jsdom --coverage`.
   - Know: v8 works in browser mode (`@vitest/coverage-v8/browser`); provider is a single global setting.
   - Unclear: whether the team wants browser-lane lines folded into the number (would force a global provider decision).
   - Recommendation: jsdom-only coverage for Phase 1; revisit post-phase if needed.

2. **OQ-2 — `@axe-core/playwright` vs in-browser `axe-core` in Vitest browser mode.** The locked package targets Node-side Playwright `Page`; Vitest browser mode runs tests in-browser. **Recommendation:** run `axe-core` in-browser in the `browser` project (reuse `a11y-helper.ts` sans the color-contrast/region disables) to satisfy TEST-08's intent without a second runner. Planner must lock the package choice before wiring the a11y gate.
   - Know: real-browser axe with contrast/region ON is the goal and is achievable in-browser today (axe-core already installed).
   - Unclear: whether "use `@axe-core/playwright`" was a hard tool mandate or a means to the real-browser-axe end.
   - Recommendation: in-browser `axe-core`; only add `@axe-core/playwright` if a separate Playwright Test runner is accepted (conflicts with the single-config decision).

3. **OQ-3 — Retire vs keep the 3 grouped files.** After splitting into 23 dedicated files, should `layout-primitives`/`misc-display`/`display-trivial` be deleted (clean 1:1) or kept as integration smoke? **Recommendation:** delete them once content is redistributed, to keep the 1:1 invariant TEST-01 asserts and avoid double-maintenance.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — authoritative tooling spec (versions, install, config sketch, compat matrix) — read this session
- `.planning/research/PITFALLS.md` (Pitfalls 3/4/10), `.planning/research/SUMMARY.md` — cross-referenced
- `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md` — existing harness, helper API, gap enumeration — read this session
- Repo files read this session: `vitest.config.ts`, `vite.config.ts`, `package.json`, `.github/workflows/ci.yml`, `test/setup.ts` (head), `test/a11y.test.ts` (head), the 3 grouped test files, `.planning/config.json`
- Glob this session: 66 `src/components/**/index.ts`; 46 `test/components/*.test.ts`
- npm registry (this session): `@vitest/browser-playwright` (4.1.9/4.1.10), `@axe-core/playwright` 4.12.1, `size-limit`/`@size-limit/preset-small-lib` 13.0.3, `playwright` 1.62.1; installed `vitest`/`@vitest/coverage-v8` 4.1.9

### Secondary (MEDIUM confidence)
- Vitest coverage collection (provider global, v8 browser support, AST remapping): https://deepwiki.com/vitest-dev/vitest/4.2-coverage-collection , https://vitest.dev/guide/coverage , https://qaskills.sh/blog/vitest-coverage-v8-istanbul-guide-2026
- axe + Playwright / browser-mode a11y context: https://playwright.dev/docs/accessibility-testing , https://www.npmjs.com/package/@axe-core/playwright

## Metadata

**Confidence breakdown:**
- Test gap (23 components, tiers, split plan): HIGH — verified by direct Glob + Read this session
- Config shapes (projects/coverage/size-limit): HIGH — grounded in current repo files + authoritative STACK.md; exact numbers are D-03/D-07/D-09 discretion from live measurement
- Browser-lane assertion patterns: HIGH (approach), MEDIUM (exact API ergonomics until first run)
- Coverage provider under browser (OQ-1): MEDIUM — resolved with a concrete recommendation
- `@axe-core/playwright` mechanics (OQ-2): MEDIUM — flagged for planner lock

**Research date:** 2026-08-10
**Valid until:** 2026-09-09 (30 days; Vitest 4.1.x / Playwright 1.62 are current-stable — re-check the vitest/provider version match before install)
