import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Field — a structural wrapper for composing label + input + hint/error.
 * Provides consistent vertical spacing for form groups.
 *
 * @slot - Default slot for form controls (am-input, am-checkbox, etc.)
 * @slot label - Label slot (am-label)
 * @slot hint - Hint text slot (am-hint-text)
 * @slot error - Error text slot (am-error-text)
 *
 * @csspart field - The outer field container
 *
 * @cssprop --am-field-gap - Override gap between elements (default: --am-space-1-5)
 *
 * @example
 * ```html
 * <am-field>
 *   <am-label slot="label" required>Email</am-label>
 *   <am-input type="email" placeholder="you@example.com"></am-input>
 *   <am-hint-text slot="hint">We'll never share your email.</am-hint-text>
 * </am-field>
 * ```
 */
@customElement('am-field')
export class AmField extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: var(--am-field-gap, var(--am-space-1-5));
      }
    `,
  ];

  render() {
    return html`
      <div class="field" part="field">
        <slot name="label"></slot>
        <slot></slot>
        <slot name="hint"></slot>
        <slot name="error"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-field': AmField;
  }
}
