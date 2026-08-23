import { describe, expect, it } from 'vitest';

// Import a REPRESENTATIVE set of component modules FOR THEIR SIDE EFFECT (the
// `@customElement('am-…')` decorator calls `customElements.define`). If a
// `sideEffects`/tree-shake change (or the floating-ui chunk-graph shift) ever
// shook that registration away, the tag would silently fail to define and these
// assertions would fail — the SIZE-03 canary (Pitfall SE1 / D-10).
//
// The set deliberately spans the surfaces the Phase-8 deferral touched:
//   - a NON-overlay control (button) — proves the baseline registration path;
//   - the migrated floating-ui overlays (popover, tooltip, select, combobox,
//     rich-select, color-picker) — the components whose static floating-ui import
//     was moved behind the shared dynamic loader across 08-01…08-05;
//   - a heavy virtualized data component (data-grid) — the virtualizer-deferral
//     path (08-06).
import '../../src/components/button/button';
import '../../src/components/popover/popover';
import '../../src/components/tooltip/tooltip';
import '../../src/components/select/select';
import '../../src/components/combobox/combobox';
import '../../src/components/rich-select/rich-select';
import '../../src/components/color-picker/color-picker';
import '../../src/components/data-grid/data-grid';

/**
 * SIZE-03 registration-smoke canary (D-10).
 *
 * Runs in the `browser` Vitest project (real `customElements` registry). It
 * proves that importing a component module still calls `customElements.define`
 * at runtime after the floating-ui + virtualizer deferral refactor — i.e. the
 * chunk-graph shift did not tree-shake away the `@customElement` side effect.
 * Report-only in intent; a real failure here is a genuine registration
 * regression, not noise.
 */
describe('SIZE-03: imported components still call customElements.define (registration canary)', () => {
  it.each([
    ['am-button'],
    ['am-popover'],
    ['am-tooltip'],
    ['am-select'],
    ['am-combobox'],
    ['am-rich-select'],
    ['am-color-picker'],
    ['am-data-grid'],
  ])('registers %s after import (registration not shaken away)', (tag) => {
    expect(customElements.get(tag)).toBeDefined();
  });
});
