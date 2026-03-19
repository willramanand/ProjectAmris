import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/grid/grid.js';
import '../components/card/card.js';

const meta: Meta = {
  title: 'Layout/Grid',
  component: 'am-grid',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const FixedColumns: Story = {
  render: () => html`
    <am-grid columns="3" gap="4">
      <am-card bordered><p>Card A</p></am-card>
      <am-card bordered><p>Card B</p></am-card>
      <am-card bordered><p>Card C</p></am-card>
      <am-card bordered><p>Card D</p></am-card>
      <am-card bordered><p>Card E</p></am-card>
      <am-card bordered><p>Card F</p></am-card>
    </am-grid>
  `,
};

export const AutoFill: Story = {
  render: () => html`
    <am-grid gap="4" style="--am-grid-min: 16rem;">
      <am-card bordered><p>Auto-fill A</p></am-card>
      <am-card bordered><p>Auto-fill B</p></am-card>
      <am-card bordered><p>Auto-fill C</p></am-card>
      <am-card bordered><p>Auto-fill D</p></am-card>
    </am-grid>
  `,
};
