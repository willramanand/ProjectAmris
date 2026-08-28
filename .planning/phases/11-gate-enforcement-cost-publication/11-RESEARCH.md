# Phase 11: Gate Enforcement & Cost Publication - Research

**Researched:** 2026-08-27
**Domain:** CI gate enforcement (report-only → enforcing flip) + docs cost-card publication for an existing measurement harness
**Confidence:** HIGH (all findings grounded in files read this session; no external packages introduced)

## Summary

This phase does **not** build measurement infrastructure — Phases 7–10 already built it. It (a) flips two existing **report-only** guards to **enforcing**, (b) stages that flip so flaky timing can never red-build a publish, and (c) adds one zero-dependency docs generator that reads the already-committed baselines. Every mechanism this phase touches already exists and was read this session: `scripts/size-baseline.mjs`, `scripts/perf-diff.mjs`, the four `test/perf/*.perf.test.ts` specs + `test/perf/harness.ts`, the committed baselines `api/size.baseline.json` / `api/perf.baseline.json`, and the three CI workflows.

The report-only discipline in this repo is deliberate and uniform: **every guard script exits 0 by design and reserves exit 2 for usage errors only** — there is no `continue-on-error` and no `|| true` anywhere ([VERIFIED: .github/workflows/ci.yml:83-153]). So the flip is not "remove a suppressor" — it is "make the script return a non-zero exit on regression," mirroring the already-enforcing `scripts/cem-diff.mjs` surface gate. The scripts are written for exactly this: `size-baseline.mjs` exposes `diff()` returning per-entry `delta`, and `perf-diff.mjs` exposes `diff()` returning `hasDrift` on **counts only** (wall-clock is structurally excluded from drift).

**Primary recommendation:** GATE-01 → add an enforcing mode to `size-baseline.mjs` (non-zero exit when any entry `delta > tolerance`); GATE-02 → add an enforcing mode to `perf-diff.mjs` (non-zero exit on **count** regression only, wall-clock stays informational); GATE-03 → wrap each newly-enforcing CI **job** in `continue-on-error: true` during a soak window (annotates red without failing the CI workflow that `release.yml` gates on), then remove `continue-on-error` size-first, counts-second; DOCS-04 → new `scripts/build-cost-cards.mjs` (zero-dep, mirroring `scripts/build-contract-doc.mjs`) that reads both committed baselines and emits `docs/cost-cards.md`, drift-gated by `git diff --exit-code` exactly like `docs/contract.md`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | Per-entry brotli size budgets flip report-only → enforcing (size first, deterministic/stable) | `size-baseline.mjs` `diff()` already computes per-entry `delta`; enforcing = non-zero exit on positive delta. Brotli bytes are exact integers over unchanged dist (script comment lines 58-59). Node-22-pinned `size` job. |
| GATE-02 | Runtime **count**-metric budgets flip to enforcing, thresholds outside noise floor; wall-clock stays report-only | `perf-diff.mjs` `diff()` returns `hasDrift` from **counts only** by construction (wall-clock never contributes — lines 122-125); counts are deterministic (`assertStableCounts`, harness:410-420). Noise-floor risk is cross-CI-run variance → derive ceiling from soak-observed max. |
| GATE-03 | Gate flip staged off the release critical path during soak | `release.yml` gates on the **CI** workflow's `workflow_run.conclusion == 'success'`. Job-level `continue-on-error: true` lets a failing gate job annotate red while the workflow conclusion stays `success` → publish never blocked during soak. |
| DOCS-04 | Per-component cost cards (measured brotli size + runtime cost) published in docs | Data sources committed: `api/size.baseline.json` (entries + marginal-over-core) and `api/perf.baseline.json` (counts + wall-clock band). New generator mirrors `build-contract-doc.mjs`; drift-gated like `docs/contract.md`. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Size-budget enforcement | CI / build tooling (`scripts/*.mjs` + `.github/workflows/ci.yml`) | — | Runs post-build on `dist/`; no library source touched |
| Count-metric enforcement | CI / test tooling (perf lane + `perf-diff.mjs`) | Browser (Chromium perf harness) | Counts produced by throttled Chromium perf specs; gate is the Node diff script |
| Soak staging | CI orchestration (workflow/job config) | — | Pure GitHub Actions job wiring; `release.yml` dependency graph is the lever |
| Cost-card docs | Build tooling (`scripts/build-cost-cards.mjs`) → `docs/` | — | Reads committed baseline JSON, emits markdown; drift-gated in CI |

