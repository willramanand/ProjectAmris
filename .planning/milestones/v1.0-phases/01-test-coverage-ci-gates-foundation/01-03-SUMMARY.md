---
phase: 01-test-coverage-ci-gates-foundation
plan: 03
subsystem: test-suite
tags: [testing, vitest, jsdom, web-components, test-split]
status: complete
requires:
  - "01-01: jsdom project split + display-trivial.test.ts split mechanic"
provides:
  - "Eight dedicated 1:1 smoke test files (app-shell, button-group, empty-state, error-text, field, hint-text, label, nav-bar)"
affects:
  - "test/components/ (adds 8 dedicated files; grouped display-trivial.test.ts untouched)"
tech-stack:
  added: []
  patterns:
    - "Smoke-tier jsdom test file: single component barrel import + fixture helper only (noUnusedLocals)"
    - "describe block lifted verbatim from grouped file — zero coverage loss"
key-files:
  created:
    - test/components/app-shell.test.ts
    - test/components/button-group.test.ts
    - test/components/empty-state.test.ts
    - test/components/error-text.test.ts
    - test/components/field.test.ts
    - test/components/hint-text.test.ts
    - test/components/label.test.ts
    - test/components/nav-bar.test.ts
  modified: []
decisions:
  - "Each new file imports ONLY fixture from ../helpers (every lifted block uses fixture alone); shadowQuery/waitForUpdate omitted to satisfy noUnusedLocals."
  - "display-trivial.test.ts left present (read-only) — plan 04 still redistributes remaining components; plan 08 performs the single race-free deletion."
metrics:
  duration: ~1 min
  completed: 2026-08-11
actuals:
  tokens: 1056
  tasks: 2
  commits: 2
---

# Phase 01 Plan 03: Split display-trivial into eight dedicated test files Summary

Split the first eight components out of `test/components/display-trivial.test.ts` into dedicated 1:1 smoke test files (TEST-01, all D-04 smoke tier), lifting each `describe` block verbatim with no coverage loss and without touching the grouped file's lifecycle.

## What Was Built

Eight new dedicated jsdom test files under `test/components/`, each covering one display component:

| File | Assertion focus |
|------|-----------------|
| `app-shell.test.ts` | header / sidebar / footer named slots |
| `button-group.test.ts` | `orientation` reflection + `role="group"` |
| `empty-state.test.ts` | icon / heading / action named slots |
| `error-text.test.ts` | `role="alert"` + default slot |
| `field.test.ts` | default slot for grouping controls |
| `hint-text.test.ts` | default slot renders |
| `label.test.ts` | `for` association + `required` reflection |
| `nav-bar.test.ts` | `role="navigation"` |

Each file imports exactly one component barrel plus the `fixture` helper. All lifted blocks use only `fixture`, so `shadowQuery`/`waitForUpdate` were intentionally omitted (noUnusedLocals enforced per CLAUDE.md).

## Verification

- Task 1 (app-shell, button-group, empty-state, error-text): `vitest run --project jsdom` → 4 files, 5 tests passed.
- Task 2 (field, hint-text, label, nav-bar): `vitest run --project jsdom` → 4 files, 4 tests passed.
- Combined run of all eight files: 8 files, 9 tests passed.
- `test/components/display-trivial.test.ts` confirmed still present after both tasks.

## Deviations from Plan

None - plan executed exactly as written.

## Tasks & Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Split app-shell, button-group, empty-state, error-text | 60e2acb |
| 2 | Split field, hint-text, label, nav-bar | 0a04f2f |

## Known Stubs

None. All eight files are real smoke tests with live assertions against rendered components.

## Notes for Downstream Plans

- `display-trivial.test.ts` remains intact and still owns: breadcrumb-item, progress-ring, side-nav-item, split-view, stat, status-dot, timeline-item, visually-hidden. Plan 04 redistributes those; plan 08 deletes the grouped file.

## Self-Check: PASSED
