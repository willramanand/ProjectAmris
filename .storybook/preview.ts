import type { Preview } from '@storybook/web-components';
import { setCustomElementsManifest } from '@storybook/web-components';
import { html } from 'lit';
import customElementsManifest from '../dist/custom-elements.json';

// Register all components so they're available in every story
import '../src/index.all.js';

// Feed the Custom Elements Manifest into Storybook so it can
// auto-generate arg tables (properties, slots, events, CSS parts/props)
// from your JSDoc comments.
setCustomElementsManifest(customElementsManifest);

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
  decorators: [
    (story) => html`<am-theme-provider theme="light">${story()}</am-theme-provider>`,
  ],
};

export default preview;
