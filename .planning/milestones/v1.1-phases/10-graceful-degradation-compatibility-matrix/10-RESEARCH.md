# Phase 10: Graceful Degradation & Compatibility Matrix - Research

**Researched:** 2026-08-25
**Domain:** Cross-engine graceful degradation of a frozen-API Lit 3 / Web Components library (ElementInternals feature-detection, hidden-input form fallback, `@supports` CSS guards, widened WebKit/Firefox test matrix)
**Confidence:** HIGH (every in-repo claim read from source this session; external browser-floor facts web-verified against MDN/caniuse/WebKit/Bugzilla)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (COMPAT-03 opt-in):** GLOBAL side-effect opt-in, applied **below-floor only**. Consumer enables the fallback once at app init (not per-element, not auto-on). At/above the floor it is a no-op — ElementInternals wins (XOR, no double-submit). One-way reversibility once published (the one `[CS]` item).
- **D-02 (packaging — DELEGATED TO RESEARCH):** side-effect subpath import (`@willramanand/amris/compat-forms`) **vs** a named runtime export (`enableFormFallback()`). Preference signal: keep the main `index.ts` export list byte-unchanged if feasible (favors the subpath shape). Research decides against the real `exports` map + Changeset/semver discipline. **→ Resolved below: subpath side-effect module. See Q1.**
- **D-03 (fallback fidelity):** value **+ native validation** — mirror the control value AND project `required`/`pattern` onto the hidden input so the browser blocks invalid submit below floor. Hard guard: no double-validation, no divergence from the above-floor ElementInternals path — fallback and native path are XOR (one channel or the other, never both).
- **D-04 (COMPAT-02 DX signal):** one-time, globally-deduped `console.warn`, fires **only** below floor **with fallback OFF**, names the missing capability, points to the `/compat-forms` opt-in. Fallback ON → silent. At/above floor → silent.
- **D-05 (COMPAT-06):** `@supports` progressive-enhancement — functional default OUTSIDE the block, modern enhancement INSIDE. Guard **EVERY** `:has()` / container-query usage, including cosmetic ones. `adoptedStyleSheets` already handled by Lit's internal fallback (audit confirms, no new guard).
- **D-06 (COMPAT-04):** WebKit + Firefox run the 4 load-bearing browser specs + the new Phase-10 degradation specs. The full `test/browser/**` lane and ALL CDP throttling stay Chromium-only.
- **Cross-cutting:** user prefers MAXIMAL graceful-degradation reach over the cheaper option, accepting higher proof cost. Do not silently narrow scope — flag it if a maximal choice proves infeasible.

### Claude's Discretion
- Exact fallback packaging (D-02) — resolved to subpath below.
- `capabilities.ts` probe API shape (module-level memoized functions vs frozen probed-object) — recommendation below, planner picks.
- COMPAT-02 feature-detect implementation: per-constructor `try/catch` vs a shared guarded helper — recommendation below (shared helper), planner picks.
- Which single overlay/component represents each degradation scenario in cross-engine specs — reuse existing browser-lane fixtures.
- The true empirical per-capability floor (COMPAT-05) — resolved empirically on the widened matrix during execution; authoritative version table provided below as the starting hypothesis.

### Deferred Ideas (OUT OF SCOPE)
- `capabilities.ts` probe API shape ambition, `BROWSER_SUPPORT.md` floor-claim ambition, COMPAT-03 Changeset semver-bump level — planner/Changeset mechanics.
- Full RTL audit across overlays (`RTL-V2-01`) → v2.
- `@microsoft/api-extractor` `.d.ts` surface guard (`TEST-V2-02`) → v2.
- Flipping size/count budgets to enforcing + per-component cost cards → **Phase 11** (GATE-*/DOCS-04). All budgets stay report-only this phase; nothing red-builds.
- Hard ElementInternals polyfill → out of scope permanently (not polyfillable; degrade instead).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMPAT-01 | Memoized `capabilities.ts` probing each sub-capability independently (FACE vs ARIA reflection vs `adoptedStyleSheets` vs `:has()`), with jsdom capability-off tests | Q3 — probe expressions, memoization idiom (mirrors `lazy-load.ts`), jsdom shim strategy |
| COMPAT-02 | Form controls feature-detect ElementInternals so the constructor no longer throws below Safari 16.4; element still upgrades/renders/emits | Q2 — 16 `attachInternals()` sites enumerated, shared guarded-attach helper + null-safe call-site idiom |
| COMPAT-03 | Hidden-input Light-DOM form-participation fallback, XOR-gated on absent `setFormValue`, ships with Changeset **[CS]** | Q1 (packaging) + Q4 (mechanics) + Q7 (Changeset/CI) |
| COMPAT-04 | Widened tested-engine matrix — WebKit+Firefox on the load-bearing lane; CDP throttling stays Chromium-only | Q6 — per-project browser instances config shape, engine quirks |
| COMPAT-05 | Document true per-capability floor (= max(JS-API, CSS-feature)) + degradation matrix in `BROWSER_SUPPORT.md` | Q5 + Q6 — authoritative version table, empirically confirmed on the matrix |
| COMPAT-06 | CSS-feature audit (`:has()`, container queries, `adoptedStyleSheets`) with `@supports` guards | Q5 — 10 `:has()` sites, 0 container-query sites, guard syntax + Safari gotcha |
</phase_requirements>

## Summary

Phase 10 is almost entirely edits on the **non-exported `src/internal/` boundary** plus CSS `@supports` guards inside existing `static styles`, so nearly every deliverable is surface-preserving by construction — the one exception is COMPAT-03, which adds a Light-DOM `<input>` behavior below the floor and ships `[CS]` with a Changeset. Two new internal helpers land (`capabilities.ts`, `form-participation.ts`), 16 constructors get a guarded-attach edit, 10 CSS rules get `@supports` guards, and the Vitest `browser` project gains WebKit+Firefox instances scoped to a spec subset.

The load-bearing structural facts, all verified in-repo this session: (1) 16 `attachInternals()` call sites across 15 files — two variable-name conventions (`this.internals` in 9 sites, `this._internals` in 7) — each raw in the constructor, each of which throws below Safari 16.4 `[VERIFIED: grep src/components/**]`. (2) The `lazy-load.ts` memoize-once idiom (module-level `x ??= …`) is the exact template `capabilities.ts` should mirror `[VERIFIED: src/internal/helpers/lazy-load.ts:31-60]`. (3) The CEM surface-diff gate keys off `custom-elements.json` and passes surface drift **iff a pending Changeset accompanies it** — so a subpath `exports` entry (which never touches `custom-elements.json`) is invisible to it, and the `[CS]` Changeset for COMPAT-03 satisfies it regardless `[VERIFIED: scripts/cem-diff.mjs:28-42,118-132]`. (4) jsdom `^29` does **not** implement `setFormValue`; the jsdom lane pins to a `MockElementInternals` unconditionally, so capability-off testing is a matter of shimming globals, not fighting jsdom `[VERIFIED: test/setup.ts:113-136]`.

