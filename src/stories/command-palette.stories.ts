import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/command-palette/command-palette.js';

const commands = [
  { id: '1', label: 'New file', shortcut: 'Ctrl+N', group: 'File' },
  { id: '2', label: 'Open file', shortcut: 'Ctrl+O', group: 'File' },
  { id: '3', label: 'Save', shortcut: 'Ctrl+S', group: 'File' },
  { id: '4', label: 'Toggle theme', group: 'Preferences' },
  { id: '5', label: 'Search', shortcut: 'Ctrl+F', group: 'Edit' },
  { id: '6', label: 'Replace', shortcut: 'Ctrl+H', group: 'Edit' },
];

const meta: Meta = {
  title: 'Overlays/CommandPalette',
  component: 'am-command-palette',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { open: true },
  render: (args) => html`
    <am-command-palette ?open=${args.open} .commands=${commands} placeholder="Search commands..."></am-command-palette>
  `,
};
