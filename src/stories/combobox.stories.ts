import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/combobox/combobox.js';

const meta: Meta = {
  title: 'Form/Combobox',
  component: 'am-combobox',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj;

const countries = ['Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Cuba', 'Cyprus', 'Czechia'];

export const Default: Story = {
  args: { label: 'Country', size: 'md', disabled: false },
  render: (args) => html`
    <am-combobox label=${args.label} size=${args.size} ?disabled=${args.disabled} .options=${countries} style="max-width: 320px;"></am-combobox>
  `,
};
