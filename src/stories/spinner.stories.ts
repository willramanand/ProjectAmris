import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/spinner/spinner.js';

const meta: Meta = {
  title: 'Foundation/Spinner',
  component: 'am-spinner',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { size: 'md' },
  render: (args) => html`<am-spinner size=${args.size}></am-spinner>`,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      <am-spinner size="sm"></am-spinner>
      <am-spinner size="md"></am-spinner>
      <am-spinner size="lg"></am-spinner>
    </div>
  `,
};
