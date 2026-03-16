import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Slider — a custom-styled range slider.
 *
 * @csspart input - The native range input element
 *
 * @fires qz-input - Fires during drag with { value } detail
 * @fires qz-change - Fires on drag end with { value } detail
 *
 * @example
 * ```html
 * <qz-slider></qz-slider>
 * <qz-slider value="30" min="0" max="100" step="5"></qz-slider>
 * <qz-slider label="Volume" value="75"></qz-slider>
 * ```
 */
@customElement('qz-slider')
export class QzSlider extends LitElement {
  static formAssociated = true;

  @property({ type: Number }) value = 50;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() name = '';
  @property() label = '';

  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      input[type='range'] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 1.25rem;
        background: transparent;
        cursor: pointer;
        margin: 0;
        padding: 0;
      }

      input[type='range']:focus-visible {
        outline: none;
      }

      /* ---- WebKit Track ---- */

      input[type='range']::-webkit-slider-runnable-track {
        height: 0.25rem;
        border-radius: var(--qz-radius-full);
        background: linear-gradient(
          to right,
          var(--qz-primary) 0%,
          var(--qz-primary) var(--fill-percent, 50%),
          var(--qz-color-neutral-200) var(--fill-percent, 50%),
          var(--qz-color-neutral-200) 100%
        );
      }

      /* ---- WebKit Thumb ---- */

      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 1.25rem;
        height: 1.25rem;
        margin-top: -0.5rem;
        border-radius: var(--qz-radius-full);
        corner-shape: squircle;
        background: var(--qz-surface);
        border: var(--qz-border-2) solid var(--qz-primary);
        box-shadow: var(--qz-shadow-sm);
        transition:
          transform var(--qz-duration-normal) var(--qz-ease-spring),
          border-color var(--qz-duration-fast) var(--qz-ease-default);
      }

      input[type='range']:hover::-webkit-slider-thumb {
        transform: scale(1.1);
        border-color: var(--qz-primary-hover);
      }

      input[type='range']:active::-webkit-slider-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-webkit-slider-thumb {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
      }

      /* ---- Firefox Track ---- */

      input[type='range']::-moz-range-track {
        height: 0.25rem;
        border-radius: var(--qz-radius-full);
        background: var(--qz-color-neutral-200);
        border: none;
      }

      input[type='range']::-moz-range-progress {
        height: 0.25rem;
        border-radius: var(--qz-radius-full);
        background: var(--qz-primary);
      }

      /* ---- Firefox Thumb ---- */

      input[type='range']::-moz-range-thumb {
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--qz-radius-full);
        corner-shape: squircle;
        background: var(--qz-surface);
        border: var(--qz-border-2) solid var(--qz-primary);
        box-shadow: var(--qz-shadow-sm);
        transition:
          transform var(--qz-duration-normal) var(--qz-ease-spring),
          border-color var(--qz-duration-fast) var(--qz-ease-default);
      }

      input[type='range']:hover::-moz-range-thumb {
        transform: scale(1.1);
        border-color: var(--qz-primary-hover);
      }

      input[type='range']:active::-moz-range-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-moz-range-thumb {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
      }

      @media (prefers-reduced-motion: reduce) {
        input[type='range']::-webkit-slider-thumb { transition: none; }
        input[type='range']::-moz-range-thumb { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      const percent = ((this.value - this.min) / (this.max - this.min)) * 100;
      this.style.setProperty('--fill-percent', `${percent}%`);
      this.internals.setFormValue(String(this.value));
    }
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    this.dispatchEvent(new CustomEvent('qz-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    this.dispatchEvent(new CustomEvent('qz-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <input
        part="input"
        type="range"
        .value=${String(this.value)}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        aria-label=${this.label || nothing}
        @input=${this._handleInput}
        @change=${this._handleChange}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-slider': QzSlider;
  }
}
