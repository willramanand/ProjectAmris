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
 * <am-hint-text>Must be at least 8 characters.</am-hint-text>
 * ```
 */
@customElement('am-hint-text')
export class AmHintText extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
        line-height: var(--am-leading-normal);
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-hint-text': AmHintText;
  }
}
