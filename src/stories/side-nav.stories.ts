import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/side-nav/side-nav.js';

const meta: Meta = {
  title: 'Navigation/SideNav',
  component: 'am-side-nav',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-side-nav style="width: 240px;">
      <am-side-nav-item href="#" active>Dashboard</am-side-nav-item>
      <am-side-nav-item href="#">Projects</am-side-nav-item>
      <am-side-nav-item href="#">Team</am-side-nav-item>
      <am-side-nav-item href="#">Settings</am-side-nav-item>
      <am-side-nav-item href="#" disabled>Archived</am-side-nav-item>
    </am-side-nav>
  `,
};
