---
phase: 10-graceful-degradation-compatibility-matrix
plan: 02
subsystem: infra
tags: [web-components, forms, elementinternals, packaging, changeset, tree-shaking, compat]

# Dependency graph
requires:
  - phase: 10-graceful-degradation-compatibility-matrix
    provides: "COMPAT-03 requirement scope (opt-in hidden-input Light-DOM form-participation fallback, [CS] item)"
provides:
  - "src/internal/helpers/form-participation.ts — standalone hidden-input Light-DOM form-participation fallback (idempotent mirror, teardown, one-time below-floor warn, opt-in flag)"
  - "@willramanand/amris/compat-forms — published opt-in side-effect subpath that enables the fallback below the ElementInternals floor"
  - "package.json exports['./compat-forms'] + sideEffects entry, vite.config.ts build entry, smoke-pack resolution-matrix entry, minor Changeset"
affects: [10-04, 10-05, 10-06]

# Actuals (#2632)
actuals:
  tokens: 4100
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Off-CEM-surface internal helper (registers no custom element, never re-exported from index barrels, tree-shaken from consumer bundles) — mirrors lazy-load.ts"
    - "Global side-effect opt-in via a dedicated package subpath (index.ts/index.all.ts stay byte-frozen; invisible to the CEM surface-diff gate)"

key-files:
  created:
    - src/internal/helpers/form-participation.ts
    - src/compat-forms.ts
    - test/form-participation.test.ts
    - test/compat-forms.test.ts
    - .changeset/compat-forms-fallback.md
  modified:
    - package.json
    - vite.config.ts
    - scripts/smoke-pack.mjs

key-decisions:
  - "Published the @willramanand/amris/compat-forms opt-in subpath now (blocking-human decision at Task 2 resolved 'publish') — the one [CS] one-way-door item this milestone"
  - "form-participation.ts is deliberately capabilities.ts-agnostic — the XOR gate (fallback only when ElementInternals form-association is absent) is the caller's responsibility (Plans 04/05/06), keeping this module testable standalone"
  - "Hidden input is a light-DOM child of the host (host.appendChild), never the shadow root, so the native <form>/FormData serializes it (proven by the am-search-field shadow-input non-association finding)"
  - "Plain document.createElement('input') + property/attribute assignment only — no HTML-string parsing, no dynamic eval (CLAUDE.md Lit-safe constraint); compat-forms.ts imports no Lit"

patterns-established:
  - "Per-host WeakMap mirror tracking for idempotent find-or-create of a Light-DOM node (no duplicate append on re-sync, GC-safe teardown)"
  - "Module-level one-time global dedup guard for below-floor developer console warnings, with a test-only reset export"

requirements-completed: [COMPAT-03]

coverage:
  - id: D1
    description: "form-participation.ts hidden-input mirror mechanics — idempotent attach, native FormData serialization, leak-free teardown, one-time global below-floor warn, opt-in enable/reset toggling"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/form-participation.test.ts (5 scenarios: idempotent attach, FormData parity, teardown/no-leak, dedup warn, enable/reset)"
        status: pass
    human_judgment: false
  - id: D2
    description: "@willramanand/amris/compat-forms opt-in subpath — builds, emits dist/compat-forms.js + .d.ts, resolves via exports, activates isFormFallbackEnabled() purely as an import side effect; ships with a minor Changeset; no CEM contract-doc drift"
    requirement: COMPAT-03
    verification:
      - kind: unit
        ref: "test/compat-forms.test.ts#flips isFormFallbackEnabled() true purely on import"
        status: pass
      - kind: integration
        ref: "npm run build (emits dist/compat-forms.js + dist/compat-forms.d.ts); npx tsc --noEmit clean; git diff --exit-code docs/contract.md (no drift)"
        status: pass
    human_judgment: false

# Metrics
duration: ~50 min
completed: 2026-08-27
status: complete
---

# Phase 10 Plan 02: Graceful Degradation — COMPAT-03 Hidden-Input Form Fallback Summary

**Standalone hidden-input Light-DOM form-participation fallback (`form-participation.ts`) plus its published opt-in `@willramanand/amris/compat-forms` side-effect subpath — the one `[CS]` one-way-door item of the milestone, confirmed via a blocking-human reversibility gate before publication.**

## Performance

