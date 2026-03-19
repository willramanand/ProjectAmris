import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/select/select.js';

const meta: Meta = {
  title: 'Form/Select',
  component: 'am-select',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Fruit', placeholder: 'Choose a fruit', size: 'md', disabled: false },
  render: (args) => html`
    <am-select label=${args.label} placeholder=${args.placeholder} size=${args.size} ?disabled=${args.disabled} style="max-width: 320px;">
      <am-option value="apple">Apple</am-option>
      <am-option value="banana">Banana</am-option>
      <am-option value="cherry">Cherry</am-option>
      <am-option value="grape" disabled>Grape (disabled)</am-option>
    </am-select>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
      <am-select label="Small" size="sm" placeholder="Pick one">
        <am-option value="a">Alpha</am-option>
        <am-option value="b">Beta</am-option>
      </am-select>
      <am-select label="Medium" size="md" placeholder="Pick one">
        <am-option value="a">Alpha</am-option>
        <am-option value="b">Beta</am-option>
      </am-select>
      <am-select label="Large" size="lg" placeholder="Pick one">
        <am-option value="a">Alpha</am-option>
        <am-option value="b">Beta</am-option>
      </am-select>
    </div>
  `,
};
