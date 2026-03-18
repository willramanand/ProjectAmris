import { describe, expect, it } from 'vitest';

import { checkA11y, formatViolations } from './a11y-helper';
import { fixture, waitForUpdate } from './helpers';

// Import all components under test
import '../src/components/accordion/accordion';
import '../src/components/alert/alert';
import '../src/components/avatar/avatar';
import '../src/components/badge/badge';
import '../src/components/breadcrumb/breadcrumb';
import '../src/components/button/button';
import '../src/components/checkbox/checkbox';
import '../src/components/dialog/dialog';
import '../src/components/divider/divider';
import '../src/components/drawer/drawer';
import '../src/components/dropdown/dropdown';
import '../src/components/file-upload/file-upload';
import '../src/components/icon-button/icon-button';
import '../src/components/input/input';
import '../src/components/input-otp/input-otp';
import '../src/components/list/list';
import '../src/components/number-field/number-field';
import '../src/components/pagination/pagination';
import '../src/components/popover/popover';
import '../src/components/progress/progress';
import '../src/components/radio/radio';
import '../src/components/search-field/search-field';
import '../src/components/select/select';
import '../src/components/skeleton/skeleton';
import '../src/components/slider/slider';
import '../src/components/spinner/spinner';
import '../src/components/switch/switch';
import '../src/components/tabs/tabs';
import '../src/components/textarea/textarea';
import '../src/components/toast/toast';
import '../src/components/tooltip/tooltip';
import '../src/components/tree-view/tree-view';

async function expectNoViolations(element: HTMLElement, disabledRules: string[] = []) {
  const violations = await checkA11y(element, disabledRules);
  expect(violations, formatViolations(violations)).toHaveLength(0);
}

