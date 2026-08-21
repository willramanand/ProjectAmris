# Feature Research

**Domain:** Framework-agnostic Web Components / Lit 3 library — perf + bundle-size + compatibility hardening for low-end enterprise devices & slow networks (v1.1, frozen public surface)
**Researched:** 2026-08-20
**Confidence:** HIGH (codebase-verified levers + curated web guidance on budgets/degradation)

> "Features" here = optimization/compatibility **behaviors and internal capabilities**, not new components or public API. Every deliverable is flagged **[SP]** surface-preserving (internal-only, no CEM change) or **[CS]** needs-Changeset (touches the frozen tag/prop/event/slot/`::part()`/`--am-*` surface, published entry points, or `package.json` `exports`/`sideEffects`/`peerDependencies`). The frozen surface is enforced by the CEM surface-diff gate (Phase 2/6).

## Codebase Reality Check (verified, drives scoping)

| Lever | Ground truth in `src/` | Implication |
|-------|------------------------|-------------|
| `@floating-ui/dom` | Statically imported in `internal/controllers/floating-position.ts` + 7 components (combobox, select, dropdown, popover, tooltip, rich-select, color-picker) | **Real deferral lever.** Overlays need it only when *opened*; core/non-overlay entries should not pay for it. |
| `highlight.js` | **Not imported anywhere in `src/` runtime** — only a Storybook/docs devDependency | **NON-ISSUE for shipped payload.** Do not spend a perf phase "lazy-loading highlight.js"; confirm it is absent from `dist/*` and move on. Flag the milestone brief's assumption as stale. |
| `@lit-labs/virtualizer` 2.1.1 (bundled dep) | Used by data-grid, combobox, select via `internal/helpers/virtualize-support.ts` | Heaviest single dep after floating-ui; must load only for the 3 consumers, never in core. |
| `@lit/context` 1.1.6 (bundled dep) | theme-provider / shortcuts provider | Small but shared-runtime dedupe candidate. |
| `attachInternals()` | Called **unconditionally in the constructor** of 16 form controls (input, checkbox, select, radio, switch, slider, textarea, combobox, date-picker, time-picker, number-field, input-otp, color-picker, rich-select, button, shortcuts) | Below Safari 16.4 `attachInternals` is `undefined` → **constructor throws → element never upgrades**. This is the graceful-degradation target. |
| `styles/reset.css.ts` | Imported by ~55 components | CSS dedupe / shared-chunk lever; each component re-ships reset unless hoisted to a shared chunk. |
| Tokens | `tokens/{primitives,semantic,dark}.css.ts` + `dist/styles/tokens.css` | Token delivery is already split; "leaner token delivery" = trimming unused primitives + tree-shakeable semantic import, not restructuring the public `--am-*` names. |
| Runtime split | `dist/chunks/**` already declared in `sideEffects`/`exports` | Shared-runtime dedupe infra exists; verify Lit + floating-ui land in one shared chunk, not duplicated per entry. |

## Feature Landscape

### Table Stakes (Enterprise low-end readiness expects these)

Missing these = the library is not credibly "hardened for low-end / slow networks."

