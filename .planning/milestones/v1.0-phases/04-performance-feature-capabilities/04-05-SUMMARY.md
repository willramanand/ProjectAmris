---
phase: 04-performance-feature-capabilities
plan: 05
subsystem: shortcuts
tags: [keyboard-shortcuts, registry, wcag-2.1.4, accessibility, internal-controller, feat-03]

# Dependency graph
requires:
  - phase: 04-01
    provides: jsdom logic test lane + src/internal boundary conventions (teardown-scope, listbox-nav)
provides:
  - ShortcutRegistry engine (register/resolve/unregister/list/serialize) as a non-exported src/internal class
  - Frozen v1.0 register() / RegisterResult contract (Option A, D-08) confirmed at checkpoint
  - No-throw same-scope conflict detection (D-11) keeping the first binding + existingId
  - mod/opt platform normalization detected once at construction (D-08)
  - Scope stacking (topmost active scope wins, global as base)
  - Reserved browser/OS combo blocklist (D-10) + single-key opt-in gate (WCAG 2.1.4)
  - Serializable help-sheet list (FEAT-V2-01 seam, no persistence store)
affects: [04-06, am-shortcuts, command-palette, 04-10, cem-baseline]

# Actuals (#2632)
actuals:
  tokens: 5086
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "src/internal explicit-instance engine (no module-level singleton, no custom element, never re-exported from src/index*.ts)"
    - "No-throw refuse+report result union ({ok:false, reason, existingId}) instead of exceptions (D-11)"
    - "Platform detected once at construction and cached (no per-event branching)"

key-files:
  created:
    - src/internal/controllers/shortcut-registry.ts
    - test/internal/shortcut-registry.test.ts
  modified: []

key-decisions:
  - "Adopted Option A as the frozen v1.0 register() contract (checkpoint confirmed by user)"
  - "Single-key-without-opt-in refusals map onto the existing reason:'reserved' — the frozen RegisterResult union carries only 'conflict'|'reserved', so no third reason was added"
  - "platform is injectable via an optional constructor option purely for testability; defaults to navigator detection"
  - "list() preserves the original keys notation (e.g. 'mod+k') so a help UI can render it platform-aware"

patterns-established:
  - "ShortcutRegistry: explicit-instance engine on the src/internal boundary, proven in the jsdom lane"
  - "register() policy order: reserved blocklist -> single-key gate -> same-scope conflict, all no-throw, before storing"

requirements-completed: [FEAT-03]

coverage:
  - id: D1
    description: "ShortcutRegistry core: register() no-throw same-scope conflict (keeps first, returns existingId), mod/opt platform normalization detected once, resolve() scope stacking with global base, list()/serialize() help-sheet seam, unregister() frees the combo"
    requirement: FEAT-03
    verification:
      - kind: unit
        ref: "test/internal/shortcut-registry.test.ts#ShortcutRegistry — core"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reserved browser/OS combo blocklist default-refuses with reason:'reserved' (D-10); bare single-key shortcuts refused unless allowSingleKey (WCAG 2.1.4); remap/disable via unregister; all refusals no-throw"
    requirement: FEAT-03
    verification:
      - kind: unit
        ref: "test/internal/shortcut-registry.test.ts#ShortcutRegistry — reserved blocklist & single-key policy (D-10, WCAG 2.1.4)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 5: ShortcutRegistry (FEAT-03) Summary

**Non-exported src/internal ShortcutRegistry engine: no-throw same-scope conflict detection (D-11), mod/opt platform normalization, scope stacking, a reserved browser/OS blocklist (D-10), and a serializable help-sheet list (FEAT-V2-01 seam) — all proven in the jsdom lane.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-18T21:43:00Z
- **Completed:** 2026-08-18T21:47:55Z
- **Tasks:** 2 implementation tasks (Task 1 checkpoint decision resolved by user)
- **Files modified:** 2 (both created)

