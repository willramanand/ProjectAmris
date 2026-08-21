---
phase: 05-documentation
plan: 02
subsystem: documentation
tags: [docs, theming, validation, usage, tokens, shortcuts, virtualization, github-native-markdown]

# Dependency graph
requires:
  - phase: 05-01
    provides: generated docs/contract.md (frozen exhaustive slot/part/token enumeration) that theming/usage link to
  - phase: 04-01
    provides: as-built validation behavior (setCustomError, touch-gated timing, same-root aria)
  - phase: 04-05
    provides: ShortcutRegistry public register()/RegisterResult contract
  - phase: 04-06
    provides: am-shortcuts provider + command-palette provider-or-fallback mod+k
  - phase: 04-08
    provides: am-data-grid auto-virtualization threshold + mobile SR limitation
provides:
  - docs/theming.md (token-contract + theming guide, DOCS-02 prose half)
  - docs/validation.md (validation-message usage guide, DOCS-02 prose half)
  - docs/usage.md (import model + shortcuts + virtualization, DOCS-02 prose half)
affects: [05-03, 05-04, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 4495
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub-native Markdown prose docs under docs/, guide-vs-enumeration split (prose links to generated contract.md)"
    - "Docs sourced strictly from Phase 4 SUMMARYs + public exports; src/internal machinery documented as behavior, never as consumer import (T-05-05)"

key-files:
  created:
    - docs/theming.md
    - docs/validation.md
    - docs/usage.md
  modified: []

key-decisions:
  - "data-theme documented as the dark-mode switch for the GLOBAL stylesheet path only (build-tokens-css promotes :host([theme=dark]) -> :root[data-theme=dark]); am-theme-provider uses the theme= attribute — the two paths kept distinct for accuracy"
  - "Keyboard shortcuts folded into docs/usage.md rather than a standalone page (plan discretion item)"
  - "validation.md cross-links the Patterns/Validation Storybook example (discretion item) as the runnable demo"

requirements-completed: [DOCS-02]

coverage:
  - id: D1
    description: "docs/theming.md documents the --am-* token contract (primitive/semantic/dark layers), theming via am-theme-provider theme= and data-theme= (global stylesheet), tokens.css path, and links to contract.md"
    requirement: DOCS-02
    verification:
      - kind: other
        ref: "grep gate: am-theme-provider + tokens.css + contract.md + --am- present in docs/theming.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/validation.md documents am-field auto-surfacing validationMessage, touch-gated timing (D-01), error-replaces-hint (D-02), setCustomError precedence (D-03), and the 15/2 form-associated split"
    requirement: DOCS-02
    verification:
      - kind: other
        ref: "grep gate: setCustomError + validationMessage + am-field + (blur|user-invalid|submit) present in docs/validation.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/usage.md documents deep/per-component imports, am-shortcuts + registry.register (FEAT-03/04), virtualization auto-threshold, and links to theming/validation/contract"
    requirement: DOCS-02
    verification:
      - kind: other
        ref: "grep gate: am-shortcuts + @willramanand/amris + virtualiz + register present; sibling links resolve (theming.md/validation.md/contract.md)"
        status: pass
    human_judgment: false

# Metrics
duration: ~8min
completed: 2026-08-19
status: complete
---

# Phase 05 Plan 02: Prose Docs (theming / validation / usage) Summary

**Authored the three DOCS-02 prose pages as GitHub-native Markdown under `docs/` — a `--am-*` token-contract + theming guide, a validation-message usage guide, and a general usage guide (import model + keyboard shortcuts + virtualization) — each sourced strictly from the as-built Phase 4 behavior and public exports, and cross-linked to the generated `docs/contract.md`.**

## Accomplishments

- **docs/theming.md** — documents the three-layer token model (primitive → semantic → dark override), theming via `<am-theme-provider theme="light|dark|system">` and the `data-theme="dark"` root attribute for the global-stylesheet path, importing `@willramanand/amris/styles/tokens.css`, brand-palette overrides, per-component `@cssprop` tokens, and the tokens + `::part()` + slots styling API. Links to `docs/contract.md` as the frozen exhaustive enumeration.
- **docs/validation.md** — documents `am-field` auto-surfacing native `ElementInternals.validationMessage` through a same-shadow-root `aria-live` region wired by `aria-describedby`/`aria-invalid`; the touch-gated `:user-invalid` timing (blur / failed submit, never first paint, live-clear); error-replaces-hint slot swap; the public `setCustomError(message)` custom-wins precedence with `''`-clears-to-native; and the 15 form-associated controls that participate (excluding `am-search-field` and `am-file-upload`).
- **docs/usage.md** — documents the import model (full bundle, `./core`, per-component `@willramanand/amris/components/<name>` deep imports, `./styles/tokens.css`); the `<am-shortcuts>` registry usage with `registry.register(...)`'s no-throw result union, reserved-combo blocklist and single-key opt-in (WCAG 2.1.4); `am-command-palette`'s provider-or-fallback `mod+k`; and the ~100-row auto-virtualization threshold (freeze-neutral, no public attribute) with the documented mobile screen-reader limitation.

## Task Commits

1. **Task 1 — docs/theming.md (token contract + theming guide)** — `d71b0a0` (docs)
2. **Task 2 — docs/validation.md (validation-message usage guide)** — `e017ccf` (docs)
3. **Task 3 — docs/usage.md (import model + shortcuts + virtualization)** — `f6da8f3` (docs)

## Decisions Made

- **`data-theme` scoped to the global-stylesheet path.** Inspection of `scripts/build-tokens-css.mjs` showed it promotes `:host([theme='dark'])` → `:root[data-theme="dark"]` when emitting `dist/styles/tokens.css`; there is no `data-theme` handling inside `<am-theme-provider>` (which uses its `theme=` attribute). The doc therefore presents `data-theme` as the dark switch **only** for the stylesheet path and `theme=` for the provider — keeping the prose truthful to the two shipped mechanisms.
- **Shortcuts folded into usage.md** (plan discretion) rather than a standalone page; **validation.md cross-links the Patterns/Validation Storybook** example (plan discretion) as the runnable demo.

## Deviations from Plan

None — plan executed exactly as written. All three grep acceptance gates passed on first write.

## Threat Model Coverage

- **T-05-05 (information disclosure):** mitigated — content sourced strictly from the Phase 4 SUMMARYs and public exports. The internal `ValidationController`, `ShortcutRegistry`, and `virtualize-support` are described as *behavior* only; validation.md explicitly closes with a note that the timing/precedence engine is non-exported and not a consumer API.
- **T-05-06 (repudiation / drifted names):** mitigated — token names verified against `docs/contract.md`; import paths against `package.json` `exports`; `setCustomError`, `am-shortcuts`, `registry.register`, and the virtualization threshold against the Phase 4 SUMMARYs. Grep acceptance checks enforce the load-bearing names.
- **T-05-SC (tampering / deps):** accepted — no package installs this phase.

## Known Stubs

None — all three pages are complete prose referencing only shipped public API.

## Notes for Downstream Plans

- Plan 05-03 (README rebuild) should link all three pages: `docs/theming.md`, `docs/validation.md`, `docs/usage.md`.
- Plan 05-04 (Storybook) is the home for the runnable Patterns/Validation examples that validation.md and usage.md reference; the cross-links assume those stories exist under a Patterns/Validation grouping.
- The retiring static pages (`docs/theming.html`, `docs/getting-started.html`, `docs/components.html`) remain in-repo; their still-accurate prose has been migrated to Markdown (D-02) and they can be removed when the static site is retired.

## Self-Check: PASSED

- FOUND: docs/theming.md
- FOUND: docs/validation.md
- FOUND: docs/usage.md
- FOUND commits: d71b0a0, e017ccf, f6da8f3
- Verification: all three per-task grep acceptance gates PASS; usage.md sibling links (theming.md/validation.md/contract.md) resolve.

---
*Phase: 05-documentation*
*Completed: 2026-08-19*
