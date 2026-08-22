# Phase 7: Measurement, Baselines & Budgets - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up a reproducible, throttled measurement harness and commit before/after
baselines so every later v1.1 cut and budget (Phases 8–11) is defended by real
numbers, and pick the low-end target profile from that data rather than guessing.

Delivers (MEAS-01…MEAS-05):
- `size-baseline.mjs` → committed per-entry **brotli** bundle-size baseline.
- `perf-harness.mjs` on the existing Vitest Browser Mode + Playwright/Chromium
  lane, under CDP CPU + network throttling → committed JSON baseline of **count**
  metrics (render/update/`computePosition` calls, node counts) + wall-clock timings.
- A named low-end target profile (CPU multiplier + network tier) pinned in harness config.
- `.size-limit.json` re-scoped so the delivered-payload metric **counts**
  `@floating-ui/dom`, plus a no-bundled-Lit assertion independent of size-limit.
- A dev-only bundle-attribution report confirming `highlight.js` ships nowhere.

**Not this phase:** the actual deferral/tuning cuts (Phases 8–9), graceful
degradation (Phase 10), and flipping any gate to **enforcing** (Phase 11). Phase 7
is measure + baseline + report-only wiring only.

</domain>

<decisions>
## Implementation Decisions

### Low-End Target Profile (MEAS-03)
- **D-01:** Target persona = **older device on cellular** (worst-case field/mobile),
  not enterprise-desktop. The harness measures across a candidate grid — CPU-throttle
  {4×, 6×} × network {Slow-3G, Fast-3G}, centered on the harsh 6×+3G corner — then
  **pins one named profile** (single CPU multiplier + single tier) in harness config,
  chosen from the measured data that best separates heavy from light components. The
  numeric pick is data-derived per MEAS-03; the *intent* baked in is worst-case
  cellular. — **Reversibility:** reversible (config value; re-pin from re-run data).

### Size Baseline Breadth (MEAS-01, MEAS-04)
- **D-02:** Committed brotli baseline is the **expanded** set, not just a re-scope:
  - Re-scope the existing 4 entries (core, full, button, data-grid) to **stop
    ignoring `@floating-ui/dom`** in the delivered-payload metric (keep `lit`
    ignored — peer dep, never shipped) so the Phase-8 deferral win becomes visible.
  - Add `dist/styles/tokens.css` as a budgeted entry.
  - Add a **first-load composite** metric (see D-05).
  - Add a **marginal-cost-over-core** metric per component (component entry minus
    the shared-core baseline) so shared-chunk moves aren't double-counted (Pitfall 2).
  - Gate/report unit: **brotli** (on-the-wire). gzip may be reported alongside;
    the number that matters is brotli, used consistently everywhere.
  — **Reversibility:** reversible.
- **D-03:** A **no-bundled-Lit assertion independent of size-limit** (size-limit
  `ignore`s `lit`, so it would mask an inlined copy — Pitfall 5). Grep emitted
  `dist/**/*.js` for inlined Lit markers / assert `lit` resolves only as a bare
  external specifier. Runs as its own check, wired report-only in CI this phase.
- **D-05:** First-load composite = **core + button + input + dialog** (light + form
  control + overlay). Chosen so the composite exercises the `@floating-ui/dom`
  deferral target via `dialog` and reflects a typical form-with-modal app's first load.

### Perf Harness Scenario Set (MEAS-02)
- **D-06:** Committed perf baseline scenarios = the Phase 8–9 optimization targets
  **plus a light control**:
  - `data-grid` — render + sort
  - `combobox` — filter-per-keystroke
  - overlay — open + reposition (one representative overlay; component TBD, see Discretion)
  - `button` — light-component control / noise-floor contrast
  Per scenario the harness emits **count metrics** (Lit render/update call counts,
  `computePosition` invocations, DOM node counts) — these are the numbers later
  phases gate on — **plus** wall-clock timings, which stay report-only.
  — **Reversibility:** reversible (scenarios can be added later).

