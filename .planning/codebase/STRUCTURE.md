# Codebase Structure

**Analysis Date:** 2026-08-23

## Directory Layout

```
ProjectAmris/
├── src/
│   ├── index.ts                # Core bundle entry (public API subset)
│   ├── index.all.ts            # Full bundle entry (all components)
│   ├── index.css               # Aggregate stylesheet
│   ├── components/             # 67 custom elements, one dir per component
│   │   └── <name>/
│   │       ├── <name>.ts       # Component class (LitElement)
│   │       └── index.ts        # Barrel: `export * from './<name>.js'`
│   ├── internal/              # Non-public chokepoint layer (never re-exported)
│   │   ├── controllers/       # Lit ReactiveControllers
│   │   └── helpers/           # Stateless helpers (lazy-load, date/time, virtualize)
│   ├── tokens/               # --am-* design tokens (primitives/semantic/dark)
│   ├── styles/               # Base reset + corners styles
│   ├── utilities/            # form-actions, unique-id
│   └── stories/              # Storybook stories (*.stories.ts)
├── test/
│   ├── components/           # Per-component unit tests (jsdom)
│   ├── internal/             # Controller/helper unit tests
│   ├── browser/              # Real-browser lane (overlays, virtualization, a11y)
│   ├── perf/                 # Throttled runtime-perf harness + scenario specs
│   ├── setup.ts              # Vitest setup
│   ├── a11y*.ts              # axe-core accessibility helpers/tests
│   └── *.test.ts             # Cross-cutting guards (no-bundled-lit, cem-diff, purity)
├── scripts/                  # Build/CI tooling (tokens, CEM diff, size, audits)
├── dist/                     # Build output (gitignored artifact)
├── docs/                     # Project docs incl. contract.md
├── .storybook/               # Storybook config
├── vite.config.ts            # Build + externals config
├── vitest.config.ts          # Test config (jsdom + browser + perf lanes)
├── package.json              # Exports map, sideEffects, scripts
└── custom-elements-manifest.config.js  # CEM analyzer config
```

## Directory Purposes

**`src/components/<name>/`:**
- Purpose: One custom element per directory
- Contains: `<name>.ts` (class), `index.ts` (barrel)
- Key files: `src/components/button/button.ts`, `src/components/combobox/combobox.ts`

**`src/internal/`:**
- Purpose: Shared cross-cutting logic; NOT part of the public API/CEM
- Contains: `controllers/` (floating-position, validation, listbox-nav, option-filter, shortcut-registry), `helpers/` (lazy-load, virtualize-support, teardown-scope, date-utils, time-utils)
- Key files: `src/internal/controllers/floating-position.ts`, `src/internal/helpers/lazy-load.ts`

**`src/tokens/`:**
- Purpose: Design-system values as `--am-*` CSS custom properties
- Key files: `src/tokens/primitives.css.ts`, `src/tokens/semantic.css.ts`, `src/tokens/dark.css.ts`, `src/tokens/index.ts`

**`src/styles/` & `src/utilities/`:**
- Purpose: Base reset/corner styles; form + id helpers
- Key files: `src/styles/reset.css.ts`, `src/styles/corners.css.ts`, `src/utilities/form-actions.ts`, `src/utilities/unique-id.ts`

**`test/perf/` & `test/browser/`:**
- Purpose: Runtime-perf measurement (Phase 7) and real-browser regression lane (Phase 7/8)
- Key files: `test/perf/harness.ts`, `test/browser/floating-position.test.ts`, `test/browser/*-virtual.test.ts`

## Key File Locations

**Entry Points:**
- `src/index.ts`: Core bundle → `dist/amris-core.js` (`./core`)
- `src/index.all.ts`: Full bundle → `dist/amris.js` (`.` default)
- `src/components/<name>/index.ts`: Deep import → `dist/components/*/index.js`

**Configuration:**
- `vite.config.ts`: Build, `external` deps (line 241), chunking
- `vitest.config.ts`: jsdom/browser/perf test lanes
- `tsconfig.json`, `tsconfig.types.json`: TS strict + type emit
- `custom-elements-manifest.config.js`: CEM generation
- `.size-limit.json`: Bundle size budgets

**Core Logic:**
- `src/components/<name>/<name>.ts`: Component implementations
- `src/internal/controllers/*.ts`, `src/internal/helpers/*.ts`: Shared logic

**Testing:**
- `test/components/*.test.ts`: Unit tests
- `test/browser/*.test.ts`: Browser lane
- `test/perf/*.perf.test.ts`: Perf scenarios

## Naming Conventions

**Files:**
- Component source: kebab-case `<name>.ts` (e.g. `date-picker.ts`)
- Component barrel: `index.ts`
- Style modules: kebab-case with `.css.ts` suffix (e.g. `reset.css.ts`, `dark.css.ts`)
- Tests: `<name>.test.ts`; browser: `<name>.test.ts` under `test/browser/`; perf: `<name>.perf.test.ts`
- Stories: `<name>.stories.ts`

**Directories:**
- Component dirs: kebab-case matching tag suffix (e.g. `split-view/` → `<am-split-view>`)

**Symbols:**
- Component classes: PascalCase with `Am` prefix (e.g. `AmButton`, `AmCombobox`); default-ish named export from source
- Exported types: PascalCase (e.g. `ButtonVariant`, `ComboboxSize`) via `export type`
- Custom elements: `am-<kebab>` via `@customElement`
- Private members: leading underscore (e.g. `_internals`, `_updatePosition`)

## Where to Add New Code

**New component:**
- Create `src/components/<name>/<name>.ts` (class + types) and `src/components/<name>/index.ts` (`export * from './<name>.js'`)
- Add named exports to `src/index.all.ts` (and `src/index.ts` if it belongs in the core bundle)
- Add unit test `test/components/<name>.test.ts`; browser test under `test/browser/` if it uses overlays/virtualization
- Add story `src/stories/<name>.stories.ts`
- Regenerate CEM and check `scripts/cem-diff.mjs` — CEM changes are public-surface changes

**New shared behavior:**
- Add a `ReactiveController` to `src/internal/controllers/` or a helper to `src/internal/helpers/`
- Never re-export it from a public barrel

**New heavy dependency:**
- Wrap it in a memoized loader in `src/internal/helpers/lazy-load.ts` and mark it `external` in `vite.config.ts`

**New tokens:**
- Add to `src/tokens/primitives.css.ts` / `semantic.css.ts`, with dark overrides in `dark.css.ts`

## Special Directories

**`dist/`:**
- Purpose: Build output (bundles, per-component chunks, `custom-elements.json`, `styles/tokens.css`, `.d.ts`)
- Generated: Yes (Vite + tsc + cem)
- Committed: No (gitignored)

**`src/internal/`:**
- Purpose: Private chokepoint layer
- Generated: No
- Committed: Yes — but excluded from the public API/CEM surface

**`coverage/`, `.vitest-attachments/`, `tachometer/`:**
- Purpose: Test/coverage/perf artifacts
- Generated: Yes
- Committed: No (artifacts)

---

*Structure analysis: 2026-08-23*