| Feature | Why Expected | Complexity | Surface | Notes |
|---------|--------------|------------|---------|-------|
| Reproducible size + runtime-perf baseline harness | Can't claim improvement without a repeatable before/after; "measure first" is the decided direction | MEDIUM | [SP] | Extends existing size-limit gate; add CPU/network-throttled component profiling (Playwright + CDP throttling or Tachometer). Output = per-entry gzip/brotli KB + first-render ms on the chosen low-end profile. |
| Per-entry compressed payload budgets (core / full / per-component) | Slow networks are transfer-bound; raw KB is meaningless, gzip/brotli KB on the wire is the metric | LOW | [SP] | Budget the **brotli** size. Web guidance: total critical JS ~130–170 KB for slow-network/low-CPU worst case. Core entry should sit well under that; per-component entries small enough to compose several. |
| floating-ui not loaded until an overlay opens | Non-overlay pages (forms, layout, data display) should not download positioning math | MEDIUM | [SP] | Convert the static import in `floating-position.ts` to a dynamic `import()` inside `start()`. Overlays already gate `autoUpdate` on open — same seam. Keep the controller's public-less API identical. |
| Tree-shaking correctness verified per entry | `sideEffects` false-positives silently bloat consumers; a canary already exists | LOW | [SP] | Assert data-grid's virtualizer, floating-ui, and context do NOT appear in a "import one leaf component" bundle. Guard with the existing tree-shaking canary. |
| Shared-runtime dedupe (Lit peer + one floating-ui/virtualizer chunk) | Multiple entries must not each re-bundle the same code | MEDIUM | [SP] | Verify `dist/chunks/**` holds a single shared copy. Lit stays a **peer dep** (never bundled) — already correct; keep it. |
| Fewer re-renders / cheaper first render on heaviest components | Throttled CPU multiplies every wasted render (1s desktop → ~10s budget device) | MEDIUM–HIGH | [SP] | data-grid + overlays first: memoize derived state, hoist static templates, avoid per-render object/array allocation, gate reactive props. Behavior identical, fewer `update()` cycles. |
| Large-list handling stays cheap under throttle | data-grid/combobox/select must not block main thread on big datasets | MEDIUM | [SP] | Virtualization already shipped (v1.0). Harden: verify windowing under CPU throttle, avoid layout thrash, confirm scroll/focus a11y holds. |
| No constructor throw below the floor (feature-detect ElementInternals) | Below Safari 16.4 the WHOLE element currently fails to upgrade — worse than "form doesn't submit" | MEDIUM | [SP]* | Guard `attachInternals()` with `'attachInternals' in this` / typeof check; when absent, null-out internals and skip form-value/validity calls. Element still renders, fires events, is interactive. *SP as long as no new attribute/event/prop is added; a documented fallback attribute would be [CS]. |
| Documented true browser floor + degradation matrix | Enterprises gate adoption on a written support statement | LOW | [SP] | "Full support: Safari 16.4+/modern evergreen. Below floor: components render + emit events; native `<form>` participation degrades." Update BROWSER_SUPPORT.md; no API change. |
| Widened tested-engine matrix (WebKit/Firefox/Chromium) where cheap | "Works on our browser" ≠ compatible; enterprises run mixed fleets | MEDIUM | [SP] | Run the load-bearing lane (forms/focus/dialog/positioning) across 3 engines. Full every-component×every-engine matrix stays out of scope. |
| CI budget gates: report-only → enforcing | Gains regress silently without a blocking gate; mirrors v1.0 coverage discipline | LOW–MEDIUM | [SP] | Size + perf budgets block PRs once baselined. Enforcing is the finish line, not the start. |

### Differentiators (Set this library apart for low-end enterprise)

| Feature | Value Proposition | Complexity | Surface | Notes |
|---------|-------------------|------------|---------|-------|
| Hidden-input form fallback below the floor | Form controls still *participate in submission* on pre-16.4 browsers without a polyfill — the enterprise pain point, solved cheaply | HIGH | [CS]-lite | Feature-detect: when no ElementInternals, inject a Light-DOM hidden `<input>` synced to value/name. This is the classic pre-ElementInternals pattern. Risk: name/value in Light DOM is arguably observable behavior — treat as a Changeset (behavior addition, additive/opt-in, not a break). Gate strictly on absence of the API so modern browsers are byte-for-byte unchanged. |
| Brotli-on-the-wire budgets (not just minified KB) | Most libraries budget minified bytes; budgeting transfer bytes is what "slow network" actually needs | LOW | [SP] | Cheap once the harness exists; a credible, honest metric. |
| Low-end target profile chosen from real data | A named device/network profile (e.g. "4× CPU throttle, Slow 4G, 4 GB device") makes budgets defensible, not arbitrary | LOW | [SP] | Pick from the baseline run; document it. |
| Idle/deferred non-critical work | Defer non-visible init (autoUpdate loops, observers, heavy measurement) until interaction or idle | MEDIUM | [SP] | Overlays already gate autoUpdate on open — extend the discipline. Fewer wasted cycles at first paint on throttled CPU. |
| Per-component "cost card" in docs | Publish each component's gzip/brotli size + render cost so consumers budget consciously | LOW | [SP] | Generated from the harness; strong enterprise trust signal. Docs-only. |

