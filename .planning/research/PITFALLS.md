# Pitfalls Research

**Domain:** Web Components / Lit component library — hardening to a frozen, published v1.0
**Researched:** 2026-08-10
**Confidence:** HIGH (grounded in codebase concerns + verified platform/tooling behavior)

Scope note: this milestone allows breaking changes NOW, then freezes the v1.0 public API and stands up a CI release pipeline. The pitfalls below are the specific, recurring ways component-library 1.0 efforts go wrong — API-freeze regret, jsdom blind spots, virtualization a11y, global shortcuts, and GitHub Packages + Changesets publishing — mapped to the phases that must prevent them.

Assumed phase names (from PROJECT.md Active requirements):
- **P-API** — API audit & freeze
- **P-COV** — Test coverage + CI coverage gate
- **P-LEAK** — Bug/leak fixes (timers, listeners, focus, animation)
- **P-VIRT** — List virtualization + bundle-size monitoring
- **P-VALID** — Validation-message display
- **P-KBD** — Keyboard-shortcut registry
- **P-DOCS** — Docs (validation/theming/usage, README, browser support)
- **P-REL** — Release pipeline, tag & publish v1.0

---

## Critical Pitfalls

### Pitfall 1: Freezing the API without an exhaustive, cross-component consistency audit

**What goes wrong:**
The team fixes the APIs it happens to remember (Cmd+K, a couple of rough props) but freezes 67 components with inconsistent event names (`am-change` vs `change` vs `am-input`), inconsistent boolean prop conventions (`disabled` vs `isDisabled`), inconsistent value/`v-model` semantics, and inconsistent CustomEvent `detail` shapes. After 1.0, every one of these becomes a permanent breaking-change liability. The four 600+ line components (combobox 741, select 718, date-picker 633, time-picker 627) are exactly where the subtle inconsistencies hide.

**Why it happens:**
Audits are done component-by-component instead of dimension-by-dimension. Nobody builds the matrix that makes an inconsistency across components visible. "It works" is mistaken for "it's consistent."

**How to avoid:**
Run the pre-freeze audit as a **cross-cutting matrix**, not a per-component pass. One spreadsheet/table per dimension across all 67 components: (a) event names + `bubbles`/`composed` flags + `detail` shape, (b) boolean/enum prop naming, (c) reflected attribute vs property parity, (d) value/`defaultValue`/`checked` semantics for form controls, (e) CSS custom-property (`--am-*`) and `::part()`/slot public surface, (f) default values. Anything that is a public custom-element name, attribute, property, event, slot, part, or CSS var is API — enumerate them all. Auto-generate the surface with the Custom Elements Manifest (`@custom-elements-manifest/analyzer`) and diff it in CI so drift after freeze is caught mechanically.

**Warning signs:**
The audit output is prose per component rather than a comparison table; no generated manifest of the public surface; "we'll clean that up post-1.0" appears in review comments.

**Phase to address:** P-API (produce the manifest + matrices); P-REL (CEM diff as a release gate)

---

### Pitfall 2: Slots, CSS custom properties, and `::part()` are treated as private — then break consumers silently

**What goes wrong:**
The team audits props and events but forgets that in Shadow DOM the **styling and composition surface is also a hard API**: slot names, `::part()` names, and every `--am-*` custom property a consumer can set. Renaming a slot, dropping a part, or renaming a token post-1.0 breaks consumer layouts and themes with zero TypeScript error and zero runtime error — the component just silently loses its styling hook.

**Why it happens:**
Shadow DOM feels encapsulated, so authors assume internals are free to change. But anything reachable via `slot="x"`, `part="y"`, or `var(--am-z)` is a public contract the type system cannot police.

**How to avoid:**
Enumerate every slot, part, and consumer-settable custom property in the Custom Elements Manifest and treat them as frozen at 1.0. Explicitly decide which internals are *not* parts (don't expose `::part()` you don't intend to support forever — every part is a promise). Document the token contract as the theming API. Add the CEM slot/part/cssProperty diff to the release gate (Pitfall 1).