**No component source (`src/`) changes in this phase.** It is CI-config + build-script + docs work only. This is a hardening phase over frozen v1.0 surface — consistent with the STATE.md decision "Enforce CI perf + bundle-size budgets last."

## Standard Stack

No new runtime or dev dependencies. Everything needed is already installed and used.

### Core (existing, reused)
| Tool | Version | Purpose | Why Standard (here) |
|------|---------|---------|---------------------|
| `size-limit` + `@size-limit/preset-small-lib` | ^13.0.3 | Per-entry brotli measurement (`--json`) | Already the measurement engine behind `size-baseline.mjs` [VERIFIED: package.json:114/103] |
| `node:zlib` `brotliCompressSync` | Node 22 builtin | tokens.css brotli (size-limit measures JS only) | Already used [VERIFIED: scripts/size-baseline.mjs:24,71] |
| Vitest (`perf` project) + Playwright/Chromium | ^4.1.0 / ^1.62.1 | Throttled count harness | Already the perf lane [VERIFIED: package.json:80,106,113] |
| `git diff --exit-code` | git | Docs drift gate | Already gates `docs/contract.md` [VERIFIED: ci.yml:74] |

### Supporting (existing)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `scripts/cem-diff.mjs` | The **already-enforcing** analog (non-zero exit on surface drift) | Copy its exit-code discipline for the size/perf flip |
| `scripts/build-contract-doc.mjs` | Zero-dep docs generator, key-sorted, drift-gated | Structural template for `build-cost-cards.mjs` |
| `api/perf.baseline.untuned.json` | Durable untuned baseline | Reference for "count improvement" provenance; do not use as gate baseline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Enforcing `size-baseline.mjs` regression gate | Tighten `size-limit` `limit` fields to baseline+margin | `size-limit` limits are coarse ceilings with ~20-25% headroom (full: 75kB limit vs 61881 B actual) — they will NOT catch a 10% regression. The fine-grained baseline diff is the real budget. Keep `size-limit` as a coarse backstop. [VERIFIED: .size-limit.json + api/size.baseline.json] |
| Job-level `continue-on-error` soak | Separate non-CI "Gates" workflow | `continue-on-error` is the smaller structural change and keeps one workflow; a separate workflow is cleaner isolation but duplicates checkout/build. Recommend `continue-on-error`; document the separate-workflow option. |
| New `build-cost-cards.mjs` | Storybook MDX cost pages | Storybook exists but docs pipeline is committed markdown in `docs/` gated by `git diff`. Markdown generator matches the existing pipeline with zero new surface. |

**Installation:** none — no `npm install` this phase.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** All tooling (`size-limit`, `vitest`, `playwright`, `node:zlib`) is already in `package.json` and was verified present this session [VERIFIED: package.json:93-121]. No new `dependencies` or `devDependencies` are added.

## Architecture Patterns

### System Architecture Diagram — the flip and the publish critical path

```
PR / push to main
      │
      ▼
┌─────────────────────────── CI workflow (.github/workflows/ci.yml) ───────────────────────────┐
│  verify   browser   surface-diff        perf (Node 20)          size (Node 22)      smoke      │
│  (jsdom)  (WK/FF/   (cem-diff.mjs =      test:perf →             npm run size       (pack/     │
│  +cov)     Chromium) ENFORCING already)   perf-diff.mjs          (size-limit,       resolve)   │
│                                           [report-only → GATE-02] coarse, enforcing)           │
│                                                                   size-baseline.mjs             │
│                                                                   [report-only → GATE-01]       │
└───────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                 │ workflow_run: conclusion == 'success'
                                                 ▼
                                   release.yml → changesets publish  ◄── the release critical path
                                                 │
                        GATE-03: during soak, wrap the newly-enforcing size/perf JOB in
                        `continue-on-error: true` → job may go red but workflow conclusion
                        stays 'success' → release is NEVER blocked by a soaking gate.
                        Remove continue-on-error (size first) once stable → truly blocking.

DOCS-04 (offline, not on critical path):
  api/size.baseline.json ─┐
  api/perf.baseline.json ─┼─► scripts/build-cost-cards.mjs ─► docs/cost-cards.md
                          │        (zero-dep, key-sorted)      (drift-gated: git diff --exit-code)
```

