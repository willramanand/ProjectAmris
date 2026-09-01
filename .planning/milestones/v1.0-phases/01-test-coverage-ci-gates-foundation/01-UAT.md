---
status: testing
phase: 01-test-coverage-ci-gates-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md]
started: 2026-08-12T01:42:16Z
updated: 2026-08-12T01:42:16Z
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-01
  gap_snapshot: "testing::scenarios=1"
---

## Current Test

number: 28
name: CI hard-blocks every gate on a real PR run
expected: |
  Open (or recall) a pull request against this repo. The GitHub Actions
  workflow runs three jobs — verify (jsdom coverage), browser (Chromium
  install + browser project), size (build + size-limit) — under read-only
  permissions (contents: read, no packages: write). Each job HARD-BLOCKS the
  PR on failure: a coverage drop below floor, a browser-lane test failure, or
  a bundle over budget turns the check red and prevents merge. Confirm you
  have seen (or trust) CI actually gating a PR this way.
awaiting: user response

## Tests

### 1. jsdom + browser Vitest split; `npm test` stays jsdom-only

expected: Vitest split into jsdom + Chromium browser projects; `npm test` runs jsdom only for contributors (TEST-06)
result: pass
source: automated
coverage_id: D1-0101

### 2. misc-display split into dedicated table/link-button/icon files

expected: misc-display.test.ts split verbatim into 1:1 files; grouped file removed (TEST-01)
result: pass
source: automated
coverage_id: D2-0101

### 3. Browser form-association via native ElementInternals

expected: Real FormData via native ElementInternals in Chromium; native-API guard proves no jsdom mock leak (TEST-02)
result: pass
source: automated
coverage_id: D4-0101

### 4. In-browser axe scan (color-contrast + region) green

expected: Chromium axe scan over form/overlay/colored-display set passes on current styles (TEST-08)
result: pass
source: automated
coverage_id: D5-0101

### 5. jsdom branch + per-directory coverage gate at baseline

expected: `vitest run --project jsdom --coverage` exits 0 at measured floor; fails on regression (TEST-07)
result: pass
source: automated
coverage_id: D3-0101
note: "Re-verified live this session — exit 0, 67 files / 437 tests, br 67.87 / fn 83.02 / ln 84.33 / st 83.50 (all >= raised floors 67/82/84/83)."

### 6. size-limit core-bundle budget hard-fails over budget

expected: `size-limit` core budget enforced; measured under limit, peer deps ignored (PERF-01)
result: pass
source: automated
coverage_id: D6-0101
note: "Re-verified live this session — size exit 0, core 21.3 kB < 23 kB."

### 7. stack / grid / surface split into 1:1 jsdom files

expected: Dedicated 1:1 files, blocks lifted verbatim (TEST-01)
result: pass
source: automated
coverage_id: D1-0102

### 8. panel + card split into dedicated files

expected: panel (bordered + slots + parts) and card (default slot) in dedicated files (TEST-01)
result: pass
source: automated
coverage_id: D2-0102

### 9. layout-primitives.test.ts retired with zero coverage loss

expected: Grouped file gone; full jsdom project stays green (TEST-01)
result: pass
source: automated
coverage_id: D3-0102
note: "Covered by live full jsdom run — 67 files pass; grouped file absent."

### 10. Eight display-trivial components split into dedicated files

expected: app-shell, button-group, empty-state, error-text, field, hint-text, label, nav-bar each 1:1 (TEST-01)
result: pass
source: automated
coverage_id: D-0103
note: "01-03 (legacy classify); its 8 files run in the live 437-test jsdom suite."

### 11. Six remaining display components 1:1 smoke files

expected: progress-ring/side-nav/stat/status-dot/timeline/visually-hidden dedicated files (TEST-01)
result: pass
source: automated
coverage_id: D1-0104

### 12. Multi-element directories covered in one file

expected: side-nav.test.ts (host + item), timeline.test.ts (host + item) (TEST-01)
result: pass
source: automated
coverage_id: D2-0104

### 13. split-view behavioral test, no component edit

expected: Orientation, position clamp, am-resize on drag, slots/parts; component source unchanged (TEST-01)
result: pass
source: automated
coverage_id: D3-0104

### 14. am-breadcrumb-item folded into breadcrumb.test.ts

