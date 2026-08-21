# Phase 05: Documentation - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver consumer-facing documentation for the **frozen v1.0 contract** so a consumer can read exactly what the contract is and how to use it. Three requirements only:

- **DOCS-01** — README documents the Lit peer-dependency and the Safari 16.4 browser floor (ElementInternals), including that form controls silently fail to submit below the floor.
- **DOCS-02** — Validation, theming/token-contract, and usage docs — including the frozen slot/`::part()`/`--am-*` token contract a consumer can rely on.
- **DOCS-03** — Storybook has runnable examples for the virtualization and validation-message patterns.

This phase writes docs. It does **not** change component code, add features, or touch the freeze gate (that is Phase 6). Documenting the Phase-2 frozen surface and the Phase-4 feature patterns is in scope; re-litigating either is not.

</domain>

<decisions>
## Implementation Decisions

### Docs home / format
- **D-01:** Prose docs (DOCS-02: usage, theming/token contract, validation) live as **Markdown in-repo** (under `docs/`), linked from the README — GitHub-native rendering is where consumers of the GitHub Packages install actually land. **Storybook** remains the home for runnable interactive examples (DOCS-03).
- **D-02:** **Retire / freeze the hand-authored `docs/*.html` static site** (`getting-started.html`, `components.html`, `theming.html`, `docs.ts`). Do not expand it — it is not published anywhere, duplicates Storybook, and drifts from the frozen CEM surface. Migrate any still-useful prose into the new Markdown docs, then stop maintaining the HTML.

### README treatment
- **D-03:** **Rebuild the README as a consumer-first quick-start.** The current 702-line "Project Amris Library Roadmap / Vision" doc is not a package entry point. New README covers: what it is → install (GitHub Packages registry + Lit peer-dependency) → browser floor (Safari 16.4 / ElementInternals / **silent form-submit failure below floor** = DOCS-01) → a short (~30-second) usage example → links out to the `docs/*.md` pages + Storybook + `BROWSER_SUPPORT.md`.
- **D-04:** **Move the vision / roadmap / non-goals prose out** of the README rather than keeping it inline. Destination is Claude's discretion (e.g. `docs/vision.md`, `CONTRIBUTING.md`, or `.planning/`) — just don't lose it and don't leave it as the first thing a consumer reads.

### Frozen contract doc
- **D-05:** The consumer-facing frozen slot/`::part()`/`--am-*` token contract doc is **generated from the CEM** (`dist/custom-elements.json`) — the same source Phase 6's enforcing surface-diff gate guards — so it can never drift from the enforced surface and is regenerable in CI. Follow the existing `scripts/build-audit.mjs` generator pattern.
- **D-06:** Wrap the generated reference with a **short hand-written intro** explaining the freeze guarantee (what "frozen" means, how a consumer can rely on it, that CI blocks unversioned surface changes at freeze). Generated tables = exhaustive surface; prose = the guarantee.

### Storybook examples (DOCS-03)
- **D-07:** Ship **dedicated pattern story files** (e.g. `patterns/validation.stories.ts`, `patterns/virtualization.stories.ts`) rather than burying the examples inside individual component stories — these are cross-cutting patterns spanning multiple components, so they need a pattern-level home a consumer can find as "the validation example" / "the virtualization example".
- **D-08:** Examples are **runnable / interactive** (live controls: toggle virtualization threshold, forms that surface `validationMessage` live) — not static snapshots. The requirement says "runnable examples."

### Claude's Discretion
- Exact destination for the relocated vision prose (D-04).
- Directory layout / filenames under `docs/` for the Markdown pages.
- Whether the keyboard-shortcut registry + `am-shortcuts` (FEAT-03/04) gets its own usage page or folds into the general usage docs — it is a shipped Phase-4 feature and belongs somewhere in DOCS-02 usage, but its prominence is planner's call.
- Whether validation docs (DOCS-02 prose) and validation Storybook examples (DOCS-03) cross-link or stay independent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §Documentation — DOCS-01, DOCS-02, DOCS-03 (exact wording)
- `.planning/ROADMAP.md` §"Phase 5: Documentation" — goal + 3 success criteria

