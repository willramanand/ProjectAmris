---
phase: 01-test-coverage-ci-gates-foundation
reviewed: 2026-08-11T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - .github/workflows/ci.yml
  - .gitignore
  - .size-limit.json
  - package.json
  - test/a11y-helper.ts
  - test/browser/a11y.browser.test.ts
  - test/browser/dialog-top-layer.test.ts
  - test/browser/floating-position.test.ts
  - test/browser/form-association.test.ts
  - test/browser/overlay-focus.test.ts
  - test/components/app-shell.test.ts
  - test/components/breadcrumb.test.ts
  - test/components/button-group.test.ts
  - test/components/card.test.ts
  - test/components/combobox.test.ts
  - test/components/context-menu.test.ts
  - test/components/date-picker.test.ts
  - test/components/dropdown.test.ts
  - test/components/empty-state.test.ts
  - test/components/error-text.test.ts
  - test/components/field.test.ts
  - test/components/grid.test.ts
  - test/components/hint-text.test.ts
  - test/components/icon.test.ts
  - test/components/label.test.ts
  - test/components/link-button.test.ts
  - test/components/nav-bar.test.ts
  - test/components/panel.test.ts
  - test/components/popover.test.ts
  - test/components/progress-ring.test.ts
  - test/components/rich-select.test.ts
  - test/components/select.test.ts
  - test/components/side-nav.test.ts
  - test/components/split-view.test.ts
  - test/components/stack.test.ts
  - test/components/stat.test.ts
  - test/components/status-dot.test.ts
  - test/components/surface.test.ts
  - test/components/table.test.ts
  - test/components/timeline.test.ts
  - test/components/tooltip.test.ts
  - test/helpers.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 8
  info: 4
  total: 12
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-11
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

This is a test-only / config-only hardening phase for the Amris v1.0 library. No
component source was changed. Reviewed the jsdom + browser test suites, shared
helpers/mocks, Vitest config, size-limit budget, CI workflow, and package.json.

**Overall assessment: solid.** The two-lane split (jsdom mocks vs. mock-free
native Chromium) is disciplined — `test/helpers.ts` is deliberately side-effect
free (type-only imports, `Symbol.for` lookup) so the browser lane never inherits
the jsdom `attachInternals`/`showModal`/`ResizeObserver` mocks, and the browser
suites include explicit `[native code]` guards proving the mock did not leak.
The CI workflow is genuinely least-privilege (`permissions: contents: read`,
`pull_request` not `pull_request_target`, no interpolation of untrusted event
data into `run:` steps) — **no security findings**. The coverage gate and
size-limit gate do hard-block (both fail the job on a non-zero exit).

The findings below are about **test effectiveness**, not correctness of the code
under test. The most important (WR-01) is a family of "index clamp" assertions
that are mathematically incapable of failing — a real gap for a phase whose sole
deliverable is *real* regression-guarding coverage. Per phase scope, tests that
assert current (buggy) behavior instead of fixing the component are intentional
and are NOT flagged.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: TEST-04 "index-clamp" assertions are tautological — cannot fail

**File:** `test/components/select.test.ts:415,429`, `test/components/combobox.test.ts:180,197`, `test/components/rich-select.test.ts:177,196`
**Issue:** The headline regression guard of every TEST-04 suite is
`expect(highlightedDomIndex(el)).toBeLessThan(renderedOptions.length)` where
`highlightedDomIndex` is `Array.findIndex(...)` over the **rendered** options
array. `findIndex` can only ever return a value in `[-1, length-1]`, so
`< length` is true for every possible input, including when *no* option is
highlighted (returns `-1`) or when the component fails to clamp. The assertion
therefore provides zero coverage of the "highlighted index stays in bounds"
behavior it is named for. The "rapid successive replacement" variants
(`select.test.ts:429`, `rich-select.test.ts:196`) are the weakest: their only
non-tautological assertion is `options.length` — they do not verify the clamp
at all. (The first variants in combobox/rich-select are partially saved by a
companion `toEqual([...])` stale-render check, but the clamp claim itself is
still dead.)
**Fix:** Assert against the component's actual clamped state and require a real
highlight, e.g.:
```ts
const idx = (el as unknown as { _highlightedIndex: number })._highlightedIndex;
expect(idx).toBeGreaterThanOrEqual(-1);
expect(idx).toBeLessThan(renderedOptions.length); // now meaningful: reads raw state
// and, if a highlight is expected to survive the shrink:
expect(highlightedDomIndex(el)).toBeGreaterThanOrEqual(0);
```

