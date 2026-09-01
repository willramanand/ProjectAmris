# Phase 8: Bundle-Size Deferral - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Defer the real shipped heavy deps — `@floating-ui/dom` and `@lit-labs/virtualizer` —
behind **memoized dynamic `import()`** so first-load and per-entry payloads shrink,
**behavior-preserving across all consumers**, with the byte win now **provable** in the
re-scoped brotli size metric (Phase 7 stopped ignoring `@floating-ui/dom`) and **no
cross-entry duplication regressions**. Closes SIZE-01…SIZE-05.

Delivers:
- `@floating-ui/dom` loaded via a memoized dynamic import, prefetched on trigger
  intent, gated so positioning code is absent from non-overlay entries (SIZE-01).
- `@lit-labs/virtualizer` loaded via a memoized dynamic import at/above the
  `VIRTUALIZE_ROW_THRESHOLD = 100` row threshold (SIZE-02).
- A tree-shaking canary proving `customElements.define` still runs at runtime
  (registration never shaken away) and Lit is never bundled (SIZE-03).
- Shared-chunk dedupe + per-component deep-import purity verified (SIZE-04).
- Bounded deferred/idle non-critical init off the first-load critical path (SIZE-05).

**Not this phase:**
- Runtime-perf tuning of the heaviest components (re-render/reposition churn) → **Phase 9** (RPERF-01…04).
- Graceful degradation / feature detection below the Safari 16.4 floor → **Phase 10** (COMPAT-*).
- Flipping any size/count budget from **report-only to enforcing** → **Phase 11** (GATE-01…03).
  All budgets stay report-only this phase; the deferral win posts as a number, nothing red-builds.

</domain>

<decisions>
## Implementation Decisions

### First-Open Overlay Behavior (SIZE-01)
- **D-01:** **Prefetch the floating-ui chunk on trigger intent** — kick the memoized
  `import()` on the trigger's `pointerenter`/`focus` so the chunk is warm before the
  overlay opens, then `await` the (usually already-resolved) promise on open. This keeps
  the existing **open → position → focus → autoUpdate** ordering contract intact (Pitfall 4,
  line 88 — the async gap must not reorder focus/autoUpdate ahead of first position).
  — **Reversibility:** reversible (prefetch trigger is a local wiring choice; re-tune later).
- **D-02:** **`hidden-until-positioned` is locked** — overlays stay `visibility:hidden` /
  unpainted until the first `computePosition` resolves, then reveal. **Never paint at
  `0,0`** (Pitfall 4, line 96). This preserves the current "reveal after positioned"
  behavior exactly; it is non-negotiable regardless of prefetch timing.
- **D-03:** Prefetch is **on trigger intent for all overlays** (uniform policy — not the
  per-type hybrid). Always-present/hover overlays (tooltip, popover) warm on their trigger
  `pointerenter`/`focus`; trigger menus (dropdown, select, combobox, color-picker,
  rich-select) warm on the same. A hover-without-open wastes at most one fetch — accepted
  cost for a smooth first open on the low-end-cellular target.

### Virtualizer Load Gap (SIZE-02)
- **D-04:** **Prefetch the virtualizer chunk near-threshold / on grid-popup open** — warm
  the memoized `import()` as the row count approaches `VIRTUALIZE_ROW_THRESHOLD` (or when
  the grid/listbox popup opens) so the directive is usually resolved by the `render()` that
  needs it. `virtualize()` runs **inside `render()`** and cannot be `await`ed there, so
  prefetch is how the async gap is hidden.
- **D-05:** **`repeat()` is both the cold-cross gap render and the offline/fetch-failure
  fallback** — during any window where the virtualizer chunk is not yet resolved (rare cold
  cross, or a failed chunk fetch on a flaky network), the existing `repeat()` render path
  keeps the list fully functional (just unwindowed). On successful load the render swaps to
  `virtualize()`. This is fully behavior-preserving for correctness and gives a free failure
  mode. — **Reversibility:** reversible.

