---
phase: 08-bundle-size-deferral
plan: 03
subsystem: overlays
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, lit, overlays, rich-select, dropdown]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    plan: 01
    provides: "FloatingPositionController deferred end-to-end (async start() awaiting loadFloating(), module-receiving middleware getter, close-during-load guard) + shared lazy-load.ts loaders + per-overlay no-0,0-frame browser spec template"
provides:
  - "rich-select migrated off its static @floating-ui/dom import onto the shared FloatingPositionController with a module-sourced size (min-width) middleware; inline _startAutoUpdate/_updatePosition deleted; hidden-until-positioned reveal gate + prefetch-on-intent added"
  - "dropdown floating-ui import proven AND made fully type-only (import type) — dist dropdown chunk now free of any runtime @floating-ui/dom reference (mitigates T-08-08)"
  - "test/browser/overlay-no-zero-frame-rich-select.test.ts — per-overlay Pitfall F1 guard for rich-select (own file, parallel Wave-2 safe)"
affects: [tooltip, color-picker, combobox, select, data-grid]

# Actuals (#2632)
actuals:
  tokens: 3400
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second D-06 inline migration onto the shared controller: unlike color-picker, rich-select's former inline stack (offset(4)→flip()→shift({padding:8})→size) was byte-identical to the controller defaults, so the controller is its correct home — behavior-neutral migration"
    - "verbatimModuleSyntax erasure discipline: `import { type X }` (value-import syntax, all-type bindings) leaks a runtime side-effect `import \"pkg\"`; only `import type { X }` is fully erased"

key-files:
  created:
    - test/browser/overlay-no-zero-frame-rich-select.test.ts
  modified:
    - src/components/rich-select/rich-select.ts
    - src/components/dropdown/dropdown.ts

key-decisions:
  - "rich-select uses the controller's module-getter middleware form `(mod) => [mod.size({ apply(...) { minWidth = rects.reference.width } })]`, matching select's size width-matcher and building the middleware from the deferred-loaded module (no static floating-ui import)"
  - "Added a hidden-until-positioned reveal gate to rich-select (non-reflected @state _positioned + .positioned class + visibility toggle) mirroring popover — the async loader seam could otherwise flash the listbox at 0,0"
  - "dropdown's type-only import was NOT erased under verbatimModuleSyntax (`import { type Placement }` emitted a bare runtime `import \"@floating-ui/dom\"`); switched to `import type` — the D-07 remediation the plan authorized"

patterns-established:
  - "Every migrated overlay ships its own no-0,0-frame browser spec (own file) so parallel-wave plans never collide on a shared test file"

requirements-completed: [SIZE-01]

# Metrics
duration: 8min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 03: Rich-Select Controller Migration + Dropdown Type-Only Verification Summary

**rich-select moved off its inline `computePosition`+`autoUpdate` onto the shared deferred `FloatingPositionController` (its former stack was byte-identical to the controller defaults, so the migration is behavior-neutral) with a module-sourced min-width middleware, a hidden-until-positioned reveal gate, and prefetch-on-intent; dropdown was verified — and fixed — to be fully type-only, its dist chunk now free of any runtime floating-ui reference.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2
- **Files:** 3 (1 created, 2 modified)

