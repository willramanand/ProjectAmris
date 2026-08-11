# Feature Research

**Domain:** Framework-agnostic Lit / Web Component UI library reaching v1.0
**Researched:** 2026-08-10
**Confidence:** HIGH (patterns are well-established across Shoelace/Web Awesome, Spectrum Web Components, Material Web, Fluent UI, and the WAI-ARIA APG; verified against multiple primary sources)

## Scope

This file answers two questions for the Amris v1.0 milestone:

1. What is **table stakes vs differentiating vs anti-feature** for a component library that credibly calls itself "1.0"?
2. For the **three target features** (list virtualization, form validation-message display, keyboard-shortcut registry): recommended approach, complexity, and accessibility implications, grounded in how comparable libraries actually do it.

Amris-specific context that shaped the recommendations:
- Amris **already ships** `am-field`, `am-label`, `am-hint-text`, and `am-error-text` components (see CONCERNS untested list) — so validation display is a *wiring* problem, not a new-component problem.
- `am-command-palette` **already exists** but hardcodes Cmd+K — the registry generalizes an existing behavior.
- `am-data-grid` and `am-combobox` render all rows via Lit's `repeat()` directive today — virtualization is additive.
- Constraint: no new global CSS, no CommonJS, Lit is a peer dependency, browser floor is Safari 16.4 (first ElementInternals release).

---

## Feature Landscape

### Table Stakes (a 1.0 component library is judged incomplete without these)

Users don't praise a library for having these; they distrust the "1.0" label when any are missing.

| Feature | Why Expected | Complexity | Notes / How comparables do it |
|---------|--------------|------------|-------|
| **Accessibility baseline** (roles, keyboard nav, focus-visible, focus trap in overlays, axe-clean) | A11y is the defining differentiator that separated "toy" from "real" libraries; Spectrum/React-Aria and Material Web built their reputations on it | HIGH (ongoing) | Amris has axe scans + focus-ring; gaps are focus-restoration and virtualized-list a11y (below). This is the single biggest credibility lever for "1.0". |
| **Frozen, documented public API** | The whole point of a semver 1.0 is a stable contract | MEDIUM | Consistent prop/event/slot naming; `custom-elements.json` (CEM) already generated — that IS the machine-readable contract. |
| **TypeScript types + CEM manifest** | Consumers expect autocomplete and typed events; framework tooling (VS Code, Angular, Vue Volar) reads CEM | LOW (exists) | Amris already emits `custom-elements.json`. Ensure every public event/prop/slot/CSS-part is documented in the manifest. |
| **Theming via design tokens** | Table stakes since Shoelace popularized CSS-custom-property theming for WC | MEDIUM (exists) | `--am-*` tokens + light/dark already shipped. Document the token surface as public API. |
| **Form participation via ElementInternals** | Any control library must submit/reset/validate with native `<form>` | MEDIUM (exists) | Already implemented. Validation-message *display* (target feature 2) is the missing piece. |
| **Component docs + live examples** | Nobody adopts an undocumented library | MEDIUM | Storybook 10 exists; needs usage/validation/theming prose per PROJECT.md. |
| **Tree-shakeable ESM + per-component entry points** | Bundle discipline is expected | LOW (exists) | Already shipped; add CI bundle-size monitoring. |
| **RTL support** | Expected for i18n; Spectrum/Material/Fluent all ship it | MEDIUM | Use CSS logical properties (`margin-inline`, `inset-inline`) and `:dir()` / `dir` attribute rather than physical left/right. Verify overlays (floating-ui) flip correctly. Audit needed — likely partial today. |
| **Documented browser support + peer-dep requirements** | Consumers must know the Safari 16.4 floor and Lit peer dep | LOW | BROWSER_SUPPORT.md exists; surface it in README. |

### Differentiators (competitive advantage — align with Amris's "dependable, framework-agnostic" core value)

