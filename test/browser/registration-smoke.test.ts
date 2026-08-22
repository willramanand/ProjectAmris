import { describe, expect, it } from 'vitest';

// Import representative component modules FOR THEIR SIDE EFFECT (the
// `@customElement('am-…')` decorator calls `customElements.define`). If a
// `sideEffects`/tree-shake change ever shook that registration away, the tag
// would silently fail to define and these assertions would fail — the SIZE-03
// canary (Pitfall SE1 / D-10). A representative spread across a light overlay
// (popover), a form overlay (select), and a heavy data component (data-grid).
import '../../src/components/popover/popover';
import '../../src/components/select/select';
import '../../src/components/data-grid/data-grid';

/**
 * SIZE-03 registration-smoke canary (D-10).
 *
 * Runs in the `browser` Vitest project (real `customElements` registry). It
 * proves that importing a component module still calls `customElements.define`
 * at runtime after the floating-ui deferral refactor — i.e. the chunk-graph
 * shift did not tree-shake away the `@customElement` side effect. Report-only in
 * intent; a real failure here is a genuine registration regression, not noise.
 */
describe('SIZE-03: imported components still call customElements.define (registration canary)', () => {
  it.each([
    ['am-popover'],
    ['am-select'],
    ['am-data-grid'],
  ])('registers %s after import (registration not shaken away)', (tag) => {
    expect(customElements.get(tag)).toBeDefined();
  });
});
