import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/empty-state/empty-state.js';
import '../components/button/button.js';

const meta: Meta = {
  title: 'Data Display/EmptyState',
  component: 'am-empty-state',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-empty-state>
      <svg slot="icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span slot="heading">No results found</span>
      Try adjusting your search or filter criteria.
      <am-button slot="action" variant="outlined" size="sm">Clear filters</am-button>
    </am-empty-state>
  `,
};
