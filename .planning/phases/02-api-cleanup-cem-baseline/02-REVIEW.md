---
phase: 02-api-cleanup-cem-baseline
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/components/combobox/combobox.ts
  - src/components/select/select.ts
  - src/components/date-picker/date-picker.ts
  - src/components/time-picker/time-picker.ts
  - src/components/data-grid/data-grid.ts
  - src/components/dropdown/dropdown.ts
  - src/components/popover/popover.ts
  - src/components/context-menu/context-menu.ts
  - src/components/tabs/tabs.ts
  - src/components/toast/toast.ts
  - src/internal/controllers/floating-position.ts
  - src/internal/controllers/listbox-nav.ts
  - src/internal/controllers/option-filter.ts
  - src/internal/helpers/date-utils.ts
  - src/internal/helpers/time-utils.ts
  - scripts/build-audit.mjs
  - scripts/cem-diff.mjs
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-17
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 02 did three things: (a) hard-renamed event/prop names across overlay,
selection, and tabs/combobox components; (b) extracted shared machinery into
non-exported `src/internal/` controllers and pure helpers; and (c) refactored the
big-4 (combobox/select/date-picker/time-picker) onto that machinery, claiming
behavior-preservation.

I diffed every extraction against its pre-refactor inline source. The machinery
extractions are **faithful, byte-for-byte transcriptions** — I found no
transcription errors, off-by-one drift, or clamp/wrap regressions in
`time-utils`, `date-utils`, `option-filter`, `ListboxNavController`, or
`FloatingPositionController`. The combobox keyboard-nav delegation preserves the
exact ArrowDown-opens / ArrowUp-doesn't / Enter-fallback / Tab / Escape semantics.
`autoUpdate` teardown lifecycle is correctly mirrored into `hostDisconnected`. Lit
`@state` observability is preserved through the controller `setIndex`/`setOpen`
callbacks. No source-side orphaned old event names (`am-show`, `am-hide`,
`am-select-option`, `am-row-select`, `am-selection-change`, `am-tab-change`)
remain, and test files were updated.

The defects that remain are **rename-completeness and event-hygiene issues**, not
correctness regressions in the extracted logic: one demo still binds a removed
attribute, and two selection/overlay event flows leak or drop events in ways the
rename made more consequential.

## Warnings

### WR-01: Combobox `Async` story binds the removed `async` attribute — demo is broken

**File:** `src/stories/combobox.stories.ts:40`
**Issue:** Phase 02 hard-renamed `am-combobox`'s `async` boolean to `remote`
(`combobox.ts:66`) with no alias (D-04). The `Async` story was not updated and
still renders `<am-combobox async ...>`. Because `async` is no longer a declared
reactive property, the attribute is inert: the component runs in default
client-side-filter mode with an empty `options` array, so the `@am-search`
handler never fires and the Storybook async demo shows a permanently empty,
non-functional combobox. This is the one live consumer of the renamed attribute in
the repo, and it slipped the rename sweep. (Confirmed via full-repo grep: this is
the only non-planning, non-changeset reference to the removed `async` attribute.)
**Fix:**
```html
<am-combobox remote label=${args.label} placeholder=${args.placeholder} size=${args.size}
  @am-search=${handleSearch} style="max-width: 320px;"></am-combobox>
```

### WR-02: `am-option`'s internal `am-change` leaks to consumers, colliding with the canonical value-change event