### Noise-Floor Characterization (seeds GATE-01/02 in Phase 11)
- **D-07:** Each perf scenario runs **5 repeats**; the committed baseline records the
  **median** (the reported number) **and a mean+3σ variance band**. Phase 11 sets
  enforcing thresholds *outside* that band so flaky timing never red-builds
  (Pitfall 15). — **Reversibility:** reversible.

### Phase-7 CI Footprint
- **D-08:** Phase 7 wires **both** the re-scoped size-limit and the new perf-diff as
  **report-only CI jobs now** — numbers post on every PR, nothing red-builds. The
  flip to **enforcing** is Phase 11 (size first → runtime counts → wall-clock stays
  report-only). perf-diff mirrors the proven `scripts/cem-diff.mjs` +
  committed-baseline pattern (report-only → enforcing). — **Reversibility:** reversible
  (report-only → enforcing is the planned, already-decided path).

### Tooling / Toolkit (MEAS-05 + STACK research)
- **D-09:** Dev-only bundle-attribution report = **`rollup-plugin-visualizer`**
  (gated behind an env flag so normal builds stay clean) **+ `@size-limit/esbuild-why@13`**
  (matches installed size-limit 13, runs on the Node-22 size job). Confirms
  `highlight.js` is absent from every shipped chunk. **Note:** `highlight.js` is
  *already* a devDependency — MEAS-05 is **confirm-only**, no dep move needed.
- **D-10:** **`tachometer`** added as a committed **local-only, ungated** A/B config
  for the heavy components (data-grid, combobox, overlays) — runnable locally for a
  trustworthy before/after delta during Phases 8–9. Never in CI, never a gate.
- **D-11:** CDP throttling is **Chromium-only**. The perf harness runs Chromium-only;
  WebKit/Firefox (added later for COMPAT-04, Phase 10) get correctness-only coverage,
  **no throttled perf numbers**. Document this split explicitly.

### Claude's Discretion
- Exact file locations/names, following the established pattern:
  `scripts/size-baseline.mjs`, the perf harness (`perf-harness.mjs` and/or under
  `test/perf/**` on the browser lane), `scripts/perf-diff.mjs` (clone of
  `cem-diff.mjs`), and committed baselines under `api/` (e.g. `api/perf.baseline.json`;
  the size baseline is the re-scoped `.size-limit.json`). Planner picks precise paths.
- Which single overlay represents "overlay" in the perf scenario (tooltip vs dropdown
  vs popover) — pick the most representative open→position→focus path; document it.
- Whether the marginal-cost metric uses size-limit's `import` syntax or a
  per-entry-minus-core diff — implementation detail.
- Exact CPU multipliers / tiers in the candidate grid beyond the 4×/6× × 3G center,
  if the data warrants.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (locked)
- `.planning/REQUIREMENTS.md` — MEAS-01…MEAS-05 (the five requirements this phase closes) + surface-freeze rule.
- `.planning/ROADMAP.md` §"Phase 7" — goal + 5 success criteria (the acceptance bar).

### Research (implementation-grounding — HIGH confidence, codebase-verified)
- `.planning/research/STACK.md` — tool choices + versions (`rollup-plugin-visualizer@7`,
  `@size-limit/esbuild-why@13`, `tachometer@0.7.2`), CDP throttle approach, CI-integration
  table, and the "what NOT to use" list. **Primary build reference for this phase.**
- `.planning/research/PITFALLS.md` — Pitfalls **1** (jsdom/unthrottled perf), **2**
  (gzip vs brotli + shared-chunk attribution), **3** (`sideEffects` tree-shake),
  **5** (accidentally bundling Lit), **7** (phantom `highlight.js`), **15** (flaky
  gate / premature enforcing flip). Release-blocking guidance — read before harness design.
- `.planning/research/SUMMARY.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md` — supporting context.

### Existing pattern to mirror (in-repo)
- `scripts/cem-diff.mjs` — zero-dep baseline-diff comparator + report-only→enforcing
  release gate. **Clone its shape for `perf-diff.mjs`.**
