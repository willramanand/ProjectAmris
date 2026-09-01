# Phase 11: Gate Enforcement & Cost Publication - Pattern Map

**Mapped:** 2026-08-27
**Files analyzed:** 8 (2 script modifications, 1 new script, 2 workflow modifications, 3 new tests)
**Analogs found:** 8 / 8 (this is a hardening phase — every analog is already in-repo and named by RESEARCH.md)

> This phase touches **no `src/`**. It is CI-config + build-script + docs + script-unit-test work only. The scripts to flip were deliberately authored to be flipped (`size-baseline.mjs:7-9`, `perf-diff.mjs:5-7`), so the executor's job is to mirror the already-enforcing `cem-diff.mjs` exit-code discipline — not invent measurement code.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/size-baseline.mjs` (MODIFY: add `--enforce`) | utility / CLI gate | transform → exit-code | `scripts/cem-diff.mjs` (enforcing exit) + its own `diff()` | exact (self is the clone target) |
| `scripts/perf-diff.mjs` (MODIFY: add `--enforce`) | utility / CLI gate | transform → exit-code | `scripts/cem-diff.mjs` + its own `diff().hasDrift` | exact |
| `scripts/build-cost-cards.mjs` (NEW) | utility / doc generator | file-I/O (JSON→markdown) | `scripts/build-contract-doc.mjs` | exact (structural template) |
| `.github/workflows/ci.yml` (MODIFY) | config / CI | event-driven (job wiring) | its own `surface-diff` + `size` jobs | exact (in-file precedent) |
| `.github/workflows/release.yml` (VERIFY only) | config / CI | event-driven | already-correct `workflow_run` gate | exact (no change needed for A1) |
| `test/size-baseline.test.ts` (NEW) | test | transform assertion | `test/deep-import-purity.test.ts` | exact (imports pure fns from `.mjs`) |
| `test/perf-diff.test.ts` (NEW) | test | transform assertion | `test/deep-import-purity.test.ts` | exact |
| `test/build-cost-cards.test.ts` (NEW) | test | file-I/O + determinism | `test/deep-import-purity.test.ts` (fixture dir + tmpdir) | role-match |

**Data sources (read-only inputs, not modified):** `api/size.baseline.json` (entries + marginal), `api/perf.baseline.json` (per-scenario counts + wallClock band). Committed measured numbers; the generator READS only.

## Pattern Assignments

### `scripts/size-baseline.mjs` — add `--enforce` (utility, transform→exit-code)

**Analog:** `scripts/cem-diff.mjs` (the enforcing surface, non-zero exit on drift). The regression decision already exists in this file's own `diff()` (line 102) which returns per-row `delta` (line 95).

**Exit-code discipline to mirror** (from `cem-diff.mjs:131-132, 165-184`):
```javascript
// cem-diff: pure exit-code decision function, then a thin isMain block that
// prints, computes the code, and process.exit(code). Exit 2 = usage only.
export const releaseGateExitCode = ({ hasDrift, pendingChangesetCount }) =>
  hasDrift === true && pendingChangesetCount === 0 ? 1 : 0;
// ...
if (!baselinePath || !currentPath) { console.error('usage: ...'); process.exit(2); }
// ...
if (code !== 0) console.error('\nRelease gate FAILED ...');
process.exit(code); // ENFORCING: non-zero on drift
```

**Current CLI to extend** (`size-baseline.mjs:138-166`) — it currently ends at `process.exit(0); // REPORT-ONLY`. Add `--enforce` as a third valid mode alongside `--write`/`--check`:
```javascript
// existing shape to preserve — mode validation exits 2 on usage error:
const mode = process.argv[2] ?? '--check';
if (mode !== '--write' && mode !== '--check') { console.error(USAGE); process.exit(2); }
// ...
const result = diff(load(BASELINE_PATH), current);   // existing export, line 102
console.log(formatReport(result));
process.exit(0); // <-- the line the flip replaces for --enforce
```

