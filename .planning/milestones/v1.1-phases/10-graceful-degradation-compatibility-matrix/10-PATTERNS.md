# Phase 10: Graceful Degradation & Compatibility Matrix - Pattern Map

**Mapped:** 2026-08-25
**Files analyzed:** 6 new/created targets + 16 constructor edits (15 files) + 8 CSS files (10 rules) + 3 config/doc files
**Analogs found:** 6 / 6 file categories have concrete in-repo analogs

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/internal/helpers/capabilities.ts` (NEW) | utility (internal probe) | transform (probe-once memoize) | `src/internal/helpers/lazy-load.ts` | exact (same idiom: `??=` + `__reset*ForTest`) |
| `src/internal/helpers/attach-internals-safe.ts` (NEW helper `attachInternalsSafe()`) | utility (internal guard) | transform (guarded attach) | `src/components/input/input.ts:84-90` constructor + `src/components/button/button.ts:46-54` | role-match (extracts the raw pattern into a chokepoint) |
| `src/internal/helpers/form-participation.ts` (NEW) | service (Light-DOM form fallback) | event-driven / form-I/O | `src/internal/controllers/validation.ts` (internals-consuming controller) + input.ts setFormValue sites | role-match (no existing Light-DOM fallback; nearest is internals seam) |
| `src/compat-forms.ts` (NEW side-effect entry) | config / entry point | request-response (module side effect) | `src/index.ts` / `src/index.all.ts` + `package.json` exports/sideEffects | role-match (subpath entry precedent) |
| 8 component `static styles` (card, panel, dialog, app-shell, drawer, side-nav) | component (CSS) | transform (CSS PE) | `src/components/card/card.ts:72-78` `:has()` rules; NO existing `@supports` in repo | role-match (new `@supports` wrap around existing `css` pattern) |
| `vitest.config.ts` browser project + `.github/workflows/ci.yml` | config / test | batch (test matrix) | `vitest.config.ts:58-72` browser project (chromium-only today) | exact (extend `instances` array) |
| 16 constructor call sites (15 files) | component (constructor edit) | request-response (form) | `input.ts:84-90` (`this.internals`) + `button.ts:44-54` (`this._internals`) | exact (both naming conventions present) |

## Pattern Assignments

### `src/internal/helpers/capabilities.ts` (NEW — utility, memoized probe)

**Analog:** `src/internal/helpers/lazy-load.ts` (the phase's exact template)

**Memoize-once `??=` idiom** (lazy-load.ts:31, 51-60) — copy the module-level cache + `??=` shape, swapping the `import()` for a synchronous capability probe:
```typescript
let floatingPromise: Promise<typeof import('@floating-ui/dom')> | null = null;

export function loadFloating(): Promise<typeof import('@floating-ui/dom')> {
  return (floatingPromise ??= floatingImporter().catch((err) => {
    floatingPromise = null;
    throw err;
  }));
}
```
For capabilities, each probe is a `let _x: boolean | undefined;` + `return (_x ??= <probe expr>);`. Research Pattern 1 gives the exact probe expressions (`hasFormAssociation`, `hasAriaReflection`, `hasAdoptedStyleSheets`, `supportsHas`). Note the Safari gotcha: `CSS.supports('selector(:has(*))')` MUST use the non-empty `:has(*)`.

**Test-reset precedent** (lazy-load.ts:113-116) — copy verbatim as `__resetCapabilitiesForTest()`:
```typescript
export function __resetLazyLoadCachesForTest(): void {
  floatingPromise = null;
  virtualizerPromise = null;
}
```
For capabilities this nulls each `_face`/`_ariaReflect`/`_adopted`/`_has` memo so jsdom capability-off specs are order-independent.

**Off-surface discipline** (lazy-load.ts:1-29 header) — reuse the JSDoc framing: "registers no custom element, exports no component, never re-exported from `src/index.ts`/`src/index.all.ts`, tree-shaken from consumer bundles." Same applies to `capabilities.ts`.

---

### `attachInternalsSafe()` helper (NEW — utility, guarded attach)

**Analog (the raw pattern being replaced):** `src/components/input/input.ts:84-90` and `src/components/button/button.ts:46-54`

**`this.internals` convention** (input.ts:59, 84-90) — 9 sites use this name:
```typescript
private internals: ElementInternals;                 // line 59 — field type widens to | null

constructor() {
  super();
  this.internals = this.attachInternals();           // line 86 — becomes attachInternalsSafe(this)
  this.addEventListener('invalid', this._onInvalid);
}
```

**`this._internals` convention** (button.ts:44-54) — 7 sites use the underscore name:
```typescript
private _internals: ElementInternals;                // line 44 — widens to | null

constructor() {
  super();
  this._internals = this.attachInternals();          // line 48 — becomes attachInternalsSafe(this)
}

