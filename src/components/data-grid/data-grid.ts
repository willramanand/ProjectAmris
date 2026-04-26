import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { resetStyles } from '../../styles/reset.css.js';
import '../checkbox/checkbox.js';

export type DataGridColumnType = 'string' | 'number' | 'date' | 'boolean';

export interface DataGridColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'start' | 'center' | 'end';
  /** Cell value type for default sort comparator. Defaults to 'string'. */
  type?: DataGridColumnType;
  /** Custom comparator. Receives raw row objects so it can compare derived fields. */
  compare?: (a: T, b: T) => number;
}

export type SortDirection = 'asc' | 'desc' | 'none';

export type RowKey = string | number;
export type GetRowId<T = Record<string, unknown>> = (row: T, index: number) => RowKey;

const DEFAULT_GET_ROW_ID: GetRowId = (_row, index) => index;

/**
 * Data Grid — a property-driven data table with sorting and selection.
 *
 * Accepts `columns` and `rows` as properties for a fully declarative API.
 *
 * @csspart table - The table element
 * @csspart header - The thead element
 * @csspart body - The tbody element
 * @csspart row - Each tr element
 * @csspart cell - Each td element
 * @csspart header-cell - Each th element
 *
 * @fires am-sort - Fires when a column header is clicked with { key, direction } detail
 * @fires am-row-select - Fires when a row is selected with { row, index } detail
 *
 * @example
 * ```html
 * <am-data-grid
 *   .columns=${[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'role', label: 'Role', sortable: true }
 *   ]}
 *   .rows=${[
 *     { name: 'Alice', email: 'alice@example.com', role: 'Engineer' },
 *     { name: 'Bob', email: 'bob@example.com', role: 'Designer' }
 *   ]}
 *   selectable striped
 * ></am-data-grid>
 * ```
 */