- `api/custom-elements.baseline.json` — committed-baseline convention (what a
  committed baseline looks like and how CI diffs against it).
- `.github/workflows/ci.yml` — 4 existing jobs (verify / browser / surface-diff /
  size / smoke); size job pinned **Node 22** (size-limit@13 needs ≥22.18). New
  report-only jobs slot in here.

### Config to modify
- `.size-limit.json` — re-scope `ignore`, add tokens.css + first-load + marginal entries.
- `vitest.config.ts` — browser project (Chromium, playwright provider, **no setupFiles**); perf harness attaches here.
- `vite.config.ts` — central `external` list (snapshot for no-bundled-Lit guard); visualizer plugin gated behind env flag.

### Codebase maps
- `.planning/codebase/CONCERNS.md` — data-grid non-virtualized baseline, `autoUpdate`/ResizeObserver churn (the perf scenarios' pre-cut baseline).
- `.planning/codebase/TESTING.md`, `.planning/codebase/STACK.md` — existing lane/tooling shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/cem-diff.mjs` — zero-dependency committed-baseline diff + report-only→enforcing gate. Direct template for `perf-diff.mjs`.
- `api/custom-elements.baseline.json` — committed-baseline convention to follow for `api/perf.baseline.json`.
- `test/browser/**` fidelity lane — `floating-position.test.ts`, `data-grid-virtual.test.ts`, `combobox-virtual.test.ts`, `overlay-focus.test.ts` already exercise the exact components/interactions the perf scenarios need; harness extends this lane.
- `vitest.config.ts` browser project — Chromium via `@vitest/browser-playwright`, headless, **no setupFiles** (real native APIs); perf harness runs here.

### Established Patterns
- Committed baseline + zero-dep diff script, **report-only → enforcing** flip (cem-diff / coverage floors).
- **Gate on counts, report wall-clock** (Pitfall 1/15) — already the stated v1.1 discipline.
- Ratchet-to-final-floor thresholds, floors just under measured, never above.
- Size job pinned Node 22; rest of CI on Node 20 — keep the split.
- `external` list centrally defined in `vite.config.ts` (`lit`, `@lit/*`, `@lit-labs/*`, `@floating-ui/*`) — snapshot-guard it for the no-bundled-Lit assertion.

### Integration Points
- New `perf-diff` + re-scoped `size` become **report-only** jobs in `.github/workflows/ci.yml`.
- Bundle-attribution (`rollup-plugin-visualizer`) gated behind an env flag in `vite.config.ts`; `@size-limit/esbuild-why` wired into the size lane for `--why`.
- Committed baselines land under `api/` (perf) + the re-scoped `.size-limit.json` (size).

</code_context>

<specifics>
## Specific Ideas

- **`highlight.js` is already a devDependency** (package.json line 96) — MEAS-05 is a
  *confirmation* report, not a dep move. Don't "defer" a phantom (Pitfall 7).
- Keep `lit` in size-limit `ignore` (peer dep) but **stop ignoring `@floating-ui/dom`**
  in the delivered-payload metric so the Phase-8 win is visible (Pitfall 2).
- The overlay perf scenario must capture the **pre-deferral** baseline now (floating-ui
  still statically imported) so Phase 8's deferral shows a real before/after delta.
- Overlay-deferral concerns (prefetch, hidden-until-positioned, `0,0` flash) are
  Phase 8 — out of scope here beyond baselining the current behavior.

</specifics>

<deferred>
## Deferred Ideas

- Flipping any gate to **enforcing** → Phase 11 (GATE-01/02/03); wall-clock stays report-only.
- Throttled perf on WebKit/Firefox → not possible (CDP Chromium-only); those engines get
  correctness-only in Phase 10 (COMPAT-04).
- `manualChunks` shared-runtime dedupe tuning → deferred (`PERF-V2-01`), only if the
  chunk graph shows cross-entry duplication deep-import purity can't resolve.

None outside phase scope surfaced during discussion — the phase stayed on measurement.

</deferred>

---

*Phase: 7-measurement-baselines-budgets*
*Context gathered: 2026-08-22*
