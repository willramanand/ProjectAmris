# Pitfalls Research

**Domain:** Performance / bundle-size / cross-engine hardening of a frozen-API Lit 3 Web Components library (Amris v1.1) for low-end enterprise devices and slow networks
**Researched:** 2026-08-20
**Confidence:** HIGH (codebase-grounded: exact deps, `sideEffects`, `.size-limit.json`, `:has()`/ElementInternals/virtualizer usage all verified in-repo; cross-engine ARIA-reflection facts web-verified)

> **Reading guide.** Two failure classes are flagged inline and must be treated as release-blocking:
> - 🧊 **FREEZE-VIOLATION** — silently changes the behavior/DOM/CEM surface frozen at v1.0. The surface-diff gate (`npm run diff:surface`) catches *shape* changes but **not** behavioral or runtime-degraded-path divergence, so these need their own guards.
> - ♿ **A11Y-REGRESSION** — a perf/size/compat change that quietly breaks assistive-tech semantics. axe-in-browser catches static violations but **not** virtualized set-size, live-region timing, or focus-order regressions.
>
> Assumed v1.1 phase structure (from PROJECT.md target features):
> **P1 Measurement harness + budgets** · **P2 Bundle-size reduction** · **P3 Runtime-perf tuning** · **P4 Graceful degradation / compat matrix** · **P5 CI-enforced perf+size gates (report-only→enforcing)**

---

## Critical Pitfalls

### Pitfall 1: Measuring in jsdom / on unthrottled CI runners and calling it "low-end perf" 🧊(indirect)

**What goes wrong:**
The test harness runs `vitest --project jsdom`, and CI runners are fast shared x86 boxes. Runtime timings taken there (render time, re-render counts via wall-clock, memory) do not reflect a throttled ARM Chromebook. Worse, jsdom stubs layout — `getBoundingClientRect`, `ResizeObserver`, `IntersectionObserver`, and floating-ui/virtualizer positioning all return zeros or no-op, so any "perf" number measured there is measuring the mock, not the component. Teams then "optimize" against a fiction and set budgets that never fire on the real target.

**Why it happens:**
jsdom is already the default test lane and it's fast, so it's the path of least resistance. The distinction between "does it render" (jsdom is fine) and "how expensive is it" (jsdom is meaningless) gets blurred under budget pressure.

**How to avoid:**
- Do runtime-perf measurement **only** in the real-browser lane (Vitest Browser Mode + Playwright/Chromium already exists from v1.0) with CPU throttling via CDP (`Emulation.setCPUThrottlingRate`) and network throttling for load metrics. Pin a throttle multiplier (e.g. 4–6×) chosen from the real baseline device, and record it in the harness config.
- Measure **operation counts** that are engine-independent (Lit `update`/`render` call counts, `computePosition` invocations, ResizeObserver callback counts, DOM node counts) alongside wall-clock. Counts are stable across runners; wall-clock is the flaky part — gate on counts, report wall-clock.
- Never source a runtime number from the jsdom project. Keep jsdom for behavior, browser lane for cost.

**Warning signs:**
Perf numbers identical between a laptop and CI; timings in microseconds for components that visibly paint; ResizeObserver/IntersectionObserver-driven components showing "0 layout cost."

**Phase to address:** P1 (Measurement harness + budgets)

---

### Pitfall 2: Measuring bundle size wrong — pre-gzip vs post-gzip/brotli, and mis-attributing shared chunks 🧊(indirect)

**What goes wrong:**
`.size-limit.json` today measures gzip of four fixed artifacts (`amris-core.js`, `amris.js`, `button`, `data-grid`) with `ignore: ["lit","@floating-ui/dom"]`. Two traps:
1. **Ignored deps hide the win you're trying to make.** The whole v1.1 thesis is "defer floating-ui." But floating-ui is `ignore`d in every entry, so moving it behind a dynamic `import()` will show **near-zero change** in the gate — the number was already excluding it. You can "succeed" on the budget while the shipped per-route payload is unchanged, or regress and not see it.
2. **Per-entry attribution double-counts shared code.** `button`, `data-grid`, core, and full overlap heavily (shared `src/internal/`, tokens, Lit-independent helpers). Summing per-entry sizes overstates total install cost; measuring only `amris.js` understates per-component cost. Consumers deep-import, so the real metric is *marginal* bytes per component over the shared baseline.

**Why it happens:**
The v1.0 gate was designed to police *regressions in what ships*, deliberately excluding the peer dep (Lit) and the then-static floating-ui. v1.1 changes floating-ui from "always bundled" to "lazily loaded," which invalidates the `ignore` assumption.

**How to avoid:**
- Decide brotli **or** gzip and use it consistently everywhere (real registries serve brotli; gzip is the conservative floor). Report both, gate on one.
- Re-scope the `ignore` list per metric intent: keep `lit` ignored (peer dep, never shipped) but **stop ignoring `@floating-ui/dom`** in at least one dedicated "delivered payload" metric so deferral shows up as a real reduction.
- Add a **marginal-cost** metric: measure each component entry against the shared-chunk baseline (size-limit `import` syntax or a per-entry-minus-core diff), not raw file size, so shared-chunk moves aren't double-counted.
- Add a first-load metric (core + typical 3-component set) distinct from full-catalog size.

