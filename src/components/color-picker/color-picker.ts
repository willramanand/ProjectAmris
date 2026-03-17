import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type ColorPickerSize = 'sm' | 'md' | 'lg';

/**
 * Color Picker — a visual color selection control with a saturation/brightness
 * area, hue slider, optional opacity slider, and hex/rgb input.
 *
 * @csspart swatch - The color preview swatch
 * @csspart panel - The picker dropdown panel
 *
 * @fires am-change - Fires when the color changes with { value } detail (hex string)
 *
 * @example
 * ```html
 * <am-color-picker value="#6366f1"></am-color-picker>
 * <am-color-picker value="#ff5733" show-alpha label="Brand color"></am-color-picker>
 * ```
 */
@customElement('am-color-picker')
export class AmColorPicker extends LitElement {
  static formAssociated = true;

  @property() value = '#000000';
  @property() label = '';
  @property() name = '';
  @property({ reflect: true }) size: ColorPickerSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, attribute: 'show-alpha' }) showAlpha = false;

  /** Predefined swatches. */
  @property({ type: Array }) swatches: string[] = [];

  @state() private _open = false;
  @state() private _hue = 0;
  @state() private _saturation = 100;
  @state() private _brightness = 100;
  @state() private _alpha = 1;
  @state() private _hexInput = '';

  @query('.area') private _area!: HTMLElement;

  private _internals: ElementInternals;
  private _draggingArea = false;
  private _draggingHue = false;
  private _draggingAlpha = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: inline-block; font-family: var(--am-font-sans); }
      :host([disabled]) { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .label {
        display: block;
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      .trigger {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        cursor: pointer;
        transition: border-color var(--am-duration-fast) var(--am-ease-default);
      }

      :host([size='sm']) .trigger { height: var(--am-size-sm); padding-inline: var(--am-space-2); font-size: var(--am-text-sm); }
      :host([size='md']) .trigger, :host(:not([size])) .trigger { height: var(--am-size-md); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='lg']) .trigger { height: var(--am-size-lg); padding-inline: var(--am-space-3); font-size: var(--am-text-base); }

      .trigger:hover { border-color: var(--am-border-strong); }
      .trigger.invalid { border-color: var(--am-danger); }

      .swatch {
        width: 1.5rem; height: 1.5rem;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        border: var(--am-border-1) solid var(--am-border);
        flex-shrink: 0;
      }

      .trigger-value {
        color: var(--am-text);
        font-variant-numeric: tabular-nums;
        min-width: 4.5em;
      }

      .panel {
        position: fixed;
        z-index: var(--am-z-dropdown);
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-lg);
        padding: var(--am-space-3);
        width: 14rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .panel.open { opacity: 1; pointer-events: auto; }

      .area {
        position: relative;
        width: 100%;
        height: 8rem;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: crosshair;
        overflow: hidden;
        margin-bottom: var(--am-space-3);
      }

      .area-gradient {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(to top, #000, transparent),
          linear-gradient(to right, #fff, transparent);
      }

      .area-thumb {
        position: absolute;
        width: 0.875rem; height: 0.875rem;
        border-radius: var(--am-radius-full);
        border: 2px solid white;
        box-shadow: 0 0 2px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .slider-row {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        margin-bottom: var(--am-space-2);
      }

      .slider-preview {
        width: 1.75rem; height: 1.75rem;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        border: var(--am-border-1) solid var(--am-border);
        flex-shrink: 0;
      }

      .sliders { flex: 1; display: flex; flex-direction: column; gap: var(--am-space-1-5); }

      .hue-slider, .alpha-slider {
        position: relative;
        width: 100%;
        height: 0.625rem;
        border-radius: var(--am-radius-full);
        cursor: pointer;
      }

      .hue-slider {
        background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
      }

      .alpha-slider {
        background:
          linear-gradient(to right, transparent, var(--_alpha-color)),
          repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px;
      }

      .slider-thumb {
        position: absolute;
        top: 50%;
        width: 0.875rem; height: 0.875rem;
        border-radius: var(--am-radius-full);
        border: 2px solid white;
        box-shadow: 0 0 2px rgba(0,0,0,0.4);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .hex-row {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
      }

      .hex-input {
        all: unset;
        flex: 1;
        font-size: var(--am-text-sm);
        font-variant-numeric: tabular-nums;
        color: var(--am-text);
        padding: var(--am-space-1-5) var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
      }

      .swatches {
        display: flex;
        flex-wrap: wrap;
        gap: var(--am-space-1);
        margin-top: var(--am-space-2);
      }

      .swatch-btn {
        all: unset;
        width: 1.25rem; height: 1.25rem;
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        border: var(--am-border-1) solid var(--am-border);
        cursor: pointer;
        transition: transform var(--am-duration-fast) var(--am-ease-default);
      }

      .swatch-btn:hover { transform: scale(1.15); }
      .swatch-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: 1px;
      }

      @media (prefers-reduced-motion: reduce) {
        .trigger, .panel, .swatch-btn { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._parseHex(this.value);
    document.addEventListener('click', this._handleOutsideClick);
    document.addEventListener('pointermove', this._handlePointerMove);
    document.addEventListener('pointerup', this._handlePointerUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value') && changed.get('value') !== undefined) {
      this._parseHex(this.value);
    }
    this._internals.setFormValue(this.value);
    if (this._open) this._updatePosition();
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (this._open && !e.composedPath().includes(this)) this._open = false;
  };

  // --- Color conversion helpers ---

  private _parseHex(hex: string) {
    const clean = hex.replace('#', '');
    let r = 0, g = 0, b = 0, a = 1;
    if (clean.length >= 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
      if (clean.length === 8) a = parseInt(clean.slice(6, 8), 16) / 255;
    }
    const [h, s, v] = this._rgbToHsv(r, g, b);
    this._hue = h;
    this._saturation = s;
    this._brightness = v;
    this._alpha = a;
    this._hexInput = hex;
  }

  private _rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 0) {
      if (max === r) h = ((g - b) / d + 6) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    const s = max > 0 ? (d / max) * 100 : 0;
    const v = max * 100;
    return [h, s, v];
  }

  private _hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  private _toHex(): string {
    const [r, g, b] = this._hsvToRgb(this._hue, this._saturation, this._brightness);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (this.showAlpha && this._alpha < 1) {
      return hex + Math.round(this._alpha * 255).toString(16).padStart(2, '0');
    }
    return hex;
  }

  private _emitChange() {
    this.value = this._toHex();
    this._hexInput = this.value;
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  // --- Interaction handlers ---

  private _handleAreaPointerDown(e: PointerEvent) {
    this._draggingArea = true;
    this._updateAreaFromPointer(e);
  }

  private _handleHuePointerDown(e: PointerEvent) {
    this._draggingHue = true;
    this._updateHueFromPointer(e);
  }

  private _handleAlphaPointerDown(e: PointerEvent) {
    this._draggingAlpha = true;
    this._updateAlphaFromPointer(e);
  }

  private _handlePointerMove = (e: PointerEvent) => {
    if (this._draggingArea) this._updateAreaFromPointer(e);
    if (this._draggingHue) this._updateHueFromPointer(e);
    if (this._draggingAlpha) this._updateAlphaFromPointer(e);
  };

  private _handlePointerUp = () => {
    this._draggingArea = false;
    this._draggingHue = false;
    this._draggingAlpha = false;
  };

  private _updateAreaFromPointer(e: PointerEvent) {
    if (!this._area) return;
    const rect = this._area.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    this._saturation = x * 100;
    this._brightness = (1 - y) * 100;
    this._emitChange();
  }

  private _updateHueFromPointer(e: PointerEvent) {
    const slider = this.shadowRoot?.querySelector('.hue-slider') as HTMLElement;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._hue = x * 360;
    this._emitChange();
  }

  private _updateAlphaFromPointer(e: PointerEvent) {
    const slider = this.shadowRoot?.querySelector('.alpha-slider') as HTMLElement;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._alpha = Math.round(x * 100) / 100;
    this._emitChange();
  }

  private _handleHexInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    this._hexInput = raw;
    if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(raw)) {
      this._parseHex(raw);
      this.value = raw;
      this.dispatchEvent(new CustomEvent('am-change', { detail: { value: raw }, bubbles: true, composed: true }));
    }
  }

  private _handleSwatchClick(hex: string) {
    this._parseHex(hex);
    this._emitChange();
  }

  private async _updatePosition() {
    const { computePosition: cp, flip: f, shift: s, offset: o } = await import('@floating-ui/dom');
    const trigger = this.shadowRoot?.querySelector('.trigger') as HTMLElement;
    const panel = this.shadowRoot?.querySelector('.panel') as HTMLElement;
    if (!trigger || !panel) return;
    const { x, y } = await cp(trigger, panel, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [o(4), f(), s({ padding: 8 })],
    });
    Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
  }

  render() {
    const [r, g, b] = this._hsvToRgb(this._hue, this._saturation, this._brightness);
    const currentColor = `rgba(${r},${g},${b},${this._alpha})`;
    const hueColor = `hsl(${this._hue}, 100%, 50%)`;
    const alphaColor = `rgb(${r},${g},${b})`;

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="trigger ${this.invalid ? 'invalid' : ''}" @click=${() => { if (!this.disabled) this._open = !this._open; }}>
        <div class="swatch" part="swatch" style="background: ${currentColor}"></div>
        <span class="trigger-value">${this._hexInput || this.value}</span>
      </div>

      <div class="panel ${this._open ? 'open' : ''}" part="panel" style="--_alpha-color: ${alphaColor}">
        <div class="area" style="background-color: ${hueColor}" @pointerdown=${this._handleAreaPointerDown}>
          <div class="area-gradient"></div>
          <div class="area-thumb" style="left: ${this._saturation}%; top: ${100 - this._brightness}%; background: ${currentColor}"></div>
        </div>

        <div class="slider-row">
          <div class="slider-preview" style="background: ${currentColor}"></div>
          <div class="sliders">
            <div class="hue-slider" @pointerdown=${this._handleHuePointerDown}>
              <div class="slider-thumb" style="left: ${(this._hue / 360) * 100}%; background: ${hueColor}"></div>
            </div>
            ${this.showAlpha ? html`
              <div class="alpha-slider" @pointerdown=${this._handleAlphaPointerDown}>
                <div class="slider-thumb" style="left: ${this._alpha * 100}%; background: ${currentColor}"></div>
              </div>
            ` : nothing}
          </div>
        </div>

        <div class="hex-row">
          <input class="hex-input" type="text" .value=${this._hexInput} @input=${this._handleHexInput} aria-label="Hex color" />
        </div>

        ${this.swatches.length > 0 ? html`
          <div class="swatches">
            ${this.swatches.map(s => html`
              <button class="swatch-btn" style="background: ${s}" aria-label=${s}
                @click=${() => this._handleSwatchClick(s)}></button>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-color-picker': AmColorPicker;
  }
}
