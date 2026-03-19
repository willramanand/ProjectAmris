import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/icon-button/icon-button.js';

const closeIcon = html`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;

const meta: Meta = {
  title: 'Actions/IconButton',
  component: 'am-icon-button',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'outlined', 'ghost', 'subtle', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'ghost', size: 'md', disabled: false, loading: false },
  render: (args) => html`
    <am-icon-button variant=${args.variant} size=${args.size} ?disabled=${args.disabled} ?loading=${args.loading} label="Close">
      ${closeIcon}
    </am-icon-button>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <am-icon-button variant="primary" label="Primary">${closeIcon}</am-icon-button>
      <am-icon-button variant="outlined" label="Outlined">${closeIcon}</am-icon-button>
      <am-icon-button variant="ghost" label="Ghost">${closeIcon}</am-icon-button>
      <am-icon-button variant="subtle" label="Subtle">${closeIcon}</am-icon-button>
      <am-icon-button variant="danger" label="Danger">${closeIcon}</am-icon-button>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <am-icon-button size="sm" label="Small">${closeIcon}</am-icon-button>
      <am-icon-button size="md" label="Medium">${closeIcon}</am-icon-button>
      <am-icon-button size="lg" label="Large">${closeIcon}</am-icon-button>
    </div>
  `,
};
