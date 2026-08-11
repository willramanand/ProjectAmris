# Stack Research

**Domain:** CI hardening tooling for a Lit 3 / Web Components UI library going to a frozen, gate-enforced v1.0
**Researched:** 2026-08-10
**Confidence:** HIGH (testing, coverage, bundle-size, release); MEDIUM (API-diff tooling — newer packages)

> Scope note: This is a *hardening* milestone for an existing library. The runtime stack (TypeScript 6, Lit 3.3, Vite 8, Vitest 4, Storybook 10, @floating-ui/dom, Changesets, axe-core, custom-elements-manifest) is already in place and documented in `.planning/codebase/STACK.md` — it is **not** re-researched here. This file recommends only what to **ADD or UPGRADE** to reach a CI-gated v1.0, plus what to deliberately **NOT** add.

---

## TL;DR Recommendations

| Gate | Add / Upgrade | Verdict |
|------|---------------|---------|
| Real-browser testing | **Vitest 4 Browser Mode + Playwright provider** (`@vitest/browser-playwright`), hybrid with existing jsdom | ADOPT (partial migration) |
| A11y in CI | **`@axe-core/playwright`** run inside the browser project | ADOPT |
| Coverage gate | Enable `coverage.thresholds` in existing `@vitest/coverage-v8` | ENABLE (no new dep) |
| Bundle-size budget | **`size-limit` + `@size-limit/preset-small-lib`** + `size-limit-action` | ADOPT |
| Release/publish | Keep Changesets; add **`changesets/action@v1`** GitHub Action → GitHub Packages | ADOPT |
| API-freeze guard (element surface) | **`@wc-toolkit/changelog`** diffing committed `custom-elements.json` | ADOPT |
| API-freeze guard (`.d.ts` surface) | `@microsoft/api-extractor` | OPTIONAL — defer unless TS types are a first-class contract |

---

## The load-bearing decision: keep jsdom vs. adopt real-browser testing

**Recommendation: adopt a hybrid — keep jsdom for fast logic tests, add a Vitest Browser Mode (Playwright/Chromium) project for the tests where jsdom lies.** Do NOT do a wholesale rewrite to `@web/test-runner`.

### Why jsdom is insufficient at 1.0 for *this* library (HIGH confidence)

The library's stated v1.0 core value is *"form controls correct, accessible, and API-stable."* jsdom cannot faithfully verify the parts that make that true:

- **ElementInternals / form-association is not polyfillable and is currently *mocked*.** `test/setup.ts` patches `attachInternals` with a hand-rolled `MockElementInternals` and asserts against `internals.formValue`. That tests *the mock*, not the browser. A form-heavy library must not freeze v1.0 on a mock of its most critical API. Real Chromium implements form-associated custom elements natively, so `setFormValue`/`setValidity`/`validationMessage`, participation in a real `<form>`, and actual submission can be asserted for real.
- **Focus management, focus-trap, and `:focus-visible`** — explicit v1.0 concerns ("guard focus restoration against removed nodes", focus-trap gaps). jsdom has no real focus model; browser mode does.
- **Real `<dialog>` semantics** — `showModal()`/`close()` are currently mocked; dialog animation-cleanup hardening is a v1.0 item. Real browser exercises top-layer, backdrop, and `close` events.
- **Computed styles / Shadow DOM styling / ResizeObserver / matchMedia** — all shimmed or absent in jsdom (`ResizeObserver` and `matchMedia` are mocked in setup). Floating-UI positioning and virtualization work depends on real layout.
- **A11y color-contrast is currently *disabled***: `a11y-helper.ts` turns off `color-contrast` and `region` "because jsdom has no computed styles." That is a silent coverage hole in an accessibility-first library. Running axe in a real browser lets those rules actually run.

### Why Vitest Browser Mode over @web/test-runner (HIGH confidence)

Both run tests in a real browser and both are correct choices for Lit in 2026. The deciding factor for a *hardening* milestone is migration cost and infra reuse:

