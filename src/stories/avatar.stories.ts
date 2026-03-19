import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/avatar/avatar.js';

const meta: Meta = {
  title: 'Data Display/Avatar',
  component: 'am-avatar',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'select', options: ['circle', 'square'] },
  },
};
export default meta;
type Story = StoryObj;

export const Initials: Story = {
  args: { initials: 'JD', size: 'md', shape: 'circle' },
  render: (args) => html`<am-avatar initials=${args.initials} size=${args.size} shape=${args.shape}></am-avatar>`,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <am-avatar initials="XS" size="xs"></am-avatar>
      <am-avatar initials="SM" size="sm"></am-avatar>
      <am-avatar initials="MD" size="md"></am-avatar>
      <am-avatar initials="LG" size="lg"></am-avatar>
      <am-avatar initials="XL" size="xl"></am-avatar>
    </div>
  `,
};

export const Fallback: Story = {
  render: () => html`<am-avatar></am-avatar>`,
};