**Primary recommendation:** Package COMPAT-03 as a **side-effect subpath module** (`@willramanand/amris/compat-forms`) — it adds exactly one `exports` key + one `sideEffects` glob entry, leaves the `index.ts`/`index.all.ts` export lists byte-frozen, tree-shakes out when unused, and matches the ergonomic the user already liked (`import '@willramanand/amris/compat-forms'` at app init). Route all 16 constructors through a shared `attachInternalsSafe()` helper returning `ElementInternals | null`, and make every `internals?.setFormValue(...)`/`internals?.setValidity(...)` call site null-safe. Gate the hidden-input fallback strictly on `!capabilities.hasFormAssociation` (absent `setFormValue`) so internals-XOR-fallback holds and nothing double-submits.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capability probing (FACE/ARIA/`:has()`/`adoptedStyleSheets`) | `src/internal/helpers/capabilities.ts` (NEW) | — | Single memoized module; off the CEM surface; consumed by constructors + fallback + tests |
| Guarded ElementInternals attach | `src/internal/helpers/` shared helper (NEW) | 16 component constructors | Chokepoint keeps the 16 edits uniform + testable; components call it, don't re-implement the guard |
| Hidden-input form participation | `src/internal/helpers/form-participation.ts` (NEW) | Light-DOM `<input>` child of host; the enclosing `<form>` | Off CEM surface; the `<input>` lives in consumer light DOM so the native form serializes it |
| Below-floor DX warning | `capabilities.ts` / `form-participation.ts` (module-level dedupe flag) | dev console | One-time global side effect; no public surface |
| CSS `@supports` guards | Component `static styles` CSS (10 rules) | — | Pure CSS PE; browser resolves; no JS timing/FOUC |
| Cross-engine validation | `vitest.config.ts` `browser` project + `test/browser/**` | Playwright WebKit/Firefox binaries | Config-only; degradation is real-DOM, jsdom cannot prove it |
| True-floor documentation | `BROWSER_SUPPORT.md` (repo root) | — | Consumer-facing doc; not shipped code |

## Standard Stack

No new runtime or dev dependencies are required. Every capability this phase needs is already present.

### Core (all already installed — versions verified in `package.json` this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lit` (peer) | `^3.3.2` | Component base; `static styles`→`adoptedStyleSheets` with automatic `<style>` fallback (covers COMPAT-06 3rd leg) | Already the library foundation `[VERIFIED: package.json:117-119]` |
| `vitest` | `^4.1.0` | Test runner; Browser Mode drives the widened matrix | Already the lane `[VERIFIED: package.json:115]` |
| `@vitest/browser-playwright` | `4.1.9` | Playwright provider for Vitest Browser Mode; supplies the `instances` array COMPAT-04 extends | Already wired `[VERIFIED: package.json:101; vitest.config.ts:4,65-69]` |
| `playwright` | `^1.62.1` | WebKit/Firefox/Chromium binaries. WebKit+Firefox binaries must be **installed** (CI installs chromium only today) | Already a devDep `[VERIFIED: package.json:107]` |
| `@changesets/cli` | `^2.6.0` | The `[CS]` Changeset for COMPAT-03 | Already wired `[VERIFIED: package.json:94; .changeset/config.json exists]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright WebKit/Firefox in Vitest Browser Mode | A separate Playwright test project | Rejected — fragments CI; the repo's rule is "extend the existing Vitest browser project, do not add a parallel toolchain" `[CITED: .planning/research/ARCHITECTURE.md:114,276-277]` |
| Subpath side-effect module (`/compat-forms`) | Named export `enableFormFallback()` on main entry | See Q1 — subpath keeps `index.ts` byte-frozen; named export adds a runtime export to the frozen surface list |
| Shared `attachInternalsSafe()` helper | Per-constructor `try/catch` in all 16 | Shared helper matches the `src/internal/` chokepoint discipline + keeps the 16 edits uniform; per-constructor is 16 divergent guards |

**Installation:** none. One CI/local **binary install step** is required (not an npm dependency):
```bash
npx playwright install webkit firefox   # chromium already installed in CI
```

## Package Legitimacy Audit

No external packages are installed in this phase. All libraries used are already in `package.json` and were verified there this session. **Package Legitimacy Gate: N/A (no new installs).**

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌────────────────────────────────────────────┐
  consumer app init       │  (opt-in, below-floor only — COMPAT-03)     │
  import '.../compat-forms'│  side-effect module sets a module-level     │
        │                 │  global: FORM_FALLBACK_ENABLED = true        │
        ▼                 └────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────────────────────┐
  │  16 form-associated component constructors                            │
  │     super();                                                          │
  │     this.internals = attachInternalsSafe(this);   ◀── COMPAT-02       │
  │              │  returns ElementInternals | null                       │
  └──────────────┼───────────────────────────────────────────────────────┘
                 ▼
        capabilities.hasFormAssociation ?  ◀── COMPAT-01 (memoized probe)
        ├─ true  → internals.setFormValue()/setValidity()   (v1.0 path, UNCHANGED)
        └─ false → FORM_FALLBACK_ENABLED ?
                   ├─ true  → form-participation.ts: append hidden <input>    ◀─ COMPAT-03
                   │          in host LIGHT DOM, mirror value+name+required+  (XOR: only
                   │          pattern+disabled; native <form> serializes it    when FACE absent)
                   └─ false → one-time console.warn(→ /compat-forms)    ◀── COMPAT-02 / D-04
                                                                          (silent if fallback on)

  ┌──────────────────────────────────────────────────────────────────────┐
  │  CSS (COMPAT-06):  .header { display:block }         ← functional default│
  │     @supports selector(:has(*)) {                    ← guard              │
  │       .header:not(:has(::slotted(*))) { display:none } ← modern enhancement│
  │     }                                                                    │
  └──────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │  Vitest `browser` project (COMPAT-04):                                 │
  │   instances: [ {chromium}, {webkit, spec-subset}, {firefox, subset} ]  │
  │   perf project: {chromium} ONLY — CDP throttle unchanged               │
  └──────────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Memoized independent capability probes (COMPAT-01)

**What:** A single module-level-memoized `capabilities.ts` under `src/internal/helpers/`, mirroring the `lazy-load.ts` `x ??= …` probe-once idiom `[VERIFIED: src/internal/helpers/lazy-load.ts:31-60]`.
**When to use:** Any code that must branch on a browser capability (constructors, the fallback, tests).
**Recommended shape** — module-level lazily-memoized functions (probe-once, matches `lazy-load.ts`; a frozen eager object would run all probes at import time even when unused). Each sub-capability is probed **independently** — this is the whole point (FACE, ARIA reflection, `:has()`, `adoptedStyleSheets` each ship on different dates):

```typescript
// src/internal/helpers/capabilities.ts  (NEW-internal, surface-preserving)
// Source: idiom mirrors src/internal/helpers/lazy-load.ts:31-60 (memoize-once ??=)

let _face: boolean | undefined;
/** ElementInternals FORM ASSOCIATION (setFormValue) — the form-submit floor. */
export function hasFormAssociation(): boolean {
  return (_face ??=
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.attachInternals === 'function' &&
    typeof (globalThis as any).ElementInternals !== 'undefined' &&
    'setFormValue' in (globalThis as any).ElementInternals.prototype);
}

let _ariaReflect: boolean | undefined;
/** ElementInternals ARIA REFLECTION (internals.role / ariaChecked). DIFFERENT
 *  floor than FACE — Safari/Firefox shipped it later than form association. */
