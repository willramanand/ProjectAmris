import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/number-field/number-field.js';

const meta: Meta = {
  title: 'Form/NumberField',
  component: 'am-number-field',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Quantity', value: 1, min: 0, max: 99, step: 1, size: 'md', disabled: false },
  render: (args) => html`
    <am-number-field
      label=${args.label}
      value=${args.value}
      min=${args.min}
      max=${args.max}
      step=${args.step}
      size=${args.size}
      ?disabled=${args.disabled}
      style="max-width: 200px;"
    ></am-number-field>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 200px;">
      <am-number-field label="Normal" value="5"></am-number-field>
      <am-number-field label="Disabled" value="5" disabled></am-number-field>
      <am-number-field label="Invalid" value="5" invalid></am-number-field>
    </div>
  `,
};
