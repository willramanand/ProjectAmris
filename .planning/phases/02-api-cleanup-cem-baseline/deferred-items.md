# Deferred Items — Phase 02 (api-cleanup-cem-baseline)

Out-of-scope discoveries logged during plan execution. NOT fixed in the
discovering plan (SCOPE BOUNDARY: only issues directly caused by the current
task's changes are auto-fixed).

| Discovered In | File | Issue | Status |
|---------------|------|-------|--------|
| 02-06 | src/components/data-grid/data-grid.ts:233 | Pre-existing `tsc --noEmit` errors TS6133: `_toggleRow` params `row` and `originalIndex` declared but never read (`noUnusedLocals`/`noUnusedParameters`). Present on HEAD, introduced in commit 2f20e2f (02-04). Unrelated to the combobox controller refactor. `npx tsc --noEmit` therefore reports these two errors independent of Plan 02-06's changes. | **Resolved** in commit bbe853e — params underscore-prefixed; `tsc --noEmit` exit 0. |
