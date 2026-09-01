---
phase: 08-bundle-size-deferral
plan: 01
subsystem: infra
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, lit, overlays, size-limit]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    provides: "re-scoped brotli size metric (size-baseline.mjs + api/size.baseline.json counting @floating-ui/dom), no-bundled-Lit assertion, browser/perf Vitest lanes"
provides:
  - "src/internal/helpers/lazy-load.ts — shared module-level promise-memoized loaders (loadFloating/prefetchFloating/loadVirtualizer/prefetchVirtualizer) that every later overlay/virtualizer migration consumes"
  - "FloatingPositionController deferred end-to-end: start() awaits loadFloating() then arms autoUpdate; middleware getter receives the loaded module; close-during-load guarded"
  - "popover fully deferred: static floating-ui import dropped, arrow built from the loaded module, prefetch-on-intent, hidden-until-positioned reveal"
  - "SIZE-03 registration-smoke canary + Pitfall F1 no-0,0-frame browser specs"
  - "report-only 'popover (overlay deep import)' size entry + re-written brotli baseline"
affects: [08-02, 08-03, 08-04, 08-05, 08-06, 08-07, tooltip, combobox, select, color-picker, rich-select, data-grid, virtualizer]

# Actuals (#2632)
actuals:
  tokens: 4200
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level promise-memoized dynamic import() (`promise ??= import('bare-specifier')`) at the src/internal/ chokepoint — dep stays external, fetched/parsed once"
    - "Async positioning seam: await the deferred module before first computePosition, arm autoUpdate after; generation-token guard abandons a superseded (close-during-load) start()"
    - "Hidden-until-positioned reveal gate (visibility:hidden until first computePosition writes left/top) to eliminate the 0,0 flash across the loader gap"
    - "Backward-compatible controller middleware option: Middleware[] | ((mod) => Middleware[]) so overlays migrate off their static floating-ui import one plan at a time"

key-files:
  created:
    - src/internal/helpers/lazy-load.ts
    - test/browser/registration-smoke.test.ts
    - test/browser/overlay-no-zero-frame.test.ts
  modified:
    - src/internal/controllers/floating-position.ts
    - src/components/popover/popover.ts
    - test/browser/floating-position.test.ts
    - .size-limit.json
    - api/size.baseline.json

key-decisions:
  - "Controller `middleware` option is a union (Middleware[] | mod-getter), not a hard type-swap, so combobox/select (static arrays) and tooltip (zero-arg getter) keep compiling until their own migration plans — surface-preserving, build stays green"
  - "Added a generation-token guard to the now-async start() so a close-during-load never arms a dangling autoUpdate loop (correctness requirement of the async seam)"
  - "popover reveal gated on first computePosition via a non-reflected @state + .positioned class + visibility toggle (off the CEM surface)"
  - "popover overlay size entry limit set to 12 kB (measured 9719 B) — comfortable, report-only, non-red"

patterns-established:
  - "Shared deferred loader is the single floating-ui/virtualizer chokepoint for the whole phase"
  - "Per-overlay no-0,0-frame browser spec is the Pitfall F1 guard for each migrated overlay"

requirements-completed: [SIZE-01, SIZE-03]

coverage:
  - id: D1
    description: "floating-ui deferred end-to-end on the popover path (shared memoized loader + async controller + popover); positioning byte-for-byte behavior-preserving in real Chromium; no static runtime @floating-ui/dom import remains on the popover path"
    requirement: SIZE-01
    verification:
      - kind: e2e
        ref: "test/browser/floating-position.test.ts#positions an opened popover with a non-zero, viewport-anchored rect offset from its trigger"
        status: pass
      - kind: e2e
        ref: "test/browser/floating-position.test.ts#preserves focus on the trigger after the async open (ordering contract intact)"
        status: pass
      - kind: other
        ref: "npm run build (tsc strict + vite) — only type-only + dynamic loader imports of @floating-ui/dom remain; grep confirms controller chunk references floating-ui ONLY via import()"
        status: pass
      - kind: other
        ref: "npm run diff:surface — CEM/public surface unchanged"
        status: pass
    human_judgment: false
  - id: D2
    description: "SIZE-03 registration canary — imported components still call customElements.define at runtime after the chunk-graph shift"
    requirement: SIZE-03
    verification:
      - kind: e2e
        ref: "test/browser/registration-smoke.test.ts#registers am-popover/am-select/am-data-grid after import"
        status: pass
      - kind: other
        ref: "node scripts/assert-no-bundled-lit.mjs — zero inlined-Lit markers (Lit still external)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pitfall F1 no-0,0-frame invariant — popover panel never painted visible-while-unpositioned across the async loader gap (hidden-until-positioned, D-02)"
    requirement: SIZE-01
    verification:
      - kind: e2e
        ref: "test/browser/overlay-no-zero-frame.test.ts#never paints the popover panel visible while unpositioned across the async loader gap"
        status: pass
    human_judgment: false
  - id: D4
    description: "Report-only overlay deep-import size entry + re-written brotli baseline making the SIZE-01 deferral legible (report-only)"
    requirement: SIZE-01
    verification:
      - kind: other
        ref: "node scripts/size-baseline.mjs --check — exit 0 (report-only); popover overlay entry present; floating-ui excluded from popover deep-import initial size (9719 B)"
        status: pass
      - kind: other
        ref: "npx size-limit — all entries pass (popover 9.72 kB < 12 kB limit)"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 01: Floating-UI Deferral Tracer (Popover Path) Summary

