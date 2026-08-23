---
last_mapped_commit: 18f16d20ded8ec01a7526d27623691bc0e7f61c6
last_mapped_at: 2026-08-23T13:39:41-04:00
---
# Codebase Concerns

**Analysis Date:** 2026-08-23

Amris is a Lit 3 + Web Components library in the v1.0 → v1.1 hardening cycle. The
public API is frozen against the v1.0 Custom Elements Manifest (CEM); most
remaining concerns are **runtime robustness and performance**, not surface
changes. The single open **pre-ship Critical (CR-01)** and the three named
performance targets below are the active Phase-9 workload.

## Tech Debt

**Report-only budget/guard scripts not yet enforcing:**

- Issue: Multiple CI guards run in report-only mode (exit 0 by design, D-08) —
  they surface drift but never red-build. Enforcement flip is deferred to Phase 11
  (GATE-01/02/03).

- Files: `scripts/assert-no-bundled-lit.mjs:130` (MEAS-04), `scripts/deep-import-purity.mjs:175` (SIZE-04),
  `scripts/attribution-check.mjs:117,152`, `scripts/perf-diff.mjs` (report-only wall-clock band),
  `scripts/cem-diff.mjs`

- Impact: Bundle-size, deep-import purity, perf-count, and attribution regressions
  can land silently until a human reads the report. Perf counts are gated;
  wall-clock and size stay advisory this cycle.

- Fix approach: Flip counts/size budgets to enforcing in Phase 11; keep wall-clock
  report-only (noise band too wide to gate).

**Virtualizer resolution via private-symbol description string (IN-02):**

- Issue: `resolveHostVirtualizer` locates the attached `Virtualizer` by scanning
  `Object.getOwnPropertySymbols(host)` for `sym.description === 'virtualizerRef'`.
  A deliberate tactic to avoid a static import, but brittle against upstream change.

- Files: `src/internal/helpers/virtualize-support.ts:143-152`
- Impact: If `@lit-labs/virtualizer` renames that symbol, `scrollVirtualizerToIndex`
  silently no-ops — breaking keyboard scroll-into-window in `data-grid`/`combobox`/`select`
  with no error. Mitigated by the exact `2.1.1` pin (D-13).

- Fix approach: Add a dev-time assertion/test that fails if the symbol lookup
  returns `undefined` for a mounted virtualizer, so a future bump breaks loudly.

**Package metadata incomplete for publish:**

- Issue: Several publish-readiness `package.json` fields still open.
- Files: `package.json`, `TODO.md:16,18,52`
- Impact: Missing real version pin, `license`/`repository`/`keywords` fields, and no
  `LICENSE` file — blocks a clean GitHub Packages publish.

- Fix approach: Complete the "Package Configuration" and "Project Hygiene" TODO items
  before the v1.0 publish.

## Known Bugs

**CR-01 (OPEN, pre-ship Critical): memoized loaders cache a rejected `import()` promise:**

- Symptoms: One transient dynamic-`import()` failure (chunk 404 after redeploy while
  an old tab is open, offline blip, parse error) permanently bricks positioning and
  virtualization page-wide for the whole session, with **no recovery short of full reload**.

- Files: `src/internal/helpers/lazy-load.ts:38-40` (`loadFloating`), `:59-61` (`loadVirtualizer`)
- Trigger: The `??=` memoization assigns only when the slot is `null`. A rejected
  `import()` leaves the slot holding the *rejected* promise; every later
  `loadFloating()`/`loadVirtualizer()` returns that same rejected promise forever.

- Blast radius: All overlays (`tooltip`, `popover`, `dropdown`, `combobox`, `select`,
  `rich-select`, `color-picker`) fail their first `computePosition`. Panels gated on
  `onPositioned` (`popover`, `rich-select`) never reveal at all. **Prefetch-on-intent
  widens it** — a `pointerenter` during a blip poisons the cache before the user clicks.

- False retry claims: `combobox._ensureVirtualizer()` (`combobox.ts:806-809`) resets
  `_virtualizerRequested` in its `.catch()` "so a later render can retry", and `select`
  leaves `_virtualizerLoading` latched — **neither can recover**, both re-await the same
  cached rejected promise. The comments describe behavior the code cannot deliver.

