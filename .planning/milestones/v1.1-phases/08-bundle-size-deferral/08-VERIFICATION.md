---
phase: 08-bundle-size-deferral
verified: 2026-08-22T00:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
warnings:
  - finding: "lazy-load.ts memoizes with `??=`, caching a REJECTED import() promise"
    source: "08-REVIEW.md (Critical, advisory/non-blocking)"
    impact: "A transient chunk-load failure of the shared floating-ui/virtualizer chunk permanently bricks positioning/virtualization for the page lifetime with no retry — a NEW failure mode introduced by moving from static bundling to dynamic import(). Happy-path behavior (all 610 jsdom + 88 browser tests) is preserved, so no must-have's tested assertion fails; the concern is on an untested chunk-load-failure path only."
    affects: "SIZE-01/SIZE-02 'behavior-preserving / dependable' spirit on the failure path — not on any tested path."
    recommendation: "Surface for developer decision: null the cache on rejection (retry-on-next-open) before v1.1 ship. Non-blocking for Phase 8 goal achievement."
---

# Phase 8: Bundle-Size Deferral Verification Report

**Phase Goal:** First-load and per-entry payloads shrink because the real shipped heavy deps (`@floating-ui/dom`, `@lit-labs/virtualizer`) load only when actually needed — behavior-preserving across all consumers — and the win is provable in the re-scoped size metric with no cross-entry duplication regressions.
**Verified:** 2026-08-22
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SIZE-01: `@floating-ui/dom` loads via memoized dynamic `import()` gated on first overlay open (in `floating-position.ts`); all 6 overlays behave identically; positioning absent from non-overlay entries | ✓ VERIFIED | `loadFloating()` memoized `??= import('@floating-ui/dom')` in `lazy-load.ts:38-40`; `FloatingPositionController.start()` awaits `loadFloating()` before first `computePosition` (`floating-position.ts:118-132`). Dist grep: **zero** static floating-ui specifiers, exactly **one** `import("@floating-ui/dom")` (dynamic) in the whole dist. Purity script: button/input static graphs floating-ui-free. All 6 overlays (popover, tooltip, color-picker, rich-select, combobox, select) migrated; dropdown stays `import type` only. Browser no-zero-frame tests (4 files) assert identical positioning; 88/88 browser lane green. |
| 2 | SIZE-02: `@lit-labs/virtualizer` loads via memoized dynamic `import()` at/above row threshold; data-grid + combobox/select behave identically | ✓ VERIFIED | `loadVirtualizer()` memoized (`lazy-load.ts:59-61`); `virtualize-support.ts` carries **no** static/runtime virtualizer import — reads `virtualizerRef` off host symbol keys (`resolveHostVirtualizer`, lines 143-152). Dist grep: **zero** static virtualizer specifiers, one dynamic `import("@lit-labs/virtualizer/virtualize.js")`. `VIRTUALIZE_ROW_THRESHOLD = 100` with `>` comparison preserved. `virtualize-smoke.test.ts` asserts windowed subset + cold-chunk `repeat()`→`virtualize()` swap (real Chromium, green). |
| 3 | SIZE-03: tree-shaking canary proves imported component still calls `customElements.define`; Lit never bundled | ✓ VERIFIED | `registration-smoke.test.ts` asserts `customElements.get(tag)` for 8 representative components spanning the deferral surface (browser lane green). `assert-no-bundled-lit.mjs` run independently: exit 0, "zero inlined-Lit version markers", 155 bare Lit externals. |
| 4 | SIZE-04: shared-chunk dedupe + per-component deep-import purity verified — no cross-entry duplication | ✓ VERIFIED | `deep-import-purity.mjs` run independently: 148 files scanned, "zero STATIC @floating-ui/dom specifiers anywhere — dynamic-only", both non-overlay entries clean. Both deps resolve to a **single** shared chunk `dist/chunks/lazy-load-2oqFJtsM.js` (dedupe — one chunk across all overlay entries, no per-component duplication). |
| 5 | SIZE-05: non-critical component init deferred off first-load critical path (idle/deferred), behavior-preserving | ✓ VERIFIED | combobox (`_scheduleNonCriticalInit`, double-rAF + `isConnected` guard) and data-grid (`_virtualizerRaf`, double-rAF) defer non-critical init; both cancel the pending rAF on `disconnectedCallback` (teardown-guarded). **No** `requestIdleCallback` anywhere in src (Safari 16.4 floor honored). Dedicated jsdom test `data-grid.test.ts:151` "disconnecting before deferred warm fires does not throw or leak" asserts `_virtualizerRaf === 0` and no swap while disconnected (610/610 jsdom lane green). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/internal/helpers/lazy-load.ts` | Memoized loaders + prefetch + test reset | ✓ VERIFIED | `loadFloating`/`loadVirtualizer` memoized `??=`, `prefetch*` fire-and-forget, `__resetLazyLoadCachesForTest`. Static bare specifiers keep deps external. |
| `src/internal/controllers/floating-position.ts` | Async `start()` awaiting loader; ordering + cancellation | ✓ VERIFIED | `start()` awaits `loadFloating()` before `autoUpdate`; `_startToken` generation counter abandons a close-during-load run (state-transition invariant). |
| `src/internal/helpers/virtualize-support.ts` | Free of static virtualizer runtime import | ✓ VERIFIED | Zero import of `@lit-labs/virtualizer` (only JSDoc mentions); `virtualizerRef` read via host symbol description match + `element()` capability check. |
| `scripts/deep-import-purity.mjs` | Report-only static/dynamic split, non-overlay purity | ✓ VERIFIED | Reuses `collectDistJs`/`stripCommentNoise`/`collectImportSpecifiers`; exits 0 always (report-only, D-08). |
| `test/browser/registration-smoke.test.ts` | Registration canary (8 tags) | ✓ VERIFIED | Asserts define for button + 6 overlays + data-grid. |
| `test/browser/overlay-no-zero-frame*.test.ts` (4) | No 0,0 frame invariant | ✓ VERIFIED | Assert never-visible-while-unpositioned, non-(0,0) rect, anchored below trigger. |
| `test/browser/virtualize-smoke.test.ts` | Windowing + cold-chunk swap | ✓ VERIFIED | Windowed subset, scroll-to-index proxy, select cold `repeat()`→`virtualize()` swap. |
| `.size-limit.json` popover overlay entry | Re-scoped, counts floating-ui | ✓ VERIFIED | `popover (overlay deep import)` entry present; only `lit` ignored (floating-ui counted). |
| `api/size.baseline.json` / `api/perf.json` | Post-deferral re-baseline | ✓ VERIFIED | Rewritten in `195d46a`; popover marginal recorded **-11341 B** (the deferral win). |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `floating-position.ts` `start()` | `lazy-load.ts` `loadFloating()` | `await loadFloating()` before first `computePosition`, then `autoUpdate` | ✓ WIRED |
| overlay components | shared floating chunk | dynamic `import()` → single `dist/chunks/lazy-load-*.js` | ✓ WIRED (deduped) |
| combobox/select/data-grid | virtualizer | `loadVirtualizer().then(m => { this._virtualize = m.virtualize; this.requestUpdate() })` | ✓ WIRED |
| color-picker `_updatePosition` | `loadFloating()` | one-shot `computePosition`, NO `autoUpdate`, NOT via controller (Pitfall CP1) | ✓ WIRED |

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| SIZE-01 | 08-01/02/03/04/05 | ✓ SATISFIED | Truth 1 |
| SIZE-02 | 08-04/05/06 | ✓ SATISFIED | Truth 2 |
| SIZE-03 | 08-01/07 | ✓ SATISFIED | Truth 3 |
| SIZE-04 | 08-07 | ✓ SATISFIED | Truth 4 |
| SIZE-05 | 08-04/06 | ✓ SATISFIED | Truth 5 |

All 5 requirement IDs from plan frontmatter accounted for in REQUIREMENTS.md (all mapped to Phase 8). No orphaned requirements.

### Prohibitions (negative checks — all honored)

| Prohibition | Status | Evidence |
|-------------|--------|----------|
| No CEM/public-surface drift | ✓ | `diff:surface` exit 0, "No surface drift" |
| No bundled/duplicated Lit | ✓ | `assert:no-lit` exit 0, zero inlined markers |
| No 0,0 frame | ✓ | 4 no-zero-frame browser specs green |
| No `manualChunks` tuning | ✓ | Absent from `vite.config.ts` |
| No edit to vite `external` array | ✓ | vite.config.ts last touched 07-05; external array unchanged |
| No budget flip to enforcing | ✓ | purity + size-baseline exit 0 report-only; size-limit separate |
| No `innerHTML`/`eval` in fallbacks | ✓ | Absent from combobox/select/data-grid |
| No `requestIdleCallback` (Safari floor) | ✓ | Zero occurrences in src |
| color-picker NOT on FloatingPositionController | ✓ | Direct `loadFloating()` one-shot, no autoUpdate |
| dropdown stays type-only | ✓ | `import type { Placement }` only |
| VIRTUALIZE_ROW_THRESHOLD/comparison unchanged | ✓ | `= 100`, `>` preserved |

### Anti-Patterns / Advisory Findings

| Source | Finding | Severity | Impact |
|--------|---------|----------|--------|
| 08-REVIEW.md | `??=` in `lazy-load.ts` caches a rejected `import()` promise | ⚠️ WARNING (advisory) | New failure mode on chunk-load failure: a transient network error permanently bricks positioning/virtualization for the page lifetime, no retry. Happy path fully preserved (698 tests green); concern is on an untested failure path. See `warnings` frontmatter. |

Deferred-items.md documents two pre-existing/environmental jsdom test conditions (Lit-source fixture path under worktree; virtualizer `scrollIntoView` under jsdom) — correctly out of scope, not counted as gaps.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Deep-import purity | `node scripts/deep-import-purity.mjs` | zero static floating-ui, dynamic-only, non-overlay clean | ✓ PASS |
| No-bundled-Lit | `node scripts/assert-no-bundled-lit.mjs` | exit 0, zero inlined markers | ✓ PASS |
| CEM surface diff | `node scripts/cem-diff.mjs …` | exit 0, no drift | ✓ PASS |
| Size baseline check | `node scripts/size-baseline.mjs --check` | exit 0 (report-only, +1B tokens.css only) | ✓ PASS |
| Single shared chunk (dedupe) | dist grep of dynamic import sites | both deps → `dist/chunks/lazy-load-2oqFJtsM.js` | ✓ PASS |

### Human Verification Required

None required for goal achievement. All behavior-dependent truths (async ordering/cancellation, cold-chunk `repeat()`→`virtualize()` swap, SIZE-05 teardown concurrency, no-0,0-frame) are exercised by passing behavioral tests in the green browser (88/88) and jsdom (610/610) lanes.

**Non-blocking developer decision (escalation):** decide whether the `??=` rejected-promise caching (08-REVIEW Critical) is acceptable for v1.1 or should be fixed (null the cache on rejection) before ship. Does not block Phase 8.

### Gaps Summary

No gaps. All 5 roadmap success criteria and all 5 SIZE requirements are independently verified against the built dist and source — not merely against SUMMARY claims. Zero static `@floating-ui/dom` and zero static `@lit-labs/virtualizer` remain in the emitted bundle; both deferred deps collapse to a single shared async chunk (no cross-entry duplication); the size win is recorded (-11341 B marginal on popover); the CEM public surface is byte-unchanged. The one advisory Critical review finding is a latent failure-path dependability concern, explicitly non-blocking, surfaced above for a developer decision.

---

_Verified: 2026-08-22_
_Verifier: Claude (gsd-verifier)_