describe('a11y smoke tests', () => {
  it('am-button', async () => {
    const el = await fixture('<am-button>Click me</am-button>');
    await expectNoViolations(el);
  });

  it('am-button with variant', async () => {
    const el = await fixture('<am-button variant="primary">Submit</am-button>');
    await expectNoViolations(el);
  });

  it('am-icon-button', async () => {
    const el = await fixture(`
      <am-icon-button label="Close">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18" stroke="currentColor"/></svg>
      </am-icon-button>
    `);
    await expectNoViolations(el);
  });

  it('am-input with label', async () => {
    const el = await fixture('<am-input label="Email" type="email"></am-input>');
    await expectNoViolations(el);
  });

  it('am-textarea with label', async () => {
    const el = await fixture('<am-textarea label="Message"></am-textarea>');
    await expectNoViolations(el);
  });

  it('am-checkbox', async () => {
    const el = await fixture('<am-checkbox>Accept terms</am-checkbox>');
    await expectNoViolations(el);
  });

  it('am-switch', async () => {
    const el = await fixture('<am-switch>Dark mode</am-switch>');
    await expectNoViolations(el);
  });

  it('am-radio-group', async () => {
    const el = await fixture(`
      <am-radio-group label="Plan" value="free">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-select', async () => {
    const el = await fixture(`
      <am-select label="Fruit" placeholder="Choose">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>
    `);
    await expectNoViolations(el);
  });

  it('am-number-field', async () => {
    const el = await fixture('<am-number-field label="Quantity"></am-number-field>');
    await expectNoViolations(el);
  });

  it('am-search-field', async () => {
    const el = await fixture('<am-search-field placeholder="Search..."></am-search-field>');
    await expectNoViolations(el);
  });

  it('am-slider', async () => {
    const el = await fixture('<am-slider label="Volume" min="0" max="100" value="50"></am-slider>');
    await expectNoViolations(el);
  });

  it('am-input-otp', async () => {
    const el = await fixture('<am-input-otp length="6"></am-input-otp>');
    await expectNoViolations(el);
  });

  it('am-file-upload', async () => {
    const el = await fixture('<am-file-upload label="Upload files"></am-file-upload>');
    await expectNoViolations(el);
  });

  it('am-alert', async () => {
    const el = await fixture('<am-alert variant="info">Something happened.</am-alert>');
    await expectNoViolations(el);
  });

  it('am-alert closable', async () => {
    const el = await fixture('<am-alert variant="warning" closable>Warning!</am-alert>');
    await expectNoViolations(el);
  });

  it('am-badge', async () => {
    const el = await fixture('<am-badge variant="primary">New</am-badge>');
    await expectNoViolations(el);
  });

  it('am-avatar', async () => {
    const el = await fixture('<am-avatar initials="JD" label="John Doe"></am-avatar>');
    await expectNoViolations(el);
  });

  it('am-spinner', async () => {
    const el = await fixture('<am-spinner label="Loading"></am-spinner>');
    await expectNoViolations(el);
  });

  it('am-progress', async () => {
    const el = await fixture('<am-progress value="60" max="100" label="Upload progress"></am-progress>');
    await expectNoViolations(el);
  });

  it('am-skeleton', async () => {
    const el = await fixture('<am-skeleton></am-skeleton>');
    await expectNoViolations(el);
  });

  it('am-divider', async () => {
    const el = await fixture('<am-divider></am-divider>');
    await expectNoViolations(el);
  });

  it('am-dialog (open)', async () => {
    const el = await fixture('<am-dialog label="Confirm" open>Are you sure?</am-dialog>') as HTMLElement & { open: boolean };
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-drawer (open)', async () => {
    const el = await fixture('<am-drawer label="Menu" open>Menu content</am-drawer>') as HTMLElement & { open: boolean };
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-dropdown', async () => {
    const el = await fixture(`
      <am-dropdown>
        <am-button slot="trigger">Open</am-button>
        <div>Dropdown content</div>
      </am-dropdown>
    `);
    await expectNoViolations(el);
  });

  it('am-popover', async () => {
    const el = await fixture(`
      <am-popover>
        <am-button slot="trigger">Info</am-button>
        <div>Popover content</div>
      </am-popover>
    `);
    await expectNoViolations(el);
  });

  it('am-tooltip', async () => {
    const el = await fixture(`
      <am-tooltip content="Helpful tip">
        <am-button>Hover me</am-button>
      </am-tooltip>
    `);
    await expectNoViolations(el);
  });

  it('am-toast', async () => {
    const el = await fixture('<am-toast variant="success" open>Saved!</am-toast>');
    await expectNoViolations(el);
  });

  it('am-tabs', async () => {
    const el = await fixture(`
      <am-tabs>
        <am-tab slot="nav" panel="one">Tab 1</am-tab>
        <am-tab slot="nav" panel="two">Tab 2</am-tab>
        <am-tab-panel name="one">Content 1</am-tab-panel>
        <am-tab-panel name="two">Content 2</am-tab-panel>
      </am-tabs>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-accordion', async () => {
    const el = await fixture(`
      <am-accordion>
        <am-accordion-item>
          <span slot="header">Section 1</span>
          Content 1
        </am-accordion-item>
        <am-accordion-item>
          <span slot="header">Section 2</span>
          Content 2
        </am-accordion-item>
      </am-accordion>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-pagination', async () => {
    const el = await fixture('<am-pagination total="10" page="3"></am-pagination>');
    await expectNoViolations(el);
  });

  it('am-pagination simple', async () => {
    const el = await fixture('<am-pagination total="10" page="3" variant="simple"></am-pagination>');
    await expectNoViolations(el);
  });

  it('am-list', async () => {
    const el = await fixture(`
      <am-list>
        <am-list-item>Item 1</am-list-item>
        <am-list-item>Item 2</am-list-item>
      </am-list>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-tree-view', async () => {
    const el = await fixture(`
      <am-tree-view>
        <am-tree-item label="src" value="src">
          <am-tree-item label="index.ts" value="index"></am-tree-item>
        </am-tree-item>
      </am-tree-view>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });

  it('am-breadcrumb', async () => {
    const el = await fixture(`
      <am-breadcrumb>
        <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
        <am-breadcrumb-item href="/docs">Docs</am-breadcrumb-item>
        <am-breadcrumb-item>Current</am-breadcrumb-item>
      </am-breadcrumb>
    `);
    await waitForUpdate(el);
    await expectNoViolations(el);
  });
});
