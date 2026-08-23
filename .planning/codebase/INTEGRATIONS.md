# External Integrations

**Analysis Date:** 2026-08-23

Amris is a client-side UI component library. It has **no backend, no server calls, no database, and no runtime auth**.
"Integrations" here means the third-party libraries it consumes, the package registry it publishes to, and its
CI/CD toolchain — not network services.

## APIs & External Services

**Runtime network calls:** None. The library makes no HTTP/fetch/WebSocket calls of its own.

**Third-party libraries (in-process, not network services):**
- `@floating-ui/dom` `^1.7.6` — Overlay positioning (dialog, tooltip, popover, dropdown, menu, combobox)
  - Integration point: `src/internal/controllers/floating-position.ts` and lazy loader
    `src/internal/helpers/lazy-load.ts` (`loadFloating()` → `import('@floating-ui/dom')`)
  - **Dynamically imported** (bundle-size deferral, Phase 8) and externalized in `vite.config.ts` — never in the
    initial chunk; resolved on first overlay open
- `@lit-labs/virtualizer` `2.1.1` (pinned) — Row/option virtualization
  - Integration point: `src/internal/helpers/lazy-load.ts` (`loadVirtualizer()` →
    `import('@lit-labs/virtualizer/virtualize.js')`), consumed by
    `src/components/combobox/combobox.ts`, `src/components/select/select.ts`, `src/components/data-grid/data-grid.ts`
  - **Dynamically imported** and externalized — deferred cost, loaded only when a virtualized list renders
- `@lit/context` `^1.1.6` — Lit context protocol (theming / provider wiring)
- `lit` `^3.3.2` — Peer dependency, consumer-provided, never bundled

## Browser Platform APIs (integration surface)

The library integrates directly with native browser APIs instead of external services:
- **ElementInternals** (`attachInternals()`) — Form association for `<am-input>`, `<am-checkbox>`, etc.
  Not polyfillable; sets the Safari 16.4 browser floor.
- **Shadow DOM** — Style encapsulation on every component.
- **`<dialog>` / top-layer** — Overlay/dialog rendering (`test/browser/dialog-top-layer.test.ts`).
- **ResizeObserver / matchMedia** — Layout + theming; mocked in the jsdom lane, real in the browser lane.

## Data Storage

**Databases:** None.
**File Storage:** None at runtime. Build/measurement artifacts written to repo (`api/perf.json`, `dist/`,
dev-only `bundle-stats.json`).
**Caching:** None at runtime. Module-level memoized promises for lazy imports in
`src/internal/helpers/lazy-load.ts` (`floatingPromise`, `virtualizerPromise`).

## Authentication & Identity

**Runtime auth:** None — the library ships no auth.

**CI/publish auth:**
- GitHub Packages publish uses `NODE_AUTH_TOKEN` / `GITHUB_TOKEN` (GitHub Actions secret), passed only as step
  `env`, never echoed (`.github/workflows/release.yml`, `publish.yml`)
- Registry scope configured in `.npmrc` (`@willramanand:registry=https://npm.pkg.github.com`)

## Monitoring & Observability

**Error Tracking:** None (no runtime logging; errors handled via component state/events per conventions).
**Logs:** None in shipped code.
**Perf/size telemetry (CI-only, report-only):** perf harness → `api/perf.json` diffed by `scripts/perf-diff.mjs`;
`size-limit` budgets + brotli baseline via `scripts/size-baseline.mjs`; attribution via `scripts/attribution-check.mjs`.

## CI/CD & Deployment

**Package registry (deployment target):**
- GitHub Packages — `https://npm.pkg.github.com`, package `@willramanand/amris`, access `restricted`
  (`package.json` `publishConfig`)

**CI Pipeline (`.github/workflows/ci.yml`, PR + push to main, read-only permissions):**
- `verify` — typecheck, jsdom coverage gate, build (Node 20)
- `browser` — Playwright/Chromium install + `test:browser` (real ElementInternals + in-browser axe)
- `surface-diff` — build CEM, contract-doc drift check (`git diff --exit-code docs/contract.md`), enforcing `diff:surface`
- `perf` — Chromium throttled perf harness, report-only (Node 20 pinned)
- `size` — Node 22, bundle-size budget + report-only brotli/no-bundled-lit/attribution guards
- `smoke` — pack → install → resolve entry matrix

**Release (`.github/workflows/release.yml`):**
- Triggered by `workflow_run` on successful CI on `main`; gated on `conclusion == 'success'`
- Uses SHA-pinned `changesets/action` → `npm run version` then `npm run release` (build + `changeset publish`)
- Least-privilege: only this job gets `contents: write` + `packages: write`

**Manual fallback (`.github/workflows/publish.yml`):**
- `workflow_dispatch` only (break-glass); re-runs the full gate set (typecheck+coverage, browser a11y,
  surface-diff, size) before the publish job, which alone holds `packages: write`

## Environment Configuration

**Required runtime env vars:** None.
**Build-time flags:** `VISUALIZE` (opt-in bundle attribution report).
**CI secrets:** `GITHUB_TOKEN` (GitHub-provided) for publish; no third-party API keys.
**Secrets location:** GitHub Actions secrets only. No `.env` files present in the repo.

## Webhooks & Callbacks

**Incoming:** None.
**Outgoing:** None. (Release publish reacts to GitHub `workflow_run` events internally, not external webhooks.)

---

*Integration audit: 2026-08-23*
