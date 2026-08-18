---
phase: 02-api-cleanup-cem-baseline
verified: 2026-08-17T19:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 02: API Cleanup + CEM Baseline Verification Report

**Phase Goal:** The public surface is normalized dimension-by-dimension and captured in a committed, reviewable CEM baseline, so the v1.0 freeze can snapshot a consistent, diffable contract.
**Verified:** 2026-08-17T19:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Cross-component consistency audit exists as 7 dimension matrices (event, prop, boolean-naming, default, slot, part, `--am-*` token) across all 79 registered custom elements in `api/AUDIT.md` (SC1, API-01) | ✓ VERIFIED | `api/AUDIT.md` (40KB, git-tracked) has all 7 named matrices; provenance header records "Seven dimensions covered" + 66 files / 79 tagNames; event matrix has 79 element rows; 9 `\| Component`/matrix header rows. |
| 2 | Inconsistencies normalized with breaking renames, each landed with its own Changeset (SC2, API-02) | ✓ VERIFIED | dropdown/popover/context-menu emit `am-open`/`am-close`; select/tabs/data-grid emit `am-change`; old names (`am-show`,`am-hide`,`am-select-option`,`am-row-select`,`am-selection-change`,`am-tab-change`) fully removed from src AND test (D-04 hard rename). 3 wave changesets (overlay/selection/remaining) + 1 freeze changeset, one per wave (D-05). |
| 3 | The four 600+ line components (combobox, select, date-picker, time-picker) refactored onto sub-units/controllers in `src/internal/`, Phase 1 characterization tests still green (SC3, API-03) | ✓ VERIFIED | combobox→FloatingPositionController + ListboxNavController + `filterOptions`; select→FloatingPositionController; date-picker→FloatingPositionController + `date-utils`; time-picker→`time-utils`. Controllers self-register via `host.addController(this)`. jsdom characterization suite green (442 tests, orchestrator-run). `filterOptions` called 3× in combobox; `autoUpdate` kept ungated + `hostDisconnected` teardown preserved (D-10). |
| 4 | Slot names, `::part()` names, and `--am-*` tokens enumerated and marked FROZEN public surface in `api/AUDIT.md` (D-11); `--am-z-toast` documented via `@cssprop` (SC4, API-04) | ✓ VERIFIED | AUDIT.md "Frozen public surface (API-04, D-11) — **FROZEN**" section: 212 global + 54 per-component tokens, 21 slots, 76 parts; freeze decision `freeze-all-documented`. `--am-z-toast` tagged `@cssprop` on am-toast-region (toast.ts:302); used-token gap reads "None found". |
| 5 | `api/custom-elements.baseline.json` committed; report-only surface diff runs in CI and is CLEAN; CI surface-diff job NOT flipped to enforcing (SC5, API-05) | ✓ VERIFIED | `npm run diff:surface` → "No surface drift", DIFF_EXIT:0. cem-diff.mjs `process.exit(0)` unconditional (report-only, D-13); ci.yml `surface-diff` job runs `npm run diff:surface`, no `continue-on-error`, exit-0 is the report-only mechanism. Baseline git-tracked. |
| 6 | `src/internal/` is non-exported (absent from barrels + package.json exports) | ✓ VERIFIED | Not referenced in src/index.ts or src/index.all.ts; `package.json` exports contains no `internal`; `files` = `["dist","README.md"]` (api/ + internal/ unpublished, D-12/D-09). |
| 7 | CEM tagName SET unchanged (79 tagNames, none added/removed) | ✓ VERIFIED | `@customElement` unique tagNames = 79 (66 component files); baseline JSON = 79 tagNames; dist = 79 tagNames; diff:surface clean (set identity holds through all renames + refactors). |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `api/custom-elements.baseline.json` | Committed CEM baseline, 79 tagNames | ✓ VERIFIED | git-tracked, 648KB, parses, 79 tagNames, matches dist (clean diff). |
| `api/AUDIT.md` | 7 dimension matrices + rename mapping + FROZEN surface | ✓ VERIFIED | git-tracked, all sections present, generator-emitted FROZEN marker. |
| `scripts/cem-diff.mjs` | Zero-dep report-only comparator, exit 0 | ✓ VERIFIED | tagName-keyed, name-sorted, source-stripped; `process.exit(0)`; importable `diffManifests`. |
| `scripts/build-audit.mjs` | Reproducible matrix generator | ✓ VERIFIED | git-tracked, emits AUDIT.md matrices + FROZEN status. |
| `test/cem-diff.test.ts` | Comparator normalization unit test | ✓ VERIFIED | 5/5 pass (identical, added-event, removed-part, renamed-token, source-churn). |
| `src/internal/controllers/{floating-position,listbox-nav,option-filter}.ts` | Non-exported shared units | ✓ VERIFIED | Present, consumed by combobox/select/date-picker; none orphaned; not exported. |
| `src/internal/helpers/{date-utils,time-utils}.ts` | Pure helper modules | ✓ VERIFIED | date-utils consumed by date-picker; time-utils consumed by time-picker. |
| `.changeset/*.md` (3 rename + 1 freeze) | One changeset per wave (D-05) | ✓ VERIFIED | normalize-overlay-lifecycle-events, normalize-selection-events, normalize-remaining-outliers, freeze-slot-part-token-surface. |
| `.github/workflows/ci.yml` | Report-only surface-diff job | ✓ VERIFIED | `surface-diff` job builds manifest + runs diff:surface; report-only, not enforcing. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Surface diff clean, report-only | `node scripts/cem-diff.mjs api/... dist/...` | "No surface drift", DIFF_EXIT:0 | ✓ PASS |
| Comparator normalization | `npx vitest run --project jsdom test/cem-diff.test.ts` | 5 passed | ✓ PASS |
| tagName set identity | node count baseline/dist/`@customElement` | 79 == 79 == 79 | ✓ PASS |
| api/ + internal/ unpublished | node package.json files/exports check | api false, internal false | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| API-01 | 02-02 | Cross-component consistency audit (7 dimension matrices) | ✓ SATISFIED | api/AUDIT.md, 7 matrices × 79 elements |
| API-02 | 02-03/04/05 | Breaking normalization renames, each with a Changeset | ✓ SATISFIED | old names removed, 3 wave changesets |
| API-03 | 02-06/07/08 | Refactor the four 600+ line components into sub-units/controllers | ✓ SATISFIED | src/internal/ units consumed by all four |
| API-04 | 02-02/09 | Slot/part/`--am-*` enumerated + frozen surface | ✓ SATISFIED | FROZEN section, --am-z-toast documented |
| API-05 | 02-01/09 | Committed CEM baseline + report-only surface diff | ✓ SATISFIED | baseline committed, diff:surface clean, CI report-only |

