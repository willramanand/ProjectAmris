import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/stat/stat.js';

const meta: Meta = {
  title: 'Data Display/Stat',
  component: 'am-stat',
  tags: ['autodocs'],
  argTypes: {
    trend: { control: 'select', options: ['up', 'down', 'neutral'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { trend: 'up' },
  render: (args) => html`
    <am-stat trend=${args.trend}>
      <span slot="label">Revenue</span>
      $48,200
      <span slot="description">+12.5% from last month</span>
    </am-stat>
  `,
};

export const Dashboard: Story = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 600px;">
      <am-stat trend="up">
        <span slot="label">Revenue</span>
        $48,200
        <span slot="description">+12.5%</span>
      </am-stat>
      <am-stat trend="down">
        <span slot="label">Churn</span>
        2.4%
        <span slot="description">-0.3%</span>
      </am-stat>
      <am-stat trend="neutral">
        <span slot="label">Users</span>
        8,942
        <span slot="description">No change</span>
      </am-stat>
    </div>
  `,
};
