import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/tree-view/tree-view.js';

const meta: Meta = {
  title: 'Advanced/TreeView',
  component: 'am-tree-view',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-tree-view style="max-width: 300px;">
      <am-tree-item label="Documents" value="docs" open>
        <am-tree-item label="README.md" value="readme" leaf></am-tree-item>
        <am-tree-item label="LICENSE" value="license" leaf></am-tree-item>
        <am-tree-item label="src" value="src">
          <am-tree-item label="index.ts" value="index" leaf></am-tree-item>
          <am-tree-item label="components" value="components">
            <am-tree-item label="button.ts" value="button" leaf></am-tree-item>
            <am-tree-item label="input.ts" value="input" leaf></am-tree-item>
          </am-tree-item>
        </am-tree-item>
      </am-tree-item>
      <am-tree-item label="package.json" value="pkg" leaf></am-tree-item>
    </am-tree-view>
  `,
};
