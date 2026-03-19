import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/checkbox/checkbox.js';

const meta: Meta = {
  title: 'Form/Checkbox',
  component: 'am-checkbox',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { checked: false, disabled: false, indeterminate: false },
  render: (args) => html`
    <am-checkbox ?checked=${args.checked} ?disabled=${args.disabled} ?indeterminate=${args.indeterminate}>
      Accept terms and conditions
    </am-checkbox>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <am-checkbox>Unchecked</am-checkbox>
      <am-checkbox checked>Checked</am-checkbox>
      <am-checkbox indeterminate>Indeterminate</am-checkbox>
      <am-checkbox disabled>Disabled</am-checkbox>
      <am-checkbox checked disabled>Checked &amp; disabled</am-checkbox>
    </div>
  `,
};
