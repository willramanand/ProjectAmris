import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/list/list.js';
import '../components/avatar/avatar.js';
import '../components/badge/badge.js';

const meta: Meta = {
  title: 'Data Display/List',
  component: 'am-list',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-list style="max-width: 400px;">
      <am-list-item interactive>
        <am-avatar slot="prefix" initials="JD" size="sm"></am-avatar>
        Jane Doe
        <span slot="description">jane@example.com</span>
        <am-badge slot="suffix" variant="success" size="sm">Active</am-badge>
      </am-list-item>
      <am-list-item interactive>
        <am-avatar slot="prefix" initials="AB" size="sm"></am-avatar>
        Alice Brown
        <span slot="description">alice@example.com</span>
        <am-badge slot="suffix" variant="neutral" size="sm">Pending</am-badge>
      </am-list-item>
      <am-list-item disabled>
        <am-avatar slot="prefix" initials="BS" size="sm"></am-avatar>
        Bob Smith
        <span slot="description">bob@example.com</span>
        <am-badge slot="suffix" variant="danger" size="sm">Inactive</am-badge>
      </am-list-item>
    </am-list>
  `,
};