@customElement('am-data-grid')
export class AmDataGrid extends LitElement {
  @property({ type: Array }) columns: DataGridColumn[] = [];
  @property({ type: Array }) rows: Record<string, unknown>[] = [];
  @property({ type: Boolean, reflect: true }) striped = false;
  @property({ type: Boolean, reflect: true }) hoverable = true;
  @property({ type: Boolean, reflect: true }) bordered = true;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean, reflect: true }) selectable = false;

  /** Returns a stable id for a row. Used as repeat() key and selection key. */
  @property({ attribute: false }) getRowId: GetRowId = DEFAULT_GET_ROW_ID;

  /**
   * Controlled selection. When provided, the grid emits `am-selection-change`
   * but does not mutate internal selection state — caller must update this prop.
   */
  @property({ attribute: false }) selectedKeys: ReadonlyArray<RowKey> | null = null;

  @state() private _sortKey = '';
  @state() private _sortDir: SortDirection = 'none';
  @state() private _internalSelected = new Set<RowKey>();
  @state() private _focusedRowIndex = 0;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        overflow-x: auto;
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
      }

      :host([bordered]) { border: var(--am-border-1) solid var(--am-border); }

      table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      :host([compact]) table { font-size: var(--am-text-xs); }

      th {
        padding: var(--am-space-3) var(--am-space-4);
        text-align: start;
        font-weight: var(--am-weight-semibold);
        font-size: var(--am-text-xs);
        color: var(--am-text-secondary);
        border-bottom: 1px solid var(--am-border);
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        user-select: none;
        width: var(--_col-width, auto);
      }

      :host([compact]) th { padding: var(--am-space-2) var(--am-space-3); }

      th.sortable {
        cursor: pointer;
        transition: color var(--am-duration-fast) var(--am-ease-default);
      }

      th.sortable:hover { color: var(--am-text); }

      .sort-icon {
        display: inline-block;
        width: 0.75rem;
        height: 0.75rem;
        vertical-align: -0.1em;
        margin-inline-start: 0.25rem;
      }

      td {
        padding: var(--am-space-3) var(--am-space-4);
        border-bottom: 1px solid var(--am-border-subtle);
      }

      :host([compact]) td { padding: var(--am-space-2) var(--am-space-3); }

      :host([striped]) tbody tr:nth-child(even) { background: var(--am-surface-sunken); }
      :host([hoverable]) tbody tr:hover { background: var(--am-hover-overlay); }

      tr.selected { background: var(--am-primary-subtle) !important; }

      tbody tr:focus-visible {
        outline: 2px solid var(--am-focus-ring, var(--am-primary));
        outline-offset: -2px;
      }

      :host([selectable]) tbody tr { cursor: pointer; }

      .checkbox-cell { width: 2.5rem; text-align: center; }

      am-checkbox {
        pointer-events: none;
      }

      .align-center { text-align: center; }
      .align-end { text-align: end; }

      @media (prefers-reduced-motion: reduce) {
        th.sortable { transition: none; }
      }
    `,
  ];

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('rows')) {
      const max = Math.max(0, this.rows.length - 1);
      if (this._focusedRowIndex > max) this._focusedRowIndex = max;
    }
  }

  private _comparatorFor(col: DataGridColumn): (a: Record<string, unknown>, b: Record<string, unknown>) => number {
    if (col.compare) return col.compare;
    const key = col.key;
    switch (col.type) {
      case 'number':
        return (a, b) => Number(a[key] ?? 0) - Number(b[key] ?? 0);
      case 'date':
        return (a, b) => {
          const av = a[key]; const bv = b[key];
          const ad = av instanceof Date ? av.getTime() : Date.parse(String(av ?? ''));
          const bd = bv instanceof Date ? bv.getTime() : Date.parse(String(bv ?? ''));
          return (Number.isNaN(ad) ? 0 : ad) - (Number.isNaN(bd) ? 0 : bd);
        };
      case 'boolean':
        return (a, b) => Number(Boolean(a[key])) - Number(Boolean(b[key]));
      default:
        return (a, b) => String(a[key] ?? '').localeCompare(
          String(b[key] ?? ''),
          undefined,
          { numeric: true },
        );
    }
  }

  private get _sortedRows(): Record<string, unknown>[] {
    if (!this._sortKey || this._sortDir === 'none') return this.rows;
    const col = this.columns.find(c => c.key === this._sortKey);
    if (!col) return this.rows;
    const dir = this._sortDir === 'asc' ? 1 : -1;
    const cmp = this._comparatorFor(col);
    return [...this.rows].sort((a, b) => cmp(a, b) * dir);
  }

  private get _selectionSet(): Set<RowKey> {
    return this.selectedKeys ? new Set(this.selectedKeys) : this._internalSelected;
  }

  private _handleSort(col: DataGridColumn) {
    if (!col.sortable) return;

    if (this._sortKey === col.key) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : this._sortDir === 'desc' ? 'none' : 'asc';
    } else {
      this._sortKey = col.key;
      this._sortDir = 'asc';
    }

    if (this._sortDir === 'none') this._sortKey = '';

    this.dispatchEvent(new CustomEvent('am-sort', {
      detail: { key: this._sortKey, direction: this._sortDir },
      bubbles: true, composed: true,
    }));
  }

  private _toggleRow(row: Record<string, unknown>, id: RowKey, originalIndex: number) {
    if (!this.selectable) return;

    const current = this._selectionSet;
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    if (this.selectedKeys === null) {
      this._internalSelected = next;
    }

    this.dispatchEvent(new CustomEvent('am-row-select', {
      detail: { row, index: originalIndex, id, selected: next.has(id), keys: [...next] },
      bubbles: true, composed: true,
    }));
    this.dispatchEvent(new CustomEvent('am-selection-change', {
      detail: { keys: [...next] },
      bubbles: true, composed: true,
    }));
  }

  private _focusRowAt(index: number) {
    const tbody = this.renderRoot.querySelector('tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll<HTMLTableRowElement>('tr');
    const clamped = Math.max(0, Math.min(index, rows.length - 1));
    this._focusedRowIndex = clamped;
    rows[clamped]?.focus();
  }

  private _handleRowKeydown(e: KeyboardEvent, row: Record<string, unknown>, id: RowKey, originalIndex: number, sortedIndex: number, total: number) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._focusedRowIndex = Math.min(sortedIndex + 1, total - 1);
        this.updateComplete.then(() => this._focusRowAt(this._focusedRowIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._focusedRowIndex = Math.max(sortedIndex - 1, 0);
        this.updateComplete.then(() => this._focusRowAt(this._focusedRowIndex));
        break;
      case 'Home':
        e.preventDefault();
        this._focusedRowIndex = 0;
        this.updateComplete.then(() => this._focusRowAt(0));
        break;
      case 'End':
        e.preventDefault();
        this._focusedRowIndex = total - 1;
        this.updateComplete.then(() => this._focusRowAt(total - 1));
        break;
      case ' ':
      case 'Enter':
        if (this.selectable) {
          e.preventDefault();
          this._toggleRow(row, id, originalIndex);
        }
        break;
    }
  }

  private _ariaSortFor(col: DataGridColumn): 'ascending' | 'descending' | 'none' | undefined {
    if (!col.sortable) return undefined;
    if (this._sortKey !== col.key) return 'none';
    if (this._sortDir === 'asc') return 'ascending';
    if (this._sortDir === 'desc') return 'descending';
    return 'none';
  }

  private _renderSortIcon(col: DataGridColumn) {
    if (!col.sortable) return nothing;
    if (this._sortKey !== col.key || this._sortDir === 'none') {
      // Both carets shown (unsorted)
      return html`<svg class="sort-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z"/></svg>`;
    }
    if (this._sortDir === 'asc') {
      // Up caret only
      return html`<svg class="sort-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"/></svg>`;
    }
    // Down caret only
    return html`<svg class="sort-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>`;
  }

  render() {
    const sorted = this._sortedRows;
    const selection = this._selectionSet;

    // Pre-compute id + original index per row in O(n).
    const indexById = new Map<Record<string, unknown>, number>();
    this.rows.forEach((row, i) => indexById.set(row, i));

    return html`
      <table part="table" role="grid"
        aria-rowcount=${this.rows.length}
        aria-colcount=${this.columns.length + (this.selectable ? 1 : 0)}
        aria-multiselectable=${this.selectable ? 'true' : 'false'}>
        <thead part="header">
          <tr role="row">
            ${this.selectable ? html`<th class="checkbox-cell" role="columnheader" aria-label="Select"></th>` : nothing}
            ${this.columns.map(col => html`
              <th part="header-cell"
                role="columnheader"
                aria-sort=${this._ariaSortFor(col) ?? nothing}
                tabindex=${col.sortable ? '0' : nothing}
                class="${col.sortable ? 'sortable' : ''} ${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}"
                style=${col.width ? styleMap({'--_col-width': col.width}) : ''}
                @click=${() => this._handleSort(col)}
                @keydown=${(e: KeyboardEvent) => {
                  if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    this._handleSort(col);
                  }
                }}>
                ${col.label}${this._renderSortIcon(col)}
              </th>
            `)}
          </tr>
        </thead>
        <tbody part="body">
          ${repeat(
            sorted,
            (row, i) => this.getRowId(row, indexById.get(row) ?? i),
            (row, i) => {
              const originalIndex = indexById.get(row) ?? i;
              const id = this.getRowId(row, originalIndex);
              const selected = selection.has(id);
              const focused = i === this._focusedRowIndex;
              return html`
                <tr part="row"
                  role="row"
                  tabindex=${focused ? '0' : '-1'}
                  aria-selected=${this.selectable ? (selected ? 'true' : 'false') : nothing}
                  class=${selected ? 'selected' : ''}
                  @click=${() => this._toggleRow(row, id, originalIndex)}
                  @focus=${() => { this._focusedRowIndex = i; }}
                  @keydown=${(e: KeyboardEvent) => this._handleRowKeydown(e, row, id, originalIndex, i, sorted.length)}>
                  ${this.selectable ? html`<td class="checkbox-cell" role="gridcell">
                    <am-checkbox .checked=${selected} aria-label="Select row"></am-checkbox>
                  </td>` : nothing}
                  ${this.columns.map(col => html`
                    <td part="cell" role="gridcell"
                      class=${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}>
                      ${row[col.key] ?? ''}
                    </td>
                  `)}
                </tr>
              `;
            },
          )}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-data-grid': AmDataGrid;
  }
}