### Pattern 1: The enforcing-flip idiom (copy `cem-diff.mjs`, not remove a suppressor)
**What:** The report-only scripts already compute the drift decision; the flip is a non-zero exit, gated by a flag so the same script serves both `--check` (report) and `--enforce` (gate) callers.
**When to use:** GATE-01 and GATE-02.
**Why this shape:** `size-baseline.mjs` and `perf-diff.mjs` were written "cloning the scripts/cem-diff.mjs shape" and explicitly note "the enforcing flip lands in Phase 11" [VERIFIED: scripts/size-baseline.mjs:7-9; scripts/perf-diff.mjs:6-7]. `cem-diff.mjs` is the in-repo enforcing reference (non-zero exit on drift). Keep exit 2 = usage error.
```javascript
// size-baseline.mjs — add an --enforce mode alongside --check (currently lines 138-166)
// Regression = a POSITIVE delta beyond tolerance on any entry/marginal row.
const TOLERANCE = 0; // brotli bytes are exact over unchanged dist (lines 58-59); see Pitfall 1 for Node-drift margin
const result = diff(load(BASELINE_PATH), current);       // existing export, line 102
const regressions = result.rows.filter(r => r.delta != null && r.delta > TOLERANCE);
console.log(formatReport(result));
if (mode === '--enforce' && regressions.length) {
  console.error(`Size regression: ${regressions.map(r => `${r.name} +${r.delta}B`).join(', ')}`);
  process.exit(1);            // <-- the flip. --check still exits 0.
}
process.exit(0);
```
```javascript
// perf-diff.mjs — enforce on COUNT drift only; wall-clock never gates (lines 122-125)
const result = diff(load(baselinePath), load(currentPath)); // existing export, line 102
console.log(formatReport(result));
// result.hasDrift is count-only by construction; result.changed carries the per-metric deltas.
if (enforce && result.hasDrift) process.exit(1);   // wall-clock excluded structurally — cannot trip this
process.exit(0);
```

### Pattern 2: Regression-ceiling vs exact-match semantics
**What:** Two valid budget semantics. Choose per metric class.
- **Exact-match (like `cem-diff`):** any drift fails; intentional reductions require re-committing the baseline. Strongest ratchet; more baseline churn.
- **Regression-ceiling:** fail only when `current > baseline (+ tolerance)`; reductions pass silently. Less churn; the ratchet can erode if reductions aren't re-baselined.
**Recommendation:** **Regression-ceiling for size** (a bundle shrink should never red-build; add a printed reminder to re-baseline on reduction). **Exact-match-with-ceiling for counts** — counts are deterministic integers, so gate `current > baseline` (a count going UP is the regression; a count going DOWN is an improvement that should re-baseline). This matches the requirement's "budgets," which permit staying-under.

### Pattern 3: GATE-03 job-level soak via `continue-on-error`
**What:** `continue-on-error: true` on a **job** lets that job fail its steps while the overall workflow run still concludes `success`.
**When to use:** During the soak window after the exit-1 flip lands, before making the gate truly blocking.
**Why it works here:** `release.yml` publishes only when the **CI** workflow run concludes `success` (`github.event.workflow_run.conclusion == 'success'`) [VERIFIED: .github/workflows/release.yml:9-23]. A job marked `continue-on-error: true` that goes red is reported as failed on the checks UI but does **not** flip the workflow-run conclusion to failure — so publish stays reachable. [CITED: docs.github.com/actions — job-level continue-on-error]
```yaml
# ci.yml — during soak (GATE-03). Job runs the enforcing exit-1 but cannot block release.
  size:
    runs-on: ubuntu-latest
    continue-on-error: true      # SOAK ONLY — remove to make blocking (size first)
    steps:
      # ...
      - name: Brotli size regression gate (enforcing, soaking)
        run: node scripts/size-baseline.mjs --enforce
```
Sequencing: land exit-1 + `continue-on-error` → observe N green/red runs → remove `continue-on-error` from `size` first (deterministic, short soak) → later remove from `perf` once cross-run count variance is characterized.

