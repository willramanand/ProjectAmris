import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type TimePickerSize = 'sm' | 'md' | 'lg';

/**
 * Time Picker — an input for selecting time values.
 *
 * Uses separate hour/minute/second segments with keyboard arrow navigation.
 *
 * @csspart input - The time input container
 *
 * @fires input - Fires when the time changes
 * @fires change - Fires when the time changes
 *
 * @example
 * ```html
 * <am-time-picker label="Start time"></am-time-picker>
 * <am-time-picker value="14:30" step="15" use12-hour></am-time-picker>
 * ```
 */
@customElement('am-time-picker')
export class AmTimePicker extends LitElement {
  static formAssociated = true;

  @property() label = '';
  /** Time value as HH:MM or HH:MM:SS string. */
  @property() value = '';
  @property() name = '';
  @property() placeholder = '';
  @property({ reflect: true }) size: TimePickerSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;
  /** Step in minutes for the minute segment. */
  @property({ type: Number }) step = 1;
  /** Whether to show seconds. */
  @property({ type: Boolean, attribute: 'show-seconds' }) showSeconds = false;
  /** Use 12-hour format with AM/PM. */
  @property({ type: Boolean, attribute: 'use12-hour' }) use12Hour = false;

  @state() private _hours = 0;
  @state() private _minutes = 0;
  @state() private _seconds = 0;
  @state() private _period: 'AM' | 'PM' = 'AM';
  @state() private _focused = false;
  @state() private _activeSegment: 'hours' | 'minutes' | 'seconds' | 'period' = 'hours';

  private get _floated(): boolean {
    return this._focused || this.value.length > 0;
  }

