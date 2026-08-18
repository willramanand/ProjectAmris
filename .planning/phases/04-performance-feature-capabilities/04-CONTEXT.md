# Phase 4: Performance & Feature Capabilities - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the three load-bearing v1.0 capabilities on the non-exported `src/internal/` boundary so consumers gain the features while the frozen public surface stays small. Concretely:

1. **List virtualization** (PERF-02, PERF-03) — `am-data-grid` virtualizes 1000+ rows and combobox/select option popups virtualize their lists via `@lit-labs/virtualizer`, a11y-correct (`aria-setsize`/`aria-posinset`/`aria-rowcount`, `aria-activedescendant` scrolls the target into the window), with selection/sort/focus identity-keyed and form-value integrity preserved. **Internal-only, freeze-neutral.**
2. **floating-ui `autoUpdate` gating** (PERF-04) — gate `autoUpdate` to open transitions across all overlay components (the seam Phase 2 left intentionally ungated).
3. **Validation-message display** (FEAT-01, FEAT-02) — form controls auto-surface `ElementInternals.validationMessage` through `am-field`/`am-error-text` with same-shadow-root `aria-describedby`/`aria-invalid` and `:user-invalid` timing, plus a manual/server-error API (`setCustomError`) with defined precedence. **Adds public surface — lands before freeze.**
4. **Keyboard-shortcut registry** (FEAT-03, FEAT-04) — a registry with scopes, `mod`/`opt` platform normalization, conflict detection, and a reserved-combo blocklist; an `am-shortcuts` provider element (per-subtree via `@lit/context`) drives shortcuts; `am-command-palette` is refactored off the hardcoded Cmd+K with graceful fallback. **Adds public surface (`am-shortcuts` + registry API) — lands before freeze.**

**In scope (requirements):** PERF-02, PERF-03, PERF-04, FEAT-01, FEAT-02, FEAT-03, FEAT-04.

**Not this phase:**
- **Documentation** — README peer-dep/browser-floor, validation/theming/usage prose, and Storybook examples for virtualization + validation are **Phase 5** (DOCS-01→03). Author feature machinery + inline JSDoc here; the polished docs are Phase 5.
- **Flipping the surface-diff gate to enforcing** and the release/publish pipeline — **Phase 6** (SHIP-01→04). This phase's new public surface (`am-shortcuts`, `setCustomError`) must be captured in the CEM baseline with a Changeset, but the gate stays report-only until Phase 6.
- **New components beyond the freeze set** — `am-shortcuts` is the one net-new registered element this phase adds (it is load-bearing for FEAT-04); no other new tagNames. Editable/sortable virtualized grid (FEAT-V2-02) and shortcut-config persistence (FEAT-V2-01) are **v2**.
- **Re-litigating the Phase 2 refactor** — the extracted `src/internal/` controllers (FloatingPositionController, ListboxNavController, option-filter, TeardownScope) are the seams this phase builds on, not redesigns.

</domain>

<decisions>
## Implementation Decisions

### Validation-message display (FEAT-01, FEAT-02)
- **D-01:** **`:user-invalid` timing** — an error becomes visible once the user leaves an invalid field (blur) **or** attempts submit, then tracks live as they fix it. Never on first paint (upstream-locked anti-feature). Matches native `<input>` behavior. — **Reversibility:** reversible (behavior policy in the control/field; the "no auto-show on first paint" guard is locked in REQUIREMENTS Out-of-Scope).
- **D-02:** **Error replaces hint.** In the error state `am-hint-text` is hidden and `am-error-text` takes its place (Material `supporting-text`→`error-text` model); the hint returns when the error clears. One message line, no competing guidance, a single `aria-describedby` target. — **Reversibility:** reversible.
- **D-03:** **`setCustomError` precedence — custom wins.** A consumer/server-set message overrides the native `validationMessage` while it is set; clearing it (`setCustomError('')`) falls back to the native constraint message. Mirrors `setValidity(customError)` semantics. — **Reversibility:** the *precedence* is reversible; the **`setCustomError` method name/signature is new public API** bound at freeze — **one-way** for the method surface — so its name must be captured in the CEM baseline with a Changeset (SHIP-01 seam).
- **D-04:** **Announcement politeness — polite per-field, assertive on submit.** Per-field errors that appear on blur/typing announce via `aria-live="polite"`; a failed **submit** announces assertively (`role="alert"`) so it is not missed when focus does not move. Deliberate politeness per research — assertive on every keystroke is noisy. — **Reversibility:** reversible.

