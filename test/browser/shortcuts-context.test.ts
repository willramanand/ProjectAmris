import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import '../../src/components/shortcuts/shortcuts';
import '../../src/components/command-palette/command-palette';
import type { ShortcutRegistry } from '../../src/internal/controllers/shortcut-registry';
import { fixture, waitForUpdate } from '../helpers';

/**
 * FEAT-03/FEAT-04 — am-shortcuts document dispatch in REAL Chromium.
 *
 * Runs in the `browser` Vitest project, which OMITS test/setup.ts. These
 * assertions exercise the real event model: `event.composedPath()` across
 * genuine shadow roots and `event.isComposing`, neither of which jsdom can
 * prove faithfully. That is exactly why this suite lives in the browser lane
 * (per 04-VALIDATION §"Critical lane boundary").
 *
 * The provider resolves the true focused element with `composedPath()[0]`, so a
 * document-level listener sees the real node inside a shadow root rather than
 * the retargeted host (Pitfall 4). Single-key shortcuts are suppressed while
 * that node is editable or while an IME composition is active.
 */

type ShortcutsHost = HTMLElement & { registry: ShortcutRegistry };
type PaletteEl = HTMLElement & { open: boolean };

/**
 * A minimal custom element with its OWN shadow root holding a real `<input>`
 * (editable) and a real `<button>` (focusable, non-editable). Dispatching a
 * `composed` keydown from either node lets us assert composedPath retargeting
 * and the editable-vs-non-editable suppression branch.
 */
class TestShadowHost extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    input.className = 'inner-input';
    const button = document.createElement('button');
    button.className = 'inner-button';
    button.textContent = 'Inner';
    root.append(input, button);
  }
}

beforeAll(() => {
  if (!customElements.get('test-shadow-host')) {
    customElements.define('test-shadow-host', TestShadowHost);
  }
});

function dispatchKey(
  from: Element,
  key: string,
  opts: KeyboardEventInit = {},
): void {
  from.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
      ...opts,
    }),
  );
}

async function mountTree(): Promise<{
  shortcuts: ShortcutsHost;
  palette: PaletteEl;
  innerInput: HTMLInputElement;
  innerButton: HTMLButtonElement;
}> {
  const shortcuts = await fixture<ShortcutsHost>(`
    <am-shortcuts>
      <test-shadow-host></test-shadow-host>
      <am-command-palette></am-command-palette>
    </am-shortcuts>
  `);
  await waitForUpdate(shortcuts);

  const palette = shortcuts.querySelector('am-command-palette') as PaletteEl;
  await waitForUpdate(palette);

  const shadowHost = shortcuts.querySelector('test-shadow-host') as TestShadowHost;
  const innerInput = shadowHost.shadowRoot!.querySelector('input') as HTMLInputElement;
  const innerButton = shadowHost.shadowRoot!.querySelector('button') as HTMLButtonElement;

  return { shortcuts, palette, innerInput, innerButton };
}

/** Discover which physical modifier `mod` normalizes to on this platform. */
function modKey(registry: ShortcutRegistry): KeyboardEventInit {
  return registry.resolve('meta+k', ['global']) !== undefined
    ? { metaKey: true }
    : { ctrlKey: true };
}

afterEach(() => {
  document
    .querySelectorAll('am-shortcuts, test-shadow-host, am-command-palette')
    .forEach((el) => el.remove());
});

describe('am-shortcuts context dispatch (real Chromium)', () => {
  it('mod+k dispatches through the provider regardless of focus (even inside a text field)', async () => {
    const { shortcuts, palette, innerInput } = await mountTree();

    // Focus a shadow-root text input — mod+k must STILL fire (that is the whole
    // point of a command-palette shortcut: it works while typing).
    innerInput.focus();
    dispatchKey(innerInput, 'k', modKey(shortcuts.registry));
    await waitForUpdate(palette);

    expect(palette.open).toBe(true);
  });

  it('a single-key shortcut is suppressed while a text field is focused (WCAG 2.1.4)', async () => {
    const { shortcuts, innerInput } = await mountTree();
    let fired = 0;
    shortcuts.registry.register({
      id: 'test.single',
      keys: 'p',
      allowSingleKey: true,
      handler: () => {
        fired += 1;
      },
    });

    innerInput.focus();
    dispatchKey(innerInput, 'p');

    // Typing `p` in a focused input must NOT trigger the single-key shortcut.
    expect(fired).toBe(0);
  });

  it('the same single-key fires when focus is not editable, and composedPath resolves the nested-shadow target', async () => {
    const { shortcuts, innerButton } = await mountTree();
    let fired = 0;
    let seenTarget: EventTarget | null = null;
    shortcuts.registry.register({
      id: 'test.single',
      keys: 'p',
      allowSingleKey: true,
      handler: (e) => {
        fired += 1;
        seenTarget = e.composedPath()[0] ?? null;
      },
    });

    innerButton.focus();
    dispatchKey(innerButton, 'p');

    expect(fired).toBe(1);
    // composedPath()[0] is the true focused node INSIDE the shadow root — not
    // the retargeted host that a naive event.target check would see (Pitfall 4).
    expect(seenTarget).toBe(innerButton);
  });

  it('a keydown with isComposing=true is ignored (IME composition)', async () => {
    const { shortcuts, innerButton } = await mountTree();
    let fired = 0;
    shortcuts.registry.register({
      id: 'test.single',
      keys: 'p',
      allowSingleKey: true,
      handler: () => {
        fired += 1;
      },
    });

    innerButton.focus();
    dispatchKey(innerButton, 'p', { isComposing: true });

    expect(fired).toBe(0);
  });

  it('a reserved browser/OS combo is refused at registration and never dispatches', async () => {
    const { shortcuts, innerButton } = await mountTree();
    let fired = 0;
    const result = shortcuts.registry.register({
      id: 'test.reserved',
      keys: 'mod+t',
      handler: () => {
        fired += 1;
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('reserved');
    }

    // Even dispatched, the reserved combo has no stored handler → nothing fires,
    // and the provider never preventDefaults an OS/browser combo (D-10).
    innerButton.focus();
    dispatchKey(innerButton, 't', modKey(shortcuts.registry));

    expect(fired).toBe(0);
  });
});
