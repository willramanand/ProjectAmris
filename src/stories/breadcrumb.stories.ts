import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/breadcrumb/breadcrumb.js';

const meta: Meta = {
  title: 'Navigation/Breadcrumb',
  component: 'am-breadcrumb',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-breadcrumb>
      <am-breadcrumb-item href="#">Home</am-breadcrumb-item>
      <am-breadcrumb-item href="#">Products</am-breadcrumb-item>
      <am-breadcrumb-item>Widget Pro</am-breadcrumb-item>
    </am-breadcrumb>
  `,
};
