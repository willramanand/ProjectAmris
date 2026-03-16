import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { computePosition, flip, shift, offset } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';
import '../calendar/calendar.js';

export type DatePickerSize = 'sm' | 'md' | 'lg';

/**
 * Date Picker — an input that opens a calendar dropdown for date selection.
 *
 * @csspart input - The native input element
 * @csspart calendar - The calendar dropdown
 *
 * @fires am-change - Fires when a date is selected with { value } detail (ISO string)
 *
 * @example
 * ```html
 * <am-date-picker label="Start date" placeholder="YYYY-MM-DD"></am-date-picker>
 * <am-date-picker value="2025-06-15" min="2025-01-01" max="2025-12-31"></am-date-picker>
 * ```
 */
@customElement('am-date-picker')
export class AmDatePicker extends LitElement {
  static formAssociated = true;

  @property() label = '';
  @property() value = '';
  @property() placeholder = 'YYYY-MM-DD';
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

  @query('.wrapper') private _wrapper!: HTMLElement;
  @query('.dropdown') private _dropdown!: HTMLElement;

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .label {
        display: block;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      .wrapper {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border-strong);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
        cursor: text;
      }

      :host([size='sm']) .wrapper { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper, :host(:not([size])) .wrapper { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      .wrapper.invalid.focused {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      :host([disabled]) .wrapper { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      .calendar-icon {
        width: 1rem; height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        cursor: pointer;
      }

      input {
        all: unset;
        flex: 1;
        min-width: 0;
        font: inherit;
        color: var(--am-text);
      }

      input::placeholder { color: var(--am-text-tertiary); }

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

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .dropdown { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this._internals.setFormValue(this.value);
    }
    if (this._open) this._updatePosition();
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (this._open && !e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  private _handleInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    this.value = raw;
    // Validate YYYY-MM-DD pattern
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      this.dispatchEvent(new CustomEvent('am-change', { detail: { value: raw }, bubbles: true, composed: true }));
    }
  }

  private _handleCalendarChange(e: CustomEvent<{ value: string }>) {
    this.value = e.detail.value;
    this._open = false;
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _toggleCalendar() {
    if (this.disabled || this.readonly) return;
    this._open = !this._open;
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this._open) {
      e.preventDefault();
      this._open = false;
    }
  }

  private async _updatePosition() {
    if (!this._wrapper || !this._dropdown) return;
    const { x, y } = await computePosition(this._wrapper, this._dropdown, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    });
    Object.assign(this._dropdown.style, { left: `${x}px`, top: `${y}px` });
  }

  render() {
    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="wrapper ${this._focused ? 'focused' : ''} ${this.invalid ? 'invalid' : ''}">
        <svg class="calendar-icon" viewBox="0 0 16 16" fill="none" @click=${this._toggleCalendar}>
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 7h12M5 1v3M11 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          part="input"
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          aria-label=${this.label || 'Date'}
          aria-invalid=${this.invalid ? 'true' : nothing}
          @input=${this._handleInput}
          @focus=${() => { this._focused = true; }}
          @blur=${() => { this._focused = false; }}
          @keydown=${this._handleKeydown}
          @click=${this._toggleCalendar}
        />
      </div>
      <div class="dropdown ${this._open ? 'open' : ''}" part="calendar">
        <am-calendar
          value=${this.value || nothing}
          min=${this.min || nothing}
          max=${this.max || nothing}
          @am-change=${this._handleCalendarChange}
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
