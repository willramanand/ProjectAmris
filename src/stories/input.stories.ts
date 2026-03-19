import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/input/input.js';

const meta: Meta = {
  title: 'Form/Input',
  component: 'am-input',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Email address', type: 'email', size: 'md', disabled: false, invalid: false, clearable: false },
  render: (args) => html`
    <am-input
      label=${args.label}
      type=${args.type}
      size=${args.size}
      ?disabled=${args.disabled}
      ?invalid=${args.invalid}
      ?clearable=${args.clearable}
    ></am-input>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
      <am-input label="Small" size="sm"></am-input>
      <am-input label="Medium" size="md"></am-input>
      <am-input label="Large" size="lg"></am-input>
    </div>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
      <am-input label="Normal"></am-input>
      <am-input label="Disabled" disabled></am-input>
      <am-input label="Invalid" invalid></am-input>
      <am-input label="Read-only" readonly value="Can't edit this"></am-input>
      <am-input label="Clearable" clearable value="Clear me"></am-input>
    </div>
  `,
};