**File:** `src/components/select/select.ts:111-120`, `510-519`
**Issue:** `AmOption._handleClick` dispatches `am-change` with `bubbles: true`
(`composed: false`). `AmSelect` catches it via `_handleOptionSelect` (listener on
`this`), but that handler **never calls `e.stopPropagation()`** (the only
`stopPropagation` in the file is in `_handleClear`, line 612). Since `am-option`
is a light-DOM child of `am-select`, the event keeps bubbling past `am-select` to
the consumer's tree. Before this phase the leaked event was named
`am-select-option` — a clearly-internal name no consumer would bind. Phase 02
renamed it to `am-change`, which is now the library-wide canonical value-change
event (D-02, also emitted by `am-tabs` and `am-data-grid`). A consumer following
that convention (`amSelect.addEventListener('am-change', …)`) now receives the raw
per-option event with `detail.value`. Worse, `AmOption` fires on *every* click,
including reselecting the already-selected option, whereas `AmSelect` suppresses
its native `input`/`change` when the value is unchanged (`if (newValue !==
this.value)`, line 512) — so the leaked `am-change` produces spurious events with
no corresponding value change. `am-select`'s documented public events are native
`input`/`change`, so this `am-change` is an undocumented, inconsistent public
surface.
**Fix:** Stop the internal event at the boundary so only `am-select`'s documented
`input`/`change` reach consumers:
```ts
private _handleOptionSelect = (e: CustomEvent<{ value: string }>) => {
  e.stopPropagation();
  const newValue = e.detail.value;
  // ...unchanged
};
```

### WR-03: Context-menu closes without firing `am-close` on the document-contextmenu path

**File:** `src/components/context-menu/context-menu.ts:133-138`
**Issue:** Every other close path fires the renamed lifecycle event —
`_handleOutsideClick` (line 122) and `_handleKeydown`/Escape (line 129) both
dispatch `am-close`. But `_handleDocumentContext` (fired when a second
context-menu is triggered elsewhere) sets `this.open = false` silently and never
dispatches `am-close`. A consumer tracking open/close state via the
now-canonical `am-open`/`am-close` pair (D-01) will desync: they saw `am-open`,
then the menu closes with no matching `am-close`. This inconsistency predates the
rename but is squarely in a file this phase edited and is now more visible given
the deliberate `am-open`/`am-close` normalization.
**Fix:**
```ts
private _handleDocumentContext = (e: MouseEvent) => {
  if (!this.open) return;
  if (!e.composedPath().includes(this)) {
    this.open = false;
    this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
  }
};
```

## Info

### IN-01: `build-audit.mjs` rename table and outlier sets are now stale post-rename

**File:** `scripts/build-audit.mjs:119-131`, `225-293`
**Issue:** The hardcoded `EVENT_OUTLIERS`/`PROP_OUTLIERS` sets and the
`renameMapping()` table still enumerate `am-show`, `am-hide`,
`am-select-option`, `am-row-select`, `am-selection-change`, `am-tab-change`,
`am-combobox::async`, and `am-combobox::select` as live outliers marked
`PENDING-DECISION`. Those names no longer exist in source (the renames landed in
02-03/04/05). Re-running the generator now produces an `AUDIT.md` whose event/prop
"Outliers" columns correctly show `—`, but whose `renameMapping()` table still
prints the completed renames as pending — a misleading historical artifact.
`api/AUDIT.md` is unpublished internal tooling (D-12), so impact is low, but the
generator's static tables should be reconciled or explicitly labeled as a
historical record before the freeze.
**Fix:** Either drop the resolved rows from `EVENT_OUTLIERS`/`PROP_OUTLIERS`/
`renameMapping()`, or add a header line marking the rename table as a completed
audit trail rather than pending decisions.

### IN-02: `am-data-grid` selection event dropped its per-row detail — consumer migration note

**File:** `src/components/data-grid/data-grid.ts:245-249`
**Issue:** The consolidation of `am-row-select` (`{ row, index, id, selected, keys }`)
plus `am-selection-change` (`{ keys }`) down to a single `am-change` (`{ keys }`)
is intentional per the changeset, but it silently drops the per-row `selected`
boolean and `id` that former `am-row-select` consumers relied on to know *which*
row toggled and in which direction. This is a deliberate breaking change, not a
bug — flagged only to confirm the changeset migration guidance
(`.changeset/normalize-selection-events.md`) tells consumers to derive the delta
from the aggregate `keys` set. No code change required.
**Fix:** None — verify the changeset migration note is sufficient for downstream
consumers.

---

_Reviewed: 2026-08-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