### Deferral Completeness / Shared Loader (SIZE-01, SIZE-04)
- **D-06:** **Full deferral — route EVERY runtime floating-ui site through one shared,
  memoized deferred loader** (research's proposed `src/internal/helpers/lazy-load.ts`, NEW).
  The literal requirement names only `floating-position.ts`, but **6 components import
  `@floating-ui/dom` at runtime outside the controller**; any left static keeps the dep in
  the shipped graph and makes the re-scoped size win near-zero (Pitfall 1). Concretely:
  - `FloatingPositionController` (`src/internal/controllers/floating-position.ts`) loads
    `computePosition`/`autoUpdate`/`flip`/`shift`/`offset` from the deferred module.
  - `combobox`/`select` (`size` middleware) and `popover`/`tooltip` (`arrow` middleware)
    obtain their host-specific middleware from the **same loaded module** (not a separate
    static `import { size/arrow } from '@floating-ui/dom'`).
  - **Migrate `color-picker` and `rich-select` off their inline `computePosition`** onto the
    controller / shared loader so no component holds a static floating-ui import.
  - Result: floating-ui is absent from every non-overlay entry and lives in **one shared
    chunk** (best SIZE-04 dedupe; no per-component duplication).
  — **Reversibility:** costly — migrating `color-picker`/`rich-select` onto the controller
  touches their open/position/focus paths; undo means re-inlining. All changes MUST be
  behavior-preserving (surface-diff gate + real-browser positioning tests are the guard).
- **D-07:** `dropdown` imports only `type Placement` (type-only, erased at build) — **no
  runtime change needed** there; leave it. Verify it stays type-only after the refactor.

### Deferred / Idle Non-Critical Init (SIZE-05)
- **D-08:** **Bounded scope.** SIZE-05 is treated as **mostly satisfied by D-01…D-06** (the
  dynamic imports move the heaviest non-critical work — the deps themselves — off first
  paint) **plus a targeted sweep of only the heaviest components** to move
  ResizeObserver/MutationObserver + non-essential listener attach off the construction /
  first-paint path. **Document the discipline.** Deliberately NOT a broad every-component
  audit — every extra deferral touches a frozen-behavior component, so ambition is bounded
  to keep the regression/verification surface small. — **Reversibility:** reversible.
- **D-09:** **Scheduling mechanism = interaction-gate + rAF/microtask** — defer to first
  user interaction where the work is interaction-triggered; for "after first paint" work use
  a double-`requestAnimationFrame` or microtask. **No `requestIdleCallback`** — the browser
  floor is Safari 16.4, which does not support it; interaction-gate + rAF is portable, needs
  no capability branch, and matches the existing `autoUpdate`-on-open gating discipline.

### Tree-Shaking Canary & No-Bundled-Lit (SIZE-03) — Claude's Discretion
- **D-10:** SIZE-03 was **not a gray area** — the approach is pinned by research + Pitfalls
  3/5. Add a **runtime registration-smoke assertion** (import a component, assert
  `customElements.get('am-…')` is defined so a `sideEffects`/tree-shake change can't silently
  shake away `@customElement` registration — Pitfall 3) **and** reuse/extend the Phase-7
  **no-bundled-Lit assertion** (independent of size-limit, which `ignore`s `lit` — Pitfall 5).
  Exact test file/harness location is Claude's discretion, following the established
  `api/` + `scripts/` + browser-lane conventions.

### Claude's Discretion
- Exact shape/name of the shared deferred loader (research suggests
  `src/internal/helpers/lazy-load.ts`) — the memoization strategy (module-level promise
  cache), and how the controller exposes the loaded module's middleware factories to hosts.
- Precise prefetch wiring per component (which existing trigger listener to hang
  `pointerenter`/`focus` prefetch off of) — behavior-preserving.
- Whether SIZE-04 dedupe verification uses `manualChunks` inspection, the bundle-attribution
  report (`rollup-plugin-visualizer` / `@size-limit/esbuild-why` from Phase 7), or a
  deep-import purity assertion — implementation detail. Do **not** add `manualChunks` tuning
  unless the chunk graph shows duplication deep-import purity can't resolve (that is
  `PERF-V2-01`, deferred).
- Which "heaviest components" get the D-08 idle-init sweep — pick from the measured Phase-7
  baseline, keep the list short.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (locked)
