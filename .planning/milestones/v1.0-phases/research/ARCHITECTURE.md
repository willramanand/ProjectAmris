# Architecture Research

**Domain:** v1.0 hardening of an existing Lit 3 / Shadow-DOM Web Components library (`@willramanand/amris`)
**Researched:** 2026-08-10
**Confidence:** HIGH (structural fit, grounded in the existing codebase) / MEDIUM (exact tooling versions)

> Scope note: this is **integration research**, not a redesign. The existing architecture is fixed — Lit + Shadow DOM, one component per directory, property→event data flow, no module-level singletons, `ElementInternals` for forms, `@floating-ui/dom` for overlays, `--am-*` tokens, ESM-only tree-shakeable bundles. Every recommendation below slots the v1.0 additions into that model without violating it.

## Standard Architecture

### The one structural move that enables everything: an `src/internal/` boundary

The three features (virtualization, validation display, keyboard registry) all need **shared machinery** that must **not** become part of the frozen 1.0 public API. Introduce a new non-exported layer:

```
┌──────────────────────────────────────────────────────────────────────┐
│                 Public Surface (FROZEN at 1.0)                         │
│                 src/index.ts  ·  src/index.all.ts                      │
│   exports: component classes, exported prop/event/type names,          │
│            tokens, a small set of public utilities                     │
└───────────────┬──────────────────────────────────────────────────────┘
                │ imports (one-way; internal never re-exported)
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Components Layer  src/components/*/                 │
│   AmDataGrid   AmCombobox   AmRichSelect   AmInput …   AmCommandPalette │
│   (each owns its own Shadow DOM, scroll container, ElementInternals)   │
└───┬───────────────┬───────────────────┬──────────────────┬────────────┘
    │ uses          │ uses              │ uses             │ consumes ctx
    ▼               ▼                   ▼                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 NEW: src/internal/  (NOT publicly exported)             │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐   │
│  │ virtual-list.ts    │ │ validation-        │ │ shortcut-          │   │
│  │ (ReactiveController│ │ controller.ts      │ │ registry.ts +      │   │
│  │  wrapping the      │ │ (reads _internals  │ │ shortcuts-context  │   │
│  │  virtualize dir.)  │ │  validity/message) │ │  (@lit/context)    │   │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘   │
└───┬─────────────────────────────┬──────────────────────────┬───────────┘
    ▼                             ▼                          ▼
┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐
│ @lit-labs/       │   │ ElementInternals   │   │ @lit/context             │
│  virtualizer     │   │ (native)           │   │ (per-subtree provider)   │
└──────────────────┘   └────────────────────┘   └──────────────────────────┘
                                  │
                                  ▼
              Tokens (--am-*)  ·  Styles  ·  Lit (peer)
```

Because `src/internal/` is never re-exported from `index.ts` / `index.all.ts`, none of this shared machinery appears in the Custom Elements Manifest or the type rollup — so it is **outside the frozen surface** and can evolve after 1.0. This is what makes the API-freeze mechanic (below) tractable.

### Component Responsibilities

| Component / Module | Responsibility | Typical Implementation |
|--------------------|----------------|------------------------|
| `src/internal/virtual-list.ts` | Windowing controller shared by all long lists | Lit `ReactiveController` wrapping `@lit-labs/virtualizer`'s `virtualize` directive; hosts inside the component's own shadow root |
| `AmDataGrid`, `AmCombobox`, `AmRichSelect`, `AmList`, `AmMenu` | Own their scroll container + row/option templates | Call the virtual-list controller in `render()` when item count exceeds threshold; keep `repeat()` below it |
| `src/internal/validation-controller.ts` | Surface `ElementInternals.validationMessage`/`validity` as reactive state | `ReactiveController` reading `_internals`; exposes `message`, `showError`, and a stable `describedById` |
| `AmInput`, `AmCheckbox`, `AmSelect`, `AmNumberField`, `AmField`, … | Render the message region + wire ARIA | Render existing `<am-error-text>` (or a `validationMessage` slot) below the control; set `aria-describedby` |
| `src/internal/shortcut-registry.ts` | Per-subtree keyboard registry (instance, not singleton) | Plain class owned by a provider element; `register()` returns an `unregister()` disposer |
| `AmShortcutsProvider` (new element) / `AmAppShell` | Provide the registry via context to its subtree | `@lit/context` `ContextProvider`; attaches one gated `keydown` listener while connected |
| `AmCommandPalette` (refactor) | Consume the registry instead of hardcoding Cmd+K | `ContextConsumer`; registers its open-shortcut on connect, unregisters on disconnect; **falls back** to local listener if no provider |
| CEM baseline + diff gate | Define and guard the frozen surface | `cem analyze` (already present) → committed `api/custom-elements.baseline.json` → CI diff |

