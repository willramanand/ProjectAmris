# Testing Patterns

**Analysis Date:** 2026-08-23

Amris tests run under Vitest 4.x with three isolated projects ("lanes"): a fast **jsdom** logic lane (the contributor default), a real-Chromium **browser** fidelity lane, and a Chromium-only throttled **perf** lane. Each lane exists because jsdom cannot faithfully model the APIs the library depends on (ElementInternals, `<dialog>` top layer, ResizeObserver, real layout/positioning). Understanding which lane owns which guarantee is essential before writing or moving a test.

## Test Framework

**Runner:**
- Vitest 4.1.0 (`vitest`) — config at `vitest.config.ts` (single file defines all three projects via `test.projects`)
- Browser provider: `@vitest/browser-playwright` 4.1.9 with Playwright 1.62.x, Chromium, headless

**Assertion Library:**
- Vitest built-in `expect`

**Coverage:**
- `@vitest/coverage-v8` 4.1.0 (v8 provider)

**Accessibility:**
- `axe-core` 4.11.1 via helpers in `test/a11y-helper.ts`

**Run Commands:**
```bash
npm test               # jsdom project only (watch) — contributor default
npm run test:run       # vitest run (all matched projects, no watch)
npm run test:coverage  # jsdom project + v8 coverage, thresholds enforced
npm run test:browser   # real-Chromium fidelity lane (overlay/virtualizer/forms truth)
npm run test:perf      # Chromium-only throttled perf harness (test/perf)
npm run test:a11y      # axe-core smoke suite (test/a11y.test.ts)
```

## The Three Lanes (critical)

| Lane | Project name | Include glob | setupFiles | Environment | Purpose |
|------|-------------|--------------|-----------|-------------|---------|
| Logic | `jsdom` | `test/**/*.test.ts` (excludes `browser/**`, perf cdp/perf specs) | `./test/setup.ts` | jsdom | Fast unit/logic; mocks ElementInternals, ResizeObserver, matchMedia, `<dialog>`, DataTransfer |
| Fidelity | `browser` | `test/browser/**/*.test.ts` | **none (intentional)** | real Chromium (Playwright) | True gate for overlays, positioning, form association, focus, a11y contrast |
| Perf | `perf` | `test/perf/**/*.cdp.test.ts`, `*.perf.test.ts` | **none (intentional)** | real Chromium + CDP | Throttled runtime-perf counts + report-only wall-clock |

**Why the browser lane is the true gate:** `test/setup.ts` (jsdom-only) mocks `attachInternals()` with `MockElementInternals`, stubs `ResizeObserver`, `matchMedia`, `HTMLDialogElement.showModal/close`, and `DataTransfer`. These mocks make jsdom logic tests fast but mean **positioning, real form participation (`setFormValue` → `FormData`), `<dialog>` top layer, and virtualization are NOT truly exercised in jsdom**. Any overlay/virtualizer/form-association change MUST be validated in the browser lane (see `test/browser/form-association.test.ts:21-48` for the rationale). The browser and perf lanes deliberately omit `setupFiles` so they hit native Chromium APIs (referred to in-repo as "Pitfall 2").

## Test File Organization

**Location:** separate `test/` tree (not co-located with source).
```
test/
├── setup.ts                  # jsdom-lane mocks (ElementInternals, ResizeObserver, dialog, DataTransfer)
├── helpers.ts                # mount/fixture/shadowQuery/click/keydown/oneEvent + getMockInternals
├── a11y-helper.ts            # checkA11y (axe-core wrapper) + formatViolations
├── a11y.test.ts              # axe-core smoke suite across components
├── components/*.test.ts      # per-component jsdom logic tests (~70 files)
├── internal/*.test.ts        # controller/registry unit tests
├── browser/*.test.ts         # real-Chromium fidelity lane
│   └── __screenshots__/      # visual-regression baselines (zero-frame overlay checks)
└── perf/                     # throttled perf harness + scenario specs
    ├── harness.ts            # throttle/instrument/summarize (shared)
    ├── *.perf.test.ts        # scenario specs (button, combobox, data-grid, overlay)
    └── *.cdp.test.ts         # CDP throttle spikes
```

**Naming:** `{component}.test.ts` (jsdom & browser), `{scenario}.perf.test.ts` and `{name}.cdp.test.ts` (perf).

## Test Structure

Standard `describe` / `it` with async tests awaiting Lit's update cycle:
```typescript
import { describe, expect, it } from 'vitest';
import '../../src/components/button/button';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-button', () => {
  it('renders the slotted label and applies size and variant classes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-button variant="outlined" size="lg">Save</am-button>',
    );
    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    expect(button.classList.contains('outlined')).toBe(true);
  });
});
```
(`test/components/button.test.ts`)

**Patterns:**
- Import the component module for its registration side effect: `import '../../src/components/button/button'`
- Mount via `fixture(markup)` (parses HTML string) or `mount(element)` (appends a constructed element) — both `await` `waitForUpdate`
- Set a property then `await waitForUpdate(element)` before asserting reflected DOM
- `restoreMocks: true` on the jsdom project; `afterEach` in `test/setup.ts` clears `document.body`

## Shared Helpers (`test/helpers.ts`)

- `mount<T>(element)` / `fixture<T>(markup)` — append + await update
- `waitForUpdate(target)` — awaits `updateComplete` then a microtask
- `shadowQuery<T>(host, selector)` — queries shadow root, throws if missing
- `click`, `keydown`, `inputText`, `changeValue` — dispatch composed/bubbling events, optionally await host update
- `oneEvent<TDetail>(target, type)` — promise resolving on next `CustomEvent`
- `deepActiveElement()` — pierces shadow roots to find the innermost focused element
- `getMockInternals(host)` — jsdom-lane only; resolves `MockElementInternals` via `Symbol.for('amris.test.elementInternals')`. Throws in the browser lane by design.

