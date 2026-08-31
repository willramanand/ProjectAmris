import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

/**
 * writeMetrics — Node-side persistence channel for the Chromium-only `perf`
 * project (MEAS-02). Browser-mode specs run IN the page and cannot touch the
 * filesystem, so the perf harness collects its metrics object in-page then calls
 * this server-side command to write the committed JSON baseline/report.
 *
 * Specs call `commands.writeMetrics(path, data)` after importing
 * `{ commands } from 'vitest/browser'`. Source shape: vitest.dev/api/browser/commands
 * (BrowserCommand from 'vitest/node', server-side ctx).
 *
 * MERGE semantics (Plan 03): each of the four D-06 scenario specs is a separate
 * file that contributes one top-level scenario key to a single api/perf.json.
 * The command therefore read-merge-writes by top-level key rather than
 * overwriting the whole file. The perf project runs files serially
 * (fileParallelism: false) so this read-modify-write is race-free.
 */
/**
 * D-06 widened-matrix spec set (COMPAT-04). WebKit and Firefox run ONLY this
 * 7-spec subset — the 4 pre-existing load-bearing specs (form-association,
 * overlay-focus, dialog-top-layer, floating-position) plus the 3 new Phase-10
 * degradation specs (capabilities, form-fallback, supports-guards). Chromium
 * keeps running the FULL `test/browser/**` lane: its instance carries no
 * per-instance `include`, so it inherits the project-level glob.
 *
 * Per-instance `include` IS a supported key on @vitest/browser 4.1.9's
 * `BrowserInstanceOption` (it extends `Omit<ProjectConfig, …>`, and `include` is
 * NOT among the omitted properties) — RESEARCH assumption A1 confirmed
 * empirically against node_modules/vitest this session, so the primary
 * per-instance shape is used (no fallback per-engine project needed).
 *
 * The Chromium-only `perf` project and ALL CDP throttling stay untouched — this
 * list never widens the perf matrix (D-06 scope boundary).
 */
const D06_WIDENED_SPECS = [
  'test/browser/form-association.test.ts',
  'test/browser/overlay-focus.test.ts',
  'test/browser/dialog-top-layer.test.ts',
  'test/browser/floating-position.test.ts',
  'test/browser/capabilities.test.ts',
  'test/browser/form-fallback.test.ts',
  'test/browser/supports-guards.test.ts',
];

const writeMetrics: BrowserCommand<[string, unknown]> = async (_ctx, path, data) => {
  mkdirSync(dirname(path), { recursive: true });
  let existing: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      if (parsed && typeof parsed === 'object') existing = parsed as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const merged = { ...existing, ...(data as Record<string, unknown>) };
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
};

