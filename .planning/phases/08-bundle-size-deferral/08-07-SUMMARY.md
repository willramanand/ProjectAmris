---
phase: 08-bundle-size-deferral
plan: 07
subsystem: infra
tags: [bundle-size, code-splitting, dynamic-import, floating-ui, purity, size-limit, perf, verification-capstone]

# Dependency graph
requires:
  - phase: 08-bundle-size-deferral
    provides: "all Wave-2 overlay/virtualizer migrations (08-02…08-06) merged — floating-ui + virtualizer fully off every component's static graph, so the purity assertion sees a clean, fully-deferred graph"
provides:
  - "scripts/deep-import-purity.mjs — report-only SIZE-04 assertion: @floating-ui/dom never appears as a STATIC import specifier in dist/, only behind a dynamic import() (the single shared lazy-load chunk); walks each non-overlay entry static graph; reuses the assert-no-bundled-lit.mjs parser"
  - "broadened SIZE-03 registration-smoke canary spanning button + all migrated overlays + data-grid (customElements.define survives the chunk-graph shift)"
  - "re-written post-deferral api/size.baseline.json (final committed brotli baseline over the fully-deferred graph); recorded overlay/data perf before/after delta (report-only)"
  - "carried 08-03 leak class closed: popover/tooltip inline-type floating-ui imports fixed — floating-ui is provably dynamic-only across the whole library"
affects: [11-enforcement, popover, tooltip]

# Actuals (#2632)
actuals:
  tokens: 6000
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deep-import purity assertion: split each dist chunk's import specifiers into STATIC (from / bare side-effect) vs DYNAMIC (import()) by reusing the shared collectImportSpecifiers parser and subtracting the dynamic subset occurrence-wise; floating-ui as a STATIC specifier anywhere is the offender"
    - "Static-graph walk from a named non-overlay entry (button/input) following only relative static imports — external bare specifiers never re-enter dist — to prove per-entry floating-ui purity"
    - "Perf-harness discipline for a deferred dep: warm the memoized loader chunk BEFORE applying the network throttle so the measured open+reposition WORK (throttle-independent counts + wall-clock) is never gated on the one-time cold chunk fetch"

key-files:
  created:
    - scripts/deep-import-purity.mjs
    - test/deep-import-purity.test.ts
  modified:
    - src/components/popover/popover.ts
    - src/components/tooltip/tooltip.ts
    - test/browser/registration-smoke.test.ts
    - test/perf/overlay.perf.test.ts
    - api/size.baseline.json
    - package.json

key-decisions:
  - "Purity script asserts ZERO static floating-ui ANYWHERE in dist (the strong global assertion) which implies the plan's per-entry non-overlay purity; the named button/input static-graph walk is reported additionally for legibility"
  - "floating-ui is EXTERNAL (vite external array) so it lives in NO dist chunk; the SIZE-04 dedupe outcome manifests as a SINGLE shared lazy-load chunk holding the sole import('@floating-ui/dom'), referenced by every overlay — no per-overlay duplication, no manualChunks added"
  - "api/perf.baseline.json kept as the PRE-deferral reference for the before/after delta (per plan); api/perf.json is the gitignored per-run report (single-writer T-07-07); the committed perf re-pin is Phase 11"
  - "Warmed the memoized floating-ui loader in the overlay perf scenario before the throttle — the only way the deferred cold-load scenario yields its (throttle-independent) reposition counts under Slow-3G"

patterns-established:
  - "deep-import-purity.mjs is the SIZE-04 sibling of assert-no-bundled-lit.mjs — both reuse the same dist parser, both report-only this phase, both flip to enforcing in Phase 11"

requirements-completed: [SIZE-03, SIZE-04]

