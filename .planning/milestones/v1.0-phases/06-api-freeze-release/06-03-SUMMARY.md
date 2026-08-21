---
phase: 06-api-freeze-release
plan: 03
subsystem: infra
tags: [release, changesets, github-actions, sha-pin, supply-chain, cem-baseline, ci, esm]

# Dependency graph
requires:
  - phase: 06-01
    provides: "enforcing Changeset-aware CEM surface-diff release gate (diff:surface exits non-zero on unversioned drift)"
  - phase: 06-02
    provides: "package.json hardened to the SHIP-02 publish contract; deep exports resolve; CI smoke gate"
provides:
  - "release.yml hardened for SHIP-04: changesets/action + checkout + setup-node SHA-pinned; publish green-gated via workflow_run on CI success; least-privilege permissions (contents:write + packages:write)"
  - "publish.yml reconciled: ungated `release: published` auto-publish removed; reduced to a documented workflow_dispatch break-glass fallback that runs the full gate set before publishing"
  - ".changeset/release-v1.md: NEW major Changeset carrying the version 0.2.0 -> 1.0.0 (verified in an isolated `changeset version` dry run)"
  - "api/custom-elements.baseline.json refreshed to the freshly built dist/custom-elements.json — the exact frozen v1.0 surface, zero drift"
affects: [06-04, ship, release]

# Actuals (#2632)
actuals:
  tokens: 2300    # chars/4 over authored diff (release.yml + publish.yml + release-v1.md); the generated CEM baseline re-copy is excluded (04-10 pattern)
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA-pin GitHub Actions to the exact commit a moving major tag points at, resolved via `gh api .../git/refs/tags/<tag>` and dereferenced through annotated tags, with a `# vX.Y.Z` version comment"
    - "workflow_run green-gate: a Release workflow triggered by the CI workflow completing `success` on main, guarded by `github.event.workflow_run.conclusion == 'success'`, checking out `workflow_run.head_sha` — no gate-job duplication, CI stays the single source of gate truth"
    - "Isolated `changeset version` dry run in a scratch copy (package.json + .changeset) to project the exact next version without mutating the working tree"
    - "Re-baseline by verbatim overwrite of api/custom-elements.baseline.json with a freshly built dist/custom-elements.json (04-10 pattern); surface-equality (zero drift), not byte-equality, is the enforced contract since cem module ordering is non-deterministic"

key-files:
  created:
    - .changeset/release-v1.md
  modified:
    - .github/workflows/release.yml
    - .github/workflows/publish.yml
    - api/custom-elements.baseline.json

key-decisions:
  - "Green-gate implemented via `workflow_run` (option b) rather than inlining gate jobs (option a): ties publish to the whole CI conclusion (verify+coverage, browser a11y, surface-diff, size, smoke) with zero job duplication/drift and leaves ci.yml untouched (matches files_modified)."
  - "release.yml permissions scoped to EXACTLY contents:write + packages:write per the plan's thrice-stated least-privilege mandate (action, acceptance criteria, threat T-06-08). pull-requests:write was dropped — see Deviations for the changesets Release-PR implication."
  - "publish.yml kept as a gated manual `workflow_dispatch` fallback (not deleted) so files_modified stays 'modified'; the dangerous ungated `release: published` auto-publish trigger was removed, and the fallback runs the full gate set (typecheck+coverage, browser a11y, surface-diff, size) before publish."
  - "changesets/action@v1 resolves to the `v1` branch head a45c4d5, which equals the v1.9.0 release commit — pinned to a45c4d5 with a `# v1.9.0` comment."
  - "Baseline refreshed by verbatim copy of the fresh dist manifest; cem output is non-deterministic byte-wise across builds (documented in cem-diff.mjs), so zero surface drift is the meaningful/enforced equality, which holds."

requirements-completed: [SHIP-04]

coverage:
  - id: D1
    description: "SHIP-04: release.yml pins changesets/action + checkout + setup-node to full 40-char commit SHAs with version comments"
    requirement: SHIP-04
    verification:
      - kind: other
        ref: "grep -E 'changesets/action@[0-9a-f]{40}|actions/checkout@[0-9a-f]{40}|actions/setup-node@[0-9a-f]{40}' .github/workflows/release.yml — all three match"
        status: pass
    human_judgment: false
  - id: D2
    description: "SHIP-04: publish is green-gated — unreachable unless tests+coverage, real-browser a11y, and bundle-size pass first"
    requirement: SHIP-04
    verification:
      - kind: other
        ref: "release.yml triggers on workflow_run of CI and guards the release job with `github.event.workflow_run.conclusion == 'success'` (machine-asserted, per Task 1 <verify> grep)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SHIP-04: a major Changeset carries the version to exactly 1.0.0"
    requirement: SHIP-04
    verification:
      - kind: integration
        ref: "isolated `changeset version` on a scratch copy of package.json (0.2.0) + all pending changesets -> package.json version 1.0.0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The committed CEM baseline equals the freshly built dist/custom-elements.json (zero surface drift)"
    requirement: SHIP-04
    verification:
      - kind: integration
        ref: "cp dist/custom-elements.json api/custom-elements.baseline.json; npm run diff:surface exit 0 (No surface drift); baseline byte-identical to the fresh build"
        status: pass
    human_judgment: false

