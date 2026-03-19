import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/alert/alert.js';

const meta: Meta = {
  title: 'Feedback/Alert',
  component: 'am-alert',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger', 'neutral'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Info: Story = {
  args: { variant: 'info', closable: false, open: true, banner: false },
  render: (args) => html`
    <am-alert
      variant=${args.variant}
      ?closable=${args.closable}
      ?open=${args.open}
      ?banner=${args.banner}
    >
      A new software update is available.
    </am-alert>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <am-alert variant="info">Informational message.</am-alert>
      <am-alert variant="success">Changes saved successfully.</am-alert>
      <am-alert variant="warning">Your trial expires in 3 days.</am-alert>
      <am-alert variant="danger">Something went wrong.</am-alert>
      <am-alert variant="neutral">General notice.</am-alert>
    </div>
  `,
};

export const Closable: Story = {
  render: () => html`
    <am-alert variant="success" closable>
      You can dismiss this alert.
    </am-alert>
  `,
};

export const Banner: Story = {
  render: () => html`
    <am-alert variant="warning" banner closable>
      Scheduled maintenance tonight at 11 PM UTC.
    </am-alert>
  `,
};
