---
phase: 10-graceful-degradation-compatibility-matrix
plan: 01
subsystem: infra
tags: [web-components, lit, element-internals, feature-detection, graceful-degradation, jsdom, vitest]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    provides: "lazy-load.ts off-CEM memoize-once (??=) helper idiom this plan mirrors"
provides:
  - "capabilities.ts — four independently-memoized runtime feature probes (hasFormAssociation, hasAriaReflection, hasAdoptedStyleSheets, supportsHas) + __resetCapabilitiesForTest"
  - "attachInternalsSafe() — guarded ElementInternals attach chokepoint returning null below the Safari 16.4 floor"
  - "am-input wired null-safely through the guarded-attach seam (the proven tracer slice)"
  - "test/capabilities-off-constructor.test.ts — capability-off constructor-no-throw harness the rollout plans extend"
  - "test/capabilities.test.ts — independent-probe COMPAT-01 edge suite"
affects: [10-04, 10-05, 10-06, form-associated-component-rollout]

# Actuals (#2632)
actuals:
  tokens: 4100
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Independently-memoized boolean feature probes (own module-level `let _x: boolean | undefined` cache per capability, `??=` memoize-once, __resetCapabilitiesForTest to clear all)"
    - "Guarded-attach chokepoint (attachInternalsSafe) gating the raw ElementInternals attach on a capability probe + try/catch, returning null below the floor"
    - "Null-tolerant ElementInternals field (`ElementInternals | null`) with `?.` at every setFormValue/setValidity call site"

key-files:
  created:
    - src/internal/helpers/capabilities.ts
    - src/internal/helpers/attach-internals-safe.ts
    - test/capabilities-off-constructor.test.ts
    - test/capabilities.test.ts
  modified:
    - src/components/input/input.ts
    - src/internal/controllers/validation.ts
    - test/setup.ts

key-decisions:
  - "Kept capabilities.ts's hasFormAssociation() probe exactly as specified (three-part check including `'setFormValue' in globalThis.ElementInternals.prototype`) so Plans 04/05/06 inherit the same probe contract; reconciled the jsdom mismatch in test/setup.ts instead of relaxing the production probe."
  - "attachInternalsSafe returns null (never throws) both below the floor AND on a caught attach throw, so a partial engine that exposes the method but rejects the attach still degrades gracefully."
  - "capabilities-off-constructor.test.ts covers am-input ONLY; rollout plans create their own batch-scoped constructor-no-throw files so no two parallel wave-2 plans mutate the same tag-array file."

patterns-established:
  - "Capability probe module: off-CEM internal helper, one memoized boolean per capability, reset-for-test hook mirroring __resetLazyLoadCachesForTest"
  - "Guarded platform-API seam: probe-gate + try/catch wrapper around a throwing constructor-time browser API, callers null-safe the result"

requirements-completed: [COMPAT-01, COMPAT-02]

coverage:
  - id: D1
    description: "capabilities.ts probes each return a plain boolean for every capability even when the backing global is absent/undefined — never throw, never return undefined (COMPAT-01 empty-input edge)"
    requirement: COMPAT-01
    verification:
      - kind: unit
        ref: "test/capabilities.test.ts#every probe returns a plain boolean, never undefined, never throwing (empty-input edge)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each capability probe is memoized independently — forcing one probe's result does not change another probe's cached value, and a cached value survives a backing-global mutation until reset (COMPAT-01 adjacency + memoization edges)"
    requirement: COMPAT-01
    verification:
      - kind: unit
        ref: "test/capabilities.test.ts#forcing ElementInternals off does not change hasAdoptedStyleSheets()/supportsHas()"
        status: pass
      - kind: unit
        ref: "test/capabilities.test.ts#caches a probe's value across a backing-global mutation until __resetCapabilitiesForTest()"
        status: pass
    human_judgment: false
  - id: D3
    description: "Below the ElementInternals floor, am-input constructs, connects, and renders without throwing — attachInternalsSafe(this) returns null instead of letting the raw attachInternals() throw (COMPAT-02)"
    requirement: COMPAT-02
    verification:
      - kind: unit
        ref: "test/capabilities-off-constructor.test.ts#am-input constructs, connects, and renders without throwing when form association is absent"
        status: pass
    human_judgment: false
  - id: D4
    description: "Above the floor, am-input's setFormValue/setValidity call sites, ValidationController wiring, and rendered output stay byte-identical — the guarded-attach seam is a pure pass-through (behavior-preservation landmine 1)"
    requirement: COMPAT-02
    verification:
      - kind: unit
        ref: "test/components/input.test.ts#am-input (all existing above-floor specs green unchanged)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (exit 0 — widened | null type propagates cleanly)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 01: Graceful Degradation & Compatibility Matrix (Tracer) Summary

