import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/time-picker/time-picker.js';

const meta: Meta = {
  title: 'Advanced/TimePicker',
  component: 'am-time-picker',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Start time', size: 'md', disabled: false },
  render: (args) => html`
    <am-time-picker label=${args.label} size=${args.size} ?disabled=${args.disabled} style="max-width: 200px;"></am-time-picker>
  `,
};

export const TwelveHour: Story = {
  render: () => html`
    <am-time-picker label="Meeting time" value="14:30" use12-hour style="max-width: 200px;"></am-time-picker>
  `,
};

export const WithSeconds: Story = {
  render: () => html`
    <am-time-picker label="Precise time" show-seconds style="max-width: 220px;"></am-time-picker>
  `,
};