### WR-02: breadcrumb "hides the separator when current" never checks the separator

**File:** `test/components/breadcrumb.test.ts:25-31`
**Issue:** The test is named "hides the separator when current" but its only
assertion is `expect(element.hasAttribute('current')).toBe(true)`. `current` was
set literally in the fixture markup, so this verifies the HTML parser, not
separator-hiding. The behavior the test claims to cover is unverified.
**Fix:** Query the separator element and assert it is absent/hidden, e.g.
`expect(element.shadowRoot?.querySelector('.separator')).toBeNull()` (or check
`display: none` / `hidden`), and drop the redundant `hasAttribute('current')`.

### WR-03: combobox "does not open or react when disabled" asserts none of that

**File:** `test/components/combobox.test.ts:98-102`
**Issue:** Named "does not open or react when disabled" but the body only asserts
`input.disabled === true`. It never attempts to open the listbox nor confirms
`aria-expanded` stays `false`, so a regression that let a disabled combobox open
would pass.
**Fix:** After confirming `input.disabled`, dispatch focus/click and assert the
listbox stays closed: `expect(input.getAttribute('aria-expanded')).toBe('false')`
and `expect(getOptions(el).length)` behaves as designed.

### WR-04: size-limit "tree-shaking canary" gives false assurance

**File:** `.size-limit.json:30-36`
**Issue:** The canary entry measures the exact same artifact as the "button
(light deep import)" entry (`dist/components/button/index.js`) but with a looser
limit (5 kB vs. 2.5 kB). It is strictly redundant: if button ever pulled in the
whole library, the 2.5 kB budget on the identical file would already fail, and
the 5 kB canary would still pass. Measuring a standalone chunk's byte size also
cannot detect cross-component code inclusion (which is what tree-shaking would
regress). The canary's stated intent — "button deep import must NOT pull the
whole lib" — is not actually tested.
**Fix:** Either delete the canary (the 2.5 kB button budget already guards size),
or make it a real tree-shaking assertion — e.g. a test that imports only
`components/button` and asserts other components' custom elements are undefined /
their identifying strings are absent from the bundle.

### WR-05: Coverage thresholds sit below the measured baseline — permits regressions

**File:** `vitest.config.ts:48-52`
**Issue:** Global floors are set *under* the measured baseline recorded in the
same comments: branches 66 (measured 67.54), functions 81 (82.71), lines 83
(84.01), statements 82 (83.21). The gate therefore silently permits ~1–1.5
percentage points of coverage regression before it fails. For a "ratchet to
final floor" gate whose purpose is to catch backsliding, this ~1.5pt of slack
undercuts the intent.
**Fix:** Raise floors to the measured baseline (branches 67, functions 82, lines
84, statements 83), or floor-minus-a-hair only if flakiness demands it — and
document the exact buffer. Keep them within <0.5pt of measured so real drops trip
the gate.

### WR-06: Attribute-echo tests are vacuous for the reflection they claim

**File:** `test/components/status-dot.test.ts:11-13`, `test/components/stat.test.ts:9`, `test/components/grid.test.ts:9-10`, `test/components/stack.test.ts:11-15`, `test/components/button-group.test.ts:11`, `test/components/timeline.test.ts:19`, `test/components/surface.test.ts:11-13`
**Issue:** These tests set an attribute in the fixture markup (e.g.
`<am-status-dot variant="success" ...>`) and then assert
`el.getAttribute('variant') === 'success'`. Since Lit never strips authored
attributes, `getAttribute` returns the markup value regardless of whether the
component reads, reflects, or even declares the property — the same assertion
would pass on a bare `<div>`. They verify HTML parsing, not component behavior.
(Note: sibling assertions that check attributes the component *adds* — `role`,
`aria-*`, defaults like `am-surface` `variant==='default'`, `am-table` default
`bordered` — are genuine and fine.)
**Fix:** Assert an observable effect of the property instead: a shadow-DOM class
(`classMap`), a `part`/element that only renders for that variant, or set the
value via the **property** on a default element and assert the attribute appears
(true property→attribute reflection), e.g. `el.variant = 'success'; await
waitForUpdate(el); expect(el.getAttribute('variant')).toBe('success')` as
`stack.test.ts:26-31` already does correctly.

