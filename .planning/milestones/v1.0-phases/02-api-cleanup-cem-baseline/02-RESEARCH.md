# Phase 2: API Cleanup + CEM Baseline - Research

**Researched:** 2026-08-13
**Domain:** Web Components public-API normalization; Lit 3 Reactive Controller refactoring; Custom Elements Manifest (CEM) baseline + surface-diff tooling
**Confidence:** HIGH (in-repo grounding is direct; the two external facts — Lit ReactiveController API and CEM schema — are verified against official docs)

## Summary

This phase is a **library-internal hardening pass**, not feature work. It touches five layers of the codebase in a specific order: (1) it reads the *documented public surface* — event names, props, booleans, defaults, slots, `::part()`s, and `--am-*` tokens — off all 66 registered components and tabulates them into dimension matrices (`api/AUDIT.md`); (2) it applies **hard, breaking renames** to the outliers those matrices find, one Changeset per normalization *wave* (D-05), with the old names removed outright (D-04); (3) it **refactors the four largest components** (combobox 741, select 718, date-picker 633, time-picker 627 lines) by lifting shared machinery into **Lit Reactive Controllers** under a new non-exported `src/internal/` tree (D-07/D-08/D-09) while the Phase 1 characterization suite stays green (D-10); (4) it enumerates and freezes the slot/part/token surface (D-11); and (5) it commits `api/custom-elements.baseline.json` and adds a **report-only** CEM surface-diff job to CI backed by a small custom JSON comparator (D-13).

The single most important structural insight: **two of this phase's goals pull the characterization suite in opposite directions, and the plan must keep them separate.** The refactor (API-03) is *behavior-preserving* — the existing tests must stay green untouched. The event renames (API-02) *intentionally change* the event-name strings the tests assert (`am-show`/`am-hide`/`am-select-option`/`am-row-select` are all asserted in `test/components/*.test.ts` today). Conflating "tests stay green" across both will either block a legitimate rename or hide a broken refactor. Renames and their test-assertion updates land together in the same wave; the refactor lands in separate, test-frozen commits.

**Primary recommendation:** Sequence the phase as: capture baseline → run audit → land rename waves (each = code + `@fires` JSDoc + test assertions + one Changeset + re-commit baseline) → extract controllers into `src/internal/` behavior-preservingly → enumerate/freeze token surface → wire the report-only CEM diff into CI. Extract exactly three shared controllers (floating-position, listbox-keyboard-nav, option-filter) plus per-component pure helpers; resist every leak/gating "fix" the seams expose (those are Phase 3/4).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canonical naming rules (API-01, API-02)**
- **D-01:** Overlay lifecycle events standardize on **`open` / `close`**. Rename `dropdown`, `popover`, `context-menu` from `am-show`/`am-hide` → `am-open`/`am-close` to match native `<dialog>` and the existing majority (dialog, drawer, command-palette, toast). One-way (published event-name contract).
- **D-02:** Selection events split by semantics. **Value-changing controls** (`select`, `data-grid` selection) emit **`am-change`**; **discrete pick actions** (`menu`, `list`, `tree-view`, `command-palette`) emit **`am-select`**. Concrete renames: `am-select-option` (select) → `am-change`; `data-grid` `am-row-select`/`am-selection-change` reconciled to the `am-change` value-change convention. One-way.
- **D-03:** **Full normalization.** Fix every outlier the matrices surface across events, props, boolean-naming, and defaults — not just the egregious cases. Rationale: pre-freeze is the only window. Reversible (policy).

**Migration & Changeset strategy (API-02)**
- **D-04:** **Hard rename, no backward-compat aliases.** Old prop/event names removed outright — no dual-firing, no deprecation window. Changesets document every break. One-way.
- **D-05:** **One Changeset per dimension wave** (e.g. one for "normalize overlay lifecycle events", one for "normalize selection events"), not per rename and not per component. Reversible.
- **D-06:** No MIGRATION.md this phase — rely on the aggregated Changeset changelog. Migration guide is Phase 5. Reversible.

**Big-4 refactor approach (API-03)**
- **D-07:** Decompose via **Lit Reactive Controllers** (`implements ReactiveController`, `hostConnected`/`hostDisconnected`). Plain helper modules only for genuinely pure logic. Costly-but-no-contract-change.
- **D-08:** **Targeted shared-machinery extraction** — floating-ui positioning, listbox keyboard navigation, option filtering — into controllers reused across the four (and other overlays). Leave component-specific logic inline. Reversible.
- **D-09:** Extracted machinery lives in the **non-exported `src/internal/` boundary** — off the frozen CEM/public surface, out of package `exports`. Phase 3/4 build on the same seam. Costly.
- **D-10 (constraint):** The refactor is **behavior-preserving**. The Phase 1 characterization suite (jsdom + Chromium) must stay green throughout and is the acceptance signal. Any leak/bug the refactor exposes is captured for Phase 3, not fixed here.

**Frozen-surface scope & audit/baseline mechanism (API-04, API-05)**
- **D-11:** Frozen public surface = **all documented `--am-*` tokens** (global semantic **and** every per-component `--am-{component}-*` `@cssprop`), plus every `@csspart` and `@slot` in the CEM. One-way.
- **D-12:** API-01 dimension matrices committed as **`api/AUDIT.md`** (human-reviewable markdown under `api/`, unpublished). Reversible.
- **D-13:** Surface-diff mechanism for the **report-only** CEM gate is a **small custom JSON comparator** script (diff `dist/custom-elements.json` vs `api/custom-elements.baseline.json`). Zero new deps. `@wc-toolkit/changelog` (SHIP-01) deferred to Phase 6. Reversible.
- **D-14:** CEM baseline captured at **phase start and re-committed after each approved normalization wave**. CI diff then flags only UNINTENDED drift beyond a wave's intended renames. Reversible.

