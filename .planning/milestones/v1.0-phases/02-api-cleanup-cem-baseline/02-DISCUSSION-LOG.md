# Phase 2: API Cleanup + CEM Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-13
**Phase:** 2-api-cleanup-cem-baseline
**Areas discussed:** Canonical naming rules, Migration & Changeset strategy, Big-4 refactor approach, Frozen-surface scope & audit format

---

## Canonical naming rules

### Overlay lifecycle event vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| open / close | Matches native `<dialog>` + existing majority (dialog, drawer, command-palette, toast); rename dropdown/popover/context-menu | ✓ |
| show / hide | Matches native Popover API; rename dialog/drawer/command-palette/toast instead (more churn) | |
| You decide | Claude picks by native-platform alignment | |

**User's choice:** open / close

### Selection event vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| am-change canonical | Value controls (select, data-grid) → am-change; discrete actions (menu, list, command-palette) → am-select; split by semantics | ✓ |
| am-select everywhere | One event name, context in detail; conflates value-change with fire-once actions | |
| You decide | Claude maps each component to native analogues | |

**User's choice:** am-change canonical (semantic split)

### Normalization aggressiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Full normalization | Fix every outlier the matrices surface; pre-freeze is the only window | ✓ |
| Conservative | Only fix egregious cases; minimize breaking churn | |
| You decide | Case-by-case | |

**User's choice:** Full normalization

**Notes:** Scout surfaced concrete outliers before the question — overlay open/close vs show/hide, three-way selection fork, change/toggle fork — grounding the canonical-vocabulary choice.

---

## Migration & Changeset strategy

### Backward-compat policy

| Option | Description | Selected |
|--------|-------------|----------|
| Hard rename, no aliases | Remove old names outright; Changesets document breaks; keeps CEM baseline honest | ✓ |
| Deprecation aliases | Old name works + warns through 1.0; adds surface + code freeze must carry | |
| You decide | Alias highest-traffic, hard-rename rest | |

**User's choice:** Hard rename, no aliases

### Changeset granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per dimension wave | One Changeset per normalization wave; maps to audit matrices; reviewable | ✓ |
| Per individual rename | Literal API-02; 30+ noisy files | |
| Per component | One per component touched | |

**User's choice:** Per dimension wave

### Consumer migration guide

| Option | Description | Selected |
|--------|-------------|----------|
| Changesets only now | Rely on aggregated changelog; polished guide is Phase 5 | ✓ |
| Write MIGRATION.md now | Author old→new table this phase | |
| You decide | Based on rename volume | |

**User's choice:** Changesets only now (MIGRATION.md → Phase 5)

---

## Big-4 refactor approach

### Decomposition mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Lit Reactive Controllers | Idiomatic; own host lifecycle; testable; no registered element; tests unchanged | ✓ |
| Plain helper modules | Simplest; doesn't own lifecycle | |
| You decide | Mix per component | |

**User's choice:** Lit Reactive Controllers

### Refactor depth

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted shared machinery | Extract floating-ui / keyboard-nav / filtering into reusable controllers; leave component-specific inline | ✓ |
| Full split to line budget | Decompose until every file under target size; over-fragmentation risk | |
| You decide | Set per component | |

**User's choice:** Targeted shared machinery

### Extracted-code placement

| Option | Description | Selected |
|--------|-------------|----------|
| src/internal/ (non-exported) | Reuse planned boundary; off frozen surface + package exports; Phase 3/4 build on it | ✓ |
| Co-locate per component | Beside component; duplicates shared machinery | |
| You decide | Shared → internal, component-only co-located | |

**User's choice:** src/internal/ (non-exported)

**Notes:** Reinforced hard constraint — refactor is behavior-preserving; leak/autoUpdate fixes stay Phase 3/4 even though extracted controllers are their natural home.

---

## Frozen-surface scope & audit format

### Token freeze scope

| Option | Description | Selected |
|--------|-------------|----------|
| All documented --am-* (@cssprop) | Global + per-component tokens + all parts/slots in CEM; max consumer trust | ✓ |
| Global tokens + parts/slots only | Per-component --am-{c}-* stay fluid; smaller frozen surface | |
| You decide | Per token class | |

**User's choice:** All documented --am-* (@cssprop) + parts + slots

### Audit matrix format/location

| Option | Description | Selected |
|--------|-------------|----------|
| Committed api/AUDIT.md | Markdown matrices under api/ next to baseline; durable reference; unpublished | ✓ |
| .planning artifact only | Under .planning/phases/02/; not durable repo reference | |
| You decide | Claude picks | |

**User's choice:** Committed api/AUDIT.md

### Surface-diff mechanism (report-only)

| Option | Description | Selected |
|--------|-------------|----------|
| Small JSON comparator now | Trivial diff script, zero deps; defer @wc-toolkit/changelog to Phase 6 | ✓ |
| @wc-toolkit/changelog now | Adopt real tool so Phase 6 only flips report→enforce; heavier, less validated | |
| You decide | MEDIUM-confidence tooling call | |

**User's choice:** Small JSON comparator now

### Baseline capture point

| Option | Description | Selected |
|--------|-------------|----------|
| Start, re-commit per wave | Snapshot at start; re-commit after each approved wave; CI diff flags only unintended drift | ✓ |
| Once, after all cleanup | Single capture at end; no drift-catching during cleanup | |
| You decide | Sequenced in planning | |

**User's choice:** Start, re-commit per wave

---

## Claude's Discretion

- Exact per-component rename mapping produced by the audit (vocabulary set by D-01/D-02; matrices enumerate each outlier + target).
- `data-grid` selection event payload shape reconciled under `am-change` (single vs multi-select).
- Prop / boolean-naming / default-value outliers not yet enumerated — normalized under the full-normalization policy.
- Controller decomposition granularity and the exact shared-controller set.
- Plain helper module vs controller for pure-logic extraction.

## Deferred Ideas

- `@wc-toolkit/changelog` — evaluate at Phase 6 enforcing flip (SHIP-01).
- MIGRATION.md consumer guide — Phase 5 (Documentation).
- Leak/lifecycle fixes exposed during refactor — Phase 3 (FIX-01→04).
- `autoUpdate` gating on extracted floating-ui controller — Phase 4 (PERF-04).
- `@microsoft/api-extractor` `.d.ts` surface guard — v2 (TEST-V2-02).
