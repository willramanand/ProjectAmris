import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/textarea/textarea.js';

const meta: Meta = {
  title: 'Form/Textarea',
  component: 'am-textarea',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Message', rows: 3, disabled: false, invalid: false, clearable: false },
  render: (args) => html`
    <am-textarea
      label=${args.label}
      rows=${args.rows}
      ?disabled=${args.disabled}
      ?invalid=${args.invalid}
      ?clearable=${args.clearable}
      style="max-width: 400px;"
    ></am-textarea>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <am-textarea label="Normal"></am-textarea>
      <am-textarea label="Disabled" disabled></am-textarea>
      <am-textarea label="Invalid" invalid></am-textarea>
      <am-textarea label="Clearable" clearable value="Clear me"></am-textarea>
    </div>
  `,
};