- Fix approach: Null the cache slot on rejection so the next call re-attempts:
  `return (floatingPromise ??= import('@floating-ui/dom').catch((err) => { floatingPromise = null; throw err; }));`.
  Apply identically to `loadVirtualizer`. **Folded into Phase 9 (D-05)**, gated by the
  browser regression lane. Tracked in `.planning/phases/08-bundle-size-deferral/08-REVIEW.md`.

**WR-02 (advisory): inconsistent hidden-until-positioned (no-`0,0`) reveal gate:**

- Symptoms: On a cold first open, overlays can paint an unpositioned frame at a
  static/stale `position:fixed` location across the loader await, then jump to the
  anchored placement. Clearest on `tooltip` (sets `visible` synchronously, then awaits
  the dynamic import before any `computePosition`).

- Files: `src/components/tooltip/tooltip.ts:108-110,141-145`; `src/components/dropdown/dropdown.ts:65-81,119-131`;
  `src/components/combobox/combobox.ts:448-451,570-582`; `src/components/select/select.ts:514-518,609-620`;
  `src/components/color-picker/color-picker.ts:161,553-562`

- Cause: `popover` and `rich-select` gate their reveal on a `_positioned` flag set by the
  first `computePosition`; the listed overlays reveal purely on open/visible state and do
  not gate on positioning. Pre-deferral this was a single microtask; the dynamic import
  stretches it to many frames on a cold chunk, making the flash user-visible.

- Fix approach: Extend the `popover`/`rich-select` `_positioned` pattern (state flag set in
  `onPositioned`, gate the reveal selector, reset on close). Opportunistic in Phase 9, not
  required (D-05); at minimum apply to `tooltip`.

**WR-03 (advisory): fire-and-forget `start()`/`_updatePosition()` unhandled rejections:**

- Symptoms: On loader failure (CR-01), each becomes an unhandled promise rejection —
  console noise in production and a likely `unhandledrejection` failure in the
  jsdom/Vitest suite that gates v1.0.

- Files: `src/components/popover/popover.ts:216`; `src/components/dropdown/dropdown.ts:123`;
  `src/components/combobox/combobox.ts:573`; `src/components/select/select.ts:612`;
  `src/components/rich-select/rich-select.ts:347`; `src/components/tooltip/tooltip.ts:144`;
  `src/components/color-picker/color-picker.ts:322`

- Cause: `FloatingPositionController.start()` (`floating-position.ts:118-122`) is async and
  awaits `loadFloating()`; every host calls it fire-and-forget with no `.catch`.

- Fix approach: Swallow-and-degrade at the call site (`void ctrl.start().catch(() => {})`)
  or wrap the `await loadFloating()` in an internal `try/catch`. Opportunistic in Phase 9.

**WR-04 (advisory): data-grid virtual focus after a single rAF may drop keyboard focus:**

- Symptoms: Arrow/Home/End keyboard navigation to far-off rows can silently fall to
  `<body>` when the target row hasn't mounted yet.

- Files: `src/components/data-grid/data-grid.ts:441-455`
- Cause: `scrollVirtualizerToIndex` then a single `requestAnimationFrame` before
  `rowEl?.focus()`; the virtualizer mounts rows asynchronously via `ResizeObserver`, so the
  `data-sorted-index` node isn't guaranteed to exist after one frame. Optional chaining
  swallows the miss.

- Fix approach: Retry until the node exists (bounded rAF poll) or use the virtualizer's
  `visibilityChanged`/`rangeChanged` readiness before focusing.

## Security Considerations

**Lit-safe templating maintained — no `innerHTML`/`eval`:**

- Risk: XSS via unsafe DOM injection.
- Current mitigation: All rendering goes through Lit's `html` template tag; the CLAUDE.md
  constraint forbids `innerHTML`/`eval`. No global state, property→event model.

- Recommendations: Keep the constraint enforced in review; do not introduce
  `unsafeHTML`/`unsafeSVG` directives without a documented, sanitized justification.

**Dynamic-import specifiers must stay static bare specifiers:**

- Risk: A computed or origin-qualified `import()` path would defeat externalization and open
  a dynamic-code / supply-chain seam.

- Files: `src/internal/helpers/lazy-load.ts:26-28` (documented invariant)
- Current mitigation: Specifiers are static bare package names; the frozen vite `external`
  snapshot + the no-bundled-Lit assertion guard it (`scripts/assert-no-bundled-lit.mjs`).

