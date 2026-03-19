import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/search-field/search-field.js';

const meta: Meta = {
  title: 'Form/SearchField',
  component: 'am-search-field',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { placeholder: 'Search items...', size: 'md', disabled: false },
  render: (args) => html`
    <am-search-field placeholder=${args.placeholder} size=${args.size} ?disabled=${args.disabled} style="max-width: 320px;"></am-search-field>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
      <am-search-field size="sm" placeholder="Small"></am-search-field>
      <am-search-field size="md" placeholder="Medium"></am-search-field>
      <am-search-field size="lg" placeholder="Large"></am-search-field>
    </div>
  `,
};
