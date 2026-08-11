# Testing Patterns

**Analysis Date:** 2026-08-10

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.ts`
- Environment: jsdom (browser-like DOM environment for component testing)

**Run Commands:**
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:a11y     # Run accessibility tests only
```

**Setup:**
- Global setup file: `test/setup.ts`
- Restores mocks after each test: `restoreMocks: true`
- Test files included: `test/**/*.test.ts`

## Test File Organization

**Location:**
- Parallel structure: tests mirror source structure
- Component tests in `test/components/` (e.g., `test/components/button.test.ts`)
- Specialized tests: `test/a11y.test.ts` for accessibility
- Helpers in `test/helpers.ts`

**Naming:**
- Component test files: `{component-name}.test.ts`
- Test suites: one or two describe blocks per file
- Test names: descriptive human-readable strings (e.g., "toggles on click, updates aria state, and emits change")

**Structure:**
```
test/
├── components/
│   ├── button.test.ts
│   ├── checkbox.test.ts
│   ├── accordion.test.ts
│   └── ...
├── a11y.test.ts
├── a11y-helper.ts
├── helpers.ts
└── setup.ts
```

## Test Structure

**Suite Organization:**
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

**Patterns:**
- Component import at top of test file
- Type-safe `fixture<T>()` to create typed element instances
- Async/await for async operations (component updates)
- `waitForUpdate(element)` after state changes
- Shadow DOM queries with `shadowQuery<T>()`
- Custom event listening with `oneEvent<T>()`

## Mocking

**Framework:** Vitest's built-in mocking with jsdom

**Mock Setup (test/setup.ts):**
- Mock `ElementInternals` for form association testing
  - Tracks form value, validity state, validation messages
  - Symbol-keyed storage: `Symbol.for('amris.test.elementInternals')`
- Mock `window.matchMedia()` for media query testing
- Mock `window.ResizeObserver` for resize observer testing
- Mock `HTMLDialogElement.showModal()` and `HTMLDialogElement.close()` for dialog testing
- Mock `DataTransfer` for file upload testing

**Example Mock Usage:**
```typescript
export function getMockInternals(host: HTMLElement): MockElementInternals {
  const internals = host[internalsKey];
  if (!internals) {
    throw new Error('Mock ElementInternals not found on host.');
  }
  return internals;
}
```

**What to Mock:**
- Browser APIs not available in jsdom (ResizeObserver, matchMedia, DataTransfer)
- ElementInternals for form validation testing
- Dialog methods for overlay components

**What NOT to Mock:**
- Native HTML events (click, input, change, keydown)
- Component properties and methods
- DOM querying and manipulation

## Fixtures and Factories

**Test Data:**
Fixtures are created with HTML markup strings:
```typescript
export async function fixture<T extends HTMLElement>(markup: string): Promise<T> {
  const container = document.createElement('div');
  container.innerHTML = markup.trim();

  const element = container.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('Fixture markup did not produce an element.');
  }

  return mount(element as T);
}
```

**Event Helpers:**
```typescript
export async function click(target: Element, host?: HTMLElement): Promise<void> {
  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  if (host) {
    await waitForUpdate(host);
  }
}

export async function keydown(
  target: Element,
  key: string,
  host?: HTMLElement,
): Promise<void> {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  if (host) {
    await waitForUpdate(host);
  }
}

export async function inputText(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  host?: HTMLElement,
): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  if (host) {
    await waitForUpdate(host);
  }
}
```

**Location:** Test helpers in `test/helpers.ts`

## Coverage

**Requirements:** No coverage threshold enforced by default

**View Coverage:**
```bash
npm run test:coverage
```

**Output Location:** `coverage/` directory with coverage reports

**Coverage Tools:** `@vitest/coverage-v8` (V8 code coverage integration)

## Test Types

**Unit Tests:**
- Scope: Individual component properties and methods
- Approach: Test single user interactions and state changes
- Example: Button click toggles loading state and updates aria attributes
- Location: `test/components/{component}.test.ts`

**Integration Tests:**
- Scope: Component interactions with child components
- Approach: Test parent-child communication and multi-component flows
- Example: Accordion parent synchronizes open state with children
- Embedded in same files as unit tests with separate describe blocks

**A11y Tests:**
- Framework: axe-core for accessibility scanning
- Scope: Component accessibility compliance (WCAG violations)
- Approach: Run axe-core scan on rendered component markup
- Disables rules for jsdom limitations (color-contrast, region)
- Location: `test/a11y.test.ts`

**Example A11y Test:**
```typescript
async function expectNoViolations(element: HTMLElement, disabledRules: string[] = []) {
  const violations = await checkA11y(element, disabledRules);
  expect(violations, formatViolations(violations)).toHaveLength(0);
}

it('am-button', async () => {
  const el = await fixture('<am-button>Click me</am-button>');
  await expectNoViolations(el);
});
```

## Common Patterns

**Async Testing:**
```typescript
it('toggles on click, updates aria state, and emits change', async () => {
  const element = await fixture<HTMLElement & { checked: boolean }>(
    '<am-checkbox>Accept terms</am-checkbox>',
  );
  
  // Promise-based event listening
  const eventPromise = oneEvent(element, 'change');
  
  // User interaction
  await click(element, element);
  
  // Wait for event
  const event = await eventPromise;
  
  // Assertions
  expect(element.checked).toBe(true);
  expect((event.target as HTMLElement & { checked: boolean }).checked).toBe(true);
});
```

