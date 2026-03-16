import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Hint Text — helper text displayed below a form control.
 *
 * @slot - Hint text content
 *
 * @example
 * ```html
 * <qz-hint-text>Must be at least 8 characters.</qz-hint-text>
 * ```
 */
@customElement('qz-hint-text')
export class QzHintText extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-xs);
        color: var(--qz-text-tertiary);
        line-height: var(--qz-leading-normal);
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-hint-text': QzHintText;
  }
}
