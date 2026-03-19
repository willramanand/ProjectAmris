import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/panel/panel.js';

const meta: Meta = {
  title: 'Layout/Panel',
  component: 'am-panel',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { bordered: false },
  render: (args) => html`
    <am-panel ?bordered=${args.bordered}>
      <span slot="header">Section Title</span>
      <p>Panel body content.</p>
    </am-panel>
  `,
};

export const Bordered: Story = {
  render: () => html`
    <am-panel bordered>
      <span slot="header">Bordered Panel</span>
      <p>This panel has a visible border.</p>
    </am-panel>
  `,
};
