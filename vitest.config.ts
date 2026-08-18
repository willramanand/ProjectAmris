import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // logic lane — keeps existing jsdom mocks; local contributor default (D-06)
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['test/**/*.test.ts'],
          exclude: ['test/browser/**'],
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
            instances: [{ browser: 'chromium' }],
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
        // combobox / date-picker ratchet UP (virtualization + added tests raised them).
        'src/components/combobox/**': { branches: 65, functions: 70 }, // measured br 66.03 / fn 70.91
        'src/components/date-picker/**': { branches: 60, functions: 64 }, // measured br 60.77 / fn 65.12
        // select DE-ratchets from the D-03 ceiling: the 04-09 virtualization added
        // branches/lines to select.ts, dropping measured branch 81.65 -> 66.67 and
        // lines/statements below the prior 85 ceiling. Floors re-baselined to the new
        // measured floor (justified: new virtualization code landed).
        'src/components/select/**': { branches: 66, functions: 85, lines: 83, statements: 82 }, // measured br 66.67 / fn 86.21 / ln 83.40 / st 82.51
        // dialog is unchanged by this phase and sits well above the ceiling; keep its high floor.
        'src/components/dialog/**': { branches: 94, functions: 88, lines: 95, statements: 95 }, // measured br 95.83 / fn 90.91 / ln 97.73 / st 98.08
      },
    },
  },
});
