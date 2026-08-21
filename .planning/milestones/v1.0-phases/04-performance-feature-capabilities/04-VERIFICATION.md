---
phase: 04-performance-feature-capabilities
verified: 2026-08-18T23:00:31Z
status: passed
score: 7/7 requirements verified (5/5 roadmap success criteria)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  note: initial verification
freeze_notes:
  - "New public surface (setCustomError × 14 controls, am-shortcuts element + shortcutRegistryContext export) is captured in api/custom-elements.baseline.json and .changeset/ — ready for the Phase 6 enforcing surface-diff gate."
  - "Documented tradeoff (not a defect): am-select flattens slotted <am-option> content into windowed div rows above the 100-row virtualization threshold, so slotted icons/badges are not shown on 1000+ option lists. Below-threshold behavior and the slotted API are unchanged. Must be documented in Phase 5 and acknowledged before freeze so it is not treated as a post-1.0 bug."
---

# Phase 04: Performance & Feature Capabilities Verification Report

**Phase Goal:** Deliver the three load-bearing v1.0 capabilities — list virtualization, validation-message display, and a keyboard-shortcut registry — on the non-exported `src/internal/` boundary, so consumers gain the features while the frozen public surface stays small.
**Verified:** 2026-08-18T23:00:31Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

The phase goal is achieved. All three capability families are implemented in real code (not stubs), wired into the shipping components, backed by dedicated tests that pass, and correctly scoped to the internal boundary so the frozen public surface only grows by the two intended additions (`setCustomError`, `am-shortcuts`). `tsc --noEmit` exits 0.

### Requirements Coverage (7/7 MET)

| Requirement | Verdict | Evidence |
| ----------- | ------- | -------- |
| **PERF-02** — data-grid virtualization (1000+ rows), threshold-gated, a11y-correct, identity-keyed selection/sort/focus | ✅ MET | `src/components/data-grid/data-grid.ts:5,516` uses `virtualize()` directive; threshold `VIRTUALIZE_ROW_THRESHOLD=100` (`src/internal/helpers/virtualize-support.ts:65`); `aria-rowcount` from full `this.rows.length` (data-grid.ts:490), truthful `aria-rowindex` from absolute index (:530), `keyFunction`/`_rowKey` for identity-keyed selection (:99,518). No new public attribute (D-05). `test/components/data-grid.test.ts` + `test/browser/data-grid-virtual.test.ts` — 71 jsdom tests pass (with combobox/select). |
| **PERF-03** — combobox/select option-popup virtualization, `aria-activedescendant` scrolls into window, form-value integrity | ✅ MET | `combobox.ts:5,703-705` and `select.ts:4,724` virtualize above threshold; `aria-setsize` from full filtered total, `aria-posinset` per absolute index; stable index-based option ids `_optionId()` (combobox.ts:660, select.ts:728) surfaced via `aria-activedescendant`; `scrollVirtualizerToIndex` scrolls recycled targets into window (combobox.ts:677, select.ts:751). `test/browser/combobox-virtual.test.ts`, `test/browser/virtualize-smoke.test.ts`. |
| **PERF-04** — floating-ui `autoUpdate` gated to open transitions across all overlays | ✅ MET | Shared `FloatingPositionController` (`src/internal/controllers/floating-position.ts:95-114`) starts `autoUpdate` only on `start()` (open) and tears down on `stop()`/`hostDisconnected()`. Adopted by combobox, select, dropdown, popover, tooltip, date-picker. rich-select gates inline: `autoUpdate` started on `_open` true, torn down on false + `disconnectedCallback` (`rich-select.ts:301-308,290-294,373`). No raw ungated `autoUpdate` remains in components. `test/browser/floating-position.test.ts` (teardown-spy). |
| **FEAT-01** — auto-surface `ElementInternals.validationMessage` via same-shadow-root `aria-describedby`/`aria-invalid`, `:user-invalid` timing | ✅ MET | `ValidationController` (`src/internal/controllers/validation.ts`) resolves native `validationMessage` (:114-122) with D-01 touch timing (`markTouched`, :79). Wired into 14 form controls + `am-field`. Representative `am-input`: same-shadow-root error node `id=_errorId` with `role`/`aria-live` (input.ts:481-489) referenced by `aria-describedby` (:456) and `aria-invalid` (:455); `markTouched()` on blur/submit (:381,390). `am-field` D-02 hint↔error swap (field.ts:9,18-19). `test/browser/validation-aria.test.ts`, `test/browser/validation-timing.test.ts`. |
| **FEAT-02** — manual/server error API (`setCustomError`) with defined precedence | ✅ MET | Public `setCustomError(message: string): void` on all 14 form-associated controls (grep-confirmed count = 14, non-test). D-03 custom-wins precedence in `ValidationController.setCustomError`/`message`/`invalid` (validation.ts:73-76,100-112): non-empty custom overrides native and shows immediately; `''` clears and falls back to native. `test/components/validation-controller.test.ts` (25 assertions) passes. |
| **FEAT-03** — shortcut registry: scopes, `mod`/`opt` normalization, conflict detection, reserved blocklist (WCAG 2.1.4) | ✅ MET | `ShortcutRegistry` (`src/internal/controllers/shortcut-registry.ts`, 340 lines): no-throw `register()`→`RegisterResult` (:178-215), same-scope conflict keeps first (:194-196), `RESERVED_COMBOS` blocklist refused (:97-123,183-185), single-key opt-in via `allowSingleKey` (:188-190), platform `mod`/`opt` normalization (`_normalize`, :295-339), scope stacking (`resolve`, :222-241). No `eval`/`new Function`. `test/internal/shortcut-registry.test.ts` (63 assertions) passes. |
| **FEAT-04** — `am-shortcuts` provider (per-subtree via `@lit/context`); command-palette off hardcoded Cmd+K with graceful fallback | ✅ MET | `am-shortcuts` (`src/components/shortcuts/shortcuts.ts`) owns an explicit `ShortcutRegistry`, distributes via `ContextProvider` (:69-72), document `keydown` via `composedPath()[0]` (:135) with editable-target + IME suppression (:141), `TeardownScope` cleanup (:104). `am-command-palette` uses `ContextConsumer` and registers rebindable `mod+k` when a provider appears, else restores hardcoded Cmd/Ctrl+K fallback (command-palette.ts:77-81,268-293,295-305,331-336). Publicly exported from `src/index.ts:17` and `src/index.all.ts:15`. `test/browser/shortcuts-context.test.ts`. |

