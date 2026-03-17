import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export interface DataGridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'start' | 'center' | 'end';
}

export type SortDirection = 'asc' | 'desc' | 'none';

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

  @state() private _sortKey = '';
  @state() private _sortDir: SortDirection = 'none';
  @state() private _selectedIndices = new Set<number>();

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
        text-align: left;
        font-weight: var(--am-weight-semibold);
        font-size: var(--am-text-xs);
        color: var(--am-text-secondary);
        border-bottom: 1px solid var(--am-border);
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        user-select: none;
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
        margin-left: 0.25rem;
      }

      td {
        padding: var(--am-space-3) var(--am-space-4);
        border-bottom: 1px solid var(--am-border-subtle);
      }

      :host([compact]) td { padding: var(--am-space-2) var(--am-space-3); }

      :host([striped]) tbody tr:nth-child(even) { background: var(--am-surface-sunken); }
      :host([hoverable]) tbody tr:hover { background: var(--am-hover-overlay); }

      tr.selected { background: var(--am-primary-subtle) !important; }

      :host([selectable]) tbody tr { cursor: pointer; }

      .checkbox-cell { width: 2.5rem; text-align: center; }

      input[type='checkbox'] {
        accent-color: var(--am-primary);
        cursor: pointer;
      }

      .align-center { text-align: center; }
      .align-end { text-align: end; }

      @media (prefers-reduced-motion: reduce) {
        th.sortable { transition: none; }
      }
    `,
  ];

  private get _sortedRows(): Record<string, unknown>[] {
    if (this._sortKey && this._sortDir !== 'none') {
      const key = this._sortKey;
      const dir = this._sortDir === 'asc' ? 1 : -1;
      return [...this.rows].sort((a, b) => {
        const av = String(a[key] ?? '');
        const bv = String(b[key] ?? '');
        return av.localeCompare(bv, undefined, { numeric: true }) * dir;
      });
    }
    return this.rows;
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

  private _handleRowClick(index: number) {
    if (!this.selectable) return;

    const newSet = new Set(this._selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    this._selectedIndices = newSet;

    this.dispatchEvent(new CustomEvent('am-row-select', {
      detail: { row: this.rows[index], index },
      bubbles: true, composed: true,
    }));
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
    const rows = this._sortedRows;

    return html`
      <table part="table">
        <thead part="header">
          <tr>
            ${this.selectable ? html`<th class="checkbox-cell"></th>` : nothing}
            ${this.columns.map(col => html`
              <th part="header-cell"
                class="${col.sortable ? 'sortable' : ''} ${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}"
                style=${col.width ? `width: ${col.width}` : ''}
                @click=${() => this._handleSort(col)}>
                ${col.label}${this._renderSortIcon(col)}
              </th>
            `)}
          </tr>
        </thead>
        <tbody part="body">
          ${rows.map((row) => {
            const originalIndex = this.rows.indexOf(row);
            const selected = this._selectedIndices.has(originalIndex);
            return html`
              <tr part="row" class=${selected ? 'selected' : ''}
                @click=${() => this._handleRowClick(originalIndex)}>
                ${this.selectable ? html`<td class="checkbox-cell">
                  <input type="checkbox" .checked=${selected} tabindex="-1" aria-label="Select row" />
                </td>` : nothing}
                ${this.columns.map(col => html`
                  <td part="cell" class=${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}>
                    ${row[col.key] ?? ''}
                  </td>
                `)}
              </tr>
            `;
          })}
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