### List virtualization (PERF-02, PERF-03)
- **D-05:** **Auto-activate above a row threshold — no public attribute.** The grid/popup virtualizes automatically once row count exceeds the threshold; below it, today's `repeat()` rendering stands. This keeps the ROADMAP "internal-only / freeze-neutral" promise — **no new public attribute is added** to the frozen surface. — **Reversibility:** reversible (internal machinery, zero public surface; adding an opt-in attribute later is additive/non-breaking).
- **D-06:** **Same auto-threshold model for grid and popups.** combobox/select option popups virtualize on the same activation model as `am-data-grid`; small option lists stay on `repeat()`. One consistent mental model and activation pattern; keeps the common 5–20 option case on the simple, proven path. — **Reversibility:** reversible.
- **D-07 (Claude's discretion):** Exact threshold row count is set during planning/implementation from measured render cost on real content (Phase 1 measured-baseline pattern, D-03/D-09). Likely a round ~100; documented when set. See Claude's Discretion.

### Keyboard-shortcut registry (FEAT-03, FEAT-04)
- **D-08:** **Imperative registry, distributed by `<am-shortcuts>` via `@lit/context`.** Consumers and components call `registry.register({ id, keys, scope, handler })`; the `am-shortcuts` provider supplies the registry instance per-subtree through `@lit/context`. Handlers are functions, so imperative binding is natural; smallest net-new element surface (just `am-shortcuts`). Respects the no-global-singleton constraint — the registry is an explicit instance, not a module-level global. — **Reversibility:** **one-way** — `am-shortcuts` is a new registered custom element and the `register(...)` API is a published contract consumers bind to; changing it post-1.0 breaks consumers. Capture in CEM baseline + Changeset.
- **D-09:** **`am-command-palette` self-registers default `mod+k` when no provider is present** (today's drop-in Cmd/Ctrl+K keeps working); when an `am-shortcuts` provider IS present in its subtree, it registers through the registry instead and its open combo becomes rebindable. Cleanest reading of FEAT-04's "graceful fallback." — **Reversibility:** reversible (refactor of existing behavior; the default `mod+k` binding preserves current UX).
- **D-10:** **Reserved-combo blocklist default-refuses browser/OS combos; single-keys opt-in only.** The registry ships a blocklist of common browser/OS combos (Cmd/Ctrl+T/W/N/L/Tab…) that registration refuses by default (enforces the locked "no shadowing browser/OS shortcuts" anti-feature). Single-character shortcuts require explicit opt-in, are always remappable/disablable, and are suppressed while the user types in a field (WCAG 2.1.4). — **Reversibility:** reversible (defaults/policy; enforces an upstream-locked anti-feature).
- **D-11:** **Same-scope conflict → refuse + report, no throw.** `register()` detects a same-scope collision, keeps the first binding, refuses the second, and returns an inspectable result (plus a dev-mode warning). No exception — a conflict during a component's connect lifecycle never breaks rendering. Different scopes reusing a key is legal. — **Reversibility:** reversible.

### New-dependency packaging (`@lit-labs/virtualizer`, `@lit/context`)
- **D-12:** **Runtime `dependencies`, kept external/unbundled.** List both in `package.json` `dependencies` so npm auto-installs them for consumers (no manual step), but keep them out of Amris's bundle via the build `external` list — the same treatment as Lit today. `@lit/context` is already matched by `vite.config.ts:195` `/^@lit\//`; **`@lit-labs/virtualizer` must be added** (e.g. `/^@lit-labs\//`) — it is NOT covered by the `@lit/*` pattern. No duplicated Lit, stays tree-shakeable. — **Reversibility:** **costly** — changes `package.json` dependency classification + build externals and interacts with SHIP-02 (`exports`/`sideEffects`) and consumer install; moving peer↔dep after publish is a consumer-visible change.
- **D-13:** **Exact-pin `@lit-labs/virtualizer` (pre-1.0/labs), caret (`^`) `@lit/context` (stable).** A pre-1.0 package can break on a minor bump and a frozen 1.0 should not inherit that risk silently; `@lit/context` is well-established and safe on a normal caret range. — **Reversibility:** reversible (version ranges in `package.json`).

### Claude's Discretion
- **Virtualization threshold value (D-07)** — tune from benchmarks; likely ~100 rows; document the chosen number in the plan.
- **PERF-04 `autoUpdate` gating** — gate floating-ui `autoUpdate` to open transitions across all overlay components, primarily via the existing `src/internal/controllers/floating-position.ts` (FloatingPositionController); behavior-preserving, the seam Phase 2 intentionally left ungated. Mechanical — no user-facing decision.
- **Cross-shadow `aria-describedby` wiring** — the error/hint node must live in the same DOM tree as the focusable control (`aria-describedby` cannot cross into a different shadow root). `am-field` owns id generation and wires `aria-describedby`/`aria-invalid`; the exact mechanism (message co-located with control, id forwarding into the control's shadow root, or light-DOM association) is an implementation decision for research/planning. This is the FEATURES.md dependency note — settle it before wiring FEAT-01.
- **Which controls get validation wiring** — the **15 form-associated controls** (input, textarea, checkbox, radio, switch, select, combobox, rich-select, number-field, input-otp, slider, color-picker, date-picker, time-picker; button is form-associated but not a validation target). `am-search-field` and `am-file-upload` are **NOT** form-associated (no ElementInternals) — exclude them (STATE finding).
- **CSS state exposure for invalid styling** — whether to reflect validity via `ElementInternals` custom states (`:state(...)`) and/or `:host([invalid])` so consumers can style without reaching into shadow DOM.
- **Registry internals** — scope-stacking resolution order (which scope wins when several are active), `composedPath()` handling across nested shadow roots, keydown-listener placement (reuse `TeardownScope` for cleanup), and the serializable-config / registration-list shape that feeds a "keyboard shortcuts" help sheet.
- **Virtualization internals** — uniform vs variable row heights, scroll-to-selected, and keeping selection/sort/focus identity-keyed across recycled rows; the documented mobile-SR `aria-activedescendant` limitation must be acknowledged (document, don't pretend otherwise).
- **Exact `@lit-labs/virtualizer` version** and the exact contents of the reserved-combo blocklist.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — PERF-02→04 + FEAT-01→04 acceptance wording; v2 deferrals (FEAT-V2-01 shortcut-config persistence, FEAT-V2-02 editable/sortable virtualized grid); Out-of-Scope anti-features that constrain this phase (no auto-show validation on first paint, no keybindings shadowing browser/OS, no shortcut-persistence store, no full-spreadsheet grid)
- `.planning/ROADMAP.md` §"Phase 4: Performance & Feature Capabilities" — goal + 5 success criteria this phase must make TRUE; also §"Phase 5"/"Phase 6" for the docs / enforcing-freeze boundaries deferred out of this phase
- `.planning/PROJECT.md` — Key Decisions (adopt non-exported `src/internal/` boundary; include validation/virtualization/shortcut-registry in 1.0); Constraints (Lit peer-dep + must-not-bundle-Lit, ESM-only, `--am-*` tokens only, Safari 16.4 floor / ElementInternals not polyfillable)

### Feature research (primary spec for this phase)
- `.planning/research/FEATURES.md` — **primary design reference.** The three Target Feature Deep-Dives: recommended approach, complexity, and **accessibility implications** for virtualization, validation-message display, and the shortcut registry; the MVP sequencing recommendation **#2 (validation) → #3 (registry) → #1 (virtualization)** — cheapest/safest first, riskiest a11y-heavy work last with buffer; the Feature Dependencies graph (validation needs same-shadow-root ARIA; virtualization should follow the Phase 3 async-clamp/focus fixes)
- `.planning/research/STACK.md` — `@lit-labs/virtualizer` (ResizeObserver dependency, all floor browsers; still labs/pre-1.0); confirms new deps not in the current stack
- `.planning/research/PITFALLS.md` — async index-clamp + focus-restoration fragilities that virtualization amplifies (Phase 3 fixed these; virtualization must not reintroduce them)
- `.planning/research/SUMMARY.md` — research synthesis / cross-references

### Codebase maps (reuse, don't re-derive)
- `.planning/codebase/CONCERNS.md` — the "missing critical features" this phase closes; that `am-data-grid`/`am-combobox` render all rows via `repeat()` today (virtualization is additive); the floating-ui `autoUpdate` seam (PERF-04)
- `.planning/codebase/INTEGRATIONS.md` — floating-ui usage across combobox/dropdown/popover/tooltip/date-picker/context-menu (the overlays PERF-04 gates)
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md` — component layout, barrel exports (`src/index.ts`/`src/index.all.ts`), where `src/internal/` and a new `am-shortcuts` element fit; `am-shortcuts` must be exported (public) while registry machinery stays in `src/internal/`
- `.planning/codebase/CONVENTIONS.md` — event/prop naming + JSDoc `@fires`/`@csspart`/`@cssprop`/`@slot` tags the new public surface (`am-shortcuts`, `setCustomError`, validation ARIA) must follow so CEM captures it
- `.planning/codebase/TESTING.md` — jsdom + Chromium browser lane; TEST-06's virtualization scroll/focus coverage lands in the browser project this phase

### Existing `src/internal/` seams (build on, don't rebuild)
- `src/internal/controllers/floating-position.ts` — FloatingPositionController; the `autoUpdate`-gating target for PERF-04 (left ungated in Phase 2 by design)
- `src/internal/controllers/listbox-nav.ts` — ListboxNavController; combobox/select popup keyboard nav that must keep `aria-activedescendant` correct under virtualization
- `src/internal/helpers/teardown-scope.ts` — TeardownScope; reuse for the registry's global keydown-listener lifecycle (Phase 3 discipline)

### Validation-target components
- `src/components/field/field.ts` — `am-field` composes label/hint/error via **light-DOM slots** (`slot="label|hint|error"`); it owns the id generation + `aria-describedby`/`aria-invalid` wiring for FEAT-01 (cross-shadow constraint lives here)
- `src/components/hint-text/`, `src/components/error-text/`, `src/components/label/` — the shipped message components validation display reuses (a wiring feature, not new components)

### Build / freeze plumbing
- `package.json` — `dependencies`/`peerDependencies`/`exports`/`sideEffects`; where D-12 adds the two runtime deps and D-13 sets version ranges; `am-shortcuts` export + `setCustomError` must land here before freeze
- `vite.config.ts` §build `external` (line ~195: `['lit', /^lit\//, /^@lit\//, '@floating-ui/dom', /^@floating-ui\//]`) — `@lit/context` already matched by `/^@lit\//`; **add `/^@lit-labs\//`** so `@lit-labs/virtualizer` stays external (D-12)
- `api/custom-elements.baseline.json` + `.changeset/` — the report-only surface diff and the Changeset that must accompany the new public surface (`am-shortcuts`, `setCustomError`); gate stays report-only until Phase 6
- `.planning/phases/02-api-cleanup-cem-baseline/02-CONTEXT.md` — the `src/internal/` boundary (D-09) + behavior-preserving discipline (D-10) + frozen slot/part/token surface (D-11) this phase must respect

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/internal/` controllers already exist** (Phase 2): FloatingPositionController (PERF-04 gating target), ListboxNavController (popup nav under virtualization), option-filter, TeardownScope (registry listener cleanup). Feature machinery extends this non-exported tree — no new exported modules.
- **`am-field` / `am-hint-text` / `am-error-text` / `am-label` are shipped** — validation display is a *wiring* feature over existing components, not new components (FEATURES.md). `am-field` already slots label/hint/error.
- **`am-command-palette` exists** and hardcodes Cmd+K — FEAT-04 generalizes an existing behavior; the refactor keeps `mod+k` as the graceful default (D-09).
- **Phase 1 characterization suite + Chromium browser lane** is the acceptance signal for the behavior-preserving parts (PERF-04 gating, command-palette refactor) and where virtualization scroll/focus a11y (TEST-06) is proven.

### Established Patterns
- **15 form-associated controls** implement `formAssociated = true` + ElementInternals; none implements `setValidity` yet (validation-UX policy was deferred here). `am-search-field` and `am-file-upload` are NOT form-associated — exclude from validation wiring.
- **Overlay positioning** is centralized in FloatingPositionController — PERF-04 gates `autoUpdate` there rather than per-component.
- **Event/JSDoc convention**: new public surface (`am-shortcuts`, `setCustomError`, validation ARIA/events) uses the `am-*` event prefix and inline `@fires`/`@csspart`/`@cssprop`/`@slot` JSDoc so CEM captures it into the baseline.
- **No global state / no module singleton** — the shortcut registry is an explicit instance provided per-subtree via `@lit/context`, never an implicit module-level global.

### Integration Points
- `src/components/shortcuts/` (new) — `am-shortcuts` provider element (public/exported); registry machinery lives under `src/internal/` (non-exported).
- `src/components/command-palette/` — refactor off hardcoded Cmd+K onto the registry with `mod+k` fallback (D-09).
- `src/components/data-grid/`, `src/components/combobox/`, `src/components/select/` — virtualization targets (auto-threshold, D-05/D-06).
- All overlay components using floating-ui — PERF-04 `autoUpdate` gating via FloatingPositionController.
- `package.json` + `vite.config.ts` external list — new deps (D-12/D-13).
- `api/custom-elements.baseline.json` + `.changeset/` — capture the new public surface + Changeset.

</code_context>

<specifics>
## Specific Ideas

- **Freeze-impact split is deliberate:** validation (`setCustomError`) and the shortcut registry (`am-shortcuts` + `register` API) ADD public surface and must land + be baselined before the Phase 6 freeze; virtualization is engineered to add ZERO public surface (auto-threshold, D-05) so it stays freeze-neutral exactly as the ROADMAP states.
- **Research sequencing recommendation #2 → #3 → #1** (validation → registry → virtualization): cheapest/highest-correctness first, riskiest a11y-heavy virtualization last with the most buffer. Planning should honor this ordering / dependency.
- **Virtualization must not reintroduce the Phase 3 fixes** — the async "stale highlighted index" clamp and focus-restoration `isConnected` guards are exactly what naive virtualization breaks; a11y windowing (`aria-setsize`/`posinset`/`activedescendant`) is the credibility gate.
- **Graceful degradation is the theme of the feature UX** — command-palette works with or without a provider; validation auto-wires but exposes the `invalid` event/CSS state for consumers who want their own timing; the registry refuses (never throws) on conflict.

</specifics>

<deferred>
## Deferred Ideas

- **Validation/theming/usage docs + Storybook examples** for the virtualization and validation-message patterns — **Phase 5** (DOCS-02, DOCS-03). Author inline JSDoc here; polished prose + runnable examples are Phase 5.
- **Flip surface-diff gate to enforcing** + release/publish pipeline — **Phase 6** (SHIP-01→04). This phase's new surface is baselined + Changeset'd but the gate stays report-only.
- **Shortcut-config persistence helpers** (FEAT-V2-01) — **v2**; the registry exposes a serializable config, but storage stays consumer-owned (persistence store is a locked anti-feature).
- **Editable / sortable virtualized data-grid** (FEAT-V2-02, full spreadsheet grid) — **v2**; ship a *display* virtualizer only (full grid is a locked anti-feature).
- **RTL audit** across floating-ui overlays (RTL-V2-01) — **v2**; partial today.
- **Declarative `<am-shortcut>` element** wrapper — considered and set aside (D-08 chose imperative-via-provider); could be an additive v1.x/v2 convenience if markup-first demand appears.

</deferred>

---

*Phase: 4-performance-feature-capabilities*
*Context gathered: 2026-08-18*