### Roadmap Success Criteria (5/5)

1. ✅ Grid + option-popup virtualization, a11y-correct, identity-keyed, form-value preserved → PERF-02 + PERF-03.
2. ✅ `autoUpdate` gated to open transitions across all overlays → PERF-04.
3. ✅ Auto-surfaced `validationMessage` + same-root ARIA + `setCustomError` precedence → FEAT-01 + FEAT-02.
4. ✅ Registry with scopes, normalization, conflict detection, reserved blocklist → FEAT-03.
5. ✅ `am-shortcuts` provider + command-palette D-09 refactor with graceful fallback → FEAT-04.

### Internal-Boundary / Freeze Discipline

| Check | Result |
| ----- | ------ |
| `ValidationController` / `ShortcutRegistry` / `FloatingPositionController` re-exported from `src/index*.ts` | ✅ NO (grep empty) — internal-only, no new registered tag |
| Only intended public additions surface | ✅ `setCustomError` (×14) + `am-shortcuts` element + `shortcutRegistryContext` export |
| New surface captured in CEM baseline | ✅ `api/custom-elements.baseline.json` contains `am-shortcuts` and `setCustomError` |
| Changesets for new public surface | ✅ `.changeset/add-am-shortcuts-registry.md`, `.changeset/add-setcustomerror-validation.md` |
| `ShortcutRegistry` mentions in baseline | ✅ JSDoc/description + `registry` getter return type on the public `am-shortcuts` element only (not a registered controller element) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Registry conflict/reserved/normalization + ValidationController precedence/timing | `vitest run … --project jsdom` | 2 files, 28 tests passed | ✅ PASS |
| data-grid / combobox / select virtualization behavior | `vitest run … --project jsdom` | 3 files, 71 tests passed | ✅ PASS |
| Whole-project typecheck | `tsc --noEmit` | exit 0 | ✅ PASS |

Browser-lane behavior-dependent truths (validation `:user-invalid` timing, autoUpdate teardown, shortcut `composedPath` retargeting/IME) have dedicated Chromium tests: `test/browser/validation-timing.test.ts`, `floating-position.test.ts`, `shortcuts-context.test.ts`, `validation-aria.test.ts`, `combobox-virtual.test.ts`, `data-grid-virtual.test.ts`. These exercise the runtime invariants that presence checks cannot see; per phase evidence the browser lane is 72/72 green. The browser lane requires Playwright/Chromium and was not re-executed inside this verification; its jsdom-tier counterparts were run and pass, and the source-level invariants were read and confirmed.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder markers in `src/internal/controllers/` or `src/components/shortcuts/`. No hollow returns or hardcoded-empty render data.

## Freeze-Relevant Risks (for Phase 6)

1. **Public-surface additions are correctly baselined.** `setCustomError` (×14) and `am-shortcuts` + `shortcutRegistryContext` are in the CEM baseline and have changesets — the Phase 6 enforcing surface-diff gate will see them as intentional. No action needed beyond keeping the baseline in sync at freeze.
2. **Documented `am-select` tradeoff (not a defect).** Above the 100-row virtualization threshold, `am-select` flattens slotted `<am-option>` content into windowed div rows, so custom slotted content (icons/badges) is not rendered on 1000+ option lists (`select.ts:503,537`). Below-threshold behavior and the slotted API are unchanged. This must be documented in Phase 5 (validation/usage docs + Storybook virtualization example) and explicitly acknowledged before freeze so it is not later mistaken for a post-1.0 regression.

## Gaps Summary

No gaps. All 7 requirements are delivered in code, wired into shipping components, backed by passing tests, and scoped to the internal boundary. The two intended public-surface additions are captured for the freeze gate. Phase goal achieved.

---

_Verified: 2026-08-18T23:00:31Z_
_Verifier: Claude (gsd-verifier)_
