import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/progress-ring/progress-ring.js';

const meta: Meta = {
  title: 'Feedback/ProgressRing',
  component: 'am-progress-ring',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 75, variant: 'primary', size: 'md', indeterminate: false },
  render: (args) => html`
    <am-progress-ring value=${args.value} variant=${args.variant} size=${args.size} ?indeterminate=${args.indeterminate}>
      ${args.value}%
    </am-progress-ring>
  `,
};

export const Variants: Story = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <am-progress-ring value="90" variant="success">90%</am-progress-ring>
      <am-progress-ring value="60" variant="warning">60%</am-progress-ring>
      <am-progress-ring value="30" variant="danger">30%</am-progress-ring>
      <am-progress-ring indeterminate variant="info"></am-progress-ring>
    </div>
  `,
};