### Anti-Features (Tempting, but wrong for this milestone)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hard ElementInternals polyfill | "Just make forms work everywhere" | Explicitly out of scope: not cleanly polyfillable, heavy, patches globals, collides with the frozen surface, taxes modern browsers for the minority | Feature-detected hidden-input fallback, gated on API absence — zero cost above the floor |
| Consumer-facing lazy-loading as a headline capability | "Load components on demand" | User already chose "client-only, smaller/faster"; new lazy-load entry points = new public surface = Changeset + API sprawl against the freeze | Lazy-load is an **internal** lever (dynamic `import()` of floating-ui inside the controller). No new public entry points. |
| SSR / declarative shadow DOM support | "Faster first paint" | Out of scope for v1.1; large lift, changes hydration model, risks the frozen behavior contract | Stay client-only ESM; revisit post-v1.1 if first-paint demands it |
| Aggressive micro-optimizations that change render timing/events | "Squeeze every ms" | Can alter event order, update timing, focus behavior → breaks the behavior contract even if the CEM tags are unchanged | Only optimizations provably behavior-preserving; verify against the real-browser lane |
| Restructuring `--am-*` tokens for "leaner CSS" | "Smaller token payload" | Token names are part of the FROZEN surface; renaming/removing breaks consumers | Trim *unused* primitives + keep semantic import tree-shakeable; names unchanged |
| Bundling Lit to "guarantee compatibility" | "Avoid peer-dep friction" | Doubles Lit on the wire, breaks single-instance registry, violates the peer-dep constraint | Keep Lit as peer dep (already correct) |
| Chasing IE11 / very old engines | "Maximum reach" | Cost explodes far below the ES2023 target for near-zero enterprise value | Reach "as far back as cheap feature-detection allows," document the honest true limit, stop there |
| Full every-component × every-engine test matrix | "Total confidence" | Cost outweighs value; already out of scope | Widen the *load-bearing* lane across 3 engines only |

## Feature Dependencies

```
Baseline + perf/size harness  (measure first)
    └──enables──> Per-entry compressed budgets
                      └──enables──> CI budget gates (report-only → enforcing)
    └──enables──> Low-end target profile (chosen from data)
                      └──feeds──> Runtime-perf pass (throttled profiling)

floating-ui dynamic import ──requires──> harness (prove the KB win, guard no-regress)
Runtime-perf pass ──requires──> harness (prove fewer renders / lower first-render ms)

ElementInternals feature-detect (no constructor throw)
    └──prerequisite for──> Hidden-input form fallback [CS]
    └──prerequisite for──> Documented degradation matrix
Widened engine matrix ──validates──> degradation behavior below floor
```

### Dependency Notes

- **Everything downstream requires the harness.** Budgets, the low-end profile, floating-ui deferral, and the runtime pass all need before/after numbers. Harness is Phase 1 of v1.1.
- **Feature-detect gate is the prerequisite for the hidden-input fallback.** You cannot add a fallback until the element survives construction below the floor. Sequence: guard `attachInternals` (table stakes, [SP]) → then optionally add hidden-input participation (differentiator, [CS]).
- **Budget gates go report-only first, enforcing last** — same escalation the v1.0 coverage/CEM gates used. Enforcing before the baseline is stable produces false failures.
- **floating-ui deferral conflicts with any synchronous-open assumption.** Overlays that expect positioning available in the same tick as `open` must tolerate an async `import()`; verify no visible flash/jump on the real-browser lane.

## MVP Definition (v1.1 phase-scoping guidance)

### Launch With (must-have for the milestone claim)

- [ ] Reproducible size + runtime-perf harness + chosen low-end profile — [SP], everything depends on it
- [ ] Per-entry brotli budgets + report-only CI gate — [SP], defines "good"
- [ ] floating-ui deferred to overlay-open (dynamic import) — [SP], largest verified size lever for non-overlay pages
- [ ] ElementInternals feature-detect: no constructor throw below floor — [SP]*, the honest floor of "graceful degradation"
- [ ] Runtime-perf pass on data-grid + overlays (fewer renders, cheaper first render) — [SP]
- [ ] Documented true browser floor + degradation matrix — [SP]
- [ ] Budget gates flipped to enforcing — [SP]

### Add After Validation (v1.1.x, once core lands)

- [ ] Hidden-input form-participation fallback below the floor — [CS]-lite; add only if enterprise demand justifies the Changeset
- [ ] Per-component cost cards in docs — [SP], trust signal
- [ ] Idle/deferred non-critical init beyond overlays — [SP]
- [ ] Wider engine matrix beyond the load-bearing lane where cheap — [SP]

### Future Consideration (post-v1.1)

- [ ] SSR / declarative shadow DOM — out of scope now
- [ ] Framework wrapper packages — out of scope now

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Perf/size harness + low-end profile | HIGH | MEDIUM | P1 |
| Per-entry brotli budgets + report-only gate | HIGH | LOW | P1 |
| floating-ui deferral (dynamic import) | HIGH | MEDIUM | P1 |
| ElementInternals feature-detect (no throw) | HIGH | MEDIUM | P1 |
| Runtime-perf pass (data-grid + overlays) | HIGH | MEDIUM–HIGH | P1 |
| Documented floor + degradation matrix | MEDIUM | LOW | P1 |
| Budget gates → enforcing | HIGH | LOW–MEDIUM | P1 |
| Shared-runtime dedupe verification | MEDIUM | MEDIUM | P2 |
| Tree-shaking correctness assertions | MEDIUM | LOW | P2 |
| Widened engine matrix (load-bearing lane) | MEDIUM | MEDIUM | P2 |
| Hidden-input form fallback | MEDIUM | HIGH | P2/P3 |
| Per-component cost cards | LOW–MEDIUM | LOW | P3 |
| Idle-deferred non-critical init | MEDIUM | MEDIUM | P3 |

