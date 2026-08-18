import { describe, expect, it, vi } from 'vitest';

import '../../src/components/command-palette/command-palette';
import type { CommandItem } from '../../src/components/command-palette/command-palette';
import { fixture, inputText, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

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
