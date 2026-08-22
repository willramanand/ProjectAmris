# Phase 8: Bundle-Size Deferral - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-22
**Phase:** 8-bundle-size-deferral
**Areas discussed:** First-open overlay UX, Virtualizer load gap, SIZE-05 defer scope, Deferral completeness

---

## First-Open Overlay UX

`hidden-until-positioned` (never paint at 0,0) was locked regardless per Pitfall 4 — the
question was purely prefetch timing vs data thrift on the low-end-cellular target.

| Option | Description | Selected |
|--------|-------------|----------|
| Prefetch on intent | Fire import() on trigger pointerenter/focus so the chunk is warm before open; await the usually-resolved promise on open to keep open→position→focus→autoUpdate order. Smoothest on slow 3G. Cost: a hover that never opens wastes one fetch. Research-recommended (Pitfall 4). | ✓ |
| Strictly on-open | Load only when an overlay actually opens. Zero wasted fetches (best for cellular data), but the very first open of each overlay type has a one-time async gap (invisible until positioned). Memoized after. | |
| Hybrid by type | Prefetch always-present/hover overlays (tooltip, popover) on intent; load trigger menus on-open. | |

**User's choice:** Prefetch on intent
**Notes:** Applied uniformly to all overlays (not the per-type hybrid). hidden-until-positioned locked. Basis: Pitfall 4 (lines 86–103).

---

## Virtualizer Load Gap

`virtualize()` runs inside `render()` (no await). Fetch-failure/offline fallback = stay on
`repeat()` was locked regardless; the question was what renders during the async gap on
first threshold-cross.

| Option | Description | Selected |
|--------|-------------|----------|
| Prefetch + repeat fallback | Warm the virtualizer import as row count nears the threshold (or on grid/popup open) so it's usually ready by the render that needs it; existing repeat() covers the rare cold-cross and offline. Smoothest, fully behavior-preserving. Mirrors the overlay choice. | ✓ |
| repeat() until loaded | No prefetch; keep repeat() until the memoized import resolves, then swap. Simplest, but very large lists render all rows once before windowing — transient jank on huge datasets. | |
| Capped slice | Render only a viewport-sized repeat() slice during the gap; swap on load. Avoids giant-list jank without prefetch, but adds a temporary windowing path distinct from the real one. | |

**User's choice:** Prefetch + repeat fallback
**Notes:** Offline/fetch-failure fallback = stay on repeat() (unwindowed but functional), locked.

---

## SIZE-05 Defer Scope

Fuzziest requirement + chosen differentiator. Areas 1–2 already move the heaviest
non-critical work (the deps) off first paint; overlays already idle-gate autoUpdate.

**Question 1 — ambition:**

| Option | Description | Selected |
|--------|-------------|----------|
| Bounded + document | SIZE-05 mostly satisfied by the Area 1-2 dep deferral plus a targeted sweep of just the few heaviest components to move observer/listener attach to first-interaction/idle. Document the discipline. Low freeze-risk, modest win. | ✓ |
| Moderate sweep | Systematically move ResizeObserver/MutationObserver + non-essential listeners across all non-overlay components. Bigger win; notably more test surface. | |
| Broad audit | Full audit of every component's init path. Max win, highest regression risk against the frozen surface — likely over-scoped. | |

**User's choice:** Bounded + document

**Question 2 — scheduling mechanism** (Safari 16.4 floor has no requestIdleCallback):

| Option | Description | Selected |
|--------|-------------|----------|
| Interaction-gate + rAF | Defer to first user interaction where interaction-triggered; for after-first-paint work use double-rAF or microtask. Portable to Safari 16.4, no capability branch, matches autoUpdate-on-open discipline. | ✓ |
| rIC + setTimeout fallback | requestIdleCallback where available (Chromium/Firefox) with setTimeout fallback on Safari. True idle scheduling but adds an internal shim + a capability branch to test. | |
| You decide | Claude picks per component, kept portable to the floor. | |

**User's choice:** Interaction-gate + rAF

---

## Deferral Completeness

Decides whether the byte win is real (Pitfall 1). 6 components import floating-ui at
runtime outside the controller; color-picker & rich-select inline computePosition.

| Option | Description | Selected |
|--------|-------------|----------|
| Full — route every site | Controller loads via lazy-load.ts; combobox/select/popover/tooltip get middleware from the same loaded module; migrate color-picker & rich-select off inline computePosition. floating-ui fully absent from non-overlay entries, one shared chunk (SIZE-04 dedupe). All behavior-preserving; touches 2 extra components. | ✓ |
| Controller + middleware only | Defer controller + route the 4 middleware importers, but leave the 2 inline components static. Less refactor, but those 2 entries still bundle floating-ui — partial win, SIZE-01 leaks. | |
| Controller-only (literal) | Only floating-position.ts defers. All 6 component-level runtime imports stay static → near-zero visible win (Pitfall 1/4). Effectively fails the phase goal. | |

**User's choice:** Full — route every site
**Notes:** dropdown is type-only (Placement) — no runtime change needed there.

---

## Claude's Discretion

- Exact shape/name of the shared deferred loader (research suggests `src/internal/helpers/lazy-load.ts`), the memoization strategy, and how the controller exposes loaded-module middleware to hosts.
- Precise per-component prefetch wiring (which existing trigger listener to hang prefetch off).
- SIZE-04 dedupe verification method (manualChunks inspection vs bundle-attribution report vs deep-import purity assertion).
- Which "heaviest components" get the D-08 idle-init sweep (pick from the Phase-7 baseline).
- SIZE-03 tree-shaking canary: not a gray area — registration-smoke assertion + extended no-bundled-Lit assertion per Pitfalls 3/5; exact test location Claude's discretion.

## Deferred Ideas

- `manualChunks` shared-runtime dedupe tuning → `PERF-V2-01` (only if the chunk graph shows unresolvable duplication).
- Flipping size/count budgets to enforcing → Phase 11 (GATE-01/02/03).
- Runtime-perf tuning → Phase 9 (RPERF-01…04).
- Broad every-component idle-init audit → out of scope per D-08.
- Consumer-facing lazy-load as public API → out of scope (internal optimization only).