**Capability-probing + guarded ElementInternals attach proven end-to-end on am-input: four independently-memoized feature probes and an attachInternalsSafe() chokepoint let the component construct/connect/render below the Safari 16.4 floor while staying byte-identical above it.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-27T22:42:00Z
- **Completed:** 2026-08-27T22:50:26Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- Built `capabilities.ts`: four independently-memoized boolean probes mirroring `lazy-load.ts`'s off-CEM header discipline and `??=` memoize-once idiom, plus `__resetCapabilitiesForTest()`.
- Built `attachInternalsSafe()`: the guarded-attach chokepoint every later form component reuses — returns `null` below the floor and on a caught attach throw, never throwing.
- Wired the seam into `am-input` (the hardest single component: `setFormValue` + two `setValidity` sites + a `ValidationController`), widening `internals` to `ElementInternals | null` and null-safing every call site; validation.ts's accessor type widened to match.
- Proved the whole slice: capability-off constructor-no-throw test for am-input, independent-probe COMPAT-01 edge suite, all existing above-floor input specs green, `tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: capabilities.ts + attachInternalsSafe() + wire into am-input (tracer, end-to-end)** - `87d718c` (feat)
2. **Task 2: independent-probe test suite for capabilities.ts (COMPAT-01 edges)** - `3b70be3` (test)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/internal/helpers/capabilities.ts` (created) - Four memoized runtime feature probes + reset-for-test hook.
- `src/internal/helpers/attach-internals-safe.ts` (created) - Guarded ElementInternals attach returning null below the floor.
- `test/capabilities-off-constructor.test.ts` (created) - am-input constructs/renders without throwing when form association is forced absent.
- `test/capabilities.test.ts` (created) - COMPAT-01 default/off/adjacency/memoization probe suite.
- `src/components/input/input.ts` (modified) - Import + use attachInternalsSafe; `internals: ElementInternals | null`; null-safe setFormValue/setValidity.
- `src/internal/controllers/validation.ts` (modified) - `ValidationControllerOptions.internals` widened to `() => ElementInternals | null`; `_nativeMessage` uses optional chaining.
- `test/setup.ts` (modified) - Deviation: stub `setFormValue` on the jsdom global `ElementInternals.prototype` (see Deviations).

## Decisions Made
- Kept the production probe expression exactly as the plan specified (three-part `hasFormAssociation` including `'setFormValue' in globalThis.ElementInternals.prototype`) so the rollout plans inherit an unchanged probe contract; the jsdom mismatch was reconciled in test setup rather than by weakening the probe.
- `attachInternalsSafe` catches an attach-time throw in addition to gating on the probe, covering a partial engine that exposes the method but still rejects the attach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stub `setFormValue` on jsdom's global `ElementInternals.prototype` in test/setup.ts**
- **Found during:** Task 1 (wiring am-input through the guarded-attach seam)
- **Issue:** The plan's read-first note asserted `hasFormAssociation()` would read as true in the default jsdom lane because `globalThis.ElementInternals.prototype` exposes `setFormValue`. Empirically (vitest jsdom, jsdom ^29) the global `ElementInternals` exists but its prototype does NOT have `setFormValue` — so the plan's literal probe returned `false` by default. That sent every jsdom spec below-floor, short-circuiting `attachInternalsSafe()` to null, which would have regressed the existing above-floor validation spec (it reaches native `validationMessage` through the mock internals). This directly violated must_have truth #4 (above-floor byte-identical, existing specs green).
- **Fix:** Added a guarded block in `test/setup.ts` that defines a no-op `setFormValue` on the jsdom global `ElementInternals.prototype` when absent, so the jsdom lane honestly advertises the form-association capability the `MockElementInternals` (already returned by the `attachInternals` override) actually implements. The production probe was left exactly as specified. The capability-off specs delete the whole `globalThis.ElementInternals` to force the below-floor path deterministically.
- **Files modified:** test/setup.ts
- **Verification:** `test/components/input.test.ts` (above-floor validation specs) stays green; `test/capabilities-off-constructor.test.ts` still forces the below-floor path via global deletion; `tsc --noEmit` clean.
- **Committed in:** 87d718c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — test-environment fidelity, no production behavior change).
**Impact on plan:** Necessary to satisfy the plan's own above-floor byte-identical contract against the real jsdom version; production probe unchanged, so the Plans 04/05/06 probe contract is preserved. No scope creep.

## Issues Encountered
- The worktree was created without `node_modules`; created a directory junction to the main repo's `node_modules` so the vitest/tsc verification could run in-worktree. (Runtime/tooling only — no source impact.)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The capability-probing + guarded-attach architecture is proven end-to-end on am-input. Plans 04/05/06 can now mechanically roll `attachInternalsSafe()` out to the remaining 15 form-associated components, each adding its own batch-scoped `capabilities-off-constructor.batch-*.test.ts` (no shared-file merge collisions).
- No blockers. `hasAdoptedStyleSheets()` and `supportsHas()` return false in the jsdom lane by design (jsdom lacks both); any consumer of those probes should be validated in the browser lane.

## Self-Check: PASSED

- Files verified on disk: capabilities.ts, attach-internals-safe.ts, capabilities-off-constructor.test.ts, capabilities.test.ts, 10-01-SUMMARY.md — all FOUND.
- Commits verified in git log: `87d718c` (feat), `3b70be3` (test), `a967a0c` (docs) — all present.
- Plan verification re-run: `npx vitest run --project jsdom test/capabilities.test.ts test/capabilities-off-constructor.test.ts test/components/input.test.ts` → 12 passed; `npx tsc --noEmit` → exit 0.

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
