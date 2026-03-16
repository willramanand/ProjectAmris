import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ProgressRingVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type ProgressRingSize = 'sm' | 'md' | 'lg';

/**
 * Progress Ring — a circular progress indicator.
 *
 * @slot - Optional content displayed in the center (e.g. percentage text)
 *
 * @csspart track - The background circle
 * @csspart fill - The progress arc
 *
 * @cssprop --am-progress-ring-color - Override fill color
 * @cssprop --am-progress-ring-size - Override size
 *
 * @example
 * ```html
 * <am-progress-ring value="75"></am-progress-ring>
 * <am-progress-ring indeterminate variant="info"></am-progress-ring>
 * <am-progress-ring value="42">42%</am-progress-ring>
 * ```
 */
@customElement('am-progress-ring')
export class AmProgressRing extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  @property({ reflect: true }) variant: ProgressRingVariant = 'primary';
  @property({ reflect: true }) size: ProgressRingSize = 'md';
  @property() label = '';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    :host([size='sm']) { --_size: 2rem; --_stroke: 3; }
    :host([size='md']), :host(:not([size])) { --_size: 3rem; --_stroke: 4; }
    :host([size='lg']) { --_size: 4rem; --_stroke: 5; }

    svg {
      width: var(--am-progress-ring-size, var(--_size));
      height: var(--am-progress-ring-size, var(--_size));
      transform: rotate(-90deg);
    }

    .track {
      fill: none;
      stroke: var(--am-surface-sunken, #f0f0f0);
      stroke-width: var(--_stroke);
    }

    .fill {
      fill: none;
      stroke-width: var(--_stroke);
      stroke-linecap: round;
      transition: stroke-dashoffset var(--am-duration-normal, 200ms) var(--am-ease-default, ease);
    }

    /* Variants */
    :host([variant='primary']) .fill, :host(:not([variant])) .fill { stroke: var(--am-progress-ring-color, var(--am-primary)); }
    :host([variant='success']) .fill { stroke: var(--am-progress-ring-color, var(--am-success)); }
    :host([variant='warning']) .fill { stroke: var(--am-progress-ring-color, var(--am-warning)); }
    :host([variant='danger']) .fill { stroke: var(--am-progress-ring-color, var(--am-danger)); }
    :host([variant='info']) .fill { stroke: var(--am-progress-ring-color, var(--am-info)); }

    :host([indeterminate]) svg {
      animation: ring-spin 1.4s linear infinite;
    }

    :host([indeterminate]) .fill {
      stroke-dasharray: 60 200;
      stroke-dashoffset: 0;
      animation: ring-dash 1.4s var(--am-ease-in-out, ease-in-out) infinite;
    }

    @keyframes ring-spin {
      to { transform: rotate(270deg); }
    }

    @keyframes ring-dash {
      0% { stroke-dasharray: 1 200; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 80 200; stroke-dashoffset: -30; }
      100% { stroke-dasharray: 80 200; stroke-dashoffset: -124; }
    }

    .center {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--am-font-sans);
      font-size: 0.6875rem;
      font-weight: var(--am-weight-medium);
      color: var(--am-text-secondary);
    }

    :host([size='lg']) .center { font-size: 0.8125rem; }
    :host([size='sm']) .center { font-size: 0.5625rem; }

    @media (prefers-reduced-motion: reduce) {
      .fill { transition: none; }
      :host([indeterminate]) svg { animation-duration: 3s; }
      :host([indeterminate]) .fill { animation-duration: 3s; }
    }
  `;

  private get _percent(): number {
    const clamped = Math.max(0, Math.min(this.value, this.max));
    return this.max > 0 ? (clamped / this.max) * 100 : 0;
  }

  render() {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = this.indeterminate ? 0 : circumference - (this._percent / 100) * circumference;

    return html`
      <svg viewBox="0 0 36 36"
        role="progressbar"
        aria-label=${this.label || 'Progress'}
        aria-valuenow=${this.indeterminate ? nothing : this._percent}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <circle class="track" part="track" cx="18" cy="18" r=${radius}></circle>
        <circle class="fill" part="fill" cx="18" cy="18" r=${radius}
          stroke-dasharray=${circumference}
          stroke-dashoffset=${this.indeterminate ? nothing : offset}
        ></circle>
      </svg>
      <div class="center"><slot></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-progress-ring': AmProgressRing;
  }
}
