import { describe, expect, it } from 'vitest';

import '../../src/components/breadcrumb/breadcrumb';
import '../../src/components/button-group/button-group';
import '../../src/components/empty-state/empty-state';
import '../../src/components/error-text/error-text';
import '../../src/components/field/field';
import '../../src/components/hint-text/hint-text';
import '../../src/components/label/label';
import '../../src/components/nav-bar/nav-bar';
import '../../src/components/progress-ring/progress-ring';
import '../../src/components/side-nav/side-nav';
import '../../src/components/split-view/split-view';
import '../../src/components/stat/stat';
import '../../src/components/status-dot/status-dot';
import '../../src/components/timeline/timeline';
import '../../src/components/visually-hidden/visually-hidden';
import '../../src/components/app-shell/app-shell';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-breadcrumb-item', () => {
  it('renders an anchor when href is set, plain span when current', async () => {
    const link = await fixture<HTMLElement>(
      '<am-breadcrumb-item href="/x">Home</am-breadcrumb-item>',
    );
    expect(link.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/x');

    const current = await fixture<HTMLElement>(
      '<am-breadcrumb-item current>Now</am-breadcrumb-item>',
    );
    expect(current.hasAttribute('current')).toBe(true);
    expect(current.shadowRoot?.querySelector('a')).toBeNull();
  });
});

describe('am-button-group', () => {
  it('reflects orientation', async () => {
    const el = await fixture<HTMLElement>(
      '<am-button-group orientation="vertical"><button>a</button></am-button-group>',
    );
    expect(el.getAttribute('orientation')).toBe('vertical');
  });

  it('exposes role=group', async () => {
    const el = await fixture<HTMLElement>(
      '<am-button-group><button>a</button></am-button-group>',
    );
    expect(el.getAttribute('role')).toBe('group');
  });
});

describe('am-empty-state', () => {
  it('renders icon, heading, and action named slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-empty-state>
         <span slot="icon">📭</span>
         <span slot="heading">Nothing here</span>
         <span>Description goes in default slot.</span>
         <button slot="action">Create</button>
       </am-empty-state>`,
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('icon');
    expect(slotNames).toContain('heading');
    expect(slotNames).toContain('action');
  });
});

describe('am-error-text', () => {
  it('renders default slot and applies role=alert', async () => {
    const el = await fixture<HTMLElement>('<am-error-text>Required</am-error-text>');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

describe('am-field', () => {
  it('renders default slot for grouping form controls', async () => {
    const el = await fixture<HTMLElement>(
      '<am-field><am-label>X</am-label><input /></am-field>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

describe('am-hint-text', () => {
  it('renders the hint text', async () => {
    const el = await fixture<HTMLElement>('<am-hint-text>Help</am-hint-text>');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

describe('am-label', () => {
  it('reflects required and optional, and exposes for association', async () => {
    const el = await fixture<HTMLElement & { for: string }>(
      '<am-label for="x" required>Name</am-label>',
    );
    expect(el.for).toBe('x');
    expect(el.hasAttribute('required')).toBe(true);
  });
});

describe('am-nav-bar', () => {
  it('exposes role=navigation', async () => {
    const el = await fixture<HTMLElement>('<am-nav-bar></am-nav-bar>');
    expect(el.getAttribute('role')).toBe('navigation');
  });
});

describe('am-progress-ring', () => {
  it('exposes role=progressbar with aria-valuenow on the inner svg', async () => {
    const el = await fixture<HTMLElement & { value: number; max: number }>(
      '<am-progress-ring value="40" max="100"></am-progress-ring>',
    );
    expect(el.value).toBe(40);
    const svg = el.shadowRoot?.querySelector('svg[role="progressbar"]') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-valuenow')).toBe('40');
    expect(svg.getAttribute('aria-valuemax')).toBe('100');
  });

  it('omits aria-valuenow when indeterminate', async () => {
    const el = await fixture<HTMLElement>('<am-progress-ring indeterminate></am-progress-ring>');
    const svg = el.shadowRoot?.querySelector('svg[role="progressbar"]') as SVGElement;
    expect(svg.hasAttribute('aria-valuenow')).toBe(false);
  });
});

describe('am-side-nav-item', () => {
  it('reflects active and renders an anchor with href', async () => {
    const el = await fixture<HTMLElement>(
      '<am-side-nav-item href="/x" active>Item</am-side-nav-item>',
    );
    expect(el.hasAttribute('active')).toBe(true);
    expect(el.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/x');
  });
});

describe('am-split-view', () => {
  it('reflects orientation', async () => {
    const el = await fixture<HTMLElement>(
      '<am-split-view orientation="vertical"><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    expect(el.getAttribute('orientation')).toBe('vertical');
  });

  it('renders start and end named slots', async () => {
    const el = await fixture<HTMLElement>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('start');
    expect(slotNames).toContain('end');
  });

  it('updates position prop dynamically', async () => {
    const el = await fixture<HTMLElement & { position: number }>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    el.position = 70;
    await waitForUpdate(el);
    expect(el.position).toBe(70);
  });
});

describe('am-stat', () => {
  it('reflects trend', async () => {
    const el = await fixture<HTMLElement>('<am-stat trend="up">42</am-stat>');
    expect(el.getAttribute('trend')).toBe('up');
  });
});

describe('am-status-dot', () => {
  it('reflects variant, size, pulse', async () => {
    const el = await fixture<HTMLElement>(
      '<am-status-dot variant="success" size="lg" pulse></am-status-dot>',
    );
    expect(el.getAttribute('variant')).toBe('success');
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.hasAttribute('pulse')).toBe(true);
  });
});

describe('am-timeline-item', () => {
  it('reflects variant', async () => {
    const el = await fixture<HTMLElement>('<am-timeline-item variant="success"></am-timeline-item>');
    expect(el.getAttribute('variant')).toBe('success');
  });
});

describe('am-visually-hidden', () => {
  it('renders a slot inside an element kept off-screen', async () => {
    const el = await fixture<HTMLElement>(
      '<am-visually-hidden>Screen reader only</am-visually-hidden>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

describe('am-app-shell', () => {
  it('renders header, sidebar, main, footer slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-app-shell>
         <span slot="header">H</span>
         <span slot="sidebar">S</span>
         <span>main</span>
         <span slot="footer">F</span>
       </am-app-shell>`,
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('header');
    expect(slotNames).toContain('sidebar');
    expect(slotNames).toContain('footer');
  });
});
