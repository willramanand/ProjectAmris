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
      // Ratchet-from-baseline (D-01): floors sit just below the measured baseline
      // so the gate is green-on-arrival (D-05) and fails on any regression.
      // Gate on branches explicitly (D-02). Complex interactive dirs are bucketed
      // separately at their own (lower) measured branch floor so they can ratchet
      // toward branch>=80 / lines-fns-stmts>=85 (D-03 ceiling) rather than gate there today.
      thresholds: {
        // Global baseline (measured: br 67.21 / fn 81.77 / ln 83.32 / st 82.65)
        branches: 63,
        functions: 78,
        lines: 80,
        statements: 79,
        // Per-directory tiers (D-02) — bucketed at each dir's own measured branch floor
        'src/components/combobox/**': { branches: 44, functions: 48 }, // measured br 46.62
        'src/components/select/**': { branches: 79 }, // measured br 81.65
        'src/components/dialog/**': { branches: 92 }, // measured br 95
        'src/components/date-picker/**': { branches: 50 }, // measured br 52.9
      },
    },
  },
});