export function hasAriaReflection(): boolean {
  return (_ariaReflect ??=
    typeof (globalThis as any).ElementInternals !== 'undefined' &&
    'role' in (globalThis as any).ElementInternals.prototype);
}

let _adopted: boolean | undefined;
export function hasAdoptedStyleSheets(): boolean {
  return (_adopted ??=
    typeof Document !== 'undefined' && 'adoptedStyleSheets' in Document.prototype);
}

let _has: boolean | undefined;
export function supportsHas(): boolean {
  // NOTE the non-empty argument :has(*): a bare selector(:has()) returns false
  // in Safari even though Safari supports :has() — Safari requires an inner
  // selector. :has(*) is non-empty, so this is true on all engines that ship
  // :has(). [CITED: bram.us/2023/01/04 + caniuse css-has]
  return (_has ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:has(*))'));
}
```

**jsdom capability-off testing:** the jsdom lane pins ElementInternals to a `MockElementInternals` unconditionally and jsdom `^29` does not implement `setFormValue` natively `[VERIFIED: test/setup.ts:113-136]`. To force a probe false in a jsdom unit test, delete/redefine the global before importing the module (or reset the memo). Because the probes read `globalThis.ElementInternals.prototype`, a test can do:

```typescript
// capability-off: force hasFormAssociation() false
const saved = (globalThis as any).ElementInternals;
delete (globalThis as any).ElementInternals;
// import capabilities fresh (vitest resetModules) OR expose a __resetForTest()
// mirroring lazy-load.ts:__resetLazyLoadCachesForTest [VERIFIED: lazy-load.ts:113-116]
expect(hasFormAssociation()).toBe(false);
(globalThis as any).ElementInternals = saved;
```

Recommend exporting a `__resetCapabilitiesForTest()` matching the `__resetLazyLoadCachesForTest` precedent `[VERIFIED: src/internal/helpers/lazy-load.ts:113-116]` so capability-off specs are order-independent.

### Pattern 2: Shared guarded-attach helper (COMPAT-02)

**What:** Replace all 16 raw `this.internals = this.attachInternals()` / `this._internals = this.attachInternals()` with a call to one helper that returns `ElementInternals | null` and never throws.

```typescript
// src/internal/helpers/ (NEW-internal)
export function attachInternalsSafe(host: HTMLElement): ElementInternals | null {
  if (!hasFormAssociation()) return null;      // below floor → no throw, element still upgrades
  try {
    return host.attachInternals();
  } catch {
    return null;                                // partial engine: method present, association absent
  }
}
```

**Call-site consequence (the critical work):** the field type widens from `ElementInternals` to `ElementInternals | null`, so every one of the ~44 `internals`/`_internals` call sites must become null-safe. All setter sites already sit inside `willUpdate`/change handlers, so optional-chaining is behavior-identical above the floor:

- `this.internals.setFormValue(v)` → `this.internals?.setFormValue(v)` (or route through `form-participation.ts` seam)
- `this.internals.setValidity(flags, msg, anchor)` → `this.internals?.setValidity(...)`
- `this._internals.form` (button getter) → `this._internals?.form ?? null` `[VERIFIED: src/components/button/button.ts:52-54]`
- `ValidationController` already null-guards: `this._opts.internals().validationMessage` is wrapped in `try/catch` returning `''` `[VERIFIED: src/internal/controllers/validation.ts:114-122]` — so passing `() => this.internals` where `internals` may be `null` needs the accessor to tolerate null (the existing `try/catch` covers a throw, but `null.validationMessage` throws a TypeError which the `catch` also swallows — safe, but prefer `this.internals?.validationMessage ?? ''`).

**Enumerated call-site patterns that could NPE when internals is absent** `[VERIFIED: grep src/components/**]`:
| Pattern | Sites | Files |
|---------|-------|-------|
| `internals.setFormValue(...)` | 16 | combobox, color-picker, checkbox, date-picker, input-otp, number-field, radio (×2), input, select, slider, rich-select, switch, textarea, time-picker |
| `internals.setValidity(...)` | ~28 | same set (each has a valid + reset branch) |
| `internals.form` | 1 | button (getter `get form()`) |
| `internals` passed to `ValidationController({ internals: () => this.internals })` | ~13 | all text/choice controls wiring validation `[VERIFIED: src/components/input/input.ts:69-73]` |

**Two variable-name conventions in-repo** — the planner must handle both: `this.internals` (9 sites: checkbox, combobox, input, select, switch, slider, radio×2, textarea) and `this._internals` (7 sites: button, date-picker, input-otp, color-picker, number-field, rich-select, time-picker) `[VERIFIED: grep attachInternals src/components/**]`. Consider normalizing to one name during this edit, or leave each as-is and only change the RHS + type.

### Pattern 3: Hidden-input Light-DOM fallback, XOR-gated (COMPAT-03)

**What:** When `hasFormAssociation()` is false AND the consumer opted in, `form-participation.ts` appends a `<input type="hidden">` (or a `hidden` text input carrying constraints — see Q4) as a **light-DOM child of the host element** (not in the shadow root), mirroring `name`, `value`, `required`, `pattern`, and `disabled`. A light-DOM child of the host is a descendant of the enclosing `<form>`, so the native form serializes it. See Q4 for the full mechanics and pitfalls.
**XOR guarantee:** the seam picks exactly one channel per capability result — `hasFormAssociation()` true → ElementInternals only (fallback never engages); false+opted-in → hidden input only. There is no code path where both run, so no double-submit `[CITED: .planning/research/PITFALLS.md:211-230]`.

### Anti-Patterns to Avoid
- **Adding a public `compat`/`fallback` attribute to any component** — trips the CEM surface gate, breaks the freeze `[CITED: .planning/research/ARCHITECTURE.md:261-266]`.
- **`CSS.supports('selector(:has())')` with an empty `:has()`** — returns false in Safari even though Safari supports `:has()`. Always use a non-empty argument `[CITED: bram.us/2023/01/04]`.
- **Polyfilling ElementInternals** — not polyfillable; forbidden by constraints. Degrade instead `[CITED: .planning/research/ARCHITECTURE.md:267-271]`.
- **Guarding the fallback on `'attachInternals' in HTMLElement.prototype` alone** — necessary but not sufficient; a partial engine exposes the method without `setFormValue` and then throws. Gate on `setFormValue` presence `[CITED: .planning/research/PITFALLS.md:192-208]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `adoptedStyleSheets` fallback for old engines | A manual `<style>` injector | Lit's built-in `static styles`→per-shadow-root `<style>` fallback | Already automatic; the audit only confirms it, no new guard `[VERIFIED: BROWSER_SUPPORT.md:23; CITED: .planning/research/ARCHITECTURE.md:176]` |
| Native constraint validation below floor | A JS validation engine | Project `required`/`pattern` onto the hidden `<input>`; let the browser validate | The browser already blocks invalid submit on a real input (D-03) |
| Memoize-once probe cache | A custom cache class | The `x ??= …` module-level idiom | Matches `lazy-load.ts` precedent `[VERIFIED: lazy-load.ts:31-60]` |
| Cross-engine test harness | A new Playwright project | Vitest Browser Mode `instances` array | Already the lane `[VERIFIED: vitest.config.ts:65-69]` |
| CSS feature detection at runtime in JS | JS probe + host class | `@supports` blocks in `static styles` | Pure CSS, no FOUC, no JS coupling (D-05) |

**Key insight:** graceful degradation here is 90% wiring existing platform behavior (native form serialization of light-DOM inputs, `@supports`, Lit's stylesheet fallback) — the risk is not building the mechanism but proving the XOR gate and the no-double-submit / no-above-floor-divergence invariants.

## Common Pitfalls

### Pitfall 1: Hidden-input fallback double-submits or diverges from the real value
**What goes wrong:** the hidden input coexists with a working `setFormValue`, so the field appears twice in `FormData`; or the input's value lags the component's value on clear/format/programmatic set.
**Why it happens:** the fallback is added defensively without strict gating on *absent* `setFormValue`, and without mirroring every value transition in one place.
**How to avoid:** XOR gate on `!hasFormAssociation()`; single source of truth mirrors value+validity on every update; a real-browser test asserts `FormData` parity between the internals path and the fallback path.
**Warning signs:** a field appears twice in submitted `FormData`; submitted value differs from displayed after a clear. `[CITED: .planning/research/PITFALLS.md:211-230]`

### Pitfall 2: Detecting ElementInternals as one atomic capability
**What goes wrong:** one `if ('attachInternals' in ...)` gate feeds FACE + ARIA reflection; a partial engine has working `setFormValue` but broken ARIA reflection → the control submits but is announced as a generic group with no role/state.
**How to avoid:** probe FACE and ARIA reflection **independently** (Pattern 1). FACE and ARIA reflection shipped on different dates per engine — verified below.
**Warning signs:** `setFormValue is not a function` on a partial engine; a custom control announced as "group" with no checked state. `[CITED: .planning/research/PITFALLS.md:189-208]`

### Pitfall 3: `:has()` / container-query silent CSS failure on old engines
**What goes wrong:** an unsupported selector is dropped, not thrown — the component renders in a subtly wrong state (empty slots reserve space instead of collapsing). Reads as a behavior regression on newly-claimed browsers.
**How to avoid:** author a functional default OUTSIDE `@supports`, the modern rule INSIDE (D-05). Test visually on the lowest engine.
**Warning signs:** cramped/misaligned UI only on old engines; no CSS-feature audit in the compat doc. `[CITED: .planning/research/PITFALLS.md:234-250]`

### Pitfall 4: Cross-engine Shadow-DOM / focus / form quirks surface only when the matrix widens
**What goes wrong:** WebKit/Firefox differ from Chromium in focus delegation (`delegatesFocus`, `activeElement` piercing), form association in nested shadow roots, and `ResizeObserver`/`autoUpdate` cadence (Firefox fires at a different rate → floating-ui `computePosition` churn).
**How to avoid:** run the 4 load-bearing specs (form submit, focus trap+restore, `<dialog>`/top-layer, floating-ui positioning) on all three engines; keep the existing `isConnected` + null-safe `.focus()` guards; gate `autoUpdate` on `open`.
**Warning signs:** focus tests green on Chromium, flaky on WebKit; tooltip repositions constantly only in Firefox; form submit works in Chrome, empty in Safari. `[CITED: .planning/research/PITFALLS.md:254-273]`

### Pitfall 5 (behavior-preservation LANDMINE): the guarded-attach edit changes above-floor timing/DOM
**What goes wrong:** widening `internals` to `| null` and routing setters through a seam accidentally reorders `setFormValue`/`setValidity` calls, changes `updated`/`willUpdate` timing, or drops a `setValidity({})` reset branch → observable divergence from v1.0 (validation timing, `:invalid` state, event cadence). The CEM surface gate will NOT catch this — it only checks shape.
**How to avoid:** the seam must be a pure pass-through when `internals` is non-null (optional-chaining only). Keep the existing `test/browser/form-association.test.ts` + `validation-timing.test.ts` + `validation-aria.test.ts` green unchanged as the above-floor regression proof `[VERIFIED: test/browser/ listing]`. Add below-floor specs separately.

## Code Examples

### COMPAT-06 `@supports` guard — the exact idiom for the 10 `:has()` rules
All 10 in-repo `:has()` usages are the identical empty-slot-collapse pattern `.X:not(:has(::slotted(*))) { display: none }` `[VERIFIED: grep :has( src/components/**]`. Guard each:

```css
/* functional default OUTSIDE the block — old engines get a usable (plainer) layout */
.header { display: block; }

/* modern enhancement INSIDE the guard */
@supports selector(:has(*)) {
  .header:not(:has(::slotted(*))) { display: none; }
}
```
Source shape confirmed by CONTEXT §specifics D-05. Gotcha: use `selector(:has(*))` (non-empty), never `selector(:has())` — the latter is false in Safari `[CITED: bram.us/2023/01/04]`. `@supports selector(...)` itself is supported at/below the `:has()` floor on all three engines, so the guard is safe.

### COMPAT-04 widened matrix — per-project `instances` (config shape)
```typescript
// vitest.config.ts — browser project instances (COMPAT-04, D-06)
// Source: current shape at vitest.config.ts:65-69 (chromium-only today)
browser: {
  enabled: true,
  provider: playwright(),
  headless: true,
  instances: [
    { browser: 'chromium' },                                   // full test/browser/** lane
    { browser: 'webkit',  include: ['test/browser/{form-association,overlay-focus,dialog-top-layer,floating-position,capabilities-off,form-fallback,supports-guards}.test.ts'] },
    { browser: 'firefox', include: ['test/browser/{form-association,overlay-focus,dialog-top-layer,floating-position,capabilities-off,form-fallback,supports-guards}.test.ts'] },
  ],
}
// perf project stays instances: [{ browser: 'chromium' }] — CDP throttle unchanged [VERIFIED: vitest.config.ts:89-104]
```
Per-instance `include` narrows WebKit/Firefox to the 4 load-bearing + new degradation specs (D-06). Vitest Browser Mode supports per-instance test filtering via the `instances[].include` / project-level config; confirm the exact key against the installed `@vitest/browser-playwright` 4.1.9 during planning (the 4.1.x schema is what `vitest.config.ts` already targets). **[ASSUMED — exact per-instance `include` key must be confirmed against the 4.1.9 schema during Wave 0; the fallback is a separate project per engine.]**

## Runtime State Inventory

This is not a rename/refactor phase (no stored data, service config, or OS-registered state carries a renamed string). The relevant "state" is the **frozen public contract** and the **CI gate wiring**:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Frozen surface baseline | `api/custom-elements.baseline.json` — the CEM surface the diff gate enforces `[VERIFIED: package.json:65; scripts/cem-diff.mjs:1-17]` | No change (all internal edits are off-surface). COMPAT-03's `[CS]` Changeset is what authorizes the one intentional behavior addition |
| `exports` map | `package.json` exports has no `/compat-forms` key today `[VERIFIED: package.json:19-47]` | Add one subpath key (Q1) |
| `sideEffects` allowlist | `["./dist/amris.js","./dist/amris-core.js","./dist/components/**/*.js","./dist/chunks/**/*.js","./dist/styles/*.js"]` `[VERIFIED: package.json:52-58]` | Add the compat-forms emitted path so its side effect is preserved through tree-shaking |
| CI Playwright binaries | CI installs **chromium only** (`npx playwright install chromium`) in `browser` + `perf` jobs `[VERIFIED: .github/workflows/ci.yml:48,108]` | Add `webkit firefox` to the `browser` job's install step (NOT the `perf` job) |
| New-file targets | `src/internal/helpers/capabilities.ts` and `form-participation.ts` do **not** exist yet `[VERIFIED: glob src/internal/helpers/*.ts → date-utils, time-utils, teardown-scope, virtualize-support, lazy-load]` | Create both |

**Nothing found in category:** stored data, live service config, OS-registered state, secrets/env vars — None (verified: this is a code + config + CSS phase with no external datastore or runtime registration).

## Detailed Answers to Priority Research Questions

### Q1 — COMPAT-03 packaging: **subpath side-effect module** `@willramanand/amris/compat-forms`

**Recommendation: the subpath side-effect import.** Reasons, grounded in the real files:

1. **Keeps `index.ts` / `index.all.ts` export lists byte-frozen** (the user's stated preference signal, D-02). The named-export alternative (`enableFormFallback()`) would add a runtime export to the main entry's export list — a public-API addition the user asked to avoid if feasible.
2. **Adds exactly two lines to `package.json`:** one `exports` key and one `sideEffects` glob entry. The current `exports` map already has the `./components/*`, `./styles/*`, `./tokens`, `./utilities/*` subpath precedent `[VERIFIED: package.json:19-47]` — `/compat-forms` fits the established shape. Example:
   ```jsonc
   // exports (add):
   "./compat-forms": { "types": "./dist/compat-forms.d.ts", "import": "./dist/compat-forms.js" },
   // sideEffects (add): "./dist/compat-forms.js"
   ```
3. **Invisible to the CEM surface-diff gate.** The gate reads `dist/custom-elements.json` and diffs tagName/attributes/fields/events/slots/cssParts/cssProperties `[VERIFIED: scripts/cem-diff.mjs:28-42]`. A subpath module registers no custom element and adds no CEM declaration, so it produces **zero surface drift** — the gate stays green *even without* the Changeset. (The Changeset is still required per the `[CS]` requirement to version the new below-floor behavior; the gate additionally passes any drift *iff* a pending Changeset exists `[VERIFIED: scripts/cem-diff.mjs:118-132,176-184]`, so both paths are covered.)
4. **Tree-shaken out when unused** — because it is a distinct entry, a consumer who never imports `@willramanand/amris/compat-forms` never pulls the fallback bytes. The `sideEffects` entry ensures that *when imported*, its module-level opt-in side effect (`FORM_FALLBACK_ENABLED = true`) is preserved.
5. **Matches the ergonomic the user liked:** `import '@willramanand/amris/compat-forms'` at app init, one line, below-floor-only, no per-element markup (CONTEXT §specifics + D-01).

**What the Changeset documents:** a minor bump (additive, opt-in Light-DOM behavior below the floor; no change to the frozen CEM surface). It should state: new `@willramanand/amris/compat-forms` opt-in subpath; enables hidden-input form participation strictly below the ElementInternals floor; no-op at/above the floor; XOR with ElementInternals. Semver bump level is planner/Changeset mechanics (deferred per CONTEXT).

**Build wiring caveat (flag for planner):** the subpath needs a Vite build entry so `dist/compat-forms.js` + `.d.ts` are emitted. The build is multi-entry lib mode `[VERIFIED: package.json:61 build script; .planning/research/ARCHITECTURE.md:57]`. Confirm the new entry is added to the Vite `lib` entry list and that the smoke test (`npm run smoke`) resolves the new subpath — the smoke test resolves the documented entry matrix `[VERIFIED: .github/workflows/ci.yml:159-176]`.

### Q2 — COMPAT-02 feature-detect: **shared `attachInternalsSafe()` helper**, 16 sites

See Pattern 2 for the full enumeration and idiom. Key facts:
- **16 `attachInternals()` sites across 15 files** (radio.ts has two: `am-radio` at :44 and `am-radio-group` at :266) `[VERIFIED: grep attachInternals src/components/** — button:48, checkbox:69, combobox:226, color-picker:92, date-picker:111, input:86, input-otp:73, number-field:71, radio:44, radio:266, rich-select:141, select:311, slider:64, switch:70, textarea:79, time-picker:106]`.
- Recommend the **shared helper** over per-constructor `try/catch` — matches the chokepoint discipline, keeps 16 edits uniform, gives one test target. (Planner's call per CONTEXT discretion.)
- Return type when unavailable: `null`. Field type widens `ElementInternals` → `ElementInternals | null`. Every setter call site becomes `?.`-guarded (all ~44 sites enumerated in Pattern 2). Above the floor, optional-chaining on a non-null value is behavior-identical → surface/behavior-preserving.
- `shortcuts` is **not** a `setFormValue` control — it only reads `constructor.formAssociated` reflectively `[VERIFIED: src/components/shortcuts/shortcuts.ts:34-35]` and does not call `attachInternals()`; exclude it from the 16.

### Q3 — COMPAT-01 `capabilities.ts` probe design

Full design in Pattern 1. Summary:
- **Independent probes:** `hasFormAssociation()` (`'setFormValue' in ElementInternals.prototype`), `hasAriaReflection()` (`'role' in ElementInternals.prototype`), `hasAdoptedStyleSheets()` (`'adoptedStyleSheets' in Document.prototype`), `supportsHas()` (`CSS.supports('selector(:has(*))')`).
- **Memoization:** module-level `x ??= …` per probe (probe-once, lazy), mirroring `lazy-load.ts` `[VERIFIED: lazy-load.ts:31-60]`. Add `__resetCapabilitiesForTest()` mirroring `__resetLazyLoadCachesForTest` `[VERIFIED: lazy-load.ts:113-116]`.
- **jsdom capability-off:** jsdom `^29` does not implement `setFormValue`; the jsdom lane forces a `MockElementInternals` unconditionally `[VERIFIED: test/setup.ts:113-136]`. Capability-off tests delete/redefine `globalThis.ElementInternals` (or `Document.prototype.adoptedStyleSheets` / stub `CSS.supports`) then reset the memo and assert the probe returns false.

### Q4 — COMPAT-03 hidden-input fallback mechanics

**Form association without ElementInternals:** a custom element's shadow-DOM `<input>` cannot join the enclosing light-DOM `<form>` (confirmed in-repo: `am-search-field` renders a shadow `<input name>` and its value never reaches `FormData` `[VERIFIED: test/browser/form-association.test.ts:275-288]`). The fallback must therefore append the `<input>` to the **host's light DOM** (`this.appendChild(input)` or into a light-DOM slot), because a light-DOM descendant of the host is a descendant of the `<form>` and is serialized natively.

**Mechanics the seam must implement:**
- `name` — mirror `this.name` onto the input; re-mirror when `name` changes (reflected property on all controls `[VERIFIED: src/components/input/input.ts:46]`).
- `value` — sync on every value change (the same transitions that call `setFormValue` today). Single source of truth: the component's value; the input is a mirror.
- `required` / `pattern` — project onto the input so native constraint validation blocks invalid submit below the floor (D-03 value+validation). `pattern` exists as a property on `input` `[VERIFIED: src/components/input/input.ts:56]`.
- `disabled` / `readonly` — mirror `disabled` (a disabled input is not serialized; matches expected form semantics).
- **Teardown** — remove the light-DOM input on `disconnectedCallback` so it doesn't leak or double-register on re-connect.

**Pitfalls (cite):**
- **Duplicate submission** — XOR gate on `!hasFormAssociation()`; never both channels `[CITED: PITFALLS.md:211-230]`.
- **Name collisions / value divergence** — mirror in one place, every transition; assert `FormData` parity in a browser test.
- **The input escaping Shadow DOM** — it must be a *light-DOM* child of the host, not in the shadow root, or it won't associate. `am-search-field` is the in-repo proof that shadow inputs don't associate `[VERIFIED: test/browser/form-association.test.ts:280-286]`.
- **Consumer CSS reach** — a light-DOM input is visible to consumer CSS; keep it `hidden` + `aria-hidden` and use a reserved internal name convention; value stays authoritative in the component `[CITED: PITFALLS.md:217,376-377]`.
- **Validity UI degrades** — native `setValidity` custom-message display has no fallback; projecting `required`/`pattern` gives native constraint blocking, but the custom `ValidationController` message UI (`aria-describedby` error region) is ElementInternals-driven and degrades below floor — document this limit (do not work around) `[VERIFIED: src/internal/controllers/validation.ts:114-122]`.

### Q5 — COMPAT-06 CSS-feature audit surface

**`:has()` — 10 occurrences across 8 files, all the identical empty-slot-collapse pattern** `.X:not(:has(::slotted(*))) { display: none }` `[VERIFIED: grep :has( src/components/**]`:
| File:line | Rule |
|-----------|------|
| card.ts:73 | `.header:not(:has(::slotted(*)))` |
| card.ts:76 | `.footer:not(:has(::slotted(*)))` |
| panel.ts:57 | `.header:not(:has(::slotted(*)))` |
| dialog.ts:162 | `.footer:not(:has(::slotted(*)))` |
| app-shell.ts:48 | `.header:not(:has(::slotted(*)))` |
| app-shell.ts:61 | `.sidebar:not(:has(::slotted(*)))` |
| app-shell.ts:73 | `.footer:not(:has(::slotted(*)))` |
| drawer.ts:188 | `.footer:not(:has(::slotted(*)))` |
| side-nav.ts:133 | `.header:not(:has(::slotted(*)))` |
| side-nav.ts:149 | `.footer:not(:has(::slotted(*)))` |

**Container queries — ZERO occurrences** `[VERIFIED: grep "container-type|@container|container:" src/components/** → No matches found]`. This matches the prior research assumption ("grep shows no container queries today, keep it that way" `[CITED: PITFALLS.md:243]`). No container-query guard workload — but D-05 says guard *every* usage, so if any is introduced, guard it too.

**`adoptedStyleSheets` — already handled by Lit** — `static styles` delivers via constructable stylesheets with automatic per-shadow-root `<style>` fallback when unsupported `[VERIFIED: BROWSER_SUPPORT.md:23; CITED: .planning/research/ARCHITECTURE.md:176]`. The audit confirms this — no new guard needed (D-05).

**Guard syntax:** `@supports selector(:has(*)) { … }` around each rule, with the functional default outside (empty slots reserve space instead of collapsing below floor — a cosmetic degradation, which D-05 says to guard anyway). **Gotcha:** `selector(:has(*))` must have a non-empty argument (Safari returns false for empty `:has()`) `[CITED: bram.us/2023/01/04]`. `@supports selector()` itself is supported on Chrome 83+/Safari 9+/Firefox 69+ — well below the `:has()` floor, so the guard mechanism never itself fails silently `[CITED: caniuse css-supports selector]`.

### Q6 — COMPAT-04/05 widened matrix + true floor

**Config shape:** per-instance in the existing `browser` project's `instances` array (see Code Examples). Keep the `perf` project `instances: [{ browser: 'chromium' }]` unchanged — CDP throttle stays Chromium-only `[VERIFIED: vitest.config.ts:89-104]`. Add `webkit firefox` to the `browser` CI job's `npx playwright install` step only `[VERIFIED: .github/workflows/ci.yml:47-51]`.

**Real WebKit/Firefox quirks the planner should expect** `[CITED: PITFALLS.md:254-273]`: focus delegation & `activeElement` shadow-piercing differ (overlay focus-restore may land on wrong node/null); form association in nested shadow roots differs; Firefox `ResizeObserver`/`autoUpdate` cadence differs (floating-ui `computePosition` churn — visible only in Firefox); `<dialog>` top-layer/backdrop timing differs.

**True per-capability floor — authoritative version table** (starting hypothesis for `BROWSER_SUPPORT.md`; COMPAT-05 confirms empirically on the widened matrix):

| Capability | Chrome/Edge | Firefox | Safari | Source |
|-----------|-------------|---------|--------|--------|
| ElementInternals FACE (`setFormValue`, `formAssociated`) | 77 | 98 | **16.4** | `[VERIFIED: BROWSER_SUPPORT.md:22 + WebKit blog 13711]` — Safari 16.4 is the current documented floor |
| ElementInternals **ARIA reflection** (`internals.role`/`ariaChecked`) | shipping | **behind flag / later** | shipping | `[CITED: MDN ElementInternals; Bugzilla 1785412]` — DIFFERENT (later) floor than FACE; Firefox historically flag-gated (`accessibility.ARIAReflection.enabled`). **Confirm the FF ship version empirically on the matrix.** |
| `adoptedStyleSheets` | 73/109 | **101** | **16.4** | `[VERIFIED: BROWSER_SUPPORT.md:23]` |
| `:has()` / `@supports selector(:has(*))` | **105** | **121** | **15.4** | `[CITED: caniuse css-has]` — Firefox 121 is the `:has()` floor (already the documented FF floor `[VERIFIED: BROWSER_SUPPORT.md:12,25]`) |
| Native `<dialog>` + `showModal()` | 37 | 98 | 15.4 | `[VERIFIED: BROWSER_SUPPORT.md:24]` |
| `color-mix()` | 111 | 113 | 16.2 | `[VERIFIED: BROWSER_SUPPORT.md:26]` |

**The floor = max(JS-API floor, CSS-feature floor).** Current documented composite floor: Chrome/Edge 111, Firefox 121, Safari 16.4 `[VERIFIED: BROWSER_SUPPORT.md:6-14]`. The COMPAT-05 contribution is the *per-capability degradation matrix* below this floor (what still works, what degrades) — e.g. below Safari 16.4: forms fall back to hidden inputs (with `/compat-forms`), empty slots reserve space (`:has()` guarded), ARIA reflection may be absent (announced role/state degrades).

### Q7 — Changeset + CI-gate interactions

**Changeset flow:** `.changeset/` exists with `config.json` `[VERIFIED: glob .changeset/**]`. `npm run changeset` creates a pending markdown; `npm run version` applies it; `npm run release` publishes `[VERIFIED: package.json:67-69]`. The CEM diff gate counts pending changesets in `.changeset/` (any `*.md` except README) `[VERIFIED: scripts/cem-diff.mjs:118-132]`.

**Does the `/compat-forms` subpath trip any gate?**
- **CEM surface-diff gate** — NO. The subpath registers no custom element → no `custom-elements.json` declaration → zero drift `[VERIFIED: scripts/cem-diff.mjs:28-50]`. (And even if it did, the pending Changeset would pass it `[VERIFIED: cem-diff.mjs:176-184]`.)
- **`.size-limit.json` budgets** — the new entry is not in the measured set (core/full/button/data-grid/popover/first-load composite) `[VERIFIED: .size-limit.json]`, and all budgets are **report-only this phase** (`npm run size` posts, nothing red-builds; enforcing flip is Phase 11) `[VERIFIED: .github/workflows/ci.yml:131-152 + REQUIREMENTS.md GATE-01..03]`. No action.
- **No-bundled-Lit assertion** — the fallback uses Lit templates (or plain DOM) and imports no Lit copy; `assert-no-bundled-lit.mjs` is report-only this phase `[VERIFIED: .github/workflows/ci.yml:146-147]`. Keep the fallback importing `lit` as a bare external specifier if it uses `html` (it may just use `document.createElement('input')` and avoid Lit entirely — simpler).
- **Contract-doc drift check** — regenerates `docs/contract.md` from the CEM; unaffected by an off-surface subpath `[VERIFIED: .github/workflows/ci.yml:71-74]`.
- **Smoke test** — DOES resolve the documented entry matrix; the new subpath must be added to the smoke matrix so `npm run smoke` proves it resolves from an install `[VERIFIED: .github/workflows/ci.yml:174-176]`.

**Keeping every OTHER change surface-preserving + CI-green:** COMPAT-01/02/06 are off-surface (internal helpers + `?.` call sites + CSS `@supports`); the existing `test/browser/form-association.test.ts`, `validation-timing.test.ts`, `validation-aria.test.ts` must stay green **unchanged** as the above-floor behavior proof. Only COMPAT-03 carries the Changeset.

## Behavior-Preservation Landmines (explicit)

1. **Guarded-attach must be pure pass-through above the floor** — `internals?.setFormValue()` on a non-null value is identical to `internals.setFormValue()`. Do NOT reorder or drop any `setValidity({})` reset branch (each control has a valid-branch reset `[VERIFIED: grep setValidity src/components/**]`). Timing of `setFormValue`/`setValidity` within `willUpdate`/change handlers must not shift.
2. **`ValidationController` accessor now may return null** — `() => this.internals` where `internals` can be null; the controller's `_nativeMessage()` `try/catch` already swallows the throw `[VERIFIED: src/internal/controllers/validation.ts:114-122]`, but prefer `this.internals?.validationMessage ?? ''` to avoid relying on catch.
3. **CSS default-outside must not itself change above-floor rendering** — the functional default (`display: block`) must match what the `:has()` rule produced when a slot is *non-empty* (the `:not(:has(::slotted(*)))` only fires when EMPTY). Above the floor, `@supports` passes → the guarded rule applies exactly as today. Below, the default applies. Verify no above-floor visual diff on the widened matrix.
4. **Hidden-input fallback must not run above the floor** — XOR gate. A field appearing twice in `FormData` on a supported engine is a freeze violation `[CITED: PITFALLS.md:211-216]`.
5. **The below-floor `console.warn` must be truly one-time-global and fallback-OFF-only** — a per-element or fallback-ON warning changes observable dev-console behavior (D-04). Dedupe with a module-level boolean flag.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One `if('attachInternals' in ...)` gate for all internals features | Independent per-sub-capability probes | ARIA reflection shipped later than FACE per engine | COMPAT-01's whole rationale |
| `@supports selector(:has())` (empty) | `@supports selector(:has(*))` (non-empty) | Safari requires an inner selector | Empty form returns false in Safari `[CITED: bram.us/2023/01/04]` |
| Manual `adoptedStyleSheets` fallback | Lit's built-in `<style>` fallback | Lit 2+ | No new guard needed (D-05) |

**Deprecated/outdated:** none relevant — all APIs are current platform features.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact Vitest 4.1.9 per-instance `include` key for narrowing WebKit/Firefox to a spec subset | Q6 / Code Examples | If the key differs, fall back to a separate Vitest project per engine — same outcome, more config. Confirm in Wave 0. |
| A2 | ElementInternals ARIA-reflection ship version in Firefox (historically flag-gated `accessibility.ARIAReflection.enabled`) | Q6 table | The empirical floor for the ARIA-reflection row is resolved on the widened matrix during execution (COMPAT-05 by design) — the table is the starting hypothesis, not the final claim |
| A3 | The fallback can avoid importing Lit entirely (plain `document.createElement('input')`) | Q7 | If it uses `html`, ensure `lit` stays external; the no-bundled-Lit assert is report-only this phase regardless |
| A4 | Subpath needs a Vite `lib` build entry to emit `dist/compat-forms.js` + `.d.ts` | Q1 caveat | If the build entry is missed, the subpath 404s at install — the smoke test catches it |

## Open Questions (RESOLVED)

1. **Exact Vitest per-instance spec-filtering key (A1)** — What we know: `instances` array supports per-browser config; `vitest.config.ts` targets the 4.1.x schema. What's unclear: whether per-instance `include` is the exact key in 4.1.9 or whether a separate project per engine is cleaner. Recommendation: prototype in Wave 0; both reach D-06.
   RESOLVED: dispositioned inline in Plan 07 (widened matrix) Task 1 — use the per-instance `include` key, and if Vitest 4.1.9 rejects it, fall back to a separate top-level `browser-webkit` project scoped via its own `include`. Both reach the D-06 outcome; the executor picks empirically when it runs the suite.
2. **Firefox ARIA-reflection ship version (A2)** — resolved empirically on the widened matrix (COMPAT-05). Recommendation: document the tested-true floor from the actual WebKit/Firefox runs, not the hypothesis table.
   RESOLVED: empirical-by-design (COMPAT-05). Plan 07 (widened matrix) Task 1/2 observes Firefox's real ARIA-reflection result on the pinned Playwright binary (skipping only that one assertion, with a cited Bugzilla ref, if it genuinely fails); Plan 08 (BROWSER_SUPPORT.md) documents the observed floor rather than the hypothesis table.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test | ✓ | 20 (CI); size job 22 | — `[VERIFIED: ci.yml:21,123]` |
| Playwright Chromium | existing browser+perf lanes | ✓ | `playwright ^1.62.1` | — `[VERIFIED: ci.yml:48,108]` |
| Playwright **WebKit** | COMPAT-04 widened matrix | ✗ (not installed in CI) | via `playwright ^1.62.1` | none — must `npx playwright install webkit` |
| Playwright **Firefox** | COMPAT-04 widened matrix | ✗ (not installed in CI) | via `playwright ^1.62.1` | none — must `npx playwright install firefox` |
| Changesets CLI | COMPAT-03 `[CS]` | ✓ | `@changesets/cli ^2.6.0` | — `[VERIFIED: package.json:94]` |

**Missing dependencies with no fallback:** Playwright WebKit + Firefox binaries — but installing them is a one-line CI/local step (`npx playwright install webkit firefox`), not an npm dependency. Add to the `browser` CI job's install step and document for local runs. This is the single blocking action for COMPAT-04.

**Missing dependencies with fallback:** none.

## Validation Architecture

`workflow.nyquist_validation` is not set to false, so this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.0` (jsdom project + browser project + perf project) `[VERIFIED: package.json:115; vitest.config.ts:41-106]` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --project jsdom` (logic lane; capability-off unit tests) |
| Full suite command | `npm run test:browser` (Chromium + widened WebKit/Firefox) + `npx vitest run --project jsdom --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMPAT-01 | Each sub-capability probes independently; capability-off forces each false | unit (jsdom) | `npx vitest run --project jsdom test/capabilities.test.ts` | ❌ Wave 0 |
| COMPAT-02 | Constructor no longer throws below floor; element upgrades/renders/emits | unit + browser | `npx vitest run --project jsdom test/capabilities-off-constructor.test.ts` | ❌ Wave 0 |
| COMPAT-02 | Above-floor form participation UNCHANGED (regression proof) | browser | `npm run test:browser` (existing `test/browser/form-association.test.ts`) | ✅ `[VERIFIED: test/browser/form-association.test.ts]` |
| COMPAT-03 | Hidden-input restores submission below floor; `FormData` parity; NO double-submit above floor | browser (WebKit/FF + Chromium) | `npm run test:browser` (new `test/browser/form-fallback.test.ts`) | ❌ Wave 0 |
| COMPAT-04 | 4 load-bearing specs pass on WebKit+Firefox | browser matrix | `npm run test:browser` | ✅ specs exist; ❌ engine instances |
| COMPAT-05 | `BROWSER_SUPPORT.md` documents per-capability floor + degradation matrix | doc review | manual | ❌ Wave 0 (doc) |
| COMPAT-06 | `@supports`-guarded rules degrade functionally on old engines | browser (visual, WebKit/FF) | `npm run test:browser` (new `test/browser/supports-guards.test.ts`) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --project jsdom` (fast logic lane)
- **Per wave merge:** `npm run test:browser` (widened matrix) + jsdom coverage
- **Phase gate:** full browser matrix green + `npm run diff:surface` green (with the one COMPAT-03 Changeset) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/capabilities.test.ts` — COMPAT-01 independent-probe + capability-off unit tests (jsdom, shim globals, reset memo)
- [ ] `test/capabilities-off-constructor.test.ts` — COMPAT-02 no-throw-below-floor (jsdom, `hasFormAssociation()` false)
- [ ] `test/browser/form-fallback.test.ts` — COMPAT-03 `FormData` parity + no-double-submit + native `required`/`pattern` blocking (WebKit/FF/Chromium)
- [ ] `test/browser/supports-guards.test.ts` — COMPAT-06 guarded-rule degradation
- [ ] `vitest.config.ts` — add WebKit/Firefox `instances` to `browser` project (A1)
- [ ] `.github/workflows/ci.yml` — add `webkit firefox` to the `browser` job's Playwright install
- [ ] `.changeset/*.md` — the COMPAT-03 Changeset

## Security Domain

`security_enforcement` is absent (= enabled). This phase adds a Light-DOM `<input>` and CSS guards; the security surface is narrow.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Native constraint validation (`required`/`pattern` projected onto the hidden input); value stays authoritative in the component — mirror, don't relocate `[CITED: PITFALLS.md:376-377]` |
| V6 Cryptography | no | — |
| V2/V3/V4 Auth/Session/Access | no | Library components; no auth |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Fallback reintroduces `innerHTML`/`eval` for degraded render | Tampering | Keep all fallbacks in Lit-safe templates or plain `createElement`; no `innerHTML`/`eval` (project constraint) `[CITED: PITFALLS.md:375-376; CLAUDE.md security]` |
| Light-DOM hidden input styled/reset/tampered by consumer CSS/JS | Tampering | Value authoritative in component, mirrored one-way to the input; `hidden`+`aria-hidden`; reserved name `[CITED: PITFALLS.md:377]` |
| Dynamic-import specifier for compat subpath from wrong origin | Tampering | Not applicable — the subpath is a static entry resolved by the consumer's bundler, no computed path (same discipline as `lazy-load.ts`) `[VERIFIED: src/internal/helpers/lazy-load.ts:24-29]` |

## Sources

### Primary (HIGH confidence — read this session)
- `package.json` — exports map, sideEffects, deps, scripts `[VERIFIED lines cited inline]`
- `src/internal/helpers/lazy-load.ts` — memoize-once idiom + `__reset*ForTest` precedent
- `src/internal/controllers/validation.ts` — internals accessor null-tolerance
- `src/components/input/input.ts`, `button/button.ts`, `shortcuts/shortcuts.ts` — constructor + call-site patterns
- `scripts/cem-diff.mjs` — surface-diff gate mechanics + Changeset interaction
- `test/setup.ts` — jsdom MockElementInternals, jsdom `^29` no `setFormValue`
- `test/browser/form-association.test.ts` — existing above-floor regression proof + shadow-input-doesn't-associate finding
- `vitest.config.ts` — browser/perf project shape (instances array)
- `.github/workflows/ci.yml` — CI lanes, chromium-only install, report-only gates
- `.size-limit.json`, `BROWSER_SUPPORT.md` — budgets, current documented floors
- Grep results: 16 `attachInternals`, ~44 internals call sites, 10 `:has()`, 0 container-query, 0 `@supports`
- `.planning/research/PITFALLS.md`, `ARCHITECTURE.md` — prior codebase-grounded research

### Secondary (MEDIUM confidence — web-verified)
- [MDN: ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) — ARIA reflection surface
- [caniuse: :has()](https://caniuse.com/css-has) — `:has()` floor Chrome 105 / FF 121 / Safari 15.4
- [bram.us: :has() feature detection with @supports selector()](https://www.bram.us/2023/01/04/css-has-feature-detection-with-supportsselector-you-want-has-not-has/) — Safari empty-`:has()` gotcha
- [WebKit blog 13711: ElementInternals & FACE](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/) — Safari 16.4 FACE
- [Bugzilla 1785412: Ship ARIA reflection (non-idref)](https://bugzilla.mozilla.org/show_bug.cgi?id=1785412) — Firefox ARIA reflection timeline

## Metadata

**Confidence breakdown:**
- Packaging decision (Q1): HIGH — grounded in real `exports` map + cem-diff gate source
- Feature-detect (Q2/Q3): HIGH — all 16 sites + call sites read from source; idiom mirrors verified precedent
- Fallback mechanics (Q4): HIGH — in-repo proof (search-field shadow-input non-association) + pitfalls research
- CSS audit (Q5): HIGH — exhaustive grep, 0 false negatives
- Widened matrix config (Q6): MEDIUM — exact per-instance filter key is A1 (Wave 0 confirm)
- Browser-floor table (Q6/COMPAT-05): MEDIUM by design — empirical floor resolved on the matrix during execution

**Research date:** 2026-08-25
**Valid until:** 2026-09-25 (stable — platform floors and repo structure change slowly; re-verify the ARIA-reflection Firefox version empirically on the matrix)