## Accomplishments
- Confirmed the frozen v1.0 `register(s): RegisterResult` contract (Option A, D-08) at the blocking decision checkpoint, then implemented against it exactly.
- Built `ShortcutRegistry` as an explicit instance on the `src/internal` boundary: registers no custom element, holds no module-level mutable state, and is never re-exported from `src/index*.ts` (boundary check passes).
- No-throw same-scope conflict policy (D-11): a collision keeps the first binding and returns `{ok:false, reason:'conflict', existingId}`; the same combo in a different scope registers independently.
- `mod`/`opt` normalization resolves once at construction (`mod`→Cmd on macOS else Ctrl; `opt`→Alt), order-independent among modifiers; `resolve()` implements scope stacking (topmost active scope wins, `global` as base).
- Reserved browser/OS combo blocklist (D-10, documented in a doc-comment) default-refuses `reason:'reserved'` before storing; bare single-key shortcuts require `allowSingleKey` opt-in (WCAG 2.1.4), remappable/disablable via `unregister`.
- `list()`/`serialize()` expose a JSON-serializable registration snapshot (FEAT-V2-01 help-sheet seam) with handlers omitted — no persistence store shipped.

## Task Commits

Each task was committed atomically (TDD RED→GREEN):

1. **Task 2 (RED): failing tests for ShortcutRegistry core** - `65301fb` (test)
2. **Task 2 (GREEN): ShortcutRegistry core** - `60a34d3` (feat)
3. **Task 3 (RED): failing tests for reserved blocklist + single-key** - `512fe8c` (test)
4. **Task 3 (GREEN): reserved blocklist + single-key opt-in** - `365513e` (feat)

_Task 1 was a `checkpoint:decision` (gate=blocking) resolved by the user in favor of Option A — no code commit._

## Files Created/Modified
- `src/internal/controllers/shortcut-registry.ts` - `ShortcutRegistry` class + `Shortcut`, `RegisterResult`, `ShortcutScope`, `ShortcutListEntry`, `ShortcutRegistryOptions` types; register/resolve/unregister/list/serialize + reserved blocklist and single-key policy.
- `test/internal/shortcut-registry.test.ts` - jsdom suite (20 tests): conflict no-throw, cross-scope legality, mod/opt normalization on mac/win, scope stacking, list/serialize shape, reserved refusal, single-key opt-in/disable.

## Decisions Made
- **Option A frozen** as the v1.0 `register()` contract (user-confirmed at checkpoint): single structured argument `{id; keys; scope?; handler; allowSingleKey?; description?}`, result union `{ok:true} | {ok:false; reason:'conflict'|'reserved'; existingId?}`, no-throw.
- **Single-key refusals map onto `reason:'reserved'`.** The confirmed `RegisterResult` union carries only `'conflict'|'reserved'`, and the user confirmed field names "exactly as listed"; adding a third reason would break the just-frozen contract. A disallowed bare single key is a policy-reserved combo, so `'reserved'` is the natural fit. Documented in the `register()` doc-comment.
- **`platform` is an injectable optional constructor option** (`ShortcutRegistryOptions`) purely so the mod/opt normalization is testable on both mac-like and win-like platforms; it defaults to `navigator.userAgentData?.platform ?? navigator.platform`. This preserves "detect once at construction" and adds no global state.

## Deviations from Plan

None - plan executed exactly as written. (The `RegisterResult` union already lacked a single-key reason; mapping single-key refusals to `'reserved'` is a documented interpretation of the frozen contract, not a contract change.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The `ShortcutRegistry` engine is ready for plan 04-06 to wrap in the exported `am-shortcuts` provider element (document `keydown` dispatch via `TeardownScope` signal, `@lit/context` distribution) and for `am-command-palette`'s `mod+k` refactor (D-09).
- 04-06 provider dispatch will need to compute the combo from a `KeyboardEvent` (composedPath focus check, `isComposing` guard) and call `resolve(combo, activeScopes)` — the engine's `resolve()` accepts a combo string and is ready for that.
- Registry stays off the public/CEM surface; it will enter the frozen baseline only indirectly via `am-shortcuts` (plan 04-10).

## Self-Check: PASSED

- FOUND: src/internal/controllers/shortcut-registry.ts
- FOUND: test/internal/shortcut-registry.test.ts
- FOUND: .planning/phases/04-performance-feature-capabilities/04-05-SUMMARY.md
- FOUND commits: 65301fb, 60a34d3, 512fe8c, 365513e, 1857cb3
- Verification: `npx tsc --noEmit` exit 0; `npx vitest run --project jsdom shortcut-registry` 20/20 pass; public-surface boundary check exit 0 (not exported).

---
*Phase: 04-performance-feature-capabilities*
*Completed: 2026-08-18*
