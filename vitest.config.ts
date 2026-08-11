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
      // Ratchet-to-final-floor (D-01): now that all 23 splits + TEST-04/05
      // assertions have landed, floors are lifted to the final measured floor
      // (plan 08) — still green-on-arrival (D-05), fails on any regression.
      // Gate on branches explicitly (D-02). Complex interactive dirs are bucketed
      // separately at their own measured floor so they ratchet toward the
      // branch>=80 / lines-fns-stmts>=85 (D-03) ceiling as coverage allows.
      thresholds: {
        // Global final floor (measured: br 67.54 / fn 82.71 / ln 84.01 / st 83.21)
        branches: 66,
        functions: 81,
        lines: 83,
        statements: 82,
        // Per-directory tiers (D-02) — each bucketed at its own measured floor.
        // combobox / date-picker are still below the D-03 ceiling (interactive-heavy).
        'src/components/combobox/**': { branches: 45, functions: 50 }, // measured br 46.62 / fn 51.28
        'src/components/date-picker/**': { branches: 52, functions: 60 }, // measured br 54.19 / fn 64.1
        // select has reached the full D-03 ceiling (branch>=80, lines/fns/stmts>=85).
        'src/components/select/**': { branches: 80, functions: 85, lines: 85, statements: 85 }, // measured br 81.65 / fn 89.47 / ln 90.84 / st 89.61
        // dialog sits well above the ceiling; keep its high floor rather than de-ratchet.
        'src/components/dialog/**': { branches: 94, functions: 88, lines: 95, statements: 95 }, // measured br 95 / fn 90 / ln 97.5 / st 97.87
      },
    },
  },
});
