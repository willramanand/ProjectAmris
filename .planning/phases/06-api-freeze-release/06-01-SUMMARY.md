---
phase: 06-api-freeze-release
plan: 01
subsystem: infra
tags: [release-gate, changesets, custom-elements-manifest, npm-pack, ci, esm]

# Dependency graph
requires:
  - phase: 02 (test-coverage / CEM surface comparator)
    provides: "report-only cem-diff.mjs comparator (diffManifests/formatReport), api/custom-elements.baseline.json, diff:surface script"
provides:
  - "Enforcing Changeset-aware CEM surface-diff release gate (SHIP-01): CLI exits non-zero on unversioned public-surface drift, 0 with a pending Changeset or clean surface"
  - "Unit-tested pure helpers releaseGateExitCode() and countPendingChangesets() in scripts/cem-diff.mjs"
  - "CI surface-diff job step relabelled enforcing (no continue-on-error / || true)"
  - "scripts/smoke-pack.mjs: tarball pack/install/resolve smoke proving the primary entry resolves via the exports map (SHIP-03 thin slice), wired as npm run smoke"
affects: [06-02, 06-03, 06-04, ship, release]

# Actuals (#2632)
actuals:
  tokens: 2400
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, side-effect-free exit-code helper (releaseGateExitCode) so a CI gate's decision is unit-testable without spawning a process"
    - "Zero-new-dependency Node smoke: pack -> install into an os.tmpdir throwaway project -> import.meta.resolve, cleaned up in finally"
    - "Cross-platform npm invocation via node+npm-cli.js (space-safe, no shell), shell:true+quoted-args fallback only on Windows (EINVAL/CVE-2024-27980)"

key-files:
  created:
    - scripts/smoke-pack.mjs
  modified:
    - scripts/cem-diff.mjs
    - test/cem-diff.test.ts
    - .github/workflows/ci.yml
    - package.json

key-decisions:
  - "Encoded SHIP-01 as a pure releaseGateExitCode({hasDrift, pendingChangesetCount}) helper: fail (1) iff drift AND zero Changesets; drift + Changeset = intentional versioned change = pass."
  - "Smoke proves RESOLUTION not runtime execution — importing a component runs customElements.define() which throws in bare Node; the browser lane already proves runtime, the freshly-published risk is exports-map resolution."
  - "Discover the packed tarball dynamically from npm pack --json (no hardcoded version), sanitizing the scoped filename to its on-disk form."
  - "Usage-error CLI branch now exits 2 (was 0) so the enforcing gate never silently passes on a missing argument."

patterns-established:
  - "Changeset-aware release gate: surface freeze is enforced against a committed baseline, gated on pending .changeset/*.md."
  - "OS-portable release tooling scripts: node built-ins + argument-array execFileSync, verified on Windows and CI ubuntu Node 20."

requirements-completed: [SHIP-01, SHIP-03]

coverage:
  - id: D1
    description: "Release-gate exit logic (SHIP-01): fail on unversioned surface drift, pass with a pending Changeset or clean surface"
    requirement: SHIP-01
    verification:
      - kind: unit
        ref: "test/cem-diff.test.ts#release gate exit code"
        status: pass
    human_judgment: false
  - id: D2
    description: "Enforcing CLI end-to-end: diff:surface prints the diff and exits with the release-gate code"
    requirement: SHIP-01
    verification:
      - kind: integration
        ref: "npm run diff:surface (clean surface + 6 pending Changesets -> exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "CI surface-diff job step is enforcing (no continue-on-error, no || true)"
    requirement: SHIP-01
    verification:
      - kind: other
        ref: ".github/workflows/ci.yml surface-diff job — step 'Surface diff (release gate)', no swallowing"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tarball smoke: pack, install into a throwaway project, resolve @willramanand/amris via the exports map to a real dist/amris.js (SHIP-03 thin slice)"
    requirement: SHIP-03
    verification:
      - kind: integration
        ref: "node scripts/smoke-pack.mjs (exit 0, resolved -> dist/amris.js, temp + tarball cleaned)"
        status: pass
    human_judgment: false

# Metrics
duration: ~15min
completed: 2026-08-19
status: complete
---

# Phase 6 Plan 01: API Freeze & Release Tracer Summary

**Flipped the Phase 2 report-only CEM surface comparator into an enforcing, Changeset-aware release gate (SHIP-01) and stood up a zero-dependency tarball pack/install/resolve smoke proving the primary entry resolves via the exports map (SHIP-03 thin slice).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-19T17:10:00Z (approx)
- **Completed:** 2026-08-19T17:25:32Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `scripts/cem-diff.mjs` now exports two pure helpers — `countPendingChangesets()` (counts `.changeset/*.md` excluding README.md, 0 if absent) and `releaseGateExitCode({hasDrift, pendingChangesetCount})` (returns 1 iff drift AND zero Changesets) — and the CLI exits with that code, enforcing SHIP-01.
- The CLI usage-error branch now exits non-zero (2) instead of silently exiting 0.
- `test/cem-diff.test.ts` gained a `release gate exit code` describe block covering all four truth-table cases; 9/9 tests green.
- `.github/workflows/ci.yml` surface-diff step relabelled `Surface diff (release gate)` with a comment documenting enforcement; no `continue-on-error` and no `|| true`, so a non-zero `diff:surface` exit fails the job.
- `scripts/smoke-pack.mjs` (NEW) packs the library, installs the tarball + the Lit peer into a throwaway ESM project under `os.tmpdir()`, and asserts `import.meta.resolve('@willramanand/amris')` resolves through the exports map to an existing `dist/amris.js`, cleaning up temp dir + tarball in a `finally`. Wired as `npm run smoke`.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): flip CEM surface-diff to enforcing release gate** - `8d16341` (feat)
2. **Task 2: tarball pack/install/resolve smoke (SHIP-03 thin slice)** - `fc4bcbd` (feat)

