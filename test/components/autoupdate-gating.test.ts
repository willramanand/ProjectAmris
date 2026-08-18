import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../src/components/combobox/combobox';
import '../../src/components/select/select';
import '../../src/components/dropdown/dropdown';
import '../../src/components/popover/popover';
import '../../src/components/tooltip/tooltip';
import '../../src/components/date-picker/date-picker';
import '../../src/components/context-menu/context-menu';

import { FloatingPositionController } from '../../src/internal/controllers/floating-position';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

// PERF-04 — autoUpdate open-transition gating (TEST-05 teardown-spy lane).
//
// Every floating-ui overlay must start the `autoUpdate` positioning loop ONLY on
// its false→true open transition and tear it down on close AND on disconnect —
// so no loop runs while an overlay is closed and none dangles after the host is
// removed. The six positioned overlays (combobox, select, dropdown, popover,
// tooltip, date-picker) route through the shared FloatingPositionController, so
// spying on its prototype `start`/`stop` observes the exact lifecycle seam
// (key_links: open-state transition → start()/stop(); hostDisconnected → stop()).
// am-context-menu positions at the cursor once with no autoUpdate loop, so it can
// never leak — the spy asserts it never starts the controller at all.

type Openable = HTMLElement & { open?: boolean };

function spyController() {
  const startSpy = vi.spyOn(FloatingPositionController.prototype, 'start');
  const stopSpy = vi.spyOn(FloatingPositionController.prototype, 'stop');
  return { startSpy, stopSpy };
}

// Overlays whose controller.start() is gated on a boolean open-state transition.
interface OpenStateCase {
  name: string;
  markup: string;
  setOpen: (el: Openable, open: boolean) => void;
}

const openStateCases: OpenStateCase[] = [
  {
    name: 'am-combobox',
    markup: '<am-combobox label="Fruit"></am-combobox>',
    // `_open` is an internal @state, driven here directly to exercise the seam.
    setOpen: (el, open) => {
      (el as unknown as { _open: boolean })._open = open;
    },
  },
  {
    name: 'am-select',
    markup: '<am-select label="Fruit"><am-option value="a">A</am-option></am-select>',
    setOpen: (el, open) => {
      (el as unknown as { _open: boolean })._open = open;
    },
  },
  {
    name: 'am-date-picker',
    markup: '<am-date-picker></am-date-picker>',
    setOpen: (el, open) => {
      (el as unknown as { _open: boolean })._open = open;
    },
  },
  {
    name: 'am-dropdown',
    markup: '<am-dropdown><button>Menu</button><div slot="content">Body</div></am-dropdown>',
    setOpen: (el, open) => {
      el.open = open;
    },
  },
  {
    name: 'am-popover',
    markup: '<am-popover><button>Open</button><div slot="content">Body</div></am-popover>',
    setOpen: (el, open) => {
      el.open = open;
    },
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(openStateCases)('$name — autoUpdate open-transition gating (PERF-04)', ({ markup, setOpen }) => {
  it('does not start autoUpdate while closed, starts on open, and stops on close', async () => {
    const el = await fixture<Openable>(markup);
    const { startSpy, stopSpy } = spyController();

    // Closed on mount → no positioning loop.
    expect(startSpy).not.toHaveBeenCalled();

    // false→true open transition starts exactly one loop.
    setOpen(el, true);
    await waitForUpdate(el);
    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockClear();
    stopSpy.mockClear();

    // true→false close transition stops the loop and starts no new one.
    setOpen(el, false);
    await waitForUpdate(el);
    expect(stopSpy).toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('stops autoUpdate on disconnect while open (no dangling loop)', async () => {
    const el = await fixture<Openable>(markup);
    const { stopSpy } = spyController();

    setOpen(el, true);
    await waitForUpdate(el);

    stopSpy.mockClear();

    // Disconnect while open → hostDisconnected() → stop().
    el.remove();
    await waitForUpdate(el);
    expect(stopSpy).toHaveBeenCalled();
  });
});

describe('am-tooltip — autoUpdate show-transition gating (PERF-04)', () => {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function makeTooltip() {
    const el = await fixture<HTMLElement & { delay: number }>(
      '<am-tooltip content="Save"><button>Save</button></am-tooltip>',
    );
    el.delay = 0; // fire the show timer on the next macrotask
    return el;
  }

  function enter(el: HTMLElement) {
    shadowQuery<HTMLElement>(el, '.trigger').dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    );
  }

  function leave(el: HTMLElement) {
    shadowQuery<HTMLElement>(el, '.trigger').dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    );
  }

  it('does not start autoUpdate while hidden, starts on show, and stops on hide', async () => {
    const el = await makeTooltip();
    const { startSpy, stopSpy } = spyController();

    expect(startSpy).not.toHaveBeenCalled();

    enter(el);
    await wait(5);
    await waitForUpdate(el);
    expect(startSpy).toHaveBeenCalled();

    startSpy.mockClear();
    stopSpy.mockClear();

    leave(el);
    await wait(120); // hide timer is 100ms
    await waitForUpdate(el);
    expect(stopSpy).toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('stops autoUpdate on disconnect while shown (no dangling loop)', async () => {
    const el = await makeTooltip();
    const { stopSpy } = spyController();

    enter(el);
    await wait(5);
    await waitForUpdate(el);

    stopSpy.mockClear();

    el.remove();
    await waitForUpdate(el);
    expect(stopSpy).toHaveBeenCalled();
  });
});

describe('am-context-menu — no autoUpdate loop to leak (PERF-04)', () => {
  it('never starts a FloatingPositionController loop (cursor-positioned once)', async () => {
    const el = await fixture<Openable>(
      '<am-context-menu><div>Right-click area</div><am-menu slot="menu"></am-menu></am-context-menu>',
    );
    const { startSpy } = spyController();

    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await waitForUpdate(el);

    expect(el.open).toBe(true);
    // With no autoUpdate loop, there is nothing to run while closed or to leak on
    // disconnect — the controller is never engaged.
    expect(startSpy).not.toHaveBeenCalled();

    el.remove();
    await waitForUpdate(el);
    expect(startSpy).not.toHaveBeenCalled();
  });
});
