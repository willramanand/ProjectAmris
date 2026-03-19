import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/split-view/split-view.js';

const meta: Meta = {
  title: 'Layout/SplitView',
  component: 'am-split-view',
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    position: { control: { type: 'range', min: 10, max: 90 } },
  },
};
export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  args: { position: 30 },
  render: (args) => html`
    <am-split-view position=${args.position} style="height: 300px; border: 1px solid var(--am-border);">
      <div slot="start" style="padding: 16px;">Left pane</div>
      <div slot="end" style="padding: 16px;">Right pane</div>
    </am-split-view>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <am-split-view orientation="vertical" position="40" style="height: 300px; border: 1px solid var(--am-border);">
      <div slot="start" style="padding: 16px;">Top pane</div>
      <div slot="end" style="padding: 16px;">Bottom pane</div>
    </am-split-view>
  `,
};
