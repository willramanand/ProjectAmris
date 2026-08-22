---
phase: 07-measurement-baselines-budgets
plan: 00
subsystem: testing
tags: [vitest, playwright, cdp, chromium, size-limit, lit, perf, tooling]

# Dependency graph
requires:
  - phase: 01-test-coverage-ci-gates
    provides: Vitest Browser Mode + Playwright/Chromium fidelity lane (no-setupFiles pattern)
provides:
  - Chromium-only `perf` Vitest project (playwright/chromium, headless, no setupFiles)
  - Pinned cdp() write+exec config key path (test.browser.api.allowWrite/allowExec) — A2 proven
  - writeMetrics Node-side BrowserCommand stub (stable persistence channel for Plan 03)
  - Validated Lit inlined-version-marker set (reactiveElementVersions/litHtmlVersions/litElementVersions) — A3 proven, exported as LIT_INLINE_MARKERS
  - Three installed dev-only measurement tools (rollup-plugin-visualizer, @size-limit/esbuild-why, tachometer)
  - Seven report-only npm script entrypoints (stable names for downstream plans)
affects: [07-01-size-baseline, 07-02-no-bundled-lit, 07-03-perf-harness, 07-05-attribution]

actuals:
  tokens: 3700
  tasks: 3
  commits: 3

tech-stack:
  added: [rollup-plugin-visualizer@7.1.1, "@size-limit/esbuild-why@13.0.3", tachometer@0.7.2]
  patterns:
    - "Chromium-only perf Vitest project with scoped CDP write+exec privilege"
    - "Node-side BrowserCommand as the filesystem-persistence channel for in-page perf specs"
    - "Fixture-based spike validation of dist-grep markers before the guard is built"

key-files:
  created:
    - test/perf/_spike.cdp.test.ts
    - test/perf/_spike.lit-markers.test.ts
  modified:
    - vitest.config.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Pinned cdp() privilege at test.browser.api.{allowWrite,allowExec} (project-scoped), verified empirically against @vitest/browser 4.1.9 — the in-test cdp() path works; the newCDPSession fallback was NOT needed"
  - "perf project include globs are *.cdp.test.ts + *.perf.test.ts; jsdom excludes both so browser-only specs never run under jsdom; *.lit-markers.test.ts stays on jsdom"
  - "Confirmed all three Lit version markers are reliable positive signals against the real installed Lit production source; no correction to the marker set needed"

patterns-established:
  - "perf lane native purity: no setupFiles, no setup.ts/mock imports, native Chromium APIs only (Pitfall 2)"
  - "Report-only script stubs land in Plan 00 (sole Wave-1 package.json owner) so downstream plans wire to stable names without re-editing package.json"

requirements-completed: [MEAS-02, MEAS-04, MEAS-05]

coverage:
  - id: D1
    description: "cdp() returns a usable Playwright CDPSession in the new Chromium-only perf project; Emulation.setCPUThrottlingRate + Network.emulateNetworkConditions both apply (throttled busy loop measurably slower than unthrottled) — A2 proven"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/_spike.cdp.test.ts#A2: cdp() throttle privilege path (perf lane tracer)"
        status: pass
    human_judgment: false
  - id: D2
    description: "writeMetrics BrowserCommand stub registered under the perf project's test.browser.commands; exposed to specs via commands.writeMetrics"
    requirement: MEAS-02
    verification:
      - kind: e2e
        ref: "test/perf/_spike.cdp.test.ts (asserts typeof commands.writeMetrics === function)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The three inlined-Lit version-marker strings present in a deliberately-bundled Lit fixture and absent from an externalized bare-specifier module — A3 proven for Plan 02's no-bundled-Lit assertion"
    requirement: MEAS-04
    verification:
      - kind: unit
        ref: "test/perf/_spike.lit-markers.test.ts#A3: Lit inlined-version-marker strings"
        status: pass
    human_judgment: false
  - id: D4
    description: "rollup-plugin-visualizer@^7.1.1, @size-limit/esbuild-why@^13.0.3, tachometer@^0.7.2 installed as devDependencies (pinned); lockfile updated; dependencies/peerDependencies unchanged; files array intact; all 7 report-only script stubs present"
    requirement: MEAS-05
    verification:
      - kind: automated
        ref: "node -e verify one-liner (devDeps present, no dependency leak, 7 scripts, files unchanged) => VERIFY OK"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-08-22
