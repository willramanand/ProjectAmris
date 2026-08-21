# Phase 1: Test Coverage + CI Gates Foundation - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** ~34 (23 new jsdom test files + 5 new browser test files + shared helper + a11y helper variant + vitest.config + package.json + .size-limit.json + ci.yml)
**Analogs found:** 34 / 34 (every new/modified file has a concrete in-repo analog)

> This phase authors **test + CI-config** files only. It does NOT modify component source (CONTEXT scope note). Every "analog" below is an existing test/config file in this repo — new files copy its import block, fixture/query/assert shape, and structure directly.

## File Classification

### New jsdom test files — split out of 3 grouped files (TEST-01, 22 smoke + 1 behavioral)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `test/components/stack.test.ts` | test (smoke) | render/attr-reflection | `test/components/layout-primitives.test.ts` §am-stack (lines 10-36) | exact — lift block |
| `test/components/grid.test.ts` | test (smoke) | render/attr-reflection | `layout-primitives.test.ts` §am-grid (38-54) | exact — lift block |
| `test/components/surface.test.ts` | test (smoke) | render/attr-reflection | `layout-primitives.test.ts` §am-surface (56-70) | exact — lift block |
| `test/components/panel.test.ts` | test (smoke) | render/slot/part | `layout-primitives.test.ts` §am-panel (72-94) | exact — lift block |
| `test/components/card.test.ts` | test (smoke) | render/slot | `layout-primitives.test.ts` §am-card (96-101) | exact — lift block |
| `test/components/table.test.ts` | test (smoke) | render/slot/part | `misc-display.test.ts` §am-table (8-38) | exact — lift block |
| `test/components/link-button.test.ts` | test (smoke+cond) | render/attr/conditional | `misc-display.test.ts` §am-link-button (40-89) | exact — lift block |
| `test/components/icon.test.ts` | test (smoke) | render/slot | `misc-display.test.ts` §am-icon (91-99) | exact — lift block |
| `test/components/button-group.test.ts` | test (smoke) | render/role-reflection | `display-trivial.test.ts` §am-button-group (36-50) | exact — lift block |
| `test/components/empty-state.test.ts` | test (smoke) | render/named-slots | `display-trivial.test.ts` §am-empty-state (52-69) | exact — lift block |
| `test/components/error-text.test.ts` | test (smoke) | render/role-reflection | `display-trivial.test.ts` §am-error-text (71-77) | exact — lift block |
| `test/components/field.test.ts` | test (smoke) | render/slot | `display-trivial.test.ts` §am-field (79-86) | exact — lift block |
| `test/components/hint-text.test.ts` | test (smoke) | render/slot | `display-trivial.test.ts` §am-hint-text (88-93) | exact — lift block |
| `test/components/label.test.ts` | test (smoke) | render/attr-reflection | `display-trivial.test.ts` §am-label (95-103) | exact — lift block |
| `test/components/nav-bar.test.ts` | test (smoke) | render/role-reflection | `display-trivial.test.ts` §am-nav-bar (105-110) | exact — lift block |
| `test/components/progress-ring.test.ts` | test (smoke) | render/ARIA-reflection | `display-trivial.test.ts` §am-progress-ring (112-129) | exact — lift block |
| `test/components/side-nav.test.ts` | test (smoke) | render/attr/conditional | `display-trivial.test.ts` §am-side-nav-item (131-139) | exact — lift block (covers `am-side-nav` + `am-side-nav-item`) |
| `test/components/split-view.test.ts` | test (**behavioral**) | event/keyboard/state | **`test/components/slider.test.ts`** (drag/keyboard-resize analog); seed from `display-trivial.test.ts` §am-split-view (141-168) | role-match — needs new drag/keyboard assertions |
| `test/components/stat.test.ts` | test (smoke) | render/attr-reflection | `display-trivial.test.ts` §am-stat (170-175) | exact — lift block |
| `test/components/status-dot.test.ts` | test (smoke) | render/attr-reflection | `display-trivial.test.ts` §am-status-dot (177-186) | exact — lift block |
| `test/components/timeline.test.ts` | test (smoke) | render/attr-reflection | `display-trivial.test.ts` §am-timeline-item (188-193) | exact — lift block (covers `am-timeline` + `am-timeline-item`) |
| `test/components/visually-hidden.test.ts` | test (smoke) | render/slot | `display-trivial.test.ts` §am-visually-hidden (195-202) | exact — lift block |
| `test/components/app-shell.test.ts` | test (smoke) | render/named-slots | `display-trivial.test.ts` §am-app-shell (204-221) | exact — lift block |

