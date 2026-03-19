import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/dialog/dialog.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Overlays/Dialog',
  component: 'am-dialog',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { open: true, label: 'Confirm action', size: 'md', closable: true },
  render: (args) => html`
    <am-dialog
      label=${args.label}
      size=${args.size}
      ?open=${args.open}
      ?closable=${args.closable}
    >
      <p>Are you sure you want to continue? This action cannot be undone.</p>
      <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
        <am-button variant="ghost">Cancel</am-button>
        <am-button variant="primary">Confirm</am-button>
      </div>
    </am-dialog>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 12px;">
      <am-button variant="outlined" @click=${(e: Event) => {
        const dialog = (e.target as HTMLElement).parentElement!.querySelector('am-dialog')!;
        (dialog as any).open = true;
      }}>Open Medium Dialog</am-button>
      <am-dialog label="Medium dialog" size="md">
        <p>This is a medium-sized dialog.</p>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <am-button variant="ghost">Close</am-button>
        </div>
      </am-dialog>
    </div>
  `,
};
