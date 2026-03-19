import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/progress/progress.js';

const meta: Meta = {
  title: 'Feedback/Progress',
  component: 'am-progress',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 60, max: 100, indeterminate: false },
  render: (args) => html`
    <am-progress value=${args.value} max=${args.max} ?indeterminate=${args.indeterminate} style="max-width: 400px;"></am-progress>
  `,
};

export const Variants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <am-progress value="80" variant="primary"></am-progress>
      <am-progress value="60" variant="success"></am-progress>
      <am-progress value="45" variant="warning"></am-progress>
      <am-progress value="30" variant="danger"></am-progress>
      <am-progress value="70" variant="info"></am-progress>
    </div>
  `,
};

export const Indeterminate: Story = {
  render: () => html`<am-progress indeterminate style="max-width: 400px;"></am-progress>`,
};
