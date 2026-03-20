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

export const Async: Story = {
  args: { label: 'Search users', placeholder: 'Type a name...', size: 'md' },
  render: (args) => {
    const allUsers = ['Alice', 'Alicia', 'Bob', 'Bobby', 'Charlie', 'Charlotte', 'Dave', 'Diana'];
    const handleSearch = (e: CustomEvent) => {
      const cb = (e.target as HTMLElement).closest('am-combobox') as any;
      cb.loading = true;
      // Simulate async fetch
      setTimeout(() => {
        const q = e.detail.query.toLowerCase();
        cb.options = allUsers.filter(u => u.toLowerCase().includes(q));
        cb.loading = false;
      }, 400);
    };
    return html`
      <am-combobox async label=${args.label} placeholder=${args.placeholder} size=${args.size}
        @am-search=${handleSearch} style="max-width: 320px;"></am-combobox>
    `;
  },
};