# Metrics
duration: ~25min
completed: 2026-08-19
status: complete
---

# Phase 6 Plan 03: Release Pipeline Hardening + v1.0 Staging Summary

**Hardened `release.yml` for SHIP-04 — SHA-pinned `changesets/action`/`checkout`/`setup-node`, green-gated the publish behind the CI workflow's `success` conclusion, and scoped the token to least-privilege — reconciled `publish.yml` down to a gated manual break-glass fallback (removing the ungated `release: published` auto-publish), added the `major` Changeset that carries `0.2.0 -> 1.0.0` (verified by an isolated dry run), and refreshed `api/custom-elements.baseline.json` to the exact frozen v1.0 surface with zero drift. The release is staged; nothing is published (the one-way door is 06-04).**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-19
- **Tasks:** 2
- **Files:** 4 (1 created, 3 modified)

## Accomplishments

### Task 1 — SHA-pin release actions + green-gate the publish (`961b8ec`)
- **SHA pins (threat T-06-07).** Resolved each action's moving major tag to the exact commit it points at via the GitHub API and pinned with a version comment:
  - `changesets/action@v1` -> `a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d` (`# v1.9.0`; the `v1` branch head, which equals the v1.9.0 release commit)
  - `actions/checkout@v4` -> `11d5960a326750d5838078e36cf38b85af677262` (`# v4.4.0`)
  - `actions/setup-node@v4` -> `49933ea5288caeca8642d1e84afbd3f7d6820020` (`# v4.4.0`)
- **Green gate (SHIP-04).** Switched `release.yml`'s trigger from `push: [main]` to `workflow_run` on the `CI` workflow completing, and guarded the release job with `if: github.event.workflow_run.conclusion == 'success'`. The publish is now unreachable unless the whole CI pipeline (verify+coverage, browser a11y, surface-diff, size, smoke) is green — machine-enforced, not trusted to review. The job checks out `workflow_run.head_sha` so it publishes the exact commit that passed CI.
- **Least-privilege (threat T-06-08).** Scoped the release job `permissions` to exactly `contents: write` + `packages: write`; dropped `pull-requests: write`. Tokens are passed only as step `env`, never echoed (T-06-09).
- **publish.yml reconciled (threat T-06-09).** Removed the ungated `release: published` auto-publish trigger (it fired on every GitHub release with no gate). Reduced the file to a documented `workflow_dispatch` break-glass fallback with two gate lanes (Node 20: typecheck + jsdom coverage + real-browser a11y + surface-diff; Node 22: bundle-size) and a `publish` job that `needs: [gate, size]` — so even the manual path is green-gated. Top-level `permissions: contents: read`; only the publish job carries `packages: write`. All actions SHA-pinned.

### Task 2 — v1.0 major Changeset + frozen baseline refresh (`65cc8d0`)
- **`.changeset/release-v1.md` (major).** Authored a `"@willramanand/amris": major` Changeset with a v1.0 freeze summary (frozen public API, real test coverage, stable packaging). A `major` bump overrides the six pending pre-1.0 minors (which alone reach only 0.3.0).
- **Verified 1.0.0 (no fallback needed).** Ran `changeset version` in an isolated scratch copy of `package.json` (0.2.0) + all pending changesets: the projected version is **exactly `1.0.0`**. changesets did NOT apply a 0.x major->minor reduction, so no explicit-version fallback was required.
- **Baseline refreshed to the frozen surface.** Rebuilt (`npm run build`) and overwrote `api/custom-elements.baseline.json` with the freshly built `dist/custom-elements.json`; `npm run diff:surface` reports **zero drift** (exit 0), and the committed baseline is byte-identical to the fresh build. Confirmed `package.json` version is still `0.2.0` and nothing was published.

## Task Commits

