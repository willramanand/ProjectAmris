import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/pagination/pagination.js';

const meta: Meta = {
  title: 'Navigation/Pagination',
  component: 'am-pagination',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'simple'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { total: 20, page: 3, siblings: 1 },
  render: (args) => html`
    <am-pagination total=${args.total} page=${args.page} siblings=${args.siblings}></am-pagination>
  `,
};

export const Simple: Story = {
  render: () => html`
    <am-pagination total="50" page="10" variant="simple"></am-pagination>
  `,
};

export const FewPages: Story = {
  render: () => html`
    <am-pagination total="5" page="2"></am-pagination>
  `,
};