## Recommended Project Structure

```
src/
├── components/                    # unchanged: one dir per component (public)
│   ├── data-grid/                 # gains virtual-list controller usage
│   ├── combobox/                  # gains virtual-list controller usage
│   ├── command-palette/           # refactored to consume shortcut context
│   ├── shortcuts-provider/        # NEW public element: <am-shortcuts>
│   │   ├── shortcuts-provider.ts
│   │   └── index.ts
│   └── … (existing 67)
├── internal/                      # NEW — shared machinery, NOT exported publicly
│   ├── virtual-list.ts            # ReactiveController over @lit-labs/virtualizer
│   ├── validation-controller.ts   # ReactiveController over ElementInternals
│   ├── shortcut-registry.ts       # per-instance registry class
│   └── shortcuts-context.ts       # createContext() token + types
├── styles/                        # unchanged
├── tokens/                        # unchanged
├── utilities/                     # unchanged (public helpers only)
├── index.ts                       # FROZEN core surface
└── index.all.ts                   # FROZEN full surface
api/
└── custom-elements.baseline.json  # NEW — committed frozen-API snapshot for diffing
test/
├── components/                    # +20 untested components, +virtualization/validation/shortcut tests
└── internal/                      # NEW — unit tests for the three controllers
```

### Structure Rationale

- **`src/internal/`:** The load-bearing decision. Keeps shared feature machinery off the public surface so the 1.0 contract stays small and diffable. Import direction is strictly one-way (`components → internal`); nothing in `internal/` is re-exported.
- **`components/shortcuts-provider/`:** The registry needs an *owner* that is a real element (to scope state to a DOM subtree and manage listener lifecycle). It is public because consumers must be able to place it; the registry *class* it holds stays internal.
- **`api/…baseline.json`:** A committed artifact makes "the frozen API" a reviewable file, not tribal knowledge. Diffing against it in CI is the freeze enforcement.

## Architectural Patterns

### Pattern 1: Virtualization via a shared ReactiveController (own-shadow-root scroller)

**What:** Wrap `@lit-labs/virtualizer`'s `virtualize` directive in one internal `ReactiveController` that every long-list component calls. The scroll container lives **inside each component's own shadow root**, so the virtualizer's clipping/scroll ancestor is in the same shadow root as the virtualizer.

**When to use:** Data-grid, combobox, rich-select, list, menu — any component that can render 1000+ items. Gate it behind a threshold (e.g., `items.length > ~100`) or an explicit `virtualized` boolean; keep `repeat()` for short lists so small tables stay light-DOM and dependency cost is dynamically imported.

