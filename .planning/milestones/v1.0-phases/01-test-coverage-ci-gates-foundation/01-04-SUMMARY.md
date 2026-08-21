---
phase: 01-test-coverage-ci-gates-foundation
plan: 04
subsystem: testing
tags: [vitest, jsdom, smoke-tests, behavioral-test, pointer-events, split-view, test-split]

# Dependency graph
requires:
  - 01-01 (hybrid jsdom+browser Vitest lane, shared helpers, coverage gate)
provides:
  - Six dedicated 1:1 display smoke files (progress-ring, side-nav, stat, status-dot, timeline, visually-hidden)
  - Behavioral split-view test (pointer-drag + [0,100] clamp) matching the real implementation
  - am-breadcrumb-item coverage folded into breadcrumb.test.ts
affects: [01-08]

actuals:
  tokens: 2200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Multi-element directory → one test file, two describe blocks via single barrel import (side-nav, timeline)"
    - "jsdom pointer-drag test: stub setPointerCapture/releasePointerCapture (unimplemented in jsdom) and assert clamp bounds, not zero-rect geometry"
    - "Behavioral test asserts only the source's real surface — no keyboard-resize / aria-valuenow the component does not implement"

key-files:
  created:
    - test/components/progress-ring.test.ts
    - test/components/side-nav.test.ts
    - test/components/stat.test.ts
    - test/components/status-dot.test.ts
    - test/components/timeline.test.ts
    - test/components/visually-hidden.test.ts
    - test/components/split-view.test.ts
  modified:
    - test/components/breadcrumb.test.ts

key-decisions:
  - "split-view drag test uses clientX=100 against jsdom's zero-width rect (ratio → Infinity → clamps to 95); asserts finite position within [5,95] rather than exact geometry"
  - "Stub pointer-capture no-ops on the divider in-test (jsdom lacks setPointerCapture) instead of touching component source"
  - "am-breadcrumb-item block appended to the existing breadcrumb.test.ts under a distinct describe label; no standalone item file created"
  - "display-trivial.test.ts left intact — plan 08 performs the single race-free deletion"

requirements-completed: [TEST-01]

coverage:
  - id: D1
    description: "Six remaining display components have dedicated 1:1 smoke files (TEST-01, D-04)"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "vitest run --project jsdom over progress-ring/side-nav/stat/status-dot/timeline/visually-hidden — pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "Multi-element directories covered in one file: side-nav.test.ts (am-side-nav + item), timeline.test.ts (am-timeline + item)"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "side-nav.test.ts asserts host role=navigation + item active/href; timeline.test.ts asserts host slot + item variant — pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "split-view behavioral test asserts orientation dynamics, position clamp, am-resize on pointer drag, slot/part presence — with no component edit"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "test/components/split-view.test.ts — 4 pass; src/components/split-view/split-view.ts unchanged (git status clean)"
        status: pass
    human_judgment: false
  - id: D4
    description: "am-breadcrumb-item block folded into existing breadcrumb.test.ts; no standalone item file"
    requirement: "TEST-01"
    verification:
      - kind: unit
        ref: "breadcrumb.test.ts contains the anchor-vs-current block and passes; no breadcrumb-item.test.ts exists"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 04: Remaining Display Splits + Behavioral Split-View Summary

**Split the last six display components into dedicated 1:1 jsdom smoke files, authored the one genuinely behavioral test of the set (split-view pointer-drag + clamp, matched exactly to the source), and folded am-breadcrumb-item coverage into its parent's file — all with zero component-source change and the grouped display-trivial.test.ts left intact for plan 08.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 3
- **Files:** 8 (7 created, 1 modified)

## Accomplishments
- Created dedicated smoke files for `progress-ring`, `side-nav`, `stat`, `status-dot`, `timeline`, `visually-hidden`, lifting the verbatim assertions out of `display-trivial.test.ts`.
- Covered both elements of the multi-element directories in one file each: `side-nav.test.ts` asserts `am-side-nav` (role=navigation, header/footer slots) plus `am-side-nav-item` (active + anchor href); `timeline.test.ts` asserts `am-timeline` (default slot) plus `am-timeline-item` (variant reflection).
- Authored the behavioral `split-view.test.ts` matched to the real implementation: runtime orientation change with `aria-orientation` following, out-of-range `position` clamped via applied `--_start-flex`/`--_end-flex`, an `am-resize` CustomEvent fired on a pointer-drag sequence (asserting clamp bounds, not zero-rect geometry), and `role="separator"` / `part="divider"` presence.
- Folded the `am-breadcrumb-item` anchor-vs-current block into the existing `breadcrumb.test.ts`; created no standalone item file.
- Left `display-trivial.test.ts` intact (plan 08 owns its single deletion). Full jsdom suite stays green: 68 files / 440 tests.

## Task Commits

1. **Task 1** — `a9be780` (test): split progress-ring, side-nav (+item), stat into dedicated files.
2. **Task 2** — `3df6a78` (test): split status-dot, timeline (+item), visually-hidden; fold breadcrumb-item into breadcrumb.test.ts.
3. **Task 3** — `88c7d68` (test): behavioral split-view (pointer-drag + clamp, no keyboard).

## Decisions Made
- **jsdom pointer capture is unimplemented.** A probe confirmed `PointerEvent` exists but `Element.setPointerCapture`/`releasePointerCapture` are `undefined` and throw. The drag test stubs these two no-ops on the divider in-test rather than editing the component — the source's `firstUpdated`/`_handlePointer*`/render stay byte-for-byte unchanged.
- **Zero-rect geometry.** jsdom returns zero-size rects, so the drag ratio computes to `Infinity` (clamped to 95). The test asserts the reported `position` is finite and within the source's `[5,95]` move clamp instead of a pixel value.
- **Honest surface only.** split-view has no keyboard resize and no `aria-valuenow`; the test asserts neither and the component was not extended to add them (threat T-01-04b mitigated).

## Deviations from Plan
None — plan executed exactly as written. Rules 1-3 not triggered; component source untouched.

## Known Stubs
None — every new file exercises a real component and real events; no placeholder/empty-data stubs introduced.

## Findings for Owning Phase (a11y — capture, not fix)
- `am-split-view`'s `role="separator"` exposes no keyboard resize and no `aria-valuenow`/`aria-valuemin`/`aria-valuemax`. WAI-ARIA authoring practices recommend a focusable separator with Arrow-key resize and value semantics for a resizable splitter. This is an API/behavior addition and is out of scope for this test-only phase; captured here for the component-owning phase to decide.

## Threat Flags
None — test-authoring only. No runtime code, network surface, or dependencies added (threat register T-01-04a accepted, T-01-04b mitigated by asserting only real behavior).

## Self-Check: PASSED
- All 7 created files present; `test/components/breadcrumb.test.ts` modified; `test/components/display-trivial.test.ts` still present.
- Commits `a9be780`, `3df6a78`, `88c7d68` exist in git history.
- `src/components/split-view/split-view.ts` unchanged (git status clean).
- Full jsdom project green: 68 files / 440 tests.

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*
