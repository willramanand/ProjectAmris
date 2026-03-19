import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/drawer/drawer.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Overlays/Drawer',
  component: 'am-drawer',
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: ['start', 'end', 'top', 'bottom'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { open: true, label: 'Settings', placement: 'end', size: 'md' },
  render: (args) => html`
    <am-drawer label=${args.label} placement=${args.placement} size=${args.size} ?open=${args.open}>
      <p>Drawer body content here.</p>
      <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
        <am-button variant="ghost">Cancel</am-button>
        <am-button>Save</am-button>
      </div>
    </am-drawer>
  `,
};
