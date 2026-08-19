---
phase: 05-documentation
plan: 03
subsystem: documentation
tags: [docs, readme, quick-start, browser-support, vision, static-site-retirement, DOCS-01]
status: complete

# Dependency graph
requires:
  - phase: 05-01
    provides: generated docs/contract.md (frozen slot/part/token surface) linked from the rebuilt README
  - phase: 05-02
    provides: docs/usage.md + docs/theming.md + docs/validation.md that the README quick-start links to; useful prose migrated out of the retired HTML site
provides:
  - README.md rebuilt as a consumer-first quick-start (what-it-is → install → browser floor → usage example → links) documenting DOCS-01
  - docs/vision.md (relocated 702-line vision/roadmap/non-goals/requirements background prose)
  - retirement of the drifted docs/*.html static site (getting-started/components/theming), docs.ts, and styles.css
affects: [05-04, phase-6-freeze]

# Actuals (#2632)
actuals:
  tokens: 12500
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Consumer-first README ordering (D-03): what-it-is → install → browser floor → 30s example → docs links; reference detail lives in linked docs/*.md, not the README"
    - "Facts asserted in README (registry URL, Lit peer-dep range, Safari 16.4 floor) grep-verified against package.json + BROWSER_SUPPORT.md rather than restated from memory (T-05-07)"
    - "DOCS-01 browser-floor content summarizes + links BROWSER_SUPPORT.md instead of duplicating its tables"

key-files:
  created:
    - docs/vision.md
  modified:
    - README.md
    - BROWSER_SUPPORT.md
  deleted:
    - docs/getting-started.html
    - docs/components.html
    - docs/theming.html
    - docs/docs.ts
    - docs/styles.css

key-decisions:
  - "Vision prose relocated verbatim to docs/vision.md (re-headed 'Project Vision & Background') — a relocation, not a rewrite, so no design intent is lost (D-04); the BROWSER_SUPPORT.md link inside it was repathed to ../ since it now lives under docs/"
  - "README install section uses a scope-level .npmrc line (@willramanand:registry=…) as the GitHub Packages setup, matching package.json publishConfig.registry"
  - "Static-site retirement (D-02) done with git rm after re-verifying vite.config lib entry uses only src/*, ci.yml + build-contract-doc.mjs reference only docs/contract.md, and root index.html has no docs refs — deletion is git-reversible, not a one-way door"

requirements-completed: [DOCS-01]

coverage:
  - id: T1
    description: "docs/vision.md holds the relocated vision/roadmap/non-goals/requirements prose (707 lines), preserved verbatim (D-04)"
    requirement: DOCS-01
  - id: T2
    description: "README.md rebuilt in D-03 order; asserts GitHub Packages registry, Lit ^3.3.2 peer-dep, Safari 16.4 floor + ElementInternals, and the silent form-submit failure below the floor (DOCS-01); links docs/*.md, Storybook, BROWSER_SUPPORT.md, and docs/vision.md (vision not the lead)"
    requirement: DOCS-01
  - id: T3
    description: "docs/*.html static site + docs.ts + styles.css retired after re-verifying no build wiring referenced them; docs/ retains only the maintained Markdown set (D-02)"
    requirement: DOCS-01
---

# Phase 05 Plan 03: Consumer-First README + Vision Relocation + Static-Site Retirement Summary

Turned the repository front door into a consumer-first package entry point: relocated the 702-line vision/roadmap prose to `docs/vision.md`, rebuilt `README.md` as a quick-start that documents the DOCS-01 Lit peer-dependency and Safari 16.4 / ElementInternals browser floor (including the silent form-submit failure below the floor), and retired the drifted hand-authored `docs/*.html` static site.

## What Was Built

- **Task 1 — `docs/vision.md` (D-04):** Moved the current README's entire vision / core-goals / non-goals / roadmap / requirements / SSR (§17a) / success-criteria prose into a new `docs/vision.md`, re-headed as "Project Vision & Background" and preserved verbatim (707 lines). The one edit made during relocation was repathing the internal `BROWSER_SUPPORT.md` link from `./` to `../` since the doc now lives under `docs/`. This gave the vision prose a preserved home so Task 2 could safely overwrite README.md.
- **Task 2 — rebuilt `README.md` (D-03, DOCS-01):** Rewrote README from scratch in the consumer-first order — (1) what-it-is (framework-agnostic Lit 3 / Web Components library), (2) install (GitHub Packages `npm.pkg.github.com` `@willramanand`-scoped `.npmrc` + `npm install @willramanand/amris` + the `lit@^3.3.2` peer-dependency the consumer provides), (3) browser floor (Safari 16.4 / Chrome-Edge 111 / Firefox 121, the ElementInternals requirement, and the explicit statement that **form controls silently fail to submit their value below the floor** — summarized and linked, not duplicating BROWSER_SUPPORT.md tables), (4) a ~30-second usage example (deep-import a component, drop `<am-button>` in HTML, plus the tokens.css note), (5) a Documentation section linking docs/usage.md, docs/theming.md, docs/validation.md, docs/contract.md, Storybook (`npm run storybook`), BROWSER_SUPPORT.md, and a project-background link to docs/vision.md placed below the quick-start so it is not the lead. Went from 702 lines to 75.
- **Task 3 — retired the static site (D-02):** Deleted `docs/getting-started.html`, `docs/components.html`, `docs/theming.html`, `docs/docs.ts`, and `docs/styles.css` via `git rm` after re-verifying no build wiring referenced them. `docs/` now holds only the maintained Markdown set: contract, theming, usage, validation, vision.

## Verification

- Task automated `<verify>` blocks all passed (vision.md exists + >40 lines + vision/roadmap/non-goal keywords; README contains registry, package name, peer, Safari 16.4, silent, BROWSER_SUPPORT.md, docs/usage.md, docs/vision.md; html + docs.ts removed while usage.md/theming.md remain).
- **T-05-07 (fact accuracy):** README facts grep-verified against sources — `peerDependencies.lit ^3.3.2` matches, `publishConfig.registry https://npm.pkg.github.com` matches, Safari `16.4` floor matches BROWSER_SUPPORT.md.
- **T-05-08 (build safety):** Re-verified before deletion — `vite.config.ts` lib entry uses only `src/index.all.ts`, `src/index.ts`, and discovered component entries (no docs input); `ci.yml` and `scripts/build-contract-doc.mjs` reference only `docs/contract.md` (kept); root `index.html` has no docs refs; the deleted files had only intra-`docs/` cross-links.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Repointed dangling SSR cross-reference in BROWSER_SUPPORT.md**
- **Found during:** Task 2 (after relocating the SSR §17a section out of README.md in Task 1)
- **Issue:** `BROWSER_SUPPORT.md` linked to `README.md#17a-ssr-server-side-rendering--current-status`, but that section moved to `docs/vision.md` in Task 1, leaving the link dangling.
- **Fix:** Updated the link to `./docs/vision.md#17a-…` (heading text unchanged, so the anchor is identical).
- **Files modified:** BROWSER_SUPPORT.md
- **Commit:** 8cd3e89

## Deferred / Out-of-Scope Notes

- `todo.md` retains three completed (`[x]`) checklist entries that mention the now-deleted `docs/getting-started.html`, `docs/theming.html`, and `docs/components.html` as a historical record of past work. These are not build wiring or active links — they document work that was done, not references that need to resolve. Left untouched (pre-existing tracking log, not caused by this plan's changes, scope boundary).

## Known Stubs

None. All three artifacts contain real, substantive content (no placeholders, TODOs, or empty data sources).

## Threat Flags

None. No new network endpoints, auth paths, file-access patterns, or schema changes introduced — this plan is documentation-only.

## Self-Check: PASSED

- Created files verified on disk: `docs/vision.md`, `README.md`, `.planning/phases/05-documentation/05-03-SUMMARY.md`.
- Deletions verified: `docs/getting-started.html`, `docs/components.html`, `docs/theming.html`, `docs/docs.ts`, `docs/styles.css` all removed.
- Commits verified in git log: 6fb154c (Task 1), ffe7b2c (Task 2), 8cd3e89 (deviation fix), 0afc0f8 (Task 3).
