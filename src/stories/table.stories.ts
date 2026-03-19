import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/table/table.js';

const meta: Meta = {
  title: 'Data Display/Table',
  component: 'am-table',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { striped: false, hoverable: false, bordered: true, compact: false },
  render: (args) => html`
    <am-table ?striped=${args.striped} ?hoverable=${args.hoverable} ?bordered=${args.bordered} ?compact=${args.compact}>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Alice</td><td>Engineer</td><td>Active</td></tr>
          <tr><td>Bob</td><td>Designer</td><td>Active</td></tr>
          <tr><td>Charlie</td><td>Manager</td><td>Away</td></tr>
        </tbody>
      </table>
    </am-table>
  `,
};

export const StripedHoverable: Story = {
  render: () => html`
    <am-table striped hoverable>
      <table>
        <thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead>
        <tbody>
          <tr><td>Widget A</td><td>$12.99</td><td>142</td></tr>
          <tr><td>Widget B</td><td>$24.99</td><td>89</td></tr>
          <tr><td>Widget C</td><td>$9.99</td><td>0</td></tr>
          <tr><td>Widget D</td><td>$19.99</td><td>56</td></tr>
        </tbody>
      </table>
    </am-table>
  `,
};
