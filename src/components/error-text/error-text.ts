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
 * <am-error-text>This field is required.</am-error-text>
 * ```
 */
@customElement('am-error-text')
export class AmErrorText extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        color: var(--am-danger-text);
        line-height: var(--am-leading-normal);
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
    'am-error-text': AmErrorText;
  }
}
