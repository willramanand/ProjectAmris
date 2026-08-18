---
phase: 03-reliability-leak-fixes
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/internal/helpers/teardown-scope.ts
  - src/components/toast/toast.ts
  - src/components/dialog/dialog.ts
  - src/components/drawer/drawer.ts
  - src/components/command-palette/command-palette.ts
  - test/internal/teardown-scope.test.ts
  - test/components/toast.test.ts
  - test/components/dialog.test.ts
  - test/components/drawer.test.ts
  - test/components/command-palette.test.ts
  - test/components/popover.test.ts
  - test/browser/overlay-focus.test.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The phase's stated deliverables are sound. `TeardownScope` is a correct, minimal timer + AbortController tracker that is *not* on the public/CEM surface (D-09 satisfied — it registers no custom element and is imported only by component source). The toast mid-dismiss teardown (FIX-01), dialog nudge `animationend` teardown (FIX-04), and the `isConnected`-guarded focus restoration on dialog/drawer/command-palette (FIX-03) all trace cleanly and are covered by the added tests, including the deterministic abort-signal assertion in `dialog.test.ts` and the real-Chromium focus-trap suite in `overlay-focus.test.ts`. No security issues (no `innerHTML`/`eval`, no hardcoded colors, all SVG via Lit `html`).

However, adversarial tracing surfaced defects in the reviewed source that fall outside the narrow leak-fix scope but ship in these files:

- A keyboard-selection/visual-highlight index mismatch in `command-palette.ts` that can execute the *wrong* command (CR-01).
- A spurious `am-close` lifecycle event emitted on initial render by all three modal overlays (WR-01).
- The toast dismiss-complete `animationend` listener is attached to the host and can be triggered early by composed animations bubbling from shadow descendants (WR-02).

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: Command-palette keyboard highlight/selection diverges from rendered order when groups interleave

**File:** `src/components/command-palette/command-palette.ts:262`, `:269-271`, `:306-317`, `:349`
**Issue:** Keyboard navigation (`ArrowDown`/`ArrowUp`) and `Enter` selection both index into `this._filtered` — the *original* command order (`_handleKeydown`, lines 262/271). But `render()` re-orders items by grouping: it builds a `Map` from `filtered` and emits items group-by-group, incrementing a flat `itemIndex` across groups (lines 311-315, 347). The visual `.highlighted` class is applied when `idx === this._highlightedIndex` where `idx` is the *grouped* render index (line 349).

When a consumer supplies commands whose groups are non-contiguous (e.g. `[{group:'A'},{group:'B'},{group:'A'}]`), the grouped render order differs from `_filtered` order. The item the user sees highlighted is then not the item `Enter` selects — `_selectCommand` runs the wrong `CommandItem`, invoking an unintended `cmd.action?.()`. The existing tests pass only because the fixture commands are already grouped contiguously (`File,File,File,Edit`), masking the bug.

**Fix:** Navigate and select over the same flattened, grouped order that is rendered. Compute the flat list once and reuse it for both render and keyboard handling, e.g.:
```ts
private get _ordered(): CommandItem[] {
  const groups = new Map<string, CommandItem[]>();
  for (const cmd of this._filtered) {
    const g = cmd.group || '';
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(cmd);
  }
  return Array.from(groups.values()).flat();
}
```
Then use `this._ordered` in `_handleKeydown` (length, `[_highlightedIndex]`) and drive `render()`/`itemIndex` from the same source so visual highlight and selection always agree.

### Warnings

#### WR-01: Spurious `am-close` (and lifecycle) event dispatched on initial render while closed

**File:** `src/components/dialog/dialog.ts:192-197`, `:205-211`; `src/components/drawer/drawer.ts:196-201`, `:209-215`; `src/components/command-palette/command-palette.ts:216-232`
**Issue:** On the *first* Lit update, `changedProperties` includes every initialized reactive property, so `changed.has('open')` is `true` even though `open` was never toggled. With the default `open = false`, the `else` branch runs on mount: dialog/drawer call `_hide()` (which dispatches `am-close`, lines 210/214), and command-palette runs its else branch (dispatches `am-close`, line 229). A freshly-mounted, never-opened overlay therefore emits a public `am-close` event. This is a frozen-API v1 contract concern: a consumer that wires `am-close` to teardown/removal or analytics will act on a close that never happened (e.g. a wrapper that removes the overlay on `am-close` would self-destruct on mount). It is currently untested because every test attaches its `am-close` listener after mount.

**Fix:** Only react to a genuine transition. Skip the first update, or gate on the previous value:
```ts
protected updated(changed: PropertyValues) {
  if (changed.has('open') && changed.get('open') !== undefined) {
    this.open ? this._show() : this._hide();
  }
}
```
Apply the equivalent guard to the command-palette `updated` block. (Opening with `<am-dialog open>` still fires `am-open`, which is intended.)

#### WR-02: Toast dismiss-complete listener on the host can be triggered early by composed shadow animations

**File:** `src/components/toast/toast.ts:263-271`
**Issue:** `_dismiss()` registers `animationend` on `this` (the host) to detect completion of the `toast-out` fade, then removes `dismissing`, sets `open = false`, and dispatches `am-close`. `animationend` is a composed event, so animations running on shadow-DOM descendants bubble to this host listener: the countdown ring (`.countdown-ring circle`, which finishes at ~the same instant the auto-dismiss timer fires) and the entrance `toast-in` animation (if the user clicks close during entry). Either can invoke `onEnd` before the `toast-out` fade completes, cutting the exit animation short and firing `am-close` prematurely. The `done` guard prevents a double dispatch but does not prevent the *early* dispatch.

**Fix:** Disambiguate by animation name so only the host's own exit animation completes the dismiss:
```ts
const onEnd = (e?: AnimationEvent) => {
  if (e && e.animationName !== 'toast-out') return;
  if (done) return;
  done = true;
  ...
};
this.addEventListener('animationend', onEnd, { signal: this._teardown.signal });
this._teardown.timeout(() => onEnd(), 300);
```
(Dropping `once: true` in favor of the name check is required, otherwise an unrelated bubbling `animationend` consumes the one-shot listener.)

### Info

#### IN-01: Unused import in toast test

**File:** `test/components/toast.test.ts:5`
**Issue:** `oneEvent` is imported but never used (dialog/drawer/command-palette/popover tests all use it; this one does not). It does not break the build because `tsconfig.json` scopes `noUnusedLocals` to `include: ["src"]`, but it is dead code in a phase that adds tests.
**Fix:** Remove `oneEvent` from the import on line 5.

#### IN-02: Nudge `animationend` listeners accumulate across rapid blocked backdrop clicks

**File:** `src/components/dialog/dialog.ts:228-236`
**Issue:** Each `_nudge()` call adds a fresh `animationend` listener (line 233) without removing prior ones. Rapid blocked backdrop clicks before a single `animationend` fires register N `once` listeners on the same signal; all fire on the next `animationend` and each redundantly removes the `nudge` class. Behavior is correct and fully torn down via `_teardown` on disconnect, so this is benign — but it is unnecessary churn.
**Fix:** Optional. Reuse a single bound handler, or abort/replace the prior nudge listener before adding a new one (e.g. a dedicated short-lived scope per nudge).

---

_Reviewed: 2026-08-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
