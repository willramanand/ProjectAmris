import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/rich-select/rich-select.js';

const options = [
  { value: 'alice', label: 'Alice Johnson', description: 'Engineering' },
  { value: 'bob', label: 'Bob Smith', description: 'Design' },
  { value: 'charlie', label: 'Charlie Brown', description: 'Marketing', disabled: true },
  { value: 'diana', label: 'Diana Prince', description: 'Engineering' },
];

const meta: Meta = {
  title: 'Advanced/RichSelect',
  component: 'am-rich-select',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Assignee', size: 'md', disabled: false },
  render: (args) => html`
    <am-rich-select label=${args.label} size=${args.size} ?disabled=${args.disabled} .options=${options} style="max-width: 320px;"></am-rich-select>
  `,
};