**Also:** move the `am-breadcrumb-item` block (`display-trivial.test.ts:21-34`) into the existing `test/components/breadcrumb.test.ts` (parent already has a dedicated file). Then **delete** the 3 grouped files (OQ-3 recommendation: retire for clean 1:1).

### New browser-lane test files (TEST-02/03/06/08) — `test/browser/` (NEW dir, browser project)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `test/browser/form-association.test.ts` | test (browser) | form-submit/validity | `test/components/checkbox.test.ts` (lines 13-42) — but assert **real** `FormData`/`ElementInternals`, NOT `getMockInternals` | role-match — swap mock assertion for real API |
| `test/browser/overlay-focus.test.ts` | test (browser) | focus-trap/restore | `test/components/dialog.test.ts` §"restores focus…" (223-244) — reuse structure, real `document.activeElement` across shadow | role-match — real focus model |
| `test/browser/dialog-top-layer.test.ts` | test (browser) | native-dialog/top-layer | `test/components/dialog.test.ts` (6-30) — assert real `showModal()`/top-layer, NOT the `setup.ts` mock | role-match — native `<dialog>` |
| `test/browser/floating-position.test.ts` | test (browser) | floating-ui positioning | closest: `test/components/dialog.test.ts` backdrop-rect logic (87-99, real `getBoundingClientRect`); no positioning test exists yet | partial — new area, no direct analog |
| `test/browser/a11y.browser.test.ts` | test (browser a11y) | axe scan | `test/a11y.test.ts` (1-45) + `test/a11y-helper.ts` — reuse `checkA11y` **without** the `color-contrast`/`region` disables | role-match — same helper, rules re-enabled |

### jsdom assertions added to EXISTING files (TEST-04 clamp, TEST-05 listener teardown)

| Modified File(s) | Role | Data Flow | Analog | Match |
|------------------|------|-----------|--------|-------|
| `test/components/combobox.test.ts`, `select.test.ts`, `rich-select.test.ts` | test (behavioral) | async-clamp (TEST-04) | existing combobox async test (per RESEARCH §Validation Map — "partial"); pattern in RESEARCH Pattern 4 | role-match |
| `test/components/{combobox,dropdown,context-menu,date-picker,popover,tooltip}.test.ts` | test (behavioral) | listener-lifecycle (TEST-05) | `vi.spyOn(document,'addEventListener'/'removeEventListener')`; RESEARCH Pattern 4 | role-match |

### Modified config files

| Modified File | Role | Analog | Match |
|---------------|------|--------|-------|
| `vitest.config.ts` | config | current single-env config (lines 1-10) → add `projects` array + root `coverage` | exact base |
| `package.json` | config | current `scripts` (58-73) + `devDependencies` (77-93) | exact base |
| `.size-limit.json` (NEW) | config | RESEARCH §Bundle-Size Gate sketch; `dist/` entries per `package.json` exports (15-46) | sketch |
| `.github/workflows/ci.yml` | config (CI) | current `verify` job (1-29) → add browser + coverage + size gates | exact base |
| `test/helpers.ts` | utility | add `deepActiveElement()` alongside existing helpers | exact base |
| `test/a11y-helper.ts` | utility | add browser variant / param to skip the two disables (lines 11-14) | exact base |

## Pattern Assignments

### Smoke test files (22 of the 23) — e.g. `test/components/icon.test.ts`

**Analog:** `test/components/misc-display.test.ts` (and the other 2 grouped files). Lift the matching `describe` block verbatim, wrap in a dedicated file header.

