---
phase: 02-api-cleanup-cem-baseline
plan: 09
subsystem: api
tags: [cem, custom-elements-manifest, design-tokens, css-parts, slots, api-freeze, changesets]

# Dependency graph
requires:
  - phase: 02-01
    provides: cem-diff.mjs comparator + api/custom-elements.baseline.json baseline harness
  - phase: 02-02
    provides: build-audit.mjs generator + frozen-surface enumeration + used-token gap detector
  - phase: 02-05
    provides: final rename wave (combobox remote/search-in-trigger, tabs am-change) normalizing the surface
  - phase: 02-07
    provides: date-picker/select refactor onto src/internal shared machinery (surface unchanged)
  - phase: 02-08
    provides: time-picker pure-helper refactor (surface unchanged) — completes normalization
provides:
  - Frozen public slot / ::part() / --am-* token contract (v1.0, D-11 one-way door)
  - --am-z-toast documented as @cssprop on am-toast-region (used-token gap closed)
  - Final api/custom-elements.baseline.json capturing the normalized + documented surface
  - Changeset recording the frozen slot/part/token contract
affects: [phase-06-ship, surface-diff-enforcing-flip, SHIP-01]

actuals:
  tokens: 5000    # chars/4 over the authored diff (~19.6K chars); baseline JSON regen is a mechanical cp, excluded from effort
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Generator-owned FROZEN marker: freeze status emitted from build-audit.mjs so it survives AUDIT.md regeneration (no hand-edit)"

key-files:
  created:
    - .changeset/freeze-slot-part-token-surface.md
  modified:
    - src/components/toast/toast.ts
    - scripts/build-audit.mjs
    - api/AUDIT.md
    - api/custom-elements.baseline.json

key-decisions:
  - "Freeze decision (human, blocking one-way door): freeze-all-documented — freeze the full enumerated surface AND tag-and-freeze the one flagged used token"
  - "--am-z-toast documented via @cssprop on am-toast-region (not am-toast) — it is consumed on the region's :host z-index"
  - "FROZEN status emitted from the generator, not hand-edited into AUDIT.md, so re-running build-audit.mjs preserves it"
  - "surface-diff CI job left report-only; enforcing flip deferred to Phase 6/SHIP-01 (D-13)"

patterns-established:
  - "Generator-emitted freeze marker: a one-way-door freeze status lives in the generator so the audit stays reproducible and diffable"

requirements-completed: [API-04, API-05]

coverage:
  - id: D1
    description: "Complete slot / ::part() / --am-* token surface enumerated and marked FROZEN in api/AUDIT.md (212 global tokens, 54 per-component tokens, 21 slots, 76 parts)"
    requirement: "API-04"
    verification:
      - kind: automated
        ref: "grep -qi 'FROZEN' api/AUDIT.md (post npm run build:manifest && node scripts/build-audit.mjs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Used-but-undocumented --am-z-toast tagged @cssprop on am-toast-region; used-token gap now empty"
    requirement: "API-04"
    verification:
      - kind: automated
        ref: "dist/custom-elements.json contains am-z-toast cssProperty; AUDIT.md gap section reads 'None found'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Final api/custom-elements.baseline.json captures normalized + documented surface; npm run diff:surface CLEAN (exit 0, report-only)"
    requirement: "API-05"
    verification:
      - kind: automated
        ref: "npm run diff:surface -> 'No surface drift', DIFF_EXIT:0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase gate green: jsdom (481) + Chromium (39) suites pass; CEM tagName SET unchanged (79); src/internal not exported; api/ not published"
    requirement: "API-05"
    verification:
      - kind: automated
        ref: "npm run test:run (481 pass) + npm run test:browser (39 pass); tagName set 79==79; package.json files=[dist,README.md]"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-17
status: complete
---

# Phase 02 Plan 09: Freeze Slot/Part/Token Surface + Final Baseline Summary

**Froze the complete slot / `::part()` / `--am-*` token surface (212 global + 54 per-component tokens, 21 slots, 76 parts) as the published v1.0 contract, closed the last used-token gap by documenting `--am-z-toast`, and re-committed the final CEM baseline with a clean report-only diff — the phase closing gate.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-08-17T22:44:08Z
- **Tasks:** 3 (1 human decision checkpoint + 2 auto)
- **Files modified:** 4 modified, 1 created