### Claude's Discretion
- Exact per-component rename mapping the audit produces (D-01/D-02 set the vocabulary; matrices enumerate every outlier + target name).
- The precise `data-grid` selection event shape reconciled under `am-change` (single vs multi-select payload) — decide from the component's current API during the audit.
- Prop / boolean-naming / default-value outliers not yet enumerated — surfaced by the matrices, normalized under D-03.
- Controller decomposition granularity per component and how many shared controllers to carve (D-08 sets "targeted shared machinery").
- Whether any pure-logic extraction is a plain helper module vs a controller (D-07).

### Deferred Ideas (OUT OF SCOPE)
- Leak/lifecycle fixes — FIX-01→04 (toast timer, listener gating, focus `isConnected` guards, dialog animation cleanup) are **Phase 3**. Capture the seam, leave the fix.
- Virtualization / validation-message / shortcut-registry features and the `autoUpdate`-gating fix — **Phase 4**. Do NOT gate `autoUpdate` while extracting the floating-ui controller.
- New components or new registered custom elements — feature freeze at 66/67. Extracted machinery is non-registered and non-exported.
- Consumer-facing MIGRATION.md prose — **Phase 5**.
- Flipping the surface-diff gate to enforcing — **Phase 6** (SHIP-01). Stays report-only here.
- `@wc-toolkit/changelog` adoption — Phase 6. `@microsoft/api-extractor` `.d.ts` guard (TEST-V2-02) — v2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| API-01 | Cross-component consistency audit — dimension matrices per event, prop, boolean-naming, default, slot, part, `--am-*` token across all ~66 components | "Audit-Matrix Mechanism" section: drive matrices off `dist/custom-elements.json` (already produced by `npm run build:manifest`) cross-checked against `dispatchEvent` grep; emit `api/AUDIT.md`. Event/prop inventory below seeds it. |
| API-02 | Apply breaking normalization for inconsistencies (prop/event/default renames), each with a Changeset | "Rename Inventory" + "Changeset Wave Strategy" sections. D-01/D-02 vocabulary confirmed against live source (`new CustomEvent` grep). One Changeset per wave (D-05); renames also update `@fires` JSDoc + test assertions in the same wave. |
| API-03 | Refactor the four 600+ line components into maintainable sub-units/controllers | "Reactive Controller Extraction" section. Three shared controllers (floating-position, listbox-nav, option-filter) in `src/internal/`; time-picker needs a different (non-floating) split. Behavior-preserving per D-10; Phase 1 suite is the gate. |
| API-04 | Slot, `::part()`, `--am-*` tokens enumerated + frozen public surface | "Frozen Surface Enumeration" section. Aggregate `slots`/`cssParts`/`cssProperties` from CEM + global tokens from `src/tokens/`. |
| API-05 | Committed `api/custom-elements.baseline.json` + report-only surface diff during cleanup | "CEM Surface-Diff Comparator" + "CI Wiring" sections. Custom `scripts/cem-diff.mjs`, normalized comparison, non-failing CI job; baseline re-committed per wave (D-14). |
</phase_requirements>

## Architectural Responsibility Map

For this phase the "tiers" are library-internal layers, not runtime servers. Mapping each capability to the layer that owns it keeps rename churn, refactor churn, and tooling changes from bleeding into each other.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event/prop/boolean/default vocabulary | Public element surface (registered `am-*` components, `src/components/*`) | Release metadata (`.changeset/`) | API-01/02 — the public contract lives on the elements; every break is recorded as a Changeset. |
| Big-4 shared machinery | Non-exported internal (`src/internal/` controllers) | Public element surface (host components delegate) | API-03 — controllers own lifecycle but register no element, so the public surface is untouched (D-09). |
| Slot / part / token contract | Design-token & template layer (`src/tokens/*`, `@cssprop`/`@csspart`/`@slot` JSDoc) | Build tooling (CEM captures them) | API-04 — tokens/parts/slots are declared in tokens modules + JSDoc, surfaced by CEM. |
| Surface baseline + drift detection | Build/tooling layer (`scripts/`, `.github/workflows/ci.yml`, `api/`) | Public element surface (the thing being snapshotted) | API-05 — the baseline is a build artifact of `cem analyze`; the diff is a CI-layer concern. |
| Breaking-change record | Release metadata (`.changeset/`) | — | API-02 — Changesets are the durable old→new record this phase (MIGRATION.md is Phase 5). |

## Standard Stack

No new runtime or dev dependencies are introduced this phase (D-13 mandates zero new deps; the comparator is a plain Node script). Everything needed is already installed.

### Core (already present — verified against `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lit` | `^3.3.2` (peerDep) | `ReactiveController` interface + `host.addController()` for the Big-4 extraction | [VERIFIED: package.json:100-102] Lit's official composition primitive for shared cross-component behavior [CITED: lit.dev/docs/composition/controllers] |
| `@custom-elements-manifest/analyzer` (`cem`) | `^0.11.0` | Generates `dist/custom-elements.json` — the source of truth for the audit matrices and the baseline | [VERIFIED: package.json:81] Already wired as `npm run build:manifest` [VERIFIED: package.json:61] |
| `@floating-ui/dom` | `^1.7.6` | Positioning engine wrapped by the extracted floating controller (not reimplemented) | [VERIFIED: package.json:77] Already the positioning dependency across 9 overlay components |
| `@changesets/cli` | `^2.6.0` | One Changeset per normalization wave (D-05); the breaking-change record | [VERIFIED: package.json:80] Existing versioning tool |
| Node built-ins (`node:fs`, `JSON`) | Node 20 | The custom CEM JSON comparator (`scripts/cem-diff.mjs`) | [VERIFIED: D-13] Zero-dep report-only diff is trivial |