get form(): HTMLFormElement | null {
  return this._internals.form;                        // line 53 — becomes this._internals?.form ?? null
}
```

**The helper to create** (research Pattern 2) returns `ElementInternals | null`, gating on `hasFormAssociation()` then `try/catch`. Field type widens `ElementInternals` → `ElementInternals | null` at all 16 declaration sites; every setter call site becomes `?.`.

**Call-site null-safe conversions** (input.ts:285, 317, 319 — representative of the ~44 sites):
```typescript
this.internals.setFormValue(this.value);                          // → this.internals?.setFormValue(...)
this.internals.setValidity(flags, input.validationMessage, input);// → this.internals?.setValidity(...)
this.internals.setValidity({});                                   // → this.internals?.setValidity({})  (do NOT drop this reset branch)
```

**16 attach sites (research-verified line numbers):** button:48, checkbox:69, combobox:226, color-picker:92, date-picker:111, input:86, input-otp:73, number-field:71, radio:44, radio:266 (`am-radio-group`), rich-select:141, select:311, slider:64, switch:70, textarea:79, time-picker:106. `shortcuts` is excluded (reads `constructor.formAssociated` reflectively, never calls `attachInternals()`).

**Behavior-preservation landmine:** the seam must be pure pass-through when internals is non-null — optional-chaining only, no reordering of `setFormValue`/`setValidity` within `willUpdate`/change handlers, and every valid-branch `setValidity({})` reset preserved.

---

### `src/internal/helpers/form-participation.ts` (NEW — service, Light-DOM form fallback)

**Analog:** `src/internal/controllers/validation.ts:114-122` (the existing null-tolerant internals consumer) + the input.ts `setFormValue` transitions

**Null-tolerant internals accessor** (validation.ts:114-122) — the established pattern for tolerating absent internals; the fallback should mirror value on the same transitions the controller reads:
```typescript
private _nativeMessage(): string {
  try {
    return this._opts.internals().validationMessage ?? '';
  } catch {
    return '';
  }
}
```
Research recommends preferring `this.internals?.validationMessage ?? ''` over relying on the catch once the field is nullable.

**Fallback mechanics (research Q4):** append `document.createElement('input')` (`type="hidden"` or a hidden constrained input) as a **light-DOM child of the host** (`this.appendChild(input)`, NOT the shadow root — proven necessary by `test/browser/form-association.test.ts:280-286`), mirror `name`/`value`/`required`/`pattern`/`disabled`, and remove it in `disconnectedCallback` to avoid leak/double-register. No existing Light-DOM fallback analog exists — this is net-new, but it consumes the same value-transition seam as `setFormValue`. Keep it plain-DOM (no Lit `html`, no `innerHTML`/`eval` — project security constraint).

**XOR gate:** engages ONLY when `!hasFormAssociation()` AND the consumer opted in — never both channels (no double-submit).

---

### `src/compat-forms.ts` + `package.json` (NEW — side-effect subpath entry, COMPAT-03)

**Analog:** existing `package.json` `exports` map (lines 19-47) and `sideEffects` array (lines 52-58)

**Exports subpath precedent** (package.json:28-44) — `./components/*`, `./styles/*`, `./tokens`, `./utilities/*` establish the shape; add one key:
```jsonc
".": { "types": "./dist/index.all.d.ts", "import": "./dist/amris.js" },
"./core": { "types": "./dist/index.d.ts", "import": "./dist/amris-core.js" },
// ADD:
"./compat-forms": { "types": "./dist/compat-forms.d.ts", "import": "./dist/compat-forms.js" },
```

**sideEffects allowlist** (package.json:52-58) — add the emitted path so the opt-in side effect survives tree-shaking:
```jsonc
"sideEffects": [
  "./dist/amris.js",
  "./dist/amris-core.js",
  "./dist/components/**/*.js",
  "./dist/chunks/**/*.js",
  "./dist/styles/*.js"
  // ADD: "./dist/compat-forms.js"
],
```
The module body sets a module-level `FORM_FALLBACK_ENABLED = true` (side effect). Also requires a Vite `lib` build entry to emit `dist/compat-forms.js` + `.d.ts`, and adding the subpath to the `npm run smoke` entry matrix. Keeps `index.ts`/`index.all.ts` export lists byte-frozen (invisible to the CEM surface-diff gate). Ships with the one `[CS]` Changeset.

---

### 8 component `static styles` — `@supports selector(:has(*))` guards (COMPAT-06)

**Analog:** `src/components/card/card.ts:72-78` (the identical empty-slot-collapse pattern in all 10 sites). NO existing `@supports` usage in `src/` — this is a new idiom wrapped around the existing `css` template.

**Current pattern to guard** (card.ts:72-78):
```css
/* Hide empty slots */
.header:not(:has(::slotted(*))) {
  display: none;
}
.footer:not(:has(::slotted(*))) {
  display: none;
}
```

**Guarded form to author** (research Code Examples, D-05 — functional default OUTSIDE, modern enhancement INSIDE):
```css
.header { display: block; }              /* functional default outside — old engines get usable layout */
@supports selector(:has(*)) {            /* NON-EMPTY :has(*) — selector(:has()) is false in Safari */
  .header:not(:has(::slotted(*))) { display: none; }
}
```

**All 10 rules (research Q5):** card.ts:73, card.ts:76, panel.ts:57, dialog.ts:162, app-shell.ts:48, app-shell.ts:61, app-shell.ts:73, drawer.ts:188, side-nav.ts:133, side-nav.ts:149. Zero container-query sites (keep it that way). `adoptedStyleSheets` needs no guard (Lit's built-in `<style>` fallback handles it).

**Landmine:** the `display: block` default must match what the `:has()` rule produced when the slot is non-empty (the `:not(:has(...))` only fires when EMPTY), so above-floor rendering is unchanged.

---

### `vitest.config.ts` browser project + `.github/workflows/ci.yml` (COMPAT-04)

**Analog:** `vitest.config.ts:58-72` (the `browser` project, chromium-only today)

**Current shape** (vitest.config.ts:65-70):
```typescript
browser: {
  enabled: true,
  provider: playwright(),
  headless: true,
  instances: [{ browser: 'chromium' }],
},
```

**Extend to** (research Q6, D-06) — add webkit + firefox instances each scoped via per-instance `include` to the 4 load-bearing + new Phase-10 specs. Leave the `perf` project (vitest.config.ts:89-104) `instances: [{ browser: 'chromium' }]` UNCHANGED — CDP throttle stays Chromium-only. The exact per-instance `include` key must be confirmed against `@vitest/browser-playwright` 4.1.9 in Wave 0 (fallback: separate project per engine). Add `webkit firefox` to the `browser` CI job's `npx playwright install` step ONLY (not the perf job).

## Shared Patterns

### Memoize-once (`??=`) + test-reset
**Source:** `src/internal/helpers/lazy-load.ts:31,51-60,113-116`
**Apply to:** `capabilities.ts` (all four probes + `__resetCapabilitiesForTest`)
```typescript
let floatingPromise: ... | null = null;
export function loadFloating() { return (floatingPromise ??= ...); }
export function __resetLazyLoadCachesForTest(): void { floatingPromise = null; /* ... */ }
```

### Null-tolerant internals access
**Source:** `src/internal/controllers/validation.ts:114-122`
**Apply to:** all 16 constructors' call sites + `form-participation.ts` (internals may now be null)
```typescript
try { return this._opts.internals().validationMessage ?? ''; } catch { return ''; }
// prefer: this.internals?.validationMessage ?? ''
```

### Off-CEM-surface internal boundary
**Source:** `src/internal/helpers/lazy-load.ts:1-29` header discipline
**Apply to:** `capabilities.ts`, `attach-internals-safe.ts`, `form-participation.ts` — no custom element, never re-exported from `src/index.ts`/`src/index.all.ts`, tree-shaken from consumer bundles.

### Component `css` static-styles + `--am-*` tokens
**Source:** `src/components/input/input.ts:92-163`, `card.ts:56-79`
**Apply to:** all 8 CSS-guard edits — wrap existing rules; no hardcoded colors, use `--am-*` tokens (unchanged here since `:has()` rules only toggle `display`).

## No Analog Found (net-new mechanisms — use research, not a copy)

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/internal/helpers/form-participation.ts` (Light-DOM `<input>` append + teardown) | service | form-I/O | No Light-DOM hidden-input fallback exists in-repo; nearest analog is the internals-consuming validation controller. Follow research Q4 mechanics + the `test/browser/form-association.test.ts:280-286` shadow-input-non-association proof. |
| `@supports selector(:has(*))` wrap | component CSS | transform | Zero `@supports` usage anywhere in `src/` today; the wrap is a new idiom around the existing `css` pattern (research Code Examples gives exact syntax). |
| `src/compat-forms.ts` side-effect module body (`FORM_FALLBACK_ENABLED = true`) | entry | request-response | No side-effect-only entry module exists; the `exports`/`sideEffects` shape is the analog, not the module body. |

## Metadata

**Analog search scope:** `src/internal/helpers/`, `src/internal/controllers/`, `src/components/{input,button,card}/`, `vitest.config.ts`, `package.json`, `src/` grep for `@supports`
**Files scanned:** 8 read + 3 grep verifications
**Pattern extraction date:** 2026-08-25
</content>
</invoke>
