---
phase: 01-test-coverage-ci-gates-foundation
plan: 05
subsystem: testing
tags: [vitest, browser-mode, chromium, focus-trap, dialog, top-layer, floating-ui, TEST-03, TEST-06]

# Dependency graph
requires:
  - 01-01 (browser Vitest project, deepActiveElement helper, mock-free helpers)
provides:
  - Real-browser overlay focus-trap + restoration suite (dialog/drawer/command-palette/popover)
  - Native <dialog>/top-layer fidelity suite against the genuine showModal() (Pitfall 2 guard)
  - floating-ui positioning suite (real, viewport-anchored geometry in Chromium)
affects: [01-06, 01-08]

actuals:
  tokens: 3300
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Browser-lane focus assertions via deepActiveElement() piercing shadow roots"
    - "Modal focus-trap proven through native top-layer inertness (outside .focus() is a no-op)"
    - "Tab cycling via real keyboard (userEvent from 'vitest/browser')"
    - "Top-layer verified with dialog.matches(':modal'); native-API guard on showModal ([native code])"
    - "floating-ui geometry asserted as real computed rect (non-zero, trigger-anchored), not exact pixels"

key-files:
  created:
    - test/browser/overlay-focus.test.ts
    - test/browser/dialog-top-layer.test.ts
    - test/browser/floating-position.test.ts
  modified: []

key-decisions:
  - "Assert focus-trap via top-layer inertness (programmatic opener.focus() blocked) — deterministic and does not depend on synthetic Tab defaults"
  - "Use userEvent from 'vitest/browser' (not the deprecated '@vitest/browser/context') for real Tab/Escape"
  - "Popover treated as non-modal: assert focus is PRESERVED on the opener (it neither traps nor relocates focus) rather than forcing a trap contract it does not implement"
  - "Chose am-popover as the representative floating-ui overlay for positioning (bottom-start + offset 8)"

patterns-established:
  - "Browser fidelity suites live in test/browser/**, import components for side-effect registration, and never import getMockInternals/setup.ts"

requirements-completed: [TEST-03, TEST-06]

coverage:
  - id: D1
    description: "Overlay focus trap + restoration proven in real Chromium: focus enters am-dialog, top-layer inertness traps it, Tab cycles within, and focus restores to the opener; drawer + command-palette assert open-into/restore; popover documents its non-modal focus contract (TEST-03)"
    requirement: "TEST-03"
    verification:
      - kind: e2e
        ref: "test/browser/overlay-focus.test.ts — 5 pass (Chromium)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Native <dialog>/top-layer verified against the real showModal(): inner dialog reports open and matches(':modal'); native-API guard asserts showModal is [native code] (proves no setup.ts mock); close button / open=false / Escape all drop out of the top layer (TEST-06, Pitfall 2)"
    requirement: "TEST-06"
    verification:
      - kind: e2e
        ref: "test/browser/dialog-top-layer.test.ts — 5 pass (Chromium)"
        status: pass
    human_judgment: false
  - id: D3
    description: "floating-ui positioning verified with real layout: an opened am-popover panel has a non-zero, viewport-anchored getBoundingClientRect() placed relative to its trigger (not at 0,0) (TEST-06)"
    requirement: "TEST-06"
    verification:
      - kind: e2e
        ref: "test/browser/floating-position.test.ts — 1 pass (Chromium)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 05: Real-Browser Overlay Fidelity Suites Summary

**Three Chromium-only fidelity suites — overlay focus trap + restoration (TEST-03), native `<dialog>`/top-layer against the genuine `showModal()` (TEST-06, Pitfall 2), and floating-ui positioning with real viewport-anchored geometry (TEST-06) — each green on existing components with zero source changes.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 3
- **Files created:** 3 (0 modified, 0 deleted)

## Accomplishments
- **overlay-focus.test.ts (TEST-03):** Proves focus moves into an opened `am-dialog`, is trapped by native top-layer inertness (a programmatic `opener.focus()` cannot pull focus out), cycles within via a real `userEvent.tab()`, and restores to the opener on close. Adds open-into/restore coverage for `am-drawer` and `am-command-palette` (the latter focuses its search input via `requestAnimationFrame`), and documents `am-popover`'s non-modal focus contract. Uses `deepActiveElement()` to pierce shadow roots.
- **dialog-top-layer.test.ts (TEST-06, Pitfall 2):** Asserts the inner `<dialog>` reports `open === true` and `matches(':modal')` after the real `showModal()`, includes the native-API guard (`showModal` is `[native code]`), and verifies close button / `open=false` / Escape all run the native close path and drop out of the top layer.
- **floating-position.test.ts (TEST-06):** Opens `am-popover`, waits for the async `computePosition`, and asserts its floating panel has a non-zero, viewport-anchored rect placed relative to the trigger (`bottom-start` + offset 8) — real computed geometry, not exact pixels. This is the fidelity area with no in-repo analog (jsdom returns all-zero rects).

