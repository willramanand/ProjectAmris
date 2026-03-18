import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { resetStyles } from '../../styles/reset.css.js';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type ProgressSize = 'sm' | 'md' | 'lg';

/**
 * Progress — a linear progress bar.
 *
 * @csspart track - The background track
 * @csspart fill - The progress fill bar
 *
 * @cssprop --am-progress-radius - Override border radius
 * @cssprop --am-progress-color - Override fill color
 *
 * @example
 * ```html
 * <am-progress value="60"></am-progress>
 * <am-progress value="40" variant="success"></am-progress>
 * <am-progress indeterminate></am-progress>
 * ```
 */
@customElement('am-progress')
export class AmProgress extends LitElement {
  /** Current progress value (0–max). Ignored when indeterminate. */
  @property({ type: Number }) value = 0;

  /** Maximum value. */
  @property({ type: Number }) max = 100;

  /** Whether progress is indeterminate (unknown completion). */
  @property({ type: Boolean, reflect: true }) indeterminate = false;

  /** Color variant. */
  @property({ reflect: true }) variant: ProgressVariant = 'primary';

  /** Size of the bar. */
  @property({ reflect: true }) size: ProgressSize = 'md';

  /** Accessible label. */
  @property() label = '';

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .track {
        width: 100%;
        overflow: hidden;
        background: var(--am-surface-sunken);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-progress-radius, var(--am-radius-full));
        corner-shape: squircle;
        box-sizing: border-box;
      }

      :host([size='sm']) .track { height: 0.25rem; }
      :host([size='md']) .track, :host(:not([size])) .track { height: 0.5rem; }
      :host([size='lg']) .track { height: 0.75rem; }

      .fill {
        height: 100%;
        border-radius: inherit;
        width: var(--_progress);
        transition: width var(--am-duration-normal) var(--am-ease-default);
      }

      /* Variants */
      :host([variant='primary']) .fill, :host(:not([variant])) .fill { background: var(--am-progress-color, var(--am-primary)); }
      :host([variant='success']) .fill { background: var(--am-progress-color, var(--am-success)); }
      :host([variant='warning']) .fill { background: var(--am-progress-color, var(--am-warning)); }
      :host([variant='danger']) .fill { background: var(--am-progress-color, var(--am-danger)); }
      :host([variant='info']) .fill { background: var(--am-progress-color, var(--am-info)); }

      /* Indeterminate animation */
      :host([indeterminate]) .fill {
        width: 30% !important;
        animation: indeterminate 1.5s var(--am-ease-in-out) infinite;
      }

      @keyframes indeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(433%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .fill { transition: none; }
        :host([indeterminate]) .fill { animation-duration: 3s; }
      }
    `,
  ];

  private get _percent(): number {
    const clamped = Math.max(0, Math.min(this.value, this.max));
    return this.max > 0 ? (clamped / this.max) * 100 : 0;
  }

  render() {
    const percent = this._percent;

    return html`
      <div
        class="track"
        part="track"
        role="progressbar"
        aria-label=${this.label || 'Progress'}
        aria-valuenow=${this.indeterminate ? undefined as unknown as number : percent}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="fill"
          part="fill"
          style=${this.indeterminate ? '' : styleMap({'--_progress': `${percent}%`})}
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-progress': AmProgress;
  }
}