Helpers use **type-only** imports of `setup.ts` symbols so the shared module carries no jsdom mock side effect into the browser lane.

## Mocking

**jsdom lane (`test/setup.ts`):**
- `MockElementInternals` unconditionally replaces `attachInternals()`; stores `formValue`/`validity` privately (jsdom's native support is incomplete — notably no `setFormValue`). Read component form state via `getMockInternals()`.
- Stubs: `window.matchMedia`, `window.ResizeObserver` (no-op), `HTMLDialogElement.showModal/close`, `globalThis.DataTransfer`.

**What NOT to mock:**
- Nothing in the browser/perf lanes — they run native Chromium and omit `setupFiles` entirely. Real form participation, positioning, and virtualization must be asserted there against native APIs.

**Perf lane instrumentation (`test/perf/harness.ts`):** wraps **only first-party prototypes** — the component's own Lit lifecycle hooks (`update`/`updated`/`render`) and the shared `FloatingPositionController.prototype._updatePosition` chokepoint, plus a `MutationObserver` on the panel `style` attribute as a cross-check. `@floating-ui/dom` and Lit exports are NEVER patched.

## Accessibility Testing

- `checkA11y(element, disabledRules, options)` runs `axe.run` and returns violations (`test/a11y-helper.ts`)
- jsdom lane disables `color-contrast` and `region` by default (no computed styles/layout in jsdom)
- Browser lane passes `{ includeDefaultDisabled: false }` so contrast/region run against real Chromium computed styles (`test/browser/a11y.browser.test.ts`, `test/browser/validation-aria.test.ts`)
- Smoke suite pattern: `expect(violations, formatViolations(violations)).toHaveLength(0)` (`test/a11y.test.ts:40-43`)

## Perf Harness — count-vs-wall-clock discipline

The perf lane (`test/perf/`) separates two kinds of numbers with different trust levels:

- **Counts (GATED, deterministic):** Lit lifecycle call counts and `_updatePosition`/reposition counts. These are engine-independent and throttle-independent — identical across all repeats and across throttle profiles. `assertStableCounts()` fails the run if counts differ byte-for-byte across repeats (`harness.ts:371`). These are the numbers future phases gate on.
- **Wall-clock (REPORT-ONLY, noisy):** reduced by `summarize()` to `{ median, mean, sd, band }` where `band = mean + 3σ` (D-07). Reported, never hard-gated in this milestone — the 3σ band protects against flakiness.

**Throttle:** a single pinned profile `THROTTLE_PROFILE = { cpuRate: 6, network: 'Slow-3G' }` (data-derived from a measured candidate grid, not guessed) applied via CDP: `Emulation.setCPUThrottlingRate` + `Network.emulateNetworkConditions`. `proveThrottleLive()` measures a fixed compute anchor (`busyLoop`) before/after applying throttle so specs can assert `throttled > unthrottled` (throttle is proven live, never a silent no-op).

**Persistence:** browser specs cannot write files, so metrics flow through the Node-side `writeMetrics` `BrowserCommand` (`vitest.config.ts:24`) which read-merge-writes `api/perf.json` by top-level scenario key. The perf project runs `fileParallelism: false` so the shared-file merge is race-free and throttle windows don't bleed between specs. `api/perf.json` lives under `api/` (outside `package.files`) and never ships. Enabled only on the perf project via `browser.api.{allowWrite, allowExec}` — the elevated CDP grant is scoped so it never touches the shipped build.

## Coverage

Root-level `coverage` config folds over the **jsdom project only** (`vitest.config.ts:110`).
- Provider: `v8`; reporters: `text`, `json-summary`, `html`
- Include: `src/components/**`, `src/utilities/**`; exclude `*.stories.ts`, `test/**`, `dist/**`, `**/index.ts`
- **Ratchet-to-final-floor discipline:** global thresholds sit just under measured coverage so any regression trips, never above measured. Current global floors: branches 70, functions 81, lines 84, statements 83.
- Per-directory tiers set their own floors (e.g. `src/components/dialog/**` at branches 94; `combobox`, `date-picker`, `select` re-baselined lower after virtualization landed).

```bash
npm run test:coverage   # writes coverage/ (html + json-summary), enforces thresholds
```

## Test Types

- **Unit / logic (jsdom):** ~70 per-component specs in `test/components/` + controller specs in `test/internal/`. Fast, mocked.
- **Fidelity (browser):** `test/browser/` — form association, floating position, dialog top layer, overlay focus, virtualization, zero-frame overlay screenshots, a11y contrast, validation timing/aria, registration smoke.
- **Perf (perf):** `test/perf/` — throttled runtime-perf scenarios.
- **A11y:** axe-core smoke across components (`test/a11y.test.ts`), deeper contrast checks in browser lane.

## Common Patterns

**Async / update-cycle:**
```typescript
element.loading = true;
await waitForUpdate(element);
expect(shadowQuery(element, '.loading-spinner')).toBeTruthy();
```

**Event assertion:**
```typescript
const event = await oneEvent(element, 'am-change');
expect(event.detail).toEqual(...);
```

**Browser-lane form participation (native, no mock):**
```typescript
// browser project omits setup.ts — new FormData(form) reads native setFormValue
const data = new FormData(form);
expect(data.get('field')).toBe('value');
```
(`test/browser/form-association.test.ts`)

---

*Testing analysis: 2026-08-23*
