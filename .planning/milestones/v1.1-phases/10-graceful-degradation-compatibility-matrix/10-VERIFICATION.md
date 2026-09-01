---
phase: 10-graceful-degradation-compatibility-matrix
verified: 2026-08-28T00:33:34Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  note: initial verification
requirements:
  COMPAT-01: satisfied
  COMPAT-02: satisfied
  COMPAT-03: satisfied
  COMPAT-04: satisfied
  COMPAT-05: satisfied
  COMPAT-06: satisfied
documented_limits:  # WINDOWS.md — not phase gaps
  - id: 4
    kind: todo
    summary: ":not(:has(::slotted(*))) empty-slot-collapse rules are inert (::slotted invalid inside :has()); guarded for COMPAT-06, repairing the collapse feature is a separate out-of-scope behavior change. Above-floor output byte-identical (inert before and after)."
  - id: 5
    kind: deviation
    summary: "am-drawer × WebKit native <dialog> modal-inertness does not block a programmatic opener.focus(); assertion exempted on WebKit only with citation. am-dialog unaffected. focus-in and focus-restoration still asserted on all engines."
---

# Phase 10: Graceful Degradation & Compatibility Matrix Verification Report

**Phase Goal:** Below the Safari 16.4 floor, elements degrade instead of silently failing — capabilities are probed independently, forms feature-detect ElementInternals (with an opt-in hidden-input fallback), CSS-feature failures are guarded — and a widened WebKit/Firefox/Chromium lane validates it all against a documented true per-capability floor. All surface-preserving EXCEPT COMPAT-03, which ships with a Changeset.
**Verified:** 2026-08-28T00:33:34Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | `capabilities.ts` probes each sub-capability independently (form-association vs ARIA reflection vs `adoptedStyleSheets` vs `:has()`), memoized, jsdom capability-off tests (COMPAT-01) | ✓ VERIFIED | `src/internal/helpers/capabilities.ts:38-92` — four `??=`-memoized booleans, each with its own module-level cache, plus `__resetCapabilitiesForTest`. `test/capabilities.test.ts` proves independence/adjacency (forcing form-association false leaves `hasAdoptedStyleSheets`/`supportsHas` unchanged) and boolean-return-never-throw. All 111 phase jsdom tests pass; browser `capabilities.test.ts` passes on Chromium+WebKit+Firefox. |
| 2 | Form controls feature-detect ElementInternals; constructor no longer throws below floor; element still upgrades/renders/emits (surface-preserving) (COMPAT-02) | ✓ VERIFIED | `attach-internals-safe.ts:30-39` gates `host.attachInternals()` on `hasFormAssociation()` + try/catch → null. All 16 attach sites across 15 component files call `attachInternalsSafe(this)`; zero raw `this.attachInternals()` remain. `capabilities-off-constructor*.test.ts` (×4) prove construct/connect/render-no-throw below floor for all 16 form tags. |
| 3 | Below the floor, hidden-input Light-DOM fallback (`form-participation.ts`) restores submission, XOR-gated on absent `setFormValue` (no double-submit), ships with a Changeset (COMPAT-03) [CS] | ✓ VERIFIED | `form-participation.ts` (idempotent find-or-create mirror, teardown, once-dedup warn). XOR gate wired per component: `this.internals?.setFormValue(...)` only when present; `if (!this.internals){ isFormFallbackEnabled()? syncFormFallback : warnBelowFloorOnce }` only when absent. Changeset `.changeset/compat-forms-fallback.md` = `minor`. `form-fallback-integration.batch-*.test.ts` prove FormData parity + XOR; browser `form-fallback.test.ts` passes on 3 engines. |
| 4 | CSS-feature audit (`:has()`, container queries, `adoptedStyleSheets`) guards silent visual failures (COMPAT-06) | ✓ VERIFIED | 10 `:not(:has(::slotted(*)))` rules across 6 files each wrapped in `@supports selector(:has(*))` with functional default outside; zero unguarded `:has()` remain; zero container queries in `src/components`. `test/css-supports-guard.test.ts` source-asserts guard shape; browser `supports-guards.test.ts` passes on 3 engines. |
| 5 | Widened WebKit+Firefox lane validates degradation (CDP throttling stays Chromium-only); `BROWSER_SUPPORT.md` documents true floor = max(JS-API, CSS-feature) + degradation matrix (COMPAT-04, COMPAT-05) | ✓ VERIFIED | `vitest.config.ts` browser project instances = chromium(full) + webkit/firefox(7-spec `D06_WIDENED_SPECS`); perf project stays chromium-only. CI installs `chromium webkit firefox` for browser job, `chromium` only for perf. All 3 new browser specs ran green on 3 engines here. `BROWSER_SUPPORT.md` documents floor, ARIA-reflection as its own row (empirically Firefox 153), Graceful Degradation section + compat-forms opt-in by exact import path; `test/browser-support-doc.test.ts` guards it. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/internal/helpers/capabilities.ts` | 4 independent memoized probes + reset | ✓ VERIFIED | Substantive, off-CEM header, not re-exported from barrels |
| `src/internal/helpers/attach-internals-safe.ts` | guarded attach → null | ✓ VERIFIED | Imports `hasFormAssociation`; try/catch; wired to 15 files |
| `src/internal/helpers/form-participation.ts` | idempotent mirror + XOR helpers + once-warn | ✓ VERIFIED | WeakMap find-or-create, teardown, `document.createElement` only (no innerHTML/eval) |
| `src/compat-forms.ts` | opt-in side-effect entry | ✓ VERIFIED | Calls `enableFormFallback()`; registers no element; re-exports nothing |
| `.changeset/compat-forms-fallback.md` | minor changeset for subpath | ✓ VERIFIED | `minor`; documents XOR/no-double-submit/opt-in, CEM unchanged |
| CSS guards (6 layout components) | 10 `@supports selector(:has(*))` rules | ✓ VERIFIED | card/panel/dialog/drawer/side-nav/app-shell |
| Phase test suite (11 jsdom + 3 browser) | present + passing | ✓ VERIFIED | 111 jsdom pass; 3 browser specs × 3 engines pass |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `attach-internals-safe.ts` | `capabilities.ts` | imports `hasFormAssociation`, gates attach | ✓ WIRED |
| 16 form components | `attachInternalsSafe` | constructor call, no raw `attachInternals()` | ✓ WIRED |
| Value components | `syncFormFallback`/`warnBelowFloorOnce`/`teardownFormFallback` | `if(!internals)` XOR branch + disconnect teardown | ✓ WIRED |
| `compat-forms.ts` | `enableFormFallback` | module-level side effect | ✓ WIRED |
| `package.json` `./compat-forms` | `dist/compat-forms.js` | exports + sideEffects + vite lib entry `compat-forms` | ✓ WIRED |
| `scripts/smoke-pack.mjs` | subpath resolution | SUBPATHS includes `@willramanand/amris/compat-forms` | ✓ WIRED |
| `vitest.config.ts` | WebKit/Firefox instances | scoped to `D06_WIDENED_SPECS` (7 specs) | ✓ WIRED |
| `.github/workflows/ci.yml` | playwright binaries | browser job installs webkit+firefox; perf job chromium-only | ✓ WIRED |
| `BROWSER_SUPPORT.md` | compat-forms opt-in | referenced by exact import path | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase jsdom suite (capabilities, fallback, guards, doc) | `vitest run --project jsdom <11 files>` | 11 files / 111 tests pass | ✓ PASS |
| Type integrity (nullable propagation) | `tsc --noEmit` | exit 0 | ✓ PASS |
| Capability probes on 3 real engines | `vitest run --project browser test/browser/capabilities.test.ts` | 3 files (×engines) / 12 pass | ✓ PASS |
| Below/above-floor form-fallback + CSS collapse on 3 engines | `vitest run --project browser form-fallback + supports-guards` | 6 files / 30 pass | ✓ PASS |

### Surface-Freeze Verification

| Check | Status | Details |
| ----- | ------ | ------- |
| `docs/contract.md` CEM drift | ✓ CLEAN | `git diff` shows no content change (line-ending normalization only) — frozen v1.0 props/events/slots/parts/tokens unchanged |
| Internal helpers off public surface | ✓ CLEAN | capabilities / attach-internals-safe / form-participation / compat-forms not re-exported from `src/index.ts` or `src/index.all.ts` |
| Only surface change = opt-in subpath | ✓ EXPECTED | `@willramanand/amris/compat-forms` is CEM-invisible (registers no element), ships with minor Changeset per COMPAT-03 [CS] |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| ----------- | ------------ | ------ | -------- |
| COMPAT-01 | 10-01 | ✓ SATISFIED | `capabilities.ts` independent memoized probes + jsdom capability-off/adjacency tests |
| COMPAT-02 | 10-01, 10-04, 10-05, 10-06 | ✓ SATISFIED | `attachInternalsSafe` wired to all 16 attach sites; constructor-no-throw tests for all 16 tags |
| COMPAT-03 | 10-02, 10-04, 10-05, 10-06 | ✓ SATISFIED | `form-participation.ts` + `compat-forms` subpath + minor Changeset; XOR gate + FormData-parity tests |
| COMPAT-04 | 10-07 | ✓ SATISFIED | Widened WebKit/Firefox lane (perf stays Chromium); 3 new specs green on 3 engines |
| COMPAT-05 | 10-08 | ✓ SATISFIED | `BROWSER_SUPPORT.md` true floor + degradation matrix + compat-forms path; doc-guard test |
| COMPAT-06 | 10-03 | ✓ SATISFIED | 10 `@supports selector(:has(*))` guards / 6 files; zero unguarded `:has()`; zero container queries |

No orphaned requirements — all 6 COMPAT IDs in REQUIREMENTS.md are claimed by plans and satisfied.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| (new helpers + compat-forms) | debt markers (TODO/FIXME/XXX/HACK) | none | ℹ️ None found |

Documented limits (WINDOWS.md, NOT gaps):
- **#4 (todo, card.ts:84):** empty-slot-collapse `:not(:has(::slotted(*)))` rules are inert because `::slotted` is invalid inside `:has()` — the collapse feature was already inert before this phase, so above-floor output is byte-identical; the `@supports` guard for COMPAT-06 is correctly present; repairing the collapse feature is an out-of-scope behavior change. Not a Phase 10 regression.
- **#5 (deviation, overlay-focus.test.ts:108):** am-drawer × WebKit modal-inertness divergence, exempted on WebKit only with an in-code citation; focus-in and focus-restoration still asserted on all engines; am-dialog unaffected. Documented engine quirk, not a weakened check.

### Human Verification Required

None. Every behavior-dependent truth (below-floor no-throw, XOR no-double-submit, FormData parity, once-dedup warn, above-floor byte-identical collapse, per-capability probe on real engines) is exercised by a passing automated test (jsdom + 3-engine browser lane) run during this verification.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria and all 6 COMPAT requirements are satisfied with source, wiring, and behavioral-test evidence. The frozen v1.0 CEM surface is unchanged (no content drift in `docs/contract.md`); the sole surface addition is the CEM-invisible opt-in `@willramanand/amris/compat-forms` subpath, correctly shipped with a minor Changeset. Two documented limits are tracked in WINDOWS.md and are not phase gaps.

---

_Verified: 2026-08-28T00:33:34Z_
_Verifier: Claude (gsd-verifier)_
