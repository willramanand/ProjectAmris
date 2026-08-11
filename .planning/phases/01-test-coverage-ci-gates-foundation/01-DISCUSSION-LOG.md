# Phase 1: Test Coverage + CI Gates Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 1-test-coverage-ci-gates-foundation
**Areas discussed:** Coverage threshold policy, Test depth for the 20 untested, Gate rollout / enforcement staging, Bundle-size budget baseline

---

## Coverage threshold policy

**Q1 — How should the coverage gate be set and enforced during Phase 1?**

| Option | Description | Selected |
|--------|-------------|----------|
| Ratchet from baseline → fixed floor | Measure current, gate at that floor now (blocks regressions), raise as the 20 components land toward a committed end-of-phase target | ✓ |
| Fixed target immediately | Commit to 85/85/80/85 from the start; CI stays red until all 20 tested | |
| You decide the numbers | Lock ratchet strategy, Claude picks concrete end-of-phase thresholds during planning | |

**User's choice:** Ratchet from baseline → fixed floor

**Q2 — Which coverage metric(s) should gate, and should thresholds vary by directory?**

| Option | Description | Selected |
|--------|-------------|----------|
| Branch + per-directory tiers | Gate on branch coverage, stricter on form/overlay dirs, looser on display | ✓ |
| Branch, single global threshold | Branch + lines, one repo-wide number | |
| Lines only, global | Simplest, most gameable | |

**User's choice:** Branch + per-directory tiers
**Notes:** End-of-phase threshold numbers left to Claude's discretion during planning (from measured baseline).

---

## Test depth for the 20 untested

**Q1 — What test-depth standard should the 20 untested components meet?**

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered by component type | Smoke/render+ARIA for simple display; full behavioral for interactive | ✓ |
| Uniform full behavioral for all | Full interactive treatment regardless of complexity | |
| Required-scenarios checklist per interactive | Tiered PLUS a mandatory scenario checklist for every interactive component | |

**User's choice:** Tiered by component type
**Notes:** User chose tiered over the heavier mandatory-checklist option — no per-component scenario contract imposed.

---

## Gate rollout / enforcement staging

**Q1 — How should the new CI gates roll out — enforce immediately or stage in?**

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce as each gate lands | Each gate hard-blocks the moment it's wired; baselines from current state so nothing retro-red | ✓ |
| Report-only → flip at phase end | Advisory until phase completes, then flip in one commit | |
| Mixed: fast gates enforce, browser lane report-only | Coverage/size/jsdom enforce now; browser+a11y advisory until proven stable | |

**User's choice:** Enforce as each gate lands

**Q2 — Where should the slow real-browser lane run, and what should local `npm test` require?**

| Option | Description | Selected |
|--------|-------------|----------|
| Every PR in CI; local opt-in | Browser lane + a11y on every PR (headless Chromium); local default jsdom-only, `npm run test:browser` on demand | ✓ |
| Every PR; local always-on | Browser lane on every PR and in default local test command; all contributors need Playwright | |
| Main/nightly only; local opt-in | Browser lane only on main merges / nightly | |

**User's choice:** Every PR in CI; local opt-in

---

## Bundle-size budget baseline

**Q1 — How should the per-entry size-limit budgets be set?**

| Option | Description | Selected |
|--------|-------------|----------|
| Measure current + headroom | Measure current min+gzip size, set budget ~5–10% above; ratchet down later | ✓ |
| Fixed absolute caps | Target caps independent of current size | |
| You decide during planning | Lock measure+headroom strategy, Claude sets exact numbers | |

**User's choice:** Measure current + headroom

**Q2 — Which entries get budgeted, and how is tree-shaking guarded?**

| Option | Description | Selected |
|--------|-------------|----------|
| Core + full + sample components + TS assertion | Budget core, full, representative single-component imports; import-one-component tree-shaking assertion | ✓ |
| Core + full only | Just the two aggregate bundles | |
| Every per-component entry | Budget all ~67 single-component entries | |

**User's choice:** Core + full + sample components + tree-shaking assertion
**Notes:** Exact per-entry kB numbers and which representative components left to Claude's discretion during planning (from real build output).

---

## Claude's Discretion

- End-of-phase coverage threshold numbers per tier (from measured baseline + per-component risk).
- Exact per-entry bundle-size kB budgets and which representative components to budget (from real build output).
- Coverage instrumentation across the two Vitest projects (V8 vs istanbul fallback for the browser project) — MEDIUM-confidence research item to resolve during planning.

## Deferred Ideas

- Mutation testing (Stryker) spot-check on combobox/dialog/form base — research suggestion, not a Phase 1 requirement; follow-up if the branch+per-dir gate proves insufficient.
- WebKit/Safari 16.4 real-browser lane (TEST-V2-01) — v2.
- `@microsoft/api-extractor` `.d.ts` surface guard (TEST-V2-02) — deferred; CEM diff is the primary surface guard.
