# Amris Cost Cards — Measured Size & Runtime Cost

> **Generated** by `node scripts/build-cost-cards.mjs` from the committed measured baselines (`api/size.baseline.json` + `api/perf.baseline.json`). Do NOT hand-edit — re-run the generator (`npm run build:cost-cards`). CI regenerates this file and fails on drift (`git diff --exit-code docs/cost-cards.md`). The generator NEVER re-measures — it reads the committed baselines only, so these numbers can never diverge from the enforced size/perf gates.

## Scope

These cards cover the **measured representative span**, not all 60+ components:
a light entry (`button`), overlay (`popover`), and heavy entries
(`data-grid`, `combobox`), plus the whole-bundle and first-load composites.
They let an enterprise consumer **budget** the banked size/runtime gains
against a representative range without re-measuring every component.

## Size cost (brotli on-the-wire)

Measured brotli-compressed bytes from `api/size.baseline.json` (unit: `brotli-bytes`). **Marginal over core** is the added cost a deep-import entry brings on top of the core bundle (negative = smaller than measuring it standalone, i.e. shared code already paid for).

| Entry | Brotli on-the-wire | Marginal over core |
| ----- | ------------------ | ------------------ |
| button (light deep import) | 2.06 kB | -19.10 kB |
| core bundle | 21.16 kB | — |
| data-grid (heavy deep import) | 10.98 kB | -10.17 kB |
| first-load composite (core+button+input+dialog) | 23.23 kB | — |
| full bundle | 61.28 kB | — |
| popover (overlay deep import) | 9.58 kB | -11.58 kB |
| tokens.css | 2.59 kB | — |

## Runtime cost (deterministic counts)

Deterministic instrumentation counts per scenario from `api/perf.baseline.json`
(update/updated/render lifecycle ticks, DOM `nodes`, plus scenario-specific
work such as `sortComputes`, `filterCalls`, `computePosition`, `repositions`,
`middlewareBuilds`). These are **environment-independent counts** — the enforced
runtime gate — not timings.

### `button`

| Metric | Count |
| ------ | ----- |
| nodes | 5 |
| render | 4 |
| update | 4 |
| updated | 4 |

### `combobox`

| Metric | Count |
| ------ | ----- |
| filterCalls | 10 |
| nodes | 20 |
| render | 11 |
| update | 11 |
| updated | 11 |

### `data-grid`

| Metric | Count |
| ------ | ----- |
| nodes | 250 |
| render | 5 |
| sortComputes | 1 |
| update | 5 |
| updated | 5 |

### `overlay`

| Metric | Count |
| ------ | ----- |
| computePosition | 4 |
| middlewareBuilds | 1 |
| nodes | 5 |
| render | 7 |
| repositions | 2 |
| update | 7 |
| updated | 7 |

## Wall-clock timing — report-only / volatile (NOT a budget)

The wall-clock median and mean+3σ band below are **report-only and volatile**.
They depend on the CI runner CPU, throttle profile, and background load, so they
are **NOT a budget, ceiling, or limit** — do not gate on them and do not treat
them as a hard consumer contract. The enforced runtime budget is the deterministic
count table above; wall-clock is published only to give a rough felt-latency sense.

| Scenario | Median | Mean+3σ band |
| -------- | ------ | ------------ |
| button | 15.40 ms | 24.30 ms |
| combobox | 88.20 ms | 137.61 ms |
| data-grid | 102.60 ms | 144.55 ms |
| overlay | 38.10 ms | 54.64 ms |
