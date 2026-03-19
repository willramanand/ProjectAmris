import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/card/card.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Layout/Card',
  component: 'am-card',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { bordered: true, elevated: false },
  render: (args) => html`
    <am-card ?bordered=${args.bordered} ?elevated=${args.elevated} style="max-width: 400px;">
      <span slot="header">Card Title</span>
      <p>This is the card body content. It can contain any elements.</p>
      <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
        <am-button variant="ghost" size="sm">Cancel</am-button>
        <am-button size="sm">Save</am-button>
      </div>
    </am-card>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <am-card elevated style="max-width: 400px;">
      <span slot="header">Elevated Card</span>
      <p>This card has a shadow for visual elevation.</p>
    </am-card>
  `,
};
