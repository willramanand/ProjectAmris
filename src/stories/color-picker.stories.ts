import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/color-picker/color-picker.js';

const meta: Meta = {
  title: 'Advanced/ColorPicker',
  component: 'am-color-picker',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: '#6366f1', label: 'Brand color', size: 'md', disabled: false },
  render: (args) => html`
    <am-color-picker value=${args.value} label=${args.label} size=${args.size} ?disabled=${args.disabled}></am-color-picker>
  `,
};

export const WithAlpha: Story = {
  render: () => html`
    <am-color-picker value="#ff5733" label="Accent color" show-alpha></am-color-picker>
  `,
};

export const WithSwatches: Story = {
  render: () => html`
    <am-color-picker
      value="#6366f1"
      label="Pick a color"
      .swatches=${['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']}
    ></am-color-picker>
  `,
};