**Warning signs:**
Storybook examples reach into internals; no inventory of parts/slots/tokens exists; token names are being renamed "for tidiness" during the API cleanup.

**Phase to address:** P-API (inventory + freeze decision); P-DOCS (document token/part/slot contract); P-REL (CEM diff gate)

---

### Pitfall 3: Trusting jsdom to prove components "work" — it silently skips layout, focus, dialog, and ElementInternals

**What goes wrong:**
The whole harness runs on jsdom (Vitest `environment: 'jsdom'`). jsdom has **no layout engine**: `getBoundingClientRect()`/`offset*`/`client*` return 0, `getComputedStyle` won't resolve real cascade, and nothing is ever actually "visible." It has **no real focus model** for many cases, **no `<dialog>` top-layer / `showModal()` behavior** (already mocked in `test/setup.ts`), and **no native `ElementInternals`** (already mocked). So focus traps, positioning, virtualization windowing, and form-participation are validated against fakes. Tests go green while the real browser behaves differently — the classic "passes in jsdom, breaks in Safari" trap. This directly threatens the CONCERNS focus-restoration, focus-trap, and form-integration gaps.

**Why it happens:**
jsdom is fast and already wired up; mocks make failing APIs "pass." The team conflates "the mock returned what I asked" with "the browser does this."

**How to avoid:**
Draw a hard line: jsdom validates **DOM structure, attributes/ARIA reflection, event wiring, and property logic** — nothing that depends on layout, top-layer, real focus, or ElementInternals. Stand up a **real-browser test lane** for the load-bearing interaction/a11y cases using Vitest Browser Mode or Web Test Runner + Playwright provider (headless Chromium at minimum). Target it narrowly at: focus trap + restoration in dialog/drawer/command-palette, floating-ui positioning, virtualization scroll/focus, and native form submission with ElementInternals. Note PROJECT.md lists automated real-browser infra as out-of-scope/deferred — this pitfall is the argument to carve out a *minimal* browser lane anyway for exactly these four areas, since jsdom cannot prove them and they are the milestone's highest-risk features.

**Warning signs:**
A test mocks the very API it's meant to verify; focus/positioning/virtualization tests assert on mocked return values; coverage is high but no test ever runs in a browser; ElementInternals mock is the only thing exercising `setFormValue`.

**Phase to address:** P-COV (define the jsdom-vs-browser boundary; add the minimal browser lane); P-LEAK and P-VIRT depend on it for real verification

---

### Pitfall 4: Coverage gate is gamed — high % with no assertions on the behaviors that matter

**What goes wrong:**
A coverage threshold is added, so contributors write render-only tests that mount each of the 20 untested components (`icon`, `card`, `grid`, `stack`, `table`, etc.) and assert almost nothing. Line coverage jumps to 90% while focus restoration, listener cleanup, form submission, and async option races — the actual CONCERNS risks — remain untested. Coverage becomes a number that hides the gap it was meant to close.

**Why it happens:**
Line/statement coverage rewards executing code, not asserting outcomes. Simple display components inflate the percentage cheaply; the hard interactive paths are skipped because they're hard.

**How to avoid:**
Gate on the right metric and the right targets. Use **branch coverage** (not just line) and consider per-file/per-directory thresholds so the complex form/overlay components can't be diluted by trivial ones. Pair the numeric gate with a **required-scenarios checklist** for interactive components (submit, reset, validity, focus trap+restore, listener attach/detach on open/close, disabled/readonly). Add mutation testing (Stryker) on the two or three highest-risk modules (combobox, dialog, form base) as a spot-check that assertions actually catch regressions. Coverage measures the jsdom lane only — don't let it imply the browser-lane behaviors are covered.

**Warning signs:**
Coverage rises but bug count doesn't fall; PRs add `expect(el).toBeTruthy()`-style tests; the threshold was hit the day it was introduced with no new meaningful assertions.