  private _internals: ElementInternals;
  @state() private _inputBuffer = '';
  private _bufferTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: block; width: 100%; font-family: var(--am-font-sans); }
      :host([disabled]) { pointer-events: none; }

      .wrapper {
        display: flex;
        align-items: center;
        gap: var(--am-space-1);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .wrapper:not(.has-label) { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper:not(.has-label), :host(:not([size])) .wrapper:not(.has-label) { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper:not(.has-label) { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .wrapper.has-label { height: 3rem; padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper.has-label, :host(:not([size])) .wrapper.has-label { height: 3.5rem; padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper.has-label { height: 3.75rem; padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      :host([disabled]) .wrapper { opacity: var(--am-disabled-opacity); }

      .clock-icon {
        width: 1rem; height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
      }

      .segments {
        display: flex;
        align-items: center;
        gap: 0;
        font-variant-numeric: tabular-nums;
      }

      .segment-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .stepper {
        all: unset;
        display: none;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.25rem;
        color: var(--am-text-tertiary);
        cursor: pointer;
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        transition: color var(--am-duration-fast) var(--am-ease-default),
                    background var(--am-duration-fast) var(--am-ease-default);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .stepper:hover { color: var(--am-text); background: var(--am-hover-overlay); }
      .stepper:active { background: var(--am-primary-subtle); }

      .stepper svg { width: 0.75rem; height: 0.75rem; }

      .segment {
        all: unset;
        width: 1.5em;
        text-align: center;
        padding: var(--am-space-0-5) 0;
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        cursor: pointer;
        color: var(--am-text);
        transition: background var(--am-duration-fast) var(--am-ease-default);
        -webkit-tap-highlight-color: transparent;
        touch-action: none;
      }

      .segment:hover { background: var(--am-hover-overlay); }
      .segment.active { background: var(--am-primary-subtle); color: var(--am-primary); }
      .segment.editing { background: var(--am-primary); color: var(--am-primary-text); }
      .segment:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .seg-text { display: inline; }
      .seg-placeholder { opacity: 0.4; }

      .caret {
        display: inline-block;
        width: 1px;
        height: 1em;
        vertical-align: text-bottom;
        margin-left: -1px;
        background: currentColor;
        animation: blink 1s step-end infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      .separator { color: var(--am-text-tertiary); }

      .period-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .period {
        all: unset;
        padding: var(--am-space-0-5) var(--am-space-1);
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        cursor: pointer;
        font-size: var(--am-text-xs);
        font-weight: var(--am-weight-medium);
        color: var(--am-text-secondary);
        transition: background var(--am-duration-fast) var(--am-ease-default);
        -webkit-tap-highlight-color: transparent;
        touch-action: none;
      }

      .period:hover { background: var(--am-hover-overlay); }
      .period.active { background: var(--am-primary-subtle); color: var(--am-primary); }

      @media (pointer: coarse) {
        .stepper { display: flex; }

        .segment {
          width: 2em;
          padding: var(--am-space-1) 0;
          font-size: 1.125em;
        }

        .period {
          padding: var(--am-space-1) var(--am-space-2);
        }
      }

      /* ---- Floating label ---- */

      .wrapper.has-label {
        gap: var(--am-space-2);
      }

      .field-group {
        display: flex;
        align-items: center;
      }

      .wrapper.has-label .field-group {
        position: relative;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        height: 100%;
        padding-bottom: 0.5rem;
      }

      .wrapper.has-label { cursor: text; }

      .floating-label {
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        font-family: var(--am-font-sans);
        font-size: inherit;
        color: var(--am-text-secondary);
        pointer-events: none;
        transform-origin: left center;
        transition:
          top var(--am-duration-normal) var(--am-ease-spring),
          transform var(--am-duration-normal) var(--am-ease-spring),
          font-size var(--am-duration-normal) var(--am-ease-spring),
          color var(--am-duration-fast) var(--am-ease-default);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .floated .floating-label {
        top: 0.4rem;
        transform: none;
        font-size: 0.75rem;
      }

      .focused .floating-label {
        color: var(--am-primary);
      }

      .invalid .floating-label {
        color: var(--am-danger);
      }

      .has-label:not(.floated) .segments {
        opacity: 0;
      }

      .has-label .segments {
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .segment, .period, .stepper, .floating-label { transition: none; }
        .caret { animation: none; opacity: 1; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._parseValue();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._bufferTimer) clearTimeout(this._bufferTimer);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value') && changed.get('value') !== undefined) {
      this._parseValue();
    }
    this._internals.setFormValue(this._formatValue());
  }

  private _parseValue() {
    if (!this.value) return;
    const parts = this.value.split(':');
    this._hours = Math.max(0, Math.min(23, parseInt(parts[0] || '0', 10)));
    this._minutes = Math.max(0, Math.min(59, parseInt(parts[1] || '0', 10)));
    this._seconds = Math.max(0, Math.min(59, parseInt(parts[2] || '0', 10)));
    if (this.use12Hour) {
      this._period = this._hours >= 12 ? 'PM' : 'AM';
    }
  }

  private _formatValue(): string {
    const hh = String(this._hours).padStart(2, '0');
    const mm = String(this._minutes).padStart(2, '0');
    if (this.showSeconds) {
      const ss = String(this._seconds).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}`;
  }

  private _displayHours(): string {
    if (this.use12Hour) {
      const h = this._hours % 12;
      return String(h === 0 ? 12 : h).padStart(2, '0');
    }
    return String(this._hours).padStart(2, '0');
  }

  private _isEditing(segment: 'hours' | 'minutes' | 'seconds'): boolean {
    return this._activeSegment === segment && this._inputBuffer.length > 0;
  }

  private _renderSegmentContent(segment: 'hours' | 'minutes' | 'seconds') {
    if (this._isEditing(segment)) {
      const digit = this._inputBuffer;
      return html`<span class="seg-text">${digit}</span><span class="seg-placeholder">–</span><span class="caret"></span>`;
    }
    if (segment === 'hours') return this._displayHours();
    if (segment === 'minutes') return String(this._minutes).padStart(2, '0');
    return String(this._seconds).padStart(2, '0');
  }

  private _adjustSegment(segment: 'hours' | 'minutes' | 'seconds' | 'period', delta: number) {
    if (this.disabled || this.readonly) return;

    if (segment === 'hours') {
      this._hours = ((this._hours + delta) + 24) % 24;
    } else if (segment === 'minutes') {
      this._minutes = ((this._minutes + delta * this.step) + 60) % 60;
    } else if (segment === 'seconds') {
      this._seconds = ((this._seconds + delta) + 60) % 60;
    } else if (segment === 'period') {
      this._period = this._period === 'AM' ? 'PM' : 'AM';
      this._hours = (this._hours + 12) % 24;
    }

    this.value = this._formatValue();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _getSegmentOrder(): Array<'hours' | 'minutes' | 'seconds' | 'period'> {
    const order: Array<'hours' | 'minutes' | 'seconds' | 'period'> = ['hours', 'minutes'];
    if (this.showSeconds) order.push('seconds');
    if (this.use12Hour) order.push('period');
    return order;
  }

  private _advanceToNextSegment(segment: 'hours' | 'minutes' | 'seconds' | 'period') {
    const order = this._getSegmentOrder();
    const idx = order.indexOf(segment);
    if (idx < order.length - 1) {
      this._activeSegment = order[idx + 1];
      this._focusSegment(order[idx + 1]);
    }
  }

  private _clearBuffer() {
    this._inputBuffer = '';
    if (this._bufferTimer) { clearTimeout(this._bufferTimer); this._bufferTimer = null; }
  }

  private _resetBufferTimer() {
    if (this._bufferTimer) clearTimeout(this._bufferTimer);
    this._bufferTimer = setTimeout(() => { this._inputBuffer = ''; }, 1000);
  }

  private _handleDigitInput(segment: 'hours' | 'minutes' | 'seconds', digit: string) {
    if (this.disabled || this.readonly) return;

    this._inputBuffer += digit;
    this._resetBufferTimer();

    const maxFirst = segment === 'hours' ? (this.use12Hour ? 1 : 2) : 5;
    const maxVal = segment === 'hours' ? (this.use12Hour ? 12 : 23) : 59;
    const minVal = segment === 'hours' && this.use12Hour ? 1 : 0;

    if (this._inputBuffer.length === 1) {
      const d = parseInt(digit, 10);
      if (d > maxFirst) {
        // Single digit already exceeds what a valid first digit can be — commit immediately
        const clamped = Math.max(minVal, Math.min(maxVal, d));
        this._commitSegmentValue(segment, clamped);
        this._clearBuffer();
        this._advanceToNextSegment(segment);
      }
      // Otherwise wait for second digit
    } else {
      // Two digits — commit and advance
      let val = parseInt(this._inputBuffer, 10);
      val = Math.max(minVal, Math.min(maxVal, val));
      this._commitSegmentValue(segment, val);
      this._clearBuffer();
      this._advanceToNextSegment(segment);
    }
  }

  private _commitSegmentValue(segment: 'hours' | 'minutes' | 'seconds', val: number) {
    if (segment === 'hours') {
      if (this.use12Hour) {
        // Convert 12-hour input to 24-hour internal
        const wasPM = this._period === 'PM';
        let h24 = val;
        if (val === 12) h24 = wasPM ? 12 : 0;
        else if (wasPM) h24 = val + 12;
        this._hours = h24;
      } else {
        this._hours = val;
      }
    } else if (segment === 'minutes') {
      this._minutes = val;
    } else {
      this._seconds = val;
    }

    this.value = this._formatValue();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _handleKeydown(segment: 'hours' | 'minutes' | 'seconds' | 'period', e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); this._clearBuffer(); this._adjustSegment(segment, 1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._clearBuffer(); this._adjustSegment(segment, -1); return; }

    // Digit input for numeric segments
    if (/^[0-9]$/.test(e.key) && segment !== 'period') {
      e.preventDefault();
      this._handleDigitInput(segment, e.key);
      return;
    }

    // AM/PM toggle via 'a' or 'p' keys
    if (segment === 'period' && /^[aApP]$/.test(e.key)) {
      e.preventDefault();
      const target = e.key.toLowerCase() === 'a' ? 'AM' : 'PM';
      if (this._period !== target) {
        this._adjustSegment('period', 1);
      }
      return;
    }

    // Backspace clears the current segment to zero
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this._clearBuffer();
      if (segment !== 'period') {
        this._commitSegmentValue(segment, segment === 'hours' && this.use12Hour ? 12 : 0);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._clearBuffer();
      this._advanceToNextSegment(segment);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._clearBuffer();
      const order = this._getSegmentOrder();
      const idx = order.indexOf(segment);
      if (idx > 0) {
        this._activeSegment = order[idx - 1];
        this._focusSegment(order[idx - 1]);
      }
    }
  }

  private _focusSegment(segment: string) {
    const el = this.shadowRoot?.querySelector(`[data-segment="${segment}"]`) as HTMLElement;
    el?.focus();
  }

  private _handleWrapperClick(e: MouseEvent) {
    if (this.disabled || this.readonly) return;
    if ((e.target as HTMLElement).closest('.segment, .stepper, .period, .clock-icon')) return;
    const first = this.shadowRoot?.querySelector('.segment') as HTMLElement;
    first?.focus();
  }

  /* ---- Touch / swipe support ---- */
  private _touchStartY = 0;
  private _touchSegment: 'hours' | 'minutes' | 'seconds' | 'period' | null = null;
  private _handleTouchStart(segment: 'hours' | 'minutes' | 'seconds' | 'period', e: TouchEvent) {
    this._touchStartY = e.touches[0].clientY;
    this._touchSegment = segment;
  }

  private _handleTouchMove(e: TouchEvent) {
    if (!this._touchSegment) return;
    const dy = this._touchStartY - e.touches[0].clientY;
    const threshold = 20;
    if (Math.abs(dy) >= threshold) {
      // Swipe up = increment, swipe down = decrement
      this._adjustSegment(this._touchSegment, dy > 0 ? 1 : -1);
      this._touchStartY = e.touches[0].clientY;
    }
  }

  private _handleTouchEnd() {
    this._touchSegment = null;
  }

  private _chevronUp = html`<svg viewBox="0 0 12 12" fill="none"><path d="M3 7.5 6 4.5 9 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  private _chevronDown = html`<svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  private _renderSegmentCol(segment: 'hours' | 'minutes' | 'seconds') {
    return html`
      <div class="segment-col">
        <button class="stepper" tabindex="-1" aria-hidden="true"
          @click=${() => this._adjustSegment(segment, 1)}>
          ${this._chevronUp}
        </button>
        <button class="segment ${this._activeSegment === segment ? (this._isEditing(segment) ? 'editing' : 'active') : ''}"
          data-segment=${segment}
          aria-label="${segment === 'hours' ? 'Hours' : segment === 'minutes' ? 'Minutes' : 'Seconds'} — type digits or use arrow keys"
          @focus=${() => { this._focused = true; this._activeSegment = segment; this._clearBuffer(); }}
          @blur=${() => { this._focused = false; this._clearBuffer(); }}
          @keydown=${(e: KeyboardEvent) => this._handleKeydown(segment, e)}
          @touchstart=${(e: TouchEvent) => this._handleTouchStart(segment, e)}
          @touchmove=${this._handleTouchMove}
          @touchend=${this._handleTouchEnd}>
          ${this._renderSegmentContent(segment)}
        </button>
        <button class="stepper" tabindex="-1" aria-hidden="true"
          @click=${() => this._adjustSegment(segment, -1)}>
          ${this._chevronDown}
        </button>
      </div>
    `;
  }

  render() {
    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;

    const wrapperClasses = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class="${wrapperClasses}" part="input" @click=${this._handleWrapperClick}>
        <svg class="clock-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="field-group">
          ${hasLabel ? html`<span class="floating-label">${this.label}</span>` : nothing}
          <div class="segments">
          ${this._renderSegmentCol('hours')}
          <span class="separator">:</span>
          ${this._renderSegmentCol('minutes')}
          ${this.showSeconds ? html`
            <span class="separator">:</span>
            ${this._renderSegmentCol('seconds')}
          ` : nothing}
          ${this.use12Hour ? html`
            <div class="period-col">
              <button class="stepper" tabindex="-1" aria-hidden="true"
                @click=${() => this._adjustSegment('period', 1)}>
                ${this._chevronUp}
              </button>
              <button class="period ${this._activeSegment === 'period' ? 'active' : ''}"
                data-segment="period"
                aria-label="AM/PM — press A or P to change"
                @focus=${() => { this._focused = true; this._activeSegment = 'period'; this._clearBuffer(); }}
                @blur=${() => { this._focused = false; this._clearBuffer(); }}
                @keydown=${(e: KeyboardEvent) => this._handleKeydown('period', e)}
                @touchstart=${(e: TouchEvent) => this._handleTouchStart('period', e)}
                @touchmove=${this._handleTouchMove}
                @touchend=${this._handleTouchEnd}>
                ${this._period}
              </button>
              <button class="stepper" tabindex="-1" aria-hidden="true"
                @click=${() => this._adjustSegment('period', 1)}>
                ${this._chevronDown}
              </button>
            </div>
          ` : nothing}
        </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-time-picker': AmTimePicker;
  }
}
