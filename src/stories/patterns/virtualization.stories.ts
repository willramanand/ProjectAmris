import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
// Real shipped components exercised by this pattern (also globally registered
// via .storybook/preview.ts -> src/index.all.js). Imported explicitly so the
// example stands on its own and typechecks against the as-built public API.
import '../../components/data-grid/data-grid.js';
import type { DataGridColumn } from '../../components/data-grid/data-grid.js';

/**
 * Patterns / Virtualization
 *
 * A cross-cutting DOCS-03 example for the list-virtualization pattern
 * (PERF-02 / PERF-03). It demonstrates the shipped public behavior only:
 *
 * - `am-data-grid` auto-virtualizes once `rows.length` exceeds ~100 rows
 *   (VIRTUALIZE_ROW_THRESHOLD, D-05). There is NO public attribute to toggle
 *   it — the switch is purely row-count driven, keeping the v1.0 surface
 *   frozen. Below the threshold the plain `<table>` render path stands.
 * - ARIA stays truthful from state (aria-rowcount reflects the full total)
 *   across both render paths.
 *
 * Accessibility note (documented limitation): under virtualization, rows
 * scrolled far out of view are recycled out of the DOM, so on mobile
 * screen readers that walk the DOM (rather than following programmatic
 * focus) those rows are not perceivable until scrolled into range.
 *
 * All cell text flows through Lit `${}` bindings — no raw-HTML sink
 * (threat T-05-03) — and only public component APIs are used (T-05-04).
 */
const columns: DataGridColumn[] = [
  { key: 'id', label: '#', sortable: true, type: 'number' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', sortable: true },
];

const ROLES = ['Engineer', 'Designer', 'Manager', 'Analyst', 'Support'] as const;

/** Deterministically generate `count` rows so the demo is stable across renders. */
function makeRows(count: number): Record<string, unknown>[] {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    email: `person${i + 1}@example.com`,
    role: ROLES[i % ROLES.length],
  }));
}

const meta: Meta = {
  title: 'Patterns/Virtualization',
  component: 'am-data-grid',
  parameters: {
    docs: {
      description: {
        component:
          'Runnable virtualization pattern (DOCS-03). Drive the rowCount ' +
          'control across the ~100-row auto-threshold up to 1000+ to watch ' +
          'am-data-grid switch to the windowed render path live (D-05).',
      },
    },
  },
  argTypes: {
    rowCount: {
      control: { type: 'range', min: 0, max: 2000, step: 10 },
      description:
        'Number of generated rows. Crossing ~100 (VIRTUALIZE_ROW_THRESHOLD) ' +
        'auto-switches am-data-grid to the virtualized windowed render path — ' +
        'no public attribute involved (D-05).',
    },
    striped: { control: 'boolean' },
    compact: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj;

/**
 * Live virtualization example. Drag the `rowCount` control: below ~100 rows
 * the plain table renders; above it (up to 1000+) am-data-grid virtualizes and
 * scrolls smoothly. aria-rowcount always reports the full total.
 */
export const RowCountThreshold: Story = {
  args: { rowCount: 1000, striped: true, compact: true },
  render: (args) => html`
    <div style="max-width: 720px;">
      <p style="margin: 0 0 8px; font: 13px/1.4 system-ui, sans-serif; color: var(--am-color-text-muted, #666);">
        Rendering <strong>${Math.max(0, Math.floor(args.rowCount))}</strong> rows —
        ${args.rowCount > 100 ? 'virtualized windowed path' : 'plain table path'}
        (auto-switch at ~100 rows, D-05).
      </p>
      <div style="height: 420px;">
        <am-data-grid
          .columns=${columns}
          .rows=${makeRows(args.rowCount)}
          ?striped=${args.striped}
          ?compact=${args.compact}
        ></am-data-grid>
      </div>
    </div>
  `,
};

/**
 * Baseline below the threshold — the non-virtualized `<table>` render path so
 * the two behaviors can be compared side by side.
 */
export const BelowThreshold: Story = {
  args: { rowCount: 25, striped: false, compact: false },
  render: (args) => html`
    <div style="max-width: 720px;">
      <am-data-grid
        .columns=${columns}
        .rows=${makeRows(args.rowCount)}
        ?striped=${args.striped}
        ?compact=${args.compact}
      ></am-data-grid>
    </div>
  `,
};
