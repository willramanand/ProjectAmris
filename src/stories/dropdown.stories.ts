import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/dropdown/dropdown.js';
import '../components/button/button.js';
import '../components/menu/menu.js';

const meta: Meta = {
  title: 'Overlays/Dropdown',
  component: 'am-dropdown',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="padding: 20px;">
      <am-dropdown>
        <am-button variant="outlined">Options</am-button>
        <am-menu slot="content">
          <am-menu-item>Edit</am-menu-item>
          <am-menu-item>Duplicate</am-menu-item>
          <am-menu-divider></am-menu-divider>
          <am-menu-item destructive>Delete</am-menu-item>
        </am-menu>
      </am-dropdown>
    </div>
  `,
};
