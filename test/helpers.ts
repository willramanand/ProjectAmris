import type { LitElement } from 'lit';

import { internalsKey, type MockElementInternals } from './setup';

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

export function getMockInternals(host: HTMLElement): MockElementInternals {
  const internals = host[internalsKey];
  if (!internals) {
    throw new Error('Mock ElementInternals not found on host.');
  }

  return internals;
}
