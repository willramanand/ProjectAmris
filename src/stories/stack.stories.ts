import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/stack/stack.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Layout/Stack',
  component: 'am-stack',
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between'] },
    gap: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj;

export const Vertical: Story = {
  render: () => html`
    <am-stack gap="3">
      <am-button>First</am-button>
      <am-button variant="outlined">Second</am-button>
      <am-button variant="ghost">Third</am-button>
    </am-stack>
  `,
};

export const Horizontal: Story = {
  render: () => html`
    <am-stack direction="horizontal" gap="3" align="center">
      <am-button>First</am-button>
      <am-button variant="outlined">Second</am-button>
      <am-button variant="ghost">Third</am-button>
    </am-stack>
  `,
};