### Anti-Patterns to Avoid
- **Faking report-only with `|| true` or `continue-on-error` permanently.** The repo explicitly rejects this ("no error-suppressing flag and no `|| true`; the exit 0 is what makes them report-only" [VERIFIED: ci.yml:134-137]). Post-soak, the gate must exit 1 with **no** suppressor.
- **Gating wall-clock.** `perf-diff.mjs` structurally excludes wall-clock from `hasDrift` (D-06). Do not add wall-clock to the enforcing path — it is the volatile metric the whole design protects against.
- **Deriving count thresholds from a single CI run.** Use the soak to observe cross-run max; some counts (`computePosition`, `repositions`) come from autoUpdate/ResizeObserver ticks and are the cross-run-variance risk (see Pitfall 2).
- **Adding `manualChunks` or touching `vite.config.ts` external array** to hit a size budget — frozen and byte-snapshot-tested (08-PATTERNS.md:48-50).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brotli size measurement | Custom brotli walk of dist | `size-limit --json` via existing `measureSizeLimit()` | Already handles entry composition, `ignore: [lit]`, on-the-wire brotli [VERIFIED: size-baseline.mjs:46-56] |
| Count determinism check | New stability harness | `assertStableCounts()` | Already proves counts byte-identical across repeats [VERIFIED: harness.ts:410-420] |
| Diff/normalize logic | New comparison | `size-baseline.mjs` `diff()` / `perf-diff.mjs` `diff()`+`reduceToBaseline()` | Exported, key-sorted, tested-shape [VERIFIED: size-baseline.mjs:102; perf-diff.mjs:102,54] |
| Docs generator scaffolding | New framework | Clone `build-contract-doc.mjs` | Zero-dep, key-sorted (code-point, not localeCompare — WR-01), drift-gated pattern proven [VERIFIED: build-contract-doc.mjs:30-33] |
| Release green-gating | New publish gate | Existing `release.yml` `workflow_run` gate | Already machine-enforced; GATE-03 only adjusts job blocking |

**Key insight:** The scripts were authored to be flipped. The engineering work is threshold derivation + soak staging + one docs generator — not new measurement code.

## Common Pitfalls

### Pitfall 1: Brotli determinism across toolchain, not across builds
**What goes wrong:** `size-baseline.mjs` says brotli bytes are "exact integers, re-runs byte-identical" — true for the **same** Node/size-limit. A Node minor bump or `size-limit` patch can shift brotli output by a few bytes, red-building a zero-code PR.
**Why:** brotli quality/window defaults live in the zlib build; the `size` job pins Node 22 (`size-limit@13 requires >=22.18`) [VERIFIED: ci.yml:120-124].
**How to avoid:** Either keep TOLERANCE = 0 **and** pin Node (already pinned) + rely on `package-lock.json` for size-limit, or set a small margin (e.g. `max(16 B, 0.5%)`) to survive patch bumps. Recommend a small margin for size; document that a Node-major bump requires a baseline re-commit.
**Warning signs:** size gate goes red on a docs-only or CI-only PR.

### Pitfall 2: Count "noise floor" is cross-CI-run, not within-run
**What goes wrong:** `assertStableCounts` proves counts are identical across the 5 in-process repeats, but says nothing about run-to-run variance on a shared GitHub runner. Some counts derive from timing-sensitive observers.
**Why:** `overlay` counts `computePosition` and `repositions` come from floating-ui `autoUpdate` + `ResizeObserver` initial fire; the harness itself documents "computePosition >= repositions" as a **range**, not equality [VERIFIED: overlay.perf.test.ts:40-47]. STATE.md flags this exact risk: "whether shared CI run-to-run variance lets the count gate enforce" [VERIFIED: STATE.md:82].
**How to avoid:** Gate the **deterministic derived counts** confidently — `sortComputes` (data-grid), `filterCalls` (combobox), `middlewareBuilds` (overlay), and lifecycle `update/updated/render/nodes` — these are pure of timing. For `computePosition`/`repositions`, either exclude from the enforcing set or set the ceiling from soak-observed max. Note the overlay spec **already hard-asserts** `computePosition === 4` and `repositions === 2` in-test [VERIFIED: overlay.perf.test.ts:174-176], so within the current fixture they are stable — but confirm across soak before locking them into the gate ceiling.
**Warning signs:** perf gate flips red/green on unrelated PRs during soak — that count is not gate-ready; keep it report-only.

