import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/calendar/calendar.js';

const meta: Meta = {
  title: 'Advanced/Calendar',
  component: 'am-calendar',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { size: 'md', disabled: false },
  render: (args) => html`
    <am-calendar size=${args.size} ?disabled=${args.disabled}></am-calendar>
  `,
};

export const WithConstraints: Story = {
  render: () => html`
    <am-calendar value="2025-03-15" min="2025-03-01" max="2025-03-31"></am-calendar>
  `,
};