- Recommendations: Never build a computed module path in the lazy loaders.

## Performance Bottlenecks

These are the three named Phase-9 (RPERF-01…03) targets — already characterized, fixes
in flight, all behavior- and surface-preserving.

**Data-grid re-sort-on-every-render (RPERF-01):**

- Problem: `_sortedRows` getter does `[...this.rows].sort(cmp * dir)` — a full clone + sort
  of the entire dataset on **every** `render()`. Focus moves (`_focusedRowIndex`), selection
  changes (`_internalSelected`), and any unrelated state change re-clone and re-sort even
  when sort key/direction are unchanged.

- Files: `src/components/data-grid/data-grid.ts:392-399` (getter); read sites at `:446` (keydown),
  `:538` (virtual), `:618` (non-virtual)

- Cause: Sort performed inside a getter with no memoization.
- Improvement path (D-02): Memoize the sorted array keyed on `(rows-identity, _sortKey,
  _sortDir)`; only an actual sort/data change recomputes. Do NOT additionally narrow the
  non-sort render path this phase (smallest regression surface on the frozen render path).

**Combobox filter-per-keystroke run 3×+ per keystroke (RPERF-02):**

- Problem: `filterOptions(this._allOptions, this.value, this.remote)` runs at 5 call sites per
  render/keystroke, and `_allOptions` re-spreads `[...this.options, ...this._slottedOptions]`
  on every call.

- Files: `src/components/combobox/combobox.ts:196` (ListboxNav `getOptions`), `:704` (keydown),
  `:795` (count getter), `:893` (select-mode `_dropdownQuery`), `:938` (render);
  `_allOptions` getter at `:532`. Pure filter in `src/internal/controllers/option-filter.ts`.

- Cause: The filtered list is recomputed independently at each site instead of once per render.
- Improvement path (D-01): **Memoize only — no debounce.** Compute the filtered list once,
  memoized by `(options-identity, slotted-identity, value, remote)`, and thread the single
  result through render + nav paths. Debouncing is rejected — it would shift the observable
  `am-search` cadence and when the list visibly updates (behavior the frozen surface preserves).

**Floating-UI `autoUpdate` reposition churn (RPERF-03):**

- Problem: `_updatePosition` rebuilds the `[offset, flip, shift, ...hostMiddleware]` array and
  re-runs the `resolve()` getters (`placement`, `strategy`, `offset`, `middleware`) on **every**
  `autoUpdate` tick (scroll, resize, layout).

- Files: `src/internal/controllers/floating-position.ts:146-166`
- Cause: The churn is structural in the one shared controller — so it affects **all 6 overlays**
  (combobox, select, dropdown, popover, tooltip, date-picker) at once.

- Improvement path (D-03): Cache the static middleware slice, hoist `resolve()` calls whose
  sources are fixed values (combobox/select/date-picker pass fixed placement/offset), and/or
  coalesce repositions — keeping `computePosition` output identical. **Blast radius = every
  overlay**, so the browser regression lane is the gate; the `autoUpdate` open-gating and
  `_startToken` close-during-load guard (PERF-04 / Phase-8 invariants) must not weaken.

## Fragile Areas

**The shared `FloatingPositionController` — single chokepoint for 6 overlays:**

- Files: `src/internal/controllers/floating-position.ts`
- Why fragile: Every overlay routes positioning through this one controller; a churn-reduction
  or teardown bug regresses all six simultaneously. The `_startToken` monotonic guard
  (`:99,121-125,137`) is the only thing abandoning a close-during-load / disconnect-during-load run.

- Safe modification: Preserve the `start()`/`stop()` open-gating and `_startToken` guard exactly.
  Validate on the browser lane, never jsdom.

- Test coverage: `test/browser/floating-position.test.ts`, `overlay-focus.test.ts`, and the
  Phase-8 no-`0,0`-frame specs.

**jsdom vs browser test-lane divergence (Phase-8 lesson):**

- Files: `test/perf/**` and jsdom unit specs vs `test/browser/**`
- Why fragile: jsdom mocks `ResizeObserver` and positioning and cannot exercise real overlay
  positioning or the virtualizer. In Phase 8, jsdom + per-plan worktree self-checks passed while
  the browser lane had real cross-plan failures (recorded in MEMORY: run browser lane as a
  regression gate for overlay/virtualizer work).

