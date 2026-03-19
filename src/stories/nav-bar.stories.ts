import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/nav-bar/nav-bar.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Navigation/NavBar',
  component: 'am-nav-bar',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-nav-bar>
      <span slot="brand" style="font-weight: 600;">Amris</span>
      <a href="#">Home</a>
      <a href="#">Docs</a>
      <a href="#">Blog</a>
      <am-button slot="actions" size="sm">Sign in</am-button>
    </am-nav-bar>
  `,
};
