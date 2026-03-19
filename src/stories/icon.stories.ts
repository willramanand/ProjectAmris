import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/icon/icon.js';

const meta: Meta = {
  title: 'Foundation/Icon',
  component: 'am-icon',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
};
export default meta;
type Story = StoryObj;

export const InlineSvg: Story = {
  render: () => html`
    <am-icon label="Checkmark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </am-icon>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      ${(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(
        (s) => html`
          <am-icon size=${s} label=${s}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </am-icon>
        `,
      )}
    </div>
  `,
};