export default defineConfig({
  test: {
    projects: [
      {
        // logic lane — keeps existing jsdom mocks; local contributor default (D-06)
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['test/**/*.test.ts'],
          // Exclude the fidelity lane AND the Chromium-only perf specs — the CDP
          // throttle/perf tests (`*.cdp.test.ts` / `*.perf.test.ts`) require the
          // real browser lane (Pitfall 2). Non-browser perf spikes such as the
          // Lit-marker string check (`*.lit-markers.test.ts`) still match here
          // and run under jsdom by design (Plan 00 Task 2).
          exclude: ['test/browser/**', 'test/perf/**/*.cdp.test.ts', 'test/perf/**/*.perf.test.ts'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
      {
        // fidelity lane — NO setupFiles; real Chromium native APIs (Pitfall 2)
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          // setupFiles INTENTIONALLY OMITTED — Chromium implements ElementInternals/
          // <dialog>/ResizeObserver/matchMedia natively; the jsdom mocks stay jsdom-only.
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // chromium: full `test/browser/**` lane (no per-instance include).
            // webkit + firefox: each scoped to the 7-spec D-06 subset (COMPAT-04)
            // — real WebKit/Firefox engine coverage of the load-bearing
            // form/focus/dialog paths + the new Phase-10 degradation specs,
            // without widening the full lane × N. This completes the D-06
            // widened tested-engine matrix (chromium + webkit + firefox).
            instances: [
              { browser: 'chromium' },
              { browser: 'webkit', include: D06_WIDENED_SPECS },
              { browser: 'firefox', include: D06_WIDENED_SPECS },
            ],
          },
        },
      },
      {
        // perf lane — Chromium-only throttled runtime-perf harness (MEAS-02/03,
        // D-11). Mirrors the `browser` project (playwright/chromium/headless) and,
        // like it, INTENTIONALLY OMITS setupFiles: perf numbers must come from real
        // native Chromium APIs, never jsdom mocks (Pitfall 2). Isolated from
        // `browser` so the elevated CDP write+exec privilege is scoped to perf only.
        test: {
          name: 'perf',
          // `*.cdp.test.ts` = the A2 throttle spike; `*.perf.test.ts` = the Plan 03
          // scenarios. Deliberately NOT matching `*.lit-markers.test.ts` (jsdom).
          include: ['test/perf/**/*.cdp.test.ts', 'test/perf/**/*.perf.test.ts'],
          // Run perf spec files ONE AT A TIME. Two reasons: (1) the writeMetrics
          // command read-merge-writes the shared api/perf.json, so serial files
          // make that race-free; (2) a shared CPU/network throttle applied by one
          // spec must not bleed into another's measurement window.
          fileParallelism: false,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // A2 (RESEARCH assumption) PINNED: `cdp()` from 'vitest/browser' is a
            // privileged debugging API gated on the browser server API granting
            // write+exec. Verified empirically against @vitest/browser 4.1.x — the
            // exact key path is `test.browser.api.{allowWrite,allowExec}` (config
            // schema at vitest `browser.api.allowExec`; see node_modules/vitest
            // coverage chunk `api.allowExec`). Without these, cdp() no-ops/throws.
            // Scoped to the perf project ONLY — never enabled on the shipped build.
            api: { allowWrite: true, allowExec: true },
            // Node-side persistence for browser specs (they can't write files).
            commands: { writeMetrics },
          },
        },
      },
    ],
    // Coverage is a ROOT-level (global) setting and folds over the jsdom project
    // only (OQ-1). Thresholds are filled from the measured baseline in Task 2.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/components/**', 'src/utilities/**'],
      exclude: ['**/*.stories.ts', 'test/**', 'dist/**', '**/index.ts'],
      // Ratchet-to-final-floor (D-01): re-baselined for Phase 4 after the new
      // controllers (validation.ts, shortcut-registry.ts, virtualize-support.ts),
      // the am-shortcuts element, and the data-grid/combobox/select virtualization
      // landed. Floors sit just under the newly measured coverage — still
      // green-on-arrival (D-05), fails on any regression. Gate on branches
      // explicitly (D-02). Floors are never set above measured (WR-05).
      thresholds: {
        // Global final floor (Phase 4 measured: br 70.49 / fn 81.57 / ln 84.07 / st 83.64).
        // branches ratchets UP (67 -> 70) as global branch coverage rose; functions
        // lowers 82 -> 81 (justified: the phase's new controllers/components —
        // time-picker, shortcuts, validation — landed with lower function coverage,
        // pulling the global measured floor from 83.02 to 81.57). Buffers sit just
        // under measured so any real regression trips (~br 0.49 / fn 0.57 / ln 0.07 / st 0.64).
        branches: 70,
        functions: 81,
        lines: 84,
        statements: 83,
        // Per-directory tiers (D-02) — each bucketed at its own newly measured floor.
        // RATCHET UP (debug ci-coverage-gate-fail): later phases had added interaction/
        // logic functions the jsdom lane never drove (combobox search-in-trigger
        // handlers + public focus(); date-picker keyboard segment digit-input;
        // select virtualized PageUp/PageDown + public focus()) plus the deferred
        // virtualizer .then swap, dragging measured fn coverage below the frozen
        // floors. New jsdom specs now exercise all of them
        // (test/components/combobox-search-in-trigger.test.ts, date-picker-digit-input.test.ts,
        // select-page-nav.test.ts) — the virtualizer swap + per-row renderItem/keyFunction
        // are driven deterministically via the lazy-load __setLazyLoadImportersForTest
        // seam. Floors re-baselined UP to just under the newly measured coverage.
        // NO floor was lowered: the only still-uncovered slice is the genuinely
        // browser-only deferred floating-ui `size` middleware apply + reference/
        // floating getters (need real layout / getBoundingClientRect) and the real
        // windowed scroll path — both exercised by the test/browser/** lane, never
        // jsdom. Buffers leave CI headroom (CI measures ~1pt under local on select
        // ln/st, so select ln/st floors sit ~2.5pt+ under local measured).
        'src/components/combobox/**': { branches: 78, functions: 82 }, // measured br 83.13 / fn 85.07
        'src/components/date-picker/**': { branches: 75, functions: 83 }, // measured br 80.74 / fn 86.04
        'src/components/select/**': { branches: 72, functions: 85, lines: 86, statements: 85 }, // measured br 76.62 / fn 87.30 / ln 89.56 / st 87.96
        // dialog is unchanged by this phase and sits well above the ceiling; keep its high floor.
        'src/components/dialog/**': { branches: 94, functions: 88, lines: 95, statements: 95 }, // measured br 95.83 / fn 90.91 / ln 97.73 / st 98.08
      },
    },
  },
});
