# Phase 10: Graceful Degradation & Compatibility Matrix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-25
**Phase:** 10-graceful-degradation-compatibility-matrix
**Areas discussed:** Fallback opt-in trigger, Below-floor DX signal, CSS-feature degradation, Test-matrix breadth

---

## Fallback opt-in trigger (COMPAT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Global side-effect opt-in | One import/call at app init; below-floor only; all form components; no new prop-surface attribute | ✓ |
| Per-element attribute | `<am-input form-fallback>`; granular but adds a boolean across 16 components | |
| Auto-on below floor | No opt-in; contradicts requirement's explicit "opt-in" framing | |

**User's choice:** Global side-effect opt-in
**Notes:** Below-floor only; at/above floor it's a no-op (ElementInternals wins, XOR — no double-submit).

### Opt-in shape (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Side-effect subpath import | `@willramanand/amris/compat-forms`; adds one exports subpath; index export list stays frozen | |
| Named function export | `enableFormFallback()`; adds a runtime named export to the main entry | |
| You decide | Research/planner picks packaging vs exports map + Changeset | ✓ |

**User's choice:** You decide — captured as "global side-effect opt-in, packaging TBD by research"
**Notes:** Preference signal recorded: keep index.ts export list unchanged if feasible (subpath shape).

### Fallback fidelity (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Value submission only | Hidden input mirrors value; no native validation below floor | |
| Value + native validation | Also project `required`/`pattern` onto hidden input so browser blocks invalid submit | ✓ |

**User's choice:** Value + native validation
**Notes:** Broader reach; planner must prove no double-validation vs above-floor path (XOR).

---

## Below-floor DX signal (COMPAT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| One-time console.warn | Warn once (global dedupe) below floor + fallback OFF; names missing capability; points to /compat-forms | ✓ |
| Silent (no warn) | Renders/emits but never warns; close to the silent-fail being fixed | |
| Warn per component tag | Same warning deduped per tag name; noisier | |

**User's choice:** One-time console.warn
**Notes:** Fires only below floor with fallback OFF; if fallback enabled → silent.

---

## CSS-feature degradation (COMPAT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| @supports CSS fallback | Functional default + modern enhancement; pure CSS, no JS timing/FOUC | ✓ |
| JS-probe + host class | capabilities.ts sets host class; FOUC risk, couples visuals to JS | |
| Document-only | Audit lists usages in BROWSER_SUPPORT.md; no code guard (under-delivers "guards") | |

**User's choice:** @supports CSS fallback

### Guard scope (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Functional-breaking only | Guard only usability-breaking cases; document cosmetic ones | |
| Guard every usage | @supports fallback for every `:has()`/CQ rule, including cosmetic | ✓ |

**User's choice:** Guard every usage
**Notes:** `adoptedStyleSheets` already covered by Lit's internal fallback — no new guard there.

---

## Test-matrix breadth (COMPAT-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Load-bearing + degradation subset | WebKit+FF run the 4 load-bearing specs + new Phase-10 specs; full lane + throttle Chromium-only | ✓ |
| Full browser lane × 3 | Every browser spec on all 3 engines; slower/flakier | |
| Degradation subset only | WebKit+FF run only new specs; misses WebKit/FF quirks in load-bearing paths | |

**User's choice:** Load-bearing + degradation subset
**Notes:** Matches requirement wording; avoids the barred exhaustive every-component × every-engine matrix.

---

## Claude's Discretion

- Exact fallback packaging (subpath side-effect import vs named export) — research decides vs the `exports` map + Changeset discipline.
- `capabilities.ts` probe API shape + memoization shape — planner, following the Phase-9 probe-once idiom.
- COMPAT-02 feature-detect: per-constructor try/catch vs shared guarded helper — planner picks (shared helper matches the `src/internal/` chokepoint pattern).
- Which fixtures/components represent each degradation scenario in the cross-engine specs.
- The true empirical per-capability floor (BROWSER_SUPPORT.md) — resolved by the research agent on the widened matrix.

## Deferred Ideas

- Additional offered-but-declined gray areas: probe API shape, BROWSER_SUPPORT.md floor-claim ambition, COMPAT-03 Changeset semver-bump level.
- `RTL-V2-01` (full RTL overlay audit) and `TEST-V2-02` (api-extractor `.d.ts` guard) → v2.
- Budget-enforcing flips + per-component cost cards → Phase 11 (GATE-*, DOCS-04).

## Cross-cutting signal

User consistently chose maximal graceful-degradation reach (value+validation, guard-every-usage) over cheaper options, knowingly accepting higher proof/authoring cost.
