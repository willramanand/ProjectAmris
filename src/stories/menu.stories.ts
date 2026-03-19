import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/menu/menu.js';

const meta: Meta = {
  title: 'Overlays/Menu',
  component: 'am-menu',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-menu style="max-width: 240px;">
      <am-menu-item>Cut</am-menu-item>
      <am-menu-item>Copy</am-menu-item>
      <am-menu-item>Paste</am-menu-item>
      <am-menu-divider></am-menu-divider>
      <am-menu-item destructive>Delete</am-menu-item>
    </am-menu>
  `,
};

export const WithSelection: Story = {
  render: () => html`
    <am-menu style="max-width: 240px;">
      <am-menu-item selected>Light theme</am-menu-item>
      <am-menu-item>Dark theme</am-menu-item>
      <am-menu-item>System</am-menu-item>
    </am-menu>
  `,
};
