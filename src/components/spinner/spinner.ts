import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SpinnerSize = 'sm' | 'md' | 'lg';

/**
 * Spinner — an animated loading indicator.
 *
 * @cssprop --qz-spinner-color - Override color (default: --qz-primary)
 * @cssprop --qz-spinner-track - Override track color (default: --qz-border)
 * @cssprop --qz-spinner-size - Override size (default: based on size prop)
 * @cssprop --qz-spinner-width - Override stroke width (default: 2px)
 */
@customElement('qz-spinner')
export class QzSpinner extends LitElement {
  /** Visual size of the spinner. */
  @property({ reflect: true })
  size: SpinnerSize = 'md';

  /** Accessible label for screen readers. */
  @property()
  label = 'Loading';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    :host([size='sm']) {
      --_size: var(--qz-spinner-size, 1rem);
    }

    :host([size='md']),
    :host(:not([size])) {
      --_size: var(--qz-spinner-size, 1.5rem);
    }

    :host([size='lg']) {
      --_size: var(--qz-spinner-size, 2rem);
    }

    .spinner {
      width: var(--_size);
      height: var(--_size);
      border-radius: var(--qz-radius-full);
      border: var(--qz-spinner-width, 2px) solid
        var(--qz-spinner-track, var(--qz-border));
      border-top-color: var(--qz-spinner-color, var(--qz-primary));
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation-duration: 1.5s;
      }
    }
  `;

  render() {
    return html`
      <div class="spinner" role="status" aria-label=${this.label}>
        <slot name="sr-only">
          <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">
            ${this.label}
          </span>
        </slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-spinner': QzSpinner;
  }
}