**Phase to address:** P-COV (choose branch + per-dir thresholds + scenario checklist); P-REL (enforce as gate)

---

### Pitfall 5: List virtualization silently destroys accessibility and form integrity

**What goes wrong:**
Virtualizing DataGrid/combobox (only rendering visible rows) breaks four things at once:
1. **Screen-reader counts** — because rows are removed from the DOM, AT announces "row 12 of 40" instead of "of 1200"; the listbox/grid appears tiny.
2. **Focus loss on scroll** — the focused/active row gets unmounted during scroll, focus jumps to `<body>`, and keyboard nav dies.
3. **Keyboard navigation** — Arrow/Home/End/PageDown must move the *active* item and scroll it into the window; naïve virtualization only tracks scroll position, not roving focus, so Home/End land on whatever happens to be rendered.
4. **Form value integrity** — for a virtualized `<select>`/combobox, the currently-selected option may not be in the DOM, so `setFormValue` / selection rendering must be driven by state, not by the presence of the option node. Selection lost on scroll = broken form.

**Why it happens:**
Virtualization is treated as a rendering optimization, decoupled from the ARIA/roving-tabindex/selection model. The DOM node is assumed to be the source of truth for count, focus, and value — but virtualization makes the DOM a moving window over the real data.

**How to avoid:**
Model count, active index, and selected value in **component state, independent of which rows are mounted**. Set `aria-setsize`/`aria-posinset` on rendered options (listbox) or `aria-rowcount`/`aria-rowindex` on grid rows so AT sees the full total despite windowing. Use a roving-tabindex/`aria-activedescendant` scheme where the active descendant id is valid only when rendered — on keyboard nav, scroll the target into the window *before* moving focus/activedescendant. Never unmount the focused element without moving focus first. Drive `setFormValue` from selected-value state, never from the option node. Verify all of this in the **browser lane** (Pitfall 3) — jsdom can't scroll or focus.

**Warning signs:**
Screen reader announces a small row count; Tab/Arrow behaves differently after scrolling; focus jumps to body on fast scroll; selecting an option then scrolling loses the value; tests only assert "N rows rendered."

**Phase to address:** P-VIRT (design state-driven windowing + ARIA); P-COV (browser-lane scroll/focus/a11y tests)

---

### Pitfall 6: Global keyboard-shortcut registry that fights the browser, the user's layout, and focus context

**What goes wrong:**
Replacing hardcoded Cmd+K with a global registry introduces a pile of classic shortcut bugs:
- **Trapping/overriding browser & OS shortcuts** (Ctrl/Cmd+W, +T, +L, +N, +Q, F-keys) — `preventDefault` on these is hostile or impossible and gets the app flagged as broken.
- **Firing shortcuts while typing** — a bare `?` or `/` shortcut triggers inside an `<input>`/`<textarea>`/`contenteditable`, or worse inside another component's shadow-root editable field.
- **Keyboard-layout / i18n breakage** — matching on `event.key` breaks on non-US layouts (the physical `Z`/`Y` swap, AZERTY digits-need-Shift); matching on `event.code` breaks the meaning of the key. Neither alone is right.
- **Conflicts & last-registration-wins** — two components register the same combo with no conflict detection or priority.
- **Composed-path / shadow-DOM focus context** — a document-level `keydown` listener sees `event.target` as the host element (retargeted), so "is a text field focused?" checks fail unless you use `event.composedPath()`.
- **Accessibility** — no way to discover, remap, or disable shortcuts; single-key shortcuts with no modifier violate WCAG 2.1 SC 2.1.4 (Character Key Shortcuts).

**Why it happens:**
Shortcut handling looks trivial (`if (e.key === 'k' && e.metaKey)`), so the edge cases — layout, IME, editable context, shadow retargeting, browser-reserved combos — are discovered in the field, after the API is frozen.