## Accomplishments
- Migrated `rich-select` fully off its static `@floating-ui/dom` import onto the shared `FloatingPositionController`: anchored to `.trigger`, `bottom-start`, fixed strategy, 4px offset, plus a module-getter `size` middleware `(mod) => [mod.size({ apply({rects,elements}) { elements.floating.style.minWidth = ... } })]` that reproduces the former inline min-width matcher from the deferred-loaded module.
- Deleted the inline `_startAutoUpdate` (autoUpdate loop) and `_updatePosition` (computePosition call with the `offset(4)→flip()→shift({padding:8})→size` stack); the controller is now the single positioning path. Its base stack (`offset(4)→flip()→shift({padding:8})`) is byte-identical to the deleted inline stack, so positioning/min-width behavior is unchanged.
- Added a hidden-until-positioned reveal gate (D-02) — a non-reflected `@state _positioned` set true in the controller's `onPositioned`, a `.listbox.open.positioned` reveal rule, and `visibility:hidden` until first position — plus `prefetchFloating()` warmed on trigger `pointerenter`/`focus` (D-03). Reset on close so a re-open re-hides until repositioned.
- Verified `dropdown` positioning is supplied entirely by the deferred controller, then fixed its floating-ui import to be truly type-only (see Deviation 1) so the dropdown entry carries no runtime floating-ui.
- Created `test/browser/overlay-no-zero-frame-rich-select.test.ts` (own file, mirroring 08-01's popover spec) — polls frames across the async loader gap asserting the listbox is never visible-while-unpositioned, reveals at a non-(0,0) viewport-anchored rect below the trigger, and matches the trigger min-width.

## Task Commits

Each task was committed atomically:

1. **Task 1: rich-select — migrate inline positioning onto FloatingPositionController** — `2d81e8a` (feat)
2. **Task 2: dropdown — type-only floating-ui import (D-07)** — `44c8ba5` (fix)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified
- `src/components/rich-select/rich-select.ts` — dropped static floating-ui import; added `FloatingPositionController` field with module-getter `size` middleware + `onPositioned` reveal; deleted `_startAutoUpdate`/`_updatePosition` and the `_cleanupAutoUpdate` field; added `_positioned` reveal state, `.positioned` CSS gate with `visibility`, and `_handlePrefetch` on trigger intent.
- `src/components/dropdown/dropdown.ts` — `import { type Placement }` → `import type { Placement }` (full erasure under verbatimModuleSyntax).
- `test/browser/overlay-no-zero-frame-rich-select.test.ts` (new) — per-overlay Pitfall F1 no-0,0-frame guard for rich-select.

## Verification Evidence
- `npm run build` — green (tsc strict + vite + manifest + contract + tokens).
- `npx vitest run --project jsdom test/components/rich-select.test.ts test/components/dropdown.test.ts` — 24/24 pass (rich-select open/close, selection, min-width, grouping, search, validation; dropdown unchanged).
- `npx vitest run --project browser test/browser/overlay-no-zero-frame-rich-select.test.ts` — 1/1 pass (real Chromium; no 0,0 frame; min-width matches trigger).
- Full browser lane — 78/78 pass across 14 files (no regression from the dropdown change; ResizeObserver-loop console warnings are benign autoUpdate noise, pre-existing).
- `npm run diff:surface` — exit 0, no surface drift (frozen CEM intact).
- `node scripts/assert-no-bundled-lit.mjs` — exit 0, zero inlined-Lit markers.
- dist grep — `dist/chunks/rich-select-*.js` and `dist/chunks/dropdown-*.js` contain **zero** `@floating-ui/dom` references; floating-ui is reached only via `import("@floating-ui/dom")` in the shared `floating-position` chunk.

## Decisions Made
- **Module-getter `size` middleware** — matches select's width-matcher and sources floating-ui from the deferred module, so no static import survives.
- **Reveal gate mirrors popover** — the async loader seam makes a 0,0 flash possible for rich-select (it previously positioned synchronously); the hidden-until-positioned gate is the locked D-02 mitigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / T-08-08 mitigation] dropdown's type-only import was NOT erased — made it a true `import type`**
- **Found during:** Task 2
- **Issue:** Task 2's acceptance criterion requires the built dropdown chunk to contain NO runtime `@floating-ui/dom` import. The dist grep found `import"@floating-ui/dom";` (a bare side-effect import) in `dist/chunks/dropdown-*.js`. Root cause: the project sets `verbatimModuleSyntax: true`, under which `import { type Placement } from '@floating-ui/dom'` (value-import syntax whose only binding is a type) is emitted as a runtime side-effect `import "@floating-ui/dom"` rather than being erased. That statically pulls floating-ui into the dropdown entry's synchronous graph — exactly threat T-08-08.
- **Fix:** Changed the statement to `import type { Placement } from '@floating-ui/dom'`. Under verbatimModuleSyntax the entire `import type` statement is dropped at build.
- **Files modified:** src/components/dropdown/dropdown.ts
- **Verification:** rebuild → `dist/chunks/dropdown-*.js` now has zero `@floating-ui/dom` references; dropdown jsdom test passes; full browser lane 78/78 pass; `diff:surface` exit 0.
- **Committed in:** 44c8ba5
- **Note:** The plan's Task 2 explicitly authorized this remediation ("If any runtime floating-ui symbol is found, convert it to route through the controller/loader"); here the erasure fix was the correct route since dropdown uses no runtime floating-ui symbol, only the leaked side-effect import.

---

**Total deviations:** 1 (missing-critical erasure fix, authorized by Task 2's own remediation clause).
**Impact on plan:** No scope creep. The fix satisfies Task 2's acceptance criterion and mitigates T-08-08; without it dropdown would have kept a runtime floating-ui import in its entry.

## Known Stubs
None — no stub/placeholder patterns introduced. rich-select positions end-to-end through the deferred controller (verified in real Chromium); dropdown is proven type-only in dist.

## Threat Surface
No new security surface beyond the plan's `<threat_model>`. Both registered threats are actively mitigated: T-08-07 (rich-select behavior integrity — controller default stack proven byte-identical to the deleted inline stack; component test + real-browser positioning + min-width + surface-diff all green); T-08-08 (dropdown runtime floating-ui import — dist-graph grep now asserts floating-ui absent from the dropdown entry after the `import type` fix). No Threat Flags.

## Sibling-observation (out of scope, not fixed)
The same verbatimModuleSyntax erasure gap exists on `popover.ts` (`import { type Placement }` emits a runtime `import"@floating-ui/dom"` in the popover chunk). It is owned by 08-01, not this plan, so it was left untouched. Logged here for the phase verifier — a one-line `import type` change would close it.

## Next Phase Readiness
- After this plan, no component holds a static runtime floating-ui import except via the controller/loader for the migrated overlays (rich-select joins popover/select/dropdown on the controller). Tooltip/color-picker (08-02) and combobox/select `size` migration complete the set; the aggregate full-bundle/overlay brotli drop should be re-checked with `size-baseline.mjs --check` once all Wave-2 overlays land.

## Self-Check: PASSED

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
