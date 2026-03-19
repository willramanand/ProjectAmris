import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/file-upload/file-upload.js';

const meta: Meta = {
  title: 'Advanced/FileUpload',
  component: 'am-file-upload',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { multiple: true, disabled: false },
  render: (args) => html`
    <am-file-upload accept=".jpg,.png,.pdf" ?multiple=${args.multiple} ?disabled=${args.disabled} style="max-width: 500px;"></am-file-upload>
  `,
};

export const SingleFile: Story = {
  render: () => html`
    <am-file-upload accept=".pdf" max-size="5242880" style="max-width: 500px;"></am-file-upload>
  `,
};
