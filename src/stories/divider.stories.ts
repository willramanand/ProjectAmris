import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/divider/divider.js';

const meta: Meta = {
  title: 'Foundation/Divider',
  component: 'am-divider',
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};
export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  render: () => html`
    <p>Content above</p>
    <am-divider></am-divider>
    <p>Content below</p>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; height: 40px;">
      <span>Left</span>
      <am-divider orientation="vertical"></am-divider>
      <span>Right</span>
    </div>
  `,
};