status: complete
---

# Phase 7 Plan 00: De-risk A2/A3 + Install Measurement Tools Summary

**Proved the two MEDIUM-confidence research assumptions on one-line spikes — cdp() CPU+network throttling is live under a pinned project-scoped write+exec grant (A2), and the three Lit version-marker globals are reliable dist-grep signals (A3) — then scaffolded the Chromium-only perf project + writeMetrics stub and installed the three pinned dev-only measurement tools.**

## Performance

- **Duration:** ~30 min (incl. fresh-worktree `npm ci` + Playwright Chromium)
- **Completed:** 2026-08-22
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- **A2 de-risked (Pitfall 1):** the exact cdp() privilege key path is `test.browser.api.{allowWrite,allowExec}` at the project level — verified empirically; the in-test `cdp()` path works and the `newCDPSession` custom-command fallback was NOT required. The spike proves the whole perf-lane spine end-to-end: config grant → CDPSession → setCPUThrottlingRate + emulateNetworkConditions → a fixed busy loop measurably slower under throttle.
- **A3 de-risked (Pitfall 4):** `reactiveElementVersions` / `litHtmlVersions` / `litElementVersions` appear verbatim in the real installed Lit production source and are absent from an externalized bare-`from"lit"` module — no correction to the marker set was needed. Exported as `LIT_INLINE_MARKERS` for Plan 02's `assert-no-bundled-lit.mjs` to consume.
- **Perf-lane scaffold:** new Chromium-only `perf` Vitest project (mirrors `browser`, no setupFiles) with a scoped CDP write+exec grant and a `writeMetrics` Node-side `BrowserCommand` stub — Plan 03's stable persistence channel.
- **Three dev-only tools installed** at pinned versions (7.1.1 / 13.0.3 / 0.7.2); seven report-only script stubs added so downstream plans wire to stable names without re-touching package.json. Nothing leaked to `dependencies`/`peerDependencies`; `files` stays `["dist","README.md"]`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Spike cdp() throttle path (A2) + scaffold perf project** — `9fa8cfa` (feat)
2. **Task 2: Validate inlined-Lit version-marker strings (A3)** — `79ef150` (test)
3. **Task 3: Install measurement tools + report-only script stubs** — `a242bb0` (chore)

_Note: type="tracer" Task 1 was committed then its `<verify>` re-run end-to-end (autonomous plan) before expanding — passed, so execution continued._

## Files Created/Modified
- `test/perf/_spike.cdp.test.ts` (created) — A2 tracer: obtains a CDPSession, applies CPU+network throttle, asserts throttled > unthrottled, asserts writeMetrics wired.
- `test/perf/_spike.lit-markers.test.ts` (created) — A3 spike: markers present in bundled Lit source, absent from externalized module; real-dist grep runs when dist is built; exports `LIT_INLINE_MARKERS`.
- `vitest.config.ts` (modified) — added the `perf` project (Chromium, api.allowWrite/allowExec, commands.writeMetrics), the `writeMetrics` BrowserCommand, and jsdom excludes for `*.cdp.test.ts`/`*.perf.test.ts`.
- `package.json` (modified) — 3 devDependencies + 7 report-only script stubs.
- `package-lock.json` (modified) — resolutions for the three tools and their transitive deps.