### Pitfall 3: `test:perf` already fails on hard-coded count asserts
**What goes wrong:** The perf **step** runs `npm run test:perf` then `perf-diff.mjs`. Several specs hard-assert exact counts (`expect(counts.computePosition).toBe(4)`), so a count regression can fail the vitest step **before** `perf-diff` ever runs, under GitHub's default `bash -eo pipefail`.
**Why:** In-test regression guards from Phase 9 are correctness assertions, separate from the `perf-diff` budget [VERIFIED: overlay.perf.test.ts:174-176].
**How to avoid:** During soak this is fine (the whole job is `continue-on-error`). Post-soak, be deliberate: the enforcing signal should be `perf-diff --enforce` (the budget), and any in-test `toBe(...)` guards are a second, coarser tripwire. Decide whether both should block or whether the specs' hard asserts should relax to `toBeLessThanOrEqual` so `perf-diff` is the single budget authority.

### Pitfall 4: Cost cards can only cover the measured set
**What goes wrong:** DOCS-04 says "per-component cost cards," but only a handful of components have committed measurements: size entries = core, full, **button, data-grid, popover** (+ first-load composite, tokens.css); perf scenarios = **button, combobox, data-grid, overlay(popover)** [VERIFIED: api/size.baseline.json:3-16; api/perf.baseline.json].
**Why:** The baselines are a representative heavy/light span (per MEAS-03 rationale), not all 60+ components.
**How to avoid:** Scope cost cards to the **measured representative set** and label it as such (heavy: data-grid/combobox; light: button; overlay: popover). Enterprise budgeting gets the span, not every element. Flag to planning: expanding coverage means adding size-limit entries + perf scenarios — larger than DOCS-04 as written; keep it to committed data.

### Pitfall 5: jsdom vs real-browser measurement
**What goes wrong:** Mixing measurement lanes. Size is measured on built `dist/` (Node, deterministic). Counts are measured in **real Chromium** under CDP throttle — never jsdom.
**Why:** The perf lane is Chromium-only by design (CDP throttling); jsdom mocks positioning/observers [VERIFIED: harness.ts:10-11, 116-120; 09-PATTERNS.md:226].
**How to avoid:** Cost cards must draw runtime numbers from `api/perf.baseline.json` (the Chromium-throttled committed baseline), not re-measure. Size from `api/size.baseline.json`. Never compute cost from a jsdom run.

## Code Examples

### GATE-01 — enforcing size gate wired into CI (post-soak)
```yaml
# .github/workflows/ci.yml — size job (Node 22). Replace the report-only step.
      # BEFORE: - name: Brotli size baseline (report-only)
      #           run: node scripts/size-baseline.mjs --check
      - name: Brotli size regression gate (enforcing)
        run: node scripts/size-baseline.mjs --enforce   # exit 1 on positive delta beyond tolerance
```

### DOCS-04 — cost-card generator (mirrors build-contract-doc.mjs)
```javascript
// scripts/build-cost-cards.mjs — zero-dep ESM, key-sorted, drift-gated like docs/contract.md.
// Source: patterned on scripts/build-contract-doc.mjs (this repo, read this session)
import { readFileSync, writeFileSync } from 'node:fs';
const size = JSON.parse(readFileSync('api/size.baseline.json', 'utf8')); // entries + marginal
const perf = JSON.parse(readFileSync('api/perf.baseline.json', 'utf8')); // counts + wallClock.band
const kB = (b) => (b / 1024).toFixed(1);
// Code-point sort (NOT localeCompare) so CI-vs-local ordering can't drift (WR-01, build-contract-doc.mjs:30-33)
const names = Object.keys(size.entries).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const rows = names.map((n) => `| ${n} | ${kB(size.entries[n])} kB | ${size.marginal[n] != null ? kB(size.marginal[n]) + ' kB' : '—'} |`);
// ... interleave perf.<scenario>.counts + perf.<scenario>.wallClock.band (report-only, labelled volatile) ...
writeFileSync('docs/cost-cards.md', `# Component Cost Cards\n\n| Entry | Brotli (on-the-wire) | Marginal over core |\n|---|---|---|\n${rows.join('\n')}\n`);
```
```yaml
# ci.yml — drift-gate the generated doc exactly like docs/contract.md (ci.yml:71-74)
      - name: Cost-cards drift check
        run: |
          node scripts/build-cost-cards.mjs
          git diff --exit-code docs/cost-cards.md
