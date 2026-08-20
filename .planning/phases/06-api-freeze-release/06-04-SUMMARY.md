---
phase: 06-api-freeze-release
plan: 04
subsystem: release
tags: [changesets, github-packages, npm-publish, semver, release-gate, web-components]

# Dependency graph
requires:
  - phase: 06-api-freeze-release/03
    provides: "SHA-pinned green-gated release.yml + publish.yml fallback, major Changeset (release-v1.md), frozen custom-elements baseline"
  - phase: 06-api-freeze-release/01
    provides: "Enforcing CEM surface-diff release gate (scripts/cem-diff.mjs)"
  - phase: 06-api-freeze-release/02
    provides: "Hardened package.json exports/sideEffects/files + Lit peer ^3.3.2, passing tarball smoke"
provides:
  - "@willramanand/amris@1.0.0 published to GitHub Packages (npm.pkg.github.com)"
  - "v1.0.0 release tag on the release commit (671a43c)"
  - "package.json version 1.0.0 applied by changeset version; all pending changesets consumed into the 1.0.0 CHANGELOG"
affects: [post-1.0-maintenance, consumer-integration, future-milestones]

# Actuals (#2632)
actuals:
  tokens: 900
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Version-carrying release commit: changeset version applied and committed on main; the green-gated release.yml publishes + tags from that commit on push (no PR-scope needed, matching 06-03's least-privilege release job)"

key-files:
  created: []
  modified:
    - "package.json (version 0.2.0 -> 1.0.0)"
    - "CHANGELOG.md (1.0.0 entry)"
    - ".changeset/*.md (7 changesets consumed/deleted)"

key-decisions:
  - "Lit peer range frozen at ^3.3.2 (confirmed at the publish gate; overrides SHIP-02's literal ^3.3.0 to match the documented ElementInternals / Safari-16.4 floor)"
  - "Version bump applied directly on main (npm run version) then pushed, rather than via a changesets 'Version Packages' PR — reconciles with 06-03's deliberate drop of pull-requests:write from release.yml (least-privilege); the release job publishes from a main that already carries 1.0.0 with changesets consumed"
  - "The agent performed only the reversible local bump + commit; the human performed the outward-facing push and authorized the credentialed, irreversible publish (blocking-human gate honored)"

patterns-established:
  - "One-way-door release: reversible prep is agent-automatable; the immutable publish + permanent tag fire only behind an explicit human decision on a machine-verified green gate"

requirements-completed: [SHIP-04]

coverage:
  - id: D1
    description: "@willramanand/amris@1.0.0 is published to GitHub Packages"
    requirement: SHIP-04
    verification:
      - kind: other
        ref: "npm view @willramanand/amris version --registry=https://npm.pkg.github.com => 1.0.0"
        status: pass
    human_judgment: false
  - id: D2
    description: "v1.0 release tag exists on the release commit"
    requirement: SHIP-04
    verification:
      - kind: other
        ref: "git tag --list \"*1.0.0*\" => v1.0.0 (on 671a43c)"
        status: pass
    human_judgment: false
  - id: D3
    description: "package.json version is 1.0.0, applied by changeset version on the release commit"
    requirement: SHIP-04
    verification:
      - kind: other
        ref: "node -e require('./package.json').version => 1.0.0"
        status: pass
    human_judgment: false

# Metrics
duration: ~1 day (held at gate 2026-08-19; authorized + published 2026-08-20)
completed: 2026-08-20
status: complete
---

# Phase 6 · Plan 04: v1.0 Publish Summary

**`@willramanand/amris@1.0.0` published to GitHub Packages and tagged `v1.0.0` — the frozen, dependable public API is live, authorized by an explicit human decision on a green, SHA-pinned pipeline.**

## Performance

- **Duration:** Held at the publish gate 2026-08-19; authorized and published 2026-08-20
- **Tasks:** 2 (blocking-human decision + blocking-human action)
- **Files modified:** 9 (release bump commit `671a43c`); no source changes

## Accomplishments
- `@willramanand/amris@1.0.0` live on GitHub Packages (registry reports `1.0.0`).
- `v1.0.0` tag created on the release commit `671a43c`.
- `changeset version` applied 0.2.0 → 1.0.0, consuming the `major` freeze changeset plus the pending pre-1.0 minor changesets into a single 1.0.0 CHANGELOG entry.
- Published on the green-gated path: enforcing surface-diff gate (06-01), hardened package + tarball smoke (06-02), SHA-pinned least-privilege pipeline (06-03) — all verified green before the push.

## Task Commits

1. **Decision gate (blocking-human):** Publish v1.0 now — authorized by the maintainer; Lit peer `^3.3.2` confirmed.
2. **Human-action gate (blocking-human):** Release bump `671a43c` (`chore: release v1.0.0`, agent-performed reversible local step); push + credentialed publish + tag performed by the maintainer.

## Files Created/Modified
- `package.json` — version 0.2.0 → 1.0.0
- `CHANGELOG.md` — 1.0.0 release entry
- `.changeset/{release-v1,add-am-shortcuts-registry,add-setcustomerror-validation,freeze-slot-part-token-surface,normalize-overlay-lifecycle-events,normalize-remaining-outliers,normalize-selection-events}.md` — consumed (deleted) by `changeset version`

## Decisions Made
- **Lit peer `^3.3.2` frozen** — confirmed at the publish gate; overrides SHIP-02's literal `^3.3.0` to match the documented ElementInternals / Safari-16.4 floor.
- **Direct version bump on main over a "Version Packages" PR** — reconciles with 06-03's deliberate least-privilege drop of `pull-requests: write` from `release.yml`. The release job publishes from a `main` that already carries 1.0.0 with changesets consumed; no PR scope is exercised.
- **Reversibility split honored** — the agent performed only the reversible local `npm run version` + commit; the maintainer performed the outward-facing push and the credentialed, irreversible publish/tag.

## Deviations from Plan
The plan's original instruction ("merge the changesets-generated 'Version Packages' PR") was **stale** relative to 06-03's least-privilege deviation, which removed `pull-requests: write` from `release.yml` (so the changesets action cannot open that PR). Reconciled by applying `changeset version` directly on `main` and letting the green-gated release job publish + tag from the resulting release commit. Net effect is identical — 1.0.0 published and tagged on a machine-verified green gate — with a strictly smaller release-token scope. No scope creep.

## Issues Encountered
None. The registry-observable backstops (`npm view` version, release tag, package.json version) were all confirmed after the human-performed publish.

## User Setup Required
GitHub Packages `packages: write` (repo Actions → Workflow permissions) confirmed by the maintainer as part of the human-action gate. No further external configuration required.

## Next Phase Readiness
- SHIP-04 complete; the v1.0 milestone's release objective is met.
- The public surface is frozen and enforced: any unversioned change to the custom-elements surface now fails CI against the committed baseline.
- Post-1.0 changes must ship as 1.0.1+ (patch/minor) via a new changeset — the published version is immutable.

---
*Phase: 06-api-freeze-release*
*Completed: 2026-08-20*