## Decisions Made
- **cdp() privilege key path = `test.browser.api.{allowWrite,allowExec}` (project-scoped).** Verified against `@vitest/browser` 4.1.9 config schema (`browser.api.allowExec` in the resolved config; coverage chunk `api.allowExec`/`allowWrite`). The in-test `cdp()` bridge works directly — the documented `ctx.page.context().newCDPSession(ctx.page)` fallback was unnecessary.
- **Test-file routing by suffix.** perf project includes `*.cdp.test.ts` + `*.perf.test.ts`; jsdom excludes those two suffixes; `*.lit-markers.test.ts` (a pure string check) stays on jsdom. This keeps the CDP spike off jsdom while letting the marker spike run on the cheap lane, both mock-free.
- **Lit marker set confirmed as-is.** All three identifiers survive verbatim in the minified production Lit builds (`(globalThis.<marker>??=[]).push("<v>")`), so they are reliable positive signals of an inlined copy.

## Deviations from Plan

None - plan executed exactly as written. The tracer's designed feedback gate (re-run `<verify>` before expanding) passed on the first run, so no fallback path (newCDPSession custom command, marker-set correction) was triggered.

## Known Stubs

All intentional; each resolved by a named downstream plan (Plan 00 is deliberately the wiring-only, sole Wave-1 owner of package.json):

| Stub | File | Status / Resolving plan |
|------|------|-------------------------|
| `writeMetrics` command body | `vitest.config.ts` | Functional stub (writes JSON to a path). Plan 03 calls it with real perf metrics. |
| `size:baseline` → `scripts/size-baseline.mjs` | `package.json` | Script name only; target script created in Plan 01. |
| `perf:diff` → `scripts/perf-diff.mjs` | `package.json` | Target created in Plan 03. |
| `assert:no-lit` → `scripts/assert-no-bundled-lit.mjs` | `package.json` | Target created in Plan 02. |
| `attribution:check` → `scripts/attribution-check.mjs` | `package.json` | Target created in Plan 05. |
| `visualize` → `VISUALIZE=1 npm run build` | `package.json` | Inert until Plan 05 adds the env-gated visualizer plugin to vite.config.ts. |

`test:perf` (runs the perf project — already exists) and `size:why` (`size-limit --why`, with `@size-limit/esbuild-why` now installed) are functional today, not stubs.

## Issues Encountered
- **Fresh worktree had no `node_modules`** (expected per MEMORY.md worktree note). Ran `npm ci` to populate it before the vitest spikes, then `npm install` in Task 3 to add the three tools. `npx playwright install chromium` ensured the perf lane's browser was present.
- **EBADENGINE warnings** on `npm install` (Node v25.2.1 vs size-limit's declared `^22.18.0 || ^24 || >=26`) are advisory only — install completed cleanly; CI runs the size lane on Node 22. Out of scope to change.
- Pre-existing `npm audit` vulnerabilities in dev-tooling transitive deps are out of scope (not shipped; `files` stays `["dist","README.md"]`).

## Next Phase Readiness
- **Plan 02** (no-bundled-Lit assertion): consume `LIT_INLINE_MARKERS` from `test/perf/_spike.lit-markers.test.ts`; the real-dist grep path is already written and activates once `dist/` is built.
- **Plan 03** (perf harness): build `test/perf/harness.ts` + `*.perf.test.ts` on the proven `perf` project; persist via `commands.writeMetrics`. The CDP throttle mechanism and privilege key are pinned.
- **Plan 05** (attribution): `rollup-plugin-visualizer` + `@size-limit/esbuild-why` are installed; wire the env-gated plugin and `attribution:check` script.
- No blockers. Both research unknowns (A2, A3) are closed on proven ground.

## Self-Check: PASSED

- Files verified present: `test/perf/_spike.cdp.test.ts`, `test/perf/_spike.lit-markers.test.ts`, `vitest.config.ts`, `07-00-SUMMARY.md`
- Commits verified in git log: `9fa8cfa`, `79ef150`, `a242bb0`
- Both spike `<verify>` commands re-run green after the dependency install (1 + 3 tests pass)

---
*Phase: 07-measurement-baselines-budgets*
*Completed: 2026-08-22*
