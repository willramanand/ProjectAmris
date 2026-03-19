import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/slider/slider.js';

const meta: Meta = {
  title: 'Form/Slider',
  component: 'am-slider',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 50, min: 0, max: 100, step: 1, disabled: false },
  render: (args) => html`
    <am-slider value=${args.value} min=${args.min} max=${args.max} step=${args.step} ?disabled=${args.disabled} style="max-width: 320px;"></am-slider>
  `,
};

export const WithLabel: Story = {
  render: () => html`
    <am-slider label="Volume" value="75" style="max-width: 320px;"></am-slider>
  `,
};

export const Stepped: Story = {
  render: () => html`
    <am-slider value="30" min="0" max="100" step="10" label="Brightness" style="max-width: 320px;"></am-slider>
  `,
};
