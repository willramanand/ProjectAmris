import type { LitElement } from 'lit';

// Type-only import — fully erased at build time, so importing these shared
// helpers carries NO module-level side effect into the browser project. The
// jsdom project loads the real mock via its own `setupFiles` (Pitfall 2 — the
// browser lane must stay mock-free / native).
import type { MockElementInternals } from './setup';

export async function mount<T extends HTMLElement>(element: T): Promise<T> {
  document.body.append(element);
  await waitForUpdate(element);
  return element;
}

export async function fixture<T extends HTMLElement>(markup: string): Promise<T> {
  const container = document.createElement('div');
  container.innerHTML = markup.trim();

  const element = container.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('Fixture markup did not produce an element.');
  }

  return mount(element as T);
}

export async function waitForUpdate(target: HTMLElement): Promise<void> {
  const litTarget = target as HTMLElement & Partial<LitElement>;
  if (litTarget.updateComplete) {
    await litTarget.updateComplete;
  }

  await Promise.resolve();
}

export function shadowQuery<T extends Element>(host: HTMLElement, selector: string): T {
  const element = host.shadowRoot?.querySelector(selector);
  if (!(element instanceof Element)) {
    throw new Error(`Unable to find "${selector}" in shadow root.`);
  }

  return element as T;
}

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

export async function changeValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  host?: HTMLElement,
): Promise<void> {
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  if (host) {
    await waitForUpdate(host);
  }
}

export function oneEvent<TDetail = unknown>(
  target: EventTarget,
  type: string,
): Promise<CustomEvent<TDetail>> {
  return new Promise((resolve) => {
    target.addEventListener(
      type,
      (event) => {
        resolve(event as CustomEvent<TDetail>);
      },
      { once: true },
    );
  });
}

/**
 * Return the innermost focused element, piercing shadow roots.
 *
 * Walks `document.activeElement` following `.shadowRoot?.activeElement` until no
 * deeper active element exists, then returns that innermost node. When nothing
 * is focused, browsers report `document.body` as `activeElement`; this returns
 * it deterministically (or `null` if there is no active element at all). Used by
 * later focus-restoration tests (plan 05) to assert the trapped element across
 * shadow boundaries.
 */
export function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}

// The jsdom setup (test/setup.ts) stores the mock under this global symbol.
// Resolve it via Symbol.for rather than importing setup.ts so the shared
// helpers stay free of setup.ts's module-level side effects (Pitfall 2).
const INTERNALS_KEY = Symbol.for('amris.test.elementInternals');

export function getMockInternals(host: HTMLElement): MockElementInternals {
  const internals = (host as unknown as Record<symbol, MockElementInternals | undefined>)[
    INTERNALS_KEY
  ];
  if (!internals) {
    throw new Error('Mock ElementInternals not found on host.');
  }

  return internals;
}
