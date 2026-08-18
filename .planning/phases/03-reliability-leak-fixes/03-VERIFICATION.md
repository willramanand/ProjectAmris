---
phase: 03-reliability-leak-fixes
verified: 2026-08-18T02:31:07Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Decide fix-now vs defer for CR-01 (code review, CRITICAL): command-palette keyboard highlight/selection diverges from rendered order when groups interleave — Enter can execute the WRONG command. Pre-existing, outside the leak-fix scope, but ships in command-palette.ts which this phase modified."
    expected: "A human decides whether to fix before the v1.0 freeze or file a tracked follow-up. Existing tests mask it (fixture commands are grouped contiguously)."
    why_human: "Correctness/UX judgment about a frozen-API v1.0 defect; grep cannot decide scope-vs-freeze tradeoff. Not a Phase 3 success criterion."
  - test: "Decide fix-now vs defer for WR-01 (code review, WARNING): dialog/drawer/command-palette emit a spurious public am-close on initial mount (first Lit update runs the closed/else branch)."
    expected: "Human decides — am-close is a frozen public event; a consumer wiring am-close to teardown could self-destruct on mount."
    why_human: "Frozen-public-API contract judgment for v1.0; untested because tests attach am-close listeners after mount."
  - test: "Decide fix-now vs defer for WR-02 (code review, WARNING): toast _dismiss() animationend host listener can be triggered early by composed shadow animations (countdown ring / toast-in), firing am-close prematurely and cutting the exit animation short. This touches the _dismiss() code path modified by FIX-01."
    expected: "Human decides whether to disambiguate by animationName before v1.0."
    why_human: "Timing/animation behavior judgment; the done-guard prevents double dispatch but not early dispatch."
  - test: "Update REQUIREMENTS.md traceability for FIX-02 — it is still marked [ ] (line 32) and 'Pending' (line 117) though the phase verified it satisfied (source gating + green teardown-spy suites)."
    expected: "FIX-02 flipped to complete/verified in REQUIREMENTS.md so the traceability table matches reality."
    why_human: "Documentation state decision; the requirement is met in code but the tracker was not updated."
---

# Phase 3: Reliability & Leak Fixes Verification Report

