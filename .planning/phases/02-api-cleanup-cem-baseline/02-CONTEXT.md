# Phase 2: API Cleanup + CEM Baseline - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Normalize the public API surface dimension-by-dimension and capture it in a committed, reviewable CEM baseline, so the v1.0 freeze can snapshot a consistent, diffable contract. Concretely: (1) run a cross-component consistency audit producing dimension matrices per event / prop / boolean-naming / default / slot / part / `--am-*` token across all 66 components; (2) apply breaking renames to the outliers the matrices find, each landed with a Changeset; (3) refactor the four 600+ line components (combobox 741, select 718, date-picker 633, time-picker 627) into maintainable units with the Phase 1 characterization tests still green; (4) enumerate and freeze the slot/part/token surface; (5) commit `api/custom-elements.baseline.json` and run a report-only surface diff in CI.

**In scope (requirements):** API-01, API-02, API-03, API-04, API-05.

**Not this phase:**
- Leak/lifecycle fixes — FIX-01→04 (toast timer, listener gating, focus `isConnected` guards, dialog animation cleanup) are **Phase 3**. The refactor extracts machinery behavior-preservingly; it does NOT fix the known leaks even when the extracted controller is the natural home for the fix. Capture the seam, leave the fix for Phase 3.
- Virtualization / validation-message / shortcut-registry features and the `autoUpdate`-gating fix — **Phase 4**. Do not gate `autoUpdate` while extracting the floating-ui controller here.
- New components or new registered custom elements — feature freeze at 67. Extracted machinery is non-registered and non-exported.
- Consumer-facing MIGRATION.md prose — **Phase 5** (Changesets carry the breaking-change record this phase).
- Flipping the surface-diff gate to enforcing — **Phase 6** (SHIP-01). It stays report-only here.

</domain>

<decisions>
## Implementation Decisions

### Canonical naming rules (API-01, API-02)
- **D-01:** Overlay lifecycle events standardize on **`open` / `close`**. Rename `dropdown`, `popover`, `context-menu` from `am-show`/`am-hide` → `am-open`/`am-close` to match native `<dialog>` (`.show()`/`.close()`, `open` attribute) and the existing majority (dialog, drawer, command-palette, toast). — **Reversibility:** one-way — the emitted event name is a published contract consumers bind listeners to; reverting after 1.0 needs a migration.
- **D-02:** Selection events split by semantics, not one blanket name. **Value-changing controls** (`select`, `data-grid` selection) emit **`am-change`** like native `<select>`; **discrete pick actions** (`menu`, `list`, `tree-view`, `command-palette`) emit **`am-select`**. Concrete renames the audit will confirm: `am-select-option` (select) → `am-change`; `data-grid` `am-row-select`/`am-selection-change` reconciled to the `am-change` value-change convention (exact shape set in audit). — **Reversibility:** one-way — event-name contract.
- **D-03:** **Full normalization.** Fix every outlier the dimension matrices surface across events, props, boolean-naming, and defaults — not just the egregious cases. Rationale: pre-freeze is the only window; post-1.0 every inconsistency is locked forever. — **Reversibility:** reversible (decision-level policy; individual renames are the one-way items).

### Migration & Changeset strategy (API-02)
- **D-04:** **Hard rename, no backward-compat aliases.** Old prop/event names are removed outright — no dual-firing, no console-warn deprecation window. Rationale: pre-1.0 allows breaks; aliases add surface + code the freeze must carry and pollute the CEM baseline. Changesets document every break. — **Reversibility:** one-way — removes the old public name.
- **D-05:** **One Changeset per dimension wave**, not per individual rename and not per component. E.g. a single Changeset for "normalize overlay lifecycle events", another for "normalize selection events". Maps to the audit matrices, keeps the changelog reviewable, avoids 30+ one-line changeset files. Interprets API-02's "each rename with a Changeset" as per-normalization-wave. — **Reversibility:** reversible.
- **D-06:** No MIGRATION.md this phase — rely on the aggregated changelog Changesets generate. A polished old→new migration guide is Phase 5 (Documentation). — **Reversibility:** reversible.

