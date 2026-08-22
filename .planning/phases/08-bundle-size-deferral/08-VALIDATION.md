---
phase: 8
slug: bundle-size-deferral
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 08-RESEARCH.md `## Validation Architecture`; validate-phase completes the map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (3 projects: node/jsdom unit, browser lane, scripts) |
| **Config file** | vitest.config.ts / vitest.workspace |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run size && npm run test:browser` |
| **Estimated runtime** | ~TBD seconds (fill at validate-phase) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run full suite (unit + size report + browser lane)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** TBD seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 0 | SIZE-01..05 | — | N/A | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Seed row only — the planner/validate-phase expands one row per task. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Enumerated in 08-RESEARCH.md `### Wave 0 Gaps`. Filled at validate-phase:*
- [ ] Registration-smoke spec (SIZE-03) — `customElements.get('am-…')` after import; genuinely new
- [ ] Deep-import purity assertion (SIZE-01/SIZE-04) — floating-ui absent from non-overlay deep-import entries
- [ ] No-`0,0`-frame + focus-order real-browser check (SIZE-01) on throttled profile
- [ ] Reuse existing no-bundled-Lit assertion (SIZE-03) — script + external-array snapshot

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*Target: all phase behaviors have automated verification (real-browser lane covers the flash/focus checks).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < TBD s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