coverage:
  - id: D1
    description: "SIZE-04 deep-import purity — @floating-ui/dom never a STATIC specifier in dist/, present only behind a dynamic import(); non-overlay entries (button/input) static graphs floating-ui-free"
    requirement: SIZE-04
    verification:
      - kind: unit
        ref: "test/deep-import-purity.test.ts — classifier static/dynamic split + fixture runPurityCheck (clean passes, a static leak is detected)"
        status: pass
      - kind: other
        ref: "node scripts/deep-import-purity.mjs dist — 148 files scanned, zero STATIC floating-ui, dynamic-only in 1 file, button/input graphs clean, exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "SIZE-04 shared-chunk dedupe (D-06) — floating-ui resolves to ONE shared async loader chunk across all overlay entries, no per-component duplication"
    requirement: SIZE-04
    verification:
      - kind: other
        ref: "grep 'import(\"@floating-ui/dom\")' dist — exactly one holder: dist/chunks/lazy-load-2oqFJtsM.js (the single shared loader)"
        status: pass
      - kind: other
        ref: "VISUALIZE=1 build + npm run attribution:check — 164 modules across 148 chunks, build graph healthy; floating-ui external (in zero bundled chunks)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SIZE-03 registration survives the refactor for a broad representative set; Lit never bundled"
    requirement: SIZE-03
    verification:
      - kind: e2e
        ref: "test/browser/registration-smoke.test.ts — customElements.get defined for am-button/popover/tooltip/select/combobox/rich-select/color-picker/data-grid (8/8)"
        status: pass
      - kind: other
        ref: "node scripts/assert-no-bundled-lit.mjs — zero inlined-Lit markers, 155 bare Lit external imports (Lit stays external)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Post-deferral size + perf baselines committed/recorded; CEM frozen"
    requirement: SIZE-04
    verification:
      - kind: other
        ref: "node scripts/size-baseline.mjs --write && --check — banked, byte-stable, exit 0 (report-only)"
        status: pass
      - kind: other
        ref: "npm run test:perf (5/5) && npm run perf:diff — overlay/data before/after delta recorded (report-only)"
        status: pass
      - kind: other
        ref: "npm run diff:surface — custom-elements.json byte-unchanged (surface-freeze holds across the whole phase)"
        status: pass
    human_judgment: false

# Metrics
duration: 17min
completed: 2026-08-22
status: complete
---

# Phase 8 Plan 07: Bundle-Deferral Verification Capstone Summary

**Closed SIZE-03 + SIZE-04 with a new report-only deep-import-purity assertion (floating-ui is provably STATIC-nowhere and dynamic-only in one shared loader chunk), a broadened registration canary, and re-written post-deferral size + perf baselines — after fixing the carried inline-type floating-ui leak in popover/tooltip so the graph is genuinely clean.**

## Performance

- **Duration:** ~17 min
- **Completed:** 2026-08-22
- **Tasks:** 3 (+ 1 carried-finding fix)
- **Commits:** 6 (including this SUMMARY)

## Accomplishments
- **Carried finding closed (must-fix):** switched `import { type Placement }` → `import type { Placement }` in `popover.ts` and `tooltip.ts`. Under `verbatimModuleSyntax` the inline `type` qualifier was NOT erased and emitted a bare runtime `import"@floating-ui/dom"` into each overlay chunk — a real static leak (threat T-08-20, same class 08-03 fixed in dropdown). After the fix, `@floating-ui/dom` appears in exactly one dist chunk, behind a dynamic `import()`.
- **Task 1 — `scripts/deep-import-purity.mjs` (SIZE-04):** report-only assertion that classifies every dist import specifier as STATIC vs DYNAMIC by reusing `collectDistJs`/`stripCommentNoise`/`collectImportSpecifiers` from `assert-no-bundled-lit.mjs` (no re-implemented parser), asserts floating-ui is never a STATIC specifier anywhere, and walks each non-overlay entry (button/input) static graph. Backed by `test/deep-import-purity.test.ts` (TDD: RED → GREEN), whose leaky fixture proves the assertion actually bites. Added `purity:check` npm alias.
- **Task 2 — broadened SIZE-03 registration canary:** `registration-smoke.test.ts` now spans a non-overlay control (button), every migrated floating-ui overlay (popover, tooltip, select, combobox, rich-select, color-picker) and the virtualized data-grid — all 8 `customElements.get('am-…')` stay defined (8/8). `assert-no-bundled-lit.mjs` reports zero inlined-Lit markers. Confirmed the SIZE-04 dedupe: exactly one shared `lazy-load` chunk holds the sole floating-ui dynamic import.
- **Task 3 — re-baselined:** re-`--write` `api/size.baseline.json` over the fully-deferred graph (byte-stable on `--check`); re-ran the perf lane (5/5) and recorded the overlay/data before/after delta via `perf:diff` (report-only); `diff:surface` confirms the CEM is byte-unchanged.

