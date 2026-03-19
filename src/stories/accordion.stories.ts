import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/accordion/accordion.js';

const meta: Meta = {
  title: 'Navigation/Accordion',
  component: 'am-accordion',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { single: false },
  render: (args) => html`
    <am-accordion ?single=${args.single}>
      <am-accordion-item open>
        <span slot="header">Section 1</span>
        Content for section 1. This section is open by default.
      </am-accordion-item>
      <am-accordion-item>
        <span slot="header">Section 2</span>
        Content for section 2.
      </am-accordion-item>
      <am-accordion-item>
        <span slot="header">Section 3</span>
        Content for section 3.
      </am-accordion-item>
    </am-accordion>
  `,
};

export const SingleExpand: Story = {
  render: () => html`
    <am-accordion single>
      <am-accordion-item open>
        <span slot="header">Only one open at a time</span>
        Opening another section closes this one.
      </am-accordion-item>
      <am-accordion-item>
        <span slot="header">Section B</span>
        Content B.
      </am-accordion-item>
      <am-accordion-item>
        <span slot="header">Section C</span>
        Content C.
      </am-accordion-item>
    </am-accordion>
  `,
};
