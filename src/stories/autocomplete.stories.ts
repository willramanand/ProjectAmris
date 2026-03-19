import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/autocomplete/autocomplete.js';

const meta: Meta = {
  title: 'Form/Autocomplete',
  component: 'am-autocomplete',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Search users', placeholder: 'Type a name...', size: 'md' },
  render: (args) => html`
    <am-autocomplete label=${args.label} placeholder=${args.placeholder} size=${args.size} style="max-width: 320px;"></am-autocomplete>
  `,
};