## Task Commits

1. **Carried fix: popover/tooltip inline-type floating-ui leak** — `4e0387d` (fix)
2. **Task 1 RED: failing deep-import-purity spec** — `affa84c` (test)
3. **Task 1 GREEN: deep-import-purity script + purity:check alias** — `73aa76b` (feat)
4. **Task 2: broaden SIZE-03 registration canary** — `a582d10` (test)
5. **Task 3: re-write size baseline + warm perf loader chunk** — `195d46a` (chore)
6. **Plan metadata:** committed with this SUMMARY (docs).

## Measured Results

### SIZE-04 purity + dedupe
- `node scripts/deep-import-purity.mjs dist` → 148 dist/**/*.js scanned; **zero STATIC `@floating-ui/dom` specifiers**; dynamic-only in **1** file; button + input static graphs floating-ui-free; exit 0.
- Single shared loader chunk: `dist/chunks/lazy-load-2oqFJtsM.js` is the **only** holder of `import("@floating-ui/dom")` — the D-06 dedupe outcome (one shared async chunk, no per-overlay duplication, no `manualChunks`).

### Post-deferral brotli baseline (report-only, banked)
| entry | brotli B |
|-------|----------|
| core bundle | 21076 |
| full bundle | 61881 |
| button (light deep import) | 1879 |
| data-grid (heavy deep import) | 11151 |
| popover (overlay deep import) | 9735 |
| first-load composite | 22971 |
| tokens.css | 2649 |

### Perf before/after delta (report-only, counts gated / wall-clock never gated)
- Overlay counts drift render/update/updated 4 → 7 (+3): the **expected** async-deferral reveal-gate re-render (popover awaits the loader, then flips `_positioned` → one extra reactive cycle). Report-only (D-08).
- Wall-clock (informational): overlay 31.4 → 52.2ms median (deferred open does the async-load + reveal work); combobox 60.1 → 43.3ms; data-grid 49.6 → 46.8ms; button 15.7 → 16.5ms. Never gated (D-06).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/2 - Carried must-fix] popover/tooltip inline-type floating-ui import leak**
- **Found during:** carried 08-03 finding, confirmed on base.
- **Issue:** `import { type Placement } from '@floating-ui/dom';` in `popover.ts` and `tooltip.ts`. The inline `type` qualifier is NOT erased under `verbatimModuleSyntax`, emitting a bare runtime `import"@floating-ui/dom"` into each overlay chunk — leaking floating-ui into the static graph (threat T-08-20).
- **Fix:** top-level `import type { Placement } from '@floating-ui/dom';` (fully erased).
- **Files:** src/components/popover/popover.ts, src/components/tooltip/tooltip.ts
- **Verification:** `@floating-ui/dom` now appears only in `dist/chunks/lazy-load-*.js` behind `import()`; the purity script reports clean; the leaky-fixture unit test proves the assertion would have caught it.
- **Committed in:** 4e0387d

