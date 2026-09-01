# Phase 10: Graceful Degradation & Compatibility Matrix - Context

**Gathered:** 2026-08-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Below the Safari 16.4 floor, Amris elements **degrade instead of silently failing**.
Deliver, all behavior- and surface-preserving against the frozen v1.0 CEM **except
COMPAT-03** (Light-DOM fallback, ships **[CS]** with a Changeset):

- **COMPAT-01** — a memoized `src/internal/helpers/capabilities.ts` probing each
  sub-capability **independently**: ElementInternals form-association vs ARIA reflection,
  `adoptedStyleSheets`, `:has()` — with jsdom capability-off tests.
- **COMPAT-02** — form controls feature-detect ElementInternals so the constructor no
  longer throws below the floor; the element still upgrades, renders, and emits events.
- **COMPAT-03** — an **opt-in** hidden-input Light-DOM form-participation fallback
  (`src/internal/helpers/form-participation.ts`) restores form submission below the
  ElementInternals floor, XOR-gated on absent `setFormValue`. **[CS]**
- **COMPAT-04** — the tested-engine matrix is widened (WebKit + Firefox added to the
  load-bearing lane; CDP throttling stays Chromium-only).
- **COMPAT-05** — `BROWSER_SUPPORT.md` documents the true per-capability floor
  (= max(JS-API floor, CSS-feature floor)) and the degradation matrix.
- **COMPAT-06** — a CSS-feature audit (`:has()`, container queries, `adoptedStyleSheets`)
  identifies and **guards** silent visual failures on older engines.

**Not this phase:**
- Runtime-perf tuning (data-grid/combobox/overlay) → **Phase 9, done**.
- Bundle-size deferral → **Phase 8, done**.
- Flipping any size/count budget from report-only to enforcing → **Phase 11** (GATE-*).
  All budgets stay report-only this phase; nothing red-builds.
- Per-component cost cards / docs publication → **Phase 11** (DOCS-04).
- Hard ElementInternals polyfill → out of scope permanently (not polyfillable; degrade instead).

</domain>

<decisions>
## Implementation Decisions

