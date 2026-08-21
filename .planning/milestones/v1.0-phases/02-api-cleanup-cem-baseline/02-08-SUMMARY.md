---
phase: 02-api-cleanup-cem-baseline
plan: 08
subsystem: time-picker / internal helpers boundary
tags: [refactor, api-freeze, internal-boundary, time-picker, D-07, D-08]
requires: [02-06, 02-07]
provides:
  - src/internal/helpers/time-utils.ts (pure time parse/format + clock arithmetic)
affects:
  - src/components/time-picker/time-picker.ts
tech-stack:
  added: []
  patterns:
    - "Pure ESM helper module (no ReactiveController) for stateless clock math (D-07)"
    - "src/internal/ boundary stays non-exported — off the frozen CEM/public surface (D-09)"
key-files:
  created:
    - src/internal/helpers/time-utils.ts
  modified:
    - src/components/time-picker/time-picker.ts
decisions:
  - "time-picker gets a pure-helper split, NOT a controller — it uses no @floating-ui/dom and has no listbox (Pitfall 5)."
  - "ListboxNavController reuse did NOT apply: time-picker's keyboard model is per-segment hour/minute/second stepping, not highlighted-index listbox movement — no shared-controller contract to reuse."
  - "Extracted parse/format/displayHours plus the clock arithmetic (adjust*, to24Hour, segmentInputBounds, periodFromHours, togglePeriodHours) relocated verbatim for behavior preservation (D-10)."
metrics:
  duration: ~3 min
  completed: 2026-08-17
status: complete
actuals:
  tokens: 2250
  tasks: 2
  commits: 1
---

# Phase 2 Plan 08: time-picker Pure-Helper Refactor Summary

Refactored the fourth Big-4 component, time-picker (627 lines), by extracting its value parsing/formatting and clock arithmetic into a pure `src/internal/helpers/time-utils.ts` module. Behavior-preserving: the Phase 1 characterization test stayed GREEN with zero edits, the CEM surface is unchanged, and the `src/internal/` boundary stays non-exported. This completes the Big-4 refactor (ROADMAP SC3).

## What Was Built

- **`src/internal/helpers/time-utils.ts`** — a pure ESM module (no `ReactiveController`, no DOM/instance state) exporting time-picker's time math relocated verbatim:
  - `parseTime(value)` → clamped `{ hours, minutes, seconds }`
  - `periodFromHours(hours)` → `'AM' | 'PM'`
  - `formatTime(h, m, s, showSeconds)` → `HH:MM` / `HH:MM:SS`
  - `displayHours(hours, use12Hour)` → 12/24-hour display string
  - `adjustHours` / `adjustMinutes` (step-aware) / `adjustSeconds` / `togglePeriodHours` — wrap arithmetic
  - `segmentInputBounds(segment, use12Hour)` → `{ maxFirst, maxVal, minVal }` digit-entry bounds
  - `to24Hour(val, period)` → 12-hour entry → 24-hour internal conversion
- **`src/components/time-picker/time-picker.ts`** — `_parseValue`, `_formatValue`, `_displayHours`, `_adjustSegment`, `_handleDigitInput`, and `_commitSegmentValue` now delegate to the helper; the inline math is removed. No `@floating-ui/dom` import introduced. `disconnectedCallback` teardown (buffer timer) left intact.

## Listbox-Nav Reuse: Did Not Apply

The plan made ListboxNavController reuse **optional and conditional** on time-picker exposing a listbox with highlighted-index movement. It does not: time-picker uses discrete hour/minute/second segment buttons with per-segment ArrowUp/ArrowDown stepping and digit-buffer entry — a fundamentally different keyboard model from combobox's string-list highlighted-index navigation. There is no shared contract to delegate to, so the segment keyboard handling was left inline (as the plan permits) and no shared controller was edited. This mirrors the 02-07 discretion (select nav kept inline; delegate only genuine duplication).

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | PASS |
| `npx vitest run --project jsdom time-picker.test.ts` | 9/9 PASS |
| `npm run test:run` (full jsdom) | 481/481 PASS, 73 files |
| `npm run test:browser` (Chromium) | 39/39 PASS, 5 files |
| `npm run diff:surface` | No surface drift (exit 0) |
| CEM tagName SET | Unchanged from baseline (no element added/removed) |
| `grep -rnE "innerHTML|eval\(" src/internal` | Zero hits |
| `grep -rn "floating-ui" time-picker.ts` | Zero hits |
| `grep -rn "internal/" src/index.ts src/index.all.ts` | Zero hits (barrels clean) |
| `package.json` exports | No `internal` path |
| `api/custom-elements.baseline.json` | Unchanged |
| time-picker test file | Unchanged (D-10) |

Task 2 is a behavior-preservation gate producing no source change, so it makes no commit (the plan explicitly directs NOT to re-commit the baseline — the refactor changes no surface).

## Deviations from Plan

None — plan executed exactly as written. The "optional listbox-nav reuse" was correctly evaluated as not-applicable (documented above), which the plan anticipated.

## Threat Surface

No new surface. T-02-08 (Tampering on src/internal helpers) mitigated: `time-utils.ts` is a pure module with no DOM sink; the `! grep -rnE "innerHTML|eval\(" src/internal` gate passed on both tasks.

## Self-Check: PASSED

- FOUND: src/internal/helpers/time-utils.ts
- FOUND: src/components/time-picker/time-picker.ts (modified)
- FOUND commit: fdfbc57 (refactor(02-08): extract pure time-utils helper from time-picker)