All five requirement IDs from PLAN frontmatter (API-01..05) are accounted for and marked Complete in REQUIREMENTS.md. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| scripts/build-audit.mjs | 123-124 | "payload TBD" in comments | ℹ️ Info | Stale parenthetical annotations in the audit generator's `EVENT_OUTLIERS` detection set. The data-grid detail-payload decision they reference was resolved in Plan 04 (data-grid now emits a single `am-change`; old `am-row-select`/`am-selection-change` removed). Not incomplete deliverable work; not blocking. Recommend a follow-up comment cleanup. |

No stubs, no empty implementations, no hardcoded rendered data. The only source change in the refactor components beyond delegation is the comment-only `@cssprop` on toast.ts.

### Human Verification Required

None required for goal achievement. Note: the Chromium/Playwright browser lane was not executed in this verification pass (per instruction — verified by reading test files + relying on orchestrator's green jsdom run). Browser characterization files exist (test/browser/floating-position.test.ts, overlay-focus.test.ts, a11y.browser.test.ts, form-association.test.ts) and the behavior-preservation invariant is exercised by the green jsdom characterization suite (442 tests).

### Gaps Summary

No gaps. All five ROADMAP success criteria plus both additional confirmations (src/internal non-exported; CEM tagName SET unchanged at 79) are verified true against the codebase. The public surface is normalized dimension-by-dimension (7 matrices, breaking renames landed with per-wave changesets), the four 600+ line components delegate to non-exported `src/internal/` shared machinery with characterization tests green, the slot/part/token surface is marked FROZEN, and the committed baseline produces a clean report-only diff with the CI job intentionally left non-enforcing (deferred to Phase 6/SHIP-01). One informational stale-comment note in the audit generator, non-blocking.

---

_Verified: 2026-08-17T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