```

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No stored data, service config, OS-registered state, secrets, or build artifacts carry a renamed identifier. It adds CI exit codes and one docs file.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Guards report-only (exit 0, print drift) | Enforcing (exit 1 on regression) | Phase 11 (this) | Size regression / count regression red-builds CI |
| Flip lands directly on release path | Soak via job `continue-on-error`, then remove | Phase 11 | Flaky timing never blocks publish during characterization |
| Cost data lives only in `api/*.baseline.json` | Published `docs/cost-cards.md`, drift-gated | Phase 11 | Enterprise consumers can budget from committed docs |

**Not deprecated but note:** `size-limit`'s coarse `limit` fields (e.g. `full bundle: 75 kB` vs actual 61881 B) stay as a loose backstop; the fine-grained per-entry baseline diff becomes the real budget.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Job-level `continue-on-error: true` keeps `workflow_run.conclusion == 'success'`, so `release.yml` still fires during soak | Pattern 3 / GATE-03 | If GitHub treats a `continue-on-error` job failure as a workflow failure, the soak would block publish — verify with one throwaway run before relying on it. This is the one behavior that should be empirically confirmed. |
| A2 | Regression-ceiling (allow reductions) is the intended budget semantics vs exact-match | Pattern 2 | If exact-match is wanted, more baseline re-commits; low risk, easily switched via the flag. |
| A3 | `computePosition`/`repositions` counts are stable enough cross-CI-run to gate (they hard-assert 4/2 in-test today) | Pitfall 2 | If they vary on shared runners, gating them causes flaky red builds — mitigated by soaking counts second and excluding unstable metrics. |
| A4 | DOCS-04 "per-component" = the measured representative set, not all 60+ components | Pitfall 4 | If full coverage is required, scope expands to adding size entries + perf scenarios — materially larger than written. |
| A5 | Small brotli tolerance (or Node pin) is acceptable for the size gate | Pitfall 1 | Zero tolerance + a Node-major bump would red-build unrelated PRs. |

## Open Questions

1. **Should the enforcing count set include `computePosition`/`repositions`, or only the timing-pure derived counts?**
   - What we know: derived counts (`sortComputes`, `filterCalls`, `middlewareBuilds`, lifecycle) are timing-independent and safe; overlay tick counts are hard-asserted 4/2 today.
   - What's unclear: cross-CI-run stability of the tick counts.
   - Recommendation: gate the derived + lifecycle counts immediately; soak the tick counts and add them only if the soak shows zero cross-run variance.

2. **Exact-match vs regression-ceiling for counts?**
   - Recommendation: ceiling (`current > baseline` fails); a count reduction is an improvement that re-baselines. Print a re-baseline reminder on reduction.

3. **Does GATE-03 soak use `continue-on-error` in-CI or a separate workflow?**
   - Recommendation: `continue-on-error` in `ci.yml` (smallest change, one workflow); confirm A1 empirically first. Fall back to a separate non-gating workflow if A1 fails.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 22 | `size` job / brotli determinism | ✓ (CI-pinned) | 22 | — [VERIFIED: ci.yml:120-124] |
| Node 20 | `perf` job (pinned to avoid baseline drift) | ✓ (CI-pinned) | 20 | — [VERIFIED: ci.yml:100-104] |
| `size-limit` | GATE-01 measurement | ✓ | ^13.0.3 | — [VERIFIED: package.json:114] |
| Playwright + Chromium | GATE-02 count harness | ✓ | ^1.62.1 | — [VERIFIED: package.json:106,113; ci.yml:107-108] |
| Committed baselines | GATE-01/02 diff, DOCS-04 source | ✓ | — | — [VERIFIED: api/size.baseline.json, api/perf.baseline.json] |

No missing dependencies. This phase is config + scripts + docs; no install required.

## Validation Architecture

nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`) — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 (projects: `jsdom`, `browser`, `perf`) |
| Config file | `vitest.config.ts` |
| Quick run command | `node scripts/size-baseline.mjs --enforce` (deterministic, seconds after a build) |
| Full suite command | `npx vitest run --project jsdom` + `npm run test:perf` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | `--enforce` exits 1 on positive size delta, 0 on same/reduction, 2 on usage | unit (pure `diff()` + CLI exit) | `npx vitest run test/size-baseline.test.ts` | ❌ Wave 0 |
| GATE-02 | `--enforce` exits 1 on count drift, wall-clock never trips it | unit (pure `diff()` + CLI exit) | `npx vitest run test/perf-diff.test.ts` | ❌ Wave 0 |
| GATE-03 | Soak job annotates red without failing workflow conclusion | manual / CI observation | one throwaway CI run (confirm A1) | ❌ manual — CI-behavior, not unit-testable |
| DOCS-04 | Generator emits stable `docs/cost-cards.md`; drift-gated | unit + CI drift gate | `node scripts/build-cost-cards.mjs && git diff --exit-code docs/cost-cards.md` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/size-baseline.mjs --enforce` (fast, deterministic)
- **Per wave merge:** `npm run test:perf` + the new script unit tests
- **Phase gate:** full jsdom suite + perf lane green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/size-baseline.test.ts` — covers GATE-01 (import `diff`/`measure`/`formatReport` + assert exit-code decision). Analog: `test/deep-import-purity.test.ts` (imports pure fns from a `.mjs`, this session).
- [ ] `test/perf-diff.test.ts` — covers GATE-02 (import `diff`/`reduceToBaseline`; assert wall-clock cannot set `hasDrift`).
- [ ] `test/build-cost-cards.test.ts` — covers DOCS-04 (feed sample baselines, assert deterministic markdown, code-point ordering).
- [ ] No framework install needed — Vitest + the `.mjs`-import test pattern already exist.

## Security Domain

security_enforcement is enabled (ASVS L1). This phase adds no runtime code, no new dependency, no new secret, and touches no `src/`.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | Generators read only committed repo JSON (`api/*.baseline.json`), rendered as escaped markdown cells (mirror `build-contract-doc.mjs` `cell()` `|`-escape, line 53) |
| V6 Cryptography | no | brotli is size measurement, not crypto |
| V10/V14 Supply chain & CI | yes | No new deps; publish path stays least-privilege; **the soak `continue-on-error` must be removed post-soak** so a real regression can never be silently published |

### Known Threat Patterns for CI-gate work
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Permanent `continue-on-error`/`\|\| true` masking a real regression | Tampering/Repudiation | Remove suppressor post-soak; repo convention already forbids `\|\| true` (ci.yml:134-137) |
| Gate script writing the committed baseline in CI (self-approving) | Tampering | Keep single-writer discipline: diff mode READS only; baseline changes only via explicit `--write` (perf-diff.mjs:36-38) |
| Publish credential exposed to a PR-triggered gate | Elevation | Unchanged — gates run read-only; only `release.yml`/`publish.yml` publish jobs carry `packages: write` (release.yml:29-31) |

## Sources

### Primary (HIGH confidence — files read this session)
- `.github/workflows/{ci,release,publish}.yml` — CI/release wiring, report-only discipline, workflow_run gate
- `scripts/size-baseline.mjs`, `scripts/perf-diff.mjs` — the two scripts to flip (exports: `diff`, `measure`, `reduceToBaseline`, `formatReport`)
- `scripts/build-contract-doc.mjs`, `scripts/deep-import-purity.mjs` — docs-generator + script-test analogs
- `test/perf/harness.ts`, `test/perf/overlay.perf.test.ts` — count determinism, throttle profile, in-test hard asserts
- `api/size.baseline.json`, `api/perf.baseline.json`, `api/perf.baseline.untuned.json` — committed measured numbers
- `.size-limit.json`, `package.json`, `.planning/config.json`, `.planning/{REQUIREMENTS,STATE}.md`, `08-PATTERNS.md`, `09-PATTERNS.md`

### Secondary (MEDIUM confidence)
- GitHub Actions docs — job-level `continue-on-error` semantics (A1, to be empirically confirmed)

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling verified present in package.json; no new deps
- GATE-01 mechanism: HIGH — `diff()` + `delta` already exist; brotli determinism caveat documented
- GATE-02 mechanism: HIGH — count-only `hasDrift` verified structurally; cross-run stability flagged (soak)
- GATE-03 staging: MEDIUM — `continue-on-error` behavior is standard but A1 warrants one confirming run
- DOCS-04: HIGH — data sources committed; generator/drift-gate pattern proven in-repo
- Coverage scope: MEDIUM — "per-component" scoped to measured set (A4)

**Research date:** 2026-08-27
**Valid until:** 2026-09-26 (stable — internal CI/docs tooling, no fast-moving external deps)