**Shadow DOM Queries:**
```typescript
const element = await fixture<HTMLElement>(
  '<am-button variant="outlined" size="lg">Save</am-button>',
);

const button = shadowQuery<HTMLButtonElement>(element, 'button');
const labelSlot = shadowQuery<HTMLSlotElement>(element, '.label slot');

expect(button.classList.contains('outlined')).toBe(true);
```

**Keyboard Interaction Testing:**
```typescript
it('toggles via keyboard Enter', async () => {
  const element = await fixture<HTMLElement & { open: boolean }>(
    `<am-accordion-item>
      <span slot="header">Section</span>
      Body
    </am-accordion-item>`,
  );
  const header = shadowQuery<HTMLButtonElement>(element, '.header');

  await keydown(header, 'Enter', element);

  expect(element.open).toBe(true);
});
```

**Form Field Testing:**
```typescript
it('updates form value on change', async () => {
  const element = await fixture<HTMLElement & { checked: boolean }>(
    '<am-checkbox></am-checkbox>',
  );
  
  await click(element, element);
  
  // Access mock internals for form testing
  const internals = getMockInternals(element);
  expect(internals.formValue).toBe('on');
});
```

**Disabled State Testing:**
```typescript
it('does not toggle when disabled', async () => {
  const element = await fixture<HTMLElement & { open: boolean }>(
    `<am-accordion-item disabled>
      <span slot="header">Disabled</span>
      Body
    </am-accordion-item>`,
  );
  const header = shadowQuery<HTMLButtonElement>(element, '.header');

  await click(header, element);

  expect(element.open).toBe(false);
});
```

## Setup and Teardown

**Global Setup (`test/setup.ts`):**
- Runs before all tests
- Mocks browser APIs not available in jsdom
- Patches `HTMLElement.prototype.attachInternals` to use mocked ElementInternals

**Per-Test Cleanup (`afterEach`):**
```typescript
afterEach(() => {
  document.body.innerHTML = '';
});
```

Clears DOM between tests to prevent test pollution.

## Fixture Helpers in Detail

**Fixture Creation (`test/helpers.ts`):**
```typescript
export async function fixture<T extends HTMLElement>(markup: string): Promise<T> {
  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = markup.trim();
  
  // Extract element
  const element = container.firstElementChild as T;
  
  // Mount to DOM and wait for Lit render
  return mount(element);
}

export async function mount<T extends HTMLElement>(element: T): Promise<T> {
  document.body.append(element);
  await waitForUpdate(element);
  return element;
}

export async function waitForUpdate(target: HTMLElement): Promise<void> {
  const litTarget = target as HTMLElement & Partial<LitElement>;
  if (litTarget.updateComplete) {
    await litTarget.updateComplete;
  }
  await Promise.resolve();
}
```

**Event Helpers:**
- `oneEvent<TDetail>(target, type)`: Promise-based single event listener
- `click(target, host?)`: Dispatch click event with bubbling/composed flags
- `keydown(target, key, host?)`: Dispatch keyboard event
- `inputText(input, value, host?)`: Set input value and dispatch input event
- `changeValue(input, host?)`: Dispatch change event

## Test Examples from Codebase

**Button Test (`test/components/button.test.ts`):**
```typescript
describe('am-button', () => {
  it('renders the slotted label and applies size and variant classes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-button variant="outlined" size="lg">Save</am-button>',
    );

    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    const labelSlot = shadowQuery<HTMLSlotElement>(element, '.label slot');

    expect(element.textContent?.replace(/\s+/g, ' ').trim()).toContain('Save');
    expect(labelSlot).toBeTruthy();
    expect(button.classList.contains('outlined')).toBe(true);
    expect(button.classList.contains('lg')).toBe(true);
  });

  it('reflects the loading state to aria attributes and spinner markup', async () => {
    const element = await fixture<HTMLElement>('<am-button>Save</am-button>');

    (element as HTMLElement & { loading: boolean }).loading = true;
    await waitForUpdate(element);

    const button = shadowQuery<HTMLButtonElement>(element, 'button');

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(shadowQuery<HTMLElement>(element, '.loading-spinner')).toBeTruthy();
  });
});
```

**Checkbox Test (`test/components/checkbox.test.ts`):**
```typescript
describe('am-checkbox', () => {
  it('toggles on click, updates aria state, and emits change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-checkbox>Accept terms</am-checkbox>',
    );
    const eventPromise = oneEvent(element, 'change');

    await click(element, element);

    const event = await eventPromise;
    const control = shadowQuery<HTMLElement>(element, '.control');
    const target = event.target as HTMLElement & { checked: boolean };

    expect(element.checked).toBe(true);
    expect(target.checked).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(getMockInternals(element).formValue).toBe('on');
  });
});
```

## Accessibility (A11y) Testing

**Helper (`test/a11y-helper.ts`):**
```typescript
export async function checkA11y(
  element: HTMLElement,
  disabledRules: string[] = [],
): Promise<Result[]> {
  const defaultDisabled = [
    'color-contrast',  // jsdom has no computed styles
    'region',          // component-level testing, not page-level
  ];

  const rules: Record<string, { enabled: boolean }> = {};
  for (const rule of [...defaultDisabled, ...disabledRules]) {
    rules[rule] = { enabled: false };
  }

  const results = await axe.run(element, { rules });
  return results.violations;
}

export function formatViolations(violations: Result[]): string {
  return violations
    .map(v => {
      const nodes = v.nodes.map(n => `  - ${n.html}`).join('\n');
      return `[${v.id}] ${v.help} (${v.impact})\n${nodes}`;
    })
    .join('\n\n');
}
```

**Running A11y Tests:**
```bash
npm run test:a11y
```

---

*Testing analysis: 2026-08-10*
