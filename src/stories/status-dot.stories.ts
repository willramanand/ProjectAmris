import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/status-dot/status-dot.js';

const meta: Meta = {
  title: 'Data Display/StatusDot',
  component: 'am-status-dot',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['neutral', 'primary', 'success', 'warning', 'danger', 'info'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'success', size: 'md', pulse: false },
  render: (args) => html`
    <am-status-dot variant=${args.variant} size=${args.size} ?pulse=${args.pulse}>Online</am-status-dot>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <am-status-dot variant="success">Online</am-status-dot>
      <am-status-dot variant="danger">Offline</am-status-dot>
      <am-status-dot variant="warning">Away</am-status-dot>
      <am-status-dot variant="info">Busy</am-status-dot>
      <am-status-dot variant="neutral">Unknown</am-status-dot>
      <am-status-dot variant="success" pulse>Live</am-status-dot>
    </div>
  `,
};
