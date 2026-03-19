import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Actions/Button',
  component: 'am-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'outlined', 'ghost', 'subtle', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md', disabled: false, loading: false },
  render: (args) => html`
    <am-button
      variant=${args.variant}
      size=${args.size}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
    >
      Save changes
    </am-button>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <am-button variant="primary">Primary</am-button>
      <am-button variant="outlined">Outlined</am-button>
      <am-button variant="ghost">Ghost</am-button>
      <am-button variant="subtle">Subtle</am-button>
      <am-button variant="danger">Danger</am-button>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <am-button size="sm">Small</am-button>
      <am-button size="md">Medium</am-button>
      <am-button size="lg">Large</am-button>
    </div>
  `,
};

export const Loading: Story = {
  args: { variant: 'primary', loading: true },
  render: (args) => html`
    <am-button variant=${args.variant} ?loading=${args.loading}>Processing</am-button>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <am-button variant="primary" disabled>Primary</am-button>
      <am-button variant="outlined" disabled>Outlined</am-button>
      <am-button variant="danger" disabled>Danger</am-button>
    </div>
  `,
};
