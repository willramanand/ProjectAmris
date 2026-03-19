import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/field/field.js';
import '../components/label/label.js';
import '../components/input/input.js';
import '../components/hint-text/hint-text.js';
import '../components/error-text/error-text.js';

const meta: Meta = {
  title: 'Form/Field',
  component: 'am-field',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const WithHint: Story = {
  render: () => html`
    <am-field style="max-width: 320px;">
      <am-label slot="label" required>Email</am-label>
      <am-input type="email" placeholder="you@example.com"></am-input>
      <am-hint-text slot="hint">We'll never share your email.</am-hint-text>
    </am-field>
  `,
};

export const WithError: Story = {
  render: () => html`
    <am-field style="max-width: 320px;">
      <am-label slot="label" required>Password</am-label>
      <am-input type="password" invalid></am-input>
      <am-error-text slot="error">Password must be at least 8 characters.</am-error-text>
    </am-field>
  `,
};