**Import + header pattern** (copy from `misc-display.test.ts:1-6`, keep ONLY the one component's import):
```typescript
import { describe, expect, it } from 'vitest';

import '../../src/components/icon/icon';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';
```
Note: import only the helpers actually used (drop `shadowQuery`/`waitForUpdate` if the block does not use them — `noUnusedLocals` is enforced per CLAUDE.md).

**Core smoke pattern** (fixture HTML string → shadow query → assert reflection/slot), copy from `misc-display.test.ts:91-99`:
```typescript
describe('am-icon', () => {
  it('renders the slotted SVG content', async () => {
    const el = await fixture<HTMLElement>(
      '<am-icon><svg viewBox="0 0 16 16"><path d="M0 0 L16 16"/></svg></am-icon>',
    );
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});
```

**Attribute/ARIA-reflection pattern** (copy from `display-trivial.test.ts:112-129` — the richest smoke example):
```typescript
const el = await fixture<HTMLElement & { value: number; max: number }>(
  '<am-progress-ring value="40" max="100"></am-progress-ring>');
const svg = el.shadowRoot?.querySelector('svg[role="progressbar"]') as SVGElement;
expect(svg.getAttribute('aria-valuenow')).toBe('40');
```

**Dynamic-prop pattern** (when a smoke test touches a prop — copy from `layout-primitives.test.ts:30-35`):
```typescript
el.direction = 'horizontal';
await waitForUpdate(el);
expect(el.getAttribute('direction')).toBe('horizontal');
```

**Multi-element directories:** `side-nav.test.ts` covers `am-side-nav` + `am-side-nav-item`; `timeline.test.ts` covers `am-timeline` + `am-timeline-item` — one file, two `describe` blocks (import lands both elements via the single barrel import).

---

### `test/components/split-view.test.ts` (behavioral — the 1 interactive of 23)

**Analog:** `test/components/slider.test.ts` (draggable/keyboard-resizable analog) for the drag/keyboard-resize assertions; seed the reflection/slot cases from `display-trivial.test.ts:141-168`.

**Interactive pattern to copy** (event-promise + keyboard from `test/components/checkbox.test.ts:32-41`):
```typescript
const control = shadowQuery<HTMLElement>(element, '.control');
await keydown(control, ' ', element);   // keydown(target, key, host) auto-awaits update
expect(element.checked).toBe(true);
```
Apply to split-view: assert keyboard resize of the divider (Arrow keys), `position` clamping, and orientation. Existing seed cases (`display-trivial.test.ts:141-168`) already cover orientation reflection, named slots, and dynamic `position` — carry them over and add the drag/keyboard/clamp behavior per D-04.

---

### `test/browser/form-association.test.ts` (TEST-02, browser project)

**Analog:** `test/components/checkbox.test.ts:13-30` — same fixture/click shape, but **replace** the mock assertion.

**Do NOT copy** (jsdom-only, from checkbox.test.ts:29):
```typescript
expect(getMockInternals(element).formValue).toBe('on');  // ❌ mock does not exist in browser project
```
**Copy instead** (real `<form>` + `FormData`, RESEARCH Pattern 2):
```typescript
import '../../src/components/checkbox/checkbox';
import { fixture } from '../helpers';   // reuse fixture/click; NO getMockInternals

const form = await fixture<HTMLFormElement>(
  '<form><am-checkbox name="terms" checked>Accept</am-checkbox></form>');
const data = new FormData(form);
expect(data.get('terms')).toBe('on');           // real ElementInternals.setFormValue
(el as any).required = true; (el as any).checked = false;
expect(form.checkValidity()).toBe(false);         // real setValidity participation
```
Add one native-API guard (Pitfall 2): assert the API is real, e.g. `expect(HTMLDialogElement.prototype.showModal).toBeTruthy()` is NOT the `setup.ts` mock.

Components in scope (all `formAssociated`): `input, textarea, checkbox, radio, switch, select, combobox, rich-select, slider, number-field, search-field, input-otp, date-picker, time-picker, color-picker, file-upload`.

---

### `test/browser/overlay-focus.test.ts` (TEST-03, browser project)

**Analog:** `test/components/dialog.test.ts:223-244` ("restores focus to previously focused element on close"). The structure carries over directly; in the browser project it runs against the real focus model.

**Copy the restoration shape** (dialog.test.ts:223-244):
```typescript
const focusTarget = document.createElement('button');
document.body.appendChild(focusTarget);
focusTarget.focus();
element.open = true;  await waitForUpdate(element);
// ...Tab cycles within (trap)...
element.open = false; await waitForUpdate(element);
expect(document.activeElement).toBe(focusTarget);   // real restoration
```
Add a **`deepActiveElement()`** helper (new, in `test/helpers.ts`) to pierce shadow roots when asserting the trapped element. Components: `dialog, drawer, command-palette, popover`. (Reveals the Phase 3 `isConnected` guard need — capture, do not fix here.)

---

### `test/browser/a11y.browser.test.ts` (TEST-08, browser project)

**Analog:** `test/a11y.test.ts:1-45` (import block + `expectNoViolations` wrapper) + `test/a11y-helper.ts`.

**Copy the wrapper** (a11y.test.ts:40-43):
```typescript
async function expectNoViolations(element: HTMLElement, disabledRules: string[] = []) {
  const violations = await checkA11y(element, disabledRules);
  expect(violations, formatViolations(violations)).toHaveLength(0);
}
```
**Key divergence:** the browser lane must NOT disable `color-contrast`/`region`. Those are hard-coded in `a11y-helper.ts:11-14`:
```typescript
const defaultDisabled = [
  'color-contrast',   // jsdom has no computed styles   ← re-enable in browser lane
  'region',           // component-level testing         ← re-enable in browser lane
];
```
Add a parameter/variant to `checkA11y` so the browser lane passes an empty default-disabled set (RESEARCH OQ-2: in-browser `axe-core`, already installed — do NOT wire `@axe-core/playwright` unless the planner accepts a second runner).

---

### `vitest.config.ts` (MODIFIED)

**Analog:** current config (verbatim, lines 1-10):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
});
```
**Transform into** the `projects` array (RESEARCH Pattern 1): the existing 4 fields (`environment`, `include`, `setupFiles`, `restoreMocks`) move verbatim into the **`jsdom`** project with `exclude: ['test/browser/**']` added; a new **`browser`** project (Playwright/Chromium) is added with `include: ['test/browser/**/*.test.ts']` and **`setupFiles` OMITTED** (Pitfall 2 — mocks stay jsdom-only). Add root-level `coverage` with `provider: 'v8'`, `include: ['src/components/**','src/utilities/**']`, `exclude: ['**/*.stories.ts','test/**','dist/**','**/index.ts']`, and `thresholds` (global branch/lines/fns/stmts baseline + per-dir glob overrides for `combobox/select/dialog/date-picker`). Measure baseline via `vitest run --project jsdom --coverage` (OQ-1: coverage folds over the jsdom project only).

---

### `package.json` (MODIFIED)

**Analog:** current `scripts` block (lines 58-73). Change:
- `"test": "vitest"` → `"test": "vitest --project jsdom"` (D-06, contributor default stays jsdom)
- `"test:coverage": "vitest run --coverage"` → `"vitest run --project jsdom --coverage"`
- add `"test:browser": "vitest run --project browser"`, `"size": "size-limit"`
- keep `"test:run"`, `"test:a11y"`

**devDependencies to add** (RESEARCH §Additions — pin exact): `@vitest/browser-playwright@4.1.9` (MUST match installed `vitest@4.1.9`), `playwright@1.62.1`, `size-limit@13`, `@size-limit/preset-small-lib@13`.

---

### `.size-limit.json` (NEW)

**Analog:** RESEARCH §Bundle-Size Gate sketch; entry paths come from `package.json` exports (`dist/amris-core.js`, `dist/amris.js`, `dist/components/*/index.js`). Budget: core, full, `button` (light) + `data-grid` (heavy) deep imports, plus a tree-shaking assertion entry:
```json
{ "name": "tree-shaking: one component only",
  "path": "dist/amris.js", "import": "{ AmButton }",
  "ignore": ["lit", "@floating-ui/dom"], "limit": "<small>" }
```
`ignore` keeps externals out (Pitfall 4; `lit`/`@floating-ui` are `external` in `vite.config.ts`). Numbers are D-07/D-09 discretion from real build output.

---

### `.github/workflows/ci.yml` (MODIFIED)

**Analog:** current `verify` job (lines 1-29) — `checkout@v4` → `setup-node@v4` (node 20, `cache: npm`) → `npm ci` → `tsc --noEmit` → test → build. Copy that step scaffold for the new jobs:
- **`verify`** job: change `npm run test:run` to jsdom coverage-gated run (`vitest run --project jsdom --coverage`) — hard-blocks on `coverage.thresholds` (D-05).
- **`browser`** job: add `npx playwright install chromium` step before `vitest run --project browser` (incl. a11y).
- **`size`** job: `npm run build` then `npm run size`.
Keep the workflow PR-triggered and read-only `GITHUB_TOKEN` (Security §V14 — no `packages:write` here).

## Shared Patterns

### Fixture + shadow-query + await-update (ALL jsdom test files)
**Source:** `test/helpers.ts` — `fixture<T>()` (11-21), `mount()` (5-9), `waitForUpdate()` (23-30), `shadowQuery<T>()` (32-39).
**Apply to:** every new `test/components/*.test.ts` and the browser suite (reused across BOTH projects — minimal-divergence goal).
```typescript
const el = await fixture<HTMLElement>('<am-x attr="v">child</am-x>');   // appends + awaits updateComplete
const inner = shadowQuery<HTMLElement>(el, '.control');
// ...mutate prop...
await waitForUpdate(el);
```

### Interactive helpers (behavioral tests: split-view, TEST-04/05, browser lane)
**Source:** `test/helpers.ts` — `click(target, host?)` (41-53), `keydown(target, key, host?)` (55-72), `oneEvent<TDetail>()` (98-111), `inputText`/`changeValue` (74-96). Each `host?` arg auto-awaits `waitForUpdate`.
**Apply to:** `split-view.test.ts`, TEST-04/05 additions, `test/browser/*`.
```typescript
const evt = oneEvent(element, 'change');
await click(element, element);
await evt;
```

### Mock ElementInternals — jsdom project ONLY
**Source:** `test/setup.ts` (`MockElementInternals` 11-101, `attachInternals` override 113-136, dialog `showModal`/`close` mocks 164-184) + `getMockInternals()` (`helpers.ts:113-120`).
**Apply to:** jsdom form/dialog tests only.
**MUST NOT apply to** `test/browser/*` — the browser project omits `setup.ts` so Chromium provides native `ElementInternals`/`<dialog>` (that is the entire point of the lane, CONTEXT:75). Never import `getMockInternals` in a browser test.

### axe a11y scan
**Source:** `test/a11y-helper.ts` `checkA11y()` (7-23) + `formatViolations()` (28-35).
**Apply to:** jsdom `a11y.test.ts` (keeps the two disables) AND `test/browser/a11y.browser.test.ts` (drops the two disables). Add a param so both share the helper.

### TEST-01 invariant
**Source:** established 1:1 layout `test/components/{component}.test.ts` ↔ `src/components/{component}/`.
**Apply to:** all 23 new files + retire the 3 grouped files so no grouped multi-component file remains.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `test/browser/floating-position.test.ts` | test (browser) | floating-ui positioning | No positioning/layout assertion exists in the current suite (jsdom has no layout). Closest partial reference: real `getBoundingClientRect` usage in `dialog.test.ts:87-99`. Use RESEARCH §Browser-Lane patterns + `@floating-ui/dom` behavior; assert computed `top`/`left` of a positioned overlay in Chromium. |
| `.size-limit.json` | config | — | No existing size-budget config in repo; first of its kind. Follow RESEARCH sketch, not an in-repo analog. |
| `deepActiveElement()` helper | utility | focus/shadow-pierce | No shadow-piercing active-element helper exists yet; new addition to `test/helpers.ts` (RESEARCH §Don't Hand-Roll). |

## Metadata

**Analog search scope:** `test/components/*.test.ts` (46 files, incl. 3 grouped), `test/helpers.ts`, `test/setup.ts`, `test/a11y-helper.ts`, `test/a11y.test.ts`, `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml`.
**Files scanned:** 11 read in full + Glob of test/components.
**Pattern extraction date:** 2026-08-10
</content>
</invoke>
