---
phase: 10-graceful-degradation-compatibility-matrix
plan: 08
subsystem: docs
tags: [browser-support, compat, elementinternals, aria-reflection, has, compat-forms, graceful-degradation, documentation]

# Dependency graph
requires:
  - phase: 10-07
    provides: "Empirical cross-engine results — all 4 capability probes true on Chromium/WebKit/Firefox 153 (ARIA reflection ships un-flagged on Firefox), plus the am-drawer × WebKit modal-focus divergence"
  - phase: 10-01
    provides: "src/internal/helpers/capabilities.ts — the independent sub-capability probes documented here"
  - phase: 10-02
    provides: "Guarded ElementInternals attach (constructors no longer throw below the floor)"
  - phase: 10-03
    provides: "src/internal/helpers/form-participation.ts + @willramanand/amris/compat-forms opt-in (COMPAT-03)"
  - phase: 10-06
    provides: "@supports selector(:has(*))-guarded empty-slot CSS (COMPAT-06)"
provides:
  - "BROWSER_SUPPORT.md floor table split into distinct form-association and ARIA reflection rows, empirically grounded on the Phase 10 widened matrix"
  - "BROWSER_SUPPORT.md ## Graceful Degradation (v1.1) section documenting per-capability probing, guarded attach, the /compat-forms XOR opt-in, the below-floor console.warn, and guarded CSS collapse"
  - "Narrowed 'what does NOT work below the floor' + pruned 'Future work' (custom-hidden-input shipped; hard polyfill permanently out of scope)"
  - "test/browser-support-doc.test.ts — Node-side doc-structure assertion spec"
affects: [COMPAT-05, phase-10-completion, gsd-ship, milestone-v1.1]

