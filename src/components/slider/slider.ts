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
@customElement('am-slider')
export class AmSlider extends LitElement {
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
        opacity: var(--am-disabled-opacity);
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
        border-radius: var(--am-radius-full);
        background: linear-gradient(
          to right,
          var(--am-primary) 0%,
          var(--am-primary) var(--fill-percent, 50%),
          var(--am-color-neutral-200) var(--fill-percent, 50%),
          var(--am-color-neutral-200) 100%
        );
      }

      /* ---- WebKit Thumb ---- */

      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 1.25rem;
        height: 1.25rem;
        margin-top: -0.5rem;
        border-radius: var(--am-radius-full);
        corner-shape: squircle;
        background: var(--am-surface);
        border: var(--am-border-2) solid var(--am-primary);
        box-shadow: var(--am-shadow-sm);
        transition:
          transform var(--am-duration-normal) var(--am-ease-spring),
          border-color var(--am-duration-fast) var(--am-ease-default);
      }

      input[type='range']:hover::-webkit-slider-thumb {
        transform: scale(1.1);
        border-color: var(--am-primary-hover);
      }

      input[type='range']:active::-webkit-slider-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-webkit-slider-thumb {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      /* ---- Firefox Track ---- */

      input[type='range']::-moz-range-track {
        height: 0.25rem;
        border-radius: var(--am-radius-full);
        background: var(--am-color-neutral-200);
        border: none;
      }

      input[type='range']::-moz-range-progress {
        height: 0.25rem;
        border-radius: var(--am-radius-full);
        background: var(--am-primary);
      }

      /* ---- Firefox Thumb ---- */

      input[type='range']::-moz-range-thumb {
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--am-radius-full);
        corner-shape: squircle;
        background: var(--am-surface);
        border: var(--am-border-2) solid var(--am-primary);
        box-shadow: var(--am-shadow-sm);
        transition:
          transform var(--am-duration-normal) var(--am-ease-spring),
          border-color var(--am-duration-fast) var(--am-ease-default);
      }

      input[type='range']:hover::-moz-range-thumb {
        transform: scale(1.1);
        border-color: var(--am-primary-hover);
      }

      input[type='range']:active::-moz-range-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-moz-range-thumb {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
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
    this.dispatchEvent(new CustomEvent('am-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
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
    'am-slider': AmSlider;
  }
}