### Supporting (already present)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` + `@vitest/browser-playwright` | `^4.1.0` / `4.1.9` | The Phase 1 characterization suite — the behavior-preservation acceptance signal (D-10) | Every task commit (jsdom quick run) and every wave merge (full jsdom+browser suite) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `scripts/cem-diff.mjs` | `@wc-toolkit/changelog` | Explicitly deferred to Phase 6 (SHIP-01) per D-13 — a dep + config this phase doesn't need for report-only diffing. Do NOT adopt here. |
| Lit Reactive Controllers | Class mixins | Mixins couple to the inheritance chain and are harder to unit-test; controllers are the current Lit idiom for shared behavior and compose without touching the public surface (D-07). |
| `@microsoft/api-extractor` `.d.ts` guard | — | v2 (TEST-V2-02); CEM diff is the primary 1.0 surface guard. |

**Installation:** None. `npm ci` already provides everything.

**Version verification:** All versions above read directly from `package.json` this session [VERIFIED: package.json:76-102]. No registry lookups performed because no packages are added.

## Package Legitimacy Audit

**No external packages are installed this phase.** D-13 mandates zero new dependencies; the surface-diff comparator and audit-matrix generator are plain Node scripts under `scripts/`. The Package Legitimacy Gate is therefore N/A — there is nothing to verify against a registry.

- Packages removed due to `[SLOP]` verdict: none
- Packages flagged as suspicious `[SUS]`: none

## Architecture Patterns

### System Architecture Diagram

```
                          PHASE 2 DATA FLOW (build-order left→right)

  [src/components/*.ts]                          [src/tokens/*.css.ts]
   66 registered elements                         global --am-* tokens
   JSDoc @fires/@slot/@csspart/@cssprop                │
          │                                            │
          │  npm run build:manifest (cem analyze)      │
          ▼                                            ▼
   ┌─────────────────────────┐              ┌──────────────────────┐
   │ dist/custom-elements.json│─────────────▶│  AUDIT GENERATOR     │
   │ (schemaVersion 1.0.0)    │   +grep of   │  scripts (read CEM)  │
   │ modules[].declarations[] │  dispatchEvent│  emit dimension mtx  │
   └───────────┬──────────────┘              └──────────┬───────────┘
               │                                        ▼
               │                                 [ api/AUDIT.md ]  (D-12, unpublished)
               │                                        │
               │                        outliers ───────┘
               │                                        ▼
               │                          ┌──────────────────────────────┐
               │                          │ RENAME WAVES (D-01/02/03/04)  │
               │                          │ code + @fires JSDoc + tests   │
               │                          │ + 1 Changeset/wave (D-05)     │
               │                          └──────────────┬───────────────┘
               │                                         │ re-run cem
               ▼                                         ▼
   ┌───────────────────────────┐   capture/re-commit   ┌──────────────────────┐
   │ REFACTOR (API-03)         │   per approved wave   │ api/custom-elements. │
   │ src/internal/ controllers │  (D-14)               │ baseline.json        │
   │  · FloatingPosition       │◀──behavior-preserving─│                      │
   │  · ListboxNav             │   (Phase 1 suite green)└──────────┬───────────┘
   │  · OptionFilter           │                                   │
   └───────────────────────────┘                                   ▼
                                              ┌──────────────────────────────────┐
                                              │ CI job (.github/workflows/ci.yml) │
                                              │ build → scripts/cem-diff.mjs      │
                                              │ REPORT-ONLY (always exit 0) D-13  │
                                              └──────────────────────────────────┘
```

Component-to-file responsibilities are in the tables above; the diagram shows the data flow only.

### Recommended Project Structure (new/changed paths)
```
api/                                   # NEW committed dir, unpublished (keep out of package.json "files")
├── AUDIT.md                           # D-12 dimension matrices
└── custom-elements.baseline.json      # D-14 snapshot of dist/custom-elements.json, re-committed per wave
scripts/
├── cem-diff.mjs                       # NEW D-13 report-only JSON comparator
└── build-audit.mjs                    # NEW (optional) generate AUDIT.md tables from the manifest
src/internal/                          # NEW non-exported tree (D-09) — absent from index.ts, index.all.ts, exports
├── controllers/
│   ├── floating-position.ts           # wraps computePosition + autoUpdate lifecycle
│   ├── listbox-nav.ts                  # Arrow/Enter/Escape + highlightedIndex clamping
│   └── option-filter.ts               # client-side option filtering
└── (per-component pure helpers co-located as needed, e.g. date math, time parsing)
.github/workflows/ci.yml               # NEW report-only "surface-diff" job (non-failing)
.changeset/*.md                        # one per normalization wave (D-05)
```

### Pattern 1: Lit Reactive Controller (the Big-4 extraction unit)
**What:** An object implementing `ReactiveController` that hooks the host's update cycle and owns a slice of lifecycle. It registers no custom element, so it never appears on the CEM/public surface (D-09).
**When to use:** Shared, stateful, lifecycle-bound machinery reused across ≥2 components — floating positioning, listbox keyboard nav, option filtering (D-08). Use a *plain module* instead for pure, stateless logic (date math, time parsing) per D-07.
**Interface** `[CITED: lit.dev/docs/composition/controllers]` — four optional callbacks: `hostConnected()` (init listeners/observers on connect), `hostUpdate()` (before host `update()`/`render()`), `hostUpdated()` (after render — read DOM), `hostDisconnected()` (cleanup). A controller registers via `host.addController(this)` and can deregister via `host.removeController(this)`.

```typescript
// Source: lit.dev/docs/composition/controllers (interface verified 2026-08-13)
// src/internal/controllers/floating-position.ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { computePosition, autoUpdate, flip, shift, offset } from '@floating-ui/dom';

export class FloatingPositionController implements ReactiveController {
  private _cleanup: (() => void) | null = null;
  constructor(
    private host: ReactiveControllerHost & HTMLElement,
    private opts: { reference: () => HTMLElement | null; floating: () => HTMLElement | null; offset?: number },
  ) {
    host.addController(this); // registers with the host update cycle
  }
  start() {                                  // called by host when it opens
    const ref = this.opts.reference(), fl = this.opts.floating();
    if (!ref || !fl) return;
    // BEHAVIOR-PRESERVING: keep autoUpdate ungated — gating is PERF-04 / Phase 4.
    this._cleanup = autoUpdate(ref, fl, () => this._update(ref, fl));
  }
  private async _update(ref: HTMLElement, fl: HTMLElement) {
    const { x, y } = await computePosition(ref, fl, {
      placement: 'bottom-start',
      middleware: [offset(this.opts.offset ?? 4), flip(), shift({ padding: 8 })],
    });
    Object.assign(fl.style, { left: `${x}px`, top: `${y}px` });
  }
  stop() { this._cleanup?.(); this._cleanup = null; }
  hostDisconnected() { this.stop(); }        // mirror teardown on disconnect
}
```

