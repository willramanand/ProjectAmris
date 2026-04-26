import { describe, expect, it } from 'vitest';

import '../../src/components/stack/stack';
import '../../src/components/grid/grid';
import '../../src/components/surface/surface';
import '../../src/components/panel/panel';
import '../../src/components/card/card';
import { fixture, waitForUpdate } from '../helpers';

describe('am-stack', () => {
  it('reflects direction, align, justify, gap, wrap', async () => {
    const el = await fixture<HTMLElement>(
      '<am-stack direction="horizontal" align="center" justify="between" gap="4" wrap><span>a</span></am-stack>',
    );
    expect(el.getAttribute('direction')).toBe('horizontal');
    expect(el.getAttribute('align')).toBe('center');
    expect(el.getAttribute('justify')).toBe('between');
    expect(el.getAttribute('gap')).toBe('4');
    expect(el.hasAttribute('wrap')).toBe(true);
  });

  it('renders default slot content', async () => {
    const el = await fixture<HTMLElement>(
      '<am-stack><span class="child">x</span></am-stack>',
    );
    expect(el.querySelector('.child')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  it('updates direction prop dynamically', async () => {
    const el = await fixture<HTMLElement & { direction: string }>('<am-stack></am-stack>');
    el.direction = 'horizontal';
    await waitForUpdate(el);
    expect(el.getAttribute('direction')).toBe('horizontal');
  });
});

describe('am-grid', () => {
  it('reflects columns and gap', async () => {
    const el = await fixture<HTMLElement>('<am-grid columns="3" gap="6"></am-grid>');
    expect(el.getAttribute('columns')).toBe('3');
    expect(el.getAttribute('gap')).toBe('6');
  });

  it('defaults to empty columns (auto-fill mode)', async () => {
    const el = await fixture<HTMLElement & { columns: string }>('<am-grid></am-grid>');
    expect(el.columns).toBe('');
  });

  it('renders slot for children', async () => {
    const el = await fixture<HTMLElement>('<am-grid><div class="cell"></div></am-grid>');
    expect(el.querySelector('.cell')).toBeTruthy();
  });
});

describe('am-surface', () => {
  it('reflects variant, bordered, flush', async () => {
    const el = await fixture<HTMLElement>(
      '<am-surface variant="raised" bordered flush>x</am-surface>',
    );
    expect(el.getAttribute('variant')).toBe('raised');
    expect(el.hasAttribute('bordered')).toBe(true);
    expect(el.hasAttribute('flush')).toBe(true);
  });

  it('default variant is "default"', async () => {
    const el = await fixture<HTMLElement & { variant: string }>('<am-surface>x</am-surface>');
    expect(el.variant).toBe('default');
  });
});

describe('am-panel', () => {
  it('reflects bordered attribute', async () => {
    const el = await fixture<HTMLElement>('<am-panel bordered>body</am-panel>');
    expect(el.hasAttribute('bordered')).toBe(true);
  });

  it('renders header and body slots', async () => {
    const el = await fixture<HTMLElement>(
      '<am-panel><span slot="header">Title</span><p>Body</p></am-panel>',
    );
    const headerSlot = el.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement;
    const bodySlot = el.shadowRoot?.querySelector('.body slot:not([name])') as HTMLSlotElement;
    expect(headerSlot.assignedElements()[0]?.textContent).toBe('Title');
    expect(bodySlot.assignedElements()[0]?.tagName).toBe('P');
  });

  it('exposes header and body parts', async () => {
    const el = await fixture<HTMLElement>('<am-panel>x</am-panel>');
    expect(el.shadowRoot?.querySelector('[part="header"]')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('[part="body"]')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('[part="panel"]')).toBeTruthy();
  });
});

describe('am-card', () => {
  it('renders default slot', async () => {
    const el = await fixture<HTMLElement>('<am-card><p class="content">hi</p></am-card>');
    expect(el.querySelector('.content')).toBeTruthy();
  });
});
