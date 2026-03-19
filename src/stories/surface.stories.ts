import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/surface/surface.js';

const meta: Meta = {
  title: 'Foundation/Surface',
  component: 'am-surface',
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'raised', 'sunken'] },
  },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { variant: 'default', bordered: false, flush: false },
  render: (args) => html`
    <am-surface variant=${args.variant} ?bordered=${args.bordered} ?flush=${args.flush}>
      <p>Surface content goes here.</p>
    </am-surface>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <am-surface variant="default" bordered style="width: 200px;">
        <strong>Default</strong><p>Standard surface.</p>
      </am-surface>
      <am-surface variant="raised" bordered style="width: 200px;">
        <strong>Raised</strong><p>Elevated with shadow.</p>
      </am-surface>
      <am-surface variant="sunken" bordered style="width: 200px;">
        <strong>Sunken</strong><p>Recessed surface.</p>
      </am-surface>
    </div>
  `,
};