Note: today each of the 9 overlay components duplicates this exact `autoUpdate(...) → computePosition(..., [offset, flip, shift])` shape [VERIFIED: grep src/components — dropdown.ts:124/131-134, combobox.ts:397/568-577, tooltip.ts:131/140-149, date-picker.ts:292/541-544, color-picker.ts:428-431, rich-select.ts:271/352-356, select.ts:463/476-485, popover.ts:173/190]. The controller replaces that duplication.

### Pattern 2: Rename wave = code + JSDoc + tests + one Changeset (atomic)
**What:** A single normalization dimension (e.g. "overlay lifecycle events") landed as one reviewable unit.
**When to use:** Every breaking rename (API-02).
**Each wave touches, together:** (a) the `new CustomEvent('old', …)` string in the component; (b) the `@fires old` JSDoc tag; (c) every `oneEvent(el, 'old')` / `addEventListener('old')` in `test/components/*.test.ts`; (d) any `.stories.ts` reference; (e) one `.changeset/*.md` describing the break (D-05); (f) re-capture `api/custom-elements.baseline.json` (D-14). Because D-04 is a hard rename, there is no alias — the old string must not survive anywhere.

### Anti-Patterns to Avoid
- **Gating `autoUpdate` while extracting the floating controller** — that is PERF-04 (Phase 4). Behavior-preserving means the extracted controller keeps the *ungated* `autoUpdate` exactly as today.
- **"Fixing" the un-clamped `_highlightedIndex` or the ungated document listeners while in the file** — those are FIX-02 (Phase 3). Phase 1 already recorded that raw `_highlightedIndex` is un-clamped on option replace; preserve it.
- **Adding `src/internal/` to `src/index.ts`, `src/index.all.ts`, or `package.json` "exports"** — breaks D-09; the machinery must stay non-exported and off the CEM surface.
- **Treating the refactor and the renames under one "tests stay green" rule** — the refactor keeps tests untouched; the renames intentionally rewrite test assertions. Keep them in separate commits.
- **Diffing raw `custom-elements.json` without normalization** — CEM output carries source line/module references and unstable array ordering that produce false-positive drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Overlay positioning math | Custom `getBoundingClientRect` placement/flip logic | `@floating-ui/dom` (already used), wrapped in the controller | Edge cases (collision, flip, shift, scroll tracking) are exactly what floating-ui solves; the refactor relocates, never reimplements. |
| Reading the public surface for the audit | Hand-parsing `.ts` files or regexing JSDoc | `dist/custom-elements.json` from `cem analyze` (already wired) | CEM already extracts attributes, members, events, slots, cssParts, cssProperties per element — the audit's source of truth. |
| Cross-component shared lifecycle | Custom mixin / bespoke observer wiring | Lit `ReactiveController` + `host.addController()` | Official Lit composition primitive; unit-testable in isolation; registers no element (D-07). |
| Semantic version + changelog record | Hand-written CHANGELOG entries | Changesets (already used), one per wave (D-05) | Aggregates the breaking-change record Phase 5's MIGRATION.md builds on. |
| Report-only surface diff | A heavyweight schema-diff dependency | A ~100-line `scripts/cem-diff.mjs` (D-13) | Report-only diffing of two JSON trees is trivial; a dep is deferred to Phase 6's enforcing flip. This is the one place a small custom script IS the right call. |

**Key insight:** The only thing this phase *should* hand-roll is the CEM comparator (D-13) — everything else already exists and must be reused, not rebuilt.

## Rename Inventory (seeds `api/AUDIT.md`; the audit confirms/completes it)

Full live inventory of dispatched events [VERIFIED: grep `new CustomEvent` across src/components, 2026-08-13 — file:line and event string quoted verbatim below].

**Overlay lifecycle (D-01 → `am-open`/`am-close`):**
| Component | Current (verbatim) | Target | Test assertion to update |
|-----------|--------------------|--------|--------------------------|
| context-menu | `'am-show'` (context-menu.ts:115), `'am-hide'` (:122, :129) | `am-open`/`am-close` | context-menu.test.ts:34,38,45,51 |
| popover | `'am-show'` (popover.ts:159), `'am-hide'` (:164) | `am-open`/`am-close` | popover.test.ts:7,17,25,35 |
| dropdown | `'am-show'` (dropdown.ts:110), `'am-hide'` (:115) | `am-open`/`am-close` | dropdown.test.ts:7,17,25,35 |
| **already correct** | dialog `'am-open'`/`'am-close'` (dialog.ts:191/199), drawer (drawer.ts:206/214), command-palette `'am-close'` (:229), toast `'am-close'` (toast.ts:257), alert `'am-close'` (alert.ts:126) | — | — |

**Selection events (D-02):**
| Component | Current (verbatim) | Target | Notes |
|-----------|--------------------|--------|-------|
| select (value-changing) | `'am-select-option'` (select.ts:111) | `am-change` | test/select.test.ts:7,14,36 assert old name — update in same wave |
| data-grid (value-changing) | `'am-row-select'` (data-grid.ts:245), `'am-selection-change'` (:249) | reconcile under `am-change` | **Discretion:** single vs multi payload — decide from current API; data-grid.test.ts:91,95,97,164 assert both old names |
| command-palette (discrete pick) | `'am-select'` (:299) | keep `am-select` | already canonical |
| list (discrete pick) | `'am-select'` (list.ts:126) | keep `am-select` | already canonical (list.test.ts:22,32) |
| menu (discrete pick) | `'am-select'` (menu.ts:148) | keep `am-select` | already canonical |
| tree-view (discrete pick) | `'am-select'` (tree-view.ts:139) | keep `am-select` | node expand is separate `'am-toggle'` (:132) |

