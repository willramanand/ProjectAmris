import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/context-menu/context-menu.js';
import '../components/menu/menu.js';

const meta: Meta = {
  title: 'Overlays/ContextMenu',
  component: 'am-context-menu',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-context-menu>
      <div style="padding: 3rem; border: 1px dashed var(--am-border); border-radius: 8px; text-align: center; color: var(--am-text-secondary);">
        Right-click here
      </div>
      <am-menu slot="menu">
        <am-menu-item>Cut</am-menu-item>
        <am-menu-item>Copy</am-menu-item>
        <am-menu-item>Paste</am-menu-item>
        <am-menu-divider></am-menu-divider>
        <am-menu-item destructive>Delete</am-menu-item>
      </am-menu>
    </am-context-menu>
  `,
};