## Task Commits

Each task was committed atomically:

1. **Task 1: overlay focus trap + restoration suite (TEST-03)** — `ab7ead3` (test)
2. **Task 2: native dialog / top-layer suite (TEST-06, Pitfall 2)** — `f0c0d4d` (test)
3. **Task 3: floating-ui positioning suite (TEST-06)** — `2906cd8` (test)

## Files Created
- `test/browser/overlay-focus.test.ts` — focus trap + restoration across dialog/drawer/command-palette/popover
- `test/browser/dialog-top-layer.test.ts` — real `showModal()`/`:modal` + native-API guard
- `test/browser/floating-position.test.ts` — real floating-ui geometry for popover

## Decisions Made
- **Trap proven via inertness, not synthetic Tab.** Synthetic `KeyboardEvent('keydown', {key:'Tab'})` does not move focus in a browser, so the primary trap assertion is that a modal dialog makes outside content inert (a programmatic `opener.focus()` is a no-op). A real `userEvent.tab()` cycle additionally satisfies the "Tab cycles within it" behavior.
- **`userEvent` imported from `vitest/browser`.** The `@vitest/browser/context` path is deprecated (warned it will break next major) and triggered a Vite dependency-reload flake on first run; switching to `vitest/browser` is stable.
- **Popover is non-modal.** It has no `<dialog>`/top-layer and intentionally neither traps nor relocates focus, so the suite asserts focus is *preserved* on the opener across open/close rather than forcing a trap contract it does not implement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deprecated browser-context import path**
- **Found during:** Task 1 (first browser run)
- **Issue:** `import { userEvent } from '@vitest/browser/context'` emitted a deprecation warning ("will stop working in the next major version") and coincided with a Vite "unexpectedly reloaded a test" flake as `@floating-ui/dom` was optimized.
- **Fix:** Switched to the recommended `import { userEvent } from 'vitest/browser'`.
- **Files modified:** test/browser/overlay-focus.test.ts (pre-commit)
- **Verification:** Re-ran the suite — 5 pass, no deprecation warning.
- **Committed in:** ab7ead3

**Total deviations:** 1 auto-fixed (Rule 3). No component source changed; no scope creep.

## Findings (captured, not fixed — per plan scope)

- **FIX-03 (Phase 3) — unguarded focus restoration to a removed opener.** `am-dialog`/`am-drawer`/`am-command-palette` call `this._previouslyFocused.focus()` on close with no `isConnected` guard (`src/components/dialog/dialog.ts:196`, `drawer.ts:211`, `command-palette.ts:226`). A documenting test in `overlay-focus.test.ts` removes the opener while the dialog is open, then closes: in real Chromium `focus()` on a disconnected node is a **no-op** — focus is **not** restored (it falls to `<body>`) and **no error is thrown**. So the current impact is a silent focus-loss, not a crash; a Phase 3 `isConnected` guard should redirect restoration to a stable fallback. Captured, not fixed.
- **PERF-04 (Phase 4) — autoUpdate gating.** No positioning bug surfaced; `am-popover` computed a correct viewport-anchored rect. The `autoUpdate` start/stop gating flagged in CONCERNS was not exercised here and remains a Phase 4 concern.
- **Popover non-modal focus (informational).** `am-popover` does not manage focus; captured as an intentional contract, not a defect.

## Known Stubs
None — all three suites exercise real components against real browser APIs; no placeholder/empty-data stubs introduced.

## Threat Flags
None — no new runtime surface. Only new `test/browser/**` files were added; they run in the existing PR-triggered, read-only Chromium CI job (threat register T-01-05a/T-01-05b honored — no component source edited despite browser tests exercising focus/positioning).

## Verification
- `npx vitest run --project browser` → **5 files / 19 tests pass** (the 3 new suites + the tracer's form-association and a11y suites).
- No browser file imports `getMockInternals` or any `setup.ts` mock symbol (grep confirms matches are comments only).
- No component source modified (`git show --stat` per commit shows only `test/browser/*` additions).

## Self-Check: PASSED
- All 3 created files present: `test/browser/overlay-focus.test.ts`, `dialog-top-layer.test.ts`, `floating-position.test.ts`.
- All 3 task commits exist: `ab7ead3`, `f0c0d4d`, `2906cd8`.

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*
