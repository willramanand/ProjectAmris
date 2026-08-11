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
      thresholds: {},
    },
  },
});
