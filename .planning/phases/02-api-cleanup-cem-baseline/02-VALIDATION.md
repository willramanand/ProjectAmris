---
phase: 2
slug: api-cleanup-cem-baseline
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1 (jsdom project + browser/Chromium project) |
| **Config file** | `vitest.config.ts` (Phase 1 characterization suite: `test/components/*.test.ts`, `test/helpers.ts`) |
| **Quick run command** | `npm run test:run` (vitest run, jsdom) |
| **Full suite command** | `npm run test:run && npm run test:browser` |
| **Estimated runtime** | ~60–120 seconds (jsdom quick; browser adds Chromium boot) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run`
- **After every plan wave:** Run `npm run test:run && npm run test:browser`
- **Before `/gsd-verify-work`:** Full suite must be green; `npm run build:manifest` must succeed and `scripts/cem-diff.mjs` must run clean
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

> Seeded draft — validate-phase fills the concrete per-task rows from PLAN.md `<verify>` blocks.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-XX-XX | XX | 0–N | API-01..05 | — | N/A | unit | `npm run test:run` | ⬜ TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/` directory created (holds `custom-elements.baseline.json` + `AUDIT.md`) — kept out of package `files`/`exports`
- [ ] `scripts/cem-diff.mjs` — report-only CEM surface comparator (D-13); normalizes by `tagName`, sorts members, strips `source`
- [ ] `test/cem-diff.test.ts` (or equivalent) — unit test for the comparator's normalize/diff logic
- [ ] CI job in `.github/workflows/ci.yml` — runs `cem analyze` + `cem-diff.mjs`, report-only (non-failing this phase)
- [ ] `src/internal/` boundary established (new; absent from barrels + `exports`) for extracted controllers

*Existing infrastructure (Phase 1 vitest characterization suite) covers refactor behavior-preservation validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit-matrix completeness/correctness (`api/AUDIT.md` dimension tables) | API-01 | Judgment call — matrices reconcile CEM `@fires` vs live `dispatchEvent` grep; correctness is reviewer-assessed | Human review of `api/AUDIT.md` against the CONVENTIONS.md dimensions across ~67 components |
| Report-only diff output reviewability (wave-by-wave drift is legible, not red-CI) | API-05 | Report-only by design this phase; "informs review without failing build" is a human-read signal | Inspect CI job log for a readable surface-diff summary after a normalization wave |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
