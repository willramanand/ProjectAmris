import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type TagVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type TagSize = 'sm' | 'md' | 'lg';

/**
 * Tag — a small label for categorization, with optional remove action.
 *
 * Can also be used as a "chip" for filter selections.
 *
 * @slot - Label content
 * @slot prefix - Leading icon
 * @csspart tag - The tag container
 * @csspart remove - The remove button
 *
 * @fires am-remove - Fires when the remove button is clicked
 *
 * @example
 * ```html
 * <am-tag variant="primary">React</am-tag>
 * <am-tag variant="success" removable>Active</am-tag>
 * ```
 */
@customElement('am-tag')
export class AmTag extends LitElement {
  @property({ reflect: true }) variant: TagVariant = 'neutral';
  @property({ reflect: true }) size: TagSize = 'md';
  @property({ type: Boolean, reflect: true }) removable = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        gap: var(--am-space-1);
        font-family: var(--am-font-sans);
        font-weight: var(--am-weight-medium);
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        white-space: nowrap;
        line-height: 1;
      }

      :host([size='sm']) .tag { padding: 0.1875rem 0.5rem; font-size: 0.6875rem; }
      :host([size='md']) .tag, :host(:not([size])) .tag { padding: 0.25rem 0.625rem; font-size: 0.75rem; }
      :host([size='lg']) .tag { padding: 0.3125rem 0.75rem; font-size: 0.8125rem; }

      :host([variant='neutral']) .tag, :host(:not([variant])) .tag { background: var(--am-color-neutral-100); color: var(--am-text-secondary); }
      :host([variant='primary']) .tag { background: var(--am-primary-subtle); color: var(--am-primary); }
      :host([variant='secondary']) .tag { background: var(--am-secondary-subtle); color: var(--am-secondary); }
      :host([variant='success']) .tag { background: var(--am-success-subtle); color: var(--am-success-text); }
      :host([variant='warning']) .tag { background: var(--am-warning-subtle); color: var(--am-warning-text); }
      :host([variant='danger']) .tag { background: var(--am-danger-subtle); color: var(--am-danger-text); }
      :host([variant='info']) .tag { background: var(--am-info-subtle); color: var(--am-info-text); }

      :host([disabled]) .tag { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .prefix { display: inline-flex; align-items: center; }
      .prefix ::slotted(svg) { width: 0.75em; height: 0.75em; }

      .remove-btn {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 0.875rem;
        height: 0.875rem;
        border-radius: var(--am-radius-full);
        cursor: pointer;
        opacity: 0.6;
        margin-inline-start: 0.125rem;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .remove-btn:hover { opacity: 1; }
      .remove-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .remove-btn { transition: none; }
      }
    `,
  ];

  private _handleRemove() {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('am-remove', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <span class="tag" part="tag">
        <span class="prefix"><slot name="prefix"></slot></span>
        <slot></slot>
        ${this.removable
          ? html`<button class="remove-btn" part="remove" aria-label="Remove" @click=${this._handleRemove}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M7.5 2.5l-5 5M2.5 2.5l5 5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              </svg>
            </button>`
          : nothing}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-tag': AmTag;
  }
}
