---
phase: 07-measurement-baselines-budgets
plan: 05
subsystem: tooling
tags: [rollup-plugin-visualizer, size-limit, esbuild-why, bundle-attribution, vite, highlight.js]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    provides: Installed dev-only measurement tools (rollup-plugin-visualizer@7.1.1, @size-limit/esbuild-why@13.0.3) + report-only npm script stubs (visualize, size:why, attribution:check)
provides:
  - Env-gated (VISUALIZE) rollup-plugin-visualizer wired into vite.config.ts, emitting machine-readable bundle-stats.json (raw-data) outside dist/
  - scripts/attribution-check.mjs — zero-dep, confirm-only assertion that highlight.js ships in zero chunks
  - Cross-source attribution truth (visualizer build-graph + dist/**/*.js grep) seeding the Phase-11 tampering guard (T-07-09)
affects: [11-enforcing-budgets, phase-11-perf-size-gates]

actuals:
  tokens: 2050
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Env-gated dev-only build plugin (VISUALIZE flag) that leaves the shipped artifact byte-identical"
    - "Two-source confirm-only attribution check: build-graph JSON cross-checked against on-disk dist grep"

key-files:
  created:
    - scripts/attribution-check.mjs
  modified:
    - vite.config.ts
    - .gitignore

key-decisions:
  - "Used the visualizer `raw-data` (JSON) template (A4 preferred path) → programmatic assertion, not just an HTML treemap"
  - "Wrote bundle-stats.json to the repo root (outside dist/) + gitignored it, so the dev-only report can never enter the tarball (files: [dist, README.md]) or git"
  - "attribution-check cross-checks the visualizer build-graph AND greps every dist chunk, so the confirmation holds even without a VISUALIZE build"
  - "highlight.js is confirm-only (Pitfall 7): already a Storybook-only devDep with zero src imports — no dependency move, just an absence assertion"

patterns-established:
  - "Env-gated plugin via a helper returning Plugin[] spread into the plugins array; default off keeps normal builds clean and byte-stable"
  - "Report-only check (D-08): exits 0 even on a hypothetical leak this phase, exits 2 only on usage error; mirrors scripts/cem-diff.mjs isMain shape"

requirements-completed: [MEAS-05]

coverage:
  - id: D1
    description: "rollup-plugin-visualizer wired into vite.config.ts behind the VISUALIZE env flag (default off); VISUALIZE=1 build emits bundle-stats.json (raw-data JSON) at repo root; normal build emits no report and dist/amris.js is byte-identical with the flag unset"
    requirement: MEAS-05
    verification:
      - kind: automated
        ref: "npm run build (no report, sha256 X) vs VISUALIZE=1 npm run build (bundle-stats.json emitted, sha256 identical) => byte-stable"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/attribution-check.mjs asserts highlight.js appears in zero shipped chunks — scans all 147 dist chunks + all 163 build-graph modules, names highlight.js explicitly, exits 0 report-only"
    requirement: MEAS-05
    verification:
      - kind: automated
        ref: "VISUALIZE=1 npm run build && node scripts/attribution-check.mjs (exit 0, RESULT: absent from ALL 147 chunks) + verify one-liner (mentions highlight.js, no leak phrase) => VERIFY OK"
        status: pass
      - kind: automated
        ref: "negative test: formatReport with a synthetic leak emits 'found highlight.js in a shipped chunk' and leaked=true => check has teeth"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-08-22
status: complete
---

# Phase 7 Plan 05: Bundle Attribution + highlight.js Absence Confirmation Summary

**Wired the dev-only, env-gated rollup-plugin-visualizer into the Vite build (machine-readable `bundle-stats.json`, byte-stable shipped output) and added a zero-dependency confirm-only check that proves highlight.js ships in zero of the 147 shipped chunks — MEAS-05 closed with no dependency move.**

## Performance

