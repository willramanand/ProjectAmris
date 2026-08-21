# Requirements: Amris v1.1 — Performance & Compatibility Hardening

**Defined:** 2026-08-21
**Core Value:** Amris loads and runs well on low-end enterprise devices and slow networks, and reaches as far down the browser stack as cheaply possible — without changing the frozen v1.0 public surface, and with CI perf/size gates that keep it that way.

## v1.1 Requirements

Requirements for the v1.1 hardening milestone. Each maps to a roadmap phase. Grounded in `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY).

**Surface-freeze rule:** every requirement is behavior- and surface-preserving against the frozen v1.0 CEM unless explicitly marked **[CS]** (needs a Changeset). The one **[CS]** item in scope is COMPAT-03 (hidden-input fallback) — additive/opt-in Light-DOM behavior below the floor; the CEM public surface (props/events/slots/parts/tokens) is unchanged.

### Measurement, Baselines & Budgets

- [ ] **MEAS-01**: A reproducible per-entry **brotli** (on-the-wire) bundle-size baseline is captured and committed via a `size-baseline.mjs` script.
- [ ] **MEAS-02**: A reproducible throttled runtime-perf harness (`perf-harness.mjs`) runs on the existing Vitest Browser Mode + Playwright/Chromium lane, using CDP CPU + network throttling, and emits both **count** metrics (render/update/`computePosition` calls, node counts) and wall-clock timings to a committed JSON baseline.
- [ ] **MEAS-03**: A named low-end target profile (CPU-throttle multiplier + network tier) is chosen from the measured baseline data and pinned in harness config.
- [ ] **MEAS-04**: `.size-limit.json` is re-scoped so the delivered-payload metric **counts** `@floating-ui/dom` (the deferral win becomes visible), plus a dedicated no-bundled-Lit assertion that runs independent of size-limit.
- [ ] **MEAS-05**: A bundle-attribution report (`rollup-plugin-visualizer` + `@size-limit/esbuild-why`, dev-only) is available and confirms `highlight.js` is absent from every shipped chunk.

### Bundle-Size Reduction

- [ ] **SIZE-01**: `@floating-ui/dom` loads via a memoized dynamic `import()` gated on first overlay open (in `src/internal/controllers/floating-position.ts`); all 6 overlays stay behavior-preserving and positioning code is absent from non-overlay entries.
- [ ] **SIZE-02**: `@lit-labs/virtualizer` loads via a memoized dynamic `import()` at/above the row threshold (in `src/internal/helpers/virtualize-support.ts`); data-grid and combobox/select popups stay behavior-preserving.
- [ ] **SIZE-03**: The tree-shaking canary asserts an imported component still calls `customElements.define` at runtime (registration is never shaken away) and that Lit is never bundled.
- [ ] **SIZE-04**: Shared-chunk dedupe and per-component deep-import purity are verified — no cross-entry duplication regressions from the deferral work.
- [ ] **SIZE-05**: Non-critical component init is deferred off the first-load critical path (idle/deferred init) for faster slow-network first paint, behavior-preserving. *(differentiator)*

### Runtime Performance

- [ ] **RPERF-01**: Data-grid re-render-on-sort is narrowed behavior-preservingly and re-measured against the post-deferral baseline (count + wall-clock improvement).
- [ ] **RPERF-02**: Combobox filter-per-keystroke work is reduced behavior-preservingly and re-measured.
- [ ] **RPERF-03**: Overlay reposition churn is reduced behavior-preservingly and re-measured.
- [ ] **RPERF-04**: Accessible-name/role snapshots guard each tuned component so runtime-perf work provably does not strip a11y DOM (`aria-*`, roles, focusability).

### Compatibility & Graceful Degradation

- [ ] **COMPAT-01**: A memoized `src/internal/helpers/capabilities.ts` module probes each sub-capability **independently** — ElementInternals form-association vs ARIA reflection, `adoptedStyleSheets`, `:has()` — with jsdom capability-off tests.
- [ ] **COMPAT-02**: Form controls feature-detect ElementInternals so the constructor no longer throws below Safari 16.4 — the element still upgrades, renders, and emits events (Tier-1 guard, surface-preserving).
- [ ] **COMPAT-03**: A hidden-input Light-DOM form-participation fallback (via `src/internal/helpers/form-participation.ts`) restores form submission below the ElementInternals floor, gated strictly on absent `setFormValue` (one channel XOR the other — no double-submit). **[CS]** — ships with a Changeset. *(conditional — selected)*
- [ ] **COMPAT-04**: The tested-engine matrix is widened — WebKit + Firefox instances added to the load-bearing Vitest Browser Mode lane (correctness/feature-detection; CDP throttling stays Chromium-only).
- [ ] **COMPAT-05**: The true per-capability browser floor and degradation matrix are documented (`BROWSER_SUPPORT.md`), where floor = max(JS-API floor, CSS-feature floor).
- [ ] **COMPAT-06**: A CSS-feature audit (`:has()`, container queries, `adoptedStyleSheets`) identifies and guards silent visual failures on older engines.

### CI Gate Enforcement

- [ ] **GATE-01**: Per-entry brotli size budgets flip from report-only to enforcing (size gates flip first — deterministic and stable).
- [ ] **GATE-02**: Runtime **count**-metric budgets (render/update/`computePosition` calls) flip to enforcing with thresholds set outside the measured noise floor; wall-clock timing stays report-only.
- [ ] **GATE-03**: The gate flip is staged off the release critical path during soak, so flaky timing never red-builds a publish.

### Documentation

- [ ] **DOCS-04**: Per-component cost cards (measured brotli size + runtime cost per component) are published in docs so enterprise consumers can budget. *(differentiator — selected)*

## Future Requirements

Deferred to a future release. Tracked but not in the current roadmap. (Carried forward from v1.0; `TEST-V2-01` WebKit lane graduated into COMPAT-04.)

### Testing

- **TEST-V2-02**: `@microsoft/api-extractor` `.d.ts` surface guard (if TypeScript types become a first-class contract)

### Accessibility & Internationalization

- **RTL-V2-01**: Full RTL audit and fixes across floating-ui overlays (logical properties + `:dir()`) — partial today

### Features

- **FEAT-V2-01**: Shortcut-config persistence (consumer-owned storage)
- **FEAT-V2-02**: Editable/sortable virtualized data-grid features (full spreadsheet grid)

### Performance

- **PERF-V2-01**: `manualChunks` tuning for shared-runtime dedupe if the Phase-1 chunk graph shows cross-entry duplication that deep-import purity alone cannot resolve

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New components / new public API surface | v1.0 CEM is frozen; v1.1 is behavior- and surface-preserving (COMPAT-03 is Light-DOM, not CEM surface) |
| Hard ElementInternals polyfill | Not polyfillable; degrade gracefully via feature detection instead |
| SSR / declarative shadow DOM | Client-only ESM retained for v1.1; larger lift, deferred |
| Consumer-facing lazy-load as public API | Deferral is an internal optimization; no new public entry points |
| Restructuring `--am-*` token names | Frozen token surface; renames break consumers and the freeze |
| Bundling Lit | Peer dependency — must stay external |
| Full every-component × every-engine test matrix | Widen the load-bearing lane cheaply; exhaustive matrix over-tools v1.1 |
| Chasing IE11 / pre-ES2023 engines | Below the achievable feature-detection floor; document the true limit instead |
| Deferring `highlight.js` | Storybook-only devDep; already absent from every shipped chunk (confirmed by all research tracks) |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEAS-01 | — | Pending |
| MEAS-02 | — | Pending |
| MEAS-03 | — | Pending |
| MEAS-04 | — | Pending |
| MEAS-05 | — | Pending |
| SIZE-01 | — | Pending |
| SIZE-02 | — | Pending |
| SIZE-03 | — | Pending |
| SIZE-04 | — | Pending |
| SIZE-05 | — | Pending |
| RPERF-01 | — | Pending |
| RPERF-02 | — | Pending |
| RPERF-03 | — | Pending |
| RPERF-04 | — | Pending |
| COMPAT-01 | — | Pending |
| COMPAT-02 | — | Pending |
| COMPAT-03 | — | Pending |
| COMPAT-04 | — | Pending |
| COMPAT-05 | — | Pending |
| COMPAT-06 | — | Pending |
| GATE-01 | — | Pending |
| GATE-02 | — | Pending |
| GATE-03 | — | Pending |
| DOCS-04 | — | Pending |

**Coverage:**

- v1.1 requirements: 24 total (5 MEAS + 5 SIZE + 4 RPERF + 6 COMPAT + 3 GATE + 1 DOCS)
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 24 ⚠️ (populated at roadmap creation)

---
*Requirements defined: 2026-08-21*
*Last updated: 2026-08-21 after initial definition*