**@floating-ui/dom moved off the popover overlay's synchronous graph into a shared memoized dynamic import() — controller awaits it before first positioning, popover prefetches on intent and stays hidden-until-positioned, with the SIZE-03 registration canary and Pitfall F1 no-0,0-frame guard standing up in the browser lane.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-22T23:07:00Z
- **Completed:** 2026-08-22T23:25:09Z
- **Tasks:** 3
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments
- Created `src/internal/helpers/lazy-load.ts` — the phase's shared, module-level promise-memoized loader (`loadFloating`/`prefetchFloating`/`loadVirtualizer`/`prefetchVirtualizer`); bare static `import()` specifiers keep both deps external; concurrent first-opens dedupe to one import.
- Converted `FloatingPositionController` to defer floating-ui end-to-end: `start()` is now async and awaits `loadFloating()` before the first `computePosition`, arming `autoUpdate` only after; the `middleware` getter receives the loaded module so hosts build `arrow`/`size` from it.
- Migrated popover fully off its static floating-ui import: `arrow` built from the loaded module, `prefetchFloating()` hung off trigger `pointerenter`/`focus`, and a hidden-until-positioned reveal gate that eliminates the 0,0 flash across the loader gap.
- Stood up the SIZE-03 registration-smoke canary and the Pitfall F1 no-0,0-frame browser spec; extended the positioning spec with a focus-ordering assertion.
- Added a report-only `popover (overlay deep import)` size entry and re-wrote the brotli baseline; empirically confirmed floating-ui is referenced only via dynamic `import()` on the popover path.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): End-to-end floating-ui deferral — loader + controller + popover** — `706dacb` (feat)
2. **Task 2: SIZE-03 registration canary + no-0,0-frame invariant spec** — `64ba99e` (test)
3. **Task 3: Report-only overlay size entry + re-baseline** — `a887122` (chore)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified
- `src/internal/helpers/lazy-load.ts` (new) — shared memoized dynamic-import loaders for floating-ui + virtualizer.
- `src/internal/controllers/floating-position.ts` — async `start()` awaiting the loader; module-receiving middleware; `_startToken` close-during-load guard; base stack built from `mod.*`.
- `src/components/popover/popover.ts` — dropped static `arrow` import; `mod.arrow(...)` middleware; prefetch on intent; `_positioned` state + `.positioned`/`visibility` reveal gate.
- `test/browser/registration-smoke.test.ts` (new) — SIZE-03 `customElements.get()` canary for popover/select/data-grid.
- `test/browser/overlay-no-zero-frame.test.ts` (new) — polls frames across the loader gap; asserts never-visible-while-unpositioned + revealed non-(0,0) rect.
- `test/browser/floating-position.test.ts` — added focus-preserved-across-async-open assertion.
- `.size-limit.json` — one report-only `popover (overlay deep import)` entry (12 kB limit).
- `api/size.baseline.json` — re-written brotli baseline (report-only).

## Decisions Made
- **Union middleware option instead of a hard type-swap** — keeps the build green for the not-yet-migrated overlays; see Deviation 1.
- **Generation-token guard on async `start()`** — prevents a dangling autoUpdate after a close-during-load; see Deviation 2.
- **Hidden-until-positioned via non-reflected `@state`** — keeps the reveal gate off the frozen CEM surface (`diff:surface` clean).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Controller `middleware` option kept as a backward-compatible union, not a hard type-swap**
- **Found during:** Task 1
- **Issue:** The plan said to change the `middleware` option type from `Resolvable<Middleware[]>` to `(mod) => Middleware[]`. A strict swap breaks `tsc`: `combobox` and `select` pass a static `Middleware[]` array and are NOT migrated in 08-01 (they migrate in 08-02), so their call sites would no longer typecheck and `npm run build` would fail.
- **Fix:** Made the option `Middleware[] | ((mod: typeof import('@floating-ui/dom')) => Middleware[])`, resolved at runtime (`typeof mw === 'function' ? mw(mod) : mw ?? []`). popover uses the new mod-getter; combobox/select (arrays) and tooltip (zero-arg getter, structurally assignable to the mod-getter arm) keep compiling and behaving identically until their own plans migrate them.
- **Files modified:** src/internal/controllers/floating-position.ts
- **Verification:** `npm run build` green; combobox/select/tooltip jsdom tests pass (73/73); `diff:surface` clean (internal, non-CEM).
- **Committed in:** 706dacb