### Big-4 refactor approach (API-03)
- **D-07:** Decompose via **Lit Reactive Controllers** (`implements ReactiveController`, `hostConnected`/`hostDisconnected`). Controllers own lifecycle and are testable in isolation; they never register a custom element, so the public surface is untouched and Phase 1 host tests exercise the components unchanged. Plain helper modules only for genuinely pure logic. — **Reversibility:** costly — moving logic across the controller boundary touches many call sites, but no public contract changes.
- **D-08:** **Targeted shared-machinery extraction**, not full split-to-a-line-budget. Extract the heavy shared concerns — floating-ui positioning, listbox keyboard navigation, option filtering — into controllers reused across the four (and reusable by other overlays). Leave component-specific logic inline. Highest maintainability payoff, lowest over-abstraction / churn risk against the green tests. — **Reversibility:** reversible.
- **D-09:** Extracted machinery lives in the **non-exported `src/internal/` boundary** (per PROJECT.md Key Decision). Keeps it off the frozen CEM/public surface and out of package `exports`; Phase 3 (leak fixes) and Phase 4 (autoUpdate gating, features) build on the same seam. Component-only helpers may co-locate. — **Reversibility:** costly — establishes a boundary later phases depend on.
- **D-10 (constraint):** The refactor is **behavior-preserving**. It relocates code without altering runtime behavior; the Phase 1 characterization suite (jsdom + Chromium) must stay green throughout and is the acceptance signal. Any leak/bug the refactor exposes is captured for Phase 3, not fixed here.

### Frozen-surface scope & audit/baseline mechanism (API-04, API-05)
- **D-11:** Frozen public surface = **all documented `--am-*` tokens** (global semantic tokens **and** every per-component `--am-{component}-*` `@cssprop`), plus every `@csspart` and `@slot` that appears in the CEM. Maximum consumer trust; accepts that internal token churn is constrained at freeze. — **Reversibility:** one-way — freezing a token/part/slot makes it a published contract.
- **D-12:** API-01 dimension matrices are committed as **`api/AUDIT.md`** (human-reviewable markdown, under `api/` next to the baseline, unpublished / not in package `files`). A durable repo reference the freeze and Phase 5 docs point back to. — **Reversibility:** reversible.
- **D-13:** Surface-diff mechanism for the **report-only** CEM gate this phase is a **small custom JSON comparator** script (diff `dist/custom-elements.json` vs `api/custom-elements.baseline.json`). Zero new deps, full control; report-only diffing is trivial. Evaluating `@wc-toolkit/changelog` (SHIP-01) is deferred to the Phase 6 enforcing flip. — **Reversibility:** reversible — swappable at Phase 6.
- **D-14:** CEM baseline is captured at **phase start and re-committed after each approved normalization wave**. The CI diff then flags only UNINTENDED surface drift beyond a wave's intended renames (intentional renames are absorbed into the re-committed baseline). — **Reversibility:** reversible.

### Claude's Discretion
- Exact per-component rename mapping the audit produces (D-01/D-02 set the vocabulary; the matrices enumerate every individual outlier and its target name).
- The precise `data-grid` selection event shape reconciled under `am-change` (single vs multi-select payload) — decide from the component's current API during the audit.
- Prop / boolean-naming / default-value outliers not yet enumerated — surfaced by the matrices, normalized under the D-03 full-normalization policy.
- Controller decomposition granularity per component and how many shared controllers to carve (D-08 sets "targeted shared machinery"; the exact controller set follows the real code shape).
- Whether any pure-logic extraction is a plain helper module vs a controller (D-07).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — API-01→05 acceptance wording; v2 deferrals (TEST-V2-02 api-extractor as an alternate surface guard); Out-of-Scope table (no new components, no framework wrappers)
- `.planning/ROADMAP.md` §"Phase 2: API Cleanup + CEM Baseline" — goal + 5 success criteria this phase must make TRUE; also §"Phase 3"/"Phase 6" for the FIX / enforcing-flip boundaries deferred out of this phase
- `.planning/PROJECT.md` — Key Decisions (allow breaking changes pre-freeze; adopt non-exported `src/internal/` boundary); Constraints (Lit peer-dep, ESM-only, no global CSS, `--am-*` tokens only, Safari 16.4 floor)