### WR-07: Fake-timer leakage risk in tooltip suite on mid-test failure

**File:** `test/components/tooltip.test.ts:30-135`
**Issue:** Each timer-based test calls `vi.useFakeTimers()` at the top and
`vi.useRealTimers()` only at the very end. If any `expect` between them throws,
`useRealTimers()` is skipped and fake timers bleed into subsequent tests in the
run. `vitest.config.ts` sets `restoreMocks: true`, but that restores spies, not
the timer mode, and there is no `afterEach(() => vi.useRealTimers())` safety net.
**Fix:** Add `afterEach(() => { vi.useRealTimers(); });` to the tooltip suite (or
globally in `test/setup.ts`) so a failing assertion cannot poison later tests.

### WR-08: jsdom form tests silently depend on jsdom NOT implementing setFormValue

**File:** `test/setup.ts:113-136`, `test/helpers.ts:142-151`
**Issue:** The `attachInternals` override returns the **native** internals
whenever jsdom provides one whose `setFormValue` is a function, and only falls
back to `MockElementInternals` otherwise. Every jsdom form test then reads state
via `getMockInternals(el)` (combobox/select/date-picker/rich-select), which
throws `"Mock ElementInternals not found on host"` if the mock was not used. This
works only because the pinned jsdom (`^29.0.0`) does not fully implement
form-associated `setFormValue`; a future jsdom that adds it would take the native
branch and break a swath of jsdom tests with a confusing error. The coupling is
implicit and undocumented at the assertion sites.
**Fix:** Make the fallback explicit/pinned for the jsdom lane (e.g. always mock in
jsdom rather than probing), or have `getMockInternals` degrade gracefully with a
message that names the jsdom-version assumption. At minimum, add a comment at the
`getMockInternals` call sites documenting the jsdom floor this relies on.

## Info

### IN-01: package.json repository URL points to the wrong project

**File:** `package.json:9`
**Issue:** `"url": "git+https://github.com/willramanand/ProjectQuartz.git"` — the
project is ProjectAmris / `@willramanand/amris`. A stale repository URL misroutes
npm "Repository" links and provenance for a package about to be published to
GitHub Packages.
**Fix:** Update to the ProjectAmris repository URL.

### IN-02: CI jobs have no `timeout-minutes`

**File:** `.github/workflows/ci.yml:14,35,53`
**Issue:** None of the three jobs set `timeout-minutes`. A hung browser/Playwright
test would run to GitHub's 360-minute default, wasting runner minutes and delaying
failure signal.
**Fix:** Add a modest `timeout-minutes: 15` (or per-job) to each job.

### IN-03: Coverage gate measures only the jsdom project

**File:** `.github/workflows/ci.yml:30`, `vitest.config.ts:34-36`
**Issue:** Coverage is collected from `--project jsdom` only (documented as OQ-1).
Code paths exercised solely by the browser lane (real `setValidity`, top-layer,
floating-ui geometry) count as uncovered, so the thresholds implicitly bake in
that gap. This is intentional but worth surfacing: the coverage number understates
what the full suite exercises, and browser-only regressions are gated only by the
browser assertions, not by coverage.
**Fix:** No change required; consider a note in the coverage config that browser
lane is excluded by design so future maintainers don't "fix" the number by folding
it in.

### IN-04: GitHub Actions pinned to mutable major tags, not commit SHAs

**File:** `.github/workflows/ci.yml:17,19,38,40,48,59`
**Issue:** `actions/checkout@v4`, `actions/setup-node@v4` are pinned to floating
major tags. Supply-chain best practice for a package that will publish to a
registry is SHA-pinning. Risk here is low (the workflow token is read-only with no
secrets), so this is advisory.
**Fix:** Optionally pin third-party actions to full commit SHAs with a version
comment, and enable Dependabot for `github-actions`.

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