**Flip to add (regression-ceiling semantics — RESEARCH Pattern 2 recommends ceiling for size):**
```javascript
// Regression = a POSITIVE delta beyond tolerance; a shrink (negative delta) passes.
const TOLERANCE = 0; // brotli bytes exact over unchanged dist (comment lines 58-59)
const regressions = result.rows.filter(r => r.delta != null && r.delta > TOLERANCE);
if (mode === '--enforce' && regressions.length) {
  console.error(`Size regression: ${regressions.map(r => `${r.name} +${r.delta}B`).join(', ')}`);
  process.exit(1);            // the flip; --check still exits 0
}
```
Add `--enforce` to `USAGE` (line 136) and to the mode guard. Note Pitfall 1: consider `max(16 B, 0.5%)` tolerance to survive a size-limit patch bump; Node is already pinned to 22 for the `size` job.

**Do NOT:** touch `measure()` / `diffMap()` / the `--write` single-writer path. Diff mode READS only (mirrors perf-diff single-writer discipline).

---

### `scripts/perf-diff.mjs` — add `--enforce` (utility, transform→exit-code)

**Analog:** `scripts/cem-diff.mjs` + its own `diff()` (line 102) which already returns `hasDrift` computed from **counts only** (lines 122-125). Wall-clock is structurally excluded and cannot trip the gate — this is the whole point of the design (D-06).

**Current CLI to extend** (`perf-diff.mjs:180-224`). Today diff mode ends:
```javascript
const result = diff(load(baselinePath), load(currentPath));
console.log(formatReport(result));
process.exit(0); // REPORT-ONLY (D-08): 0 even on count drift.
```

**Flip to add:**
```javascript
// result.hasDrift is count-only by construction (lines 122-125); wall-clock excluded.
if (enforce && result.hasDrift) process.exit(1);   // cannot be tripped by wall-clock
process.exit(0);
```
Parse an `--enforce` flag from `process.argv` alongside the two positional path args (the arg parser at lines 182-209 already tolerates flags — `--write` is checked first, and the positional guard rejects args starting with `--`). Keep `exit 2` for usage errors. Keep the single-writer rule: enforce mode READS both files, never writes the baseline (lines 35-38).

**Threshold caution (Pitfall 2 / Open Question 1):** gate the timing-pure derived counts confidently — `sortComputes` (data-grid), `filterCalls` (combobox), `middlewareBuilds` + lifecycle `update/updated/render/nodes` (all scenarios). Soak `computePosition`/`repositions` (overlay) before locking them into the enforcing set — they derive from `autoUpdate`/`ResizeObserver` ticks. Ceiling semantics (`current > baseline` fails; a reduction re-baselines) per RESEARCH Pattern 2.

---

### `scripts/build-cost-cards.mjs` — NEW (utility, file-I/O JSON→markdown)

**Analog:** `scripts/build-contract-doc.mjs` — zero-dep ESM, key-sorted, drift-gated by `git diff --exit-code`. Clone its structure exactly.

**Import + path resolution pattern** (`build-contract-doc.mjs:13-22`):
```javascript
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const OUT = resolve(root, 'docs/cost-cards.md');   // mirror the docs/ output convention
```

**Code-point sort — NOT localeCompare** (`build-contract-doc.mjs:30-33`, WR-01). This is load-bearing: the doc is `git diff`-gated in CI, so ordering must be locale-independent (ICU collation differs generating-machine vs CI):
```javascript
elements.sort((a, b) => (a.tagName < b.tagName ? -1 : a.tagName > b.tagName ? 1 : 0));
```

**Cell escaping** (`build-contract-doc.mjs:53`) — the only V5 input-validation control this phase needs; JSON rendered as escaped markdown cells:
```javascript
const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/\|/g, '\\|'));
```

