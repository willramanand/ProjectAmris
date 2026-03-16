import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Field — a structural wrapper for composing label + input + hint/error.
 * Provides consistent vertical spacing for form groups.
 *
 * @slot - Default slot for form controls (qz-input, qz-checkbox, etc.)
 * @slot label - Label slot (qz-label)
 * @slot hint - Hint text slot (qz-hint-text)
 * @slot error - Error text slot (qz-error-text)
 *
 * @csspart field - The outer field container
 *
 * @cssprop --qz-field-gap - Override gap between elements (default: --qz-space-1-5)
 *
 * @example
 * ```html
 * <qz-field>
 *   <qz-label slot="label" required>Email</qz-label>
 *   <qz-input type="email" placeholder="you@example.com"></qz-input>
 *   <qz-hint-text slot="hint">We'll never share your email.</qz-hint-text>
 * </qz-field>
 * ```
 */
@customElement('qz-field')
export class QzField extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: var(--qz-field-gap, var(--qz-space-1-5));
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
    'qz-field': QzField;
  }
}
