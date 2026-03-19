import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/date-picker/date-picker.js';

const meta: Meta = {
  title: 'Advanced/DatePicker',
  component: 'am-date-picker',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Start date', size: 'md', disabled: false, invalid: false },
  render: (args) => html`
    <am-date-picker label=${args.label} size=${args.size} ?disabled=${args.disabled} ?invalid=${args.invalid} style="max-width: 280px;"></am-date-picker>
  `,
};

export const WithValue: Story = {
  render: () => html`
    <am-date-picker label="Event date" value="2025-06-15" style="max-width: 280px;"></am-date-picker>
  `,
};
