# Codebase Concerns

**Analysis Date:** 2026-08-10

## Tech Debt

**Large component files approaching maintainability limit:**
- Issue: Components with 600+ lines are difficult to test, modify, and refactor
- Files: `src/components/combobox/combobox.ts` (741 lines), `src/components/select/select.ts` (718 lines), `src/components/date-picker/date-picker.ts` (633 lines), `src/components/time-picker/time-picker.ts` (627 lines)
- Impact: Increased cognitive load for contributors; difficult to isolate bugs; slow test feedback
- Fix approach: Break into smaller sub-components or extract shared logic into utilities; consider composition patterns for complex state management

**Untracked setTimeout callbacks in toast dismiss:**
- Issue: `src/components/toast/toast.ts` line 260 has a `setTimeout(onEnd, 300)` that's not tracked or cleaned up
- Files: `src/components/toast/toast.ts`
- Impact: If toast is removed from DOM before 300ms, callback still executes and may manipulate detached node (though likely benign; no direct harm observed)
- Fix approach: Track dismiss timer like the main auto-dismiss timer; add to `_clearTimer()` method

**Dialog animation cleanup potential issue:**
- Issue: `src/components/dialog/dialog.ts` `_nudge()` method (line 217-225) adds `animationend` listener with `{ once: true }` but also relies on implicit cleanup
- Files: `src/components/dialog/dialog.ts`
- Impact: Low risk (once listener handled correctly), but pattern is fragile if animation doesn't fire
- Fix approach: Consider explicit cleanup or add to `disconnectedCallback`

## Known Bugs

**None explicitly documented.** Review closed 2026-04-25 fixed all P0/P1 issues noted in `fixes.md`.

## Security Considerations

**No HTML/template injection vectors detected:**
- Risk: Components use Lit's safe templating exclusively
- Files: All components in `src/components/`
- Current mitigation: No `innerHTML`, `dangerouslySetInnerHTML`, or `eval()` usage detected
- Recommendations: Continue enforcing Lit-only patterns in code review; lint rule to block innerHTML

**Form control value handling:**
- Risk: Form-associated components (`input`, `select`, `combobox`, etc.) accept arbitrary string values
- Files: `src/components/input/input.ts`, `src/components/select/select.ts`, `src/components/combobox/combobox.ts`, `src/components/date-picker/date-picker.ts`
- Current mitigation: Values stored as strings; no XSS risk via form submission (native form encodes)
- Recommendations: None required (standard browser behavior)

**ElementInternals API dependency:**
- Risk: Form-associated components depend on `ElementInternals`, which is NOT polyfillable
- Files: Button, Input, Select, Combobox, DatePicker, TimePicker, ColorPicker, Slider, Switch, Checkbox, Radio, Textarea, RichSelect all use `attachInternals()`
- Current mitigation: Browser floor enforced at Safari 16.4 (first release with ElementInternals)
- Recommendations: Document clearly in BROWSER_SUPPORT.md (already done) that form controls silently fail to submit below floor

## Performance Bottlenecks

**DataGrid render with large datasets:**
- Problem: Renders all rows into DOM even if only subset visible
- Files: `src/components/data-grid/data-grid.ts`
- Cause: No virtualization; uses `repeat()` directive which is efficient but still renders all nodes
- Improvement path: Consider implementing virtual scrolling for 1000+ row datasets; add lazy-loading example to Storybook

**Combobox filtering with large option lists:**
- Problem: Client-side filtering on every keystroke; no debouncing for async mode
- Files: `src/components/combobox/combobox.ts`
- Cause: Property change triggers full re-filter; async mode fires `am-search` event on every character
- Improvement path: Add `minChars` prop to limit search event firing (already exists but worth documenting); for client-side, no issue for <1000 options

**Floating-UI updates:**
- Problem: Each component using floating-ui (combobox, dropdown, popover, tooltip, date-picker, context-menu) sets up autoUpdate; could restart on unrelated property changes
- Files: `src/components/combobox/combobox.ts`, `src/components/dropdown/dropdown.ts`, `src/components/popover/popover.ts`, `src/components/tooltip/tooltip.ts`, `src/components/date-picker/date-picker.ts`, `src/components/context-menu/context-menu.ts`
- Cause: Positions computed every update if not gated
- Improvement path: Audited and fixed 2026-04-25; continue enforcing in PR reviews that autoUpdate only starts on `open` transitions

## Fragile Areas

**Global event listener lifecycle:**
- Files: `src/components/combobox/combobox.ts`, `src/components/dropdown/dropdown.ts`, `src/components/context-menu/context-menu.ts`, `src/components/date-picker/date-picker.ts`, `src/components/popover/popover.ts`, `src/components/tooltip/tooltip.ts`
- Why fragile: Multiple components attach document-level click/keydown listeners on open; must clean up on close or component disconnect
- Safe modification: Always gate listener attach/detach on `_open` state or `connectedCallback`/`disconnectedCallback`; never attach on property change
- Test coverage: Gaps exist; no tests specifically for listener lifecycle

**Async/dynamic option loading:**
- Files: `src/components/combobox/combobox.ts`, `src/components/select/select.ts`, `src/components/rich-select/rich-select.ts`
- Why fragile: Component accepts new `options` while dropdown is open; filter state may become stale; highlighted index may exceed bounds
- Safe modification: Test with async data fetches (e.g., fetch on search, rapid option updates); ensure highlighted index is clamped
- Test coverage: `test/components/combobox.test.ts` has basic async test; no tests for rapid option updates

**Focus management in overlays:**
- Files: `src/components/dialog/dialog.ts`, `src/components/drawer/drawer.ts`, `src/components/command-palette/command-palette.ts`, `src/components/popover/popover.ts`
- Why fragile: `_previouslyFocused` may point to removed element; focus restoration can fail silently
- Safe modification: Always check if previously focused element still exists in DOM before calling `.focus()`
- Test coverage: No tests for focus restoration; only basic open/close tested