- `.planning/REQUIREMENTS.md` — SIZE-01…SIZE-05 (the five requirements this phase closes) + the surface-freeze rule (all behavior- and surface-preserving; no `[CS]` items in Phase 8).
- `.planning/ROADMAP.md` §"Phase 8: Bundle-Size Deferral" — goal + 5 success criteria (the acceptance bar).

### Research (implementation-grounding — HIGH confidence, codebase-verified)
- `.planning/research/PITFALLS.md` — **Pitfall 1** (ignored-dep hides the win — floating-ui must be counted), **Pitfall 4** (lines 86–103: floating-ui deferral → `0,0` flash + focus-order race; prescribes prefetch-on-intent + hidden-until-positioned — the D-01/D-02 basis), **Pitfall 3** (`sideEffects` tree-shake can drop `@customElement` — SIZE-03 registration smoke), **Pitfall 5** (accidentally bundling/duplicating Lit — no-bundled-Lit assertion), **Pitfall 7** (`highlight.js` is a phantom — do NOT try to defer it). **Read before designing the deferral.**
- `.planning/research/ARCHITECTURE.md` — §"Pattern 2: Threshold-gated deferral for the virtualizer" (line 143) + the `lazy-load.ts` (NEW-internal) memoized-loader plan (lines 97, 232) + surface-preservation table (line 291). **Primary architecture reference for this phase.**
- `.planning/research/STACK.md` — line 78: floating-ui lands in **9 files** (component runtime imports + `floating-position.ts`); virtualizer in data-grid/combobox/select; confirms these (not `highlight.js`) are the real shipped heavy deps.
- `.planning/research/SUMMARY.md` §"Phase 8" (line 86) + FEATURES.md (idle/deferred init, lines 49/106/141) — supporting context for SIZE-05.

### Existing code to modify / mirror (in-repo)
- `src/internal/controllers/floating-position.ts` — the shared `computePosition` + `autoUpdate` controller; convert its top-level floating-ui import to the deferred memoized loader (D-06). Host-gated `start()`/`stop()` already gates autoUpdate on open — preserve that.
- `src/internal/helpers/virtualize-support.ts` — already threshold-gates on `VIRTUALIZE_ROW_THRESHOLD = 100`; extend it to defer the `@lit-labs/virtualizer/virtualize.js` import above the threshold (D-04/D-05). Pinned exact `2.1.1` (pre-1.0 labs — do not bump).
- Runtime floating-ui import sites to route through the loader (D-06): `src/components/combobox/combobox.ts` (`size`), `src/components/select/select.ts` (`size`), `src/components/popover/popover.ts` (`arrow`), `src/components/tooltip/tooltip.ts` (`arrow`), and the two inline `computePosition` migrations: `src/components/color-picker/color-picker.ts`, `src/components/rich-select/rich-select.ts`. `src/components/dropdown/dropdown.ts` is type-only (D-07) — leave.
- `virtualize()` render-path sites: `src/components/data-grid/data-grid.ts:516`, `src/components/combobox/combobox.ts:722`, `src/components/select/select.ts:992`.

### Measurement / gate infrastructure (Phase 7 — the win must show here, report-only)
- `.size-limit.json` — re-scoped in Phase 7 to **count** `@floating-ui/dom` in the delivered-payload metric; the deferral win posts here (still report-only until Phase 11).
- `vite.config.ts` — central `external` list (`lit`, `@lit/*`, `@lit-labs/*`, `@floating-ui/*`); snapshot-guarded for the no-bundled-Lit assertion. Bundle-attribution visualizer gated behind an env flag.
- `api/perf.baseline.json` + the browser perf harness — overlay open+reposition scenario was baselined **pre-deferral** in Phase 7 so this phase shows a real before/after delta.
- `scripts/cem-diff.mjs` / `api/custom-elements.baseline.json` — the committed-baseline + report-only→enforcing pattern; the CEM surface-diff gate is the freeze guardrail for all behavior-preserving edits here.