**Change/toggle family + other outliers (D-03 full normalization — audit decides targets):**
- `'am-tab-change'` (tabs.ts:376) vs `'am-change'` (pagination.ts:174) vs `'am-toggle'` (accordion.ts:117, tree-view.ts:132) — inconsistent change/toggle vocabulary.
- Clear family already consistent: `'am-clear'` (input.ts:282, textarea.ts:220, search-field.ts:209).
- Search: `'am-search'` (combobox.ts:415, search-field.ts:185).
- Others (likely fine, audit confirms): `'am-remove'` (badge.ts:104), `'am-resize'` (split-view.ts:142), `'am-complete'` (input-otp.ts:130,176), `'am-files-selected'`/`'am-file-remove'` (file-upload.ts:263/272), `'am-sort'` (data-grid.ts:227).

**Prop/boolean outliers to check (examples, not exhaustive):** combobox exposes a boolean prop `select` (combobox.ts:72) that semantically collides with the `<am-select>` component; combobox `async` (combobox.ts:63) is a reflected boolean — audit boolean-naming consistency. [VERIFIED: combobox.ts:63,72] The matrices (D-03) enumerate the rest.

> **Provenance caution:** event/prop names above are quoted verbatim from `new CustomEvent`/`@property` source lines surfaced by grep and (for combobox) a direct `Read`. `@fires` JSDoc may *undercount* actual dispatched events (e.g. combobox's JSDoc documents `input`/`change`/`am-search` only — combobox.ts:24-26 — but the component dispatches more). The audit must reconcile CEM `events` (JSDoc-derived) against the `dispatchEvent` grep, or matrices will miss events CEM never saw.

## Reactive Controller Extraction Plan (API-03)

Refactor targets [VERIFIED: CONCERNS.md:9]: combobox 741, select 718, date-picker 633, time-picker 627 lines. `src/internal/` does not exist yet [VERIFIED: `ls src/internal` — no such dir]; no `ReactiveController` exists in the codebase today [VERIFIED: grep — no matches]. This is greenfield for the boundary.

**Three shared controllers (D-08), consumed by the components that already duplicate the logic:**
1. **`FloatingPositionController`** — wraps `computePosition` + `autoUpdate` teardown. Consumers: combobox, select, date-picker (the Big-4 subset) + reusable by dropdown, popover, tooltip, context-menu, rich-select, color-picker. **Behavior-preserving: keep `autoUpdate` ungated (PERF-04/Phase 4).** Mirror existing `disconnectedCallback` teardown (e.g. combobox.ts:365-370) in `hostDisconnected`.
2. **`ListboxNavController`** — Arrow/Enter/Escape handling + `_highlightedIndex` movement/clamping. Consumers: combobox (combobox.ts:442-479 `_handleKeydown`), select, rich-select. **Preserve the current clamp behavior including the known un-clamp-on-replace (FIX-02/Phase 3).**
3. **`OptionFilterController`** (or a pure helper per D-07) — client-side `options.filter(o => o.toLowerCase().includes(value.toLowerCase()))` (combobox.ts:443-445), async gating. Consumers: combobox, select.

**Per-component pure helpers (plain modules, D-07):**
- date-picker: calendar-grid generation + date math (pure) → module; positioning via controller #1.
- **time-picker: does NOT use `@floating-ui/dom`** [VERIFIED: grep floating-ui imports — time-picker absent from all matches]. Its 627 lines are time-list generation / value parsing / keyboard nav, not positioning. Extract a pure time-list/parse helper and (if it has a listbox) reuse controller #2. Do not force the floating controller onto it.

**Acceptance (D-10):** after each extraction, `npx vitest run --project jsdom` and the browser lane stay green with **zero test edits** (unlike renames). The characterization suite exercises components through their public API via `test/helpers.ts` fixtures, so relocating internals must be invisible to it.

## CEM Surface-Diff Comparator (API-05, D-13)

**Source of truth:** `npm run build:manifest` runs `cem analyze` → `dist/custom-elements.json` [VERIFIED: package.json:61, custom-elements-manifest.config.js:1-6 — `globs:['src/**/*.ts']`, `outdir:'dist'`, `litelement:true`]. The manifest is schemaVersion `1.0.0` with top-level `modules[]`; each custom-element declaration carries `tagName`, `attributes`, `members` (filter `kind:'field'`), `events`, `slots`, `cssParts`, `cssProperties`, `superclass` [CITED: custom-elements-manifest.open-wc.org].

**What the comparator must compare** (baseline `api/custom-elements.baseline.json` vs freshly built `dist/custom-elements.json`), keyed by `tagName` (never array index):
- Set of `tagName`s (added / removed elements — must stay 66; extracted controllers add none).
- Per element: `attributes` (name+default), public `members` where `kind==='field'` and `privacy!=='private'`, `events` (name), `slots` (name), `cssParts` (name), `cssProperties` (name — the `--am-*` freeze surface, API-04).

**Normalization (prevents false-positive drift):**
- Index declarations by `tagName`, not by module/array position (CEM ordering is not stable across builds).
- Sort every compared array by `name` before diffing.
- Strip volatile fields: `source` (module path + line references), and optionally `description`/`summary` (prose churn is not a surface break).
- Compare only the surface fields listed above; ignore internal `members` and methods unless a method is intentionally public API.

**Report-only behavior (D-13/D-14):** print added/removed/changed entries per element; **always `process.exit(0)` this phase.** Phase 6 (SHIP-01) flips it to exit non-zero. Because the baseline is re-committed after each approved wave (D-14), the diff surfaces only *unintended* drift beyond that wave's intended renames.

**Recommended: a unit test for the comparator itself** (`test/cem-diff.test.ts`) — feed it two hand-built manifest fixtures (identical, added-event, removed-part, renamed-token) and assert the diff output. The comparator is new load-bearing code; test its normalization.

## CI Wiring (API-05)

Current `.github/workflows/ci.yml` has three jobs — `verify` (typecheck + jsdom coverage + build, Node 20), `browser` (Chromium lane), `size` (Node 22) [VERIFIED: ci.yml:13-71]. Add a **new report-only job**:

```yaml
  surface-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - name: Build manifest
        run: npm run build:manifest      # emits dist/custom-elements.json
      - name: Surface diff (report-only)
        run: node scripts/cem-diff.mjs api/custom-elements.baseline.json dist/custom-elements.json
        # script always exits 0 this phase (D-13); Phase 6 flips to enforcing.
```

Keep `permissions: contents: read` (the workflow-level least-privilege block, ci.yml:10-11). No `continue-on-error` needed if the script itself exits 0 — but do not rely on `continue-on-error` as the only guard, since Phase 6 will make the script exit non-zero.

## Frozen Surface Enumeration (API-04, D-11)

Frozen surface = **all** documented `--am-*` tokens (global semantic + every per-component `--am-{component}-*` `@cssprop`) + every `@csspart` + every `@slot` in the CEM.
- **Tokens (global):** aggregate from `src/tokens/primitives.css.ts`, `semantic.css.ts`, `dark.css.ts` [VERIFIED: STRUCTURE.md:71-79]. Categories: `--am-color-*`, `--am-space-*`/`--am-spacing-*`, `--am-radius-*`, `--am-weight-*`, `--am-size-*`, `--am-duration-*`, `--am-ease-*`, `--am-border*`, `--am-surface`, `--am-text`, `--am-border` (component styles reference these, e.g. combobox.ts:106-114).
- **Tokens (per-component), parts, slots:** aggregate `cssProperties`, `cssParts`, `slots` across all `modules[].declarations[]` in `dist/custom-elements.json`. This is the same manifest the audit reads — a single pass can emit both the audit matrices and the frozen-surface enumeration into `api/AUDIT.md`.
- **Gap to flag:** CEM captures a token/part/slot only if JSDoc documents it (`@cssprop`/`@csspart`/`@slot`). Undocumented-but-used tokens (referenced in `css` but never tagged) will be invisible to the freeze. The enumeration should note this class and the audit may add missing tags before freeze.

## Common Pitfalls

### Pitfall 1: Renaming an event silently breaks its characterization test
**What goes wrong:** A rename lands in the component but `oneEvent(el, 'am-show')` in the test still binds the old name → red CI, or worse, the assertion is loosened and coverage of the event is lost.
**Why it happens:** Event name is a discrete string duplicated across component, `@fires` JSDoc, test, and story.
**How to avoid:** Treat each wave as atomic (Pattern 2). Grep the old string repo-wide after the rename; zero hits is the done condition (D-04 hard rename).
**Warning signs:** Any surviving `am-show`/`am-hide`/`am-select-option`/`am-row-select`/`am-selection-change` after its wave.

### Pitfall 2: Refactor accidentally changes behavior the suite doesn't cover
**What goes wrong:** Extracting the listener/positioning logic subtly reorders attach/detach or gates `autoUpdate`, changing runtime behavior the jsdom suite can't see.
**Why it happens:** The seams are exactly where the Phase 3/4 fixes belong; it's tempting to "improve" while moving.
**How to avoid:** Relocate byte-for-byte; run the **browser** lane too (jsdom can't prove positioning/focus). Capture any exposed leak as a Phase 3/4 note, do not fix.
**Warning signs:** A diff that changes control flow (added `if (open)` guards, moved `autoUpdate` calls) rather than pure relocation.

### Pitfall 3: CEM diff false positives from unstable output
**What goes wrong:** Report-only diff is noisy (source line numbers, array reorderings) and reviewers learn to ignore it.
**Why it happens:** `custom-elements.json` embeds `source` references and non-deterministic ordering.
**How to avoid:** Normalize before diff (key by tagName, sort by name, strip `source`) as specified above.
**Warning signs:** Diff entries that are pure reordering or line-number churn.

### Pitfall 4: `src/internal/` leaks onto the public surface
**What goes wrong:** A controller file gets exported from a barrel or picked up by `exports`, appearing in the frozen CEM/types.
**Why it happens:** Habit of exporting new modules.
**How to avoid:** Never add `src/internal/` to `src/index.ts`, `src/index.all.ts`, or `package.json` "exports" [VERIFIED: package.json:19-47 current exports have no internal path]. Confirm the CEM `tagName` set stays at 66 after each wave (controllers register no element).
**Warning signs:** New `tagName`, new deep `exports` entry, or `src/internal/` appearing in `dist/index.all.d.ts`.

### Pitfall 5: time-picker forced into the floating-ui controller
**What goes wrong:** Assuming all four Big-4 share the floating machinery; time-picker doesn't use floating-ui at all.
**How to avoid:** [VERIFIED: grep] time-picker has no `@floating-ui/dom` import; refactor it via a pure time-list/parse helper, not the positioning controller.

## Runtime State Inventory

This phase is a rename/refactor phase, so runtime state beyond source files was checked explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — this is a stateless client component library; no datastore keys reference event/prop names (INTEGRATIONS.md: "No external APIs", "Not applicable — UI component library"). | None |
| Live service config | None — no external service holds the event/prop vocabulary. Consumers' listener bindings live in *their* apps, not this repo; that is exactly why D-04 renames are one-way and recorded as Changesets. | Changeset per wave (already required by D-05) |
| OS-registered state | None — no OS-level registration embeds these names. | None |
| Secrets/env vars | None — "No env vars required" (INTEGRATIONS.md:75); only `.npmrc` registry config, unaffected. | None |
| Build artifacts | `dist/custom-elements.json` is regenerated by `build:manifest`; `api/custom-elements.baseline.json` is a *new committed* snapshot that must be re-captured after each wave (D-14) or the diff misreports. `dist/` is generated, not committed except at release. | Re-commit baseline per wave (D-14) |

**The canonical question — after every repo file is updated, what still holds the old event/prop strings?** Answer: only `test/components/*.test.ts` assertions and `src/**/*.stories.ts` references (in-repo, updated within the same wave) and downstream *consumer* code (out-of-repo, addressed by the Changeset record + Phase 5 MIGRATION.md). Nothing else caches the vocabulary.

## Code Examples

### Consuming the extracted controller in a host component (behavior-preserving)
```typescript
// src/components/dropdown/dropdown.ts (illustrative — relocation only, no behavior change)
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';

export class AmDropdown extends LitElement {
  private _floating = new FloatingPositionController(this, {
    reference: () => this.shadowRoot?.querySelector('.trigger') ?? null,
    floating: () => this._panel,
    offset: this.offset,
  });

  protected updated(changed: PropertyValues) {
    if (changed.has('open')) {
      this.open ? this._floating.start() : this._floating.stop();  // same gating as today
    }
  }
  // hostDisconnected() in the controller mirrors the old disconnectedCallback teardown
}
```

### Report-only comparator skeleton
```javascript
// scripts/cem-diff.mjs  (D-13 — zero deps, always exit 0 this phase)
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const [, , baselinePath, currentPath] = process.argv;

const index = (m) => {
  const out = {};
  for (const mod of m.modules ?? [])
    for (const d of mod.declarations ?? [])
      if (d.tagName) out[d.tagName] = pickSurface(d);
  return out;
};
const names = (arr) => (arr ?? []).map((x) => x.name).sort();
const pickSurface = (d) => ({
  attributes: names(d.attributes),
  fields: (d.members ?? []).filter((x) => x.kind === 'field' && x.privacy !== 'private').map((x) => x.name).sort(),
  events: names(d.events),
  slots: names(d.slots),
  cssParts: names(d.cssParts),
  cssProperties: names(d.cssProperties),   // the --am-* freeze surface
});

const base = index(load(baselinePath));
const cur = index(load(currentPath));
// ... diff tagName sets + per-element surface arrays, print a human report ...
process.exit(0);   // REPORT-ONLY (Phase 6 flips this)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class mixins for shared WC behavior | Lit `ReactiveController` + `host.addController()` | Lit 2 (2021), current in Lit 3 | Testable, composable, element-free machinery — the basis for D-07/D-08 and the `src/internal/` boundary |
| Ad-hoc `.d.ts`/README surface docs | Custom Elements Manifest (`custom-elements.json`, schemaVersion 1.0.0) | CEM 1.0 standard, analyzer stable | Machine-readable surface enabling the audit + baseline + diff (API-01/04/05) |
| Per-rename changelog entries | Changesets, aggregated | Established in repo | One Changeset per wave (D-05) rolls up into Phase 5's MIGRATION.md |

**Deprecated/outdated:** none relevant — the stack is current and already in use.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `data-grid` selection reconciles cleanly to a single `am-change` shape | Rename Inventory | Payload design (single vs multi) may need a `detail` shape decision; explicitly Claude's Discretion (D-02) — resolve during the audit from the live component API, not assumed. |
| A2 | Per-component `@cssprop`/`@csspart`/`@slot` JSDoc coverage is complete enough for CEM to enumerate the full frozen surface | Frozen Surface Enumeration | Undocumented-but-used tokens/parts are invisible to CEM and would be frozen incompletely; audit must add missing JSDoc tags before freeze (flagged as a gap). |
| A3 | The exact controller boundary (which logic is controller vs pure helper) matches the real code shape | Reactive Controller Extraction | Over/under-abstraction risk; D-08 sets "targeted"; granularity is Claude's Discretion — let the green tests and real duplication decide. |
| A4 | `cem analyze` emits stable `tagName`/`members` keys suitable for keyed diffing after normalization | CEM Comparator | If CEM output shape differs from the documented schema in edge cases, the comparator's field-picking needs adjustment — mitigated by the recommended comparator unit test. |

## Open Questions

1. **`data-grid` `am-change` payload shape (single vs multi-select).**
   - What we know: today it fires both `am-row-select` (per-row) and `am-selection-change` (aggregate keys) (data-grid.ts:245/249).
   - What's unclear: whether `am-change` carries the full selection set, the delta, or both.
   - Recommendation: decide from the component's current consumers/tests during the audit (explicit Discretion in D-02); document the chosen `detail` shape in the wave's Changeset.

2. **Whether the change/toggle family (`am-tab-change`, `am-toggle`, `am-change`) collapses under D-03.**
   - What we know: three different names for "something changed" (tabs, accordion/tree-view, pagination).
   - What's unclear: whether tabs → `am-change` and accordion stays `am-toggle` (open/closed is a distinct semantic).
   - Recommendation: the audit matrix decides; likely tabs/pagination → `am-change` (value-changing), accordion/tree-view keep `am-toggle` (expand state) — but confirm against native analogues.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `cem` (`@custom-elements-manifest/analyzer`) | baseline + audit (API-01/05) | ✓ | ^0.11.0 | — |
| Node 20 | comparator script + CI | ✓ | 20 (CI) | — |
| Vitest + Playwright/Chromium | behavior-preservation gate (D-10) | ✓ | ^4.1.0 / 1.62.1 | jsdom-only if browser unavailable (weaker signal) |
| `@floating-ui/dom` | floating controller | ✓ | ^1.7.6 | — |
| Changesets | wave records (D-05) | ✓ | ^2.6.0 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** browser lane needs `npx playwright install chromium` in CI (already done in the `browser` job, ci.yml:47-48); reuse for local full-suite runs.

## Validation Architecture

Nyquist validation is enabled for this phase. Each ROADMAP success criterion maps to an automatable check.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.0` (two projects: `jsdom`, `browser`/Playwright-Chromium) [VERIFIED: package.json:67-71,86,93,98] |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --project jsdom` |
| Full suite command | `npx vitest run` (both projects; browser needs `npx playwright install chromium`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| API-01 | `api/AUDIT.md` exists with per-dimension matrices | existence/structure | `test -f api/AUDIT.md && grep -q '\| Component' api/AUDIT.md` (or a Vitest fs check) | ❌ Wave 0 (`api/AUDIT.md` new) |
| API-02 | Each normalization wave has exactly one Changeset; no old event string survives | integration + grep | `npx vitest run --project jsdom` (renamed assertions green) + `! grep -rn "am-show\|am-hide\|am-select-option\|am-row-select\|am-selection-change" src test` | ✅ (existing component tests, updated per wave) |
| API-03 | Big-4 refactor is behavior-preserving | characterization (unchanged) | `npx vitest run` (jsdom + browser) green with zero test edits | ✅ (Phase 1 suite) |
| API-04 | Slot/part/`--am-*` token surface enumerated | existence/structure | frozen-surface section present in `api/AUDIT.md`; optional test asserting CEM `cssProperties`/`cssParts`/`slots` non-empty per element | ❌ Wave 0 |
| API-05 | Baseline committed + report-only CI diff runs | tooling + CI | `test -f api/custom-elements.baseline.json` + `node scripts/cem-diff.mjs …` exits 0 + comparator unit test | ❌ Wave 0 (`scripts/cem-diff.mjs`, `test/cem-diff.test.ts`, baseline, CI job) |

### Sampling Rate
- **Per task commit:** `npx vitest run --project jsdom` (fast behavior-preservation signal for refactor; renamed-assertion signal for renames).
- **Per wave merge:** full `npx vitest run` (jsdom + browser) + `node scripts/cem-diff.mjs …` (report) + re-commit `api/custom-elements.baseline.json` (D-14).
- **Phase gate:** full suite green + all four CI jobs green + surface-diff job present and report-only, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `api/` directory + `api/custom-elements.baseline.json` (initial snapshot of `dist/custom-elements.json`) — covers API-05
- [ ] `api/AUDIT.md` (dimension matrices + frozen-surface enumeration) — covers API-01/API-04
- [ ] `scripts/cem-diff.mjs` (normalized report-only comparator) — covers API-05
- [ ] `test/cem-diff.test.ts` (comparator normalization unit test) — de-risks the one piece of new load-bearing logic
- [ ] `scripts/build-audit.mjs` (optional matrix generator from the manifest) — supports API-01
- [ ] `src/internal/` tree — refactor target (API-03); no test framework change needed (Phase 1 suite covers behavior)
- [ ] `.github/workflows/ci.yml` new `surface-diff` job — covers API-05
- [ ] Keep `api/` out of `package.json` "files" so it stays unpublished (D-12)

*Framework install: none — Vitest + Playwright already present; `npx playwright install chromium` for the browser lane (already in CI).*

## Project Constraints (from CLAUDE.md)

- Lit 3 + Web Components, Shadow DOM, **ESM-only** — no global CSS, no CommonJS. Controllers are ESM modules; comparator is an `.mjs` Node script.
- **Lit stays a peer dependency** (`^3.3.2`) — must not bundle it; controllers `import type { ReactiveController } from 'lit'` (type + runtime `addController` provided by the host's Lit).
- **`--am-*` tokens only** — no hardcoded colors; the frozen token surface (API-04) enforces this at freeze.
- **Lit-safe templating only** — no `innerHTML`/`eval`; keep property→event, no-global-state model. The refactor must not introduce module-level singletons (controllers are per-host instances).
- **TypeScript strict** (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) — extracted controllers must type-clean; `npx tsc --noEmit` is a gate (ci.yml:26-27).
- **Safari 16.4 floor / ElementInternals not polyfillable** — document, don't work around; unaffected by this phase (no new form machinery).
- GSD workflow enforcement: file edits go through the GSD execute path.

## Sources

### Primary (HIGH confidence)
- `lit.dev/docs/composition/controllers` — `ReactiveController` interface (`hostConnected`/`hostUpdate`/`hostUpdated`/`hostDisconnected`), `host.addController()`/`removeController()` [verified 2026-08-13]
- `custom-elements-manifest.open-wc.org` — manifest structure (`schemaVersion`, `modules[]`, declaration `tagName`/`attributes`/`members`/`events`/`slots`/`cssParts`/`cssProperties`) [verified 2026-08-13]
- In-repo, read this session: `package.json`, `custom-elements-manifest.config.js`, `.github/workflows/ci.yml`, `src/components/combobox/combobox.ts`, `.planning/codebase/{CONCERNS,CONVENTIONS,STRUCTURE,INTEGRATIONS}.md`, CONTEXT/REQUIREMENTS/ROADMAP/PROJECT/STATE
- Grep evidence (verbatim source lines): `new CustomEvent` across `src/components`; `@floating-ui/dom` usage; `am-show`/`am-hide`/`am-select-option`/`am-row-select`/`am-selection-change` in `test/components`; `ReactiveController`/`src/internal` (no matches)

### Secondary (MEDIUM confidence)
- Rename target *decisions* (which family collapses to what) — grounded in D-01/D-02 but the exhaustive per-component mapping is produced by the audit task, not this research.

### Tertiary (LOW confidence)
- None load-bearing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed and read from `package.json`; no new packages.
- Architecture / controllers: HIGH — Lit interface verified against official docs; extraction targets grounded in direct source reads + grep of real duplication.
- Rename inventory: HIGH for the *current* names (verbatim from source), MEDIUM for *target* mapping completeness (the audit finalizes it per D-03).
- CEM comparator: HIGH on schema shape (verified) and approach; the comparator is new code, de-risked via a recommended unit test.
- Pitfalls: HIGH — each is anchored to a specific file:line or a Phase 1/3/4 boundary.

**Research date:** 2026-08-13
**Valid until:** 2026-09-12 (stable stack; ~30 days). Re-verify if Lit or `@custom-elements-manifest/analyzer` majors change.
