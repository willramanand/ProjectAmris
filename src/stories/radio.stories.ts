import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/radio/radio.js';

const meta: Meta = {
  title: 'Form/Radio',
  component: 'am-radio-group',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-radio-group label="Choose a plan" name="plan" value="pro">
      <am-radio value="free">Free</am-radio>
      <am-radio value="pro">Pro</am-radio>
      <am-radio value="enterprise">Enterprise</am-radio>
    </am-radio-group>
  `,
};

export const WithDisabled: Story = {
  render: () => html`
    <am-radio-group label="Options" name="opts" value="b">
      <am-radio value="a">Option A</am-radio>
      <am-radio value="b">Option B (selected)</am-radio>
      <am-radio value="c" disabled>Option C (disabled)</am-radio>
    </am-radio-group>
  `,
};
