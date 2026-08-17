---
phase: 02-api-cleanup-cem-baseline
plan: 01
subsystem: build-tooling
tags: [cem, surface-diff, ci, api-freeze, tracer]
status: complete
requires: []
provides:
  - api/custom-elements.baseline.json (committed CEM surface baseline, D-14)
  - scripts/cem-diff.mjs (normalized report-only comparator with importable diffManifests)
  - surface-diff CI job (report-only, D-13)
  - npm run diff:surface
affects:
  - Plans 03-05 (rename waves re-commit the baseline and read the diff for unintended drift)
  - Plan 09 (freeze captures the final baseline through this comparator)
tech-stack:
  added: []
  patterns:
    - Zero-dep Node ESM comparator (node:fs/node:url), no new dependency (D-13)
    - tagName-keyed, name-sorted, source-stripped normalization (Pitfall 3)
    - Report-only exit 0 in script (not continue-on-error) so Phase 6 flip is one line
key-files:
  created:
    - api/custom-elements.baseline.json
    - scripts/cem-diff.mjs
    - test/cem-diff.test.ts
  modified:
    - .github/workflows/ci.yml
    - package.json
decisions:
  - Comparator diffManifests exported for direct unit testing; CLI wrapper prints + exits 0
  - Attributes compared by name with default-change detection; fields/events/slots/cssParts/cssProperties by name
metrics:
  duration: ~3 min
  completed: 2026-08-16
actuals:
  tokens: 2800
  tasks: 3
  commits: 3
requirements: [API-05]
---

# Phase 2 Plan 01: CEM Baseline + Report-Only Surface-Diff Spine Summary

The load-bearing surface-diff tracer is proven end-to-end on pre-rename code: `npm run build:manifest` emits `dist/custom-elements.json`, a committed `api/custom-elements.baseline.json` snapshots it (79 tagNames), a zero-dep `scripts/cem-diff.mjs` diffs the two normalized surfaces report-only (always exit 0), a jsdom unit test locks the normalization contract, and a new `surface-diff` CI job runs `npm run diff:surface` — all green with zero drift on identical inputs.

## What Was Built

- **api/custom-elements.baseline.json** — verbatim snapshot of the freshly built `dist/custom-elements.json` (D-14 initial baseline). 79 registered tagNames captured. Absent from package.json `files`/`exports`, so it stays unpublished (D-12).
- **scripts/cem-diff.mjs** — zero-dependency ESM comparator. Indexes declarations by `tagName` (never array position), extracts a normalized surface per element (attributes name+default, public fields, events, slots, cssParts, cssProperties), sorts every compared array by name, strips volatile `source`/description fields, and prints a human-readable per-element report. Exposes an importable `diffManifests(baseline, current)` returning `{ addedElements, removedElements, changed, hasDrift }`, plus `indexManifest`/`formatReport`. CLI wrapper always `process.exit(0)` this phase (D-13); Phase 6 flips it in one line.
- **test/cem-diff.test.ts** — 5 jsdom tests on hand-built in-memory fixtures: identical (no drift), added-event, removed-cssPart, renamed-cssProperty (one removed + one added), and source-churn + array-reorder (no drift, proving normalization).
- **.github/workflows/ci.yml** — new `surface-diff` job (ubuntu, checkout@v4, setup-node@v4 Node 20 + npm cache, npm ci) that builds the manifest then runs `npm run diff:surface`. Report-only via the script's own exit 0, not `continue-on-error`. Workflow-level `permissions: contents: read` retained.
- **package.json** — new `diff:surface` script so local and CI invoke the identical command. No dependency changes.

## Tasks & Commits

| Task | Name | Type | Commit |
| ---- | ---- | ---- | ------ |
| 1 | Surface-diff spine (baseline, comparator, CI job) | tracer | 7120224 |
| 2 | Comparator normalization unit test | auto (tdd) | 827e854 |
| 3 | diff:surface script + CI routing | auto | 74573e1 |

## Verification

- `npm run build:manifest` succeeds, emits dist/custom-elements.json (79 tagNames).
- `node scripts/cem-diff.mjs api/... dist/...` → "No surface drift", EXIT:0.
- `npm run diff:surface` (after build:manifest) → EXIT:0.
- `npx vitest run --project jsdom test/cem-diff.test.ts` → 5 passed.
- package.json `files` = ["dist","README.md"], no `api/` in files or exports (verified programmatically + git grep).
- dist/ remains gitignored; no stray build output committed.

## Tracer Feedback Gate

Task 1's `<verify>` was re-run end-to-end after commit: report-only diff exits 0 with zero drift on identical inputs. Tracer verified — expansion tasks (2, 3) proceeded from the proven spine. (Automated, passing verification; verify mode is end-of-phase.)

## Deviations from Plan

None — plan executed as written. The `diffManifests` importable export required by Task 2 was authored directly in Task 1's comparator (the plan anticipated this refactor), so Task 2 needed no changes to scripts/cem-diff.mjs.

## Known Stubs

None.

## Notes

- The comparator additionally detects attribute default-value changes (reported as `attribute ~ name: from -> to`), beyond the plan's minimum name-set comparison — a correctness improvement for the freeze surface with no added dependency.
- `actuals.tokens` (2800) reflects authored code (scripts/cem-diff.mjs + test + ci/pkg edits, ~11.2K chars /4). The 627KB baseline is a verbatim generated snapshot, not authored effort, and is excluded to keep future estimate calibration meaningful.

## Self-Check: PASSED

- FOUND: api/custom-elements.baseline.json
- FOUND: scripts/cem-diff.mjs
- FOUND: test/cem-diff.test.ts
- FOUND commit 7120224, 827e854, 74573e1
