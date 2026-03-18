import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { resetStyles, focusRingStyles } from '../../styles/reset.css.js';

export type ButtonVariant =
  | 'primary'
  | 'outlined'
  | 'ghost'
  | 'subtle'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button — the primary interactive action element.
 *
 * @slot - Button label content
 * @slot prefix - Content before the label (e.g. icon)
 * @slot suffix - Content after the label (e.g. icon)
 *
 * @csspart button - The native button element
 * @csspart label - The label wrapper span
 *
 * @cssprop --am-button-radius - Override border radius
 * @cssprop --am-button-font-weight - Override font weight
 *
 * @fires click - Standard click event (not emitted when disabled)
 *
 * @example
 * ```html
 * <qz-button variant="primary">Save changes</qz-button>
 * <qz-button variant="outlined" size="sm">Cancel</qz-button>
 * <qz-button variant="ghost" loading>Processing</qz-button>
 * ```
 */
@customElement('am-button')
export class AmButton extends LitElement {
  /** Visual style variant. */
  @property({ reflect: true })
  variant: ButtonVariant = 'primary';

  /** Button size. */
  @property({ reflect: true })
  size: ButtonSize = 'md';

  /** Whether the button is disabled. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Whether the button is in a loading state. */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /** HTML button type attribute. */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button';

  /** Accessible label override (for icon-only buttons). */
  @property({ attribute: 'aria-label' })
  override ariaLabel: string | null = null;

  static styles = [
    resetStyles,
    focusRingStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      button {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--am-space-2);
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        text-decoration: none;
        font-family: var(--am-font-sans);
        font-weight: var(--am-button-font-weight, var(--am-weight-medium));
        border-radius: var(--am-button-radius, var(--am-radius-xl));
        corner-shape: squircle;
        transition:
          background var(--am-duration-fast) var(--am-ease-default),
          color var(--am-duration-fast) var(--am-ease-default),
          border-color var(--am-duration-fast) var(--am-ease-default),
          box-shadow var(--am-duration-fast) var(--am-ease-default),
          opacity var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-spring);
        position: relative;
      }

      /* ---- Sizes ---- */

      :host([size='sm']) button,
      button.sm {
        height: var(--am-size-sm);
        padding-inline: var(--am-space-3);
        font-size: var(--am-text-sm);
        border-radius: var(--am-button-radius, var(--am-radius-lg));
      }

      :host([size='md']) button,
      :host(:not([size])) button,
      button.md {
        height: var(--am-size-md);
        padding-inline: var(--am-space-4);
        font-size: var(--am-text-sm);
      }

      :host([size='lg']) button,
      button.lg {
        height: var(--am-size-lg);
        padding-inline: var(--am-space-6);
        font-size: var(--am-text-base);
      }

      /* ---- Primary ---- */

      :host([variant='primary']) button,
      :host(:not([variant])) button {
        background: var(--am-primary);
        color: var(--am-primary-text);
      }

      :host([variant='primary']) button:hover,
      :host(:not([variant])) button:hover {
        background: var(--am-primary-hover);
      }

      :host([variant='primary']) button:active,
      :host(:not([variant])) button:active {
        background: var(--am-primary-active);
        transform: scale(0.98);
      }

      /* ---- Outlined ---- */

      :host([variant='outlined']) button {
        background: transparent;
        color: var(--am-text);
        border: var(--am-border-1) solid var(--am-border-strong);
      }

      :host([variant='outlined']) button:hover {
        background: var(--am-hover-overlay);
        border-color: var(--am-text-secondary);
      }

      :host([variant='outlined']) button:active {
        background: var(--am-active-overlay);
        transform: scale(0.98);
      }

      /* ---- Ghost ---- */

      :host([variant='ghost']) button {
        background: transparent;
        color: var(--am-text);
      }

      :host([variant='ghost']) button:hover {
        background: var(--am-hover-overlay);
      }

      :host([variant='ghost']) button:active {
        background: var(--am-active-overlay);
        transform: scale(0.98);
      }

      /* ---- Subtle ---- */

      :host([variant='subtle']) button {
        background: var(--am-primary-subtle);
        color: var(--am-primary-subtle-text, var(--am-primary));
      }

      :host([variant='subtle']) button:hover {
        background: var(--am-primary-subtle-hover);
      }

      :host([variant='subtle']) button:active {
        background: var(--am-primary-subtle-hover);
        transform: scale(0.98);
      }

      /* ---- Danger ---- */

      :host([variant='danger']) button {
        background: var(--am-danger);
        color: var(--am-color-neutral-0);
      }

      :host([variant='danger']) button:hover {
        background: var(--am-danger-hover);
      }

      :host([variant='danger']) button:active {
        background: var(--am-danger-active);
        transform: scale(0.98);
      }

      /* ---- Disabled ---- */

      :host([disabled]) button {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      /* ---- Loading ---- */

      :host([loading]) button {
        cursor: wait;
        pointer-events: none;
      }

      .label {
        display: inline-flex;
        align-items: center;
      }

      :host([loading]) .label {
        visibility: hidden;
      }

      :host([loading]) ::slotted([slot='prefix']),
      :host([loading]) ::slotted([slot='suffix']) {
        visibility: hidden;
      }

      .spinner-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loading-spinner {
        width: 1em;
        height: 1em;
        border-radius: var(--am-radius-full);
        border: 2px solid currentColor;
        border-top-color: transparent;
        animation: button-spin 0.6s linear infinite;
        opacity: 0.8;
      }

      @keyframes button-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        button {
          transition: none;
        }
        button:active {
          transform: none;
        }
        .loading-spinner {
          animation-duration: 1.5s;
        }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('disabled') || changed.has('loading')) {
      this.setAttribute(
        'aria-disabled',
        String(this.disabled || this.loading)
      );
    }
  }

  render() {
    return html`
      <button
        part="button"
        type=${this.type}
        ?disabled=${this.disabled}
        aria-label=${this.ariaLabel || (this.loading ? 'Loading' : nothing)}
        aria-busy=${this.loading ? 'true' : nothing}
        class=${classMap({
          [this.size]: true,
          [this.variant]: true,
        })}
      >
        <slot name="prefix"></slot>
        <span class="label" part="label">
          <slot></slot>
        </span>
        <slot name="suffix"></slot>
        ${this.loading
          ? html`
              <span class="spinner-overlay" aria-hidden="true">
                <span class="loading-spinner"></span>
              </span>
            `
          : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-button': AmButton;
  }
}