**How to avoid:**
Design the registry API deliberately and freeze it carefully (it's public 1.0 surface):
- Represent chords as `{ key/code, mods }` and decide the matching strategy explicitly — prefer `event.code` for layout-independent physical keys, but expose printable-character intent where it matters; document the choice.
- Default-skip when focus is in an editable/`isContentEditable`/form control; compute the real focused element via `event.composedPath()[0]` to pierce shadow roots.
- Maintain a **reserved list** of browser/OS combos you refuse to bind, and a conflict-detection + priority/scope model (global vs. within-overlay) rather than last-wins.
- Provide an escape hatch: shortcuts must be listable, remappable, and disable-able; require a modifier for global single-key actions (WCAG 2.1.4) or make them focus-scoped.
- Respect IME composition (`isComposing`) — ignore keydown while composing.

**Warning signs:**
`event.key` string comparisons with no layout consideration; no editable-context guard; `preventDefault()` on Ctrl/Cmd+letter combos; shortcuts fire inside inputs; no conflict/priority handling; single-key global shortcuts with no way to turn off.

**Phase to address:** P-KBD (registry API design + reserved list + focus-context + WCAG 2.1.4); P-DOCS (document shortcut contract); P-COV (browser-lane keydown/composedPath tests)

---

### Pitfall 7: Validation-message display that desyncs from `ElementInternals` and re-breaks accessibility

**What goes wrong:**
Adding display of `ElementInternals.validationMessage` introduces subtle correctness/a11y bugs: the visible message doesn't update when `setValidity` changes; the message renders in Shadow DOM but isn't linked to the control via `aria-describedby` (and cross-root ARIA linking is itself hard in Shadow DOM); the error is shown before the user interacts (validation on every render instead of on submit/blur), so forms scream red on first paint; and below the Safari 16.4 floor ElementInternals is absent so validation silently no-ops. Consumers also get two competing error surfaces — the built-in message and the existing external `<am-error-text>`.

**Why it happens:**
`validationMessage` is treated as a string to print, divorced from the validity lifecycle and from the ARIA wiring that makes it perceivable. Shadow DOM makes `aria-describedby` from a light-DOM label to a shadow message non-trivial, so it gets skipped.

**How to avoid:**
Drive the visible message from the same `setValidity(flags, message, anchor)` call that sets validity — single source of truth. Decide and document the *timing* policy (show on `invalid` event / submit / blur, not on every keystroke) and expose it consistently across all form controls. Wire the message with `role="alert"`/`aria-live` and reference it via `aria-describedby` using the internals validation anchor / a same-root id; verify AT actually announces it in the browser lane. Define how the new built-in message coexists with `<am-error-text>` (one wins, or slot-based override) so consumers don't double-render. Document the Safari 16.4 no-op behavior.

**Warning signs:**
Message string read once and never re-read on `setValidity`; errors visible on first render; no `aria-describedby`/live region; both `<am-error-text>` and the internal message appear; jsdom mock is the only thing "verifying" the message.

**Phase to address:** P-VALID (lifecycle-driven message + ARIA + coexistence policy); P-DOCS (validation docs); P-COV (browser-lane announcement test)

---

### Pitfall 8: GitHub Packages + Changesets release ships broken artifacts (provenance, ESM-only, exports, sideEffects, tokens.css)

**What goes wrong:**
The publish pipeline "works" in CI but consumers can't install or import cleanly:
- **`--provenance` against GitHub Packages fails or is meaningless.** npm provenance/trusted-publishing is a *public npm registry* (Sigstore + transparency log) feature; the GitHub Packages npm registry does not participate. Copying a `npm publish --provenance` recipe from an npmjs guide breaks the publish job.
- **ESM-only breakage.** The package is ESM-only (no CommonJS) by design, but if `"type": "module"`, `"exports"`, and conditions aren't exactly right, `require()` consumers and some bundlers throw `ERR_REQUIRE_ESM` / "No matching export." Per-component entry points must each be declared in `"exports"` or deep imports 404.
- **`"sideEffects"` wrong → tree-shaking dies or side effects vanish.** Custom-element files self-register via `customElements.define(...)` at import time — that's a real side effect. Marking the whole package `"sideEffects": false` lets bundlers drop the registration, so `<am-button>` never upgrades. But `"sideEffects": true` everywhere kills the tree-shaking the library advertises. The registration modules (and any CSS) must be listed as the *only* side-effectful files.
- **`tokens.css` not shipped / not exported.** `dist/styles/tokens.css` is required for theming, but if `files`/`exports` omit it, or the CSS export condition is missing, consumers import a package whose components silently render unstyled (the CONCERNS "no fallback if tokens missing" risk becomes a shipping bug).
- **Peer-dep range too tight or too loose.** Pinning `lit@3.3.2` exactly causes duplicate-Lit installs and "multiple versions of Lit loaded" reactive-controller bugs; leaving it `*`/`>=3` lets an incompatible Lit in. Lit must be `peerDependencies` (range like `^3.3.0`), never a regular dependency (bundling it is explicitly forbidden by Constraints).

**Why it happens:**
Publishing config is copied from npmjs-oriented tutorials; `exports`/`sideEffects`/`files` are under-tested because CI publishes but never *installs the tarball as a consumer would*; provenance is assumed to be registry-agnostic.

**How to avoid:**
- Drop `--provenance` for the GitHub Packages target (or document that provenance is unavailable there); don't fail the release on it.
- Add an **install-the-tarball smoke test** to CI: `npm pack`, install the tarball into a throwaway ESM app *and* a bundler app, import the full entry, a per-component entry, and `tokens.css`, and assert `<am-button>` upgrades and is styled. This catches `exports`, `sideEffects`, ESM, and tokens.css in one gate.
- Set `"sideEffects"` to list only the element-registration modules and CSS.
- Keep Lit in `peerDependencies` with a sane caret range; add `peerDependenciesMeta` if optional; verify no `lit` in `dependencies`.
- Configure the `.npmrc`/registry scope for `@willramanand` → GitHub Packages, and confirm the `publishConfig.registry` + auth token scope (`packages:write`) in the workflow.

**Warning signs:**
Release job copies a `--provenance` npmjs snippet; no tarball install test; `sideEffects: false` on a self-registering package; `tokens.css` absent from `files`/`exports`; `lit` appears in `dependencies`; consumers report unstyled components or "element not defined."

**Phase to address:** P-REL (provenance, exports, sideEffects, tokens.css, tarball smoke test, registry/token config); P-API (finalize `exports` map since deep entry points are public API)

---

### Pitfall 9: The leak/lifecycle fixes fix the symptom but not the pattern (and can't be regression-proven in jsdom)

**What goes wrong:**
The toast `setTimeout`, global listeners, focus restoration, and dialog `animationend` are patched individually, but the underlying pattern — "attach on open / disconnect, always clean up on close / `disconnectedCallback`, guard focus against removed nodes, track every timer" — isn't enforced, so the next component reintroduces the leak. Worse, none of it is provable in jsdom: there's no real `animationend`, timers are faked, and focus is a mock — so a "fixed" leak passes with no real assertion.

**Why it happens:**
Leaks are treated as isolated bugs, not as a shared lifecycle contract; and the test environment can't observe the resource being leaked, so regressions slip back in green.

**How to avoid:**
Establish one lifecycle discipline all overlay/timer/listener components follow: gate global listeners strictly on `_open`/connected state and remove in both `close` and `disconnectedCallback`; centralize timer tracking (single `_clearTimers()`); before any `.focus()` restoration, verify the node is still `isConnected` and in the DOM. Add a lint/review checklist item for "every `addEventListener`/`setTimeout`/`autoUpdate` has a matching teardown." Test teardown behavior directly (spy on `removeEventListener`/`clearTimeout`, assert `disconnectedCallback` cleans up) in jsdom where you can, and verify focus-restoration + animation cleanup in the browser lane.

**Warning signs:**
Fixes touch one file each with no shared helper; `disconnectedCallback` doesn't mirror every `connectedCallback`/open-time attach; focus restoration has no `isConnected` guard; timer fields not all in one clear method; leak tests rely on fake timers only.

**Phase to address:** P-LEAK (shared lifecycle discipline + teardown assertions); P-COV (browser-lane focus/animation verification)

---

### Pitfall 10: Bundle-size regression slips in and the "monitoring" doesn't actually gate

**What goes wrong:**
Bundle-size monitoring is added but measures the wrong thing (unminified, or the full `dist/amris.js` only), so a regression that bloats the *per-component* entry points or breaks tree-shaking (e.g., a barrel import pulling all 67 components into one) goes unnoticed. Or the check reports size but never fails CI, so it's advisory noise. A single accidental `import * from './components'` in a shared module can silently defeat the tree-shaking the library's value proposition depends on.

**Why it happens:**
Size checks are added as a dashboard, not a gate; only the headline bundle is measured; tree-shakeability (does importing one component stay small?) is never asserted.

**How to avoid:**
Measure **minified + gzipped** size of the artifacts consumers actually load: the core entry, the full entry, and a representative single-component deep import. Use size-limit / a size budget with hard `fail` thresholds wired into the release gate. Add a tree-shaking assertion: build a fixture that imports one component and assert the output stays under budget (catches barrel-import regressions). Snapshot per-entry sizes so PRs show deltas.

**Warning signs:**
Size check prints but never fails; only one aggregate bundle measured; importing a single button pulls in the whole library; no gzipped numbers.

**Phase to address:** P-VIRT (bundle-size monitoring — note virtualization adds code, so budget it); P-REL (size budget as gate)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep all tests in jsdom, mock focus/dialog/ElementInternals | Fast, no browser infra | Focus/positioning/virtualization/form bugs ship to Safari/Chrome undetected | Only for structure/attribute/event-logic tests — never for the four browser-only feature areas |
| Freeze API without a generated Custom Elements Manifest | Ship 1.0 sooner | No mechanical way to detect post-1.0 breaking drift; audit gaps become permanent | Never — the manifest is cheap and is the freeze's backbone |
| Add a line-coverage threshold only | Green gate quickly | Coverage gamed with render-only tests; real gaps persist | Never as the *only* gate; fine alongside branch + scenario checklist |
| Ship `tokens.css` via docs instructions instead of package `exports` | Less packaging work | Consumers render unstyled; support burden; "no fallback" risk becomes a bug | Never — theming is core; it must be an exported artifact |
| Pin Lit exactly in peerDeps | Reproducible | Duplicate-Lit installs, reactive-controller breakage, forced consumer lockstep | Never — use a caret range |
| `preventDefault()` broadly in the shortcut registry | Shortcuts "always work" | Hijacks browser/OS shortcuts; hostile UX; a11y failure | Only for app-scoped combos with modifiers, never browser-reserved ones |
| Virtualize by rendering only visible rows, count from DOM | Fast large lists | Broken SR counts, focus loss, lost form values | Never with DOM as source of truth — state must own count/active/value |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Packages npm registry | Reusing `npm publish --provenance` from npmjs guides | Provenance is npmjs/Sigstore-only; drop the flag for GH Packages, set `publishConfig.registry` + `@willramanand` scope + `packages:write` token |
| Changesets | Assuming Changesets handles registry/exports correctness | Changesets only versions + changelogs; artifact correctness (exports/sideEffects/tokens.css) needs a separate tarball-install gate |
| Consumer bundlers (Vite/webpack/esbuild) | `"sideEffects": false` on a self-registering element package | List only element-registration + CSS files as side-effectful; keep the rest tree-shakeable |
| ESM-only consumers | Missing/incorrect `"exports"` for per-component deep imports | Declare every public entry (core, full, per-component, `./styles/tokens.css`) in `exports` with correct conditions |
| Lit peer dependency | Bundling Lit or pinning it exactly | `peerDependencies: { lit: "^3.3.0" }`; never in `dependencies` |
| Floating-UI `autoUpdate` | Starting `autoUpdate` on any property change | Gate start strictly on `open` transitions; stop on close/disconnect (already audited 2026-04-25 — keep enforcing) |
| Cross-root ARIA (Shadow DOM) | `aria-describedby`/`aria-activedescendant` across shadow boundaries | Keep referenced ids in the same root, or use element-referencing where supported; verify announcement in a real browser |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| DataGrid/combobox render all rows | Jank, slow filter, high memory | State-driven virtualization windowing (P-VIRT) | ~1000+ rows |
| Combobox re-filters on every keystroke (async fires per char) | Excess `am-search` events, network spam | `minChars` + debounce for async mode | Large option sets / remote search |
| Barrel import defeats tree-shaking | Single-component import pulls whole library | Size-budget + tree-shaking assertion in CI (P-VIRT/P-REL) | Any consumer importing one component |
| `autoUpdate` restarts on unrelated updates | CPU churn while overlay open | Gate on `open` transition only | Many overlays / frequent re-renders |
| Focused virtual row unmounted on scroll | Focus jumps to body, keyboard nav dies | Scroll active item into window before moving focus | Fast scrolling large virtual lists |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Introducing `innerHTML`/`unsafeHTML` for validation messages or virtualized content | XSS via consumer-supplied strings | Keep Lit-safe templating only (Constraint); render messages/options as text bindings, never raw HTML |
| Publishing with an over-scoped `GITHUB_TOKEN`/PAT | Registry compromise, supply-chain risk | Minimal `packages:write` scope; use workflow-scoped token; no long-lived PAT in the repo |
| Shortcut registry evaluating string expressions for combos | Code injection surface | Structured `{key/code, mods}` objects, never `eval`/`Function` on config |
| Shipping source maps / internal paths that leak repo structure | Minor info disclosure | Decide `sourceMap` policy for published artifacts deliberately |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Validation errors shown on first render | Form is red before user does anything | Show on submit/blur/`invalid`, per a documented timing policy |
| Single-key global shortcuts with no way to disable | Trigger while typing; WCAG 2.1.4 failure | Require modifier for global actions or scope to focus; make shortcuts remappable/disable-able |
| Virtualized list announces wrong row count | Screen-reader users think list is tiny | `aria-setsize`/`aria-posinset` / `aria-rowcount` from full data total |
| Overriding Cmd/Ctrl+browser shortcuts | Users can't close tabs / focus URL bar | Reserved-combo blocklist; never bind browser/OS shortcuts |
| Double error surfaces (built-in + `<am-error-text>`) | Duplicate/conflicting messages | Define one authoritative surface + slot override |
| Focus lost after dialog/drawer close | Keyboard users dumped to page top | Guarded focus restoration to the opener (`isConnected` check) |

## "Looks Done But Isn't" Checklist

- [ ] **API freeze:** Often missing the slot/`::part()`/`--am-*` token inventory — verify the Custom Elements Manifest enumerates them and CI diffs it.
- [ ] **Virtualization:** Often missing `aria-setsize`/`aria-rowcount` and roving focus — verify a screen reader announces the *full* count and Home/End/Arrow work after scrolling, in a real browser.
- [ ] **Keyboard registry:** Often missing editable-context guard and `composedPath()` focus detection — verify shortcuts don't fire inside inputs across shadow roots, and browser-reserved combos are refused.
- [ ] **Validation messages:** Often missing `aria-describedby`/live region and re-sync on `setValidity` — verify AT announces changes and errors don't show pre-interaction.
- [ ] **Release:** Often missing a tarball-install test — verify `npm pack` → install → import full + per-component + `tokens.css` upgrades and styles `<am-button>`.
- [ ] **sideEffects:** Often missing the registration-file allowlist — verify tree-shaking keeps single-component imports small AND elements still upgrade.
- [ ] **Coverage gate:** Often missing branch/per-dir thresholds — verify the number can't be hit with render-only tests; spot-check with mutation testing on combobox/dialog.
- [ ] **Leak fixes:** Often missing `disconnectedCallback` symmetry — verify every open-time listener/timer/`autoUpdate` has a teardown, asserted by spy.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bad API frozen at 1.0 | HIGH | Requires a 2.0 or deprecation cycle with dual-support shims; the whole point of P-API is to avoid this — do the audit before the tag |
| jsdom-only tests hid a browser bug | MEDIUM | Add the browser lane, reproduce, fix, backfill regression test; ship patch release |
| `sideEffects`/`exports` broke consumers | LOW–MEDIUM | Patch `package.json`, add tarball-install test, republish patch; short-lived if caught by smoke test |
| Provenance flag broke the release job | LOW | Remove flag / fix registry config; re-run pipeline |
| Virtualization a11y regression | MEDIUM | Reintroduce full-count ARIA + roving focus, add browser a11y test; may need to gate virtualization behind a threshold prop |
| Shortcut hijacked browser combo | LOW | Add combo to reserved blocklist, ship patch; API for reserved list should exist from P-KBD |
| Tokens.css not shipped | LOW | Add to `files`/`exports`, republish patch; caught by tarball test if present |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Inconsistent frozen API | P-API | CEM generated; cross-dimension matrices reviewed; CEM diff gate in P-REL |
| 2. Slots/parts/tokens treated as private | P-API / P-DOCS | Manifest lists slots/parts/cssProperties; token contract documented; diff gate |
| 3. jsdom blind spots | P-COV | Browser lane runs focus/dialog/positioning/form + ElementInternals real tests |
| 4. Gamed coverage | P-COV / P-REL | Branch + per-dir thresholds; scenario checklist; mutation spot-check on hot modules |
| 5. Virtualization a11y/form breakage | P-VIRT / P-COV | Browser SR count + roving-focus + scroll-keeps-selection tests pass |
| 6. Keyboard-shortcut hazards | P-KBD / P-COV | Editable-guard + composedPath + reserved-list + WCAG 2.1.4 tests pass |
| 7. Validation-message desync/a11y | P-VALID / P-COV | Message re-syncs on `setValidity`; `aria-describedby`/live announced in browser |
| 8. Publish artifact breakage | P-REL | Tarball-install smoke test (ESM + bundler) green; no `--provenance` on GH Packages; Lit in peerDeps; tokens.css importable |
| 9. Leak/lifecycle regressions | P-LEAK / P-COV | Teardown spies + `disconnectedCallback` symmetry; browser focus/animation cleanup |
| 10. Bundle-size regression | P-VIRT / P-REL | size-limit budget fails CI on regression; tree-shaking assertion green |

## Sources

- Codebase context: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md` (2026-08-10) — HIGH confidence, primary
- npm provenance / trusted publishing scope (npmjs registry + Sigstore only): [Introducing npm package provenance — GitHub Blog](https://github.blog/security/supply-chain-security/introducing-npm-package-provenance/), [Generating provenance statements — npm Docs](https://docs.npmjs.com/generating-provenance-statements/), [Trusted publishing for npm — npm Docs](https://docs.npmjs.com/trusted-publishers/), [Working with the npm registry (GitHub Packages)](https://docs.github.com/en/enterprise-server@3.16/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) — HIGH
- jsdom layout/focus/ElementInternals limitations: [jsdom getBoundingClientRect issue #1590](https://github.com/jsdom/jsdom/issues/1590), [Testing web components — dev.to](https://dev.to/hesxenon/testing-web-components-33mp) — HIGH (verified against PROJECT.md's own mocks in `test/setup.ts`)
- WCAG 2.1 SC 2.1.4 Character Key Shortcuts; ARIA `aria-setsize`/`aria-posinset`/`aria-rowcount`; Custom Elements Manifest analyzer; Lit peer-dependency guidance; npm `exports`/`sideEffects` semantics — established platform/tooling knowledge, HIGH confidence

---
*Pitfalls research for: Web Components / Lit component library v1.0 hardening*
*Researched: 2026-08-10*
