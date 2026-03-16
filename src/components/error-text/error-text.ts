import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Error Text — validation error message displayed below a form control.
 *
 * @slot - Error message content
 *
 * @example
 * ```html
 * <qz-error-text>This field is required.</qz-error-text>
 * ```
 */
@customElement('qz-error-text')
export class QzErrorText extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-xs);
        color: var(--qz-danger-text);
        line-height: var(--qz-leading-normal);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'alert');
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-error-text': QzErrorText;
  }
}
