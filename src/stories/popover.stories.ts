import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/popover/popover.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Overlays/Popover',
  component: 'am-popover',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="padding: 80px; text-align: center;">
      <am-popover>
        <am-button>Open popover</am-button>
        <div slot="content" style="padding: 12px; min-width: 200px;">
          <p style="margin: 0;">Popover content goes here.</p>
        </div>
      </am-popover>
    </div>
  `,
};
