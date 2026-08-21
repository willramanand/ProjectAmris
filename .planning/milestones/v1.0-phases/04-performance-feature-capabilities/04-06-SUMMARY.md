---
phase: 04-performance-feature-capabilities
plan: 06
subsystem: shortcuts
tags: [keyboard-shortcuts, lit-context, provider-element, wcag-2.1.4, composed-path, command-palette, feat-04]

# Dependency graph
requires:
  - phase: 04-05
    provides: ShortcutRegistry engine (register/resolve/unregister/list/serialize), frozen no-throw RegisterResult contract, reserved blocklist + single-key gate
provides:
  - am-shortcuts public provider element (AmShortcuts) — the one net-new registered tagName this phase
  - shortcutRegistryContext — @lit/context key distributing an explicit ShortcutRegistry per-subtree (D-08)
  - Single document keydown dispatch resolving the true focused element via composedPath()[0] with typing/IME suppression (WCAG 2.1.4, Pitfall 4)
  - am-command-palette rebindable mod+k through the provider with graceful hardcoded Cmd/Ctrl+K fallback (D-09)
  - @lit/context ^1.1.6 as an external runtime dependency (D-12, kept external via vite /^@lit\//)
affects: [04-10, cem-baseline, command-palette]

# Actuals (#2632)
actuals:
  tokens: 4200
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added:
    - "@lit/context ^1.1.6 (runtime dependency, kept external — not bundled)"
  patterns:
    - "Thin exported provider element (:host { display: contents }, render() returns <slot>) owning an explicit engine instance and a ContextProvider — no module-level singleton (D-08)"
    - "Document keydown resolves the true focus via event.composedPath()[0] across shadow roots (Pitfall 4), attached with a TeardownScope signal and cleared on disconnect"
    - "ContextConsumer(subscribe:true) graceful-fallback: register through a provider when present, restore a hardcoded document listener when absent (D-09)"

key-files:
  created:
    - src/components/shortcuts/shortcuts.ts
    - src/components/shortcuts/index.ts
    - test/browser/shortcuts-context.test.ts
  modified:
    - package.json
    - src/index.ts
    - src/index.all.ts
    - src/components/command-palette/command-palette.ts
    - test/components/command-palette.test.ts

key-decisions:
  - "am-shortcuts resolves shortcuts against the global scope (['global']) this phase; the registry always treats global as the base, and no scope-stack management was in scope for 04-06."
  - "A shortcut is treated as 'single-key' (typing) when it carries no ctrl/meta/alt modifier — shift alone still produces a character, so shift+key is suppressed while typing but mod+k always fires."
  - "The provider preventDefault()s only a RESOLVED (non-reserved) consumer combo; reserved browser/OS combos are refused at registration so they never resolve and are never default-cancelled (D-10)."
  - "ContextConsumer is constructed as a controller side-effect in the command-palette constructor (no stored field) to satisfy tsconfig noUnusedLocals while keeping the reactive-controller registration."

patterns-established:
  - "am-shortcuts: exported provider element wrapping the src/internal ShortcutRegistry, proven cross-shadow in the Chromium lane"
  - "Provider-or-fallback pattern: a consumer registers through context when a provider exists, else keeps its own document listener — no behavior change for drop-in usage"

requirements-completed: [FEAT-03, FEAT-04]

coverage:
  - id: D1
    description: "am-shortcuts owns an explicit ShortcutRegistry and distributes it via @lit/context (ContextProvider); the element is exported from src/index.ts + src/index.all.ts and appears in the CEM manifest; @lit/context stays external (not bundled)"
    requirement: FEAT-04
    verification:
      - kind: build
        ref: "npx tsc --noEmit && npm run build && npm run build:manifest — am-shortcuts present in dist/custom-elements.json; @lit/context imported as a bare external specifier in dist/chunks/shortcuts-*.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "am-command-palette registers a rebindable mod+k through the provider when present and falls back to its hardcoded Cmd/Ctrl+K document listener when absent (D-09), with no UX regression"
    requirement: FEAT-04
    verification:
      - kind: unit
        ref: "test/components/command-palette.test.ts#am-command-palette shortcut integration (D-09)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The document dispatch resolves the true focused element via composedPath()[0] across shadow roots and suppresses single-key shortcuts while typing/composing; mod+k fires regardless of focus; reserved combos never dispatch"
    requirement: FEAT-03
    verification:
      - kind: browser
        ref: "test/browser/shortcuts-context.test.ts#am-shortcuts context dispatch (real Chromium)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 6: am-shortcuts Provider (FEAT-04) Summary

**A new public `am-shortcuts` provider element owns an explicit `ShortcutRegistry`, distributes it per-subtree via `@lit/context`, and drives it from a single `composedPath()`/`isComposing`-aware document keydown (torn down via `TeardownScope`); `am-command-palette` becomes rebindable through the provider with a graceful hardcoded Cmd/Ctrl+K fallback — proven cross-shadow in the Chromium lane.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3 implementation tasks (all `type=auto`, no checkpoints)
- **Files:** 3 created, 5 modified

## Accomplishments
- Added `@lit/context` `^1.1.6` as an external runtime **dependency** (not devDependency, not bundled — already matched by the vite `/^@lit\//` external pattern, so no vite config change).
- Built `am-shortcuts` (`AmShortcuts`) as a thin exported provider element: `:host { display: contents }`, `render()` returns `<slot>`, owns `private _registry = new ShortcutRegistry()` (explicit instance, no singleton — D-08), and a `ContextProvider(shortcutRegistryContext)` distributing it down the subtree.
- Single `document` keydown listener attached with a `TeardownScope` signal and cleared on `disconnectedCallback` (no leak, T-04-15). It resolves the true focused node via `event.composedPath()[0]` (T-04-14 / Pitfall 4), and suppresses single-key shortcuts while that node is editable (`input`/`textarea`/`select`/`contentEditable`/form-associated custom element) or while `event.isComposing` is true (T-04-13 / WCAG 2.1.4). Resolved non-reserved combos are `preventDefault()`ed; reserved combos never resolve so they are never cancelled (D-10).
- Refactored `am-command-palette` onto a `ContextConsumer(subscribe:true)`: when a provider is present it registers a rebindable `command-palette.open` (`mod+k`) through the registry and drops its hardcoded document listener; when absent it keeps the existing Cmd/Ctrl+K document-listener fallback verbatim (D-09). Registration/unregistration follows the provider appearing/disappearing and is torn down on disconnect.
- Exported `AmShortcuts` + `shortcutRegistryContext` from both `src/index.ts` and `src/index.all.ts`; the element appears in the regenerated CEM manifest for the frozen baseline (plan 04-10).

## Task Commits

1. **Task 1 — am-shortcuts provider + @lit/context distribution** — `8b381b2` (feat)
2. **Task 2 — command-palette rebindable mod+k with D-09 fallback** — `06839cb` (feat)
3. **Task 3 — composedPath + typing/IME suppression in Chromium** — `874e883` (test)

## Files Created/Modified
- `src/components/shortcuts/shortcuts.ts` — `AmShortcuts` provider + `shortcutRegistryContext`; composedPath/isComposing-aware document dispatch; `registry` getter; JSDoc for CEM.
- `src/components/shortcuts/index.ts` — barrel (`export * from './shortcuts.js'`).
- `src/components/command-palette/command-palette.ts` — `ContextConsumer` wiring; `_onRegistryChange`/`_addFallback`/`_removeFallback`; hardcoded Cmd/Ctrl+K fallback preserved.
- `test/components/command-palette.test.ts` — new `D-09` describe block (fallback both-combo toggle; provider registration; single-active-path regression lock).
- `test/browser/shortcuts-context.test.ts` — Chromium suite (mod+k regardless of focus; single-key suppressed while typing; single-key fires when non-editable; `isComposing` ignored; composedPath nested-shadow target; reserved refused).
- `package.json` / `package-lock.json` — `@lit/context ^1.1.6` in `dependencies`.
- `src/index.ts` / `src/index.all.ts` — export `AmShortcuts` + `shortcutRegistryContext`.

## Verification
- `npx tsc --noEmit` — exit 0.
- `npm run build && npm run build:manifest` — green; `am-shortcuts` present in `dist/custom-elements.json`; `@lit/context` imported as a bare external specifier in `dist/chunks/shortcuts-*.js` (not bundled).
- `npm test -- --run command-palette` — 14/14 pass (11 existing + 3 new D-09 tests).
- `npm run test:browser -- --run shortcuts-context` — 5/5 pass in Chromium.

## Threat Mitigations Applied
- **T-04-13 (single-key while typing, high):** composedPath editable check + `isComposing` guard suppress single-key shortcuts while typing — proven in the browser lane.
- **T-04-14 (retargeted host, medium):** dispatch uses `event.composedPath()[0]`, not `event.target`, so shadow-DOM retargeting cannot spoof the focus check.
- **T-04-15 (listener leak, low):** document keydown attached with a `TeardownScope` signal and cleared on disconnect.

## Deviations from Plan
- **[Rule 3 — Blocking issue] ContextConsumer moved from a field to a constructor side-effect.** The tsconfig (`noUnusedLocals`) flags a private class field that is only constructed for its controller side effect (`TS6133 '_shortcutConsumer' is declared but its value is never read`). Constructing the `ContextConsumer` as a bare statement in the command-palette constructor keeps the reactive-controller registration without an unused field. No behavior change.

## Known Stubs
None — both the provider dispatch and the command-palette refactor are fully wired and proven in the jsdom and Chromium lanes.

## Issues Encountered
None beyond the tsconfig unused-field adjustment above.

## Next Phase Readiness
- `am-shortcuts` is on the public/CEM surface and ready for plan 04-10 to fold into the frozen baseline + Changeset; `@lit/context` is a declared external dependency (SHIP-02 exports/sideEffects already cover `@lit/*`).
- The provider resolves against the `global` scope only; scope-stack push/pop management (if desired) remains a future seam on top of the registry's existing `resolve(combo, activeScopes)`.

## Self-Check: PASSED

- FOUND: src/components/shortcuts/shortcuts.ts
- FOUND: src/components/shortcuts/index.ts
- FOUND: test/browser/shortcuts-context.test.ts
- FOUND: .planning/phases/04-performance-feature-capabilities/04-06-SUMMARY.md
- FOUND commits: 8b381b2, 06839cb, 874e883
- Verification: `npx tsc --noEmit` exit 0; `npm run build && npm run build:manifest` green (am-shortcuts in CEM, @lit/context external); `npm test -- --run command-palette` 14/14; `npm run test:browser -- --run shortcuts-context` 5/5.

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