**Warning signs:**
A deferral PR that changes shipped code but not the size-limit number; per-component budgets that sum to more than the full bundle; brotli-vs-gzip mismatch between local and CI.

**Phase to address:** P1 (define metrics) + P2 (bundle-size reduction validates against them)

---

### Pitfall 3: Tree-shaking regression from mis-declared `sideEffects` (custom-element registration is a side effect) 🧊 FREEZE-VIOLATION

**What goes wrong:**
`@customElement('am-button')` **is** a side effect — importing the module registers the element via `customElements.define()`. `package.json` currently declares `sideEffects: ["./dist/amris.js","./dist/amris-core.js","./dist/components/**/*.js","./dist/chunks/**/*.js","./dist/styles/*.js"]` — i.e. "these files have side effects, keep them." Two symmetric failures during size work:
- **Over-narrowing** (to "shake harder"): flipping `sideEffects:false` or trimming the components glob makes a bundler drop a component import whose only effect was `customElements.define`. The consumer's `<am-select>` silently renders as an unstyled unknown element — a **behavior change against the frozen surface** that no CEM diff catches (the CEM still lists the element; the runtime just never defines it).
- **Over-broadening**: marking pure helper/token modules as side-effectful defeats the tree-shaking the milestone wants.

**Why it happens:**
`sideEffects` is subtle and bundler-specific; "set it to false for smaller bundles" is common advice that is actively wrong for a custom-element library where import-for-registration is the entire distribution model.

**How to avoid:**
- Treat every entry that runs `@customElement`/`customElements.define` as side-effectful **forever**; only pure modules (tokens as JS objects, type-only, pure utils) may be shakeable.
- Keep the existing **tree-shaking canary** (v1.0 CI) and extend it: a fixture that imports one component and asserts (a) unrelated components are absent from output AND (b) the imported component still `define`s at runtime (registration smoke). The second half is the freeze guard.
- Verify with the existing tarball `smoke` test that a deep import actually upgrades the element in a real DOM.

**Warning signs:**
Bundle shrinks more than expected after a `sideEffects` edit; consumer app shows raw unstyled tags / `HTMLUnknownElement`; canary passes on "size" but no registration assertion exists.

**Phase to address:** P2 (Bundle-size reduction) — guard authored in P1/P5 gates

---

### Pitfall 4: Lazy-loading floating-ui breaks adoptedStyleSheets / first-position paint or opens a Shadow-DOM race 🧊 FREEZE-VIOLATION

**What goes wrong:**
Seven components import `@floating-ui/dom` directly (color-picker, combobox, dropdown, popover, rich-select, select, tooltip) plus the shared `floating-position` controller. Deferring it behind `await import('@floating-ui/dom')` introduces a microtask/network gap between "overlay opens" and "position computed." Failure modes:
- The overlay paints at viewport `0,0` for one or more frames before the async `computePosition` resolves — a visible jump on slow networks/CPUs, exactly the low-end target. On slow networks the chunk fetch can take seconds, so the overlay is mispositioned or invisible while it loads.
- If the open path assumed synchronous positioning (e.g. focus-first-item after position, or `autoUpdate` started inline in the same tick), the async gap reorders those steps — focus lands before layout, screen-reader announces a zero-size element, or `autoUpdate` attaches to a not-yet-positioned node.
- Constructable/adopted stylesheets are unrelated to floating-ui but the same "async open" refactor often reshuffles `firstUpdated` ordering; a component that adopted its stylesheet in the sync open path can flash unstyled.

**Why it happens:**
"Dynamic import the big dep" is treated as mechanical, but overlays have an ordering contract (open → position → focus → autoUpdate) that a promise inserts a seam into.

**How to avoid:**
- **Prefetch on intent, not on open**: kick the `import()` on `pointerenter`/`focus` of the trigger (or on `connectedCallback` for always-present overlays) so the chunk is warm before the user opens. Keep the open→position→focus sequence intact by `await`ing the (usually already-resolved) promise.
- Render the overlay `visibility:hidden` / `opacity:0` until the first `computePosition` resolves, then reveal — never paint at `0,0`. Preserve the existing "reveal after positioned" behavior exactly.
- Keep `autoUpdate` start gated on `open` transitions (already an audited rule per CONCERNS.md) and start it **after** first position, inside the resolved promise.
- Add a real-browser test on a throttled network profile asserting no `0,0` frame and that focus still lands on the correct element post-open.

**Warning signs:**
Overlay "jumps" into place on first open; tooltip appears top-left then moves; focus test flakes after adding `await`; Playwright screenshot diff on overlay open.

**Phase to address:** P2 (deferral) with P3 verification; a11y/focus assertions from P4

---

### Pitfall 5: Accidentally bundling Lit (or duplicating it) via a chunking/deferral refactor 🧊 FREEZE-VIOLATION

