---
phase: 07
slug: measurement-baselines-budgets
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-22
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → devDependencies | Three build/measurement packages (rollup-plugin-visualizer, @size-limit/esbuild-why, tachometer) enter the toolchain | Package tarballs, dev-only |
| perf project → browser server (cdp) | `cdp()` requests elevated write+exec on the Chromium test-browser API | CDP debugging commands |
| perf spec (in-page) → writeMetrics (Node) | Metrics object crosses from the browser page to a server-side file write | Perf count/wall-clock JSON |
| dist/** build output → measurement scripts | Guards/baselines read only freshly-built in-repo artifacts | Built bundle bytes |
| committed baselines (size/perf) → CI diff | Trusted in-repo baseline compared against a fresh measurement | JSON baselines |
| CI jobs → repo permissions | New report-only jobs must inherit read-only, no publish scope | GitHub Actions token scope |
| dev attribution tools → build output | Env-gated, dev-only tools must not enter the shipped tarball | Visualizer report, check output |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-SC | Tampering | rollup-plugin-visualizer / @size-limit/esbuild-why / tachometer install | low | mitigate | Pinned versions from HIGH-confidence STACK research; lockfile committed; all Approved in Package Legitimacy Audit; kept in devDependencies; `package.files` = `["dist","README.md"]` so none ships (verified) | closed |
| T-07-EP | Elevation of Privilege | `cdp()` write+exec grant | low | mitigate | `test.browser.api.{allowWrite,allowExec}` scoped to the `perf` vitest project ONLY, isolated from the `browser` project, never on the shipped build; CI perf job inherits `permissions: contents: read` (verified vitest.config.ts + ci.yml) | closed |
| T-07-ID | Info disclosure | Dev tool / visualizer / tachometer config leaking into published tarball | low | mitigate | Env-gate the visualizer (default off); tools in devDependencies; `package.files` = `["dist","README.md"]` (verified) | closed |
| T-07-01 | Tampering | `.size-limit.json` ignore re-scope hiding a shipped byte | medium | mitigate | `@floating-ui/dom` removed from ignore (honest payload); separate no-bundled-Lit guard covers `lit`; `api/size.baseline.json` committed + diffed in CI (baseline present) | closed |
| T-07-02 | Tampering | `size-baseline.mjs` / `perf-diff.mjs` read only trusted in-repo JSON | low | accept | No external input; V5 input-validation surface is a committed baseline the repo owns (RESEARCH Security Domain) | closed |
| T-07-03 | Tampering | Accidentally-inlined Lit copy invisible to size-limit | medium | mitigate | Two independent guards — `scripts/assert-no-bundled-lit.mjs` (dist marker grep) + external-array snapshot — neither relying on size-limit's `lit` ignore (present) | closed |
| T-07-04 | Spoofing | A comment mentioning a marker string faking a positive/negative | low | mitigate | Exact-identifier matching + sourcemap/comment filtering (grep hygiene) | closed |
| T-07-05 | Tampering | Non-deterministic counts silently drifting a future gate | medium | mitigate | Counts asserted identical across 5 repeats; instrumentation on first-party prototypes (engine-independent); wall-clock stays report-only. Live UAT perf-diff reported "No count drift" (exit 0) | closed |
| T-07-06 | Info disclosure | Perf harness / metrics leaking into the tarball | low | mitigate | `test/perf` and `api/` outside `package.files` (`["dist","README.md"]`) (verified) | closed |
| T-07-07 | Tampering | Parallel CI runs corrupting the committed baseline | low | mitigate | Single-writer discipline: runs read the committed baseline, write only their own `api/perf.json`; `fileParallelism: false` on the perf project makes the read-merge-write race-free; baseline changes only via explicit committed regeneration | closed |
| T-07-08 | Repudiation | A guessed throttle profile making later gates meaningless | medium | mitigate | Profile pinned from the measured candidate grid with documented rationale (MEAS-03), not guessed | closed |
| T-07-09 | Tampering | A future refactor pulling highlight.js into a shipped chunk | low | mitigate | `scripts/attribution-check.mjs` asserts highlight.js absent from every chunk (confirm-only now; seeds a Phase-11 guard) (present) | closed |
| T-07-CI | Elevation of Privilege | New CI jobs gaining write/publish scope | low | mitigate | Jobs inherit top-level `permissions: contents: read`; no `packages:write`; no publish step (verified ci.yml) | closed |
| T-07-10 | Tampering | A flaky report-only job silently red-building a publish later | low | mitigate | Report-only by script design (exit 0), never `continue-on-error`; enforcing flip deferred to Phase 11 off the release critical path (GATE-03) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-02 | `size-baseline.mjs` and `perf-diff.mjs` consume only trusted, in-repo JSON the repo itself emits/commits — no external/untrusted input surface (RESEARCH Security Domain V5) | willramanand | 2026-08-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-22 | 14 | 14 | 0 | gsd-secure-phase (L1, register plan-authored, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-22