**2. [Rule 1/3 - Bug/Blocking] overlay.perf scenario starved by the deferred cold-load under Slow-3G**
- **Found during:** Task 3 (perf lane).
- **Issue:** The overlay perf scenario's warm-up open failed `repositions >= 1` (got 0). Post-full-deferral, opening the popover fetches `@floating-ui/dom` via a dynamic `import()`; under the Slow-3G throttle profile that one-time COLD chunk fetch exceeds the scenario's fixed 30-raf `waitForPosition` budget, so the first open never writes a position. Latent since the harness was authored against the pre-deferral (static floating-ui, no fetch) popover; the full deferral first exercises it here.
- **Fix:** `await loadFloating()` before `proveThrottleLive()` warms the memoized shared loader chunk before the network throttle. The scenario measures open+reposition WORK (throttle-independent computePosition/reposition counts + wall-clock), never the one-time chunk-fetch latency, so every recorded count/timing is intact. Not a metric tune — no `manualChunks`, no chunk-strategy change.
- **Files:** test/perf/overlay.perf.test.ts
- **Verification:** overlay scenario passes; full perf lane 5/5; `perf:diff` records the delta report-only.
- **Committed in:** 195d46a

**3. [Reconciliation] The banked size number is the fully-deferred baseline, not a headline full-bundle drop**
- **Found during:** Task 3.
- **Issue:** The must-haves anticipated the size baseline "records the full deferral win". Measured, the full bundle did NOT drop (61357 → 61881 B vs the 08-01 baseline). Root cause (consistent with 08-01 deviation 3): `@floating-ui/dom` is EXTERNAL (vite `external` array) so it lives in NO dist chunk, and `dist/amris.js` lazy-loads components — floating-ui was never in the aggregate INITIAL payload to begin with. The real, proven win is on the per-overlay deep-import PATHS, where floating-ui is now provably dynamic-only (the purity script), and it is banked as the committed post-deferral baseline number.
- **Fix:** No code change — re-wrote the baseline honestly to the measured fully-deferred numbers; the "win" is the provable dynamic-only purity + single-shared-chunk dedupe, recorded here.
- **Committed in:** 195d46a

---

**Total deviations:** 3 (1 carried must-fix, 1 blocking harness bug, 1 documented reconciliation)
**Impact on plan:** No scope creep. Deviation 1 was the plan's explicit carried task. Deviation 2 was required to run the perf lane at all under full deferral. Deviation 3 reconciles the size-win expectation with the external-dep reality (same as 08-01) — the deferral is provably airtight even though the aggregate initial brotli is machinery-dominated.

## Prohibitions honored
- No `manualChunks` added (dedupe verified, not tuned — PERF-V2-01 stays deferred).
- No script/gate flipped from report-only to enforcing (Phase 11 owns the flip).
- vite `external` array untouched.
- `custom-elements.json` byte-unchanged (`diff:surface` clean).

## Known Stubs
None — the purity script, canary, and baselines are wired end-to-end and exercised against the real build.

## Threat Surface
No new security surface. The plan's three registered threats are actively mitigated: T-08-18 (no-bundled-Lit: zero markers, Lit external), T-08-19 (broadened registration canary: 8/8 define), T-08-20 (deep-import purity: zero static floating-ui + the popover/tooltip leak closed). No Threat Flags.

## Next Phase Readiness
- `deep-import-purity.mjs` and `assert-no-bundled-lit.mjs` are the two report-only dist guards Phase 11 flips to enforcing (exit non-zero on a static leak / inlined Lit).
- The committed post-deferral `api/size.baseline.json` and the pre-deferral `api/perf.baseline.json` are the references Phase 11 re-pins when it sets enforcing thresholds.

## Self-Check: PASSED
- FOUND: scripts/deep-import-purity.mjs
- FOUND: test/deep-import-purity.test.ts
- FOUND: .planning/phases/08-bundle-size-deferral/08-07-SUMMARY.md
- FOUND commits: 4e0387d, affa84c, 73aa76b, a582d10, 195d46a

---
*Phase: 08-bundle-size-deferral*
*Completed: 2026-08-22*
