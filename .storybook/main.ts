import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|js)'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  docs: {},
};

export default config;