# Actuals (#2632)
actuals:
  tokens: 1200
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node-side doc-structure vitest spec: readFileSync(resolve(process.cwd(), 'DOC.md')) under the jsdom project (import.meta.url is not a file:// URL in the jsdom environment), with a ##-section extractor to scope assertions"

key-files:
  created:
    - test/browser-support-doc.test.ts
  modified:
    - BROWSER_SUPPORT.md

key-decisions:
  - "ARIA reflection documented as its own floor row distinct from form-association, populated from Plan 07's empirical result (Firefox 153 ships it un-flagged) rather than the RESEARCH.md 'behind a flag / later' hypothesis, which is explicitly marked superseded"
  - "Doc-structure test scoped under the jsdom project and reads the file via process.cwd() (not import.meta.url, which throws 'URL must be of scheme file' under jsdom)"
  - "Task-2 negative assertion targets the custom-hidden-input *bullet* only (regex ^- A custom-hidden-input strategy), not the prose mention that explains it shipped — avoids a fragile blanket negative"

patterns-established:
  - "Every below-floor claim in BROWSER_SUPPORT.md is grounded in an empirical cross-engine test result (Plan 07) or a shipped Phase-10 code path, not a web-sourced hypothesis alone (T-10-13 mitigation)"

requirements-completed: [COMPAT-05]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Floor table splits ElementInternals into distinct form-association and ARIA reflection rows, both populated from Plan 07's real Chromium/WebKit/Firefox results (Firefox 153 ships ARIA reflection un-flagged)"
    requirement: "COMPAT-05"
    verification:
      - kind: unit
        ref: "test/browser-support-doc.test.ts#lists an ARIA reflection floor row distinct from the form-association row"
        status: pass
    human_judgment: false
  - id: D2
    description: "## Graceful Degradation (v1.1) section documents all 5 points: independent capabilities.ts probing, guarded attach, the OFF-by-default /compat-forms XOR opt-in (value + native validation, not custom-message UI), the one-time below-floor console.warn, and @supports selector(:has(*))-guarded CSS collapse"
    requirement: "COMPAT-05"
    verification:
      - kind: unit
        ref: "test/browser-support-doc.test.ts#has the Graceful Degradation (v1.1) section / documents the opt-in compat-forms import by exact path / states the XOR (no double-submit) guarantee / names the capabilities.ts independent-probe helper"
        status: pass
    human_judgment: false
  - id: D3
    description: "'What does NOT work below the floor' narrowed (forms qualified by /compat-forms; empty slots reframed as intentional guarded fallback) and 'Future work' pruned (custom-hidden-input bullet removed; hard ElementInternals polyfill stated permanently out of scope)"
    requirement: "COMPAT-05"
    verification:
      - kind: unit
        ref: "test/browser-support-doc.test.ts#qualifies the below-floor forms claim with the compat-forms opt-in / frames the empty-slot reservation as an intentional guarded fallback / no longer lists the custom-hidden-input strategy as unimplemented future work / states the hard ElementInternals polyfill is permanently out of scope"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-08-28
status: complete
---

# Phase 10 Plan 08: Graceful Degradation & Compatibility Matrix (COMPAT-05) Summary

**BROWSER_SUPPORT.md now documents the true per-capability floor (ARIA reflection split from form-association, grounded in Plan 07's empirical Firefox-153-ships-it result) and a full `## Graceful Degradation (v1.1)` matrix — capability probing, guarded attach, the opt-in `/compat-forms` XOR fallback, the below-floor console warning, and guarded `:has()` CSS — closing COMPAT-05 and Phase 10.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-28T20:22:00Z
- **Completed:** 2026-08-28T20:25:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Split the "Why this floor" table's `ElementInternals` requirement into two rows — **form-association** and **ARIA reflection** — because `capabilities.ts` (COMPAT-01) probes them independently. Both Floor cells now cite "empirically confirmed... on the widened WebKit/Firefox/Chromium matrix, Phase 10"; the ARIA-reflection row explicitly records that Firefox historically flag-gated it (`accessibility.ARIAReflection.enabled`, Bugzilla 1785412) but ships it **un-flagged on Firefox 153**, superseding the RESEARCH.md hypothesis.
- Added a `## Graceful Degradation (v1.1)` section covering all five behaviors this milestone shipped: (1) independent per-capability probing via `capabilities.ts`; (2) constructors no longer throw below the floor (COMPAT-02); (3) the OFF-by-default `import '@willramanand/amris/compat-forms'` opt-in — XOR with the native path, mirrors value + native `required`/`pattern` validation but NOT the custom validation-message UI (D-03); (4) the one-time globally-deduped `console.warn` (D-04); (5) `@supports selector(:has(*))`-guarded CSS collapse (COMPAT-06).
- Replaced the pre-Phase-10 "forms just don't work below the floor" framing with the accurate narrower claim (forms work below the floor *with* `/compat-forms`), and reframed the empty-slot reservation as an intentional guarded fallback rather than a silent selector failure.
- Pruned "Future work": removed the now-shipped custom-hidden-input bullet (COMPAT-03), kept the still-unimplemented `:has()`/color-mix items, and recorded that a hard `ElementInternals` polyfill is **permanently out of scope** (not polyfillable; degrade instead — REQUIREMENTS.md Out of Scope).
- Created `test/browser-support-doc.test.ts` (9 assertions) proving the doc structure — the required headings, the exact `@willramanand/amris/compat-forms` path, "XOR", "capabilities.ts", the distinct ARIA-reflection row, and the section-scoped narrowed-claim / pruned-future-work assertions.

## Task Commits

1. **Task 1: Rewrite the floor table + add Graceful Degradation section (tracer)** — `4d30222` (docs)
2. **Task 2: Revise "what does NOT work" + Future work** — `95b15ce` (docs)

**Plan metadata:** (this SUMMARY commit) (docs)

## Files Created/Modified
- `BROWSER_SUPPORT.md` (modified) — split floor rows, new Graceful Degradation (v1.1) section, narrowed below-floor claims, pruned Future work.
- `test/browser-support-doc.test.ts` (created) — Node-side doc-structure assertion spec, 9 tests, runs under the `jsdom` project.

## Decisions Made
- **ARIA reflection = its own floor row, empirically grounded.** Populated from Plan 07's observed result (Firefox 153 ships it un-flagged), not the RESEARCH.md "behind a flag / later" hypothesis, which the doc explicitly marks superseded — the T-10-13 information-disclosure mitigation (never overclaim; ground every claim in the real matrix result).
- **Test reads the doc via `process.cwd()`, not `import.meta.url`.** Under the jsdom vitest environment `import.meta.url` is not a `file://` URL (`TypeError: The URL must be of scheme file`); `resolve(process.cwd(), 'BROWSER_SUPPORT.md')` is stable because vitest runs from the repo root. See Deviations.
- **Negative future-work assertion targets the bullet, not the prose.** The revised doc still *mentions* "a custom-hidden-input strategy" in prose (to explain it shipped); the test asserts only that the `- A custom-hidden-input strategy` *bullet* is gone, per the plan's "do not assert a negative on fragile literal text" guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Doc test could not resolve its path under the jsdom environment**
- **Found during:** Task 1 (first run of the tracer `<verify>`)
- **Issue:** The initial `fileURLToPath(new URL('../BROWSER_SUPPORT.md', import.meta.url))` threw `TypeError: The URL must be of scheme file` because `import.meta.url` is not a `file://` URL under the `jsdom` vitest project — the test suite failed to load (0 tests) rather than the doc assertions failing.
- **Fix:** Switched to `readFileSync(resolve(process.cwd(), 'BROWSER_SUPPORT.md'), 'utf8')`; vitest runs with `process.cwd()` at the repo root where the doc lives.
- **Files modified:** `test/browser-support-doc.test.ts`
- **Verification:** `npx vitest run --project jsdom test/browser-support-doc.test.ts` → 5/5 (Task 1), then 9/9 (Task 2).
- **Committed in:** `4d30222` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The fix was a test-harness path resolution correction only — no change to the documented content or scope. No scope creep.

## Issues Encountered
None beyond the deviation above. `.claude/settings.local.json` was left modified in the working tree (pre-existing, unrelated) and was NOT staged into either task commit.

## Broken Windows / Stubs
None introduced. This plan is documentation-only. The two open Phase-10 `.planning/WINDOWS.md` entries it *documents* (id 4: inert `:not(:has(::slotted(*)))` empty-slot rules — guarded for COMPAT-06; id 5: am-drawer × WebKit modal-focus divergence) are pre-existing findings from Plans 06/07 and are correctly reflected in the degradation matrix as intentional, documented limits — no new ledger entries required.

## Next Phase Readiness
- **COMPAT-05 complete; Phase 10 is done.** BROWSER_SUPPORT.md accurately documents the shipped graceful-degradation story with no stale "forms/CSS just don't work" framing remaining.
- Phase 11 (GATE-*) can flip the report-only budgets to enforcing; the browser floor documentation is frozen and consumer-accurate for the v1.1 milestone.

## Self-Check: PASSED

- `test/browser-support-doc.test.ts` — FOUND on disk.
- `BROWSER_SUPPORT.md` — modified (floor split, Graceful Degradation section, narrowed claims, pruned Future work) — verified via grep: stale blanket forms bullet GONE, custom-hidden-input bullet GONE, 7 key markers present.
- Task commits `4d30222`, `95b15ce` — FOUND in git log.
- Plan `<acceptance_criteria>` re-verified: `npx vitest run --project jsdom test/browser-support-doc.test.ts` → **9/9 passed**.

---
*Phase: 10-graceful-degradation-compatibility-matrix*
*Completed: 2026-08-28*
