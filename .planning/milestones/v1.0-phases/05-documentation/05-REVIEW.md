---
phase: 05-documentation
reviewed: 2026-08-19T14:09:43Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/build-contract-doc.mjs
  - src/stories/patterns/validation.stories.ts
  - src/stories/patterns/virtualization.stories.ts
  - package.json
  - .github/workflows/ci.yml
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-08-19T14:09:43Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This is a documentation-generation phase. The scoped code is a new zero-dependency
ESM generator (`build-contract-doc.mjs`), two Storybook pattern stories, and the
build/CI wiring that regenerates and drift-gates the generated contract doc.

Overall the work is sound and faithful to the reference pattern (`build-audit.mjs`):

- **APIs verified against real components.** `am-input.setCustomError(message: string)`
  is a public method (`input.ts:363`); `am-data-grid` exposes public `columns` / `rows`
  / `striped` / `compact` props (`data-grid.ts:91-96`); `DataGridColumn` fields match.
- **No off-by-one in the threshold demo.** The component virtualizes at
  `rows.length > VIRTUALIZE_ROW_THRESHOLD` where the constant is `100`
  (`virtualize-support.ts:66`), and the story label uses the identical strict `> 100`
  test — the boundary (exactly 100 rows) agrees on both sides.
- **Lit-safe templating throughout.** All rendered text flows through `${}` bindings;
  no `innerHTML` / `eval` / raw-HTML sink in either story.
- **CEM parsing keyed by `tagName`, not array position** — matches the manifest-order
  caution in `build-audit.mjs` / `cem-diff.mjs`, and markdown cells escape `|`.
- **Boundary respected.** The generator reads only `dist/custom-elements.json` and
  `src/tokens/*.css.ts` — nothing under `src/internal/` (threat T-05-01).
- **Scope discipline holds.** No `src/components/**` file was touched this phase
  (last component commits are all Phase 04) — this is genuinely docs-only.

One robustness defect is worth fixing before this ships: the drift-gated generator
sorts its rows with a locale/ICU-dependent comparator, which can produce spurious CI
drift failures across Node/ICU versions. The remaining items are minor.

## Warnings

### WR-01: Locale-dependent sort in a `git diff --exit-code`-gated generator

**File:** `scripts/build-contract-doc.mjs:30`
**Issue:** Row order is established with
`elements.sort((a, b) => a.tagName.localeCompare(b.tagName))`. `String.prototype.localeCompare`
resolves collation through ICU, whose ordering of hyphenated ASCII identifiers
(e.g. `am-tab`, `am-tab-panel`, `am-tabs`) can differ between ICU versions and host
locales. Unlike the reference `build-audit.mjs` (whose `api/AUDIT.md` output is *not*
drift-checked), this generator's output is gated by `git diff --exit-code docs/contract.md`
in the `surface-diff` CI job. If the committed `docs/contract.md` was generated on a
machine whose Node/ICU produces a different collation than CI's Node 20 (Linux), the
row order can differ and the drift gate fails on an otherwise-correct doc — turning a
determinism guard into a source of false CI failures. The in-cell lists already use the
default code-point `.sort()` (via `uniq`), so the row comparator is the sole locale-sensitive
ordering in the file.
**Fix:** Use a stable, locale-independent comparator for the gated output:
```js
elements.sort((a, b) => (a.tagName < b.tagName ? -1 : a.tagName > b.tagName ? 1 : 0));
```
(Applying the same to `build-audit.mjs` keeps the two generators consistent, though only
the contract doc is drift-gated.)

## Info

### IN-01: Dead `inputRef` binding in NativeConstraint story

**File:** `src/stories/patterns/validation.stories.ts:73,94`
**Issue:** `const inputRef: Ref<AmInput> = createRef();` is bound with `${ref(inputRef)}`
but `inputRef.value` is never read — the custom-error application goes through the
separate `applyCustomError` ref callback. The binding (and the `ref`/`createRef`/`Ref`
imports it needs) is dead and slightly misleading about intent.
**Fix:** Remove `inputRef`, its `${ref(inputRef)}` binding, and the now-unused
`createRef`/`Ref` imports; keep only the `applyCustomError` callback.

### IN-02: Hardcoded hex fallback in a `var()` in demo chrome

**File:** `src/stories/patterns/virtualization.stories.ts:87`
**Issue:** The descriptive `<p>` uses `color: var(--am-color-text-muted, #666)`. The
`#666` fallback is a hardcoded color that will not adapt to dark mode if the token is
absent. This is demo chrome (not shipped component CSS), and in Storybook the token is
loaded, so impact is minimal — but it is inconsistent with the project's token-only
convention.
**Fix:** Drop the hex fallback (`var(--am-color-text-muted)`), or use another `--am-*`
token as the fallback, so the demo text tracks the theme.

### IN-03: No `.gitattributes` normalization for the drift-gated generated file

**File:** `.github/workflows/ci.yml:71-74` (and repo root — no `.gitattributes` present)
**Issue:** `docs/contract.md` is currently committed with LF and CI regenerates with LF
(`writeFileSync` does not translate line endings), so today the drift gate is stable.
But there is no `.gitattributes` pinning EOL for this generated, `git diff --exit-code`
-gated file. A contributor on Windows with `core.autocrlf=true` who commits a
regenerated copy could introduce CRLF, and the Linux CI (LF) drift check would then fail
spuriously. Latent, not active.
**Fix:** Add `.gitattributes` with e.g. `docs/contract.md text eol=lf` (or `* text=auto eol=lf`).

### IN-04: Generator exits 0 on an empty/partial manifest

**File:** `scripts/build-contract-doc.mjs:27-30,194-198`
**Issue:** If `dist/custom-elements.json` parses but contains zero `tagName`
declarations, the script emits a doc with empty tables and zero counts and exits 0 — a
silent partial doc rather than a failure. In CI this is mitigated because the
`surface-diff` job runs `npm run build:manifest` immediately before, so the manifest is
freshly populated; the risk is only for a stale/empty local manifest.
**Fix (optional hardening):** Guard with a sanity floor, e.g.
`if (!elements.length) { console.error('empty CEM — refusing to write contract doc'); process.exit(1); }`.

---

_Reviewed: 2026-08-19T14:09:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
