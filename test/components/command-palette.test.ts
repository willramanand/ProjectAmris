import { describe, expect, it, vi } from 'vitest';

import '../../src/components/command-palette/command-palette';
import '../../src/components/shortcuts/shortcuts';
import type { CommandItem } from '../../src/components/command-palette/command-palette';
import type { ShortcutRegistry } from '../../src/internal/controllers/shortcut-registry';
import { fixture, inputText, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type ShortcutsHost = HTMLElement & { registry: ShortcutRegistry };

function dispatchComboKeydown(mods: { metaKey?: boolean; ctrlKey?: boolean }): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      bubbles: true,
      cancelable: true,
      ...mods,
    }),
  );
}

type PaletteEl = HTMLElement & {
  open: boolean;
  commands: CommandItem[];
};

const COMMANDS: CommandItem[] = [
  { id: 'new', label: 'New file', shortcut: '⌘N', group: 'File' },
  { id: 'open', label: 'Open', shortcut: '⌘O', group: 'File' },
  { id: 'save', label: 'Save', shortcut: '⌘S', group: 'File' },
  { id: 'find', label: 'Find', description: 'Search current document', group: 'Edit' },
];

async function makePalette(): Promise<PaletteEl> {
  const el = await fixture<PaletteEl>('<am-command-palette></am-command-palette>');
  el.commands = COMMANDS;
  await waitForUpdate(el);
  return el;
}

function items(el: PaletteEl): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll('.item') ?? []) as HTMLElement[];
}

describe('am-command-palette', () => {
  it('opens via the open property and shows all commands', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    expect(items(el).length).toBe(COMMANDS.length);
  });

  it('filters commands as the user types', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const input = shadowQuery<HTMLInputElement>(el, 'input');
    await inputText(input, 'sa', el);

    const labels = items(el).map((i) => i.querySelector('.item-label')?.textContent?.trim());
    expect(labels).toEqual(['Save']);
  });

  it('renders group labels', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const groupLabels = Array.from(el.shadowRoot?.querySelectorAll('.group-label') ?? []).map(
      (g) => g.textContent?.trim(),
    );
    expect(groupLabels).toContain('File');
    expect(groupLabels).toContain('Edit');
  });

  it('ArrowDown moves the highlighted item; Enter selects it', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const input = shadowQuery<HTMLInputElement>(el, 'input');
    const eventPromise = oneEvent<{ command: CommandItem }>(el, 'am-select');

    await keydown(input, 'ArrowDown', el);
    await keydown(input, 'Enter', el);

    const ev = await eventPromise;
    expect(ev.detail.command.id).toBe('open');
  });

  it('Escape closes the palette and emits am-close', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const closePromise = oneEvent(el, 'am-close');
    const input = shadowQuery<HTMLInputElement>(el, 'input');
    await keydown(input, 'Escape', el);
    await closePromise;

    expect(el.open).toBe(false);
  });

  it('restores focus to a still-connected opener on close (FIX-03)', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open palette';
    document.body.appendChild(opener);
    opener.focus();

    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const focusSpy = vi.spyOn(opener, 'focus');

    const closePromise = oneEvent(el, 'am-close');
    el.open = false;
    await waitForUpdate(el);
    await closePromise;

    // Opener is still connected, so focus is restored to it.
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
    opener.remove();
  });

  it('does not focus a removed opener on close (FIX-03)', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open palette';
    document.body.appendChild(opener);
    opener.focus();

    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    // Opener is removed while the palette is open — its node is now disconnected.
    const focusSpy = vi.spyOn(opener, 'focus');
    opener.remove();

    // Closing must not throw and must not call focus() on the disconnected node
    // (the isConnected guard skips it).
    const closePromise = oneEvent(el, 'am-close');
    expect(() => {
      el.open = false;
    }).not.toThrow();
    await waitForUpdate(el);
    await closePromise;

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it('Enter selects the visually highlighted item when groups interleave (CR-01)', async () => {
    // Non-contiguous groups: A, B, A. render() re-orders by group insertion
    // (A first, then B), so the grouped render order is [a, c, b] — different
    // from the original _filtered order [a, b, c]. Keyboard nav must index into
    // the SAME grouped order render() emits, or Enter executes the wrong command.
    const selected: string[] = [];
    const interleaved: CommandItem[] = [
      { id: 'a', label: 'Alpha', group: 'A', action: () => selected.push('a') },
      { id: 'b', label: 'Bravo', group: 'B', action: () => selected.push('b') },
      { id: 'c', label: 'Charlie', group: 'A', action: () => selected.push('c') },
    ];

    const el = await fixture<PaletteEl>('<am-command-palette></am-command-palette>');
    el.commands = interleaved;
    await waitForUpdate(el);
    el.open = true;
    await waitForUpdate(el);

    const input = shadowQuery<HTMLInputElement>(el, 'input');

    // Move to the 2nd rendered item.
    await keydown(input, 'ArrowDown', el);

    // The DOM item currently carrying `.highlighted` is the ground truth for
    // what the user sees selected.
    const highlighted = el.shadowRoot?.querySelector('.item.highlighted');
    const highlightedLabel = highlighted
      ?.querySelector('.item-label')
      ?.textContent?.trim();

    const eventPromise = oneEvent<{ command: CommandItem }>(el, 'am-select');
    await keydown(input, 'Enter', el);
    const ev = await eventPromise;

    // The executed command MUST be the one the user saw highlighted.
    expect(highlightedLabel).toBe('Charlie');
    expect(ev.detail.command.id).toBe('c');
    expect(ev.detail.command.label).toBe(highlightedLabel);
    expect(selected).toEqual(['c']);
  });

  it('does not emit a spurious am-close on initial mount while closed (WR-01)', async () => {
    const el = document.createElement('am-command-palette') as PaletteEl;

    // Listener attached before the first Lit update — a mount-time am-close
    // would be observed here.
    let closeCount = 0;
    el.addEventListener('am-close', () => {
      closeCount += 1;
    });

    document.body.appendChild(el);
    await waitForUpdate(el);

    expect(closeCount).toBe(0);
    el.remove();
  });

  it('opens and does not emit am-close when mounted with open (WR-01 guard)', async () => {
    const el = document.createElement('am-command-palette') as PaletteEl;
    el.open = true;

    let closeCount = 0;
    el.addEventListener('am-close', () => {
      closeCount += 1;
    });

    document.body.appendChild(el);
    await waitForUpdate(el);

    const dialog = shadowQuery<HTMLDialogElement>(el, 'dialog');
    expect(dialog.open).toBe(true);
    expect(closeCount).toBe(0);
    el.remove();
  });

  it('shows empty state when filter yields nothing', async () => {
    const el = await makePalette();
    el.open = true;
    await waitForUpdate(el);

    const input = shadowQuery<HTMLInputElement>(el, 'input');
    await inputText(input, 'zzz', el);

    expect(items(el).length).toBe(0);
    const empty = el.shadowRoot?.querySelector('.empty');
    expect(empty).toBeTruthy();
  });
});

