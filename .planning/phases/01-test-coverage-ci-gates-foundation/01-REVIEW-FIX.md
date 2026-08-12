---
phase: 01-test-coverage-ci-gates-foundation
fixed_at: 2026-08-12T01:15:00Z
review_path: .planning/phases/01-test-coverage-ci-gates-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-08-12
**Source review:** .planning/phases/01-test-coverage-ci-gates-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (WR-01 through WR-08; Info findings IN-01..IN-04 are out of scope)
- Fixed: 8
- Skipped: 0

**Verification environment:** All gates were run inside the isolated review-fix
worktree (`.claude/worktrees/rf-01-...`), which resolves `node_modules` up-tree
from the main checkout. Each fix was validated by running the affected Vitest
file(s) in the `jsdom` project; the coverage gate (WR-05) and the full 437-test
jsdom suite (WR-08) were run there as well. The browser (Chromium/Playwright)
lane was not run — no browser-lane files were changed. These numbers are
reproducible from the main checkout after the worktree fast-forwards into it.

## Fixed Issues

### WR-01: TEST-04 "index-clamp" assertions are tautological

**Files modified:** `test/components/select.test.ts`, `test/components/combobox.test.ts`, `test/components/rich-select.test.ts`
**Commit:** f8a26d0
**Applied fix:** The reviewer's literal suggestion (assert the raw
`_highlightedIndex < length`) does not hold for these components: probing showed
all three leave the raw index stale after a shrink (e.g. 29 on a 2-option list)
while dropping the highlight from the DOM. Adapted the fix accordingly — after
the option set shrinks, assert no stale out-of-range highlight lingers
(`findIndex(...) === -1`, falsifiable, unlike the old `< length`), then dispatch
an ArrowDown and assert the highlight and raw `_highlightedIndex` clamp back
into range (`>= 0` and `< length`). This exercises the real
`Math.min(idx+1, length-1)` / wrap clamp in each component. Verified: 53 tests
across the three files pass.

### WR-02: breadcrumb "hides the separator when current" never checks the separator

**Files modified:** `test/components/breadcrumb.test.ts`
**Commit:** 2990249
**Applied fix:** The reviewer's `querySelector('.separator')` `toBeNull()`
suggestion does not match the implementation — the separator is always rendered
and only CSS-hidden via `:host([current]) .separator { display: none }`, and
probing confirmed jsdom does not apply shadow-DOM `:host()` rules (computed
`display` stays default). Adapted: assert the separator is present and
decorative (`aria-hidden="true"`) and that the component's static styles ship
the `:host([current]) .separator { display: none }` hide rule (read from
`constructor.styles`, which the probe confirmed contains it). Falsifiable if the
hide rule or aria-hidden is removed. Verified: 7 tests pass.

### WR-03: combobox "does not open or react when disabled" asserts none of that

**Files modified:** `test/components/combobox.test.ts`
**Commit:** c4d80cd
**Applied fix:** Probing showed a *synthetic* focus event opens even a disabled
combobox (the component relies on the native disabled `<input>` to block
interaction, which synthetic dispatch bypasses). So rather than dispatch
synthetic events, the test now exercises the real `.focus()`/`.click()` methods
(which honour `disabled`) and asserts `aria-expanded` stays `'false'` and the
`.listbox` never gains the `open` class. A regression that let a disabled
combobox open now fails. Verified: 13 tests pass.

### WR-04: size-limit "tree-shaking canary" gives false assurance

**Files modified:** `.size-limit.json`
**Commit:** 1a2abc0
**Applied fix:** Deleted the redundant canary entry (the reviewer's sanctioned
option). It measured the identical `dist/components/button/index.js` as the
`button (light deep import)` entry but with a looser 5 kB limit, so it could
never fail before the stricter 2.5 kB budget on the same file already did;
byte-size of a single chunk also cannot detect cross-component inclusion. The
2.5 kB button budget continues to guard the file. Verified: JSON parses; 4
entries remain.

### WR-05: Coverage thresholds sit below the measured baseline

**Files modified:** `vitest.config.ts`
**Commit:** 4574a65
**Applied fix:** Raised global floors from br 66 / fn 81 / ln 83 / st 82 to
br 67 / fn 82 / ln 84 / st 83 and updated the baseline comment to the freshly
measured values (br 67.76 / fn 83.02 / ln 84.33 / st 83.5, slightly up from the
prior baseline because the WR-01/WR-03 edits exercise more component code). The
buffer is now small and documented so real regressions trip the gate. Verified
green-on-arrival: ran `vitest --project jsdom --coverage` (437 tests) and the
coverage gate passed under the new thresholds.

### WR-06: Attribute-echo tests are vacuous for the reflection they claim

**Files modified:** `test/components/status-dot.test.ts`, `test/components/stat.test.ts`, `test/components/grid.test.ts`, `test/components/stack.test.ts`, `test/components/button-group.test.ts`, `test/components/timeline.test.ts`, `test/components/surface.test.ts`
**Commit:** a7fb57c
**Applied fix:** Confirmed each of the seven components declares the relevant
properties with `@property({ reflect: true })`. Rewrote each vacuous test to
create a default (attribute-free) element, drive the property programmatically,
`await waitForUpdate`, then assert the attribute reflects — the true
property→attribute reflection pattern already used at `stack.test.ts:26-31`.
These would now fail on a bare `div` (unlike the markup-echo versions). Verified:
14 tests across the seven files pass.

### WR-07: Fake-timer leakage risk in tooltip suite on mid-test failure

**Files modified:** `test/components/tooltip.test.ts`
**Commit:** f8ace5b
**Applied fix:** Added `afterEach(() => { vi.useRealTimers(); })` (and imported
`afterEach`) as an unconditional safety net so a mid-test assertion failure can
no longer leak fake timers into later tests. Verified: 6 tests pass.

### WR-08: jsdom form tests silently depend on jsdom NOT implementing setFormValue

**Files modified:** `test/setup.ts`, `test/helpers.ts`
**Commit:** 4f12469
**Applied fix:** Replaced the `attachInternals` probe (which returned native
internals whenever jsdom exposed a `setFormValue` function, and only otherwise
mocked) with an unconditional mock for the jsdom lane. This is behaviour-
identical on the pinned jsdom `^29` but removes the fragile coupling to jsdom
NOT implementing `setFormValue` (a future jsdom that added it would have taken
the native branch and broken every `getMockInternals()` call). Documented the
jsdom-lane assumption in `setup.ts` and made the `getMockInternals()` error
message name it. `setup.ts` is the jsdom project's setupFile only, so the
browser lane is unaffected and still covers native form-association fidelity.
Verified: full jsdom suite (67 files, 437 tests) passes.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-08-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