### Codebase maps
- `.planning/codebase/CONCERNS.md` — `autoUpdate`/ResizeObserver churn (SIZE-05 sweep candidates) + data-grid render cost.
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md` — the `src/internal/` chokepoint boundary this work rides.

### Prior phase decision context
- `.planning/phases/07-measurement-baselines-budgets/07-CONTEXT.md` — D-02 (floating-ui now counted), overlay scenario baselined pre-deferral, the deferral flash/prefetch concerns explicitly punted to Phase 8.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FloatingPositionController` (`src/internal/controllers/floating-position.ts`) — the single chokepoint that already wraps `computePosition`/`autoUpdate` for 6 controller-using overlays; the natural home for the deferred loader and for absorbing the two inline components (color-picker, rich-select).
- `virtualize-support.ts` — already threshold-gated (`VIRTUALIZE_ROW_THRESHOLD = 100`) with the exact `@lit-labs/virtualizer` v2.1.1 runtime API verified in JSDoc; only the import site needs to become deferred.
- Phase-7 bundle-attribution report (`rollup-plugin-visualizer` + `@size-limit/esbuild-why`) and the re-scoped `.size-limit.json` — reuse to prove the win + verify SIZE-04 dedupe/deep-import purity.
- `scripts/cem-diff.mjs` committed-baseline+diff pattern — mirror for any new registration-smoke / no-bundled-Lit check.

### Established Patterns
- `src/internal/` single-chokepoint-per-concern boundary — the whole deferral is a handful of internal-file edits, never touching the frozen CEM/public surface.
- `external` list centrally defined in `vite.config.ts` (`lit`, `@lit/*`, `@lit-labs/*`, `@floating-ui/*`) — heavy deps already external; the deferral changes *when* they load, not whether they're bundled.
- Host-gated lifecycle: overlays already gate `autoUpdate` start/stop on open/close/disconnect — the SIZE-05 idle discipline extends this, it doesn't invent it.
- Gate-on-counts / report-wall-clock; report-only → enforcing flip is Phase 11.

### Integration Points
- NEW `src/internal/helpers/lazy-load.ts` (memoized loader) imported by `floating-position.ts`, `virtualize-support.ts`, and the migrated inline components.
- The deferred floating-ui + virtualizer become their **own shared chunks**; the re-scoped `.size-limit.json` delivered-payload metric and the bundle-attribution report confirm the byte reduction + dedupe (report-only).
- New registration-smoke + (extended) no-bundled-Lit assertions slot into the existing test lanes / CI as report-only checks.

</code_context>

<specifics>
## Specific Ideas

- `hidden-until-positioned` and prefetch-on-intent come straight from Pitfall 4's prescribed
  fix — the real-browser verification should assert **no `0,0` frame** and **focus lands on
  the correct element post-open** on a throttled network profile (Pitfall 4, line 98).
- `highlight.js` is a **phantom** for this phase — a Storybook-only devDependency, already
  absent from every shipped chunk (confirmed by all four research tracks + Phase 7). Do NOT
  add any "defer highlight.js" work (Pitfall 7).
- `@lit-labs/virtualizer` is exact-pinned at `2.1.1` (pre-1.0 labs, a minor bump can break
  the runtime API) — keep the exact pin; deferral changes the import timing only.
- Keep `lit` external and out of `dist` — the deferral/chunking refactor is the classic place
  a `manualChunks`/`external` slip bundles or duplicates Lit (Pitfall 5); the no-bundled-Lit
  assertion is the guard.

</specifics>

<deferred>
## Deferred Ideas

- **`manualChunks` shared-runtime dedupe tuning** → `PERF-V2-01` (future). Only if the
  post-deferral chunk graph shows cross-entry duplication that deep-import purity alone
  cannot resolve. Not a default.
- **Flipping size/count budgets to enforcing** → **Phase 11** (GATE-01/02/03); wall-clock
  stays report-only. This phase's win posts report-only.
- **Runtime-perf tuning** (re-render-on-sort, filter-per-keystroke, reposition churn) →
  **Phase 9** (RPERF-01…04), measured against this phase's post-deferral baseline.
- **Broad every-component idle-init audit** — deliberately out of scope per D-08; only the
  heaviest components get the bounded sweep this phase.
- **Consumer-facing lazy-load as public API** — out of scope (REQUIREMENTS): deferral stays
  an internal optimization, no new public entry points.

None outside phase scope surfaced during discussion — the phase stayed on deferral.

</deferred>

---

*Phase: 8-bundle-size-deferral*
*Context gathered: 2026-08-22*
