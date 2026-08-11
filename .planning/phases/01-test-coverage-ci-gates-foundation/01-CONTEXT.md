# Phase 1: Test Coverage + CI Gates Foundation - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the test safety net and CI quality gates that guard every downstream breaking change. Concretely: close the 20-component test gap (1:1 test-per-component), carve out a minimal real-browser lane (Vitest 4 Browser Mode + Playwright/Chromium) for the 4 jsdom-unprovable areas, and wire coverage, bundle-size, and real-browser-a11y gates into CI.

**In scope (requirements):** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, PERF-01.

**Not this phase:** API normalization/CEM baseline (Phase 2), leak fixes (Phase 3), virtualization/validation/shortcut features (Phase 4) — this phase only builds the net that makes those safe. Do not fix bugs or change component APIs here beyond what a test legitimately requires; capture such findings for the owning phase.

</domain>

<decisions>
## Implementation Decisions

### Coverage gate policy (TEST-07)
- **D-01:** Ratchet-from-baseline strategy — measure current coverage, set the gate at that floor immediately (blocks any regression from PR one), then raise it as the 20 components land, converging on a committed end-of-phase floor. Rationale: the phase *starts* with 20 untested components; a high fixed target would red-CI on day one before the work exists. Mirrors the bundle-budget ratchet (D-07). — **Reversibility:** reversible (threshold numbers in `vitest.config.ts`).
- **D-02:** Gate on **branch coverage** (not lines-only) with **per-directory tiers** — stricter thresholds on form/overlay directories, looser on simple display. Rationale: prevents trivial display components from diluting the average and hiding gaps in the complex interactive paths (Pitfall 4 — gamed coverage). — **Reversibility:** reversible.
- **D-03 (Claude's discretion):** Exact end-of-phase threshold numbers per tier are Claude's to set during planning, from the measured baseline and per-component risk. Research starting point: branch ≥80, lines/functions/statements ≥85 (STACK.md config sketch) — treat as a ceiling to ratchet toward, not a day-one gate.

### Test depth for the 20 untested components (TEST-01)
- **D-04:** Tiered depth by component type. Simple/stateless display (e.g. icon, divider, spinner, badge, skeleton): render + attribute/ARIA-reflection smoke tests. Interactive/stateful components: full behavioral tests (events, keyboard, disabled/readonly, state transitions). Rationale: matches effort to risk and keeps the branch+per-dir gate honest without busywork on trivial components. User explicitly chose tiered over a mandatory required-scenarios checklist — do not impose a heavyweight per-component scenario contract. — **Reversibility:** reversible.

### CI gate rollout (TEST-06, TEST-07, TEST-08, PERF-01)
- **D-05:** Enforce each gate as it lands (hard-block), not report-only-then-flip. Rationale: every Phase 1 baseline (coverage floor, size budget, a11y, browser lane) is set from current state, so nothing is retroactively red — the safety net is real from the first merge, which is the entire reason this phase runs first. — **Reversibility:** reversible.
- **D-06:** Real-browser lane (+ real-browser a11y) runs on **every PR** in CI via headless Chromium. Local default `npm test` stays **jsdom-only** (no Playwright required to contribute); the browser lane runs on demand via a separate script (e.g. `npm run test:browser`). Rationale: catches form/focus/dialog/positioning regressions before merge for a form-heavy freeze, without forcing every contributor to `playwright install` or eat browser-boot cost on each local run. — **Reversibility:** reversible (CI workflow + package scripts).

### Bundle-size budgets (PERF-01)
- **D-07:** Set per-entry `size-limit` budgets by measuring each entry's current minified+gzipped size and adding ~5–10% headroom; ratchet down opportunistically later. Rationale: blocks regressions immediately without demanding an immediate diet; consistent with the coverage ratchet (D-01). — **Reversibility:** reversible.
- **D-08:** Budget the **core** bundle, the **full** bundle, and a few **representative single-component deep imports** (e.g. button + a heavy one like data-grid) — plus a **tree-shaking assertion** (import one component, assert output stays tiny) to catch a barrel import silently pulling in all ~67 components (Pitfall 10). Not every per-component entry gets its own budget. — **Reversibility:** reversible.
- **D-09 (Claude's discretion):** Exact per-entry kB numbers and which representative components to budget are Claude's to set during planning from the real build output.

### Pre-decided upstream (locked — do NOT re-litigate)
These were settled in research (`.planning/research/STACK.md`) and PROJECT.md Key Decisions before this discussion. Treated as constraints, not open questions:
- **Vitest 4 Browser Mode + Playwright provider (`@vitest/browser-playwright`)** for the real-browser lane — NOT `@web/test-runner`. Hybrid: keep all existing jsdom tests as a `jsdom` project; add a `browser` (Chromium) project via Vitest `projects`. Provider minor version MUST track `vitest`. — **Reversibility:** costly — reverses a runner/config choice already justified by 46 existing test files + helper reuse.
- **`size-limit` + `@size-limit/preset-small-lib`** for bundle budgets (not `bundlesize`).
- **`@axe-core/playwright`** runs the a11y suite in the real browser so `color-contrast`/`region` (currently disabled under jsdom) actually execute.
- **`@vitest/coverage-v8`** (already installed) for the coverage gate — enable thresholds, no new dep. If browser-project V8 instrumentation misbehaves, fall back to `@vitest/coverage-istanbul` for that project only (MEDIUM-confidence item flagged for planning research).
- **The 4 jsdom-unprovable browser-lane areas** are fixed: (1) real `ElementInternals` form submission/validation participation, (2) overlay focus trap + restoration, (3) native `<dialog>`/top-layer, (4) floating-ui positioning. WebKit/Safari lane is deferred to v2 (TEST-V2-01) — Chromium only for v1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — TEST-01→08 + PERF-01 acceptance wording; v2 deferrals (TEST-V2-01 WebKit lane, TEST-V2-02 api-extractor)
- `.planning/ROADMAP.md` §"Phase 1" — goal + 5 success criteria this phase must make TRUE
- `.planning/PROJECT.md` — Key Decisions table (browser-lane carve-out, `src/internal/` boundary), Constraints (Lit peer-dep, Safari 16.4 floor, ESM-only, no global CSS)

### Stack & tooling (the five gates)
- `.planning/research/STACK.md` — **primary tooling spec.** Exact package versions, install commands, the coverage/browser-project/size-limit/a11y config sketch, version-compat matrix, and "what NOT to add"
- `.planning/research/PITFALLS.md` — Pitfall 3 (jsdom blind spots → jsdom-vs-browser boundary), Pitfall 4 (gamed coverage → branch+per-dir), Pitfall 10 (bundle-size regression / tree-shaking assertion). "Looks Done But Isn't" checklist
- `.planning/research/SUMMARY.md` — research synthesis / cross-references

### Existing test infrastructure (reuse, don't rebuild)
- `.planning/codebase/TESTING.md` — current Vitest/jsdom harness, helper API, mock inventory, a11y-helper
- `.planning/codebase/CONCERNS.md` — the focus/form/listener/async gaps the new tests must actually assert
- `.planning/codebase/STACK.md` — installed runtime stack (not re-researched in research/STACK.md)
- `BROWSER_SUPPORT.md` (repo root) — Safari 16.4 ElementInternals floor to document/respect

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/helpers.ts`: `fixture<T>()`, `mount()`, `waitForUpdate()`, `shadowQuery<T>()`, `oneEvent<TDetail>()`, `click()`, `keydown()`, `inputText()`, `changeValue()` — the new jsdom tests for the 20 components reuse these directly; the browser project should reuse the same API surface where the environment allows (goal: minimal helper divergence between projects).
- `test/setup.ts`: jsdom mocks for `ElementInternals` (symbol-keyed `MockElementInternals`, `getMockInternals()`), `matchMedia`, `ResizeObserver`, `HTMLDialogElement.showModal/close`, `DataTransfer`. **These mocks must be scoped to the `jsdom` project only** — the `browser` project deletes/omits them because Chromium implements them natively (that's the whole point of the lane).
- `test/a11y-helper.ts` + `test/a11y.test.ts`: `checkA11y()` currently disables `color-contrast` and `region` "because jsdom has no computed styles." Moving the a11y suite to the browser project (`@axe-core/playwright`) is what re-enables those rules.

### Established Patterns
- Test files mirror source: `test/components/{component}.test.ts` ↔ `src/components/{component}/`. New tests follow the same 1:1 layout (TEST-01).
- Test style: import component → `fixture()` HTML string → `shadowQuery()` into shadow DOM → `await waitForUpdate()` after state changes → assert ARIA/classes/form value. Interactive tests use `oneEvent()` promises + `click()`/`keydown()`.
- Form controls assert against `getMockInternals(el).formValue` in jsdom; the browser lane asserts against **real** `ElementInternals` + real `<form>` submission (TEST-02) — do not carry the mock assertion into the browser project.

### Integration Points
- `vitest.config.ts` — gains a `projects` array (`jsdom` + `browser`) and `coverage.thresholds`. Current single-environment config is the starting point.
- `package.json` — new scripts (`test:browser`, coverage flags), `size-limit` config (`.size-limit.json` or `package.json` field), new devDeps per research/STACK.md. Existing scripts: `test`, `test:run`, `test:coverage`, `test:a11y`.
- `.github/workflows/ci.yml` (Node 20) — gains the browser-lane job (with `playwright install chromium`), coverage-threshold gate, size-limit gate, a11y job. Each gate hard-blocks (D-05).
- Build produces `dist/custom-elements.json`, `dist/amris-core.js`, `dist/amris.js`, `dist/components/*/index.js`, `dist/styles/tokens.css` — the size-limit entries (D-08) point at these.

</code_context>

<specifics>
## Specific Ideas

- Local-vs-CI split is deliberate: contributor ergonomics (jsdom-only default) must not regress even as the browser lane becomes a hard PR gate. Keep the browser lane a single opt-in script locally.
- "Enforce as it lands" means each gate's PR that wires it also flips it on — no separate later "turn on the gates" commit. Baselines are captured in the same change so the gate is green-on-arrival for existing code and only fails on regression.
- Coverage and bundle budgets share one philosophy: measure-current, block-regressions-now, ratchet-later. Apply the same shape to both so the CI story is consistent.

</specifics>

<deferred>
## Deferred Ideas

- **Mutation testing (Stryker) spot-check** on the highest-risk modules (combobox, dialog, form base) — raised in research (PITFALLS.md Pitfall 4) as a way to prove assertions actually catch regressions. Not a Phase 1 requirement; consider as a follow-up hardening item if the branch+per-dir gate proves insufficient. Not in scope now.
- **WebKit/Safari 16.4 real-browser lane** (TEST-V2-01) — explicitly v2. Chromium-only for v1.
- **`@microsoft/api-extractor` `.d.ts` surface guard** (TEST-V2-02) — optional, deferred unless TS types become a first-class contract; the CEM diff (Phase 2/6) is the primary surface guard.

</deferred>

---

*Phase: 1-test-coverage-ci-gates-foundation*
*Context gathered: 2026-08-10*
