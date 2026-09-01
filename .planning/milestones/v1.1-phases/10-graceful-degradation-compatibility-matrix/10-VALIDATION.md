---
phase: 10
slug: graceful-degradation-compatibility-matrix
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (jsdom project + Browser Mode / Playwright) |
| **Config file** | `vitest.config.*` / browser config (Wave 0 adds WebKit + Firefox instances — A1) |
| **Quick run command** | `npx vitest run --project jsdom` |
| **Full suite command** | `npm run test:browser` (load-bearing + degradation, cross-engine) |
| **Estimated runtime** | ~{N} seconds (fill during Wave 0) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --project jsdom`
- **After every plan wave:** Run `npm run test:browser`
- **Before `/gsd-verify-work`:** Full suite must be green (Chromium + WebKit + Firefox)
- **Max feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 0 | COMPAT-01 | — | capability-off probes return false (global-shim) | unit | `npx vitest run --project jsdom` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — planner + validate-phase complete this table.*

---

## Wave 0 Requirements

- [ ] WebKit + Firefox Playwright binaries installed for the `browser` job (not `perf`)
- [ ] Resolve A1: exact Vitest 4.1.9 per-instance `include` key vs separate project per engine
- [ ] jsdom capability-off shim harness (delete/stub `setFormValue`, `adoptedStyleSheets`, `CSS.supports(':has()')`)
- [ ] `__resetCapabilitiesForTest` reset hook for deterministic probe-off specs

*Planner + validate-phase finalize this list from RESEARCH.md Validation Architecture.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| True per-capability floor on real below-16.4 Safari | COMPAT-05 | No CDP below-floor engine in CI; empirical (A2) | Document observed floor in BROWSER_SUPPORT.md from real-device / caniuse cross-check |

*A2 (Firefox ARIA-reflection ship version) resolves empirically on the widened matrix — COMPAT-05 by design.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (use `vitest run`, never bare `npm test`)
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
