import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/badge/badge.js';

const meta: Meta = {
  title: 'Data Display/Badge',
  component: 'am-badge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'neutral', size: 'md', removable: false, disabled: false },
  render: (args) => html`
    <am-badge
      variant=${args.variant}
      size=${args.size}
      ?removable=${args.removable}
      ?disabled=${args.disabled}
    >
      Badge
    </am-badge>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <am-badge variant="neutral">Neutral</am-badge>
      <am-badge variant="primary">Primary</am-badge>
      <am-badge variant="secondary">Secondary</am-badge>
      <am-badge variant="success">Success</am-badge>
      <am-badge variant="warning">Warning</am-badge>
      <am-badge variant="danger">Danger</am-badge>
      <am-badge variant="info">Info</am-badge>
    </div>
  `,
};

export const Removable: Story = {
  render: () => html`
    <div style="display: flex; gap: 8px;">
      <am-badge variant="primary" removable>React</am-badge>
      <am-badge variant="success" removable>Active</am-badge>
      <am-badge variant="danger" removable>Overdue</am-badge>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 8px; align-items: center;">
      <am-badge size="sm" variant="primary">Small</am-badge>
      <am-badge size="md" variant="primary">Medium</am-badge>
      <am-badge size="lg" variant="primary">Large</am-badge>
    </div>
  `,
};
