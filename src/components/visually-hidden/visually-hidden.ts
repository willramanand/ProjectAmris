import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * Visually Hidden — hides content visually while keeping it
 * accessible to screen readers. Use for accessible labels
 * that should not be visible.
 *
 * @slot - Content to visually hide
 *
 * @example
 * ```html
 * <qz-visually-hidden>Close dialog</qz-visually-hidden>
 * ```
 */
@customElement('qz-visually-hidden')
export class QzVisuallyHidden extends LitElement {
  static styles = css`
    :host {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-visually-hidden': QzVisuallyHidden;
  }
}