_Plan metadata (SUMMARY + deferred-items) committed separately._

## Files Created/Modified
- `scripts/cem-diff.mjs` - Added `countPendingChangesets()` + `releaseGateExitCode()`; CLI exits non-zero on unversioned drift; header/report text updated from report-only to enforcing.
- `test/cem-diff.test.ts` - New `release gate exit code` test group (4 cases) + `releaseGateExitCode` import.
- `.github/workflows/ci.yml` - `surface-diff` job final step relabelled enforcing; confirmed no behavior-swallowing.
- `scripts/smoke-pack.mjs` - NEW pack/install/resolve smoke, cross-platform, zero new deps.
- `package.json` - Added `smoke` script.

## Verification Results
- `npx vitest run test/cem-diff.test.ts` — 9 passed (normalization 5 + release gate 4).
- `node scripts/smoke-pack.mjs` — exit 0, resolved `@willramanand/amris -> dist/amris.js`, temp dir + tarball removed, `git status` clean.
- `npm run smoke` — exit 0 (same, via the new script entry).
- `npm run diff:surface` — exit 0 (baseline matches current manifest; 6 pending Changesets present).
- `npx tsc --noEmit` — exit 0 (no TS source touched).

## Tracer Feedback Gate
Auto mode was inactive (config both false), but this plan ran as a non-interactive parallel wave executor with `autonomous: true` (no interactive channel to a human). Per the autonomous tracer path, after committing Task 1 the tracer `<verify>` was re-run end-to-end: unit tests green AND the real CLI gate exercised via `npm run diff:surface` (exit 0 on the clean surface). The failure path (exit 1 on drift + zero Changesets) is exhaustively proven at the unit level. Tracer verified end-to-end before expanding to Task 2.

## Decisions Made
- SHIP-01 encoded as a pure, unit-testable exit-code function so the gate decision needs no process spawn.
- Smoke asserts resolution (exports-map correctness), not runtime execution, since `customElements.define()` throws in bare Node and runtime is already covered by the browser lane.
- Tarball discovered dynamically from `npm pack --json` (no hardcoded version), sanitizing the scoped name to its on-disk form.
- Cross-platform npm spawning: prefer `node <npm-cli.js>` (space-safe, no shell); fall back to `npm.cmd` with `shell:true` + quoted args on Windows only (avoids EINVAL from the post-CVE-2024-27980 `.cmd` restriction and the DEP0190 warning on the preferred path).

## Deviations from Plan

None affecting the plan's own scope — both tasks executed as written. One pre-existing, out-of-scope discovery was logged and NOT fixed here:

**1. [Out of scope — pre-existing] Stale `docs/contract.md`**
- **Found during:** Task 1 (running `npm run build` to prepare the manifest / Task 2 precondition).
- **Issue:** `npm run build` regenerates `docs/contract.md` with real deltas from the committed copy (`::part()` count 76 → 77, a new `am-shortcuts` (default) slot, new `error` parts on `am-checkbox`/`am-color-picker`). The committed contract doc is stale relative to current source. The CI `Contract doc drift check` step will fail until the doc is regenerated and committed.
- **Why out of scope:** Plan 06-01 touches only the release-gate script, its test, the CI label, and the smoke script — never `src/` or the contract-doc generator; the plan explicitly says not to touch the contract-doc drift step. The CEM surface baseline itself is in sync (`npm run diff:surface` reports no drift).
- **Action:** Reverted the working-tree change to keep the commit scope clean; logged to `.planning/phases/06-api-freeze-release/deferred-items.md` and to `.planning/WINDOWS.md` (kind: deviation) for ship-time visibility. Recommend a follow-up plan to regenerate + commit `docs/contract.md`.

## Issues Encountered
- Initial smoke run failed on Windows with `spawnSync npm.cmd EINVAL` (Node's post-CVE-2024-27980 refusal to execFile `.cmd` without a shell). Resolved by routing npm through `node <npm-cli.js>` (from `npm_execpath` or the npm bundled next to the node binary), with a Windows `shell:true`+quoted-args last resort. Verified working via both `node scripts/smoke-pack.mjs` and `npm run smoke`.

## User Setup Required
None - no external service configuration required. The smoke installs only the public `lit` peer plus the local tarball; no publish credential is used this phase.

## Next Phase Readiness
- The two load-bearing halves of "ship v1.0 safely" — the enforcing Changeset-aware surface gate and packed-artifact exports-map resolution — are proven end-to-end on a thin path. Plans 06-02 (package hardening: `files`/`exports`), 06-03 (full smoke matrix), and 06-04 (one-way publish) can build on this.
- **Blocker to flag for ship:** the pre-existing stale `docs/contract.md` will fail CI's contract-doc drift check until regenerated + committed (tracked in WINDOWS.md and deferred-items.md).

---
*Phase: 06-api-freeze-release*
*Completed: 2026-08-19*
