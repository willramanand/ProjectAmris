import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, offset } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';
import '../calendar/calendar.js';

export type DatePickerSize = 'sm' | 'md' | 'lg';

/**
 * Date Picker — an input that opens a calendar dropdown for date selection.
 *
 * Uses separate year/month/day segments with keyboard digit input.
 * Typing digits auto-advances between segments; arrow keys increment/decrement.
 *
 * @csspart input - The date input container
 * @csspart calendar - The calendar dropdown
 *
 * @fires input - Fires when a date is selected
 * @fires change - Fires when a date is selected
 *
 * @example
 * ```html
 * <am-date-picker label="Start date"></am-date-picker>
 * <am-date-picker value="2025-06-15" min="2025-01-01" max="2025-12-31"></am-date-picker>
 * ```
 */
@customElement('am-date-picker')
export class AmDatePicker extends LitElement {
  static formAssociated = true;

  @property() label = '';
  @property() value = '';
  @property() name = '';
  @property() min = '';
  @property() max = '';
  @property({ reflect: true }) size: DatePickerSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _year = new Date().getFullYear();
  @state() private _month = new Date().getMonth() + 1;
  @state() private _day = new Date().getDate();
  @state() private _hasValue = false;
  @state() private _activeSegment: 'year' | 'month' | 'day' = 'month';
  @state() private _inputBuffer = '';

  private get _floated(): boolean {
    return this._focused || this._hasValue;
  }

  @query('.wrapper') private _wrapper!: HTMLElement;
  @query('.dropdown') private _dropdown!: HTMLElement;

  private _internals: ElementInternals;
  private _cleanupAutoUpdate: (() => void) | null = null;
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

