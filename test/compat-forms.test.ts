import { afterEach, describe, expect, it } from 'vitest';

// COMPAT-03 opt-in publication proof (10-02 Task 3). Importing the
// `@willramanand/amris/compat-forms` entry must flip the global fallback flag as
// a pure IMPORT SIDE EFFECT — no explicit call. The entry re-exports nothing; its
// whole contract is the side effect.
import { isFormFallbackEnabled, __resetFormParticipationForTest } from '../src/internal/helpers/form-participation.js';

afterEach(() => {
  __resetFormParticipationForTest();
});

describe('compat-forms entry — import side effect', () => {
  it('flips isFormFallbackEnabled() true purely on import, with no explicit call', async () => {
    // Guard: the flag starts false (this test does not itself call enable*).
    __resetFormParticipationForTest();
    expect(isFormFallbackEnabled()).toBe(false);

    // Importing the entry is the only action — its module-level side effect runs.
    await import('../src/compat-forms.js');

    expect(isFormFallbackEnabled()).toBe(true);
  });
});