**Priority key:** P1 must-have for the milestone claim · P2 add when possible · P3 nice-to-have.

## "Loads well on slow networks" — made concrete & measurable

For a client-only ESM library the consumer controls the HTML/critical path, so the library's job is to keep **what a consumer imports** small, compressible, and free of eager non-critical work:

- **Metric = brotli/gzip transfer bytes, not minified bytes.** Budget the wire size. Worst-case reference envelope for slow-network + low-CPU: ~130–170 KB of critical JS total (that's the consumer's whole app budget — the library must be a small fraction).
- **Concrete per-entry targets (set exact numbers from the baseline):** core entry small enough that several components compose within the app budget; per-component leaf entries in the low-single-digit-KB brotli range; `dist/amris.js` (full) treated as a dev/demo convenience, never the recommended production import.
- **Critical path = only what the imported component needs.** floating-ui, virtualizer, and context must be absent from any entry that doesn't use them (verified by the tree-shaking canary + shared-chunk check).
- **Deferred non-critical work:** positioning loops, observers, and heavy measurement start on interaction/idle — not at construction. Fewer bytes executed before first paint on a throttled CPU.
- **Compression-friendly output:** ship ESM that minifies and brotli-compresses well; avoid patterns that defeat minification. Serving compression is the consumer's job — measuring the compressed size is ours.
- **Low-end CPU is the multiplier:** a payload that parses in 1s on desktop can cost ~10s on a budget device, so size reduction *is* runtime reduction. This is why measure-first pairs size and CPU-throttled render timing in one harness.

## Surface-Impact Summary (for REQ scoping)

| Deliverable | Surface flag | Why |
|-------------|-------------|-----|
| Harness, budgets, gates | [SP] | Tooling/CI only |
| floating-ui dynamic import | [SP] | Internal controller seam; no public entry added |
| Runtime-perf memoization/hoisting | [SP] | Must be behavior-preserving; verify on real-browser lane |
| ElementInternals feature-detect guard | [SP] | Internal constructor guard; no new tag/prop/event |
| Degradation docs / floor statement | [SP] | Docs only |
| CSS/reset shared-chunk dedupe | [SP] | Output structure, `--am-*` names unchanged |
| Trim unused token primitives | [SP] | Only unused/private primitives; public semantic names frozen |
| Hidden-input form fallback | **[CS]** | Adds Light-DOM behavior below floor; additive/opt-in, gate strictly on API absence, ship with a Changeset |
| Any new fallback attribute/prop/event | **[CS]** | Touches frozen CEM |
| `package.json` exports/sideEffects changes | **[CS]** | Published entry contract is frozen |

## Sources

- [More capable form controls — web.dev](https://web.dev/more-capable-form-controls/) — ElementInternals, `formAssociated`, `setFormValue`, hidden-input legacy pattern (MEDIUM–HIGH confidence, canonical)
- [Creating Custom Form Controls with ElementInternals — CSS-Tricks](https://css-tricks.com/creating-custom-form-controls-with-elementinternals/) — feature-detection + coexistence of ElementInternals and hidden-input fallback
- [ElementInternals — MDN](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) — API surface, support baseline
- [ElementInternals and Form-Associated Custom Elements — WebKit](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/) — Safari 16.4 floor confirmation
- [element-internals-polyfill — npm](https://www.npmjs.com/package/element-internals-polyfill) — the polyfill this milestone explicitly rejects (context)
- [JavaScript Bundle Performance / Code-Splitting — Smashing Magazine](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/) — code-splitting, deferral
- [Optimize JavaScript bundle size — Front-End Checklist](https://frontendchecklist.io/rules/performance/js-file-size) — 130–170 KB worst-case slow-network/low-CPU budget envelope
- Codebase verification: `src/internal/controllers/floating-position.ts`, `src/components/{input,checkbox,...}.ts` (unconditional `attachInternals`), `package.json` deps/exports/sideEffects, `src/components/{data-grid,combobox,select,date-picker,time-picker,dialog}` (HIGH confidence, direct read)

---
*Feature research for: Web Components / Lit library perf-size-compat hardening (v1.1, frozen surface)*
*Researched: 2026-08-20*