| Feature | Value Proposition | Complexity | Notes / How comparables do it |
|---------|-------------------|------------|-------|
| **List virtualization built into data-grid/combobox** (Target #1) | Handles 1000+ rows without the consumer wiring their own windowing; Web Awesome markets grid virtualization as a *pro* (paid) feature | HIGH | Differentiator *if* accessible; see deep-dive below. |
| **Configurable, conflict-aware keyboard-shortcut registry** (Target #3) | Most WC libraries have *no* global shortcut system; command-palette-as-a-primitive with rebindable keys is rare outside React (TanStack Hotkeys) | MEDIUM | See deep-dive below. |
| **First-class validation-message display wired to ElementInternals** (Target #2) | Material Web's `error`/`error-text` and Spectrum's help-text/error slot are the bar; auto-wiring `validationMessage` + server errors + `aria-describedby` beats "bring your own error div" | MEDIUM | See deep-dive below. |
| **True framework-agnosticism with verified interop** | React 19 now handles custom-element props/events natively; being usable everywhere without wrappers is genuinely differentiating vs Material Web (Angular-leaning) | LOW-MEDIUM | Already the architecture; document React 19 / Vue / Angular usage. |

### Anti-Features (seem good, create problems — deliberately NOT for 1.0)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full spreadsheet data-grid** (grouping, aggregation, pinning, tree data, CSV export, editable cells) | "Real grids do this"; Web Awesome lists it as a stretch goal | Enormous surface, permanent maintenance sink, directly violates the ~67-component feature freeze; a11y for editable virtualized grids is a research project | Ship virtualized *display* grid only; document that heavy grids should compose an external grid or server-paginate. |
| **Built-in global state / shortcut persistence store** | "Remember my custom keybindings" | Violates the no-global-state / no-module-singleton constraint; storage is app policy | Registry exposes a serializable config; persistence is the consumer's job. |
| **SSR / declarative shadow DOM rendering** | "Modern libraries SSR" | Explicitly out of scope in PROJECT.md; Vite 8 targets client ESM; Lit SSR is a large separate effort | Defer to post-1.0; document as client-only. |
| **Bundled polyfill for ElementInternals / forms below Safari 16.4** | "Support older browsers" | ElementInternals is not polyfillable; a fake would silently corrupt form submission | Document the floor; fail loudly, not silently. |
| **Framework-specific wrapper packages (React/Vue/Angular)** | "Nicer DX in React" | Out of scope; React 19 + CEM already give typed props/events; wrappers double the release surface | Publish CEM + usage docs; wrappers are a post-1.0 concern. |
| **Owning keybindings that shadow browser/OS shortcuts by default** | "Power-user shortcuts" | Users actively dislike sites hijacking Ctrl/Cmd combos; conflicts with AT and browser | Ship *opt-in* registration, scope to focus, expose a rebinding API, reserve nothing by default. |
| **Auto-showing validation errors on first paint** | "Show what's required" | `:invalid` matches before interaction — flags empty fields immediately, hostile UX | Use `:user-invalid` / on-submit / on-blur timing (see Target #2). |

---

## Target Feature Deep-Dives

### Target #1 — List Virtualization (data-grid / combobox / list)

**How comparables do it**
- **Lit ecosystem:** `@lit-labs/virtualizer` is the canonical answer — a `<lit-virtualizer>` element plus a `virtualize()` lit-html directive. It renders only enough items to fill the viewport, adds/removes as you scroll, and relies on the standard `ResizeObserver` (supported in all Amris-floor browsers). Still "labs" (pre-1.0) but widely used and is the natural fit for a Lit library.
- **Web Awesome (Shoelace successor):** virtualization exists **only inside the paid pro data-grid** — i.e. they treat it as advanced, not a free primitive. Signals it's a real differentiator.
- **React world:** TanStack Virtual / react-window are bring-your-own windowing utilities the consumer composes — the library doesn't virtualize every list for you.

**Recommended approach for Amris**
- Adopt `@lit-labs/virtualizer` (bundle it, or vendor the directive) rather than hand-rolling a windowing engine. Hand-rolling scroll math + `ResizeObserver` + item-size caching is where projects burn weeks.
- Apply it **surgically**: `am-data-grid` (the documented 1000+ row bottleneck) and the `am-combobox`/`am-select` listbox popups. Keep small lists on `repeat()` — virtualize only past a threshold (e.g. opt-in prop `virtualized` or auto above N rows).
- Keep it a *display* virtualizer; do NOT chase the full-spreadsheet grid (anti-feature).

**Complexity: HIGH.** Not the windowing itself (the labs package handles that) but the interaction with existing behaviors: variable row heights, keyboard navigation across not-yet-rendered rows, scroll-to-selected, and re-filtering while the popup is open (the existing "stale highlighted index" fragility). Combobox virtualization is harder than grid virtualization because of the active-descendant + filtering + open/close lifecycle.

**Accessibility implications (critical — this is where naive virtualization fails):**
- Because off-screen options are **not in the DOM**, you MUST set `aria-setsize` (total count) and `aria-posinset` (1-based position) on each rendered option so screen readers announce "3 of 4000", not "3 of 12". The APG/Orange autocomplete guidance is explicit about preserving these across dynamic refresh.
- Use `aria-activedescendant` (DOM focus stays on the input/grid, `activedescendant` points at the virtual option's id) rather than roving `tabindex` — you cannot move focus to an element that hasn't been rendered.
- Keyboard nav (ArrowDown past the rendered window, Home/End, PageUp/Down, type-ahead) must **scroll the virtualizer to bring the target into the DOM before** setting `activedescendant`, or the referenced id won't exist.
- Known limitation to document: mobile screen readers (iOS VoiceOver, Android TalkBack) largely ignore `aria-activedescendant` and swipe through DOM options — virtualization inherently degrades that experience. Document it; don't pretend otherwise.
- Ensure scroll container has an accessible name and the listbox `role` is on the right element even when children are recycled.

---

### Target #2 — Form Validation-Message Display

**How comparables do it**
- **Material Web:** text fields expose an `error` boolean + `error-text` string; `supporting-text` is replaced by `error-text` in the error state. `reportValidity()` dispatches an `invalid` event and renders the message in the field's supporting-text slot. Supports both **constraint validation** (browser `validity`) and **manual validation** (app sets `error`/`error-text` directly) — this dual path is exactly what "server-side errors" needs.
- **Spectrum Web Components / React Spectrum:** help-text is a distinct slot/element that doubles as the error message; the field wires `aria-describedby` from input → help-text automatically (React-Aria's `useField` generates the ids and associations).
- **Native / ElementInternals:** the browser will NOT render a custom element's validation bubble; the message lives in `ElementInternals.validationMessage`. The documented pattern is: read `validationMessage`, drop it into your own element, style it freely. CSS `:invalid` matches before interaction; `:user-invalid` matches only after the user has interacted/submitted — mirroring native timing.

**Recommended approach for Amris**
- Reuse the **existing** `am-field` / `am-error-text` / `am-hint-text` / `am-label` components — this is a wiring feature, not a new component.
- Give each form control two message sources:
  1. **Constraint path:** surface `this._internals.validationMessage` automatically.
  2. **Manual/server path:** a public API (e.g. `setCustomError(message)` or an `error-text` property) so consumers show "Email already registered" from a server response. Mirror Material's `error` + `error-text` dual model.
- Have `am-field` own the association: generate an id for the message node and wire the control's `aria-describedby` (and `aria-invalid`) to it. Follow Spectrum/React-Aria's auto-`aria-describedby` pattern — the consumer should not hand-wire ARIA.
- **When to show:** default to `:user-invalid`-style timing (after blur/submit), not on first paint. Expose the invalid event so consumers can drive their own timing. This directly kills the "auto-show on first paint" anti-feature.
- Reflect validity to a CSS state (`:host([invalid])` or, better, `ElementInternals` custom states / `:state(...)`) so consumers can style without reaching into shadow DOM.

**Complexity: MEDIUM.** The APIs exist; the work is consistent wiring across ~13 form-associated components, id generation, describedby management, and getting show/hide timing right. Hidden cost: hint-text vs error-text precedence (does error replace hint like Material, or stack?), and clearing errors on re-validation.

**Accessibility implications:**
- The message MUST be linked via `aria-describedby` on the control (not just visually adjacent) or screen readers won't announce it.
- Set `aria-invalid="true"` when in error; remove it when cleared.
- Error text should live in an `aria-live="polite"` (or `role="alert"` for submit-time) region so a change in error is announced without moving focus. Choose politeness deliberately — `assertive`/`alert` on every keystroke is noisy.
- Don't rely on color alone (icon + text). Ensure the error/hint slot ids are stable across shadow-DOM boundaries — `aria-describedby` cannot cross into a *different* shadow root, so the message element must live in the same shadow root (or light DOM) as the focusable control. This is a real constraint given Amris's per-component Shadow DOM.

---

### Target #3 — Keyboard-Shortcut Registry

**How comparables do it**
- **Web Component libraries:** essentially none ship a general shortcut registry — this is a genuine gap/differentiator. `am-command-palette` hardcoding Cmd+K is typical of the current state of the art.
- **TanStack Hotkeys (React, the current reference design):** turns key input into a typed command system with **scopes** (same key means different things globally vs in an editor vs while typing), **sequences** (chords like `g` then `i`), **held keys**, **conflict detection**, and **platform-aware display** (mod = Cmd/Ctrl, opt = Alt/Option). Accepts an array of definitions for dynamic keymaps (command palettes) and has devtools listing every registration and its conflict behavior.
- **web-command-palette:** small API centered on cross-platform modifier notation (`mod`, `opt`) so one binding works on Mac and Windows.
- **Chrome extensions:** OS-level `chrome://extensions/shortcuts` gives rebindable commands with conflict detection — the model for "configurable + conflict-managed".

**Recommended approach for Amris**
- Build a small, framework-agnostic **registry module** (not a component) that owns: registration (`register({ id, keys, scope, handler })`), platform-normalized key parsing (`mod`/`opt`), **scope stacking** (global vs focused-widget vs "typing in an input"), and **conflict detection** (warn/return on duplicate binding in the same scope). Keep it a plain module consumers instantiate — respect the no-global-singleton constraint by making the registry an explicit instance (or a documented, opt-in shared one), not an implicit module-level global.
- Refactor `am-command-palette` to *consume* the registry: its open shortcut becomes a normal registration with a default of `mod+k` that consumers can rebind — removing the hardcoded Cmd+K.
- Expose the registration list (for a "keyboard shortcuts" help sheet) and a serializable config so apps can persist bindings themselves (persistence is an anti-feature to own internally).
- Default to registering **nothing** that shadows browser/OS combos; scope handlers to focus where possible; suppress firing while the user types in a text field unless explicitly global.

**Complexity: MEDIUM.** Core parsing/dispatch is small. The subtlety is scope resolution (which handler wins when multiple scopes are active), avoiding double-handling across nested shadow roots (keydown listener placement + `composedPath()`), platform normalization, and not interfering with native form/AT keys.

**Accessibility implications:**
- Shortcuts must **augment, never replace** standard keyboard operation — every action reachable by shortcut must also be reachable by normal Tab/Enter/Arrow navigation (WCAG 2.1.1).
- Provide a **discoverable list** of shortcuts (the registry should expose its registrations for a help overlay) — WCAG 2.4.x + general usability.
- Honor **WCAG 2.1.4 (Character Key Shortcuts):** single-character shortcuts must be remappable or disableable, or active only on focus — which the scope + rebinding design already provides.
- Do not trap or swallow keys AT relies on; when focus is in a text input, suppress single-key global shortcuts.
- Respect `prefers-reduced-motion` for any command-palette open animation (existing overlay concern).

---

## Feature Dependencies

```
Form validation-message display (Target #2)
    └──requires──> existing ElementInternals form participation (shipped)
    └──reuses────> am-field / am-error-text / am-hint-text / am-label (shipped, untested)
    └──requires──> aria-describedby wiring living in same shadow root as control

List virtualization (Target #1)
    └──requires──> @lit-labs/virtualizer (ResizeObserver, all floor browsers)
    └──requires──> aria-setsize / aria-posinset + aria-activedescendant nav
    └──depends-on─> fixing existing "stale highlighted index on async option update"
                    and "focus restoration" fragilities first

Keyboard-shortcut registry (Target #3)
    └──enables───> am-command-palette rebindable Cmd+K (replaces hardcode)
    └──requires──> scope/focus model + composedPath() across shadow roots
    └──independent of Targets #1 and #2 (can ship in parallel)

RTL support (table stakes)
    └──enhances──> floating-ui overlay flipping; verify with virtualization
```

### Dependency Notes
- **#2 must land the ARIA-in-same-shadow-root constraint first:** `aria-describedby` cannot reference an element in a different shadow root, so the error node has to co-locate with the control. This shapes whether `am-field` slots the message into the control's shadow DOM or light DOM.
- **#1 should follow the fragility fixes** (async option updates clamping highlighted index; focus restoration guarding removed nodes) already in the milestone — virtualization amplifies both bugs.
- **#3 is independent** and the cleanest to parallelize; it also has the smallest blast radius on the frozen API.

---

## MVP Definition (for the v1.0 milestone)

### Launch With (v1.0)
- [ ] **Validation-message display** wired to `ElementInternals.validationMessage` + a manual/server-error API across all form-associated controls — table-stakes-adjacent; cheapest of the three; highest correctness value.
- [ ] **Keyboard-shortcut registry** with scopes, platform normalization, conflict detection; `am-command-palette` refactored onto it — medium cost, high differentiation, low API-freeze risk.
- [ ] **List virtualization** for `am-data-grid` and combobox/select popups via `@lit-labs/virtualizer`, with correct `aria-setsize`/`posinset`/`activedescendant` — highest cost/risk; the one to schedule with the most a11y buffer.
- [ ] Accessibility hardening (focus restoration, focus trap, virtualized-list a11y) — the credibility gate for the "1.0" label.
- [ ] RTL audit using logical properties + `:dir()`.

### Add After Validation (v1.x)
- [ ] Editable / sortable virtualized grid features (only if demand appears) — resist scope creep.
- [ ] Shortcut config persistence helpers (still consumer-owned storage).
- [ ] Framework wrapper packages if CEM-based interop proves insufficient.

### Future Consideration (v2+)
- [ ] SSR / declarative shadow DOM (explicitly deferred).
- [ ] Full data-grid feature set (grouping/aggregation/tree data) — likely never; document composition instead.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Validation-message display (#2) | HIGH | MEDIUM | P1 |
| Keyboard-shortcut registry (#3) | MEDIUM | MEDIUM | P1 |
| List virtualization (#1) | HIGH | HIGH | P1 |
| A11y hardening (focus/virtual a11y) | HIGH | HIGH | P1 |
| RTL audit | MEDIUM | MEDIUM | P2 |
| Bundle-size CI gate | MEDIUM | LOW | P2 |
| Framework wrappers | LOW | MEDIUM | P3 |
| SSR | LOW | HIGH | P3 (out of scope) |

All three target features are P1 by milestone mandate; the *sequencing* recommendation is #2 → #3 → #1 (cheapest/safest first, riskiest a11y-heavy work last with buffer).

---

## Competitor Feature Analysis

| Feature | Material Web | Spectrum Web Components | Web Awesome (Shoelace) | Recommended Amris Approach |
|---------|--------------|------------------------|------------------------|----------------------------|
| Validation display | `error` + `error-text`; `reportValidity()` swaps supporting-text | help-text slot doubles as error; auto `aria-describedby` (React-Aria `useField`) | field + form controls with validity styling | Dual path: auto `validationMessage` + manual `error-text`; `am-field` owns `aria-describedby`/`aria-invalid`; `:user-invalid` timing |
| List virtualization | none built-in | none built-in | pro/paid data-grid only | `@lit-labs/virtualizer` in grid + combobox popups, opt-in/threshold, full `setsize`/`posinset` a11y |
| Keyboard shortcuts | none | none | none (command palette absent) | Framework-agnostic registry (scopes, conflict detection, `mod`/`opt`); command-palette rebindable |
| Theming | tokens | tokens | CSS custom properties (popularized it) | `--am-*` tokens (shipped) — document as public API |
| A11y model | good | best-in-class (React-Aria heritage) | good | Match Spectrum's auto-ARIA wiring as the bar |

---

## Sources

- [@lit-labs/virtualizer README (lit/lit)](https://github.com/lit/lit/tree/main/packages/labs/virtualizer) — viewport virtualization, `<lit-virtualizer>` element + `virtualize()` directive, ResizeObserver dependency (HIGH)
- [@lit-labs/virtualizer on npm](https://www.npmjs.com/package/@lit-labs/virtualizer) (MEDIUM)
- [Web Awesome launch blog](https://blog.fontawesome.com/web-awesome-component-library/) and [Data Grid issue #1072](https://github.com/shoelace-style/webawesome/issues/1072) — grid virtualization is a pro/stretch feature (MEDIUM)
- [Listbox Pattern, WAI-ARIA APG (W3C)](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — `aria-activedescendant`, roles (HIGH)
- [Orange autocomplete accessibility guidelines](https://a11y-guidelines.orange.com/en/articles/autocomplete-component/) — preserving `aria-setsize`/`aria-posinset` on dynamic refresh (HIGH)
- [Sarah Higley, "aria-activedescendant is not focus"](https://sarahmhigley.com/writing/activedescendant/) — mobile SR limitations of activedescendant (HIGH)
- [Material Web Text field docs](https://material-web.dev/components/text-field/) and [text-field.md](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md) — `error`/`error-text`/`supporting-text`, `reportValidity()`, constraint vs manual validation (HIGH)
- [Spectrum Web Components Field Label](https://opensource.adobe.com/spectrum-web-components/components/field-label/) and [React Spectrum Forms](https://react-spectrum.adobe.com/v3/forms.html) / [useField](https://react-spectrum.adobe.com/beta/react-aria/useField.html) — help-text as error, auto `aria-describedby` (HIGH)
- [MDN ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) and [Danny Moerkerke, native validation of web components](https://www.dannymoerkerke.com/blog/native-form-validation-of-web-components/) — `validationMessage` display pattern (HIGH)
- [WebKit: ElementInternals and Form-Associated Custom Elements](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/) — Safari support baseline (HIGH)
- [WFC.dev: exposing custom validity states to CSS](https://www.web-framework-components.com/core-architecture-lifecycle-management/form-associated-custom-elements/exposing-custom-validity-states-to-css/) — `:invalid` vs `:user-invalid`, custom states (MEDIUM)
- [TanStack Hotkeys](https://tanstack.com/hotkeys/latest) — scopes, sequences, conflict detection, platform-aware display (HIGH, reference design)
- [web-command-palette](https://github.com/zaccanoy/web-command-palette) — cross-platform `mod`/`opt` modifier notation (MEDIUM)
- [Build a Command Palette: Cmd+K like Linear and Vercel](https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/) — palette UX conventions (LOW)

---
*Feature research for: framework-agnostic Lit / Web Component UI library at v1.0*
*Researched: 2026-08-10*
