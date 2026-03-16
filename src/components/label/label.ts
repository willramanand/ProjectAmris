import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Label — a styled form label.
 *
 * @slot - Label text content
 * @csspart label - The native label element
 *
 * @example
 * ```html
 * <qz-label for="email-input" required>Email address</qz-label>
 * ```
 */
@customElement('qz-label')
export class QzLabel extends LitElement {
  /** The ID of the form control this label is for. */
  @property() for = '';

  /** Show a required indicator. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Show an optional indicator instead. */
  @property({ type: Boolean, reflect: true }) optional = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      label {
        display: inline-flex;
        align-items: baseline;
        gap: var(--qz-space-1);
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        font-weight: var(--qz-weight-medium);
        color: var(--qz-text);
        line-height: var(--qz-leading-normal);
        cursor: pointer;
        user-select: none;
      }

      .indicator {
        font-size: var(--qz-text-xs);
        font-weight: var(--qz-weight-regular);
      }

      .required-indicator {
        color: var(--qz-danger);
      }

      .optional-indicator {
        color: var(--qz-text-tertiary);
      }
    `,
  ];

  private _handleClick() {
    if (this.for) {
      const root = this.getRootNode() as Document | ShadowRoot;
      const target = root.getElementById(this.for) as HTMLElement | null;
      target?.focus();
    }
  }

  render() {
    return html`
      <label
        part="label"
        for=${this.for || nothing}
        @click=${this._handleClick}
      >
        <slot></slot>
        ${this.required
          ? html`<span class="indicator required-indicator" aria-hidden="true">*</span>`
          : nothing}
        ${this.optional
          ? html`<span class="indicator optional-indicator">(optional)</span>`
          : nothing}
      </label>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-label': QzLabel;
  }
}
