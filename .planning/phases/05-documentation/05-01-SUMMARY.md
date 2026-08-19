---
phase: 05-documentation
plan: 01
subsystem: documentation
tags: [custom-elements-manifest, cem, tokens, contract, ci, codegen, esm]

# Dependency graph
requires:
  - phase: 02-api-surface
    provides: frozen slot / ::part() / --am-* token surface (212 global + 54 component + 21 slots + 76 parts) captured in api/AUDIT.md and dist/custom-elements.json
provides:
  - scripts/build-contract-doc.mjs — zero-dependency generator of the consumer-facing frozen contract from the CEM
  - docs/contract.md — committed, generated frozen slot/part/token contract with a hand-written freeze-guarantee intro
  - build:contract-doc npm script chained into build after build:manifest
  - CI contract-doc drift gate (git diff --exit-code docs/contract.md) in the surface-diff job
affects: [06-freeze, documentation, ci]

# Actuals
actuals:
  tokens: 10500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generation-over-hand-authoring: consumer doc emitted from dist/custom-elements.json, never hand-maintained (mirrors build-audit.mjs / build-tokens-css.mjs)"
    - "Driftless-by-construction docs: committed generated artifact gated in CI via git diff --exit-code"

key-files:
  created:
    - scripts/build-contract-doc.mjs
    - docs/contract.md
  modified:
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "Freeze-guarantee intro (D-06) embedded as a constant string in the generator so the entire docs/contract.md stays deterministically regenerable and CI can diff the whole file"
  - "Contract-doc drift check placed in the existing surface-diff job (manifest already built there); left the report-only diff:surface step untouched (Phase 6 owns the enforcing flip)"
  - "build:contract-doc chained immediately after build:manifest so the CEM exists before the doc is generated"

patterns-established:
  - "Pattern: consumer-facing surface docs are generated from the same CEM the freeze gate enforces, keyed by tagName, with `|` escaped in cells and no manifest code execution"

requirements-completed: [DOCS-02]

coverage:
  - id: D1
    description: "Generator emits docs/contract.md from the CEM with slots, ::part() names, and --am-* tokens, counts matching api/AUDIT.md frozen surface (212 global, 54 component, 21 slots, 76 parts)"
    requirement: DOCS-02
    verification:
      - kind: automated
        ref: "node scripts/build-contract-doc.mjs && grep frozen/am-button/::part docs/contract.md; counts match api/AUDIT.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/contract.md opens with the hand-written freeze-guarantee intro (D-06) above the generated tables and contains no src/internal symbols (T-05-01)"
    requirement: DOCS-02
    verification:
      - kind: automated
        ref: "grep -q 'What \"frozen\" means' + no 'src/internal' match in docs/contract.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Regeneration wired into build (build:contract-doc after build:manifest) and CI fails on stale committed doc via git diff --exit-code docs/contract.md"
    requirement: DOCS-02
    verification:
      - kind: automated
        ref: "Task 2 <verify>: package.json build chain + ci.yml grep checks pass; idempotent re-run leaves git clean"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-08-19
status: complete
---

# Phase 05 Plan 01: Frozen Contract Doc Generator Summary

**Zero-dependency Node generator that emits docs/contract.md (212 global tokens, 54 per-component tokens, 21 slots, 76 ::part()s) from dist/custom-elements.json with a hand-written freeze-guarantee intro, wired into build + a CI drift gate so it can never diverge from the enforced CEM surface.**

## Performance

- **Duration:** ~9 min
- **Completed:** 2026-08-19
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `scripts/build-contract-doc.mjs`: zero-dependency ESM generator cloning the `build-audit.mjs` pattern — CEM indexed by tagName, `css`` block extraction of global `--am-*` tokens from `src/tokens/{primitives,semantic,dark}.css.ts`, `|`-escaped plain-text cells, reads no `src/internal` (threat T-05-01).
- `docs/contract.md`: committed generated contract with a hand-written freeze-guarantee intro (D-06), a counts-at-a-glance summary, and exhaustive tables for global tokens, per-component tokens, slots, and parts. Counts match `api/AUDIT.md` exactly: 212 / 54 / 21 / 76.
- `build:contract-doc` npm script chained into `build` immediately after `build:manifest`.
- CI `surface-diff` job extended with a contract-doc drift step (`npm run build:contract-doc` then `git diff --exit-code docs/contract.md`) — a hand-edited/stale doc fails CI (threat T-05-02). Report-only `diff:surface` left untouched for Phase 6.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Generate docs/contract.md from the CEM end-to-end** - `b41949f` (feat)
2. **Task 2: Wire regeneration into build + CI drift check** - `71f7291` (feat)

## Files Created/Modified
- `scripts/build-contract-doc.mjs` - Generator emitting the frozen contract doc from the CEM + global tokens.
- `docs/contract.md` - Committed, generated consumer-facing frozen slot/part/token contract.
- `package.json` - Added `build:contract-doc` script; chained into `build` after `build:manifest`.
- `.github/workflows/ci.yml` - Added contract-doc drift step to the `surface-diff` job.

## Decisions Made
- Embedded the D-06 freeze intro as a constant string inside the generator so the whole file is deterministically regenerable and CI can diff it in full.
- Placed the drift check in the existing `surface-diff` job (manifest already built there) and left the report-only `diff:surface` step untouched — Phase 6 owns the enforcing flip.
- Chained `build:contract-doc` right after `build:manifest` so the CEM exists before the doc generates.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. The tracer's `<verify>` passed end-to-end on the first run; counts matched `api/AUDIT.md` (212 / 54 / 21 / 76) with no adjustment. Git reported harmless LF→CRLF warnings on Windows checkout (no content impact).

## Tracer Feedback Gate
Task 1 is the tracer. Its `<verify>` (generate + grep + counts-match + no-internal-leak + idempotence) was run end-to-end and passed before any expansion; `human_verify_mode` is `end-of-phase` and the verify is fully automated, so execution continued to Task 2 rather than pausing for interactive sign-off.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 6 (freeze) can flip the report-only `diff:surface` step to enforcing; the contract-doc drift gate is already enforcing and shares the same CEM source of truth.
- `docs/contract.md` is idempotent and CI-gated; consumers have a single authoritative frozen-surface page.

## Self-Check: PASSED

- scripts/build-contract-doc.mjs — FOUND
- docs/contract.md — FOUND
- .planning/phases/05-documentation/05-01-SUMMARY.md — FOUND
- commit b41949f — FOUND
- commit 71f7291 — FOUND

---
*Phase: 05-documentation*
*Completed: 2026-08-19*