**Trade-offs:**
- Pro: One boundary, one behavior, one place to fix. Sidesteps Lit issue [#3493](https://github.com/lit/lit/issues/3493) (broken virtualization when a *slotted* virtualizer's clipping ancestor is across a shadow boundary) because these components own their scroller internally rather than being slotted into a foreign scroll parent.
- Con: `@lit-labs/virtualizer` is a "labs" package (pre-1.0). Pin it and bundle it as a regular `dependency` (it declares `lit` as peer, so it does not double-bundle Lit). Adds to bundle weight — hence the bundle-size CI gate must land before/with this work.

**Critical constraint — selection/sort/focus must be keyed by identity, not DOM position:** Virtualization unmounts off-screen rows. `AmDataGrid` already keys `repeat()` and selection by `getRowId`; keep **all** selection (`_internalSelected: Set<RowKey>`), sort, and form value keyed by row id. Roving-tabindex focus (`_focusedRowIndex`) must be reconstructed after render via `scrollToIndex` + re-query, because the focused row's DOM node may not exist when off-screen. Form/selection state therefore lives in instance `@state` and `ElementInternals`, never inferred from rendered `<tr>` nodes.

**Example:**
```typescript
// src/internal/virtual-list.ts (NOT exported from index.ts)
export class VirtualListController<T> implements ReactiveController {
  constructor(host: ReactiveControllerHost, private opts: { threshold?: number }) {
    host.addController(this);
  }
  render(items: T[], keyFn: (i: T) => unknown, tmpl: (i: T, idx: number) => TemplateResult) {
    if (items.length <= (this.opts.threshold ?? 100)) {
      return repeat(items, keyFn, tmpl);          // small: plain repeat()
    }
    return virtualize({ items, keyFunction: keyFn, renderItem: tmpl }); // large: windowed
  }
  hostConnected() {} hostDisconnected() {}
}
```

### Pattern 2: Validation message via ElementInternals-backed ReactiveController + existing text components

**What:** A `validation-controller` reads `this._internals.validity` and `this._internals.validationMessage` (already set by every form-associated component today) and exposes them as reactive state. Each form control renders the message using the library's **existing** `<am-error-text>` / `<am-hint-text>` / `<am-field>` components, and wires `aria-describedby` from the control to the message's `uniqueId()`.

**When to use:** All `formAssociated` components. No global validation store — the message is derived per-instance from native internals, preserving "no global state."

**Trade-offs:**
- Pro: Zero new source of truth. The browser's `ValidityState` + host-set `validationMessage` remain authoritative; the component only *displays* what it already reports. Reuses shipped components, so no new visual surface to design.
- Pro/API: Offer a `validationMessage` **slot** for custom copy with a **default internal render** as fallback — matches the library's slot-composition convention and adds only a slot + one `describedById` to each component's public surface (small, intentional API delta before freeze).
- Con: `aria-describedby` must reference an id in the **same shadow root** as the control (cross-root ARIA is not broadly available at the Safari 16.4 floor). Since both the control and the message render in the component's own shadow root, this holds — but it means the message region must be rendered internally (not left entirely to a light-DOM slot). Keep the slot for *content override*, render the wrapper + id internally.

**Example:**
```typescript
// in a form control's render()
const { message, showError, describedById } = this._validation;
html`
  <input aria-describedby=${showError ? describedById : nothing} …>
  ${showError
    ? html`<am-error-text id=${describedById}>
             <slot name="validationMessage">${message}</slot>
           </am-error-text>`
    : nothing}
`;
```

### Pattern 3: Keyboard registry as a context-provided per-subtree instance (no singleton)

**What:** A plain `ShortcutRegistry` **class** (instance state) is owned by a provider element `<am-shortcuts>` (or folded into `<am-app-shell>`), which exposes it through `@lit/context`. Consumer components (`AmCommandPalette`) use a `ContextConsumer` to `register({ keys, handler, description })` in `connectedCallback` and call the returned disposer in `disconnectedCallback`. The provider attaches **one** `keydown` listener, gated to while it is connected.

**When to use:** App-wide shortcuts across the component tree. This is the opt-in **context/provider** answer to the milestone's "provider element vs registry module" question — chosen over a registry module because a module export would be a module-level singleton, which the architecture forbids.

**Trade-offs:**
- Pro: State is scoped to a DOM subtree, so two independent Amris apps on one page get independent registries — impossible with a global singleton. Matches the existing "parent provides via property/context, child notifies via event/registration" model (same shape as `am-tabs`/`am-tab`, and `am-theme-provider`).
- Pro: Graceful degradation — if no `<am-shortcuts>` ancestor exists, `AmCommandPalette` keeps its **current** behavior (a local `document` `keydown` listener for Cmd/Ctrl+K, attached in `connectedCallback`, removed in `disconnectedCallback`, gated on `open`). So the palette still works standalone; the registry is an enhancement, not a requirement.
- Con: Adds `@lit/context` as a dependency (small, part of the Lit ecosystem, declares `lit` peer). One new public element (`<am-shortcuts>`) enters the frozen surface — intentional and cheap.

**Example:**
```typescript
// src/internal/shortcuts-context.ts (internal)
export const shortcutsContext = createContext<ShortcutRegistry>('am-shortcuts');

// AmCommandPalette
private _shortcuts = new ContextConsumer(this, { context: shortcutsContext, subscribe: true });
private _dispose?: () => void;
connectedCallback() {
  super.connectedCallback();
  const reg = this._shortcuts.value;
  if (reg) this._dispose = reg.register({ keys: ['mod+k'], handler: () => (this.open = !this.open) });
  else document.addEventListener('keydown', this._handleGlobalKeydown); // fallback: today's behavior
}
disconnectedCallback() {
  this._dispose?.(); document.removeEventListener('keydown', this._handleGlobalKeydown);
  super.disconnectedCallback();
}
```

### Pattern 4: API-freeze via a committed Custom Elements Manifest baseline + CI diff

**What:** The project already runs `cem analyze` to produce `dist/custom-elements.json`. Promote that manifest to the **canonical description of the frozen surface**: after the API cleanup lands, snapshot it to `api/custom-elements.baseline.json` and commit it. In CI, regenerate the manifest on each PR and **diff against the baseline**; fail the build on removals/renames/type changes to attributes, properties, events, slots, CSS parts, or CSS custom properties. Intentional changes require updating the baseline in the same PR (paired with a Changeset), making every surface change an explicit, reviewable act.

**When to use:** From the freeze point onward. Before freeze, the diff can run in "report-only" mode to surface churn during cleanup.

**Trade-offs:**
- Pro: The CEM already exists and covers exactly the web-component public surface (attrs/props/events/slots/parts/cssprops) — far more complete than diffing `.d.ts` alone. A CEM-diff utility exists in the ecosystem ([wc-toolkit](https://wc-toolkit.com/adoption/changelog/) / community CEM-diff tools); a small custom comparator is also viable since the manifest is plain JSON.
- Complement (optional): add a TypeScript type-rollup golden (e.g., commit the generated `index.d.ts` and diff it, or API Extractor `.api.md`) to catch generic/type-signature changes the CEM does not model. CEM diff is primary; type golden is belt-and-suspenders.
- Con: Requires discipline — the baseline must be regenerated intentionally. That is the point: it converts "did we break the API?" into a diff a reviewer approves.

## Data Flow

### Validation display flow (no global state)

```
host sets constraint / user input
      ↓
component calls this._internals.setValidity(flags, message, anchor)   [unchanged today]
      ↓
validation-controller reads _internals.validity + .validationMessage   [derive, per-instance]
      ↓ (@state)
render(): <am-error-text id=describedById> + input[aria-describedby]     [same shadow root]
```

### Keyboard shortcut flow (per-subtree)

```
<am-shortcuts> (owns ShortcutRegistry instance) --provides via @lit/context-->
      ↓
AmCommandPalette (ContextConsumer) --register({keys,handler}) on connect-->
      ↓
provider's single gated keydown listener --match--> handler() --> palette.open toggles
      ↑
disconnect --> dispose() removes registration     (no module singleton anywhere)
```

### Virtualized list flow (identity-keyed state)

```
rows/options (array)
      ↓  count > threshold ?
   no → repeat(items, getRowId, tmpl)         small list, full DOM
   yes → virtualize({items, keyFunction:getRowId, renderItem:tmpl})   windowed
      ↓
selection/sort/focus resolved by getRowId (identity), never by <tr> position
      ↓
form value (combobox) via _internals.setFormValue(valueByKey)   [unchanged contract]
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Typical (≤100 rows/options) | `repeat()` path only; no virtualizer in the DOM; zero behavior change |
| 1k rows | Virtualize path engages; constant DOM node count; selection/focus stay O(1) via `Set<RowKey>` keyed by id |
| 10k+ rows | Virtualizer keeps DOM bounded; watch sort (`[...rows].sort` is O(n log n) per sort) and consider host-side pre-sort; bundle-size gate guards the added dependency weight |

### Scaling Priorities

1. **First bottleneck:** DOM node count in `data-grid`/`combobox` at 1000+ rows — fixed by the virtual-list controller. This is the stated v1.0 perf goal.
2. **Second bottleneck:** `@floating-ui/dom` `autoUpdate` running while overlays are closed — gate `autoUpdate` to the open transition only (already in the milestone's perf scope; orthogonal to the three features but shares the "gate expensive work on open state" pattern used by the keyboard listener).

## Anti-Patterns

### Anti-Pattern 1: A module-level shortcut registry singleton

**What people do:** `export const shortcuts = new ShortcutRegistry()` in a shared module and import it everywhere.
**Why it's wrong:** Violates the documented "No Global State / no module-level singletons" constraint; breaks with multiple independent app roots on one page; complicates teardown and testing.
**Do this instead:** Own the registry in a provider element and hand it out via `@lit/context` (Pattern 3). State is scoped to the DOM subtree, lifecycle is tied to connect/disconnect.

### Anti-Pattern 2: Inferring selection or focus from rendered rows

**What people do:** Read `<tr>` nodes / DOM order to determine which items are selected or focused.
**Why it's wrong:** Virtualization unmounts off-screen rows, so DOM is an incomplete view of state; selection silently drops when scrolled.
**Do this instead:** Keep all selection/sort/focus in instance `@state` keyed by `getRowId`; reconstruct focus with `scrollToIndex` + re-query after render (Pattern 1).

### Anti-Pattern 3: Cross-root or global validation message store

**What people do:** Render validation text in light DOM or a shared store and point `aria-describedby` across shadow boundaries.
**Why it's wrong:** Cross-root ARIA is unreliable at the Safari 16.4 floor, and a shared store reintroduces global state.
**Do this instead:** Render the message region inside the same shadow root as the control and derive it per-instance from `ElementInternals` (Pattern 2). Use a slot only for content override.

### Anti-Pattern 4: Leaking shared machinery into the public surface

**What people do:** Export the virtualization/validation/registry helpers from `index.ts` for convenience.
**Why it's wrong:** They immediately become part of the frozen 1.0 contract and can never change without a breaking release.
**Do this instead:** Keep them under `src/internal/`, never re-exported. Only the CEM/exports define the frozen surface (Pattern 4).

## Integration Points

### External / new dependencies

| Dependency | Integration Pattern | Notes |
|------------|---------------------|-------|
| `@lit-labs/virtualizer` | `virtualize` directive inside components' own shadow root, via internal controller | Labs/pre-1.0 — pin exact version; regular `dependency` (declares `lit` peer, no double-bundle); increases bundle → needs size gate |
| `@lit/context` | Provider element + `ContextConsumer` | Small, Lit-ecosystem; declares `lit` peer; adds one public element `<am-shortcuts>` |
| `@custom-elements-manifest/analyzer` (present) | `cem analyze` → baseline JSON → CI diff | Already wired via `build:manifest`; add baseline + diff step |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `components → internal` | Direct import (one-way) | `internal/` never re-exported; enforces the frozen-surface line |
| `<am-shortcuts> ↔ AmCommandPalette` | `@lit/context` (provide/consume) + registration disposers | Falls back to local `document` listener when no provider present |
| form control ↔ its message region | Same-shadow-root `aria-describedby` + `ElementInternals` | No global store; message derived per-instance |
| CI ↔ frozen surface | CEM diff vs `api/custom-elements.baseline.json` | Baseline change requires paired Changeset |

## Build Order Across the Six v1.0 Workstreams

The six workstreams (API cleanup, tests, bug fixes, perf, features, release) have hard ordering constraints. Two rules dominate: **tests must precede the breaking refactor they guard**, and **API-freeze must follow every change that touches the public surface** (cleanup + features).

```
(1) TEST COVERAGE (characterization)      ──┐
    20 untested components + form/focus/    │ guards the breaking work that follows
    listener-lifecycle gaps; add CI          │
    coverage gate + bundle-size gate         │
                                             ▼
(2) API CLEANUP (breaking normalization)  ── prop/event/default renames; refactor the
    4 oversized components (combobox 741,      600+ line components. Update tests in lockstep.
    select 718, date-picker 633, time 627)     MUST precede freeze.
                                             │
        ┌────────────────────────────────────┤
        ▼                                    ▼
(3) BUG / LEAK FIXES                    (4) PERF + (5) FEATURES  (can parallelize)
    toast setTimeout tracking,              • virtualization (needs size gate from #1)
    listener attach/detach gating,          • validation display (adds slot + aria surface)
    focus-restore guards, dialog            • keyboard registry (adds <am-shortcuts> element)
    animation cleanup                       These ADD public surface → must land before freeze.
        │                                    │
        └──────────────┬─────────────────────┘
                       ▼
(6a) API FREEZE  ── snapshot cleaned+feature-complete CEM to api/baseline.json;
     flip CI diff gate from report-only to enforcing
                       ▼
(6b) RELEASE  ── green pipeline: tests + coverage gate + a11y + bundle-size + CEM diff;
     Changeset version bump; tag + publish v1.0
```

**Explicit dependencies:**

- **Tests (1) before API cleanup (2).** Cleanup is intentionally breaking; characterization tests on the 20 untested components catch regressions during renames and the 600+ line refactors. Coverage gate and bundle-size gate should be *added* here (bundle gate especially, so it is in place before virtualization adds `@lit-labs/virtualizer`).
- **API cleanup (2) before API-freeze (6a).** The freeze can only snapshot a surface that has already been normalized. Running the CEM diff in **report-only** mode during (2)–(5) surfaces churn without blocking.
- **Features (5) before API-freeze (6a).** Validation display adds a `validationMessage` slot + `aria-describedby` to form controls; the keyboard registry adds a public `<am-shortcuts>` element and events. These are public-surface deltas, so they must be in before the baseline is frozen. **Virtualization is designed to add no public API** (internal controller) — if that holds, it is freeze-neutral and could even land just after.
- **Bug fixes (3) alongside/after cleanup, before freeze.** Fixes are mostly internal (timers, listener gating) and are guarded by the tests from (1); they do not gate the freeze but should be green before release.
- **Perf (4) and Features (5) can run in parallel** once (1) and (2) are done, since they touch largely disjoint components (data-grid/combobox vs form controls/command-palette). Both depend on the bundle-size gate existing.
- **API-freeze (6a) before release (6b).** The enforcing CEM diff is a release gate; the pipeline in (6b) runs tests + coverage + a11y + bundle-size + CEM diff green, then Changesets tags and publishes v1.0.

## Sources

- Existing codebase maps: `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`; `.planning/PROJECT.md`
- Read directly: `src/components/data-grid/data-grid.ts` (repeat()/`getRowId`/`Set<RowKey>` selection/`_focusedRowIndex`), `src/components/command-palette/command-palette.ts` (hardcoded Cmd+K, `document` keydown in connected/disconnected), `src/index.ts`, `package.json` (`cem analyze`, `@custom-elements-manifest/analyzer` present) — HIGH confidence
- [@lit-labs/virtualizer — npm](https://www.npmjs.com/package/@lit-labs/virtualizer) and [lit/packages/labs/virtualizer](https://github.com/lit/lit/tree/main/packages/labs/virtualizer); shadow-DOM caveat [lit/lit#3493](https://github.com/lit/lit/issues/3493) — HIGH confidence on directive/element split, MEDIUM on version pinning
- [Custom Elements Manifest analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) and CEM-diff tooling ([wc-toolkit changelog](https://wc-toolkit.com/adoption/changelog/)) — MEDIUM confidence on exact diff-tool choice (JSON is diffable with a small custom comparator regardless)

---
*Architecture research for: v1.0 hardening of a Lit/Shadow-DOM web component library*
*Researched: 2026-08-10*
