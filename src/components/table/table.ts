import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Table — a styled data table.
 *
 * Wraps a native `<table>` in shadow DOM styling. Place your
 * `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements in the
 * default slot.
 *
 * @slot - Native table content (thead, tbody, tr, th, td)
 * @csspart table - The table wrapper
 *
 * @cssprop --am-table-radius - Override border radius
 *
 * @example
 * ```html
 * <am-table striped>
 *   <table>
 *     <thead><tr><th>Name</th><th>Role</th></tr></thead>
 *     <tbody>
 *       <tr><td>Alice</td><td>Engineer</td></tr>
 *       <tr><td>Bob</td><td>Designer</td></tr>
 *     </tbody>
 *   </table>
 * </am-table>
 * ```
 */
@customElement('am-table')
export class AmTable extends LitElement {
  /** Whether to show striped rows. */
  @property({ type: Boolean, reflect: true }) striped = false;

  /** Whether to show hover highlighting on rows. */
  @property({ type: Boolean, reflect: true }) hoverable = false;

  /** Whether the table has a border. */
  @property({ type: Boolean, reflect: true }) bordered = true;

  /** Whether the table is compact. */
  @property({ type: Boolean, reflect: true }) compact = false;

  private _styleEl: HTMLStyleElement | null = null;
  private _scopeId = `am-t-${Math.random().toString(36).slice(2, 8)}`;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        overflow-x: auto;
        border-radius: var(--am-table-radius, var(--am-radius-xl));
        corner-shape: squircle;
      }

      :host([bordered]) {
        border: var(--am-border-1) solid var(--am-border);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.dataset.scope = this._scopeId;
    this._updateLightStyles();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._styleEl?.remove();
    this._styleEl = null;
  }

  updated() {
    this._updateLightStyles();
  }

  private _updateLightStyles() {
    if (!this._styleEl) {
      this._styleEl = document.createElement('style');
      this.prepend(this._styleEl);
    }

    const s = `[data-scope="${this._scopeId}"]`;
    const pad = this.compact ? '0.5rem 0.75rem' : '0.75rem 1rem';
    const fontSize = this.compact ? 'var(--am-text-xs)' : 'var(--am-text-sm)';

    let styles = `
${s} table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--am-font-sans);
  font-size: ${fontSize};
  color: var(--am-text);
}
${s} th {
  padding: ${pad};
  text-align: start;
  font-weight: var(--am-weight-semibold, 600);
  color: var(--am-text-secondary);
  border-bottom: 1px solid var(--am-border);
  white-space: nowrap;
  font-size: var(--am-text-xs);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
${s} td {
  padding: ${pad};
  border-bottom: 1px solid var(--am-border-subtle, var(--am-border));
}`;

    if (this.striped) {
      styles += `
${s} tbody tr:nth-child(even) {
  background: var(--am-surface-sunken);
}`;
    }

    if (this.hoverable) {
      styles += `
${s} tbody tr {
  transition: background var(--am-duration-fast) var(--am-ease-default);
}
${s} tbody tr:hover {
  background: var(--am-hover-overlay);
}
@media (prefers-reduced-motion: reduce) {
  ${s} tbody tr { transition: none; }
}`;
    }

    this._styleEl.textContent = styles;
  }

  render() {
    return html`<div part="table"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-table': AmTable;
  }
}
