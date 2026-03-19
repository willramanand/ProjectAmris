import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/tabs/tabs.js';

const meta: Meta = {
  title: 'Navigation/Tabs',
  component: 'am-tabs',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['underline', 'pill', 'vertical'] },
  },
};
export default meta;
type Story = StoryObj;

export const Underline: Story = {
  render: () => html`
    <am-tabs active-panel="one">
      <am-tab slot="nav" panel="one">Tab 1</am-tab>
      <am-tab slot="nav" panel="two">Tab 2</am-tab>
      <am-tab slot="nav" panel="three">Tab 3</am-tab>
      <am-tab-panel name="one">Content for tab 1</am-tab-panel>
      <am-tab-panel name="two">Content for tab 2</am-tab-panel>
      <am-tab-panel name="three">Content for tab 3</am-tab-panel>
    </am-tabs>
  `,
};

export const Pill: Story = {
  render: () => html`
    <am-tabs variant="pill" active-panel="one">
      <am-tab slot="nav" panel="one">Tab 1</am-tab>
      <am-tab slot="nav" panel="two">Tab 2</am-tab>
      <am-tab slot="nav" panel="three">Tab 3</am-tab>
      <am-tab-panel name="one">Pill content 1</am-tab-panel>
      <am-tab-panel name="two">Pill content 2</am-tab-panel>
      <am-tab-panel name="three">Pill content 3</am-tab-panel>
    </am-tabs>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <am-tabs variant="vertical" active-panel="one">
      <am-tab slot="nav" panel="one">Overview</am-tab>
      <am-tab slot="nav" panel="two">Settings</am-tab>
      <am-tab slot="nav" panel="three">Billing</am-tab>
      <am-tab-panel name="one">Overview content</am-tab-panel>
      <am-tab-panel name="two">Settings content</am-tab-panel>
      <am-tab-panel name="three">Billing content</am-tab-panel>
    </am-tabs>
  `,
};