**What goes wrong:**
Lit is a **peer dependency** (`lit: ^3.3.2`) and must never be bundled — consumers provide it, and a second copy breaks reactive-controller identity, `directive` instanceof checks, and doubles payload. A Vite `manualChunks`/`rollupOptions.external` change made while splitting per-component chunks can drop `lit`/`@lit/*`/`@lit-labs/*` from `external`, pulling Lit into `dist`. size-limit `ignore`s `lit`, so the **size gate will not catch this** — the bytes are hidden by the ignore rule.

**Why it happens:**
Reworking `build.rollupOptions` for smaller chunks is exactly the P2 activity, and `external` is easy to regress. The size gate's `ignore:["lit"]` masks the symptom.

**How to avoid:**
- Add an explicit **"no bundled Lit" assertion** independent of size-limit: grep the emitted `dist/**/*.js` for Lit source markers / a duplicate `lit` module, or assert `dist` imports `lit` as a bare specifier (external) rather than inlining it. Fail CI on any inlined Lit.
- Keep `external` centrally defined (`lit`, `@lit/*`, `@lit-labs/*`, `@floating-ui/*`) and snapshot-test the Vite config's external list.
- The tarball `smoke` test should install with Lit as a peer and assert a single Lit instance at runtime (`import.meta`/registry identity).

**Warning signs:**
`amris.js` grows but size gate is green (Lit ignored); consumer sees "multiple versions of Lit loaded" console warning; directives silently no-op in consumer app.

**Phase to address:** P2 (chunking) — assertion added in P5 gates

---

### Pitfall 6: Deduping shared chunks wrong across per-component entries (over-splitting) 🧊(indirect)

**What goes wrong:**
Pushing shared code (`src/internal/` controllers, tokens, teardown-scope) into many tiny shared chunks to "avoid duplication" can *increase* real-world cost: on HTTP/1.1 enterprise proxies and cold caches, dozens of 1–2 kB chunk requests are slower than a few right-sized files. Over-splitting also raises the chance that a component deep-import pulls a waterfall of chunk requests before it can register — worsening first-interaction latency on slow networks, the exact target. Conversely, under-deduping copies the controller into every component entry, bloating deep imports.

**Why it happens:**
`manualChunks` tuning optimizes a graph metric (no duplication) rather than the delivery metric (request count × RTT on a throttled link).

**How to avoid:**
- Optimize chunking against the **first-load metric** (Pitfall 2), measured on the throttled network profile, not against a "zero duplication" ideal.
- Keep a small number of coherent shared chunks (e.g. one "internal-runtime" chunk for controllers/helpers) rather than per-module granularity. Verify deep-import waterfalls with a network trace, not just byte totals.

**Warning signs:**
Deep-import a single component triggers 10+ chunk requests; total bytes drop but first-interaction time rises on throttled network; many <2 kB chunks in `dist/chunks/`.

**Phase to address:** P2, validated against P1 first-load metric

---

### Pitfall 7: `highlight.js` (and other declared-but-unimported deps) — deferring a phantom, or accidentally shipping a dev-only dep 🧊(indirect)

**What goes wrong:**
`highlight.js@^11.11.1` is declared in `package.json` **but is not imported anywhere in `src/`** (grep confirms only substring false-positives like `highlightedIndex`). The milestone lists "defer highlight.js" as a size win — but if it isn't in the shipped graph, there is nothing to defer and the "win" is illusory. The real risks are the inverse: (a) it's used only in Storybook/docs and should simply be a `devDependency` (moving it out of `dependencies` is the actual fix, not lazy-loading); or (b) some code path does pull it into `dist`, in which case it's shipping ~900 kB of syntax grammars to every consumer.

**Why it happens:**
Dependency lists drift; a doc/demo dep sits in `dependencies`. "Defer the heavy dep" is assumed without confirming it's in the runtime graph.

**How to avoid:**
- First **prove where each heavy dep lands** in `dist` (bundle analyzer / import graph) before planning to defer it. Only defer deps that are actually in a shipped entry.
- Move genuinely dev/docs-only deps (highlight.js if Storybook-only) to `devDependencies` — a zero-runtime-risk size win. Guard with a CI check that `dependencies` contains only things imported by `src/`.

**Warning signs:**
A "defer X" task with no measurable before/after; a `dependency` never imported by `src`; `dist` size includes grammar/theme files.

**Phase to address:** P1 (dependency-graph audit) → P2 (act: devDep move or real defer)

---

### Pitfall 8: Virtualizing (or deepening virtualization of) data-grid / combobox / select breaks screen-reader set semantics and selection identity ♿ A11Y-REGRESSION 🧊 FREEZE-VIOLATION

**What goes wrong:**
`@lit-labs/virtualizer` renders only visible rows/options and **removes offscreen DOM**. Perf work that extends virtualization or tunes its buffer can silently break:
- **Set semantics**: with rows removed, a screen reader counts only rendered rows unless `aria-rowcount`/`aria-rowindex` (grid) or `aria-setsize`/`aria-posinset` (listbox) reflect the *full* dataset. Tuning the render window changes how many are present, so a missing/incorrect setsize now announces "3 of 3" instead of "3 of 5000." (Web-confirmed: virtualizer removes offscreen elements; setsize/rowcount must be authored separately.)
- **`aria-activedescendant` dangling**: combobox/select drive active option via `aria-activedescendant` pointing at an option `id`. If the active option scrolls out and is unmounted, the referenced id no longer exists → the AT loses the active item, arrow-key nav goes silent.
- **Selection / form-value identity**: multi-select or grid selection keyed on DOM node identity (not a stable data id) loses selection when a row unmounts and remounts. Since these components report `setFormValue`, a dropped selection is a **frozen-behavior violation** — the submitted value diverges from v1.0.

