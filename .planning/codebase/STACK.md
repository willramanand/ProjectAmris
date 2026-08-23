---
last_mapped_commit: 18f16d20ded8ec01a7526d27623691bc0e7f61c6
last_mapped_at: 2026-08-23T13:39:41-04:00
---
# Technology Stack

**Analysis Date:** 2026-08-23

## Languages

**Primary:**

- TypeScript `^6.0.3` — All source under `src/`, config, and build/measurement scripts (`scripts/*.mjs` are Node ESM JS)
- JavaScript (ES2023) — Compilation output target and Node scripts in `scripts/`

**Secondary:**

- HTML — Component templates via Lit's `html` tagged template (inside `src/components/*/*.ts`)
- CSS — Styling via Lit's `css` tagged template and design tokens in `src/tokens/`

## Runtime

**Environment:**

- Node.js 20 for build/test/publish (`.github/workflows/ci.yml`, `release.yml`, `publish.yml`)
- Node.js 22 required ONLY for the `size` lane — `size-limit@13` needs `>=22.18` (`ci.yml` size job)
- Browser floor: Safari 16.4 (ElementInternals not polyfillable — see project constraints); target ES2023

**Package Manager:**

- npm (uses `package-lock.json`)
- Lockfile: Present (`package-lock.json`)
- Scoped registry config: `.npmrc` maps `@willramanand:registry` → `https://npm.pkg.github.com`

## Frameworks

**Core:**

- Lit `^3.3.2` — Peer dependency (NOT bundled). Web component authoring: decorators, reactivity, templating

**Component runtime dependencies (bundled/external per `vite.config.ts`):**

- `@lit/context` `^1.1.6` — Context protocol (e.g. theme provider), a hard runtime dependency
- `@floating-ui/dom` `^1.7.6` — Overlay positioning; dynamically imported (see INTEGRATIONS.md), externalized from bundle
- `@lit-labs/virtualizer` `2.1.1` (pinned) — List virtualization; dynamically imported, externalized

**Testing:**

- Vitest `^4.1.0` — Unit/integration runner, three projects: `jsdom`, `browser`, `perf` (`vitest.config.ts`)
- `@vitest/coverage-v8` `^4.1.0` — V8 coverage (folds over `jsdom` project only)
- `@vitest/browser-playwright` `4.1.9` — Browser-mode provider
- `playwright` `^1.62.1` (Chromium only) — Real-browser fidelity + perf lanes
- `jsdom` `^29.0.0` — Headless DOM for the logic lane
- `axe-core` `^4.11.1` — Accessibility/WCAG assertions (`test/a11y.test.ts`, `test/browser/a11y.browser.test.ts`)

**Build/Dev:**

- Vite `^8.0.0` — Dev server (`vite --host`) and library-mode bundler (`vite.config.ts`)
- Terser `^5.46.1` — Minification (`build.minify: 'terser'`)
- `@lit-labs/rollup-plugin-minify-html-literals` `^0.2.0` — Minifies `html`/`css` template literals at build
- `@custom-elements-manifest/analyzer` `^0.11.0` (`cem`) — Generates `dist/custom-elements.json`
- `custom-elements-manifest` `^2.1.0` — CEM tooling/types
- Storybook `^10.3.0` + `@storybook/web-components-vite` / `@storybook/web-components` `^10.3.0` — Component docs
- `highlight.js` `^11.11.1` — Syntax highlighting in docs (must ship in NO chunk — see attribution guard)

**Measurement / release tooling:**

- `size-limit` `^13.0.3` + `@size-limit/preset-small-lib` + `@size-limit/esbuild-why` — Bundle budgets (`.size-limit.json`)
- `tachometer` `^0.7.2` — Micro-benchmark configs in `tachometer/`
- `rollup-plugin-visualizer` `^7.1.1` — Dev-only bundle attribution (`VISUALIZE=1`, emits `bundle-stats.json` outside `dist/`)
- `@changesets/cli` `^2.6.0` — Semantic versioning + changelog + publish orchestration

## Key Dependencies

**Critical (runtime, consumer-facing):**

- `lit` `^3.3.2` (peer) — Consumer provides it; never bundled (enforced by `scripts/assert-no-bundled-lit.mjs`)
- `@lit/context` `^1.1.6` — Only non-lit hard runtime dependency
- `@floating-ui/dom` `^1.7.6` — Lazy-loaded overlay positioning (`src/internal/helpers/lazy-load.ts`)
- `@lit-labs/virtualizer` `2.1.1` — Lazy-loaded virtualization for combobox/select/data-grid

**Infrastructure:**

