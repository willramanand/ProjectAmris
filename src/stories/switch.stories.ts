import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/switch/switch.js';

const meta: Meta = {
  title: 'Form/Switch',
  component: 'am-switch',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { checked: false, disabled: false, loading: false },
  render: (args) => html`
    <am-switch ?checked=${args.checked} ?disabled=${args.disabled} ?loading=${args.loading}>
      Dark mode
    </am-switch>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <am-switch>Off</am-switch>
      <am-switch checked>On</am-switch>
      <am-switch disabled>Disabled</am-switch>
      <am-switch checked disabled>Checked &amp; disabled</am-switch>
      <am-switch loading>Loading</am-switch>
    </div>
  `,
};