expected: Anchor-vs-current block in breadcrumb.test.ts; no standalone item file (TEST-01)
result: pass
source: automated
coverage_id: D4-0104

### 15. Overlay focus trap + restoration in real Chromium

expected: Focus enters am-dialog, top-layer traps, Tab cycles, focus restores to opener; drawer/command-palette assert; popover documents non-modal contract (TEST-03)
result: pass
source: automated
coverage_id: D1-0105

### 16. Native dialog / top-layer via real showModal()

expected: Inner dialog reports open + matches(':modal'); native-API guard asserts showModal is [native code]; close/open=false/Escape drop out of top layer (TEST-06)
result: pass
source: automated
coverage_id: D2-0105

### 17. floating-ui positioning with real layout

expected: Opened am-popover panel has non-zero, viewport-anchored rect relative to trigger, not at 0,0 (TEST-06)
result: pass
source: automated
coverage_id: D3-0105

### 18. Simple controls participate in a real <form>

expected: input, textarea, radio-group, switch, number-field, slider report value into FormData via native setFormValue (TEST-02)
result: pass
source: automated
coverage_id: D1-0106

### 19. Complex controls participate in a real <form>

expected: select, combobox, rich-select, input-otp, date-picker, time-picker, color-picker report into FormData (TEST-02)
result: pass
source: automated
coverage_id: D2-0106

### 20. Browser form suite uses no jsdom mocks

expected: No getMockInternals / setup.ts mock in browser suite; native-API guard proves native internals (TEST-02)
result: pass
source: automated
coverage_id: D3-0106

### 21. TEST-04 index-clamp: no out-of-bounds highlight / stale options

expected: Replacing options with a shorter array while open (incl. rapid replacement) leaves no OOB highlight and no stale options in combobox/select/rich-select (TEST-04)
result: pass
source: automated
coverage_id: D1-0107
note: "Assertions hardened by code-review fix WR-01 (were tautological); now falsifiable and passing in live 437-test run."

### 22. Document-listener lifecycle (attach/detach/disconnect)

expected: combobox/dropdown/context-menu/date-picker/popover attach-on-open, detach-on-close, balanced cycle, detach-on-disconnect via spies (TEST-05)
result: pass
source: automated
coverage_id: D2-0107

### 23. Tooltip listener lifecycle assertion

expected: am-tooltip has no document-level click/keydown listeners across show/hide cycle (TEST-05)
result: pass
source: automated
coverage_id: D3-0107
note: "Fake-timer leak risk closed by code-review fix WR-07 (afterEach real timers)."

### 24. size-limit budgets core/full/button/data-grid all green

expected: core/full/button-light/data-grid-heavy budgets each min+gzip, peer deps ignored; all under limit (PERF-01)
result: pass
source: automated
coverage_id: D1-0108
note: "Re-verified live — size exit 0: core 21.3/23, full 51.09/55, button 2.2/2.5, data-grid 3.21/3.5 kB."

### 25. Tree-shaking canary size-limit entry

expected: Canary fails CI if a component deep import transitively pulls the whole library (PERF-01, D2-0108)
result: skipped
reason: "Superseded by code-review fix WR-04, which removed the canary as strictly redundant (it measured the identical dist/components/button/index.js as the 2.5 kB button budget, only looser at 5 kB). Deep-import size is still guarded by the button 2.2 kB / 2.5 kB budget. Deliverable intentionally retired during --fix; flagged here for user awareness."

### 26. Coverage thresholds ratcheted to final measured floor

expected: Thresholds raised to measured baseline, still green-on-arrival (TEST-07)
result: pass
source: automated
coverage_id: D3-0108
note: "Floors raised again by code-review fix WR-05 to br 67 / fn 82 / ln 84 / st 83; live run exits 0 above all four."

### 27. All 66 components have a dedicated 1:1 test file

expected: 66 src component dirs, 66 dedicated test files, 1:1; no grouped multi-component file remains (TEST-01)
result: pass
source: automated
coverage_id: D4-0108
note: "Re-verified live — src/components: 66 dirs, test/components: 66 *.test.ts files."

### 28. CI hard-blocks every gate on a real PR run

expected: GitHub Actions verify/browser/size jobs each hard-block a PR on failure, under read-only permissions (contents: read, no packages: write)
result: [pending]

## Summary

total: 28
passed: 26
issues: 0
pending: 1
skipped: 1
blocked: 0

## Gaps

[none yet]
