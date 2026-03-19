import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/button-group/button-group.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Actions/ButtonGroup',
  component: 'am-button-group',
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};
export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  render: () => html`
    <am-button-group>
      <am-button variant="outlined">Left</am-button>
      <am-button variant="outlined">Center</am-button>
      <am-button variant="outlined">Right</am-button>
    </am-button-group>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <am-button-group orientation="vertical">
      <am-button variant="outlined">Top</am-button>
      <am-button variant="outlined">Middle</am-button>
      <am-button variant="outlined">Bottom</am-button>
    </am-button-group>
  `,
};