### Frozen surface (source for the contract doc — D-05/D-06)
- `api/AUDIT.md` — the Phase-2 frozen slot/`::part()`/`--am-*` surface, marked FROZEN (212 global + 54 per-component tokens, 21 slots, 76 parts)
- `dist/custom-elements.json` — generated CEM; the machine-readable source the contract doc is generated FROM
- `api/custom-elements.baseline.json` — committed CEM baseline the Phase-6 diff gate guards
- `scripts/build-audit.mjs` — existing CEM→doc generator; **the pattern to follow** for the contract-doc generator
- `scripts/cem-diff.mjs` — the surface-diff tool (report-only now; enforcing in Phase 6)

### DOCS-01 source material (already largely written)
- `BROWSER_SUPPORT.md` — already documents Safari 16.4 floor, ElementInternals, silent form-submit failure, load-bearing feature table. README (DOCS-01) should summarize + link this, not duplicate it.
- `README.md` — current 702-line roadmap-style doc to be rebuilt (D-03)

### Phase-4 feature patterns to document (DOCS-02 validation, DOCS-03 examples)
- `.planning/phases/04-performance-feature-capabilities/04-CONTEXT.md` — validation-UX + shortcuts + virtualization decisions
- Phase 4 SUMMARYs under `.planning/phases/04-performance-feature-capabilities/` — as-built behavior for FEAT-01/02 (validation), FEAT-03/04 (shortcuts), PERF-02/03 (virtualization)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BROWSER_SUPPORT.md` — thorough, current; DOCS-01 is mostly satisfied here. README summarizes + links.
- `scripts/build-audit.mjs` — proven CEM-reading generator; clone its structure for the contract-doc generator (D-05).
- `.storybook/` (main.ts, preview.ts) + 60 existing `src/stories/*.stories.ts` — DOCS-03 pattern stories slot in here.
- `dist/styles/tokens.css` + `scripts/build-tokens-css.mjs` — token source, useful for the theming doc.

### Established Patterns
- Generation-over-hand-authoring is already the house style (AUDIT.md, tokens.css, baseline all generated) — D-05 stays consistent with it.
- Frozen surface is CEM-anchored and CI-diffed (Phase 2/6) — the contract doc must anchor to the same CEM, not a parallel hand-maintained list.

### Integration Points
- New `docs/*.md` link from the rebuilt README; README links to Storybook + BROWSER_SUPPORT.md.
- Contract-doc generator reads `dist/custom-elements.json` → writes a Markdown doc under `docs/`; wire into build/CI so it regenerates like AUDIT.md.
- Retiring `docs/*.html` (D-02): check `docs/docs.ts` and any Vite/build wiring that serves the static site before deleting.

</code_context>

<specifics>
## Specific Ideas

- README ordering (D-03): what-it-is → install (registry + Lit peer-dep) → browser floor (Safari 16.4, silent form-fail) → ~30s usage example → links. Consumer reaches "how do I use it" fast; internal vision does not block that.
- Contract doc (D-06): generated exhaustive tables + a short prose "freeze guarantee" preamble.
- DOCS-03 stories (D-07/D-08): pattern-level files, interactive controls, not snapshots.

</specifics>

<deferred>
## Deferred Ideas

- **Publishing / hosting Storybook** for consumers to browse online — docs home is Markdown-in-repo + *local* Storybook. Hosting a public Storybook is a separate concern (Phase 6 release wiring or post-1.0), not required by DOCS-01/02/03.
- **Docs versioning** (versioned doc site) — post-1.0.
- **Full component-by-component API reference site** beyond the frozen-surface contract doc — Storybook autodocs/CEM already covers per-component APIs; a separate generated site is out of DOCS scope for 1.0.

</deferred>

---

*Phase: 05-documentation*
*Context gathered: 2026-08-18*