- **Duration:** ~15 min (incl. two full `npm run build` runs for byte-stability comparison)
- **Completed:** 2026-08-22
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **Env-gated attribution report (Task 1):** `rollup-plugin-visualizer` is inserted into `vite.config.ts`'s top-level `plugins` array only when `process.env.VISUALIZE` is set, via a `visualizerPlugins(): Plugin[]` helper spread into the array. It uses the `raw-data` template (A4's preferred machine-readable path) with gzip+brotli sizes, writing `bundle-stats.json` to the repo root — outside `dist/` — with `emitFile: false`. A normal `npm run build` emits no report; `dist/amris.js` is **byte-identical** (sha256 `3b258a79…`) with the flag set vs unset, so no dev tooling leaks into the shipped artifact.
- **Confirm-only absence check (Task 2):** `scripts/attribution-check.mjs` (zero-dep ESM) asserts highlight.js appears in **zero** shipped chunks. It cross-checks two independent attribution sources: the visualizer build-graph (`bundle-stats.json` `nodeMetas` — 163 modules, keyed to chunks) and a direct grep of **every** `dist/**/*.js` chunk (147 files) for a bundled-highlight.js signature (`highlight.js`, `hljs`, `registerLanguage`, `highlightAll`). It names highlight.js explicitly, is report-only (`exit 0`, D-08) even on a hypothetical leak, and exits `2` only on a usage error (missing `dist/`).
- **Confirmed the phantom (MEAS-05):** highlight.js is absent from all 147 chunks and all 163 build-graph modules. It is a Storybook-only devDependency with zero `src/` imports — confirm-only, no dependency move (Pitfall 7).
- **Leak-guard seeded:** the check gives teeth to threat T-07-09 (a future refactor pulling highlight.js into a chunk) — a synthetic-leak negative test confirms the leak branch fires and emits the flag phrase; the enforcing flip is Phase 11.

## Task Commits

Each task committed atomically:

1. **Task 1: Wire the env-gated rollup-plugin-visualizer** — `443e485` (feat)
2. **Task 2: Confirm highlight.js absent from every shipped chunk** — `9d05d24` (feat)

## Files Created/Modified

- `vite.config.ts` (modified) — added the `visualizer` import and a `visualizerPlugins()` helper; spread its output into `plugins: [stripLitCssComments(), ...visualizerPlugins()]`. The `external` array is **untouched** (verified: 0 matches in the commit diff — byte-stable for Plan 02's snapshot).
- `scripts/attribution-check.mjs` (created) — the two-source, report-only highlight.js absence check.
- `.gitignore` (modified, Rule 2 deviation) — ignore `bundle-stats.json` and `stats.html` so the dev-only report never enters VCS or the tarball.

## Decisions Made

- **JSON over HTML for attribution.** The visualizer `raw-data` template exposes `nodeMetas[uid].id` (module source paths) and `moduleParts` (owning chunk), so the check reads the build graph programmatically (A4's preferred path) rather than scraping an HTML treemap.
- **Report written outside `dist/`.** `bundle-stats.json` at the repo root with `emitFile: false` keeps it out of the emptied-each-build `dist/` and out of `files: ["dist","README.md"]`; gitignoring it is belt-and-suspenders against accidental commit.
- **Two attribution sources, not one.** The dist grep is the on-disk shipped truth and works even without a VISUALIZE build; the visualizer graph adds module-level provenance. Either flagging highlight.js is treated as a leak.

## Deviations from Plan

### Auto-added Supporting Change

**1. [Rule 2 - Missing hygiene] Gitignore the dev-only attribution report**
- **Found during:** Task 1 (a `VISUALIZE=1` build leaves an untracked `bundle-stats.json`).
- **Change:** added `bundle-stats.json` and `stats.html` to `.gitignore` so the dev-only report can never be committed or shipped.
- **Why:** matches the plan's own prohibition ("no report ships", "dev-only") and threat T-07-ID (tool leaking into the tarball). Not a dependency/`package.files` change.
- **Files modified:** `.gitignore`
- **Commit:** `443e485`

No other deviations — both tasks executed as written. `package.json` was **not** touched (Plan 00 owns the `visualize` / `size:why` / `attribution:check` script stubs, all of which now resolve to live wiring). The `size:why` script was confirmed functional by Plan 00 (esbuild-why installed) and was not re-run to avoid an interactive report-open.

## Known Stubs

None. The two Plan 00 stubs this plan targeted are now live: `visualize` → the env-gated visualizer plugin; `attribution:check` → the created `scripts/attribution-check.mjs`.

## Threat Flags

None. No new network endpoints, auth paths, or trust-boundary surface introduced — the change is a dev-only, env-gated build report plus a read-only check script.

## Self-Check: PASSED

- Files verified present: `vite.config.ts`, `scripts/attribution-check.mjs`, `.gitignore`, `07-05-SUMMARY.md`
- Commits verified in git log: `443e485`, `9d05d24`
- `VISUALIZE=1 npm run build && node scripts/attribution-check.mjs` re-run green (exit 0, highlight.js absent from all 147 chunks); normal build emits no report and dist/amris.js is byte-identical

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