**CSS variable token availability:**
- Files: All components
- Why fragile: Components assume CSS tokens are defined (e.g., `var(--am-text)`, `var(--am-primary)`)
- Safe modification: Ensure `<am-theme-provider>` or `dist/styles/tokens.css` is imported in consuming app; no fallback if missing
- Test coverage: Storybook wrapped in theme provider; unit tests may lack this (check `test/setup.ts`)

## Scaling Limits

**Component count:**
- Current capacity: 67 components
- Limit: No hard limit; maintainability risk rises with component count
- Scaling path: Establish component governance (tiers: core vs. addon); document feature freeze to prevent sprawl

**Test file organization:**
- Current capacity: 46 test files covering ~66 components
- Limit: Some test grouping (e.g., `display-trivial.test.ts`, `layout-primitives.test.ts`) works; but 20 components lack dedicated test files
- Scaling path: Require 1:1 test file per component; consolidate grouped tests with clear naming

**Package bundle size:**
- Current: Not analyzed; Lit + FloatingUI dependencies add overhead
- Limit: ESM tree-shaking should mitigate; but `dist/amris.js` bundles all components
- Scaling path: Monitor bundle size in CI; consider shipping smaller entry points (core, essentials, full)

## Dependencies at Risk

**TypeScript 6.0.3:**
- Risk: Version 6.0.3 is very recent (released ~Aug 2026); early-adoption risk of undiscovered bugs
- Impact: Type checking failures; stricter type narrowing could break existing code
- Migration plan: Pin to latest stable 5.x if instability observed; test upgrade in PR before landing

**Vite 8.0.0:**
- Risk: Major version bump; build system changes could introduce subtle issues
- Impact: SSR capabilities missing; potential changes to dev server behavior
- Migration plan: Well-established; no known issues; continue monitoring

**Lit 3.3.2 (peer dependency):**
- Risk: Lit maintains stable API; low risk
- Impact: Consumers must provide Lit; incompatible versions will break at runtime
- Migration plan: Document Lit version requirement prominently in README

**@floating-ui/dom 1.7.6:**
- Risk: Floating UI API stable; minor updates safe
- Impact: Breaking changes to positioning middleware would require component refactor
- Migration plan: Test minor version upgrades; lock to current major version until stable

## Missing Critical Features

**Virtualization for data-heavy components:**
- Problem: DataGrid, Combobox, and other list-based components don't virtualize
- Blocks: Rendering 1000+ items efficiently
- Workaround: Filter / paginate on server before sending to component

**Form validation messages:**
- Problem: Components don't display validation messages from `ElementInternals.validationMessage`
- Blocks: Showing server-side validation errors (e.g., "Email already registered")
- Workaround: External `<am-error-text>` component must be placed by consumer

**Keyboard shortcut registry:**
- Problem: `am-command-palette` hardcodes Cmd+K; no global shortcut registry
- Blocks: Customizing shortcuts per app; managing conflicts
- Workaround: Override via CSS (visibility: hidden) + duplicate hidden combobox

## Test Coverage Gaps

**Components without dedicated test files (20):**
- What's not tested: `app-shell`, `button-group`, `card`, `empty-state`, `error-text`, `field`, `grid`, `hint-text`, `icon`, `label`, `link-button`, `nav-bar`, `panel`, `progress-ring`, `side-nav`, `split-view`, `stack`, `stat`, `status-dot`, `surface`, `table`, `timeline`, `visually-hidden`
- Files: No test files for listed components
- Risk: Breaking changes in simple components (e.g., icon, divider) may go unnoticed; layout components (grid, stack, surface) lack regression tests
- Priority: HIGH for display-only components; MEDIUM for simple layout; LOW for visual-only

**Form integration testing:**
- What's not tested: Form submission with form-associated controls; validation API interaction; disabled/readonly state interaction with forms
- Files: No comprehensive form integration tests; only unit tests for individual components
- Risk: Form-associated components may fail to submit or participate in validation; edge cases with multiple controls
- Priority: HIGH — form integration is load-bearing feature

**Async/dynamic content:**
- What's not tested: Rapid option updates in combobox/select while dropdown open; async search with cancelled requests; streaming data into data-grid
- Files: Minimal async tests in `test/components/combobox.test.ts`; no cancellation tests
- Risk: Race conditions; memory leaks from pending requests
- Priority: MEDIUM

**Focus trapping in overlays:**
- What's not tested: Focus restoration after modal close; focus trap in nested dialogs; Escape key behavior
- Files: Basic open/close tests in dialog/drawer; no focus-specific tests
- Risk: Focus escapes dialog; users stuck in nested dialog; Tab cycling broken
- Priority: MEDIUM

**Accessibility (a11y):**
- What's not tested: Only `test/a11y.test.ts` runs axe-core scans; coverage limited to rendered components in isolation
- Files: `test/a11y.test.ts`
- Risk: Contextual a11y issues (e.g., dialog as toast alternative); aria-live updates; keyboard nav edge cases
- Priority: MEDIUM — axe catches low-hanging fruit; but no manual a11y walkthroughs

**Browser-specific rendering:**
- What's not tested: Components tested only in jsdom (simulated DOM); no real browser tests
- Files: `vitest.config.ts` uses `environment: 'jsdom'`
- Risk: Platform APIs may differ (e.g., dialog behavior); CSS features fail silently
- Workaround: Use Storybook + manual cross-browser testing; no automated CI validation
- Priority: LOW — covered by manual testing documented in BROWSER_SUPPORT.md

---

*Concerns audit: 2026-08-10*
