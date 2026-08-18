# Phase 4: Performance & Feature Capabilities - Research

**Researched:** 2026-08-18
**Domain:** Lit 3 / Web Components — list virtualization (a11y windowing), ElementInternals validation-message display, keyboard-shortcut registry, floating-ui lifecycle gating
**Confidence:** MEDIUM-HIGH (in-repo seams VERIFIED by reading source this session; new-dep versions VERIFIED via npm registry + lit repo; `@lit-labs/virtualizer` runtime API specifics ASSUMED from training and flagged for planning-time verification)

## Summary

This phase delivers three load-bearing v1.0 capabilities on the non-exported `src/internal/` boundary plus one behavior-preserving perf gate. Two of them (validation-message display, shortcut registry) ADD public surface and must be baselined into the CEM + a Changeset before the Phase 6 freeze; virtualization is engineered to add ZERO public surface (auto-threshold, D-05). The genuinely hard problems are not the mechanics of any one library — they are the **cross-cutting correctness contracts**: keeping ARIA counts/positions truthful when rows are recycled out of the DOM (virtualization), keeping `aria-describedby` inside the same shadow root as the focusable control (validation), and not shadowing browser/OS keys or firing while typing (registry).

The dependency graph is already settled by CONTEXT: sequence **validation (#2) → registry (#3) → virtualization (#1)** — cheapest/highest-correctness first, riskiest a11y-heavy work last with the most buffer. Validation and the registry each build on shipped seams (`am-field`, the 15 form-associated controls, `TeardownScope`, `@lit/context`); virtualization builds on `@lit-labs/virtualizer` and must NOT reintroduce the Phase 3 async index-clamp / focus-restoration fixes. PERF-04 is a mechanical audit: several overlays already gate `autoUpdate` on the open transition — the work is proving all of them do and migrating any inline/ungated ones onto `FloatingPositionController`.

**Primary recommendation:** Add both deps to `dependencies` kept external (D-12), use the `virtualize()` **directive** (not the `<lit-virtualizer>` element) so virtualization stays internal with no new registered element; centralize validation in a shared `src/internal/` `ValidationController`/mixin consumed by all 15 controls so the SR message is control-owned and same-root; centralize shortcuts in a `src/internal/` `ShortcutRegistry` distributed by a single new exported `am-shortcuts` provider via `@lit/context`; verify all a11y/timing/scroll behavior in the Chromium browser lane (`test/browser/`) because jsdom mocks ResizeObserver/ElementInternals and cannot prove any of it.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Validation-message display (FEAT-01, FEAT-02)**
- **D-01:** `:user-invalid` timing — error becomes visible once the user leaves an invalid field (blur) OR attempts submit, then tracks live as they fix it. Never on first paint (upstream-locked anti-feature). Reversible.
- **D-02:** Error replaces hint. In the error state `am-hint-text` is hidden and `am-error-text` takes its place (Material `supporting-text`→`error-text` model); hint returns when error clears. One message line, single `aria-describedby` target. Reversible.
- **D-03:** `setCustomError` precedence — custom wins. A consumer/server-set message overrides native `validationMessage` while set; clearing it (`setCustomError('')`) falls back to the native constraint message. **`setCustomError` method name/signature is NEW public API bound at freeze — one-way for the method surface** — capture in CEM baseline + Changeset.
- **D-04:** Announcement politeness — polite per-field, assertive on submit. Per-field errors on blur/typing announce via `aria-live="polite"`; a failed submit announces assertively (`role="alert"`). Reversible.

**List virtualization (PERF-02, PERF-03)**
- **D-05:** Auto-activate above a row threshold — NO public attribute. Grid/popup virtualizes automatically once row count exceeds threshold; below it, today's `repeat()` rendering stands. Keeps ROADMAP "internal-only / freeze-neutral" promise. Reversible.
- **D-06:** Same auto-threshold model for grid and popups. combobox/select option popups virtualize on the same activation model as `am-data-grid`; small option lists stay on `repeat()`. Reversible.
- **D-07 (Claude's discretion):** Exact threshold row count set during planning/implementation from measured render cost on real content. Likely ~100; documented when set.

**Keyboard-shortcut registry (FEAT-03, FEAT-04)**
- **D-08:** Imperative registry, distributed by `<am-shortcuts>` via `@lit/context`. `registry.register({ id, keys, scope, handler })`; provider supplies the registry instance per-subtree. Registry is an explicit instance, not a module-level global. **One-way** — `am-shortcuts` is a new registered custom element and `register(...)` is a published contract. Capture in CEM baseline + Changeset.
- **D-09:** `am-command-palette` self-registers default `mod+k` when no provider is present (today's Cmd/Ctrl+K keeps working); when an `am-shortcuts` provider IS present in its subtree, it registers through the registry instead and its open combo becomes rebindable. Reversible.
- **D-10:** Reserved-combo blocklist default-refuses browser/OS combos; single-keys opt-in only. Single-character shortcuts require explicit opt-in, are always remappable/disablable, suppressed while typing (WCAG 2.1.4). Reversible.
- **D-11:** Same-scope conflict → refuse + report, no throw. `register()` detects same-scope collision, keeps first binding, refuses second, returns an inspectable result (+ dev-mode warning). No exception. Different scopes reusing a key is legal. Reversible.

**New-dependency packaging**
- **D-12:** Runtime `dependencies`, kept external/unbundled. List both `@lit-labs/virtualizer` and `@lit/context` in `package.json` `dependencies`; keep out of the bundle via build `external`. `@lit/context` already matched by `vite.config.ts` `/^@lit\//`; **`@lit-labs/virtualizer` must be added** (`/^@lit-labs\//`). **Costly** — changes dependency classification + build externals; interacts with SHIP-02.
- **D-13:** Exact-pin `@lit-labs/virtualizer` (pre-1.0/labs), caret (`^`) `@lit/context` (stable). Reversible.

### Claude's Discretion
- **Virtualization threshold value (D-07)** — tune from benchmarks; likely ~100 rows; document chosen number.
- **PERF-04 `autoUpdate` gating** — gate to open transitions across all overlays, primarily via `FloatingPositionController`; behavior-preserving; mechanical.
- **Cross-shadow `aria-describedby` wiring** — error/hint node must live in same DOM tree as focusable control; exact mechanism (message co-located with control / id forwarding / light-DOM association) is an implementation decision. Settle before wiring FEAT-01.
- **Which controls get validation wiring** — the 15 form-associated controls (input, textarea, checkbox, radio, switch, select, combobox, rich-select, number-field, input-otp, slider, color-picker, date-picker, time-picker; button is form-associated but not a validation target). `am-search-field` and `am-file-upload` are NOT form-associated — exclude them.
- **CSS state exposure for invalid styling** — reflect validity via `ElementInternals` custom states (`:state(...)`) and/or `:host([invalid])`.
- **Registry internals** — scope-stacking resolution order, `composedPath()` handling across nested shadow roots, keydown-listener placement (reuse `TeardownScope`), serializable-config/registration-list shape for a help sheet.
- **Virtualization internals** — uniform vs variable row heights, scroll-to-selected, keeping selection/sort/focus identity-keyed across recycled rows; document the mobile-SR `aria-activedescendant` limitation.
- **Exact `@lit-labs/virtualizer` version** and exact contents of reserved-combo blocklist.

### Deferred Ideas (OUT OF SCOPE)
- Validation/theming/usage docs + Storybook examples → Phase 5 (DOCS-02, DOCS-03). Author inline JSDoc here only.
- Flip surface-diff gate to enforcing + release/publish pipeline → Phase 6 (SHIP-01→04). New surface is baselined + Changeset'd but gate stays report-only.
- Shortcut-config persistence helpers (FEAT-V2-01) → v2. Registry exposes serializable config; storage stays consumer-owned.
- Editable/sortable virtualized data-grid (FEAT-V2-02, full spreadsheet grid) → v2. Ship a *display* virtualizer only.
- RTL audit across floating-ui overlays (RTL-V2-01) → v2.
- Declarative `<am-shortcut>` element wrapper → set aside (D-08 chose imperative-via-provider).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-02 | List virtualization for `am-data-grid` (1000+ rows) via `@lit-labs/virtualizer`, threshold-activated, a11y-correct (`aria-setsize`/`aria-posinset`/`aria-rowcount`), selection/sort/focus identity-keyed | `virtualize()` directive + state-driven ARIA (Standard Stack, Pattern 3); table-vs-div rendering pitfall (Pitfall 1); identity `keyFunction` (Pattern 3) |
| PERF-03 | List virtualization for combobox/select option popups, a11y-correct (`aria-activedescendant` scrolls target into window), form-value integrity preserved | combobox has NO `aria-activedescendant` today (must add option ids + activedescendant); scroll-into-window before setting activedescendant (Pattern 3, Pitfall 2) |
| PERF-04 | floating-ui `autoUpdate` gated to open transitions across all overlays | `FloatingPositionController.start()/stop()` already gated in combobox/popover; audit + centralize (Pattern 4) |
| FEAT-01 | Form controls auto-surface `ElementInternals.validationMessage` through `am-field`/`am-error-text` with same-shadow-root `aria-describedby`/`aria-invalid` and `:user-invalid` timing | shared `ValidationController` (Pattern 1); cross-shadow mechanism decision (Architecture, Open Q-1); control-owned same-root anchor |
| FEAT-02 | Manual/server validation error API (`setCustomError`) with defined precedence | precedence D-03 custom-wins mirrors `setValidity(customError)` (Pattern 1); new public method → CEM + Changeset |
| FEAT-03 | Keyboard-shortcut registry with scopes, `mod`/`opt` normalization, conflict detection, reserved-combo blocklist (WCAG 2.1.4) | `ShortcutRegistry` in `src/internal/` (Pattern 2); blocklist + composedPath + isComposing (Pitfall 4) |
| FEAT-04 | `am-shortcuts` provider (per-subtree via `@lit/context`); `am-command-palette` refactored off hardcoded Cmd+K with graceful fallback | `@lit/context` provider/consumer; command-palette self-registers `mod+k` fallback (Pattern 2, D-09) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are as authoritative as locked decisions — research recommends nothing that contradicts them:

- **Lit 3 + Web Components, Shadow DOM, ESM-only.** No global CSS, no CommonJS. New deps must be ESM and external.
- **Lit is a peer dependency (`^3.3.2`) — must NOT be bundled.** New deps must also be kept external so they do not pull a second copy of Lit into the bundle (D-12).
- **Lit-safe templating only — no `innerHTML`/`eval`.** Validation messages and virtualized option content render as **text bindings**, never raw HTML (XSS surface). Shortcut combos are structured objects, never `eval`/`Function` on config strings.
- **All styling via `--am-*` semantic tokens** — no hardcoded colors (any new error/validation styling must use existing tokens, e.g. `--am-danger`, `--am-danger-text`).
- **Browser floor Safari 16.4 (ElementInternals first release); not polyfillable.** Below the floor, `setValidity`/`validationMessage` no-op — document, do not work around. **`CustomStateSet` / `:state()` is NOT available at the floor** (see State of the Art) — CSS validity exposure must not depend on it.
- **Property→event, no-global-state / no module singleton.** The registry is an explicit instance provided per-subtree via `@lit/context`, never a module-level global (D-08).
- **TypeScript strict mode** (`noUnusedLocals`, `noUnusedParameters`, `strict`). Use `type` not `interface` for consumer-facing prop/detail types; explicit return types.
- **JSDoc convention:** new public surface (`am-shortcuts`, `setCustomError`, validation ARIA/events) uses the `am-*` event prefix and inline `@fires`/`@csspart`/`@cssprop`/`@slot` tags so CEM captures it into the baseline.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| List windowing / recycling | `@lit-labs/virtualizer` (internal) | Component render (`am-data-grid`, `am-combobox`, `am-select`) | The labs package owns scroll math + ResizeObserver; the component owns ARIA/selection/focus state that must survive recycling |
| Virtualization ARIA truth (`aria-setsize`/`posinset`/`rowcount`/`rowindex`) | Component `renderItem` | — | Only the component knows the full data total + each item's absolute index; virtualizer does NOT set these |
| Validation message (SR-authoritative) | Form control shadow root (via shared `ValidationController`) | `am-field` (visual hint↔error swap) | `aria-describedby` cannot cross shadow roots → the announced message must live in the control's own root next to the focusable element |
| Validation orchestration (visual) | `am-field` | slotted `am-hint-text`/`am-error-text` | `am-field` composes label/hint/error in light DOM and can drive the D-02 swap |
| Shortcut matching/dispatch | `ShortcutRegistry` (internal, document-level keydown) | `am-shortcuts` provider | Single document listener + `composedPath()` is the only place that sees the true focused element across shadow roots |
| Shortcut distribution | `am-shortcuts` (public element) via `@lit/context` | consuming components (command-palette) | Per-subtree registry instance respects no-global-singleton |
| Overlay positioning lifecycle | `FloatingPositionController` (internal) | overlay hosts (gate start/stop on open transition) | Centralizes `autoUpdate` start/stop; hosts own the open-state transition |

## Standard Stack

### Core (new dependencies — D-12/D-13)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@lit-labs/virtualizer` | `2.1.1` (exact-pin, D-13) | Viewport list virtualization — `virtualize()` directive + `<lit-virtualizer>` element | Canonical Lit windowing engine; handles scroll math + `ResizeObserver` item measurement; published from the `lit/lit` monorepo; ~146k weekly downloads `[VERIFIED: npm registry — npm view @lit-labs/virtualizer, v2.1.1 published 2025-07-11, repo github.com/lit/lit]` |
| `@lit/context` | `^1.1.6` (caret, D-13) | Per-subtree dependency injection for the registry instance | Standard Lit context protocol; `ContextProvider`/`ContextConsumer`; ~1.1M weekly downloads `[VERIFIED: npm registry — npm view @lit/context, v1.1.6, repo github.com/lit/lit]` |

`@lit-labs/virtualizer@2.1.1` declares `peerDependencies: { lit: ^3.2.0, tslib: ^2.0.3 }` `[VERIFIED: npm registry — npm view @lit-labs/virtualizer peerDependencies]` — compatible with the project's `lit ^3.3.2` peer floor. `tslib` becomes a transitive install for consumers (acceptable; virtualizer is external).

### Supporting (already installed — reuse, do not re-add)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@floating-ui/dom` | `^1.7.6` (dep) | Overlay positioning + `autoUpdate` | PERF-04 gating target via `FloatingPositionController` `[VERIFIED: package.json:78]` |
| `@vitest/browser-playwright` + `playwright` | `4.1.9` / `^1.62.1` | Chromium browser lane | ALL virtualization scroll/focus, real `validationMessage`, and composedPath tests `[VERIFIED: package.json:87,93]` |
| `axe-core` | `^4.11.1` | a11y scans | Extend a11y coverage to virtualized/validation states `[VERIFIED: package.json:89]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `virtualize()` directive | `<lit-virtualizer>` element | The element registers a custom element (`lit-virtualizer`) into the page and would appear as a non-Amris tag; the **directive keeps virtualization fully internal with no new registered element** — preferred for the freeze-neutral D-05 goal. Use directive. |
| `@lit/context` provider | module-level singleton registry | Violates no-global-singleton constraint (D-08). Rejected. |
| Hand-rolled windowing | own `ResizeObserver` + scroll math | Weeks of edge-case work (item-size caching, RO loops); FEATURES.md explicitly warns against. Rejected. |

**Installation:**
```bash
npm install @lit-labs/virtualizer@2.1.1 @lit/context@^1.1.6   # into "dependencies" (D-12)
```
Then edit `vite.config.ts:195` external list to add `/^@lit-labs\//`:
```ts
external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//],
```
`@lit/context` is already covered by `/^@lit\//` `[VERIFIED: vite.config.ts:195]`.

**Version verification (this session, 2026-08-18):** `npm view @lit-labs/virtualizer version` → `2.1.1` (latest); `npm view @lit/context version` → `1.1.6`. Both `verdict: OK` from legitimacy check (see audit below).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@lit-labs/virtualizer` | npm | published 2025-07-11 | ~146k/wk | github.com/lit/lit | OK | Approved — exact-pin `2.1.1` (D-13) |
| `@lit/context` | npm | published 2025-07-11 | ~1.13M/wk | github.com/lit/lit | OK | Approved — caret `^1.1.6` (D-13) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
Both are first-party Lit packages from the `lit/lit` monorepo; `postinstall: null` for both `[VERIFIED: gsd-tools query package-legitimacy check --ecosystem npm, this session]`. No `checkpoint:human-verify` gate required.

## Architecture Patterns

### System Architecture Diagram

```
FEAT-01/02  Validation
  form control (am-input, am-select, …15)
    ├─ ElementInternals.setValidity(flags, msg) ──► validity + native validationMessage
    ├─ shared ValidationController (src/internal/)
    │     ├─ tracks _userInteracted (blur | form submit)         ── D-01 timing
    │     ├─ resolves message: customError ?? validationMessage  ── D-03 precedence
    │     └─ renders SAME-ROOT <div id=…-error aria-live=polite|assertive>  ── D-04
    ├─ inner <input aria-invalid aria-describedby="…-error">      ── same shadow root
    └─ reflect :host([invalid])  (+ optional :state(invalid) for SR17.4+)
  am-field (light DOM) ── orchestrates visual hint↔error swap (D-02) via slots

FEAT-03/04  Shortcuts
  <am-shortcuts>  (public element)
    ├─ owns ShortcutRegistry instance (src/internal/)
    │     ├─ register({id,keys,scope,handler}) → {ok, reason?}   ── D-11 no-throw
    │     ├─ reserved-combo blocklist (default refuse)           ── D-10
    │     ├─ scope stack (top active scope wins; global base)
    │     └─ list()/serialize() → help-sheet config             ── FEAT-V2-01 seam
    ├─ provides registry via @lit/context (ContextProvider)
    └─ single document keydown (TeardownScope signal)
          └─ composedPath()[0] → editable? isComposing? → suppress single-key
  am-command-palette ── ContextConsumer:
        provider present → register mod+k (rebindable)
        absent           → self document keydown mod+k (today's behavior)  ── D-09

PERF-02/03  Virtualization  (auto-activates above threshold, D-05)
  am-data-grid / am-combobox / am-select
    ├─ rowCount > threshold ? virtualize() directive : repeat()
    ├─ renderItem(item, absIndex):
    │     grid → aria-rowindex; popup → aria-setsize/aria-posinset + option id
    ├─ keyFunction = identity id (selection/sort/focus survive recycling)
    ├─ scrollToIndex(active) BEFORE setting aria-activedescendant/focus
    └─ selection/value driven by STATE, never by presence of the row node

PERF-04  FloatingPositionController.start() only on open→true; stop() on →false + disconnect
```

### Recommended Project Structure
```
src/
├── internal/
│   ├── controllers/
│   │   ├── floating-position.ts   # EXISTS — PERF-04 gating target
│   │   ├── listbox-nav.ts         # EXISTS — must stay activedescendant-correct under virtualization
│   │   ├── validation.ts          # NEW — shared ValidationController/mixin (FEAT-01/02)
│   │   └── shortcut-registry.ts   # NEW — ShortcutRegistry class + types (FEAT-03)
│   └── helpers/
│       ├── teardown-scope.ts      # EXISTS — reuse for registry keydown lifecycle
│       └── virtualize-support.ts  # NEW (optional) — threshold + aria helpers
├── components/
│   ├── shortcuts/                 # NEW — am-shortcuts provider (PUBLIC, exported)
│   │   └── shortcuts.ts, index.ts
│   ├── field/field.ts             # EXTEND — optional visual hint↔error orchestration
│   ├── command-palette/           # REFACTOR — off hardcoded Cmd+K (D-09)
│   ├── data-grid/                 # EXTEND — virtualized render path
│   ├── combobox/ select/          # EXTEND — virtualized popup + add aria-activedescendant
│   └── {15 form controls}/        # EXTEND — adopt ValidationController + setCustomError
```

### Pattern 1: Shared ValidationController (control-owned, same-root ARIA)
**What:** One `src/internal/` controller (or mixin) that every form-associated control instantiates. It owns interaction tracking, message resolution (D-03), the internal `aria-live` region, and `aria-describedby`/`aria-invalid` wiring on the control's own inner focusable — all within the control's shadow root (the only place `aria-describedby` can legally reference from the inner `<input>`).
**When to use:** All 15 form-associated controls. Not `am-search-field`/`am-file-upload` (not form-associated).
**Example:**
```ts
// Source: synthesized from MDN ElementInternals + Material Web error/error-text model
// [CITED: developer.mozilla.org/en-US/docs/Web/API/ElementInternals]  [ASSUMED: exact controller shape]
export class ValidationController implements ReactiveController {
  private _custom: string | null = null;         // D-03 custom-wins when non-null
  private _touched = false;                        // D-01 blur|submit gate
  constructor(private host, private opts: { internals: () => ElementInternals,
    anchor: () => HTMLElement, describedById: string }) { host.addController(this); }

  setCustomError(message: string) {                // NEW PUBLIC surface (D-03) — via control facade
    this._custom = message === '' ? null : message;
    this._refresh();
  }
  markTouched() { this._touched = true; this._refresh(); }   // call on blur + on form submit
  private get _message() {                          // custom wins, else native constraint msg
    return this._custom ?? this.opts.internals().validationMessage;
  }
  private _refresh() {
    const invalid = this._touched && !!this._message;
    // reflect :host([invalid]); set aria-invalid + aria-describedby on the inner focusable;
    // render this._message into the same-root <div id=describedById aria-live=…>
  }
}
```
Precedence mirrors native `setValidity(customError)` semantics (D-03). The message renders as a **text binding** (no `innerHTML`).

### Pattern 2: ShortcutRegistry + am-shortcuts provider
**What:** A plain class (no custom element) that owns registration, platform-normalized parsing, scope resolution, conflict detection, and the reserved blocklist. A single new exported element `am-shortcuts` instantiates it, attaches one document `keydown` (via `TeardownScope` signal), and provides the instance through `@lit/context`.
**When to use:** FEAT-03/04. `am-command-palette` consumes it; falls back when absent (D-09).
**Example:**
```ts
// Source: synthesized from TanStack Hotkeys scopes/conflict model + web-command-palette mod/opt notation
// [CITED: tanstack.com/hotkeys] [ASSUMED: exact result/registration shape]
export type ShortcutScope = 'global' | string;
export type Shortcut = { id: string; keys: string; scope?: ShortcutScope;
  handler: (e: KeyboardEvent) => void; allowSingleKey?: boolean; description?: string };
export type RegisterResult = { ok: true } | { ok: false; reason: 'conflict' | 'reserved'; existingId?: string };

registry.register(s): RegisterResult   // D-11 refuse+report, NEVER throws
registry.list(): ReadonlyArray<{ id; keys; scope; description }>   // help-sheet / FEAT-V2-01 seam
```
- **`mod`/`opt` normalization:** `mod` → `metaKey` on macOS else `ctrlKey`; `opt` → `altKey`. Detect platform once (`navigator.platform`/`userAgentData.platform`) — no per-event branching in the hot path.
- **composedPath focus check:** `const target = e.composedPath()[0] as HTMLElement` pierces shadow roots (a document listener sees the retargeted host otherwise, Pitfall 4). Suppress single-key shortcuts when `target` is `<input>/<textarea>/<select>`, `isContentEditable`, or a form-associated custom element.
- **IME:** ignore when `e.isComposing`.
- **Scope stacking:** maintain a stack; the topmost active scope that has a binding for the combo wins; `global` is the base. Same-key across different scopes is legal (D-11).

### Pattern 3: State-driven virtualization with truthful ARIA
**What:** Above the threshold (D-05), swap `repeat()` for the `virtualize()` directive. Count, active index, and selected value live in **component state, independent of which rows are mounted**. `renderItem(item, index)` receives the **absolute index** — use it for ARIA.
**When to use:** `am-data-grid` rows, `am-combobox`/`am-select` option popups.
**Example:**
```ts
// Source: @lit-labs/virtualizer README (virtualize directive)
// [ASSUMED: exact directive import path + renderItem(index) signature — verify at plan time]
import { virtualize, virtualizerRef } from '@lit-labs/virtualizer/virtualize.js';

// listbox popup (PERF-03): options are strings today; add stable per-option id
html`<div role="listbox" ${virtualizerRef(this._vref)}
        aria-activedescendant=${this._activeId ?? nothing}>
  ${virtualize({
    items: this._filtered,
    keyFunction: (opt) => opt,                          // identity-key: selection survives recycling
    renderItem: (opt, i) => html`
      <div role="option" id=${this._optionId(i)}
           aria-setsize=${this._filtered.length}         // FULL total, not window
           aria-posinset=${i + 1}
           aria-selected=${this.value === opt ? 'true' : 'false'}>${opt}</div>`,
  })}
</div>`
// On Arrow/Home/End/PageDn: this._vref.value?.scrollToIndex(target, 'nearest')
//   BEFORE setting this._activeId = this._optionId(target)  — the id must exist in the DOM.
```
- **Grid (PERF-02):** keep `aria-rowcount` (already present, full total) and ADD `aria-rowindex` per row (1-based incl. header offset) so AT positions each recycled row `[VERIFIED: src/components/data-grid/data-grid.ts:324 sets aria-rowcount=${this.rows.length}; rows at :359-376 have role="row" but NO aria-rowindex today]`.
- **Popup (PERF-03):** combobox currently renders `role="option"` with `aria-selected` but **NO `aria-activedescendant` and NO option `id`s** `[VERIFIED: src/components/combobox/combobox.ts:611-625, 678-692 — role="listbox"/"option" present, aria-activedescendant absent]`. Virtualization REQUIRES adding option ids + `aria-activedescendant` because the highlighted option may not be rendered.
- **Selection/value from state:** `setFormValue` and `aria-selected` must be driven by `this.value`, never by the presence of the option node (Pitfall 2).
- **Do not reintroduce Phase 3 fixes:** `ListboxNavController` deliberately does NOT re-clamp `_highlightedIndex` on option-list replace (FIX-02) `[VERIFIED: src/internal/controllers/listbox-nav.ts:38-43 docstring]`; focus restoration guards on `isConnected` (FIX-03). Virtualization must preserve both — never unmount the focused/active element without moving focus first.

### Pattern 4: Open-transition-gated autoUpdate (PERF-04)
**What:** `autoUpdate` runs only while an overlay is open; started on the `false→true` transition, stopped on `true→false` and on disconnect.
**Current state (already gated):** `am-combobox` calls `_floatingController.start()/stop()` inside `if (changed.has('_open'))` `[VERIFIED: src/components/combobox/combobox.ts:429-437]`; `am-popover` gates its inline `autoUpdate` inside `if (changed.has('open'))` `[VERIFIED: src/components/popover/popover.ts:154-167]`. `FloatingPositionController.start()` self-clears before restart and `hostDisconnected()` stops `[VERIFIED: src/internal/controllers/floating-position.ts:61-80]`.
**Work:** Audit EVERY floating-ui consumer (combobox, select, dropdown, popover, tooltip, date-picker, context-menu) and confirm each starts on the open transition only and stops on close+disconnect; migrate any inline/ungated ones onto `FloatingPositionController`. Behavior-preserving — no user-facing change. `am-popover` still uses inline `autoUpdate` (candidate to migrate onto the controller).

### Anti-Patterns to Avoid
- **Counting rows from the DOM under virtualization** — breaks SR counts (Pitfall 2). Count from state.
- **Setting `aria-activedescendant` to an id that isn't rendered** — scroll it into the window first.
- **`aria-describedby` from an inner `<input>` to a light-DOM `am-error-text`** — crosses shadow roots; will not announce (see Open Q-1).
- **`preventDefault()` on browser/OS combos** — hostile; the reserved blocklist must refuse them at registration (D-10).
- **Firing single-key shortcuts while typing** — WCAG 2.1.4 failure; suppress via composedPath editable check.
- **`innerHTML`/`unsafeHTML` for messages or virtualized content** — XSS + violates constraint. Text bindings only.
- **`<lit-virtualizer>` element inside a `<table>`** — the virtualizer's positioning wrappers break table layout (Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| List windowing / recycling | Custom scroll math + `ResizeObserver` + size cache | `@lit-labs/virtualizer` `virtualize()` | Item-size measurement, RO-loop avoidance, recycling identity — weeks of edge cases |
| Per-subtree DI for the registry | Module singleton or manual event bus | `@lit/context` ContextProvider/Consumer | Standard Lit protocol; respects no-global-singleton (D-08) |
| Listener/timer teardown for the registry keydown | ad-hoc add/removeEventListener | `TeardownScope` (`signal`) | Established Phase 3 discipline; single `clear()` cancels all `[VERIFIED: src/internal/helpers/teardown-scope.ts]` |
| Constraint validation state | Custom validity booleans | `ElementInternals.setValidity` + `validationMessage` | Native form participation already shipped on the 15 controls |
| Overlay `computePosition`+`autoUpdate` lifecycle | Per-component inline logic | `FloatingPositionController` | Already centralizes it for combobox/select/date-picker `[VERIFIED: floating-position.ts]` |

**Key insight:** Every one of these is a place where a naive in-house version silently breaks accessibility or form integrity — exactly the credibility gate for a "1.0" library.

## Runtime State Inventory

This phase adds features (greenfield-in-repo); it does NOT rename or migrate stored/registered state. The only persistence-adjacent concern:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys renamed | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no env vars in this library `[VERIFIED: CLAUDE.md "No runtime environment variables required"]` | None |
| Build artifacts | `dist/custom-elements.json` (CEM) + `api/custom-elements.baseline.json` must be regenerated/re-baselined after adding `am-shortcuts` + `setCustomError` | Rebuild manifest (`npm run build:manifest`), re-commit baseline, add a Changeset (report-only gate, Phase 6 flips to enforcing) |
| New public API surface | `am-shortcuts` element + `register()` contract + `setCustomError()` method + validation events/CSS states | Capture in CEM baseline + Changeset (D-03, D-08 one-way) |

**Nothing found in categories 1–4:** verified — this is a client-only ESM component library with no runtime env, no datastore, no OS registrations.

## Common Pitfalls

### Pitfall 1: Virtualizing `<table>` rows breaks table layout and grid ARIA
**What goes wrong:** `am-data-grid` renders a semantic `<table>` with `<tbody>` and `<tr>` `[VERIFIED: data-grid.ts:322-380]`. `@lit-labs/virtualizer` positions its children within a sized scroll container (absolute/transform), which is incompatible with native `<table>`/`<tbody>` row layout — rows collapse or misalign.
**Why it happens:** Virtualization assumes it controls child positioning; table layout does not cede that.
**How to avoid:** When virtualization auto-activates (D-05), render a **div-based grid** using ARIA roles (`role="grid"/"row"/"gridcell"/"columnheader"`) instead of `<table>` elements, or set the table elements to CSS `display: block/flex/grid` so the virtualizer can position rows. Since D-05 already swaps rendering mode at the threshold, gate the div-based path on the same threshold. The grid already carries `role="grid"`, `role="row"`, `role="gridcell"` `[VERIFIED: data-grid.ts:323,360,371]`, so ARIA semantics transfer.
**Warning signs:** Rows overlap or have zero height once virtualized; column alignment lost.

### Pitfall 2: Combobox has no `aria-activedescendant` today — virtualization exposes the gap
**What goes wrong:** The combobox listbox marks the selected option with `aria-selected` but never sets `aria-activedescendant` on the input and never assigns option `id`s `[VERIFIED: combobox.ts:593-625]`. With `repeat()` this "works" visually via a highlight class, but under virtualization the highlighted option is often not in the DOM, so keyboard nav has nothing to point at.
**Why it happens:** Current nav relies on visual highlight, not ARIA active-descendant.
**How to avoid:** Introduce stable per-option `id`s and set `aria-activedescendant` on the input to the active option's id; on Arrow/Home/End/PageUp/Down/type-ahead, call `scrollToIndex(target)` to bring the target into the DOM **before** updating `aria-activedescendant`. Keep `ListboxNavController`'s existing index behavior (no re-clamp on replace, FIX-02).
**Warning signs:** Screen reader silent on arrow nav; `aria-activedescendant` references a non-existent id.

### Pitfall 3: Cross-shadow `aria-describedby` silently fails to announce
**What goes wrong:** Wiring the inner `<input>`'s `aria-describedby` to a slotted `am-error-text` (which lives in `am-field`'s light DOM, outside the control's shadow root) produces no error announcement — `aria-describedby` cannot reference an element in a different shadow root.
**Why it happens:** The focusable `<input>` is inside `am-input`'s shadow root `[VERIFIED: input.ts:318-337]`; `am-error-text` is a sibling slotted into `am-field` `[VERIFIED: field.ts:44-52, error-text.ts]`.
**How to avoid:** Render the SR-authoritative message **inside the control's own shadow root** next to the focusable element (see Open Q-1 for the mechanism decision). Do NOT rely on cross-root reference or `ElementInternals.ariaDescription` at the Safari 16.4 floor.
**Warning signs:** axe passes structurally but VoiceOver/NVDA never reads the error; `aria-describedby` id resolves to `null` in the control's root.

### Pitfall 4: Global shortcut listener sees the retargeted host, not the focused element
**What goes wrong:** A document `keydown` sees `event.target` as the outer host (Shadow DOM retargeting), so an "is a text field focused?" check fails, and single-key shortcuts fire while the user types inside a component's shadow input.
**Why it happens:** Retargeting hides the real focused node from document-level listeners.
**How to avoid:** Use `event.composedPath()[0]` to get the true focused element across shadow roots; suppress single-key shortcuts when it is editable; ignore `event.isComposing`; refuse browser/OS combos at registration (blocklist).
**Warning signs:** Typing `k` opens the palette; shortcuts fire inside inputs; non-US keyboard layout mismatches.

### Pitfall 5: `:state()` / CustomStateSet assumed available at the Safari 16.4 floor
**What goes wrong:** Exposing validity via `this._internals.states.add('invalid')` for `:state(invalid)` styling no-ops on Safari 16.4 (CustomStateSet is Safari 17.4+), so consumer CSS relying on it silently fails on the documented floor.
**How to avoid:** Reflect validity via the existing `invalid` boolean attribute → `:host([invalid])` (works everywhere; already present on `am-input` `[VERIFIED: input.ts:47,95-101]`). OPTIONALLY add `:state(invalid)` as progressive enhancement for 17.4+, but never as the only hook.
**Warning signs:** Invalid styling works in current Chrome/Safari but not on the 16.4 floor.

## Code Examples

### Providing the registry via @lit/context
```ts
// Source: @lit/context ContextProvider pattern [CITED: lit.dev/docs/data/context] [ASSUMED: exact API surface]
import { createContext, ContextProvider } from '@lit/context';
export const shortcutRegistryContext = createContext<ShortcutRegistry>('amris-shortcut-registry');

@customElement('am-shortcuts')
export class AmShortcuts extends LitElement {
  private _registry = new ShortcutRegistry();
  private _provider = new ContextProvider(this, { context: shortcutRegistryContext, initialValue: this._registry });
  private _teardown = new TeardownScope();
  connectedCallback() { super.connectedCallback();
    document.addEventListener('keydown', this._onKeydown, { signal: this._teardown.signal }); }
  disconnectedCallback() { super.disconnectedCallback(); this._teardown.clear(); }
  // exposes registry.register(...) / registry.list(...) to the subtree
}
```

### Command-palette graceful fallback (D-09)
```ts
// Source: existing command-palette + ContextConsumer [VERIFIED: command-palette.ts:206-245] [ASSUMED: consumer wiring]
private _consumer = new ContextConsumer(this, { context: shortcutRegistryContext, subscribe: true,
  callback: (registry) => { this._registry = registry; } });
connectedCallback() { super.connectedCallback();
  if (this._registry) {
    this._registry.register({ id: 'command-palette.open', keys: 'mod+k',
      handler: () => { this.open = !this.open; } });         // rebindable via provider
  } else {
    document.addEventListener('keydown', this._handleGlobalKeydown);  // today's hardcoded fallback
  }
}
// _handleGlobalKeydown currently: (e.metaKey||e.ctrlKey)&&e.key==='k' [VERIFIED: command-palette.ts:240-245]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `:invalid` on first paint | `:user-invalid`-style timing (blur/submit) | ongoing | D-01; avoids hostile red-on-load |
| DOM node = source of truth for count/value | State-driven windowing | virtualization era | Pitfall 2; ARIA + form integrity |
| Hardcoded per-component shortcut (Cmd+K) | Registry + scopes + rebinding | this phase | FEAT-04 differentiator |
| `:state(...)` for validity CSS | attribute reflection at the floor | Safari 17.4 gap | CustomStateSet not on Safari 16.4 — use `:host([invalid])` |

**Deprecated/outdated:**
- `<lit-virtualizer>` element for internal-only use — prefer the `virtualize()` directive (no extra registered element).
- Older `@lit-labs/virtualizer` `itemSize`/fixed-size layout options — the 2.x `flow` layout measures via ResizeObserver; verify the exact layout import/config at plan time `[ASSUMED]`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `virtualize()` directive `renderItem(item, index)` receives the **absolute** index in the items array | Pattern 3 | If index is window-relative, `aria-posinset`/`aria-rowindex` computation is wrong — verify against v2.1.1 README before wiring ARIA |
| A2 | `virtualizerRef` + `.scrollToIndex(index, position)` is the scroll-to-active API in v2.1.1 | Pattern 3, Pitfall 2 | Scroll-into-window-before-activedescendant depends on it; wrong API name = keyboard nav to off-screen options breaks |
| A3 | `@lit-labs/virtualizer/virtualize.js` is the directive import path | Code Examples | Wrong path = build error; cheap to fix at plan time |
| A4 | 2.x `flow` layout measures variable heights via ResizeObserver (no fixed-size config needed) | State of the Art | Affects uniform-vs-variable decision (D-07 discretion); may need explicit layout import |
| A5 | CustomStateSet / `:state()` is Safari 17.4+, absent at 16.4 floor | Pitfall 5, Constraints | If actually on 16.4, `:state(invalid)` could be primary; recommendation (attribute reflection) is safe either way |
| A6 | Exact `ValidationController` / `ShortcutRegistry` / `RegisterResult` shapes | Patterns 1–2 | These are design proposals for the planner, not verified APIs — planner finalizes signatures (public `setCustomError`/`register` bind at freeze) |
| A7 | `@lit/context` `ContextProvider`/`ContextConsumer`/`createContext` surface | Code Examples | Standard Lit API; verify import names against v1.1.6 at plan time |

**If this table looks long:** it is deliberately honest — the in-repo seams and dependency versions are VERIFIED, but the runtime API details of a labs/pre-1.0 package and the exact shapes of NEW public methods are design decisions the planner must lock (and, for `setCustomError`/`register`, bind at freeze).

## Open Questions

1. **Cross-shadow `aria-describedby` mechanism (Claude's discretion — settle before wiring FEAT-01).**
   - What we know: the focusable `<input>` is in the control's shadow root; slotted `am-error-text`/`am-hint-text` are in `am-field`'s light DOM `[VERIFIED: input.ts, field.ts, error-text.ts]`. `aria-describedby` cannot cross shadow roots. CustomStateSet/reference-target unavailable at Safari 16.4.
   - Options: **(A) Message co-located within the control** — the control renders its own `validationMessage`/custom error in a same-root `aria-live` region and points its inner `<input>`'s `aria-describedby` at it; `am-field` orchestrates only the *visual* hint↔error swap (D-02). **(B) id-forwarding** — pass the message string into the control which renders it in-root (functionally same as A). **(C) light-DOM association** — put `aria-describedby` on the control HOST; fails because AT reads it from the inner focusable, not the host.
   - **Recommendation:** Option A via the shared `ValidationController` — control-owned, same-root, robust on the 16.4 floor, mirrors Material Web. `am-field` stays structural and optionally coordinates the visual D-02 swap. Present this to discuss-phase/planner for confirmation; it determines whether `setCustomError` lives on each control (recommended) or on `am-field`.

2. **Virtualization uniform vs variable row height (D-07 discretion).**
   - What we know: data-grid rows and combobox options are effectively uniform height today; `flow` layout handles both.
   - What's unclear: whether v2.1.1 needs an explicit fixed-size config for best perf (A4).
   - Recommendation: use `flow` (auto-measure); benchmark to set the D-07 threshold (~100) on real content; document the number.

3. **Threshold value (D-07).** Measure render cost per the Phase 1 measured-baseline pattern; likely ~100 rows; document in the plan.

4. **Reserved-combo blocklist exact contents (D-10 discretion).** Proposed starting set: `mod+t`, `mod+w`, `mod+n`, `mod+shift+n`, `mod+l`, `mod+q`, `mod+r`, `mod+shift+t`, `mod+tab`, `mod+`, `mod+-`, `mod+0`, `F1`–`F12`, `mod+shift+i` (devtools). Finalize during planning; refusal returns `{ ok: false, reason: 'reserved' }` (D-11).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry (`@lit-labs/virtualizer`) | PERF-02/03 | ✓ | 2.1.1 | none — blocking (but verified available) |
| npm registry (`@lit/context`) | FEAT-04 | ✓ | 1.1.6 | none — blocking (but verified available) |
| Chromium (Playwright) browser lane | all a11y/scroll/validity tests | ✓ | playwright ^1.62.1 installed | jsdom lane for pure logic only |
| ResizeObserver (real) | virtualizer measurement | ✓ in Chromium; ✗ jsdom (mocked) | — | Virtualization behavior only provable in browser lane |

**Missing dependencies with no fallback:** none — both new deps verified present on the registry this session.
**Missing dependencies with fallback:** none blocking.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0, two projects (`jsdom`, `browser`) `[VERIFIED: vitest.config.ts:6-33]` |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` (jsdom project, watch) `[VERIFIED: package.json:68]` |
| Full suite command | `npm run test:run` (both projects) `[VERIFIED: package.json:69]` |
| Browser lane | `npm run test:browser` (Chromium, `test/browser/**`) `[VERIFIED: package.json:71, vitest.config.ts:21-32]` |

**Critical lane boundary:** the jsdom project mocks `ElementInternals`, `ResizeObserver`, `matchMedia`, `HTMLDialogElement` `[VERIFIED: TESTING.md:84-91]`; the browser project omits `setupFiles` and uses native APIs `[VERIFIED: vitest.config.ts:22-24]`. Therefore **virtualization scroll/focus/ARIA, real `validationMessage`, `:user-invalid` timing, focus restoration, and composedPath suppression must live in `test/browser/`** — jsdom cannot prove any of them.

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Lane / Command | File Exists? |
|-----|----------|-----------|----------------|-------------|
| FEAT-01 | error becomes visible on blur/submit, never first paint (D-01) | unit + browser | `test/browser/validation-timing.test.ts` | ❌ Wave 0 |
| FEAT-01 | inner input `aria-describedby`→same-root `id`, `aria-invalid` toggles, AT announces | browser | `test/browser/validation-aria.test.ts` | ❌ Wave 0 |
| FEAT-01 | error replaces hint, hint returns on clear (D-02) | jsdom | `test/components/field.test.ts` | ❌ Wave 0 |
| FEAT-01 | politeness polite per-field / assertive on submit (D-04) | browser | `test/browser/validation-aria.test.ts` | ❌ Wave 0 |
| FEAT-02 | `setCustomError` overrides native; `setCustomError('')` falls back (D-03) | jsdom (logic) + browser (real msg) | `test/components/validation-controller.test.ts` | ❌ Wave 0 |
| FEAT-03 | conflict refuse+report no-throw (D-11); reserved-combo refused (D-10) | jsdom | `test/internal/shortcut-registry.test.ts` | ❌ Wave 0 |
| FEAT-03 | `mod`/`opt` platform normalization; scope stacking resolution | jsdom | `test/internal/shortcut-registry.test.ts` | ❌ Wave 0 |
| FEAT-03 | single-key suppressed while typing; composedPath across shadow roots; `isComposing` | browser | `test/browser/shortcuts-context.test.ts` | ❌ Wave 0 |
| FEAT-04 | provider-present → registered/rebindable; absent → mod+k fallback (D-09) | jsdom + browser | `test/components/command-palette.test.ts` (+browser) | exists (extend) |
| PERF-02 | 1000+ rows: `aria-rowcount` full total, per-row `aria-rowindex`, selection survives scroll | browser | `test/browser/data-grid-virtual.test.ts` | ❌ Wave 0 |
| PERF-03 | option `aria-setsize`/`posinset` full total; `aria-activedescendant` scrolls target into window; form value preserved | browser | `test/browser/combobox-virtual.test.ts` | ❌ Wave 0 |
| PERF-03 | does NOT reintroduce FIX-02 clamp / FIX-03 focus regressions | jsdom + browser | existing combobox tests + new browser | partial |
| PERF-04 | `autoUpdate` starts only on open transition, stops on close+disconnect | jsdom (spy) | per-overlay teardown-spy tests (TEST-05 pattern) | partial (extend) |

### Sampling Rate
- **Per task commit:** `npm test` (jsdom quick lane).
- **Per wave merge:** `npm run test:run` (both projects) + `npm run test:browser` for any virtualization/validation/shortcut wave.
- **Phase gate:** full suite + a11y (`npm run test:a11y`) green before `/gsd-verify-work`; CEM baseline regenerated and Changeset present for `am-shortcuts` + `setCustomError`.

### Wave 0 Gaps
- [ ] `test/browser/validation-timing.test.ts` — FEAT-01 D-01 timing (real ElementInternals)
- [ ] `test/browser/validation-aria.test.ts` — FEAT-01 same-root describedby + politeness (D-04)
- [ ] `test/components/validation-controller.test.ts` — FEAT-02 D-03 precedence logic
- [ ] `test/internal/shortcut-registry.test.ts` — FEAT-03 conflict/blocklist/scope/normalization
- [ ] `test/browser/shortcuts-context.test.ts` — FEAT-03 composedPath/typing suppression/isComposing
- [ ] `test/browser/data-grid-virtual.test.ts` — PERF-02 rowcount/rowindex/selection-under-scroll
- [ ] `test/browser/combobox-virtual.test.ts` — PERF-03 setsize/posinset/activedescendant-scroll/form value
- [ ] Extend `test/components/command-palette.test.ts` — D-09 fallback + provider path
- [ ] Coverage thresholds (`vitest.config.ts:47-63`) will need re-baselining after new controllers land (currently branches 67 / fns 82 / lines 84 / stmts 83) `[VERIFIED: vitest.config.ts:47-63]`

## Security Domain

`security_enforcement: true`, ASVS L1 `[VERIFIED: .planning/config.json:47-49]`.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (client-side UI library, no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation / Output Encoding | yes | Lit text bindings auto-escape; validation messages, virtualized option content, shortcut config rendered as text — never `innerHTML`/`unsafeHTML`/`eval` (CLAUDE.md constraint) |
| V6 Cryptography | no | — |

### Known Threat Patterns for Lit / Web Components
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via consumer-supplied validation message / server error string | Tampering/Info-disclosure | Render `validationMessage`/`setCustomError` text via Lit `${}` text binding; no `unsafeHTML` |
| XSS via virtualized option/row content | Tampering | `renderItem` uses text bindings; no raw HTML injection |
| Code injection via shortcut combo config | Elevation | Structured `{ keys, scope, handler }` objects; never `eval`/`new Function` on combo strings (Pitfall — PITFALLS.md Security) |
| Keyboard trapping / shadowing browser/OS combos | Denial-of-control / a11y | Reserved-combo blocklist refuses at registration (D-10); no `preventDefault` on reserved combos |

No new network calls, storage, or secrets are introduced. Persistence is explicitly consumer-owned (FEAT-V2-01 anti-feature).

## Sources

### Primary (HIGH confidence — verified this session)
- `npm view @lit-labs/virtualizer` → v2.1.1, repo github.com/lit/lit, peerDeps `lit ^3.2.0` — VERIFIED
- `npm view @lit/context` → v1.1.6, repo github.com/lit/lit — VERIFIED
- `gsd-tools query package-legitimacy check` → both OK, postinstall null — VERIFIED
- In-repo source read this session: `floating-position.ts`, `listbox-nav.ts`, `teardown-scope.ts`, `field.ts`, `input.ts`, `error-text.ts`, `command-palette.ts`, `combobox.ts` (grep + ranges), `data-grid.ts` (render), `popover.ts`, `package.json`, `vite.config.ts`, `vitest.config.ts` — VERIFIED with line cites

### Secondary (MEDIUM confidence — project research docs, dated 2026-08-10)
- `.planning/research/FEATURES.md` — three target-feature deep-dives, a11y implications, sequencing #2→#3→#1
- `.planning/research/PITFALLS.md` — virtualization a11y (Pitfall 5), shortcut hazards (Pitfall 6), validation desync (Pitfall 7), cross-root ARIA gotcha
- `.planning/research/STACK.md` — `@lit-labs/virtualizer` labs/pre-1.0, ResizeObserver dep

### Tertiary (LOW confidence — training knowledge, flagged in Assumptions Log)
- `@lit-labs/virtualizer` runtime API (`virtualize()`/`virtualizerRef`/`scrollToIndex`, `flow` layout) — verify against v2.1.1 README at plan time (A1–A4)
- `@lit/context` API surface (`createContext`/`ContextProvider`/`ContextConsumer`) — standard, verify names (A7)
- CustomStateSet/`:state()` Safari 17.4+ (A5)
- Material Web error/error-text model; TanStack Hotkeys scope/conflict model (from FEATURES.md citations)

## Metadata

**Confidence breakdown:**
- Standard stack (new deps + versions): HIGH — versions + legitimacy verified via npm registry this session
- In-repo seams / integration points: HIGH — read source with line cites this session
- Virtualizer runtime API specifics: LOW-MEDIUM — labs/pre-1.0; API details ASSUMED, flagged for plan-time verification (A1–A4)
- Validation cross-shadow mechanism: MEDIUM — constraint is HIGH/CITED, the recommended mechanism (Option A) is a design proposal for confirmation
- Registry design: MEDIUM — well-grounded in FEATURES/PITFALLS; exact public shapes are planner decisions bound at freeze

**Research date:** 2026-08-18
**Valid until:** 2026-09-17 (30 days; `@lit-labs/virtualizer` is pre-1.0 — re-check the exact version/API if planning slips past a minor bump)