- `terser`, `vite`, `typescript`, `vitest`, `playwright`, `size-limit`, `tachometer`, `@changesets/cli`

## Configuration

**No runtime environment variables required** by the shipped library.

**Build-time env flags:**

- `VISUALIZE` — When set, `vite.config.ts` adds `rollup-plugin-visualizer` emitting `bundle-stats.json`

**TypeScript:**

- `tsconfig.json` — `target: ES2023`, `module: ESNext`, `moduleResolution: bundler`, `lib: [ES2023, DOM, DOM.Iterable]`
  - Strict: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `erasableSyntaxOnly`, `verbatimModuleSyntax`
  - `experimentalDecorators: true`, `useDefineForClassFields: false` (Lit decorator requirement)
  - `noEmit: true` (Vite emits JS; tsc is typecheck-only in dev/CI)
- `tsconfig.types.json` — Separate config for emitting `.d.ts` type declarations (`tsc -p tsconfig.types.json`)

**Build config (`vite.config.ts`):**

- Library mode, ES-only (`formats: ['es']`), `outDir: dist`, `sourcemap: true`, `minify: terser`
- Multi-entry: `amris` (`src/index.all.ts`), `amris-core` (`src/index.ts`), plus auto-discovered per-component,
  `tokens/index`, and flat `utilities/*` / `styles/*` entries (so deep `exports` subpaths resolve to real JS)

- Externals: `lit`, `lit/*`, `@lit/*`, `@lit-labs/*`, `@floating-ui/dom`, `@floating-ui/*` (never bundled)
- Custom plugin `stripLitCssComments` strips `/* */` inside `css` template literals in `src/`
- Output: `[name].js` entries, `chunks/[name]-[hash].js`, `assets/[name]-[hash][extname]`

**Bundle budgets (`.size-limit.json`, `lit` ignored):**

- core bundle `dist/amris-core.js` ≤ 28 kB; full bundle `dist/amris.js` ≤ 75 kB
- button deep import ≤ 2.5 kB; data-grid ≤ 13 kB; popover ≤ 12 kB
- first-load composite (core+button+input+dialog) ≤ 40 kB

**CEM config:** `custom-elements-manifest.config.js` (used by `npm run build:manifest`)

## Build & Verification Pipeline

**Build (`npm run build`):** `tsc` (typecheck) → `vite build` → `tsc -p tsconfig.types.json` (d.ts) →
`build:manifest` (CEM) → `build:contract-doc` (`scripts/build-contract-doc.mjs` → `docs/contract.md`) →
`build:tokens-css` (`scripts/build-tokens-css.mjs` → `dist/styles/tokens.css`)

**Test lanes (`vitest.config.ts` projects):**

- `jsdom` — logic lane, `test/**/*.test.ts`, uses `test/setup.ts` mocks, coverage gate lives here
- `browser` — Chromium/Playwright fidelity lane, `test/browser/**`, NO setup mocks (real native APIs)
- `perf` — Chromium-only throttled perf harness, `test/perf/**/*.{cdp,perf}.test.ts`, serial (`fileParallelism: false`),
  uses privileged `cdp()` via `browser.api.{allowWrite,allowExec}` and a Node-side `writeMetrics` command → `api/perf.json`

**Coverage thresholds (jsdom):** global floors br 70 / fn 81 / ln 84 / st 83, plus per-directory tiers for
combobox, date-picker, select, dialog (ratcheted to measured floors).

**Release-gate scripts (`scripts/`):**

- `cem-diff.mjs` (public-surface diff vs `api/custom-elements.baseline.json`, `diff:surface`)
- `size-baseline.mjs` (brotli per-entry baseline vs `api/size.baseline.json`)
- `assert-no-bundled-lit.mjs` (fails if Lit inlined)
- `deep-import-purity.mjs` (deep-import purity check over `dist`)
- `attribution-check.mjs` (confirms `highlight.js` ships in no chunk)
- `perf-diff.mjs` (report-only perf diff vs `api/perf.baseline.json`)
- `smoke-pack.mjs` (pack → install → resolve entry matrix in a throwaway project)

## Platform Requirements

**Development:**

- Node.js 20 (22 for `size` lane), npm, TypeScript strict-mode familiarity
- Web Components + Lit 3 + ElementInternals knowledge

**Production (consumer):**

- ES2023-capable browser, Safari 16.4+ floor
- Must provide `lit ^3.3.2` as peer dependency; no external runtime deps bundled
- ESM-only, tree-shakeable via `sideEffects` allowlist in `package.json`

---

*Stack analysis: 2026-08-23*
