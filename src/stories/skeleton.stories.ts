import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/skeleton/skeleton.js';

const meta: Meta = {
  title: 'Data Display/Skeleton',
  component: 'am-skeleton',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['text', 'circular', 'rectangular'] },
  },
};
export default meta;
type Story = StoryObj;

export const Text: Story = {
  render: () => html`
    <div style="max-width: 300px;">
      <am-skeleton variant="text" lines="3"></am-skeleton>
    </div>
  `,
};

export const Circular: Story = {
  render: () => html`<am-skeleton variant="circular" style="width: 48px; height: 48px;"></am-skeleton>`,
};

export const Rectangular: Story = {
  render: () => html`<am-skeleton variant="rectangular" style="width: 100%; height: 120px; max-width: 400px;"></am-skeleton>`,
};

export const CardPlaceholder: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: start; max-width: 300px;">
      <am-skeleton variant="circular" style="width: 40px; height: 40px; flex-shrink: 0;"></am-skeleton>
      <div style="flex: 1;">
        <am-skeleton variant="text" style="width: 60%; margin-bottom: 8px;"></am-skeleton>
        <am-skeleton variant="text" lines="2"></am-skeleton>
      </div>
    </div>
  `,
};
