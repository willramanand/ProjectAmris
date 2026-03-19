import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/data-grid/data-grid.js';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', sortable: true },
];

const rows = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { name: 'Charlie Brown', email: 'charlie@example.com', role: 'Manager' },
  { name: 'Diana Prince', email: 'diana@example.com', role: 'Engineer' },
];

const meta: Meta = {
  title: 'Data Display/DataGrid',
  component: 'am-data-grid',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { striped: false, hoverable: true, bordered: true, compact: false },
  render: (args) => html`
    <am-data-grid
      .columns=${columns}
      .rows=${rows}
      ?striped=${args.striped}
      ?hoverable=${args.hoverable}
      ?bordered=${args.bordered}
      ?compact=${args.compact}
    ></am-data-grid>
  `,
};

export const StripedCompact: Story = {
  render: () => html`
    <am-data-grid .columns=${columns} .rows=${rows} striped compact></am-data-grid>
  `,
};