**Why it happens:**
Virtualization's whole point is removing DOM; a11y and selection models that implicitly assumed "all items exist" break at the seam, and jsdom/axe won't surface it (axe scans present DOM; the removed rows can't be scanned).

**How to avoid:**
- Author `aria-rowcount`/`aria-setsize` from the **full data length**, not the rendered length; add a test asserting they stay constant as the scroll window changes.
- Keep `aria-activedescendant` pointing at an item that is guaranteed rendered — scroll the active item into view before setting it, or keep a stable off-DOM active model and only reference rendered ids.
- Key selection and form value on **stable data ids**, never DOM node identity; assert selection + `setFormValue` survive a scroll that unmounts and remounts the selected row (real-browser test).
- This is v1.0-shipped virtualization (do not re-litigate it) — but any P3 tuning of buffer size / window must re-run these assertions.

**Warning signs:**
Screen reader announces rendered count not total; arrow keys stop moving after scrolling; selection clears on scroll; submitted form value differs after scrolling a large list.

**Phase to address:** P3 (runtime-perf tuning of heavy components), a11y assertions co-authored with P4

---

### Pitfall 9: Feature-detecting ElementInternals wrong, and assuming ARIA reflection ships wherever FACE ships ♿ A11Y-REGRESSION 🧊 FREEZE-VIOLATION

**What goes wrong:**
Graceful degradation below Safari 16.4 hinges on correctly detecting ElementInternals. Two specific errors:
- **Wrong detection probe**: checking `'attachInternals' in HTMLElement.prototype` is *necessary but not sufficient* — some engines expose `attachInternals()` but not form association (`setFormValue`) or not the ARIA-reflection surface. Checking only the presence of the method, then calling `setFormValue`, throws in partial implementations.
- **Assuming ARIA reflection == FACE**: checkbox/radio/switch set default semantics via `ElementInternals` ARIA (`internals.role`/`aria*`). Web-verified: **id-ref ARIA reflection** (`aria-labelledby`/`aria-controls`/`aria-activedescendant` via internals) landed in WebKit *later* than basic ElementInternals, and role/state reflection has its own timeline. So an engine at-or-near the floor can have working `setFormValue` but **broken ARIA reflection**, meaning the control submits correctly but is announced as a generic group with no role/state. Feature-detecting only "internals exists" then relying on ARIA reflection produces a silent a11y regression.

**Why it happens:**
ElementInternals is treated as one atomic capability; in reality FACE, ARIA state reflection, and id-ref ARIA reflection shipped on **different dates per engine**, and detection code conflates them.

**How to avoid:**
- Probe **each sub-capability independently**: `attachInternals` presence, then `'setFormValue' in internalsInstance`, then ARIA-reflection support (e.g. feature-test that setting `internals.ariaChecked` is reflected in the accessibility tree, or gate by known-good engine versions documented in BROWSER_SUPPORT.md).
- Where ARIA reflection is unavailable but the component still renders, fall back to **explicit ARIA attributes on a shadow host child** rather than assuming the accessibility tree got the internals value.
- Document the *true* per-capability floor (not one blanket "Safari 16.4") once tested across the widened WebKit/Firefox/Chromium matrix.

**Warning signs:**
`setFormValue is not a function` on a partial engine; NVDA/VoiceOver announcing a custom control as "group"/"clickable" with no checked state; detection code with a single `if ('attachInternals' in ...)` gate feeding multiple capabilities.

**Phase to address:** P4 (Graceful degradation / compat matrix)

---

### Pitfall 10: Hidden-input form fallback double-submits or diverges from the real value 🧊 FREEZE-VIOLATION

**What goes wrong:**
A common "degrade forms instead of silently failing" implementation below the ElementInternals floor is to inject a hidden `<input>` into the light DOM so the value still submits. Done wrong this:
- **Double-submits**: on engines where ElementInternals *does* work, the hidden input coexists with `setFormValue`, so the field appears twice in the `FormData` (one from internals, one from the hidden input) — a diverging, freeze-breaking submission shape.
- **Diverges on update**: the hidden input's `value` isn't kept in lockstep with the component's internal value (formatting, clear, programmatic set), so the submitted value lags the displayed value.
- **Breaks encapsulation/validation**: a hidden input in light DOM can be styled/reset by consumer CSS and won't carry `setValidity` state, so `:invalid` and constraint validation diverge from the v1.0 contract.

**Why it happens:**
The fallback is added defensively "so forms work below the floor" without gating it strictly on the *absence* of working ElementInternals, and without mirroring every value/validity transition.

**How to avoid:**
- Make the fallback **mutually exclusive** with ElementInternals: only inject the hidden input when the per-capability probe (Pitfall 9) says `setFormValue` is unavailable. Never both.
- If a fallback exists, mirror value **and** validity on every update in one place (single source of truth) and assert via a real-browser form-submit test that `FormData` for a given component is byte-identical between the internals path and the fallback path (minus the expected validity gap).
- Prefer **documented graceful failure** (control renders, is usable, emits events, but does not participate in native submit) over a half-correct hidden-input hack, per the PROJECT.md constraint "document, do not work around." A subtly-wrong submission is worse than a documented non-submission.

**Warning signs:**
A field appears twice in submitted `FormData`; submitted value differs from displayed value after a clear/format; `:invalid` styling differs below the floor.

**Phase to address:** P4 (Graceful degradation)

---

### Pitfall 11: Assuming `:has()`, container queries, constructable stylesheets, or nesting on engines below the tested floor 🧊(indirect)

**What goes wrong:**
Six components use `:has()` in their shadow CSS (app-shell, card, dialog, drawer, panel, side-nav). Widening the engine matrix downward (the milestone's "reach as far back as cheap allows") exposes engines where `:has()` (Firefox <121, older WebKit), `adoptedStyleSheets` (pre-Safari 16.4), or CSS nesting are unsupported. A `:has()` selector that silently doesn't match doesn't error — the component just renders in a subtly wrong state (missing spacing, wrong layout), which reads as a **behavior regression** on the newly-claimed browsers even though nothing "broke."

**Why it happens:**
CSS fails silently — an unsupported selector is dropped, not thrown. "We support browser X now" gets asserted from JS feature detection while CSS capabilities lag on the same engine.

**How to avoid:**
- Enumerate the modern CSS features actually used (`:has()`, `adoptedStyleSheets`, nesting, `@container` — grep shows no container queries today, keep it that way) and cross-reference each against the *lowest* engine in the widened matrix. The true floor is the **max** of the JS-API floor and the CSS-feature floor.
- Where a `:has()` rule is load-bearing for layout, provide a non-`:has()` fallback path (state class toggled in JS) **or** document that the visual refinement degrades below its floor — don't silently ship broken layout.
- Test the matrix visually (Playwright screenshots) on the claimed-lowest engine, not just JS behavior.

**Warning signs:**
"We now support Firefox 115 ESR" claimed from a JS probe while `:has()` layout is broken there; visual diffs only on old engines; no CSS-feature audit in the compat doc.

**Phase to address:** P4 (compat matrix + documented true floor)

---

### Pitfall 12: Cross-engine Shadow-DOM / focus / form quirks surface only when the matrix widens ♿ A11Y-REGRESSION

**What goes wrong:**
The v1.0 real-browser lane is Chromium-only. Widening to WebKit and Firefox surfaces engine-specific behavior that perf refactors can trip:
- **Focus delegation**: `delegatesFocus`, `:focus-visible` inside shadow roots, and `activeElement` piercing shadow boundaries differ across engines. Focus-restoration logic (overlays store `_previouslyFocused`) can restore to the wrong node or `null` on WebKit/Firefox.
- **Form association in nested shadow roots** behaves differently; a control inside a shadow-DOM `<form>` may or may not associate.
- **`ResizeObserver`/`autoUpdate` loop timing** differs — Firefox can fire ResizeObserver at a different cadence, causing floating-ui `autoUpdate` churn (extra `computePosition` calls) that shows up as jank only there.

**Why it happens:**
"It passes in Chromium" was sufficient at v1.0; v1.1 explicitly claims broader engines, so untested engine quirks become promises.

**How to avoid:**
- Run the load-bearing v1.0 browser-lane assertions (ElementInternals/form submit, focus trap + restoration, real `<dialog>`/top-layer, floating-ui positioning) on **all three engines** in the widened matrix, not just Chromium — even if only for the heaviest components (cost-bounded per the out-of-scope note).
- Guard focus restoration with the existing `isConnected` check *and* a null-safe `.focus()` (CONCERNS.md flags `_previouslyFocused` may dangle) — verify on WebKit/Firefox specifically.
- Gate `autoUpdate` on `open` and measure `computePosition` **call counts** per engine (Pitfall 1's count metric) to catch Firefox ResizeObserver churn.

**Warning signs:**
Focus tests green on Chromium, flaky on WebKit; tooltip repositions constantly only in Firefox; form submit works in Chrome, empty in Safari.

**Phase to address:** P4 (widen tested-engine matrix), churn metric from P1/P3

---

### Pitfall 13: Over-eager memoization / render-skipping causes stale renders 🧊(indirect)

**What goes wrong:**
"Fewer re-renders" is a P3 goal. Adding manual `shouldUpdate`/`hasChanged` guards, caching `render()` fragments, or gating `updated()` work behind hand-written dirty checks can skip a render that *should* have happened — a token/theme change, a slotted-content change, or a form-value update that no longer reflects. The component now shows stale content, which is a silent correctness/behavior regression against v1.0.

**Why it happens:**
Lit is already efficient (dirty-checks props, uses `repeat`); teams add a second layer of memoization that fights Lit's own change detection and gets the dependency set wrong.

**How to avoid:**
- Prefer Lit-native tools (`@property({hasChanged})`, `repeat` keys, `guard` directive with an explicit dependency array) over ad-hoc caches; a wrong `guard` dep array is the classic stale-render source — review dep arrays like React hook deps.
- Don't add `shouldUpdate` overrides to components whose profile doesn't show a re-render problem (measure first — Pitfall 1). Optimize only the heavy components the baseline flags.
- Add a test that a theme/token switch and a programmatic value set both still re-render the optimized component.

**Warning signs:**
Dark-mode toggle doesn't restyle a component; value set via property doesn't update the view; slotted content change ignored; `guard`/`shouldUpdate` added without a supporting profile.

**Phase to address:** P3 (runtime-perf tuning)

---

### Pitfall 14: Micro-optimizations that quietly strip a11y attributes, roles, or focus order ♿ A11Y-REGRESSION 🧊 FREEZE-VIOLATION

**What goes wrong:**
Shaving DOM nodes / attributes to reduce render cost removes an element that carried a role, a `visually-hidden` label, an `aria-describedby` target, or a focusable wrapper. Reordering render output for perf changes tab order. These pass functional tests and often pass axe (axe checks presence/relationships of what's rendered, not intent), but break AT behavior — a **frozen-surface violation** because the accessible name/role/order is part of the observable contract.

**Why it happens:**
The a11y scaffolding (extra spans, `visually-hidden`, describedby wiring) looks like "dead weight" to remove when chasing node counts.

**How to avoid:**
- Treat `role`, `aria-*`, `visually-hidden` content, and focus-order DOM as **load-bearing, not removable** during perf work. Any change touching them requires the axe-in-browser scan **plus** a manual/automated accessible-name/role snapshot (e.g. `getComputedAccessibleNode`/Playwright accessibility snapshot) diffed against v1.0.
- Add accessible-name + role snapshot fixtures for the heaviest and most-optimized components, run in the browser lane, as a freeze guard axe can't provide.
- Never reorder rendered focusables for perf without a tab-order test.

**Warning signs:**
Node-count PR that also touches `aria-*` or `visually-hidden`; screen reader announces a different name/role after an "optimization"; tab order changed.

**Phase to address:** P3 (perf tuning) with a11y snapshot guard from P4/P5

---

### Pitfall 15: Flaky perf gates and a premature report-only → enforcing flip that breaks the release pipeline 🧊(indirect)

**What goes wrong:**
Runtime-perf numbers are inherently noisy (GC, shared-runner contention, thermal). Turning a perf budget from report-only to enforcing (mirroring v1.0's coverage gate flip) before the noise floor is characterized produces **red builds on unrelated PRs**, blocking `release.yml`/`publish.yml`. Teams then either disable the gate (losing the guarantee) or pad budgets so loosely they never fire (theater). Size budgets are more stable but have the inverse trap: set too tight against a lucky measurement, the next legitimate feature-preserving change fails.

**Why it happens:**
The v1.0 coverage-gate flip worked because coverage is deterministic; perf timing is not, and the same "report-only → enforcing" playbook is applied without accounting for variance.

**How to avoid:**
- Gate runtime perf on the **stable count metrics** (render/update counts, `computePosition` calls, node counts) — deterministic, flip-safe — and keep wall-clock **report-only with a wide tolerance band** (e.g. median of N runs, fail only on a large multi-run regression).
- Characterize the noise floor first: run the harness N times on identical code, set the enforcing threshold outside the observed variance (e.g. mean + 3σ), not at the raw baseline.
- Flip **size** gates to enforcing first (stable), then runtime **count** gates, then only optionally runtime **time** gates — staged, not all at once. Keep the flip off the critical release path until it's been green on `main` for a defined soak period.
- Pin the runner (CPU-throttle multiplier, Node version — note size-limit@13 needs Node ≥22.18 while CI is Node 20; keep the perf lane's runtime pinned and documented).

**Warning signs:**
The same PR passes/fails the perf gate on re-run; budgets padded to 2× baseline "to stop flakes"; a release blocked by a perf gate on a docs-only change; gate disabled in a hotfix.

**Phase to address:** P5 (CI-enforced perf + size gates); noise characterization seeded in P1

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Measure runtime perf in jsdom | Reuses fast existing lane | Optimizing against a mock; budgets never fire on real target | Never for runtime cost; jsdom is behavior-only |
| Keep `ignore:["@floating-ui/dom"]` in every size metric after deferring it | No config churn | The headline size win is invisible to the gate; regressions hidden | Never — at least one metric must count delivered floating-ui |
| Add a hidden-input form fallback unconditionally | "Forms work below the floor" | Double-submit / value divergence = freeze violation on supported engines | Only when strictly gated on absent `setFormValue` |
| `sideEffects:false` to shrink bundles | Smaller output | Custom-element registration tree-shaken away; consumer sees unstyled tags | Never for this library; registration is a side effect |
| Flip perf budget to enforcing with the coverage-gate playbook | Symmetry with v1.0 | Flaky timing red-builds block the release pipeline | Only for deterministic count/size metrics, after noise characterization |
| Manual `shouldUpdate`/render caching everywhere | Fewer re-renders on paper | Stale renders on theme/value change; fights Lit's own dirty-check | Only on components a profile flags, with re-render tests |
| Over-split into per-module chunks for zero duplication | Clean dependency graph | Request-waterfall latency on slow enterprise networks | Only when validated against the first-load metric |
| Leave `highlight.js` in `dependencies` | No investigation needed | Ships (or risks shipping) grammars to every consumer; phantom "defer" task | Never if docs-only — move to devDependencies |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@floating-ui/dom` (defer) | `await import()` on open → `0,0` flash + focus-order race | Prefetch on trigger intent; reveal after first `computePosition`; keep autoUpdate after position |
| `@lit-labs/virtualizer` | Tuning window without re-authoring `aria-setsize`/`rowcount`; selection keyed on DOM node | Full-length set semantics; stable-id selection; active-descendant references only rendered ids |
| `lit` (peer dep) | `external` list regressed during chunking → Lit inlined; masked by size `ignore` | Central `external` list, snapshot-tested; explicit "no bundled Lit" grep gate; single-instance smoke |
| `ElementInternals` | One `if('attachInternals' in ...)` gate feeding FACE + ARIA reflection | Probe FACE, ARIA state, and id-ref ARIA reflection independently; document per-capability floor |
| `size-limit@13` | Runs on Node 20 CI lane → tool needs Node ≥22.18 | Keep size job on its own pinned Node ≥22.18 (already split in ci.yml); document the split |
| Constructable stylesheets / `adoptedStyleSheets` | Assumed on all "supported" engines | Feature-floor is max(JS floor, CSS floor); test visually on lowest engine |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| data-grid renders all rows (no/partial virtualization) | Main-thread stall, high memory | Virtualize with full-length ARIA + stable-id selection | 1000+ rows on throttled CPU |
| `autoUpdate`/ResizeObserver churn across engines | Constant `computePosition`; jank in Firefox only | Gate autoUpdate on `open`; measure call counts per engine | Any overlay left open during layout changes |
| Dynamic-import overlay dep on slow network | Overlay invisible/mispositioned for seconds | Prefetch on intent; hidden-until-positioned | Slow-network low-end target |
| Over-split chunk waterfall | 10+ requests to register one deep-imported component | Coherent shared chunks; validate first-load on throttled network | HTTP/1.1 proxy + cold cache |
| Over-eager memoization | Stale content on theme/value change | Lit-native `guard`/`hasChanged` with correct deps; profile-driven only | Any prop outside the memo dep set changes |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Fallback path reintroduces `innerHTML` for a degraded render | XSS; breaks Lit-safe-templating constraint | Keep all fallbacks in Lit templates; lint-block `innerHTML`/`eval` (CONCERNS.md recommendation) |
| Hidden-input fallback in light DOM styled/reset by consumer CSS | Value tampering / silent value change | Keep form value authoritative in one place; mirror, don't relocate, the source of truth |
| Deferred chunk loaded from a wrong/relative base in a consumer bundler | Chunk 404 or loads unexpected origin | Ensure dynamic import specifiers resolve via the consumer's bundler (bare/relative), no hardcoded CDN |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Overlay flashes at `0,0` before async position resolves | Jarring jump, mis-click target | Prefetch dep; `visibility:hidden` until positioned |
| Form control silently fails below floor with no signal | User fills a field that never submits | Documented graceful degradation; usable control that clearly does/doesn't submit per contract |
| Screen-reader set count wrong after virtualization tuning | AT users can't gauge list size / lose active item | Full-length `aria-setsize`/`rowcount`; keep active-descendant rendered |
| `:has()`-dependent layout silently broken on old engine | Cramped/misaligned UI on "supported" browser | CSS-feature floor documented; JS-class fallback or documented degradation |

## "Looks Done But Isn't" Checklist

- [ ] **Bundle-size win:** Verify the deferred dep is actually in the shipped graph (not phantom like `highlight.js`) and that at least one size metric *counts* it — not hidden by `ignore`.
- [ ] **Tree-shaking:** Verify the imported component still `customElements.define`s at runtime after shaking — not just that unrelated code was removed.
- [ ] **No bundled Lit:** Grep `dist` for inlined Lit; assert single Lit instance in the smoke install — size gate `ignore`s Lit so it won't tell you.
- [ ] **Deferred overlay:** Verify no `0,0` paint frame and correct post-open focus on a *throttled network* profile, not just fast local.
- [ ] **Virtualization tuning:** Verify `aria-setsize`/`rowcount` reflect full length and selection + `setFormValue` survive a scroll that unmounts the selected row.
- [ ] **ElementInternals detection:** Verify each sub-capability (FACE, ARIA state, id-ref ARIA) probed independently; announced role/state correct on a partial engine.
- [ ] **Form fallback:** Verify no double-submit on a *supported* engine; `FormData` identical between internals and fallback paths.
- [ ] **Compat claim:** Verify `:has()`/`adoptedStyleSheets` layout on the *lowest* engine visually — CSS fails silently.
- [ ] **A11y under perf work:** Accessible-name/role snapshot diffed against v1.0 for any component whose DOM/attributes were trimmed.
- [ ] **Perf gate:** Verify enforcing threshold sits outside the measured noise floor and doesn't sit on the release critical path during soak.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tree-shaken-away registration ships to consumers | HIGH | Patch release; fix `sideEffects` glob; add registration-smoke to canary; changeset noting the regression |
| Bundled Lit shipped | HIGH | Patch release; restore `external`; add no-bundled-Lit gate; audit for directive breakage in consumers |
| Hidden-input double-submit shipped | HIGH (data integrity) | Patch release; strictly gate fallback on absent FACE; FormData parity test; notify consumers of possible bad submissions |
| Virtualization tuning broke AT set count / selection | MEDIUM | Revert window/buffer change; restore full-length ARIA + stable-id selection; add the guard tests |
| Overlay `0,0` flash from deferral | LOW | Add hidden-until-positioned + intent prefetch; screenshot test |
| Perf gate flakes block release | MEDIUM | Revert enforcing flip to report-only; switch to count metrics; characterize noise before re-flipping |
| Phantom "defer highlight.js" work | LOW | Move dep to devDependencies; drop the deferral task; add deps-only-if-imported check |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 jsdom/unthrottled perf measurement | P1 | Runtime numbers sourced only from throttled browser lane; count metrics recorded |
| 2 gzip/brotli + shared-chunk attribution | P1 (+P2) | One metric counts floating-ui; marginal-cost + first-load metrics exist |
| 3 `sideEffects` tree-shake breaks registration 🧊 | P2 (guard P1/P5) | Canary asserts registration at runtime, not just removal |
| 4 deferred floating-ui `0,0`/focus race 🧊 | P2 (verify P3/P4) | Throttled-network test: no `0,0` frame, correct focus |
| 5 accidentally bundling Lit 🧊 | P2 (gate P5) | No-bundled-Lit grep + single-instance smoke |
| 6 over-split chunk waterfall | P2 | First-load request trace on throttled network |
| 7 phantom/dev-only heavy dep | P1→P2 | Import-graph proof before defer; deps-only-if-imported check |
| 8 virtualization breaks AT set / selection ♿🧊 | P3 (a11y P4) | Full-length ARIA constant on scroll; selection+formvalue survive unmount |
| 9 ElementInternals/ARIA-reflection detection ♿🧊 | P4 | Per-capability probes; role/state announced on partial engine |
| 10 hidden-input double-submit/divergence 🧊 | P4 | No double-submit on supported engine; FormData parity |
| 11 `:has()`/adoptedStyleSheets assumed on old engine | P4 | CSS-feature floor documented; visual test on lowest engine |
| 12 cross-engine shadow/focus/form quirks ♿ | P4 | v1.0 browser assertions run on WebKit+Firefox+Chromium |
| 13 over-eager memoization stale renders | P3 | Theme + programmatic-value re-render test on optimized components |
| 14 perf work strips a11y attrs/roles/order ♿🧊 | P3 (guard P4/P5) | Accessible-name/role snapshot diff vs v1.0 |
| 15 flaky perf gate / premature enforcing flip | P5 (seed P1) | Enforcing thresholds outside noise floor; staged flip off release critical path |

## Sources

- In-repo (HIGH): `package.json` (`sideEffects`, `peerDependencies.lit`, `dependencies` incl. `@floating-ui/dom`, `@lit-labs/virtualizer`, phantom `highlight.js`), `.size-limit.json` (`ignore:["lit","@floating-ui/dom"]`, gzip), `.github/workflows/ci.yml` (coverage/browser-axe/`diff:surface`/size/smoke gates; size job on Node ≥22.18), `src/internal/controllers|helpers`, grep of `:has()` (6 components), floating-ui (7 components + controller), virtualizer (3 components), ElementInternals ARIA in checkbox/radio/switch
- `.planning/PROJECT.md` (HIGH) — frozen-surface constraint, Safari 16.4 floor, v1.1 scope, out-of-scope (no hard ElementInternals polyfill, bounded engine matrix)
- `.planning/codebase/CONCERNS.md` (HIGH) — autoUpdate churn, focus-restoration dangling `_previouslyFocused`, data-grid non-virtualized baseline, ElementInternals not polyfillable
- [MDN: ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) (HIGH)
- [WebKit: ElementInternals and Form-Associated Custom Elements](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/) (HIGH)
- [WebKit commit: implement ARIA id-ref reflection for ElementInternals](https://github.com/WebKit/WebKit/commit/6989a5b880ac9b18befc8e0c921bac4f778a2189) (HIGH) — id-ref ARIA reflection landed *after* base FACE
- [w3c/aria #2663: expose implicit ARIA semantics (browser-defaults and ElementInternals)](https://github.com/w3c/aria/issues/2663) (MEDIUM)
- [@lit-labs/virtualizer (npm)](https://www.npmjs.com/package/@lit-labs/virtualizer) + [lit/lit discussion #3362](https://github.com/lit/lit/discussions/3362) (MEDIUM) — offscreen elements removed; set-size must be authored
- [AG Grid accessibility](https://www.ag-grid.com/javascript-data-grid/accessibility/) (MEDIUM) — aria-rowcount/rowindex pattern for virtualized grids

---
*Pitfalls research for: perf/size/compat hardening of a frozen-API Lit 3 Web Components library (Amris v1.1)*
*Researched: 2026-08-20*