**Phase Goal:** The known lifecycle leaks are fixed under one shared discipline (gate on open/connected, mirror teardown in disconnect, guard focus with isConnected, centralize timers) and proven with teardown assertions — green before release, no user-visible regressions.
**Verified:** 2026-08-18T02:31:07Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1 (FIX-01) | Toast dismiss `setTimeout` + `animationend` are tracked and cleaned up via `_clearTimer()`; a toast removed before its timer fires leaves no pending callback. | ✓ VERIFIED | `toast.ts:270-271` uses `_teardown.timeout(onEnd, 300)` + `{ signal: this._teardown.signal }`; `_clearTimer()` (`:226`) calls `_teardown.clear()`; `disconnectedCallback()` (`:199-202`) calls `_clearTimer()`. Behavioral test `toast.test.ts:226` "clears the dismiss fallback timer and fires no am-close after mid-dismiss removal" PASSES. |
| 2 (FIX-02) | Global click/keydown listeners gated on open and torn down on disconnect across combobox, dropdown, context-menu, date-picker, popover, tooltip — asserted with teardown spies. | ✓ VERIFIED | All 6 sources attach in the open-branch and remove in `disconnectedCallback` (dropdown `:70-84,108-112`; context-menu `:66-87`; popover `:98-166`; combobox `:413-434`; date-picker `:278-296`; tooltip is the no-document-listener case). TEST-05 spy suites assert attach-on-open / detach-on-close / detach-on-disconnect (tooltip asserts `addSpy` NOT called). All green. |
| 3 (FIX-03) | Focus restoration guards removed/disconnected `_previouslyFocused` via `isConnected` (dialog, drawer, command-palette, popover); closing an overlay whose opener was removed does not throw. | ✓ VERIFIED | Guard `instanceof HTMLElement && .isConnected` present: dialog `:207`, drawer `:211`, command-palette `:226`. popover has NO `_previouslyFocused` (documented finding). Behavioral tests: dialog `:286`, drawer `:86`, command-palette `:114`, popover `:140` all PASS; browser `overlay-focus.test.ts:163` flipped to guarded assertion. |
| 4 (FIX-04) | Dialog animation cleanup hardened (explicit cleanup / `disconnectedCallback`) so animation listeners never dangle. | ✓ VERIFIED | dialog.ts adds `_teardown` field (`:62`), `disconnectedCallback()` (`:185-189`) calls `_teardown.clear()`, `_nudge()` binds `animationend` with `signal: this._teardown.signal` (`:233-235`). Behavioral test `dialog.test.ts:132` "tears down the nudge animationend listener on disconnect (FIX-04)" PASSES. |
| 5 (shared discipline) | One shared teardown primitive (TeardownScope) tracks timers + abortable listeners and clears them in one call — established as the tracer and reused by FIX-04. | ✓ VERIFIED | `teardown-scope.ts` implements `timeout()`, `signal` getter, `clear()` (cancels timers + `abort()` + fresh controller). Dedicated unit suite `test/internal/teardown-scope.test.ts` PASSES. Imported by toast + dialog; NOT re-exported from `src/index.ts`/`src/index.all.ts` (frozen surface intact). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/internal/helpers/teardown-scope.ts` | TeardownScope class | ✓ VERIFIED | 57 lines, substantive, off the frozen surface, imported by components only. |
| `src/components/toast/toast.ts` | FIX-01 wiring | ✓ VERIFIED | `_teardown` field, `_dismiss()`/`_clearTimer()` rewired. |
| `src/components/dialog/dialog.ts` | FIX-04 + FIX-03 | ✓ VERIFIED | `disconnectedCallback`, `_nudge` signal, `isConnected` guard. |
| `src/components/drawer/drawer.ts` | FIX-03 guard | ✓ VERIFIED | `isConnected` guard at `:211`. |
| `src/components/command-palette/command-palette.ts` | FIX-03 guard | ✓ VERIFIED | `isConnected` guard at `:226`. |
| `src/components/popover/popover.ts` | FIX-02 gating + FIX-03 finding | ✓ VERIFIED | Gate-on-open + detach-on-disconnect; no focus-restoration path (documented). |
| `test/internal/teardown-scope.test.ts` | Unit proof | ✓ VERIFIED | Cancel-timers + abort-listeners + reuse-after-clear. |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `toast.ts _clearTimer()` | `TeardownScope.clear()` | drains dismiss timer + aborts animationend | ✓ WIRED | `:226` |
| `toast.ts disconnectedCallback()` | `_clearTimer()` | existing call site drains teardown | ✓ WIRED | `:201` |
| `dialog.ts disconnectedCallback()` | `TeardownScope.clear()` | aborts `_nudge` animationend | ✓ WIRED | `:189` |
| `dialog/drawer/command-palette _hide()` | `isConnected` guard | gates `_previouslyFocused.focus()` | ✓ WIRED | dialog `:207`, drawer `:211`, cp `:226` |
| 6 FIX-02 TEST-05 suites | source gating | regression lock | ✓ WIRED | spy suites assert attach/detach |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| FIX-01..04 + TeardownScope jsdom suites | `npx vitest run` (11 files) | 11 files / 101 tests passed | ✓ PASS |
| Browser FIX-03 guarded assertion | (parent-confirmed 39 browser tests green) | flip verified in source `overlay-focus.test.ts:163` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| FIX-01 | 03-01 | Toast dismiss setTimeout tracked/cleaned via `_clearTimer()` | ✓ SATISFIED | Truth 1 |
| FIX-02 | 03-03 | Global listeners gated on open + torn down on disconnect (6 components) | ✓ SATISFIED (in code) | Truth 2. NOTE: REQUIREMENTS.md still marks this Pending/unchecked — tracker out of date. |
| FIX-03 | 03-02, 03-03 | Focus restoration guarded via `isConnected` (4 overlays) | ✓ SATISFIED | Truth 3 |
| FIX-04 | 03-02 | Dialog animation cleanup hardened via `disconnectedCallback` | ✓ SATISFIED | Truth 4 |

All four requirement IDs (FIX-01..04) are declared across plan frontmatter and accounted for. No orphaned requirement.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (modified source) | — | TBD/FIXME/XXX/HACK/innerHTML/eval | none | Clean scan across all modified source files. |
| `src/index.ts` / `src/index.all.ts` | — | TeardownScope re-export | none | Not re-exported — frozen public surface intact. |

### Code Review Findings (03-REVIEW.md — status: issues_found)

These are **outside the four Phase 3 success criteria** and are surfaced for a human fix-now-vs-defer decision (see `human_verification`). None was introduced by this phase's edits (the leak-fix diffs are additive guards/wiring); none blocks the phase goal, but all three ship in files this phase modified and touch the v1.0 frozen public API.

| ID | Severity | File | Concern |
| -- | -------- | ---- | ------- |
| CR-01 | CRITICAL | command-palette.ts | Keyboard highlight/selection diverges from rendered order when groups interleave → Enter can execute the wrong command. Masked by contiguously-grouped test fixtures. |
| WR-01 | WARNING | dialog/drawer/command-palette | Spurious public `am-close` emitted on initial mount (first-update else branch). |
| WR-02 | WARNING | toast.ts | `_dismiss()` host `animationend` listener can fire early from composed shadow animations, dispatching `am-close` prematurely. Touches the FIX-01 code path. |
| IN-01/IN-02 | INFO | toast test / dialog.ts | Unused `oneEvent` import; nudge listeners accumulate across rapid blocked clicks (benign, torn down on disconnect). |

### Human Verification Required

1. **CR-01 (critical) fix-now vs defer** — command-palette wrong-command execution when groups interleave. Decide before v1.0 freeze; existing tests do not catch it.
2. **WR-01 (warning)** — spurious `am-close` on mount for three overlays; a frozen public event fired on a close that never happened.
3. **WR-02 (warning)** — toast early `am-close` from composed shadow `animationend`.
4. **FIX-02 traceability** — flip REQUIREMENTS.md FIX-02 from Pending/`[ ]` to satisfied so the tracker matches the verified code + green suites.

### Gaps Summary

No gap against the phase's own goal. All four success criteria (FIX-01..04) plus the shared TeardownScope discipline are VERIFIED in source and proven by passing behavioral tests (101 jsdom tests green; the state-transition/cleanup invariants each have a named passing test; the browser FIX-03 assertion is flipped to the guarded form). No debt markers, no public-surface leak, no regression introduced.

Status is `human_needed` — not `passed` — because the phase's own code review (`03-REVIEW.md`, status `issues_found`) surfaced a CRITICAL defect (CR-01) and two warnings (WR-01, WR-02) living in files this phase modified and affecting the v1.0 frozen public API, plus a FIX-02 traceability inconsistency in REQUIREMENTS.md. These are outside the four success criteria and are escalated for a human decision rather than silently passed or falsely marked as goal failures.

---

_Verified: 2026-08-18T02:31:07Z_
_Verifier: Claude (gsd-verifier)_
