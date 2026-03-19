import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/input-otp/input-otp.js';

const meta: Meta = {
  title: 'Form/InputOtp',
  component: 'am-input-otp',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const SixDigit: Story = {
  args: { length: 6, type: 'numeric', disabled: false, invalid: false },
  render: (args) => html`
    <am-input-otp length=${args.length} type=${args.type} ?disabled=${args.disabled} ?invalid=${args.invalid}></am-input-otp>
  `,
};

export const FourDigit: Story = {
  render: () => html`<am-input-otp length="4" type="numeric"></am-input-otp>`,
};

export const Alphanumeric: Story = {
  render: () => html`<am-input-otp length="6" type="alphanumeric"></am-input-otp>`,
};