describe('am-command-palette shortcut integration (D-09)', () => {
  it('without a provider, Cmd+K and Ctrl+K toggle open (hardcoded fallback preserved)', async () => {
    const el = await fixture<PaletteEl>('<am-command-palette></am-command-palette>');
    await waitForUpdate(el);
    expect(el.open).toBe(false);

    // Cmd+K opens, Cmd+K again closes.
    dispatchComboKeydown({ metaKey: true });
    await waitForUpdate(el);
    expect(el.open).toBe(true);

    dispatchComboKeydown({ metaKey: true });
    await waitForUpdate(el);
    expect(el.open).toBe(false);

    // Ctrl+K also toggles (cross-platform fallback unchanged).
    dispatchComboKeydown({ ctrlKey: true });
    await waitForUpdate(el);
    expect(el.open).toBe(true);

    el.remove();
  });

  it('with an am-shortcuts provider, registers command-palette.open and drives toggling through the registry', async () => {
    const host = await fixture<ShortcutsHost>(
      '<am-shortcuts><am-command-palette></am-command-palette></am-shortcuts>',
    );
    const palette = host.querySelector('am-command-palette') as PaletteEl;
    await waitForUpdate(palette);

    const registry = host.registry;
    const entry = registry.list().find((e) => e.id === 'command-palette.open');
    expect(entry).toBeTruthy();
    // The original `mod+k` notation is preserved so the combo is rebindable.
    expect(entry?.keys).toBe('mod+k');

    // Toggling is driven through the registry: the resolved handler flips open.
    const handler = registry.resolve('mod+k', ['global']);
    expect(typeof handler).toBe('function');
    expect(palette.open).toBe(false);
    handler!(new KeyboardEvent('keydown'));
    await waitForUpdate(palette);
    expect(palette.open).toBe(true);

    host.remove();
  });

  it('with a provider present, the hardcoded document listener is not the active path', async () => {
    const host = await fixture<ShortcutsHost>(
      '<am-shortcuts><am-command-palette></am-command-palette></am-shortcuts>',
    );
    const palette = host.querySelector('am-command-palette') as PaletteEl;
    await waitForUpdate(palette);

    const registry = host.registry;

    // Discover which physical modifier `mod` maps to on this platform, then
    // dispatch the OTHER one. am-shortcuts will not resolve it, so any resulting
    // toggle could only come from the palette's hardcoded Cmd/Ctrl+K listener —
    // which must have been removed once a provider took over (D-09).
    const modIsMeta = registry.resolve('meta+k', ['global']) !== undefined;
    const otherMod = modIsMeta ? { ctrlKey: true } : { metaKey: true };

    expect(palette.open).toBe(false);
    dispatchComboKeydown(otherMod);
    await waitForUpdate(palette);
    expect(palette.open).toBe(false);

    host.remove();
  });
});
