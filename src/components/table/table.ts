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

      ::slotted(table) {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      /* Header styling via CSS cascade */
      ::slotted(table) {
        --_cell-padding: var(--am-space-3) var(--am-space-4);
      }

      :host([compact]) ::slotted(table) {
        --_cell-padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-xs);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._applyTableStyles();
  }

  updated() {
    this._applyTableStyles();
  }

  private _applyTableStyles() {
    const table = this.querySelector('table');
    if (!table) return;

    // Apply styles to light DOM table elements via inline styles
    // since ::slotted only targets direct children and can't reach nested elements
    const headerPad = this.compact ? '0.5rem 0.75rem' : '0.75rem 1rem';
    const cellPad = this.compact ? '0.5rem 0.75rem' : '0.75rem 1rem';

    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontFamily = 'var(--am-font-sans)';
    table.style.fontSize = this.compact ? 'var(--am-text-xs)' : 'var(--am-text-sm)';
    table.style.color = 'var(--am-text)';

    table.querySelectorAll('th').forEach(th => {
      th.style.padding = headerPad;
      th.style.textAlign = 'left';
      th.style.fontWeight = 'var(--am-weight-semibold, 600)';
      th.style.color = 'var(--am-text-secondary)';
      th.style.borderBottom = '1px solid var(--am-border)';
      th.style.whiteSpace = 'nowrap';
      th.style.fontSize = this.compact ? 'var(--am-text-xs)' : 'var(--am-text-xs)';
      th.style.letterSpacing = '0.03em';
      th.style.textTransform = 'uppercase';
    });

    table.querySelectorAll('td').forEach(td => {
      td.style.padding = cellPad;
      td.style.borderBottom = '1px solid var(--am-border-subtle, var(--am-border))';
    });

    // Striped rows
    if (this.striped) {
      table.querySelectorAll('tbody tr:nth-child(even)').forEach(tr => {
        (tr as HTMLElement).style.background = 'var(--am-surface-sunken)';
      });
      table.querySelectorAll('tbody tr:nth-child(odd)').forEach(tr => {
        (tr as HTMLElement).style.background = '';
      });
    } else {
      table.querySelectorAll('tbody tr').forEach(tr => {
        (tr as HTMLElement).style.background = '';
      });
    }

    // Hoverable rows
    if (this.hoverable) {
      table.querySelectorAll('tbody tr').forEach(tr => {
        const el = tr as HTMLElement;
        el.onmouseenter = () => { el.style.background = 'var(--am-hover-overlay)'; };
        el.onmouseleave = () => {
          if (this.striped && Array.from(el.parentElement?.children ?? []).indexOf(el) % 2 === 1) {
            el.style.background = 'var(--am-surface-sunken)';
          } else {
            el.style.background = '';
          }
        };
      });
    }
  }

  render() {
    return html`<div part="table"><slot @slotchange=${() => this._applyTableStyles()}></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-table': AmTable;
  }
}
