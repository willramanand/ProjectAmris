# Phase 7: Measurement, Baselines & Budgets - Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 9 (7 create, 2 modify)
**Analogs found:** 9 / 9 (every file has an in-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/size-baseline.mjs` | build-time script | file-I/O + transform | `scripts/cem-diff.mjs` | role-match (baseline-diff CLI) |
| `scripts/perf-diff.mjs` | build-time script | file-I/O + transform | `scripts/cem-diff.mjs` | exact (clone target, per CONTEXT D-08) |
| `scripts/assert-no-bundled-lit.mjs` | build-time script | file-I/O + transform | `scripts/cem-diff.mjs` (CLI shape) + `vite.config.ts:220` (external snapshot source) | role-match |
| `test/perf/harness.ts` | browser-lane test helper | request-response (in-page) | `test/helpers.ts` + `test/browser/floating-position.test.ts` | role-match |
| `test/perf/{data-grid,combobox,overlay,button}.perf.test.ts` | browser-lane test | event-driven (throttled measure) | `test/browser/floating-position.test.ts`, `test/browser/data-grid-virtual.test.ts` | exact (same components/interactions) |
| `writeMetrics` command (in `vitest.config.ts`) | config + Node command | file-I/O | `vitest.config.ts` browser project block | role-match (new construct; no existing custom command) |
| `api/perf.baseline.json` | committed baseline data | stored data | `api/custom-elements.baseline.json` | role-match (committed-baseline convention) |
| `.size-limit.json` (MODIFY) | config | config | existing `.size-limit.json` | exact (re-scope in place) |
| `.github/workflows/ci.yml` (MODIFY) | CI job | CI job | `.github/workflows/ci.yml` `size` + `browser` jobs | exact |
| `vite.config.ts` (MODIFY: visualizer) | config | config | `vite.config.ts` `plugins` array | exact |

---

## Pattern Assignments

### `scripts/perf-diff.mjs` (build-time script, file-I/O + transform)

**Analog:** `scripts/cem-diff.mjs` — clone its exact shape (CONTEXT D-08, RESEARCH "Don't Hand-Roll").

**Zero-dep imports + loader** (`scripts/cem-diff.mjs:18-21`):
```javascript
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
```

**Normalization discipline to mirror** (`scripts/cem-diff.mjs:6-11`, `24`): key rows by a stable
identifier (here: scenario name + metric name — never array position), sort every compared array,
strip volatile fields. For perf: counts are the deterministic gated numbers; wall-clock/`samples`
are volatile and reported-only. Store `{ median, mean, sd, band }` per the D-07 summarize shape
(RESEARCH Pattern 3).

**Structured-diff return shape** (`scripts/cem-diff.mjs:84-113`): return
`{ added, removed, changed, hasDrift }`; only entries with a real delta appear in `changed`.

**Exit-code gate — but REPORT-ONLY this phase** (`scripts/cem-diff.mjs:131-132`, `166-185`):
cem-diff is *enforcing* (`process.exit(code)` non-zero on drift). perf-diff **must invert this to
report-only**: print `formatReport(...)`, then `process.exit(0)` unconditionally (CONTEXT D-08:
"perf-diff.mjs exits 0 this phase"). Keep the `isMain` + usage-error (`exit(2)`) guard from lines
166-172. The enforcing flip is Phase 11.

**CLI usage convention** (`scripts/cem-diff.mjs:168-172`): `node scripts/perf-diff.mjs <baseline> <current>`,
matching the `diff:surface` script wiring in `package.json:65`.

---

### `scripts/size-baseline.mjs` (build-time script, file-I/O + transform)

**Analog:** `scripts/cem-diff.mjs` (structure) + RESEARCH §"Code Examples" skeleton.

**Imports** (RESEARCH line 382-384; extends cem-diff's `node:fs`):
```javascript
import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
```

**Core pattern** — parse `size-limit --json`, add standalone brotli for the CSS asset (which
size-limit does not measure as a JS entry), build a `{ [name]: brotliBytes }` map, diff vs committed
baseline, report-only exit (RESEARCH 386-389):
```javascript
const sizeLimitJson = JSON.parse(execFileSync('npx', ['size-limit', '--json'], { encoding: 'utf8' }));
const tokensBrotli = brotliCompressSync(readFileSync('dist/styles/tokens.css')).length;
```
The `dist/styles/tokens.css` path is real — it is produced by `build:tokens-css` (`package.json:64`)
and exported at `package.json:36`.

**Marginal-over-core metric** (Discretion, Open Question 2): prefer the arithmetic
`component_entry_brotli − core_brotli` diff inside this script over size-limit `import` syntax —
brotli-consistent, fewer moving parts.

**Diff + report** structure: reuse cem-diff's `diffNameArrays`/`formatReport` idea keyed by entry
name; report-only `exit(0)` (D-08).

---

### `scripts/assert-no-bundled-lit.mjs` (build-time script, file-I/O)

**Analog:** `scripts/cem-diff.mjs` (CLI shape) + `vite.config.ts:220` (the external list it snapshots).

**Two independent guards** (CONTEXT D-03, RESEARCH Pitfall 4):
1. **Dist grep** — read every emitted `dist/**/*.js` and assert zero Lit version-marker globals
   (`reactiveElementVersions`, `litHtmlVersions`, `litElementVersions`); assert Lit appears only as a
   bare specifier (`from"lit"`), never inlined. (A3 — validate markers against a deliberately-bundled
   fixture in Wave 0.)
2. **External-list snapshot** — snapshot the canonical external array (`vite.config.ts:220`):
   ```typescript
   external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//],
   ```
   Assert it still externalizes all `lit`/`@lit*` patterns. RESEARCH recommends this half live as a
   **unit test on the jsdom `verify` lane** (Wave 0 Gaps line 453); the dist-grep half runs report-only.

Use the `isMain` + report-only `exit(0)` pattern from cem-diff (D-08 — this phase is report-only).

---

### `test/perf/harness.ts` + `test/perf/*.perf.test.ts` (browser-lane test)

**Analog:** `test/browser/floating-position.test.ts` (overlay scenario, `am-popover`),
`test/browser/data-grid-virtual.test.ts` (grid render/sort), `test/helpers.ts` (fixture utilities).

**Browser-lane import discipline — CRITICAL** (`test/browser/floating-position.test.ts:19-20`,
`test/helpers.ts:1-7`): the perf lane MUST NOT import `test/setup.ts` or any mock symbol. Use only
type-only imports and the side-effect-free helpers. Native Chromium APIs only (Pitfall 2).
```typescript
import '../../src/components/popover/popover';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';
// NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol.
```

**Fixture + async-settle pattern** (`test/helpers.ts:15-34`, `test/browser/floating-position.test.ts:25-46`):
`fixture(markup)` → set properties → `await waitForUpdate(host)` → poll for the async floating-ui
write (`waitForPosition`). data-grid uses property assignment then `waitForUpdate` (`data-grid-virtual.test.ts:34-44`).

**Representative overlay = `am-popover`** (RESEARCH Pattern 2 line 263, verified against
`floating-position.test.ts:32-68`): routes through `FloatingPositionController`, canonical fixture,
full open→position path (`trigger="manual" placement="bottom-start"`, offset 8). Document in `harness.ts`.

**Count instrumentation — wrap first-party prototypes only** (RESEARCH Pattern 2):
- Lifecycle counts: wrap the component's own `update`/`updated`/`render` (public ReactiveElement hooks).
- `computePosition` counts: wrap `FloatingPositionController.prototype['_updatePosition']` — the single
  chokepoint at `src/internal/controllers/floating-position.ts:116-130`:
  ```typescript
  private async _updatePosition(reference, floating) {
    const { x, y, placement, middlewareData } = await computePosition(reference, floating, {...});
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` }); // line 128
  }
  ```
- Cross-check (zero instrumentation): `MutationObserver` on the panel's `style` attribute counts the
  `Object.assign(floating.style, ...)` mutations at line 128.
- DO NOT patch `@floating-ui/dom` or Lit exports (ESM live bindings; correctness risk).
- NOTE (Pitfall 6): `color-picker.ts`/`rich-select.ts` call `computePosition` directly and bypass the
  controller — do not pick them for the overlay scenario.

**Scenario set** (CONTEXT D-06): `data-grid` (render+sort), `combobox` (filter-per-keystroke),
`overlay`=`am-popover` (open+reposition), `button` (light control). 5 repeats each (D-07),
record median + mean+3σ band (RESEARCH Pattern 3 `summarize`, lines 267-276).

**Throttle profile** (RESEARCH Pattern 1, lines 182-203): `harness.ts` holds `THROTTLE_PROFILE`
(pinned single CPU multiplier + tier, MEAS-03), `NETWORK_TIERS`, and `applyThrottle()` using
`cdp()` from `vitest/browser` — Chromium-only (D-11).

---

### `writeMetrics` custom command + `perf` project (in `vitest.config.ts`)

**Analog:** the existing `browser` project block in `vitest.config.ts:18-32`.

**Mirror the browser project shape** (`vitest.config.ts:18-32`) for a new Chromium-only `perf`
project — same `provider: playwright()`, `headless: true`, `instances: [{ browser: 'chromium' }]`,
**NO `setupFiles`** (the comment at lines 22-24 is the rule to preserve). Add
`include: ['test/perf/**/*.perf.test.ts']` and the CDP write/exec gate
(`api: { allowWrite, allowExec }` — exact key path is a Wave-0 spike, Pitfall 1 / A2).

**Node-side command** (no existing analog — new construct; RESEARCH Pattern 4, lines 282-289):
browser specs cannot touch the filesystem, so persistence is a server-side command.
```typescript
import type { BrowserCommand } from 'vitest/node';
import { writeFileSync } from 'node:fs';
export const writeMetrics: BrowserCommand<[string, unknown]> = async (_ctx, path, data) => {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
};
// wire under test.browser.commands: { writeMetrics }; call via `commands.writeMetrics(...)` in-spec.
```
Fallback for the CDP gate (Pitfall 1): a custom command doing `ctx.page.context().newCDPSession(ctx.page)`.

---

### `api/perf.baseline.json` (committed baseline data)

**Analog:** `api/custom-elements.baseline.json` — the committed-baseline convention.

**Convention** (verified `api/custom-elements.baseline.json:1-30`): a plain committed JSON snapshot
that CI diffs a freshly-generated file against (baseline vs current, exactly how `diff:surface`
compares `api/custom-elements.baseline.json` ⟷ `dist/custom-elements.json`, `package.json:65`).
Generate `api/perf.baseline.json` once from a clean throttled run and commit it first-generation.
`perf-diff.mjs` diffs `api/perf.baseline.json` ⟷ fresh `api/perf.json`. Both live under `api/`,
which is outside `package.files` (`package.json:48-51`) so it never ships.

---

### `.size-limit.json` (MODIFY, config)

**Analog:** existing `.size-limit.json` — re-scope in place (RESEARCH "Code Examples" lines 361-377).

Current every entry has `"ignore": ["lit", "@floating-ui/dom"]` and `"gzip": true` (lines 5, 6, 19).
Required changes (CONTEXT D-02/D-05, Pitfall 3):
- **Remove `@floating-ui/dom` from every `ignore`** on delivered-payload entries (keep `lit` — peer dep).
- **Remove `"gzip": true`** from all entries — size-limit v13 defaults to brotli; removing it yields
  on-the-wire brotli for free.
- Add `dist/styles/tokens.css` entry.
- Add first-load composite entry (`path` array): `dist/amris-core.js` + button + input + dialog index.js (D-05).
- Add marginal-over-core per-component metric (arithmetic diff in `size-baseline.mjs` preferred).
- Limits are **report-only** placeholders this phase (filled from measured baseline; enforcing in Phase 11).

---

### `.github/workflows/ci.yml` (MODIFY, CI job)

**Analog:** existing `size` (lines 83-100) and `browser` (lines 35-51) jobs.

**New `perf` job** (RESEARCH lines 395-406) — mirror the `browser` job's Chromium install
(`ci.yml:47-48`: `npx playwright install chromium`), Node 20 + `cache: npm`, `npm ci`. Run
`npm run test:perf` then `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json`. NO
`continue-on-error` needed — perf-diff exits 0 (report-only, D-08). Sibling job, not folded into
`browser` (isolates the CDP write/exec privilege; Open Question 3).

**Re-scoped `size` job** (`ci.yml:83-100`): keep **Node 22** (line 88-90 comment: "size-limit@13
requires Node >=22.18; the rest of CI stays on Node 20" — preserve the split). Add report-only
`no-bundled-Lit` and `@size-limit/esbuild-why --why` steps.

**Preserve**: top-level `permissions: contents: read` (`ci.yml:10-11`) applies to new jobs too.

---

### `vite.config.ts` (MODIFY, config — visualizer plugin)

**Analog:** the `plugins` array (`vite.config.ts:200`) and `rollupOptions.plugins` (line 221).

Add `rollup-plugin-visualizer` **gated behind an env flag** (e.g. `process.env.VISUALIZE`) so normal
builds stay clean (CONTEXT D-09, RESEARCH A4). Insert into the existing `plugins: [stripLitCssComments()]`
array conditionally. Do NOT touch the `external` array (line 220) — it is snapshotted by the
no-bundled-Lit guard and must stay stable.

---

## Shared Patterns

### Committed baseline + zero-dep diff, report-only exit
**Source:** `scripts/cem-diff.mjs` (whole file) + `api/custom-elements.baseline.json`
**Apply to:** `scripts/perf-diff.mjs`, `scripts/size-baseline.mjs`, `scripts/assert-no-bundled-lit.mjs`
Key deltas from cem-diff: **invert the exit code to report-only** (`process.exit(0)`, D-08); cem-diff
is enforcing (`exit(code)` non-zero). Keep normalization (key by stable id, sort arrays, strip
volatile fields) and the `isMain`/usage-error(`exit(2)`) CLI guard.

### Browser-lane native purity (no setup.ts / no mocks)
**Source:** `vitest.config.ts:22-24`, `test/helpers.ts:1-7`, `test/browser/floating-position.test.ts:19`
**Apply to:** all `test/perf/*.perf.test.ts` and the new `perf` vitest project
Never import `test/setup.ts` or mock symbols; type-only imports; real Chromium APIs (Pitfall 1/2).

### Gate on counts, report wall-clock
**Source:** stated v1.1 discipline (CONTEXT D-06/D-07, RESEARCH Pattern 3)
**Apply to:** `harness.ts` summarize, `api/perf.baseline.json` shape, `perf-diff.mjs`
Counts are deterministic gated numbers; wall-clock median + mean+3σ band is volatile / report-only.

### Node-version split (size lane 22, rest 20)
**Source:** `.github/workflows/ci.yml:88-90`
**Apply to:** the re-scoped `size` job (stays 22), the new `perf` job (pin 20, document).

### First-party prototype instrumentation (never patch library internals)
**Source:** `src/internal/controllers/floating-position.ts:116-130`
**Apply to:** `harness.ts` count wrappers
Wrap `FloatingPositionController.prototype._updatePosition` + component lifecycle hooks + a style
MutationObserver cross-check. Never patch `@floating-ui/dom` or Lit.

## No Analog Found

None. Every file this phase creates or modifies maps to an existing in-repo pattern. The only
genuinely-new construct is the Vitest `writeMetrics` Node command and the `cdp()` throttle bridge —
both have an official-doc-grounded shape (RESEARCH Patterns 1 & 4) rather than an in-repo analog, and
both carry a Wave-0 spike (Pitfall 1 / A2) for the exact `api.allowWrite/allowExec` config key path.

## Metadata

**Analog search scope:** `scripts/`, `test/`, `test/browser/`, `src/internal/controllers/`, `api/`,
`.github/workflows/`, root config (`.size-limit.json`, `vite.config.ts`, `vitest.config.ts`, `package.json`)
**Files scanned:** 11 read this session
**Pattern extraction date:** 2026-08-22
</content>
</invoke>