## Accomplishments
- **Frozen public surface (API-04, D-11):** every slot, `::part()`, and `--am-*` token (global semantic + per-component `@cssprop`) enumerated and marked FROZEN in `api/AUDIT.md` as the published one-way-door contract.
- **Closed the used-token gap:** `--am-z-toast` (consumer-overridable toast-stacking z-index, `var(--am-z-toast, 1500)`) was tagged `@cssprop` on `am-toast-region` so CEM enumerates it into the frozen baseline; the audit gap section now reads "None found".
- **Final baseline (API-05, D-14):** `api/custom-elements.baseline.json` re-committed capturing the normalized (Plans 03-08) + documented surface; `npm run diff:surface` is CLEAN (exit 0, report-only).
- **Phase gate green:** jsdom (481 tests) + Chromium (39 tests) suites pass; CEM tagName SET unchanged (79, none added/removed); `src/internal/` absent from barrels + `package.json` exports; `api/` not in `package.json` `files`.
- **CI unchanged:** the surface-diff job stays report-only — the enforcing flip is deliberately deferred to Phase 6/SHIP-01 (D-13).

## Task Commits

Each task was committed atomically:

1. **Task 1: Approve frozen surface (blocking one-way-door decision)** — no commit (human decision checkpoint); resolved `approved: freeze-all-documented`
2. **Task 2: Document approved surface + mark AUDIT.md FROZEN** — `584c7fd` (feat)
3. **Task 3: Final baseline re-commit + clean report-only diff + phase gate** — `9162763` (chore)

_Task 1 is a `checkpoint:decision gate="blocking"` — surfaced to the human and answered before any freeze action; it produces no commit._

## Files Created/Modified
- `src/components/toast/toast.ts` — added `@cssprop --am-z-toast` JSDoc to the `am-toast-region` block (comment-only; no runtime change)
- `scripts/build-audit.mjs` — `frozenSurface()` now emits FROZEN status, the freeze decision, and the (empty) intentionally-internal exclusions note, so the marker survives regeneration
- `api/AUDIT.md` — regenerated: frozen-surface section marked FROZEN with final post-normalization names; used-token gap now empty
- `api/custom-elements.baseline.json` — re-committed final phase baseline capturing normalized + documented surface
- `.changeset/freeze-slot-part-token-surface.md` — records the frozen slot/part/token contract + the newly documented token (minor, additive)

## Decisions Made
- **freeze-all-documented (human, blocking checkpoint):** freeze the full enumerated surface AND tag-and-freeze `--am-z-toast`. Rationale: the token already leaks into consumer-overridable CSS via `var(--am-z-toast, 1500)`; documenting it is honest and grants stability to any consumer overriding toast stacking. No intentionally-internal exclusions.
- **`@cssprop` placed on `am-toast-region`, not `am-toast`:** the token is consumed on the region's `:host` z-index (toast.ts:319). The audit's file-level detector had attributed it to both tagNames; the tag was placed on the actual owner.
- **FROZEN emitted from the generator:** `api/AUDIT.md` is generator-owned ("do not hand-edit"). Emitting the FROZEN marker from `build-audit.mjs` keeps the audit reproducible and prevents a future `node scripts/build-audit.mjs` from silently wiping the freeze status.

## Deviations from Plan

None — plan executed exactly as written. The freeze decision selected `freeze-all-documented` as presented.

### Implementation note (not a deviation)
The plan Task 2 action said to add `@cssprop` "to the owning component's JSDoc block". The audit gap table listed both `am-toast` and `am-toast-region` (file-level token grep), but the token is only consumed on `am-toast-region`'s `:host`. The tag was placed on `am-toast-region` accordingly — consistent with the plan's intent (document the used surface); CEM enumerates it correctly.

## Known Stubs

None — no hardcoded placeholders, empty data sources, or TODO/FIXME introduced. The single change to component source is a comment-only `@cssprop` JSDoc tag.

## Threat Flags

None. Per the plan threat register: T-02-09 (api/ publish leak) is mitigated and verified in the Task 3 gate (`package.json` `files` = `["dist","README.md"]`, excludes `api/`); T-02-10 (premature enforcing flip) is accepted — the surface-diff job was left report-only.

## Self-Check: PASSED
- `.changeset/freeze-slot-part-token-surface.md` — FOUND
- `api/AUDIT.md` contains FROZEN — FOUND
- Commit `584c7fd` (Task 2) — FOUND
- Commit `9162763` (Task 3) — FOUND
- `npm run diff:surface` — CLEAN (exit 0)
- CEM tagName SET — 79 unchanged