- The library is **already on Vitest 4**. Browser Mode went **fully stable (non-experimental) in Vitest 4** and reuses the exact `describe/it/expect` API and config — the existing 46 test files, `fixture()`/`shadowQuery()`/`oneEvent()` helpers, and coverage setup largely carry over. Moving to `@web/test-runner` means a second runner, adopting `@open-wc/testing` + `@web/test-runner-*` plugins, and rewriting helper imports across all files — pure churn during a stabilization push.
- One config runs **both** environments via Vitest `projects`: a `jsdom` project for pure logic and a `browser` project (Playwright/Chromium) for form/focus/overlay/a11y. Same coverage pipeline over both.
- Browser Mode does not bundle its browser driver; you install the provider package `@vitest/browser-playwright` (its minor **must match** Vitest's).

`@web/test-runner` remains the "canonical Lit" tool and is a fine alternative for a greenfield WC library or if you want Lit SSR/hydration testing via `@lit-labs/testing`. It is not worth the switch here.

### Migration shape (not a full rewrite)
- Keep all existing jsdom tests running as the `jsdom` project.
- Create a `browser` project and move only the tests that need fidelity there: form-association, validity/validationMessage, focus-trap, dialog/overlay, and the a11y suite.
- Delete the `ElementInternals`, `showModal`, `matchMedia`, `ResizeObserver` mocks *for the browser project* (they exist natively) — the mocks stay only for the jsdom project.

---

## Recommended Stack (additions/upgrades)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@vitest/browser-playwright` | 4.1.10 | Playwright provider for Vitest Browser Mode | Real-browser fidelity for ElementInternals/focus/Shadow DOM/dialog; reuses existing Vitest 4 infra with zero test-API rewrite. Minor version must track `vitest`. |
| `playwright` | 1.62.1 | Browser binaries/driver used by the provider | Chromium (and optionally WebKit for the Safari-16.4 floor) engine that backs the browser project. |
| `size-limit` + `@size-limit/preset-small-lib` | 13.0.3 | Per-entry bundle budgets, fails CI on regression | Library-grade budget tool that understands **tree-shaking + gzip/brotli** — matches Amris's tree-shakeable multi-entry exports (`amris-core`, `amris`, per-component). Posts size deltas on PRs. |
| `@wc-toolkit/changelog` | 1.0.2 | Diffs `custom-elements.json` between versions; classifies breaking vs. additive | Guards the **element-level public surface** (attributes, props, events, slots, CSS custom props, CSS parts) — precisely the contract WC consumers depend on and exactly what a frozen v1.0 must protect. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@axe-core/playwright` | 4.12.1 | Runs axe inside the real browser | Move the a11y suite here so `color-contrast`/`region` rules (currently disabled under jsdom) actually execute. |
| `@vitest/coverage-v8` | already installed (4.1.x) | Coverage provider | No new dep — just enable `coverage.thresholds` to make coverage a hard CI gate. See compatibility note re: browser-project coverage. |
| `@microsoft/api-extractor` | 7.58.12 | Committed `.api.md` report of the `.d.ts` surface; fails CI on unreviewed type changes | OPTIONAL. Add only if exported TypeScript types/utilities are a first-class part of the contract. For an element-first library the CEM changelog is the higher-value guard. |

### Development Tools / CI Actions

| Tool | Purpose | Notes |
|------|---------|-------|
| `changesets/action@v1` | Version-PR + publish automation | v1 branch = Changesets **v2** CLI compat (what Amris uses); the v2 branch targets Changesets v3. Pin to a commit SHA for supply-chain safety. |
| `andresz1/size-limit-action` | Comments size-limit deltas on PRs | Wraps `size-limit` for GitHub Actions; use the CLI directly in the merge-gate job and the action for PR comments. |
| `actions/setup-node` (registry config) | Points npm auth at GitHub Packages | `registry-url: https://npm.pkg.github.com`, scope `@willramanand`, `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. |

---

## Installation

```bash
# Real-browser testing (dev)
npm install -D @vitest/browser-playwright@4.1.10 playwright@1.62.1
npx playwright install chromium   # add webkit to cover the Safari 16.4 floor

# A11y in the browser
npm install -D @axe-core/playwright@4.12.1

# Bundle-size budgets
npm install -D size-limit@13 @size-limit/preset-small-lib@13

# API-freeze guard (element surface)
npm install -D @wc-toolkit/changelog@1

# OPTIONAL: TypeScript .d.ts surface guard
npm install -D @microsoft/api-extractor@7
```

Release automation (`changesets/action@v1`) and `size-limit-action` are GitHub Actions referenced in workflow YAML, not npm installs. Coverage thresholds need **no** install — configure the existing `@vitest/coverage-v8`.

---

## Configuration sketch (the five gates)

1. **Coverage gate** — in `vitest.config.ts`:
   ```ts
   coverage: {
     provider: 'v8',
     thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
     exclude: ['**/*.stories.ts', 'test/**', 'dist/**'],
   }
   ```
   Run with `--coverage` in CI; Vitest exits non-zero below threshold. Start the floor at current measured coverage and ratchet up as the 20 untested components get tests.

2. **Browser project** — Vitest `projects`: one `jsdom` (logic), one `browser` (`provider: 'playwright'`, `instances: [{ browser: 'chromium' }]`) for form/focus/overlay/a11y tests.

3. **Bundle-size gate** — `.size-limit.json` with one entry per public bundle (`dist/amris-core.js`, `dist/amris.js`, and representative per-component entries), each with a `limit` and `import` for tree-shaking accuracy. `size-limit` in the CI gate job fails on overflow.

4. **API-freeze gate** — commit the built `custom-elements.json` as the frozen baseline; in CI, regenerate and run `@wc-toolkit/changelog` against the baseline; fail the job on any **breaking** classification unless a matching major/minor changeset justifies it.

5. **Release gate** — a `release.yml` running `changesets/action@v1` that only publishes after tests + coverage + a11y + size-limit + API-diff jobs are green.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vitest Browser Mode (Playwright) | `@web/test-runner` + `@open-wc/testing` | Greenfield WC library, or you need Lit SSR/hydration testing (`@lit-labs/testing`). Not worth the runner switch + full helper rewrite mid-hardening. |
| Vitest Browser Mode | Playwright **Component Testing** (`experimental-ct-*`) | React/Vue/Svelte apps. Still experimental, not Lit-oriented, and overlaps Browser Mode — no reason to add here. |
| `size-limit` | `bundlesize` | Legacy CI setups (Travis/Circle). `bundlesize` is less maintained and lacks tree-shaking awareness — wrong fit for a per-component export library. |
| `@wc-toolkit/changelog` (CEM diff) | `@microsoft/api-extractor` (`.d.ts` diff) | Add api-extractor *in addition* when the TS type surface is itself a heavily-consumed contract. For element-first APIs, CEM diff is primary. |
| `changesets/action` | `semantic-release` | Only if abandoning Changesets — not warranted; Changesets is already the chosen, working flow. |
| In-CI Vitest coverage gate | Codecov / Coveralls | Only if you want historical trend dashboards/PR annotations from a SaaS. For a private GitHub Packages lib, the in-CI threshold gate is sufficient and adds no secrets. |

---

## What NOT to Add (avoid over-tooling a 1.0)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@web/test-runner` alongside Vitest | Two runners = double config, double CI time, split helpers | Single Vitest config with jsdom + browser projects |
| Playwright `experimental-ct` | Experimental, non-Lit, overlaps Browser Mode | Vitest Browser Mode |
| `bundlesize` | Unmaintained, no tree-shaking awareness | `size-limit` + preset-small-lib |
| Full app-level E2E (Playwright Test / Cypress) | This is a component *library*, not an app — no user journeys to E2E | Component-level browser tests |
| Visual-regression (Chromatic / Playwright screenshots) | Real value but scope creep for 1.0; pixel baselines are high-maintenance | Defer to post-1.0; Storybook 10 already covers visual dev |
| `semantic-release` | Duplicates Changesets; migration churn | Keep Changesets + `changesets/action` |
| External coverage SaaS (Codecov) as a *gate* | Adds tokens/config for a private lib with little gain | In-CI `coverage.thresholds` |
| Making `@microsoft/api-extractor` mandatory | Heavy for an element-first API; CEM diff already guards the consumer-facing surface | `@wc-toolkit/changelog`; add api-extractor only if TS types are a core contract |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@vitest/browser-playwright` 4.1.x | `vitest` 4.1.x | **Minor versions must match.** Bump together. |
| Vitest Browser Mode coverage | `@vitest/coverage-v8` 4.x | V8 coverage is supported in Vitest 4 browser mode. If instrumentation issues surface in the browser project, fall back to `@vitest/coverage-istanbul` for that project only. (MEDIUM confidence — validate during setup.) |
| `playwright` 1.62.x | Chromium/WebKit binaries via `playwright install` | Add WebKit to exercise the Safari 16.4 ElementInternals floor documented in `BROWSER_SUPPORT.md`. |
| `changesets/action` v1 | `@changesets/cli` v2 (Amris) | Use the v1 branch/tag; the v2 branch requires Changesets v3. Pin to a commit SHA. |
| `@wc-toolkit/changelog` 1.0.2 | `custom-elements.json` from `@custom-elements-manifest/analyzer` 0.11 | Consumes standard CEM output already produced by the build. |
| GitHub Packages publish | `actions/setup-node` + `GITHUB_TOKEN` | Needs `permissions: { contents: write, pull-requests: write, packages: write, id-token: write }` and `registry-url: https://npm.pkg.github.com`. |

---

## Confidence by Recommendation

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Vitest 4 Browser Mode (Playwright) hybrid | HIGH | Browser Mode stable in Vitest 4; verified provider pkg `@vitest/browser-playwright` 4.1.10; direct fit to ElementInternals/focus/dialog gaps in existing setup |
| Enable `coverage.thresholds` (no new dep) | HIGH | Standard Vitest feature; already have coverage-v8 |
| `size-limit` + preset-small-lib for budgets | HIGH | Verified 13.0.3; standard library budget tool with tree-shaking + PR comments |
| Changesets + `changesets/action@v1` → GitHub Packages | HIGH | Verified action exists; standard, well-documented flow |
| `@axe-core/playwright` for real-browser a11y | HIGH | Verified 4.12.1; unblocks disabled color-contrast rule |
| `@wc-toolkit/changelog` for CEM API-diff | MEDIUM | Verified pkg 1.0.2 and purpose, but newer/less battle-tested; validate output format on Amris's manifest before wiring the hard gate |
| `@microsoft/api-extractor` as optional `.d.ts` guard | MEDIUM | Verified 7.58.12; mature but heavier — value depends on how much the TS type surface matters to consumers |

---

## Sources

- Vitest 4 Browser Mode stable + Playwright provider (`@vitest/browser-playwright`): https://voidzero.dev/posts/announcing-vitest-4 , https://vitest.dev/blog/vitest-4 , https://qaskills.sh/blog/vitest-browser-mode-complete-guide — HIGH
- Vitest Browser Mode vs Playwright / when browser mode is required (Web Components, Shadow DOM, computed styles): https://www.epicweb.dev/vitest-browser-mode-vs-playwright , https://www.sitepoint.com/vitest-4-browser-mode-component-testing-without-playwright/ — HIGH
- @web/test-runner for Lit (canonical alternative): https://lit.dev/docs/tools/testing/ , https://open-wc.org/guides/developing-components/testing/ — HIGH
- size-limit (perf-budget, PR comments, tree-shaking): https://github.com/ai/size-limit ; bundlesize (legacy): https://github.com/siddharthkp/bundlesize — HIGH
- Changesets GitHub Action + GitHub Packages/OIDC publish flow: https://github.com/changesets/action , https://blog.ignacemaes.com/automate-npm-releases-on-github-using-changesets/ — HIGH
- CEM breaking-change detection + `@wc-toolkit/changelog`: https://wc-toolkit.com/adoption/changelog/ , https://github.com/webcomponents/custom-elements-manifest — MEDIUM
- Version checks via `npm view` (2026-08-10): size-limit 13.0.3, @vitest/browser-playwright 4.1.10, vitest 4.1.10, @custom-elements-manifest/analyzer 0.11.0, @microsoft/api-extractor 7.58.12, playwright 1.62.1, @axe-core/playwright 4.12.1, @wc-toolkit/changelog 1.0.2 — HIGH

---
*Stack research for: Lit Web Components library CI hardening to v1.0*
*Researched: 2026-08-10*