### Hidden-Input Fallback — Opt-in Mechanism (COMPAT-03)
- **D-01:** **Global side-effect opt-in, applied below-floor only.** A consumer enables the
  fallback once at app init (not per-element, not auto-on). Rejected: per-element attribute
  (adds a boolean to the frozen 16-component prop surface) and auto-on-below-floor (ships
  Light-DOM inputs without consent, contradicts the requirement's explicit "opt-in"). When
  enabled, the fallback engages **only** below the ElementInternals floor; at/above the floor
  it is a no-op (ElementInternals wins — XOR, no double-submit). — **Reversibility:** one-way —
  COMPAT-03 is the one **[CS]** item; once the opt-in ships and consumers wire it into app
  init, removing or renaming it is a breaking change to a published contract.
- **D-02:** **Exact packaging deferred to research** — side-effect subpath import
  (`@willramanand/amris/compat-forms`, adds one `package.json` `exports` subpath, index export
  list stays byte-frozen, tree-shaken out when unused) **vs** a named runtime export
  (`enableFormFallback()` on the main entry). Research/planner picks against the current
  `exports` map and Changeset/semver discipline. Preference signal: keep the main `index.ts`
  export list unchanged if feasible (the subpath shape). — **Reversibility:** one-way once
  published (see D-01); the *choice between the two shapes* is free until then.

### Hidden-Input Fallback — Fidelity (COMPAT-03)
- **D-03:** **Value + native validation**, not value-only. The hidden `<input>` mirrors the
  control's value **and** projects native constraints (`required`, `pattern`, etc.) so the
  browser blocks submit on invalid data below the floor (where `setValidity` is also absent).
  Chosen over the smaller value-only fallback because the user prioritizes maximal reach.
  **Hard guard for the planner:** must prove no double-validation and no divergence from the
  above-floor ElementInternals validation path — the fallback and the native path are XOR
  (one channel or the other, never both). — **Reversibility:** costly — reducing fidelity
  after shipping is an observable behavior change for below-floor consumers.

### Below-Floor Developer Signal (COMPAT-02)
- **D-04:** **One-time, globally-deduped `console.warn`.** Below the ElementInternals floor
  **with the fallback OFF**, warn exactly once per page, naming the missing capability and
  pointing to the `/compat-forms` opt-in. If the consumer opted into the fallback → **silent**
  (the fallback handles submission, no warning needed). At/above the floor → silent. Rationale:
  the core value is "degrade instead of *silently* failing"; a form that won't submit with no
  signal is the silent-fail we are fixing. Rejected: fully silent (under-serves the value),
  per-tag warn (noisier, chosen against for one-time global). — **Reversibility:** reversible
  (internal dev-console behavior, no public surface).

### CSS-Feature Degradation (COMPAT-06)
- **D-05:** **`@supports` progressive-enhancement fallbacks — guard EVERY usage.** For every
  `:has()` and container-query rule the audit finds, author a functional default outside the
  `@supports` block and the modern styling inside it, so old engines get a plainer-but-usable
  layout via pure CSS (no JS timing, no FOUC). Guard **all** usages, including cosmetic ones —
  not just usability-breaking ones (user chose maximal coverage over the tighter
  functional-only scope). `adoptedStyleSheets` is already handled by Lit's internal
  `adoptedStyleSheets`→`<style>` fallback — the audit confirms this, no new guard needed there.
  Rejected: JS-probe + host class (FOUC risk, couples visuals to JS), document-only
  (under-delivers COMPAT-06's "guards"). — **Reversibility:** reversible (additive CSS).

### Widened Test Matrix (COMPAT-04)
- **D-06:** **Load-bearing + degradation subset cross-engine.** WebKit + Firefox instances run
  the 4 load-bearing browser specs (ElementInternals/form submit, focus trap, dialog/top-layer,
  floating-ui positioning) **plus** the new Phase-10 specs (capability probe, form degradation,
  hidden-input fallback, `@supports` guards). The **full** `test/browser/**` lane and all CDP
  throttling stay **Chromium-only**. Matches the requirement wording ("added to the load-bearing
  lane; throttling stays Chromium-only") and stays clear of the barred exhaustive
  every-component × every-engine matrix. Rejected: full lane × 3 (slower CI, WebKit/FF flake on
  specs that don't exercise degradation), degradation-subset-only (misses real WebKit/FF quirks
  in the load-bearing form/focus/dialog paths). — **Reversibility:** reversible (CI config/test-only).

### Cross-cutting signal for the planner
- The user consistently chose **maximal graceful-degradation reach** over the cheaper/tighter
  option (D-03 value+validation, D-05 guard-every-usage), explicitly accepting higher
  proof/authoring cost. Bias plans toward broad, well-proven degradation coverage; do not
  silently narrow scope to save effort — flag it if a maximal choice proves infeasible.

### Claude's Discretion
- **Exact fallback packaging** (D-02): subpath side-effect import vs named export — research
  decides against the `exports` map + Changeset discipline.
- **`capabilities.ts` probe API shape** (COMPAT-01): module-level memoized functions vs a
  frozen probed-object; memoization shape (compute-once). Not discussed — implementation detail
  for the planner, following the Phase-9 "memoize-by-identity / probe-once" idiom.
- **Feature-detect implementation for COMPAT-02**: per-component `try/catch` around
  `attachInternals()` in each of the 16 constructors **vs** a shared guarded helper the
  constructors call. Planner picks; a shared helper on `src/internal/` matches the established
  chokepoint pattern and keeps the 16 edits uniform.
- **Which single overlay/component** represents each degradation scenario in the cross-engine
  specs — reuse existing browser-lane fixtures where possible.
- **The true empirical per-capability floor** (COMPAT-05, `BROWSER_SUPPORT.md`): resolved by the
  research agent on the widened matrix (flagged `--research-phase`), not pre-decided here.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (locked)
- `.planning/REQUIREMENTS.md` — COMPAT-01…COMPAT-06 (the six requirements this phase closes) +
  the **surface-freeze rule**: every change behavior- and surface-preserving against the frozen
  v1.0 CEM **except COMPAT-03** ([CS], Light-DOM, CEM props/events/slots/parts/tokens unchanged).
  Also the Out-of-Scope table (no hard polyfill, no SSR, no full every-engine matrix, no token renames).
- `.planning/ROADMAP.md` §"Phase 10: Graceful Degradation & Compatibility Matrix" — goal + the 5
  success criteria (the acceptance bar).

### Research (implementation-grounding — read before designing)
- `.planning/research/PITFALLS.md` — feature-detection / degradation pitfalls and
  behavior-preservation guardrails.
- `.planning/research/ARCHITECTURE.md` — the `src/internal/` chokepoint boundary the new
  `capabilities.ts` / `form-participation.ts` helpers ride (off the frozen CEM surface).
- `.planning/research/STACK.md`, `.planning/research/FEATURES.md`, `.planning/research/SUMMARY.md`
  — supporting context.
- **Note:** this phase is flagged for `--research-phase` (empirical per-capability floor on the
  widened WebKit/FF matrix + fallback packaging vs the `exports` map). Prefer
  `/gsd-plan-phase --research-phase 10`.

### Prior-phase context (patterns to reuse)
- `.planning/phases/09-runtime-performance-tuning/09-CONTEXT.md` — the `src/internal/`
  chokepoint idiom, "browser lane is the true regression gate," report-only-this-phase discipline.
- `.planning/phases/08-bundle-size-deferral/08-CONTEXT.md` — deferral/lazy-load patterns; the
  `lazy-load.ts` memoization idiom that `capabilities.ts` (probe-once) mirrors.

### Existing code to modify / feature-detect (in-repo)
- **16 form-associated components** call `this.attachInternals()` **raw in the constructor**
  (no guard → throws below Safari 16.4). Confirmed pattern in `src/components/input/input.ts:84-90`
  (`static formAssociated = true; this.internals = this.attachInternals()`). Same shape in:
  `combobox`, `select`, `color-picker`, `rich-select`, `switch`, `slider`, `radio`, `checkbox`,
  `time-picker`, `date-picker`, `textarea`, `number-field`, `input-otp`, `button`, `shortcuts`
  (`src/components/*/*.ts`). COMPAT-02 must guard every one (per-constructor try/catch or shared helper).
- **New files (create, on the non-exported boundary):**
  - `src/internal/helpers/capabilities.ts` — memoized independent capability probes (COMPAT-01).
  - `src/internal/helpers/form-participation.ts` — hidden-input Light-DOM fallback (COMPAT-03).

### Measurement / test infrastructure (Phase 7, report-only)
- `test/browser/**` — the real-browser load-bearing lane (`npm run test:browser`):
  `floating-position.test.ts`, `data-grid-virtual.test.ts`, `combobox-virtual.test.ts`,
  `overlay-focus.test.ts`, `a11y.browser.test.ts`. The 4 load-bearing specs + new Phase-10
  degradation specs run cross-engine on WebKit+FF (D-06); jsdom capability-off tests (COMPAT-01)
  are the unit-lane complement.
- CDP throttling / `test/perf/**` — **Chromium-only**, unchanged this phase.

### Docs to author / update
- `BROWSER_SUPPORT.md` (repo root) — COMPAT-05 target: true per-capability floor + degradation matrix.
- `package.json` `exports` — only if D-02 lands the subpath shape (Changeset-documented).

### Codebase maps
- `.planning/codebase/CONCERNS.md` — §Browser floor: ElementInternals-gated form submission below Safari 16.4.
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md` — the `src/internal/`
  boundary + test-lane shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/internal/` chokepoint boundary** — new `capabilities.ts` / `form-participation.ts` live
  here, off the frozen CEM public surface (same discipline as Phase 8/9 controllers/helpers).
- **`test/browser/**` lane + Vitest Browser Mode + Playwright** already exists — COMPAT-04 widens
  it to WebKit+FF instances rather than standing up new infra.
- **Lit's internal `adoptedStyleSheets`→`<style>` fallback** — already covers the
  `adoptedStyleSheets` leg of the COMPAT-06 audit; no new guard needed there.
- **`lazy-load.ts` memoize-once idiom (Phase 8)** — the shape `capabilities.ts` probe-once mirrors.

### Established Patterns
- **Memoize/probe-once inside `src/internal/`** — capability probes compute once and are reused.
- **Browser lane is the true regression gate** for real-DOM/positioning/a11y (Phase 8/9 lesson;
  jsdom mocks ElementInternals/ResizeObserver/positioning and cannot prove degradation).
- **Report-only this phase** — no budget flips to enforcing (that's Phase 11); nothing red-builds.
- **Behavior- and surface-preserving** — everything except COMPAT-03, which is Light-DOM + [CS].

### Integration Points
- COMPAT-02 touches all 16 form-component constructors (or a shared helper they call).
- COMPAT-03 fallback attaches Light-DOM hidden inputs, XOR-gated on absent `setFormValue`.
- COMPAT-06 `@supports` guards land in component `static styles` CSS blocks.
- New jsdom capability-off specs (COMPAT-01) + cross-engine browser specs (COMPAT-04).

</code_context>

<specifics>
## Specific Ideas

- Opt-in ergonomics the user liked: `import '@willramanand/amris/compat-forms'` at app init
  (one line, below-floor-only, no per-element markup) — captured as the preferred shape, exact
  packaging deferred to research (D-02).
- Warning copy intent (D-04): name the missing capability + point to the `/compat-forms` opt-in,
  once per page, fallback-OFF only.
- `@supports` shape (D-05): functional default outside the block, modern enhancement inside —
  e.g. `.panel { display:block } @supports selector(:has(*)) { .panel:has(.foo){…} }`.
- User leans maximal-reach: chose value+native-validation and guard-every-CSS-usage over the
  cheaper options, knowingly accepting higher proof/authoring cost.

</specifics>

<deferred>
## Deferred Ideas

- **`capabilities.ts` probe API shape, `BROWSER_SUPPORT.md` floor-claim ambition, and the
  COMPAT-03 Changeset semver-bump level** — offered as additional gray areas, user chose not to
  discuss; probe shape + bump level are planner/Changeset mechanics, floor ambition is resolved
  empirically by research on the widened matrix.
- **Full RTL audit across floating-ui overlays (`RTL-V2-01`)** — deferred to v2 (out of v1.1 scope).
- **`@microsoft/api-extractor` `.d.ts` surface guard (`TEST-V2-02`)** — deferred to v2.
- **Flipping size/count budgets to enforcing + per-component cost cards** → **Phase 11**
  (GATE-01/02/03, DOCS-04); wall-clock stays report-only.

None outside phase scope surfaced during discussion — the discussion stayed on graceful
degradation and the compatibility matrix.

</deferred>

---

*Phase: 10-graceful-degradation-compatibility-matrix*
*Context gathered: 2026-08-25*
