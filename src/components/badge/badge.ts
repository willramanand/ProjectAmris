import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge — a small status indicator label with optional remove action.
 *
 * @slot - Badge text content
 * @slot prefix - Leading icon
 * @csspart badge - The badge element
 * @csspart remove - The remove button
 *
 * @fires am-remove - Fires when the remove button is clicked
 *
 * @example
 * ```html
 * <am-badge variant="success">Active</am-badge>
 * <am-badge variant="primary" removable>React</am-badge>
 * ```
 */
@customElement('am-badge')
export class AmBadge extends LitElement {
  @property({ reflect: true }) variant: BadgeVariant = 'neutral';
  @property({ reflect: true }) size: BadgeSize = 'md';
  @property({ type: Boolean, reflect: true }) removable = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @state() private _hasPrefix = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: var(--am-space-1);
        font-family: var(--am-font-sans);
        font-weight: var(--am-weight-medium);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        white-space: nowrap;
        line-height: 1;
      }

      /* Sizes */
      :host([size='sm']) .badge { padding: 0.25rem 0.5rem; font-size: 0.6875rem; }
      :host([size='md']) .badge, :host(:not([size])) .badge { padding: 0.3125rem 0.625rem; font-size: 0.75rem; }
      :host([size='lg']) .badge { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }

      /* Variants — dark text on pastel backgrounds; --am-text adapts via theme tokens */
      .badge { color: var(--am-text); }
      :host([variant='neutral']) .badge, :host(:not([variant])) .badge { background: var(--am-neutral-subtle); }
      :host([variant='primary']) .badge { background: var(--am-primary-subtle); }
      :host([variant='secondary']) .badge { background: var(--am-secondary-subtle); }
      :host([variant='success']) .badge { background: var(--am-success-subtle); }
      :host([variant='warning']) .badge { background: var(--am-warning-subtle); }
      :host([variant='danger']) .badge { background: var(--am-danger-subtle); }
      :host([variant='info']) .badge { background: var(--am-info-subtle); }

      :host([disabled]) .badge { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .prefix { display: none; align-items: center; }
      .prefix.has-content { display: inline-flex; }
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

  private _onPrefixSlotChange(e: Event) {
    this._hasPrefix = (e.target as HTMLSlotElement).assignedNodes().length > 0;
  }

  private _handleRemove() {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('am-remove', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <span class="badge" part="badge">
        <span class="prefix${this._hasPrefix ? ' has-content' : ''}"><slot name="prefix" @slotchange=${this._onPrefixSlotChange}></slot></span>
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
    'am-badge': AmBadge;
  }
}