- **Duration:** ~50 min (includes the blocking-human decision gate wait)
- **Completed:** 2026-08-27T23:38:16Z
- **Tasks:** 3 (Task 1 tracer, Task 2 blocking-human decision gate, Task 3 publish)
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `form-participation.ts`: idempotent hidden-input mirror (find-or-create via per-host WeakMap — exactly one input on repeat sync), light-DOM append so native `FormData` serializes it, leak-free teardown, one-time globally-deduped below-floor `console.warn`, and the opt-in `enableFormFallback()`/`isFormFallbackEnabled()` flag — all proven standalone in jsdom (5/5 tests) with zero dependency on `capabilities.ts` or any component.
- Published the `@willramanand/amris/compat-forms` opt-in subpath: `src/compat-forms.ts` (side-effect-only, no Lit import), `package.json` `exports` + `sideEffects`, `vite.config.ts` top-level build entry, `scripts/smoke-pack.mjs` resolution-matrix entry, and a minor Changeset. `npm run build` emits `dist/compat-forms.js` + `.d.ts`; `isFormFallbackEnabled()` flips true purely on import; `docs/contract.md` shows no CEM drift.
- The blocking-human reversibility gate (Task 2) was surfaced to the coordinator and resolved "publish" before Task 3 made the one-way-door subpath live.

## Task Commits

1. **Task 1: form-participation.ts — hidden-input mirror, teardown, dedup warn (standalone tracer)** - `13166e6` (feat)
2. **Task 2: blocking-human decision gate (publish vs defer)** - resolved "publish" by the coordinator; no commit (decision checkpoint)
3. **Task 3: publish the compat-forms opt-in subpath — entry module, packaging, smoke matrix, Changeset** - `47d1c0e` (feat)

## Files Created/Modified
- `src/internal/helpers/form-participation.ts` - Hidden-input Light-DOM form-participation fallback (mirror/teardown/dedup-warn/opt-in flag), off the frozen CEM surface
- `src/compat-forms.ts` - Side-effect-only opt-in entry calling `enableFormFallback()`; imports no Lit; re-exports nothing
- `test/form-participation.test.ts` - 5 jsdom specs proving the fallback mechanics standalone
- `test/compat-forms.test.ts` - Import-side-effect assertion (flag flips true purely on import)
- `.changeset/compat-forms-fallback.md` - Minor bump documenting the opt-in below-floor-only fallback
- `package.json` - Added `exports['./compat-forms']` and the `./dist/compat-forms.js` sideEffects entry
- `vite.config.ts` - Added the top-level `compat-forms` `build.lib.entry`
- `scripts/smoke-pack.mjs` - Added `${PKG}/compat-forms` to the packed-tarball resolution matrix

## Decisions Made
- **Publish now (D-01 one-way door):** the Task 2 blocking-human gate resolved "publish"; the subpath name/shape is now a published contract.
- **Capabilities-agnostic module:** `form-participation.ts` makes no capability probe; the XOR gate lives in the calling components (Plans 04/05/06). This keeps the module standalone-testable and free of the COMPAT-01 dependency.
- **Light-DOM host child, plain DOM only:** the mirror is `host.appendChild`ed (never the shadow root) and built with `document.createElement` + property assignment — no HTML-string parsing / eval (Lit-safe constraint).

## Deviations from Plan

None - plan executed exactly as written.

The only Task-1 acceptance detail worth noting: the `grep -v '^\s*//' ... | grep -c 'innerHTML\|eval('` criterion also scans block-comment (` * `) lines, so the JSDoc was worded to avoid the literal tokens (`no HTML-string parsing, no dynamic code evaluation`) — the criterion returns 0 as required. This is authoring wording, not a functional change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- COMPAT-03 mechanics + packaging are landed and green. Plans 04/05/06 can now wire the fallback into the 16 form components behind the XOR gate (`!hasFormAssociation()`), combined with the COMPAT-02 guarded-attach rollout, and add the real-browser `FormData`-parity / no-double-submit specs (WebKit/FF/Chromium).
- The below-floor XOR invariant and native `required`/`pattern` blocking are intentionally NOT proven in this plan (jsdom cannot; the caller-side gate does not yet exist) — they are must_have truths for Plans 04/05/06's browser lane.
- One pending Changeset (`.changeset/compat-forms-fallback.md`) awaits the milestone `changeset version` at release time.

## Self-Check: PASSED

- Created files verified on disk: `src/internal/helpers/form-participation.ts`, `src/compat-forms.ts`, `test/form-participation.test.ts`, `test/compat-forms.test.ts`, `.changeset/compat-forms-fallback.md`, `10-02-SUMMARY.md`.
- Commits verified in git log: `13166e6` (Task 1), `47d1c0e` (Task 3), `acd7d63` (SUMMARY).
- Verifications green: `npx vitest run --project jsdom test/form-participation.test.ts test/compat-forms.test.ts` (6/6), `npm run build` (emits `dist/compat-forms.js` + `.d.ts`), `npx tsc --noEmit` (clean), `git diff --exit-code docs/contract.md` (no drift).

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-27*