1. **Task 1: SHA-pin release actions and green-gate the publish path** — `961b8ec` (ci)
2. **Task 2: add v1.0 major Changeset and refresh frozen CEM baseline** — `65cc8d0` (feat)

## Verification Results

- `grep -E "changesets/action@[0-9a-f]{40}"` (and checkout/setup-node) in `release.yml` — all three SHA pins match.
- Green-gate machine-asserted: `release.yml` contains `if: ${{ github.event.workflow_run.conclusion == 'success' }}` — satisfies the Task 1 `<verify>` grep (workflow_run success form).
- `release.yml` permissions = exactly `contents: write` + `packages: write`.
- `npm run build && npm run diff:surface` — exit 0, "No surface drift".
- Isolated `changeset version` dry run — projects `1.0.0` from `0.2.0`.
- Both `release.yml` and `publish.yml` parse as valid YAML (`yaml.safe_load`).
- `package.json` version unchanged at `0.2.0`; no publish occurred.

## Deviations from Plan

### 1. [Recorded plan decision] `pull-requests: write` dropped from release.yml
- **What:** The plan mandates (in the action, the acceptance criteria, AND threat T-06-08) that the publish job's `permissions` be **exactly** `contents: write` + `packages: write`. The prior `release.yml` also had `pull-requests: write`, which `changesets/action`'s Release-PR path uses to open a "Version Packages" PR when pending changesets exist.
- **Decision:** Followed the plan exactly and removed `pull-requests: write`. This is a deliberate least-privilege trade: the intended v1.0 flow is a direct, green-gated publish confirmed at the 06-04 checkpoint, not a Release-PR round-trip. If a future Release-PR workflow is desired, `pull-requests: write` would need to be re-granted — flagged here so 06-04 can confirm the publish behaves as expected (`changesets/action` will `publish` directly when no changesets remain; with changesets present on main it would otherwise attempt a PR).
- **Impact:** No code change; workflow config only. Machine-verified acceptance criteria (exactly the two scopes) is satisfied.

### 2. [Green-gate implementation choice] workflow_run over inlined gate jobs
- The plan offered two green-gate implementations; chose `workflow_run` (option b) over inlining the four gate jobs (option a). Rationale: ties the publish to the CI workflow's overall `success` conclusion (covering all gates including smoke) with zero job duplication and no edit to `ci.yml` (which is outside this plan's `files_modified`). Both satisfy the machine-checkable `<verify>` grep.

## Deferred Issues (pre-existing, out of scope — carried from 06-01/06-02)

- **Stale `docs/contract.md`** — `npm run build` regenerates it with real deltas from the committed copy (parts 76 -> 77, new `am-shortcuts` slot, new `error` parts). The CI `Contract doc drift check` step will fail until it is regenerated + committed. Already tracked in `.planning/WINDOWS.md` and `deferred-items.md` from 06-01/06-02; left unstaged here (out of 06-03 scope). **This will block the green gate (and therefore the release) until resolved — flag for 06-04 / ship.**
- **`npm run size` RED on the base** (core/full/data-grid budgets) — per the additional context for this plan, the size-limit budgets were re-baselined this phase (core 28 / full 75 / data-grid 13 kB) and are green; if a stale checkout still shows RED, that re-baseline must be merged. Not touched here.

## Threat Surface Scan

No new security-relevant surface. Changes are workflow configuration (SHA pins, trigger, permissions), a Changeset markdown, and a regenerated CEM baseline (generated artifact). The changes directly mitigate the plan's threat register: T-06-07 (all release-path actions SHA-pinned), T-06-08 (publish gated + least-privilege `contents:write`+`packages:write`, no PR-triggered publish scope), T-06-09 (single green-gated publish path; ungated `release: published` removed; tokens only in step `env`).

## Next Phase Readiness

- The release pipeline is SHA-pinned, green-gated, and least-privilege; the `major` Changeset carries the version to exactly `1.0.0`; and the committed CEM baseline is the exact frozen v1.0 surface. Everything is staged for the one-way publish at **06-04**.
- **Blocker to clear before the green gate passes:** the pre-existing stale `docs/contract.md` (CI contract-doc drift check). Regenerate + commit it before 06-04's publish, or the green gate will (correctly) hold the release.

## Self-Check: PASSED

- FOUND files: .github/workflows/release.yml, .github/workflows/publish.yml, .changeset/release-v1.md, api/custom-elements.baseline.json, .planning/phases/06-api-freeze-release/06-03-SUMMARY.md
- FOUND commits: 961b8ec (Task 1), 65cc8d0 (Task 2)

---
*Phase: 06-api-freeze-release*
*Completed: 2026-08-19*
