import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../components/timeline/timeline.js';

const meta: Meta = {
  title: 'Data Display/Timeline',
  component: 'am-timeline',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <am-timeline>
      <am-timeline-item variant="success">
        <span slot="heading">Deployed to production</span>
        <span slot="timestamp">2 hours ago</span>
        Build #1234 deployed successfully.
      </am-timeline-item>
      <am-timeline-item variant="primary">
        <span slot="heading">Pull request merged</span>
        <span slot="timestamp">4 hours ago</span>
        PR #567 was merged into main.
      </am-timeline-item>
      <am-timeline-item variant="warning">
        <span slot="heading">CI pipeline warning</span>
        <span slot="timestamp">6 hours ago</span>
        Flaky test detected in suite B.
      </am-timeline-item>
      <am-timeline-item variant="neutral">
        <span slot="heading">Branch created</span>
        <span slot="timestamp">Yesterday</span>
        Feature branch feature/auth created.
      </am-timeline-item>
    </am-timeline>
  `,
};
