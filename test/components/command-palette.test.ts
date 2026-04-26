import { describe, expect, it } from 'vitest';

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
