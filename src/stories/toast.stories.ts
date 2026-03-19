import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/toast/toast.js';

const meta: Meta = {
  title: 'Feedback/Toast',
  component: 'am-toast',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'danger', 'neutral'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'success', open: true, closable: true, duration: 0 },
  render: (args) => html`
    <am-toast variant=${args.variant} ?open=${args.open} ?closable=${args.closable} duration=${args.duration}>
      Changes saved successfully.
    </am-toast>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <am-toast variant="info" open duration="0">Informational message.</am-toast>
      <am-toast variant="success" open duration="0">Operation completed.</am-toast>
      <am-toast variant="warning" open duration="0">Watch out!</am-toast>
      <am-toast variant="danger" open duration="0">Something went wrong.</am-toast>
      <am-toast variant="neutral" open duration="0">General notice.</am-toast>
    </div>
  `,
};
