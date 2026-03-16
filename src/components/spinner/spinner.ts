import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SpinnerSize = 'sm' | 'md' | 'lg';

/**
 * Spinner — an animated loading indicator.
 *
 * @cssprop --am-spinner-color - Override color (default: --am-primary)
 * @cssprop --am-spinner-track - Override track color (default: --am-border)
 * @cssprop --am-spinner-size - Override size (default: based on size prop)
 * @cssprop --am-spinner-width - Override stroke width (default: 2px)
 */
@customElement('am-spinner')
export class AmSpinner extends LitElement {
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
      --_size: var(--am-spinner-size, 1rem);
    }

    :host([size='md']),
    :host(:not([size])) {
      --_size: var(--am-spinner-size, 1.5rem);
    }

    :host([size='lg']) {
      --_size: var(--am-spinner-size, 2rem);
    }

    .spinner {
      width: var(--_size);
      height: var(--_size);
      border-radius: var(--am-radius-full);
      border: var(--am-spinner-width, 2px) solid
        var(--am-spinner-track, var(--am-border));
      border-top-color: var(--am-spinner-color, var(--am-primary));
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
    'am-spinner': AmSpinner;
  }
}