### Codebase maps (reuse, don't re-derive)
- `.planning/codebase/CONVENTIONS.md` — current naming patterns (event `am-*` prefix, `ButtonVariant`/`InputSize` type conventions, boolean prop names, JSDoc `@slot`/`@csspart`/`@cssprop`/`@fires` tags) — the audit measures against these
- `.planning/codebase/CONCERNS.md` — the four 600+ line files with exact line counts (combobox 741, select 718, date-picker 633, time-picker 627); the leak seams (toast timer, floating-ui autoUpdate, global-listener lifecycle, focus restoration) that are **Phase 3/4, not this phase**
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md` — component layout, barrel exports (`src/index.ts` / `src/index.all.ts`), where `src/internal/` fits
- `.planning/codebase/INTEGRATIONS.md` — floating-ui usage across combobox/dropdown/popover/tooltip/date-picker/context-menu (the shared machinery to extract)

### CEM / baseline tooling
- `custom-elements-manifest.config.js` (repo root) — current `cem analyze` config (`globs: src/**/*.ts`, `outdir: dist`, `litelement: true`) → produces `dist/custom-elements.json`
- `package.json` — `build:manifest` script (`cem analyze`), `exports` map (to keep `src/internal/` out of), `files`/`sideEffects`, Changesets config; `@custom-elements-manifest/analyzer` ^0.11.0 installed
- `.github/workflows/ci.yml` — the gated pipeline the report-only surface-diff job is added to (Node 20; Phase 1 added verify/browser/size jobs)

### No new external specs
- No new ADRs/specs referenced during discussion — decisions above are self-contained. `@wc-toolkit/changelog` (SHIP-01) is named for Phase 6, not adopted here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cem analyze` is already wired (`npm run build:manifest`) and emits `dist/custom-elements.json` — the baseline (`api/custom-elements.baseline.json`) is a committed snapshot of this output; the report-only diff (D-13) compares fresh build output against it. No new CEM tooling needed this phase.
- Phase 1 characterization suite (66 × 1:1 `test/components/*.test.ts`, jsdom + Chromium browser project) is the green-through-refactor acceptance signal for D-10. `test/helpers.ts` fixtures exercise components through their public API, so behavior-preserving controller extraction should not touch them.
- Floating-ui setup is duplicated across combobox/dropdown/popover/tooltip/date-picker/context-menu (INTEGRATIONS.md / CONCERNS.md) — the prime shared-controller extraction target (D-08).

### Established Patterns
- Event convention: `new CustomEvent('am-*', ...)` with `am-` prefix already consistent — only the *vocabulary* (open/close vs show/hide, select vs change) is inconsistent (D-01/D-02). Renames change the event-name string + `@fires` JSDoc + any test asserting the old name.
- Public surface is documented inline via JSDoc `@slot`/`@csspart`/`@cssprop`/`@fires` and captured by CEM — the audit matrices (D-12) and freeze scope (D-11) read from this documented surface.
- Barrel exports (`src/index.ts`, `src/index.all.ts`) and `package.json` `exports` define what's public; `src/internal/` must be absent from both to stay non-exported (D-09).

### Integration Points
- `api/` — new committed directory: `api/custom-elements.baseline.json` (D-14) + `api/AUDIT.md` (D-12). Add to `.npmignore`/keep out of `package.json` `files` so it's unpublished.
- `.github/workflows/ci.yml` — new report-only job runs `cem analyze` (or reuses build output) then the JSON comparator (D-13); does NOT fail the build this phase.
- `.changeset/` — one Changeset per normalization wave (D-05).
- `src/internal/` — new non-exported module tree for extracted controllers (D-09).
- The four component files under `src/components/{combobox,select,date-picker,time-picker}/` — refactor targets; their existing tests stay the contract.

</code_context>

<specifics>
## Specific Ideas

- Concrete outliers already spotted in scout (audit will confirm/complete): overlay events `am-show`/`am-hide` (dropdown, popover, context-menu) vs `am-open`/`am-close` (dialog, drawer, command-palette, toast); selection `am-select` (menu, list, tree-view, command-palette) vs `am-select-option` (select) vs `am-row-select`/`am-selection-change` (data-grid); change/toggle `am-change` (pagination) vs `am-tab-change` (tabs) vs `am-toggle` (accordion).
- "Report-only during cleanup" is deliberate: the diff informs review without red-CI while intentional breaking renames land wave by wave; the baseline moves with each approved wave (D-14). The gate only turns enforcing at Phase 6.
- Behavior-preservation is the hard line on the refactor: the temptation to fix the floating-ui autoUpdate leak or the listener-lifecycle bugs while touching those files must be resisted — those are Phase 3/4 with their own teardown-spy verification.

</specifics>

<deferred>
## Deferred Ideas

- **`@wc-toolkit/changelog` adoption** — evaluate as the enforcing surface-diff tool at Phase 6 (SHIP-01). This phase uses the lightweight JSON comparator (D-13).
- **MIGRATION.md consumer guide** — Phase 5 (Documentation) folds the wave Changesets into a polished old→new rename table (D-06).
- **Leak/lifecycle fixes exposed during refactor** — captured against Phase 3 (FIX-01→04) as the controller seams make them visible; not fixed here (D-10).
- **`autoUpdate` gating on the extracted floating-ui controller** — Phase 4 (PERF-04); the controller is extracted behavior-preservingly this phase.
- **`@microsoft/api-extractor` `.d.ts` surface guard** (TEST-V2-02) — v2; the CEM diff is the primary surface guard for 1.0.

</deferred>

---

*Phase: 2-api-cleanup-cem-baseline*
*Context gathered: 2026-08-13*
