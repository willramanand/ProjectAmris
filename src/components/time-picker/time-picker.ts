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
 * @fires am-change - Fires when the time changes with { value } detail (HH:MM or HH:MM:SS)
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

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: block; font-family: var(--am-font-sans); }
      :host([disabled]) { pointer-events: none; }

      .label {
        display: block;
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      .wrapper {
        display: inline-flex;
        align-items: center;
        gap: var(--am-space-1);
        border: var(--am-border-1) solid var(--am-border-strong);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
      }

      :host([size='sm']) .wrapper { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper, :host(:not([size])) .wrapper { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

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
      }

      .segment:hover { background: var(--am-hover-overlay); }
      .segment.active { background: var(--am-primary-subtle); color: var(--am-primary); }
      .segment:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .separator { color: var(--am-text-tertiary); }

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
      }

      .period:hover { background: var(--am-hover-overlay); }
      .period.active { background: var(--am-primary-subtle); color: var(--am-primary); }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .segment, .period { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._parseValue();
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
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleKeydown(segment: 'hours' | 'minutes' | 'seconds' | 'period', e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); this._adjustSegment(segment, 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._adjustSegment(segment, -1); }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const order: Array<'hours' | 'minutes' | 'seconds' | 'period'> = ['hours', 'minutes'];
      if (this.showSeconds) order.push('seconds');
      if (this.use12Hour) order.push('period');
      const idx = order.indexOf(segment);
      if (idx < order.length - 1) {
        this._activeSegment = order[idx + 1];
        this._focusSegment(order[idx + 1]);
      }
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const order: Array<'hours' | 'minutes' | 'seconds' | 'period'> = ['hours', 'minutes'];
      if (this.showSeconds) order.push('seconds');
      if (this.use12Hour) order.push('period');
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

  render() {
    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="wrapper ${this._focused ? 'focused' : ''} ${this.invalid ? 'invalid' : ''}" part="input">
        <svg class="clock-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="segments">
          <button class="segment ${this._activeSegment === 'hours' ? 'active' : ''}"
            data-segment="hours"
            aria-label="Hours"
            @focus=${() => { this._focused = true; this._activeSegment = 'hours'; }}
            @blur=${() => { this._focused = false; }}
            @keydown=${(e: KeyboardEvent) => this._handleKeydown('hours', e)}
            @click=${() => this._adjustSegment('hours', 1)}>
            ${this._displayHours()}
          </button>
          <span class="separator">:</span>
          <button class="segment ${this._activeSegment === 'minutes' ? 'active' : ''}"
            data-segment="minutes"
            aria-label="Minutes"
            @focus=${() => { this._focused = true; this._activeSegment = 'minutes'; }}
            @blur=${() => { this._focused = false; }}
            @keydown=${(e: KeyboardEvent) => this._handleKeydown('minutes', e)}
            @click=${() => this._adjustSegment('minutes', 1)}>
            ${String(this._minutes).padStart(2, '0')}
          </button>
          ${this.showSeconds ? html`
            <span class="separator">:</span>
            <button class="segment ${this._activeSegment === 'seconds' ? 'active' : ''}"
              data-segment="seconds"
              aria-label="Seconds"
              @focus=${() => { this._focused = true; this._activeSegment = 'seconds'; }}
              @blur=${() => { this._focused = false; }}
              @keydown=${(e: KeyboardEvent) => this._handleKeydown('seconds', e)}
              @click=${() => this._adjustSegment('seconds', 1)}>
              ${String(this._seconds).padStart(2, '0')}
            </button>
          ` : nothing}
          ${this.use12Hour ? html`
            <button class="period ${this._activeSegment === 'period' ? 'active' : ''}"
              data-segment="period"
              aria-label="AM/PM"
              @focus=${() => { this._focused = true; this._activeSegment = 'period'; }}
              @blur=${() => { this._focused = false; }}
              @keydown=${(e: KeyboardEvent) => this._handleKeydown('period', e)}
              @click=${() => this._adjustSegment('period', 1)}>
              ${this._period}
            </button>
          ` : nothing}
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