      .wrapper:hover:not(.disabled) { border-color: var(--am-border-strong); }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      .wrapper.invalid.focused {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      :host([disabled]) .wrapper { opacity: var(--am-disabled-opacity); }

      .calendar-icon {
        width: 1rem; height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        cursor: pointer;
      }

      .segments {
        display: flex;
        align-items: center;
        gap: 0;
        font-variant-numeric: tabular-nums;
      }

      .segment {
        all: unset;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        padding: var(--am-space-0-5) 0;
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        cursor: pointer;
        color: var(--am-text);
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .segment.seg-month,
      .segment.seg-day { min-width: 1.5em; }
      .segment.seg-year { min-width: 2.75em; }

      .segment:hover { background: var(--am-hover-overlay); }
      .segment.active { background: var(--am-primary-subtle); color: var(--am-primary); }
      .segment.editing { background: var(--am-primary); color: var(--am-primary-text); }
      .segment:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .seg-text { display: inline; }
      .seg-placeholder { opacity: 0.4; }
      .seg-placeholder-text { color: var(--am-text-tertiary); }

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

      .separator { color: var(--am-text-tertiary); padding: 0 1px; }

      .dropdown {
        position: fixed;
        z-index: var(--am-z-dropdown);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .dropdown.open { opacity: 1; pointer-events: auto; }

      .dropdown am-calendar {
        --am-border: transparent;
        box-shadow: var(--am-shadow-lg);
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
        .wrapper, .segment, .dropdown, .floating-label { transition: none; }
        .caret { animation: none; opacity: 1; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
    this._parseValue();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
    if (this._bufferTimer) clearTimeout(this._bufferTimer);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value') && changed.get('value') !== undefined) {
      this._parseValue();
    }
    this._internals.setFormValue(this._hasValue ? this._formatValue() : '');
    if (changed.has('_open')) {
      if (this._open) {
        this._startAutoUpdate();
      } else {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
      }
    }
  }

  private _startAutoUpdate() {
    this._cleanupAutoUpdate?.();
    if (!this._wrapper || !this._dropdown) return;
    this._cleanupAutoUpdate = autoUpdate(this._wrapper, this._dropdown, () => this._updatePosition());
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (this._open && !e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  /* ---- Value parsing / formatting ---- */

  private _daysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate();
  }

  private _parseValue() {
    if (!this.value) {
      this._hasValue = false;
      return;
    }
    const match = this.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      this._year = parseInt(match[1], 10);
      this._month = Math.max(1, Math.min(12, parseInt(match[2], 10)));
      this._day = Math.max(1, Math.min(this._daysInMonth(this._month, this._year), parseInt(match[3], 10)));
      this._hasValue = true;
    }
  }

  private _formatValue(): string {
    const yyyy = String(this._year).padStart(4, '0');
    const mm = String(this._month).padStart(2, '0');
    const dd = String(this._day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private _clampDay() {
    const maxDay = this._daysInMonth(this._month, this._year);
    if (this._day > maxDay) this._day = maxDay;
  }

  private _emitChange() {
    this.value = this._formatValue();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /* ---- Segment navigation ---- */

  private _getSegmentOrder(): Array<'year' | 'month' | 'day'> {
    return ['year', 'month', 'day'];
  }

  private _advanceToNextSegment(segment: 'year' | 'month' | 'day') {
    const order = this._getSegmentOrder();
    const idx = order.indexOf(segment);
    if (idx < order.length - 1) {
      this._activeSegment = order[idx + 1];
      this._focusSegment(order[idx + 1]);
    }
  }

  private _focusSegment(segment: string) {
    const el = this.shadowRoot?.querySelector(`[data-segment="${segment}"]`) as HTMLElement;
    el?.focus();
  }

  /* ---- Buffer management ---- */

  private _clearBuffer() {
    this._inputBuffer = '';
    if (this._bufferTimer) { clearTimeout(this._bufferTimer); this._bufferTimer = null; }
  }

  private _resetBufferTimer() {
    if (this._bufferTimer) clearTimeout(this._bufferTimer);
    this._bufferTimer = setTimeout(() => { this._inputBuffer = ''; }, 1000);
  }

  /* ---- Digit input ---- */

  private _isEditing(segment: 'year' | 'month' | 'day'): boolean {
    return this._activeSegment === segment && this._inputBuffer.length > 0;
  }

  private _ensureValue() {
    if (!this._hasValue) {
      const now = new Date();
      this._year = now.getFullYear();
      this._month = now.getMonth() + 1;
      this._day = now.getDate();
      this._hasValue = true;
      this._inputBuffer = '';
    }
  }

  private _handleDigitInput(segment: 'year' | 'month' | 'day', digit: string) {
    if (this.disabled || this.readonly) return;

    this._ensureValue();
    this._inputBuffer += digit;
    this._resetBufferTimer();

    if (segment === 'year') {
      if (this._inputBuffer.length >= 4) {
        let val = parseInt(this._inputBuffer.slice(0, 4), 10);
        val = Math.max(1, Math.min(9999, val));
        this._year = val;
        this._clampDay();
        this._emitChange();
        this._clearBuffer();
        this._advanceToNextSegment(segment);
      }
    } else if (segment === 'month') {
      if (this._inputBuffer.length === 1) {
        const d = parseInt(digit, 10);
        if (d > 1) {
          this._month = Math.max(1, Math.min(12, d));
          this._clampDay();
          this._emitChange();
          this._clearBuffer();
          this._advanceToNextSegment(segment);
        }
      } else {
        let val = parseInt(this._inputBuffer, 10);
        val = Math.max(1, Math.min(12, val));
        this._month = val;
        this._clampDay();
        this._emitChange();
        this._clearBuffer();
        this._advanceToNextSegment(segment);
      }
    } else {
      const maxDays = this._daysInMonth(this._month, this._year);
      const maxFirst = Math.floor(maxDays / 10);
      if (this._inputBuffer.length === 1) {
        const d = parseInt(digit, 10);
        if (d > maxFirst) {
          this._day = Math.max(1, Math.min(maxDays, d));
          this._emitChange();
          this._clearBuffer();
          this._advanceToNextSegment(segment);
        }
      } else {
        let val = parseInt(this._inputBuffer, 10);
        val = Math.max(1, Math.min(maxDays, val));
        this._day = val;
        this._emitChange();
        this._clearBuffer();
        this._advanceToNextSegment(segment);
      }
    }
  }

  /* ---- Arrow key adjustment ---- */

  private _adjustSegment(segment: 'year' | 'month' | 'day', delta: number) {
    if (this.disabled || this.readonly) return;

    this._ensureValue();

    if (segment === 'year') {
      this._year = Math.max(1, Math.min(9999, this._year + delta));
      this._clampDay();
    } else if (segment === 'month') {
      this._month = ((this._month - 1 + delta + 12) % 12) + 1;
      this._clampDay();
    } else {
      const maxDays = this._daysInMonth(this._month, this._year);
      this._day = ((this._day - 1 + delta + maxDays) % maxDays) + 1;
    }

    this._emitChange();
  }

  /* ---- Keyboard handler ---- */

  private _handleKeydown(segment: 'year' | 'month' | 'day', e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); this._clearBuffer(); this._adjustSegment(segment, 1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._clearBuffer(); this._adjustSegment(segment, -1); return; }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      this._handleDigitInput(segment, e.key);
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this._clearBuffer();
      if (this._hasValue) {
        if (segment === 'year') this._year = new Date().getFullYear();
        else if (segment === 'month') { this._month = 1; this._clampDay(); }
        else this._day = 1;
        this._emitChange();
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === '/' || e.key === '-') {
      e.preventDefault();
      this._clearBuffer();
      this._advanceToNextSegment(segment);
      return;
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
      return;
    }

    if (e.key === 'Escape' && this._open) {
      e.preventDefault();
      this._open = false;
    }
  }

  /* ---- Calendar ---- */

  private _toggleCalendar() {
    if (this.disabled || this.readonly) return;
    this._open = !this._open;
  }

  private _handleWrapperClick(e: MouseEvent) {
    if (this.disabled || this.readonly) return;
    if ((e.target as HTMLElement).closest('.segment, .calendar-icon')) return;
    const first = this.shadowRoot?.querySelector('.segment') as HTMLElement;
    first?.focus();
  }

  private _handleCalendarChange(e: Event) {
    this.value = (e.target as HTMLElement & { value: string }).value;
    this._open = false;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /* ---- Floating UI ---- */

  private async _updatePosition() {
    if (!this._wrapper || !this._dropdown) return;
    const { x, y } = await computePosition(this._wrapper, this._dropdown, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    });
    Object.assign(this._dropdown.style, { left: `${x}px`, top: `${y}px` });
  }

  /* ---- Rendering ---- */

  private _renderSegmentContent(segment: 'year' | 'month' | 'day') {
    if (this._isEditing(segment)) {
      const maxLen = segment === 'year' ? 4 : 2;
      const remaining = maxLen - this._inputBuffer.length;
      return html`<span class="seg-text">${this._inputBuffer}</span>${remaining > 0 ? html`<span class="seg-placeholder">${'\u2013'.repeat(remaining)}</span>` : nothing}<span class="caret"></span>`;
    }
    if (!this._hasValue) {
      const ph = segment === 'year' ? 'YYYY' : segment === 'month' ? 'MM' : 'DD';
      return html`<span class="seg-placeholder-text">${ph}</span>`;
    }
    if (segment === 'year') return String(this._year).padStart(4, '0');
    if (segment === 'month') return String(this._month).padStart(2, '0');
    return String(this._day).padStart(2, '0');
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
        <svg class="calendar-icon" viewBox="0 0 16 16" fill="none" @click=${this._toggleCalendar}>
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 7h12M5 1v3M11 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="field-group">
          ${hasLabel ? html`<span class="floating-label">${this.label}</span>` : nothing}
          <div class="segments">
          <button class="segment seg-year ${this._activeSegment === 'year' ? (this._isEditing('year') ? 'editing' : 'active') : ''}"
            data-segment="year"
            aria-label="Year — type digits or use arrow keys"
            @focus=${() => { this._focused = true; this._activeSegment = 'year'; this._clearBuffer(); }}
            @blur=${() => { this._focused = false; this._clearBuffer(); }}
            @keydown=${(e: KeyboardEvent) => this._handleKeydown('year', e)}>
            ${this._renderSegmentContent('year')}
          </button>
          <span class="separator">-</span>
          <button class="segment seg-month ${this._activeSegment === 'month' ? (this._isEditing('month') ? 'editing' : 'active') : ''}"
            data-segment="month"
            aria-label="Month — type digits or use arrow keys"
            @focus=${() => { this._focused = true; this._activeSegment = 'month'; this._clearBuffer(); }}
            @blur=${() => { this._focused = false; this._clearBuffer(); }}
            @keydown=${(e: KeyboardEvent) => this._handleKeydown('month', e)}>
            ${this._renderSegmentContent('month')}
          </button>
          <span class="separator">-</span>
          <button class="segment seg-day ${this._activeSegment === 'day' ? (this._isEditing('day') ? 'editing' : 'active') : ''}"
            data-segment="day"
            aria-label="Day — type digits or use arrow keys"
            @focus=${() => { this._focused = true; this._activeSegment = 'day'; this._clearBuffer(); }}
            @blur=${() => { this._focused = false; this._clearBuffer(); }}
            @keydown=${(e: KeyboardEvent) => this._handleKeydown('day', e)}>
            ${this._renderSegmentContent('day')}
          </button>
        </div>
        </div>
      </div>
      <div class="dropdown ${this._open ? 'open' : ''}" part="calendar">
        <am-calendar
          value=${this._hasValue ? this._formatValue() : nothing}
          min=${this.min || nothing}
          max=${this.max || nothing}
          @change=${this._handleCalendarChange}
        ></am-calendar>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-date-picker': AmDatePicker;
  }
}

