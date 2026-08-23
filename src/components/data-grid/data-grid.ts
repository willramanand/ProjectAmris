import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { resetStyles } from '../../styles/reset.css.js';
import {
  VIRTUALIZE_ROW_THRESHOLD,
  ariaRowindex,
  scrollVirtualizerToIndex,
} from '../../internal/helpers/virtualize-support.js';
import { loadVirtualizer, prefetchVirtualizer } from '../../internal/helpers/lazy-load.js';
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
 * The `@lit-labs/virtualizer` `virtualize()` directive, referenced by type only
 * (dynamic-`import()` type — no static runtime import) and resolved lazily at
 * runtime via {@link loadVirtualizer} so the virtualizer chunk stays off the
 * grid's synchronous graph (SIZE-02).
 */
type VirtualizeDirective = (typeof import('@lit-labs/virtualizer/virtualize.js'))['virtualize'];

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
 * @fires am-change - Fires when the selection changes with the aggregate selection set in { keys } detail
 *
 * ## Virtualization (PERF-02, internal-only — D-05)
 *
 * Once `rows.length` exceeds {@link VIRTUALIZE_ROW_THRESHOLD} the grid
 * automatically swaps its `<table>`/`repeat()` rendering for a DIV-based grid
 * (`role="grid"`/`"rowgroup"`/`"row"`/`"gridcell"`/`"columnheader"`) driven by the
 * `@lit-labs/virtualizer` `virtualize()` directive, so only a windowed subset of
 * rows is mounted. This adds NO public attribute — the switch is threshold-gated
 * and freeze-neutral. At or below the threshold the existing `<table>` path is
 * unchanged. `aria-rowcount` reflects the full total from state and each row
 * carries a truthful `aria-rowindex` computed from its absolute index; selection,
 * sort, and focus are identity-keyed via `getRowId` so they survive row
 * recycling.
 *
 * NOTE (accessibility limitation, documented — not worked around): under
 * virtualization, rows scrolled far out of view are recycled out of the DOM, so
 * on some MOBILE screen readers (which navigate the rendered accessibility tree
 * rather than following programmatic focus) those rows are not perceivable until
 * scrolled back into range. This is an inherent trade-off of windowed rendering
 * and the same limitation `aria-activedescendant`-based virtualized widgets have
 * on mobile AT; desktop AT that follows the roving `tabindex`/focus used here is
 * unaffected because keyboard navigation scrolls a target row into the DOM before
 * moving focus to it.
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
   * Controlled selection. When provided, the grid emits `am-change`
   * but does not mutate internal selection state — caller must update this prop.
   */
  @property({ attribute: false }) selectedKeys: ReadonlyArray<RowKey> | null = null;

  @state() private _sortKey = '';
  @state() private _sortDir: SortDirection = 'none';
  @state() private _internalSelected = new Set<RowKey>();
  @state() private _focusedRowIndex = 0;

  /** Scroll container that hosts the virtualize() directive (virtual path only). */
  @query('.grid-body') private _gridBody!: HTMLElement | null;

  /** The lazily-loaded `virtualize()` directive; undefined until the chunk resolves (D-05). */
  private _virtualize?: VirtualizeDirective;

  /** rAF handle for the deferred virtualizer warm; 0 when none is scheduled. */
  private _virtualizerRaf = 0;

  /** True once the row count crosses the auto-virtualization threshold (D-05). */
  private get _isVirtual(): boolean {
    return this.rows.length > VIRTUALIZE_ROW_THRESHOLD;
  }

  /**
   * SIZE-05: warm the virtualizer chunk OFF the first-paint path. The virtualizer
   * load is non-critical init — until it resolves the grid renders a fully
   * functional unwindowed `repeat()` body (D-05, the cold-chunk / fetch-failure
   * fallback) — so it is scheduled AFTER first paint via a DOUBLE
   * `requestAnimationFrame` (the second callback runs once the first frame has
   * painted). The idle-callback scheduling API is intentionally NOT used: it is
   * unsupported at the Safari 16.4 browser floor (D-09). On resolve we assign
   * `_virtualize` and `requestUpdate()` so the next render swaps to the windowed
   * `virtualize()` path; `aria-rowindex` is absolute-index based in both paths, so the swap is
   * behavior-preserving. The pending rAF is cancelled on disconnect and the async
   * resolve is guarded on `isConnected`, so a disconnect before the callback fires
   * neither double-runs the load nor leaks a scheduled frame.
   */
  private _scheduleVirtualizerWarm(): void {
    if (this._virtualize || this._virtualizerRaf) return;
    this._virtualizerRaf = requestAnimationFrame(() => {
      this._virtualizerRaf = requestAnimationFrame(() => {
        this._virtualizerRaf = 0;
        if (!this.isConnected) return;
        prefetchVirtualizer();
        loadVirtualizer().then((m) => {
          if (!this.isConnected) return;
          this._virtualize = m.virtualize;
          this.requestUpdate();
        });
      });
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // SIZE-05 teardown: cancel a pending virtualizer-warm rAF so a disconnect
    // before it fires neither double-runs the load nor leaks a scheduled frame.
    if (this._virtualizerRaf) {
      cancelAnimationFrame(this._virtualizerRaf);
      this._virtualizerRaf = 0;
    }
  }

  updated() {
    if (this._isVirtual) this._scheduleVirtualizerWarm();
  }

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

      /* ---- Virtualized DIV-grid path (PERF-02, above threshold) ---- */
      /* A native <table> cannot be virtualized: the virtualizer positions its
         children via transforms, which collapses table-row layout (Pitfall 1).
         Above the threshold we render a div-grid with explicit column tracks so
         header and body columns stay aligned. */
      .grid {
        display: block;
        width: 100%;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      :host([compact]) .grid { font-size: var(--am-text-xs); }

      /* Both header and body reserve the scrollbar gutter so their column
         tracks resolve against the SAME content width and stay aligned even
         when the body shows a vertical scrollbar. overflow != visible makes the
         header a (never-scrolling) scroll container, so scrollbar-gutter takes
         effect there too. */
      .grid-header {
        display: block;
        overflow-y: hidden;
        scrollbar-gutter: stable;
      }

      .grid-body {
        display: block;
        max-height: var(--am-data-grid-viewport, 480px);
        overflow-y: auto;
        scrollbar-gutter: stable;
      }

      .grid-row {
        /* The flow-layout virtualizer positions body rows absolutely, which
           would otherwise shrink them to content width — force full width so the
           grid tracks span the container and columns line up with the header. */
        width: 100%;
        display: grid;
        align-items: center;
        box-sizing: border-box;
      }

      .grid-row.header-row {
        border-bottom: 1px solid var(--am-border);
      }

      .grid-cell {
        padding: var(--am-space-3) var(--am-space-4);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      :host([compact]) .grid-cell { padding: var(--am-space-2) var(--am-space-3); }

      .grid-header-cell {
        padding: var(--am-space-3) var(--am-space-4);
        text-align: start;
        font-weight: var(--am-weight-semibold);
        font-size: var(--am-text-xs);
        color: var(--am-text-secondary);
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        user-select: none;
        min-width: 0;
      }

      :host([compact]) .grid-header-cell { padding: var(--am-space-2) var(--am-space-3); }

      .grid-header-cell.sortable {
        cursor: pointer;
        transition: color var(--am-duration-fast) var(--am-ease-default);
      }

      .grid-header-cell.sortable:hover { color: var(--am-text); }

      .grid-body .grid-row {
        border-bottom: 1px solid var(--am-border-subtle);
      }

      :host([striped]) .grid-body .grid-row:nth-child(even) { background: var(--am-surface-sunken); }
      :host([hoverable]) .grid-body .grid-row:hover { background: var(--am-hover-overlay); }

      .grid-body .grid-row.selected { background: var(--am-primary-subtle) !important; }

      .grid-body .grid-row:focus-visible {
        outline: 2px solid var(--am-focus-ring, var(--am-primary));
        outline-offset: -2px;
      }

      :host([selectable]) .grid-body .grid-row { cursor: pointer; }

      @media (prefers-reduced-motion: reduce) {
        th.sortable,
        .grid-header-cell.sortable { transition: none; }
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
    // Unsorted fast-path: return this.rows by the SAME reference so downstream
    // identity checks are unaffected (RPERF-01 must_have).
    if (!this._sortKey || this._sortDir === 'none') return this.rows;
    return this._computeSortedRows();
  }

  /**
   * The sort compute, moved out of the `_sortedRows` getter into a nameable
   * method so the perf harness can prototype-wrap it for a deterministic
   * `sortComputes` count (RESEARCH F-1). Body is the former getter body
   * verbatim — same column lookup + stable `[...].sort(cmp * dir)`, so the sort
   * semantics stay byte-identical to the un-memoized getter.
   */
  private _computeSortedRows(): Record<string, unknown>[] {
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

  private _toggleRow(_row: Record<string, unknown>, id: RowKey, _originalIndex: number) {
    if (!this.selectable) return;

    const current = this._selectionSet;
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    if (this.selectedKeys === null) {
      this._internalSelected = next;
    }

    this.dispatchEvent(new CustomEvent('am-change', {
      detail: { keys: [...next] },
      bubbles: true, composed: true,
    }));
  }

  private _focusRowAt(index: number) {
    if (this._isVirtual) {
      // Virtual path: the target row may be recycled out of the DOM. Scroll it
      // into the window FIRST, then focus it once it mounts (never move focus to
      // an unmounted row — preserves FIX-03).
      const total = this._sortedRows.length;
      const clamped = Math.max(0, Math.min(index, total - 1));
      this._focusedRowIndex = clamped;
      scrollVirtualizerToIndex(this._gridBody, clamped);
      requestAnimationFrame(() => {
        const body = this._gridBody;
        const rowEl = body?.querySelector<HTMLElement>(`[data-sorted-index="${clamped}"]`);
        rowEl?.focus();
      });
      return;
    }

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
    // D-05: auto-activate virtualization above the threshold with a div-grid
    // path (Pitfall 1). At/below it, the existing <table> path is unchanged.
    return this._isVirtual ? this._renderVirtual() : this._renderTable();
  }

  /** Column-track template shared by the virtual header row and data rows so
   * their columns stay aligned. Uses each column's explicit width when given,
   * else an even `minmax(0, 1fr)` track; a fixed leading track for the
   * selection checkbox when selectable. */
  private _gridTemplateColumns(): string {
    const tracks: string[] = [];
    if (this.selectable) tracks.push('2.5rem');
    for (const col of this.columns) tracks.push(col.width ?? 'minmax(0, 1fr)');
    return tracks.join(' ');
  }

  private _renderVirtual() {
    const sorted = this._sortedRows;
    const selection = this._selectionSet;
    const template = this._gridTemplateColumns();

    // Pre-compute id + original index per row in O(n) (state, not DOM — Pitfall 2).
    const indexById = new Map<Record<string, unknown>, number>();
    this.rows.forEach((row, i) => indexById.set(row, i));

    // keyFunction/renderItem are shared verbatim by the windowed virtualize()
    // path and the cold-chunk repeat() fallback so the rendered rows are
    // byte-identical across the swap (D-05).
    const keyFunction = (row: Record<string, unknown>) =>
      this.getRowId(row, indexById.get(row) ?? 0);
    const renderItem = (row: Record<string, unknown>, absIndex: number) => {
      const originalIndex = indexById.get(row) ?? absIndex;
      const id = this.getRowId(row, originalIndex);
      const selected = selection.has(id);
      const focused = absIndex === this._focusedRowIndex;
      return html`
        <div part="row"
          class="grid-row ${selected ? 'selected' : ''}"
          role="row"
          data-sorted-index=${absIndex}
          aria-rowindex=${ariaRowindex(absIndex)}
          tabindex=${focused ? '0' : '-1'}
          aria-selected=${this.selectable ? (selected ? 'true' : 'false') : nothing}
          style=${styleMap({ 'grid-template-columns': template })}
          @click=${() => this._toggleRow(row, id, originalIndex)}
          @focus=${() => { this._focusedRowIndex = absIndex; }}
          @keydown=${(e: KeyboardEvent) => this._handleRowKeydown(e, row, id, originalIndex, absIndex, sorted.length)}>
          ${this.selectable ? html`<div class="grid-cell checkbox-cell" role="gridcell">
            <am-checkbox .checked=${selected} aria-label="Select row"></am-checkbox>
          </div>` : nothing}
          ${this.columns.map(col => html`
            <div part="cell" role="gridcell"
              class="grid-cell ${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}">
              ${row[col.key] ?? ''}
            </div>
          `)}
        </div>
      `;
    };

    return html`
      <div class="grid" part="table" role="grid"
        aria-rowcount=${this.rows.length}
        aria-colcount=${this.columns.length + (this.selectable ? 1 : 0)}
        aria-multiselectable=${this.selectable ? 'true' : 'false'}>
        <div class="grid-header" part="header" role="rowgroup">
          <div class="grid-row header-row" role="row" aria-rowindex="1"
            style=${styleMap({ 'grid-template-columns': template })}>
            ${this.selectable ? html`<div class="grid-header-cell" role="columnheader" aria-label="Select"></div>` : nothing}
            ${this.columns.map(col => html`
              <div part="header-cell"
                role="columnheader"
                aria-sort=${this._ariaSortFor(col) ?? nothing}
                tabindex=${col.sortable ? '0' : nothing}
                class="grid-header-cell ${col.sortable ? 'sortable' : ''} ${col.align === 'center' ? 'align-center' : col.align === 'end' ? 'align-end' : ''}"
                @click=${() => this._handleSort(col)}
                @keydown=${(e: KeyboardEvent) => {
                  if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    this._handleSort(col);
                  }
                }}>
                ${col.label}${this._renderSortIcon(col)}
              </div>
            `)}
          </div>
        </div>
        <div class="grid-body" part="body" role="rowgroup">
          ${this._virtualize
            ? this._virtualize({ items: sorted, keyFunction, renderItem })
            : repeat(sorted, keyFunction, renderItem)}
        </div>
      </div>
    `;
  }

  private _renderTable() {
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
