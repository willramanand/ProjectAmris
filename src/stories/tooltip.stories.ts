import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/tooltip/tooltip.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Overlays/Tooltip',
  component: 'am-tooltip',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { content: 'Save your changes', placement: 'top' },
  render: (args) => html`
    <div style="padding: 60px; text-align: center;">
      <am-tooltip content=${args.content} placement=${args.placement}>
        <am-button>Hover me</am-button>
      </am-tooltip>
    </div>
  `,
};

export const Placements: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; padding: 60px; justify-content: center; flex-wrap: wrap;">
      <am-tooltip content="Top" placement="top"><am-button variant="outlined">Top</am-button></am-tooltip>
      <am-tooltip content="Bottom" placement="bottom"><am-button variant="outlined">Bottom</am-button></am-tooltip>
      <am-tooltip content="Left" placement="left"><am-button variant="outlined">Left</am-button></am-tooltip>
      <am-tooltip content="Right" placement="right"><am-button variant="outlined">Right</am-button></am-tooltip>
    </div>
  `,
};
