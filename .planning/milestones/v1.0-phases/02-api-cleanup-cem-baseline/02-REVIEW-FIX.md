---
phase: 02-api-cleanup-cem-baseline
fixed_at: 2026-08-17T00:00:00Z
review_path: .planning/phases/02-api-cleanup-cem-baseline/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-08-17
**Source review:** .planning/phases/02-api-cleanup-cem-baseline/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — critical_warning scope)
- Fixed: 3
- Skipped: 0
- Info findings IN-01/IN-02: out of scope for critical_warning, not attempted.

**Frozen CEM surface:** No slots, parts, events, or tokens were added or removed.
`am-change` remains declared on `am-select`; `am-close` remains declared on
`am-context-menu`. All three fixes are behavior-correcting only.

**Verification:** `npx vitest run --project jsdom` ran in the **main checkout**
(after fast-forwarding the reviewfix branch) — the isolated worktree has no
`node_modules`, so the gate ran in the reproducible main tree. Result: 68 files /
442 tests passed, matching the pre-fix baseline exactly (no regressions, no newly
skipped tests).

## Fixed Issues

### WR-01: Combobox `Async` story binds the removed `async` attribute

**Files modified:** `src/stories/combobox.stories.ts`
**Commit:** 934b968
**Applied fix:** Changed the inert `async` boolean attribute to the renamed
`remote` attribute on the `<am-combobox>` in the `Async` story render. This is the
one live in-repo consumer of the attribute renamed by D-04; the `@am-search`
handler now fires and the async demo functions. Dev-only Storybook file (outside
the reviewed source list, but a direct consequence of the combobox
async→remote rename). No public surface change.

### WR-02: `am-option`'s internal `am-change` leaks past `am-select`

**Files modified:** `src/components/select/select.ts`
**Commit:** af24e62
**Applied fix:** Added `e.stopPropagation()` at the top of `_handleOptionSelect`
so the light-DOM `am-option` `am-change` (bubbles: true) is halted at the
`am-select` boundary instead of continuing into the consumer tree. Consumers now
observe only `am-select`'s documented native `input`/`change` events, eliminating
the spurious per-click `am-change` (including on reselect of the already-selected
option). Matches the reviewer's recommended fix verbatim. The `@fires` JSDoc /
CEM declaration for `am-change` on `am-select` is untouched, so the frozen CEM
surface is unchanged; the fix only corrects runtime event propagation. Covered by
the existing select event tests (suite green).

### WR-03: Context-menu closes without firing `am-close` on the document-contextmenu path

**Files modified:** `src/components/context-menu/context-menu.ts`
**Commit:** 6f3d912
**Applied fix:** Added the `am-close` dispatch (`bubbles: true, composed: true`)
to `_handleDocumentContext` so the "second context-menu opened elsewhere" close
path now emits `am-close`, matching the outside-click and Escape close paths.
Consumers tracking the canonical `am-open`/`am-close` pair (D-01) no longer
desync. `am-close` was already declared on `am-context-menu`, so no CEM surface
change. Covered by existing context-menu tests (suite green).

---

_Fixed: 2026-08-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
