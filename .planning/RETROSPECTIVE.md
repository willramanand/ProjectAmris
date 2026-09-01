# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Performance & Compatibility Hardening

**Shipped:** 2026-08-31
**Phases:** 5 (7–11) | **Plans:** 29 | **Tasks:** 65

### What Was Built
- Reproducible throttled measurement harness + committed brotli-size and count-metric baselines; `low-end-cellular` (6× CPU + Slow-3G) profile chosen from real data (Phase 7).
- Bundle-size deferral: `@floating-ui/dom` and `@lit-labs/virtualizer` moved off every overlay/data-grid/combobox/select synchronous graph behind shared memoized dynamic imports, behavior-preserving, with a cold-chunk functional `repeat()` fallback (Phase 8).
- Runtime perf tuning: identity-keyed memos for data-grid sort, combobox filter, and shared overlay middleware — fewer redundant computes with byte-identical output and a11y DOM, durable before/after baselines (Phase 9).
- Graceful degradation below Safari 16.4: independently-memoized capability probes, a guarded `attachInternalsSafe()` seam across all 16 form components, the opt-in `/compat-forms` hidden-input fallback, `@supports`-guarded `:has()`, and a widened WebKit/Firefox/Chromium lane with a documented true per-capability floor (Phase 10).
- CI gate enforcement: size + runtime-count budgets flipped report-only → enforcing (soak-staged off the release path), GATE-03 A1 confirmed live, and drift-gated per-component cost cards published (Phase 11).

### What Worked
- **Tracer-first per phase** — prove the mechanism end-to-end on one component/one lever, then fan out. Kept expansion low-risk across 16 form components and 6 overlays.
- **Zero-dependency measurement scripts** (`size-baseline.mjs`, `perf-diff.mjs`, `build-cost-cards.mjs`) cloned the same config → script → committed baseline → deterministic diff spine, so each later phase reused a proven pattern.
- **Soak-staged gate flip** (`continue-on-error` on `size`/`perf`) let the enforcing gates land without risking a publish while stability was characterized.

### What Was Inefficient
- **Main CI drifted red mid-milestone and went unnoticed until close** — a jsdom coverage-threshold regression (later phases added jsdom-unreachable functions) plus a Playwright runner host-deps break. There was no continuously-green-baseline gate, so both surfaced only when GATE-03's live A1 check needed a green run. Cost an extra debug + quick-fix + PR before the milestone could close.
- **The GATE-03 A1 lever was coupled** — the obvious lever (tighten `api/size.baseline.json`) also feeds `build-cost-cards.mjs`, tripping the *hard* cost-cards drift gate and failing the first A1 attempt. The clean lever is `.size-limit.json` (or bumping actual built size), which no other gate reads.

### Patterns Established
- **report-only → enforcing → soak-staged** gate discipline (size deterministic un-soaks first, perf counts second, wall-clock never gates).
- **Capability-probe + guarded-attach seam** for below-floor degradation without polyfills.
- **Deferred dynamic-import loader with a cold-chunk functional fallback** for shipping heavy deps lazily while staying behavior-preserving.

### Key Lessons
1. Keep the main CI baseline continuously green — a coverage/infra regression that hides for a whole milestone becomes a surprise blocker at close. Consider a periodic push-to-main CI (not just PR) or a coverage-drift check.
2. To exercise a soaked gate, pick a lever that touches ONLY that gate. Baseline files (`api/*.baseline.json`) feed the hard cost-cards gate; use `.size-limit.json` or a real built-size bump instead.

### Cost Observations
- Model: Opus (this session). Detailed model-mix/session accounting not instrumented for v1.1.
- Notable: the milestone was *executed* across earlier sessions (phases 7–11) and *closed* in one session that also fixed two pre-existing CI blockers before it could ship green.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 6 | Froze + published the public API; established coverage/size/a11y CI gates |
| v1.1 | 5 | Measure-first harness → deferral/tuning → graceful degradation → enforcing perf/size gates (soak-staged) |

### Cumulative Quality

| Milestone | Notable |
|-----------|---------|
| v1.0 | Frozen CEM surface + enforcing surface-diff gate; published to GitHub Packages |
| v1.1 | Enforcing brotli-size + runtime-count gates; widened WebKit/Firefox/Chromium test lane; per-component cost cards |

### Top Lessons (Verified Across Milestones)

1. Zero-dependency, committed-baseline + deterministic-diff scripts are a reusable, low-cost spine for any CI gate (coverage → size → perf → cost cards).
2. Behavior- and surface-preserving change is enforceable, not aspirational, when a committed baseline + CI diff backs it.
