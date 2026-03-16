import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles, focusRingStyles } from '../../styles/reset.css.js';

export type IconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'subtle'
  | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * Icon Button — a square button for icon-only actions.
 * Always requires an accessible label.
 *
 * @slot - Icon content (SVG or qz-icon)
 * @csspart button - The native button element
 *
 * @cssprop --qz-icon-button-radius - Override border radius
 *
 * @example
 * ```html
 * <qz-icon-button label="Close">
 *   <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>
 * </qz-icon-button>
 * ```
 */
@customElement('qz-icon-button')
export class QzIconButton extends LitElement {
  @property({ reflect: true }) variant: IconButtonVariant = 'ghost';
  @property({ reflect: true }) size: IconButtonSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) loading = false;
  @property() type: 'button' | 'submit' | 'reset' = 'button';

  /** Required accessible label for the icon-only button. */
  @property() label = '';

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
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
        border-radius: var(--qz-icon-button-radius, var(--qz-radius-xl));
        corner-shape: squircle;
        aspect-ratio: 1;
        transition:
          background var(--qz-duration-fast) var(--qz-ease-default),
          color var(--qz-duration-fast) var(--qz-ease-default),
          transform var(--qz-duration-fast) var(--qz-ease-spring);
        position: relative;
      }

      /* Sizes */
      :host([size='sm']) button { width: var(--qz-size-sm); height: var(--qz-size-sm); font-size: 0.875rem; }
      :host([size='md']) button, :host(:not([size])) button { width: var(--qz-size-md); height: var(--qz-size-md); font-size: 1.125rem; }
      :host([size='lg']) button { width: var(--qz-size-lg); height: var(--qz-size-lg); font-size: 1.25rem; }

      /* Primary */
      :host([variant='primary']) button { background: var(--qz-primary); color: var(--qz-primary-text); }
      :host([variant='primary']) button:hover { background: var(--qz-primary-hover); }
      :host([variant='primary']) button:active { background: var(--qz-primary-active); transform: scale(0.92); }

      /* Secondary */
      :host([variant='secondary']) button { background: transparent; color: var(--qz-text); border: var(--qz-border-1) solid var(--qz-border-strong); }
      :host([variant='secondary']) button:hover { background: var(--qz-hover-overlay); }
      :host([variant='secondary']) button:active { background: var(--qz-active-overlay); transform: scale(0.92); }

      /* Ghost */
      :host([variant='ghost']) button, :host(:not([variant])) button { background: transparent; color: var(--qz-text-secondary); }
      :host([variant='ghost']) button:hover, :host(:not([variant])) button:hover { background: var(--qz-hover-overlay); color: var(--qz-text); }
      :host([variant='ghost']) button:active, :host(:not([variant])) button:active { background: var(--qz-active-overlay); transform: scale(0.92); }

      /* Subtle */
      :host([variant='subtle']) button { background: var(--qz-primary-subtle); color: var(--qz-primary); }
      :host([variant='subtle']) button:hover { background: var(--qz-primary-subtle-hover); }
      :host([variant='subtle']) button:active { transform: scale(0.92); }

      /* Danger */
      :host([variant='danger']) button { background: transparent; color: var(--qz-danger); }
      :host([variant='danger']) button:hover { background: var(--qz-danger-subtle); }
      :host([variant='danger']) button:active { transform: scale(0.92); }

      /* Disabled */
      :host([disabled]) button { opacity: var(--qz-disabled-opacity); cursor: not-allowed; pointer-events: none; }

      /* Loading */
      :host([loading]) button { cursor: wait; pointer-events: none; }
      :host([loading]) ::slotted(*) { visibility: hidden; }

      .loading-spinner {
        position: absolute;
        width: 1em;
        height: 1em;
        border-radius: var(--qz-radius-full);
        border: 2px solid currentColor;
        border-top-color: transparent;
        animation: spin 0.6s linear infinite;
        opacity: 0.8;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

      ::slotted(svg) { width: 1em; height: 1em; }

      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
        button:active { transform: none; }
        .loading-spinner { animation-duration: 1.5s; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('disabled') || changed.has('loading')) {
      this.setAttribute('aria-disabled', String(this.disabled || this.loading));
    }
  }

  render() {
    return html`
      <button
        part="button"
        type=${this.type}
        ?disabled=${this.disabled}
        aria-label=${this.label || nothing}
        aria-busy=${this.loading ? 'true' : nothing}
      >
        ${this.loading
          ? html`<span class="loading-spinner" aria-hidden="true"></span>`
          : nothing}
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-icon-button': QzIconButton;
  }
}