**Generated-file banner + assembly** (`build-contract-doc.mjs:177-201`): emit a "Generated by `node scripts/build-cost-cards.mjs` … CI fails on drift (`git diff --exit-code docs/cost-cards.md`)" header, build sections into an array, `mkdirSync(dirname(OUT), {recursive:true})`, `writeFileSync(OUT, sections.join('\n'))`, then a `console.log` summary.

**Data source shapes to read** (already verified this session):
- `api/size.baseline.json` → `{ unit, entries: {name: brotliBytes}, marginal: {name: bytes} }`. Measured set: `core bundle`, `full bundle`, `button (light deep import)`, `data-grid (heavy deep import)`, `popover (overlay deep import)`, `first-load composite`, `tokens.css`.
- `api/perf.baseline.json` → `{ [scenario]: { counts:{...}, wallClock:{median,band}, throttle:{profile}, repeats } }`. Scenarios: `button`, `combobox`, `data-grid`, `overlay`.

**Scope (Pitfall 4 / A4):** cost cards cover only the **measured representative set** (heavy: data-grid/combobox; light: button; overlay: popover) — label it as such; do NOT attempt all 60+ components. Wall-clock band renders as report-only/volatile, never as a budget (Pitfall 5 — never re-measure; draw from committed baseline only).

**Wire into `package.json` scripts** mirroring `build:contract-doc` (`"build:contract-doc": "node scripts/build-contract-doc.mjs"`) → add `"build:cost-cards": "node scripts/build-cost-cards.mjs"`.

---

### `.github/workflows/ci.yml` — MODIFY (config, event-driven)

**In-file analog for the enforcing step + drift gate:** the `surface-diff` job (lines 53-81) is the already-enforcing precedent — it runs `build:contract-doc` then `git diff --exit-code docs/contract.md` (lines 71-74) and `npm run diff:surface` with the comment "No continue-on-error and no `|| true`".

**Contract-doc drift gate to clone for cost-cards** (`ci.yml:71-74`):
```yaml
- name: Contract doc drift check
  run: |
    npm run build:contract-doc
    git diff --exit-code docs/contract.md
```
→ add an equivalent `Cost-cards drift check` step (RESEARCH lines 220-226): `node scripts/build-cost-cards.mjs && git diff --exit-code docs/cost-cards.md`.

**Report-only steps to flip** — replace `--check` with `--enforce` (`ci.yml:141-142`, `size` job, Node 22):
```yaml
# BEFORE: - name: Brotli size baseline (report-only) / run: node scripts/size-baseline.mjs --check
- name: Brotli size regression gate (enforcing)
  run: node scripts/size-baseline.mjs --enforce
```
And the perf step (`ci.yml:110-113`): `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json --enforce`.

**GATE-03 soak staging — job-level `continue-on-error`** (RESEARCH Pattern 3, lines 136-146). Add to the `size` job (and later `perf`) during soak, then remove size-first:
```yaml
  size:
    runs-on: ubuntu-latest
    continue-on-error: true      # SOAK ONLY — remove to make blocking (size first)
    steps:
      # ...
```
Anti-pattern (VERIFIED ci.yml:134-137, 149): never leave `continue-on-error`/`|| true` permanently — the repo explicitly forbids error-suppression as a fake report-only. It must be removed post-soak.

---

### `.github/workflows/release.yml` — VERIFY ONLY (config, event-driven)

**No change required.** The green gate is already correct: `if: ${{ github.event.workflow_run.conclusion == 'success' }}` (line 23) publishes only on a `success` CI conclusion (lines 8-13, 29-31 least-privilege). This is the lever GATE-03 relies on — a `continue-on-error: true` job that goes red keeps the workflow conclusion `success`, so publish stays reachable during soak. **Assumption A1** (job `continue-on-error` does not flip workflow conclusion) must be confirmed with one throwaway CI run before trusting the soak (RESEARCH line 246). No code edit here — this is the "verify empirically" step.

---

### `test/{size-baseline,perf-diff,build-cost-cards}.test.ts` — NEW (test)

