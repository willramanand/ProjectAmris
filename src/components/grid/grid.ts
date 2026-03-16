import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Grid — a CSS grid layout primitive with responsive columns.
 *
 * @slot - Child elements
 *
 * @cssprop --am-grid-min - Minimum column width for auto-fill (default: 16rem)
 * @cssprop --am-grid-gap - Override gap
 *
 * @example
 * ```html
 * <am-grid columns="3" gap="4">
 *   <am-card>A</am-card>
 *   <am-card>B</am-card>
 *   <am-card>C</am-card>
 * </am-grid>
 *
 * <!-- Auto-fill responsive grid -->
 * <am-grid gap="4" style="--am-grid-min: 20rem;">
 *   <am-card>Auto</am-card>
 *   <am-card>Fill</am-card>
 *   <am-card>Grid</am-card>
 * </am-grid>
 * ```
 */
@customElement('am-grid')
export class AmGrid extends LitElement {
  /**
   * Fixed number of columns. When omitted, uses responsive
   * `auto-fill` with `--am-grid-min` as the minimum column width.
   */
  @property({ reflect: true }) columns = '';

  /** Gap using the spacing scale (e.g. "4" = --am-space-4). */
  @property({ reflect: true }) gap = '4';

  static styles = css`
    :host {
      display: grid;
    }

    /* Responsive auto-fill (default) */
    :host(:not([columns])), :host([columns='']) {
      grid-template-columns: repeat(auto-fill, minmax(var(--am-grid-min, 16rem), 1fr));
    }

    /* Fixed column counts */
    :host([columns='1']) { grid-template-columns: repeat(1, 1fr); }
    :host([columns='2']) { grid-template-columns: repeat(2, 1fr); }
    :host([columns='3']) { grid-template-columns: repeat(3, 1fr); }
    :host([columns='4']) { grid-template-columns: repeat(4, 1fr); }
    :host([columns='5']) { grid-template-columns: repeat(5, 1fr); }
    :host([columns='6']) { grid-template-columns: repeat(6, 1fr); }

    /* Gap — map to spacing tokens */
    :host([gap='0']) { gap: 0; }
    :host([gap='1']) { gap: var(--am-space-1); }
    :host([gap='2']) { gap: var(--am-space-2); }
    :host([gap='3']) { gap: var(--am-space-3); }
    :host([gap='4']), :host(:not([gap])) { gap: var(--am-space-4); }
    :host([gap='5']) { gap: var(--am-space-5); }
    :host([gap='6']) { gap: var(--am-space-6); }
    :host([gap='8']) { gap: var(--am-space-8); }
    :host([gap='10']) { gap: var(--am-space-10); }
    :host([gap='12']) { gap: var(--am-space-12); }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-grid': AmGrid;
  }
}
