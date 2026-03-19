import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/link-button/link-button.js';

const meta: Meta = {
  title: 'Actions/LinkButton',
  component: 'am-link-button',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'outlined', 'link', 'ghost', 'subtle', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'primary', size: 'md', href: '#' },
  render: (args) => html`
    <am-link-button href=${args.href} variant=${args.variant} size=${args.size}>Get started</am-link-button>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <am-link-button href="#" variant="primary">Primary</am-link-button>
      <am-link-button href="#" variant="outlined">Outlined</am-link-button>
      <am-link-button href="#" variant="link">Link</am-link-button>
      <am-link-button href="#" variant="ghost">Ghost</am-link-button>
      <am-link-button href="#" variant="subtle">Subtle</am-link-button>
      <am-link-button href="#" variant="danger">Danger</am-link-button>
    </div>
  `,
};