**2. [Rule 2 - Missing Critical] Generation-token guard for the now-async `start()`**
- **Found during:** Task 1
- **Issue:** Making `start()` async introduced a close-during-load race: a `stop()` during the `await loadFloating()` gap would still fall through and arm `autoUpdate` after the overlay had already closed — a dangling reposition loop while closed (observable behavior change).
- **Fix:** Added a monotonic `_startToken` incremented on every `start()`/`stop()`; an in-flight `start()` captures the token before awaiting and abandons its run if superseded.
- **Files modified:** src/internal/controllers/floating-position.ts
- **Verification:** browser positioning + focus specs pass; full browser lane 77/77 pass.
- **Committed in:** 706dacb

**3. [Rule 1 - Plan assumption correction] Full-bundle brotli did NOT drop in 08-01 (expected; RESEARCH A2 confirmed)**
- **Found during:** Task 3
- **Issue:** Task 3's acceptance criterion expected the `full bundle` initial brotli to DROP versus the pre-deferral baseline. Measured, it rose 59752 → 61357 B (+1605). Root cause: 08-01 migrates ONLY the popover path; the other five overlays (tooltip/combobox/select/color-picker/rich-select) still statically import floating-ui, so the full-bundle win cannot materialize until 08-02/08-03. This is exactly RESEARCH assumption A2 (flagged low-confidence) resolving against a single-overlay tracer.
- **Fix:** No code fix — reconciled the criterion with measured reality. The deferral win IS real and proven on the popover PATH: the controller chunk references `@floating-ui/dom` ONLY via `import("@floating-ui/dom")` (no static import), so floating-ui is excluded from the popover deep-import initial size (9719 B). Re-wrote the baseline honestly (report-only, never fails the build) and set the popover entry limit to 12 kB (measured 9719 B) for a comfortable non-red build.
- **Files modified:** .size-limit.json, api/size.baseline.json
- **Verification:** `size-baseline.mjs --check` exit 0; `npx size-limit` all pass; `assert-no-bundled-lit` zero markers; dynamic-only floating-ui confirmed by grep of the controller chunk.
- **Committed in:** a887122

---

**Total deviations:** 3 (1 blocking build fix, 1 missing-critical correctness guard, 1 documented acceptance-criterion reconciliation)
**Impact on plan:** No scope creep. Deviations 1–2 are direct consequences of the deferral mechanics (staged migration + async seam) and are essential for a green, behavior-preserving build. Deviation 3 documents that the aggregate size win lands progressively across 08-02/08-03; the tracer's own win (floating-ui off the popover synchronous graph) is proven.

## Issues Encountered
- **Pre-existing, out-of-scope test failure (NOT a regression):** `test/perf/_spike.lit-markers.test.ts` fails in this worktree with `missing Lit source fixture: node_modules/@lit/reactive-element/reactive-element.js`. The `_spike.` test `readFileSync`s Lit's OWN source from a hardcoded cwd-relative `node_modules/...` path; a parallel-executor worktree has an empty local `node_modules` (packages resolve from the parent repo, which DOES have the file). It touches no file changed by 08-01. Logged in `08-bundle-size-deferral/deferred-items.md` with a worktree-robust follow-up suggestion. All 08-01 deliverables and every other jsdom test pass (599/600; the 1 failure is this spike).

## Known Stubs
None — no stub/placeholder patterns introduced. All new code paths are wired end-to-end (loader → controller → popover → real-browser positioning).

## Threat Surface
No new security surface beyond the plan's `<threat_model>`. The three registered threats are actively mitigated by this plan: T-08-01 (bare static `import()` specifiers only in `lazy-load.ts`), T-08-02 (hidden-until-positioned reveal — a slow/failed chunk fetch shows no broken 0,0 overlay), T-08-03 (registration-smoke spec + no-bundled-Lit assertion, frozen vite `external` untouched). No Threat Flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The shared `lazy-load.ts` loader is in place; 08-02 (tooltip + color-picker) and 08-03 (rich-select) consume it directly, and the combobox/select `size`-middleware migration flips them onto the mod-getter form (the union already supports both).
- The per-overlay no-0,0-frame spec and the registration canary are the templates each subsequent overlay migration extends.
- The aggregate full-bundle/overlay brotli drop is expected to appear as 08-02/08-03 remove the remaining static floating-ui imports; re-check `size-baseline.mjs --check` after each.

## Self-Check: PASSED

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