- Safe modification: For **anything touching overlay positioning or the virtualizer**, run
  `npm run test:browser` before merge — the jsdom suite is not a sufficient gate.

- Test coverage: `test/browser/data-grid-virtual.test.ts`, `combobox-virtual.test.ts`,
  `a11y.browser.test.ts`. New a11y-name/role snapshots (RPERF-04, report-only) slot in here.

**Cold-load specs depend on a test-only cache reset:**

- Files: `src/internal/helpers/lazy-load.ts:82-85` (`__resetLazyLoadCachesForTest`)
- Why fragile: Browser specs asserting the cold `repeat()` → windowed swap (D-05) require the
  loader pending at first render. Without the reset, a prior spec sharing the page leaves the
  promise resolved and the cold frame is never observable — an order-dependent flake, not a
  product defect.

- Safe modification: Call the reset in `beforeEach` for any cold-load spec.

## Compatibility / Scaling Limits

**Hard Safari 16.4 browser floor (ElementInternals not polyfillable):**

- Current capacity: Form-associated components use the `ElementInternals` API
  (`attachInternals()`, `setFormValue()`, `setValidity()`) for native form integration.

- Limit: `ElementInternals` is not polyfillable, so the browser floor is fixed at Safari 16.4.
  This is a **documented constraint, not worked around** (per CLAUDE.md; `BROWSER_SUPPORT.md`).

- Scaling path: None intended below the floor. Graceful degradation / feature detection below
  Safari 16.4 is scoped to Phase 10 (COMPAT-*), not this cycle. Document, do not work around.

## Dependencies at Risk

**TypeScript 6.0.3 (very recent):**

- Risk: TypeScript 6.0.3 is a bleeding-edge release; instability may surface in strict-mode builds.
- Impact: Build breakage under `strict` / `verbatimModuleSyntax`.
- Migration plan: Per CLAUDE.md constraint, pin to latest stable 5.x if instability appears.

**`@lit-labs/virtualizer` pinned to exact `2.1.1`:**

- Risk: The virtualizer symbol-description lookup (IN-02) relies on an internal symbol that a
  version bump could rename.

- Impact: Silent no-op of keyboard scroll-into-window across data-grid/combobox/select.
- Migration plan: Keep the exact pin; add a dev-time assertion before any bump (see IN-02).

## Missing Critical Features

**CI, LICENSE, CHANGELOG, and systematic a11y audit not yet in place:**

- Problem: No CI pipeline (lint/type-check/test on PR), no LICENSE file, no CHANGELOG, no
  CONTRIBUTING guide, and no systematic WCAG 2.1 AA / screen-reader audit.

- Files/refs: `TODO.md:44-56` (Accessibility, Project Hygiene sections)
- Blocks: A clean, trustworthy v1.0 publish and reproducible external contribution.

## Test Coverage Gaps

**No accessible-name/role snapshot harness yet (RPERF-04):**

- What's not tested: Accessible name + computed role + focusability of the tuned components'
  key nodes are not snapshot-guarded, so behavior-preservation of the tuning cannot be proven
  against the real a11y tree.

- Files: to land under `test/browser/**` next to `a11y.browser.test.ts` (new, report-only)
- Risk: Perf tuning could strip a11y DOM (`aria-*`, roles, focusability) undetected.
- Priority: High (Phase-9 requirement RPERF-04).

**Systematic WCAG audit and screen-reader testing outstanding:**

- What's not tested: axe-core smoke tests exist (35 tests) but no systematic WCAG 2.1 AA audit,
  no NVDA/VoiceOver testing, no per-component keyboard-pattern documentation, and
  `prefers-reduced-motion` not verified across all animated components.

- Files: `TODO.md:45-49`
- Risk: Accessibility regressions or gaps ship unnoticed despite the smoke coverage.
- Priority: Medium (post-v1.0 hardening).

**No visual regression tests:**

- What's not tested: No Playwright screenshot / Chromatic visual diffs.
- Files: `TODO.md:56`
- Risk: Theming/layout regressions (esp. dark-mode token changes) land unnoticed.
- Priority: Low–Medium.

---

*Concerns audit: 2026-08-23*