**Analog:** `test/deep-import-purity.test.ts` — imports pure functions from a `.mjs` script into a Vitest spec and asserts behavior; uses tmpdir fixtures for file-I/O.

**Import-pure-fns-from-.mjs pattern** (`deep-import-purity.test.ts:14-18`):
```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FLOATING_UI_SPECIFIER, classifyFloatingUsage, runPurityCheck,
} from '../scripts/deep-import-purity.mjs';
```
→ `size-baseline.test.ts` imports `{ diff, measure, formatReport }` from `../scripts/size-baseline.mjs`; assert the exit-code *decision* (feed `diff()` synthetic baseline/current, assert which rows are regressions: positive delta → fail, negative/zero → pass).
→ `perf-diff.test.ts` imports `{ diff, reduceToBaseline }` from `../scripts/perf-diff.mjs`; the load-bearing assertion is **wall-clock can never set `hasDrift`** — feed two reports with identical counts but wildly different `wallClock.median/band` and assert `diff(...).hasDrift === false`; then change a count and assert `hasDrift === true`.

**Tmpdir fixture pattern for the generator** (`deep-import-purity.test.ts:86-121`): `mkdtempSync(join(tmpdir(), 'cost-'))`, write sample `size.baseline.json` + `perf.baseline.json`, run the generator, assert deterministic markdown output + code-point ordering; `rmSync(dir, {recursive:true, force:true})` in `afterAll`.

These specs run in the default `jsdom` project (pure Node functions, no browser) — no new framework install (RESEARCH line 306).

## Shared Patterns

### Exit-code discipline (all gate scripts)
**Source:** `scripts/cem-diff.mjs:165-184`
**Apply to:** `size-baseline.mjs --enforce`, `perf-diff.mjs --enforce`
- `exit 0` = pass, `exit 1` = regression (the flip), `exit 2` = usage error only.
- Print `formatReport(result)` to stdout, print the failure reason to stderr, then `process.exit(code)`.
- Prefer a pure exit-code decision (like `releaseGateExitCode`) that the unit test can assert without spawning a process.

### Drift-gated doc generation
**Source:** `scripts/build-contract-doc.mjs` + `ci.yml:71-74`
**Apply to:** `build-cost-cards.mjs` + its CI step
- Zero-dep ESM, code-point sort (never `localeCompare`), `|`-escaped cells, whole-file regenerated, `git diff --exit-code` in CI.

### Single-writer baseline discipline
**Source:** `perf-diff.mjs:35-38`
**Apply to:** both gate scripts
- Diff/enforce modes READ the committed baseline only; the baseline changes solely via explicit `--write`. Prevents a CI run from self-approving a regression (V10/V14 supply-chain, threat: gate writing its own baseline).

### Node version pinning per lane
**Source:** `ci.yml:100-104` (Node 20 perf) / `ci.yml:120-124` (Node 22 size)
**Apply to:** keep the enforcing steps in their existing jobs — size gate stays Node 22 (size-limit@13 needs ≥22.18), perf gate stays Node 20 (throttled baseline stability).

## No Analog Found

None. Every file in scope has an exact or near-exact in-repo analog — this is a hardening phase over tooling built in Phases 7-10.

| File | Note |
|------|------|
| GATE-03 soak behavior | Not unit-testable — CI-observation only (one throwaway run to confirm A1). No code analog because it is empirical GitHub Actions behavior. |

## Metadata

**Analog search scope:** `scripts/`, `.github/workflows/`, `test/`, `api/`, `package.json`
**Files scanned:** `cem-diff.mjs`, `size-baseline.mjs`, `perf-diff.mjs`, `build-contract-doc.mjs`, `deep-import-purity.test.ts`, `ci.yml`, `release.yml`, `size.baseline.json`, `perf.baseline.json`, `package.json`
**Pattern extraction date:** 2026-08-27
</parameter>
</invoke>
