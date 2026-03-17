import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type CalendarSize = 'sm' | 'md' | 'lg';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calendar — an inline month calendar for date selection.
 *
 * @csspart grid - The day grid
 * @csspart header - The month/year navigation header
 * @csspart day - Each day cell
 *
 * @fires am-change - Fires when a date is selected with { value } detail (ISO string)
 *
 * @example
 * ```html
 * <am-calendar></am-calendar>
 * <am-calendar value="2025-03-15" min="2025-01-01" max="2025-12-31"></am-calendar>
 * ```
 */
@customElement('am-calendar')
export class AmCalendar extends LitElement {
  /** Selected date as ISO string (YYYY-MM-DD). */
  @property() value = '';

  /** Minimum selectable date (YYYY-MM-DD). */
  @property() min = '';

  /** Maximum selectable date (YYYY-MM-DD). */
  @property() max = '';

  @property({ reflect: true }) size: CalendarSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() private _viewYear = new Date().getFullYear();
  @state() private _viewMonth = new Date().getMonth();
  @state() private _pickerView: 'days' | 'months' | 'years' = 'days';
  @state() private _yearRangeStart = Math.floor(new Date().getFullYear() / 12) * 12;

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-block;
        font-family: var(--am-font-sans);
      }

      :host([disabled]) { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .calendar {
        background: var(--am-surface);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        padding: var(--am-space-3);
        user-select: none;
      }

      :host([size='sm']) .calendar { width: 16rem; font-size: var(--am-text-xs); }
      :host([size='md']) .calendar, :host(:not([size])) .calendar { width: 18rem; font-size: var(--am-text-sm); }
      :host([size='lg']) .calendar { width: 22rem; font-size: var(--am-text-base); }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--am-space-2);
      }

      .month-label {
        all: unset;
        font-weight: var(--am-weight-semibold);
        font-size: inherit;
        color: var(--am-text);
        cursor: pointer;
        padding: var(--am-space-1) var(--am-space-2);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .month-label:hover { background: var(--am-hover-overlay); }
      .month-label:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .nav-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        color: var(--am-text-secondary);
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
      }

      .nav-btn:hover { background: var(--am-hover-overlay); color: var(--am-text); }
      .nav-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .day-names {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        color: var(--am-text-tertiary);
        font-size: var(--am-text-xs);
        font-weight: var(--am-weight-medium);
        margin-bottom: var(--am-space-1);
      }

      .day-names span { padding: var(--am-space-1) 0; }

      .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
      }

      .day {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        font-size: inherit;
        color: var(--am-text);
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .day:hover:not(.selected):not([disabled]) { background: var(--am-hover-overlay); }
      .day:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .day.outside { color: var(--am-text-tertiary); }
      .day.today { font-weight: var(--am-weight-semibold); color: var(--am-primary); }

      .day.selected {
        background: var(--am-primary);
        color: var(--am-primary-text);
        font-weight: var(--am-weight-semibold);
      }

      .day[disabled] { opacity: var(--am-disabled-opacity); cursor: not-allowed; pointer-events: none; }

      /* ---- Month / Year picker grid ---- */

      .picker-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--am-space-1);
      }

      .picker-cell {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--am-space-2-5) var(--am-space-1);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        font-size: inherit;
        color: var(--am-text);
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .picker-cell:hover:not(.selected) { background: var(--am-hover-overlay); }
      .picker-cell:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .picker-cell.selected {
        background: var(--am-primary);
        color: var(--am-primary-text);
        font-weight: var(--am-weight-semibold);
      }

      .picker-cell.current {
        font-weight: var(--am-weight-semibold);
        color: var(--am-primary);
      }

      .year-label {
        all: unset;
        font-weight: var(--am-weight-semibold);
        font-size: inherit;
        color: var(--am-text);
        cursor: pointer;
        padding: var(--am-space-1) var(--am-space-2);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .year-label:hover { background: var(--am-hover-overlay); }
      .year-label:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      @media (prefers-reduced-motion: reduce) {
        .nav-btn, .day, .picker-cell, .month-label, .year-label { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (this.value) {
      const d = new Date(this.value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        this._viewYear = d.getFullYear();
        this._viewMonth = d.getMonth();
      }
    }
  }

  private _prevMonth() {
    if (this._viewMonth === 0) { this._viewMonth = 11; this._viewYear--; }
    else this._viewMonth--;
  }

  private _nextMonth() {
    if (this._viewMonth === 11) { this._viewMonth = 0; this._viewYear++; }
    else this._viewMonth++;
  }

  private _prevYear() { this._viewYear--; }
  private _nextYear() { this._viewYear++; }
  private _prevYearRange() { this._yearRangeStart -= 12; }
  private _nextYearRange() { this._yearRangeStart += 12; }

  private _showMonths() { this._pickerView = 'months'; }

  private _showYears() {
    this._yearRangeStart = Math.floor(this._viewYear / 12) * 12;
    this._pickerView = 'years';
  }

  private _selectMonth(month: number) {
    this._viewMonth = month;
    this._pickerView = 'days';
  }

  private _selectYear(year: number) {
    this._viewYear = year;
    this._pickerView = 'months';
  }

  private _selectDate(dateStr: string) {
    this.value = dateStr;
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: dateStr }, bubbles: true, composed: true }));
  }

  private _isDisabled(dateStr: string): boolean {
    if (this.min && dateStr < this.min) return true;
    if (this.max && dateStr > this.max) return true;
    return false;
  }

  private _getDays(): Array<{ date: number; month: number; year: number; iso: string; outside: boolean }> {
    const year = this._viewYear;
    const month = this._viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days: Array<{ date: number; month: number; year: number; iso: string; outside: boolean }> = [];

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: d, month: m, year: y, iso: this._toISO(y, m, d), outside: true });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, month, year, iso: this._toISO(year, month, d), outside: false });
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({ date: d, month: m, year: y, iso: this._toISO(y, m, d), outside: true });
    }

    return days;
  }

  private _toISO(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private _isToday(iso: string): boolean {
    const now = new Date();
    return iso === this._toISO(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private _renderDaysView() {
    const days = this._getDays();

    return html`
      <div class="header" part="header">
        <button class="nav-btn" aria-label="Previous month" @click=${this._prevMonth}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="month-label" @click=${this._showMonths}>
          ${MONTHS[this._viewMonth]} ${this._viewYear}
        </button>
        <button class="nav-btn" aria-label="Next month" @click=${this._nextMonth}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="day-names">
        ${DAYS.map(d => html`<span>${d}</span>`)}
      </div>
      <div class="grid" part="grid" role="grid">
        ${days.map(day => {
          const selected = day.iso === this.value;
          const today = this._isToday(day.iso);
          const disabled = this._isDisabled(day.iso);
          return html`
            <button class="day ${day.outside ? 'outside' : ''} ${selected ? 'selected' : ''} ${today ? 'today' : ''}"
              part="day"
              ?disabled=${disabled}
              aria-label=${day.iso}
              aria-selected=${selected ? 'true' : nothing}
              @click=${() => this._selectDate(day.iso)}>
              ${day.date}
            </button>
          `;
        })}
      </div>
    `;
  }

  private _renderMonthsView() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return html`
      <div class="header" part="header">
        <button class="nav-btn" aria-label="Previous year" @click=${this._prevYear}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="year-label" @click=${this._showYears}>
          ${this._viewYear}
        </button>
        <button class="nav-btn" aria-label="Next year" @click=${this._nextYear}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="picker-grid">
        ${SHORT_MONTHS.map((name, i) => {
          const selected = i === this._viewMonth && this._viewYear === currentYear;
          const isCurrent = i === currentMonth && this._viewYear === currentYear;
          return html`
            <button class="picker-cell ${selected ? 'selected' : ''} ${isCurrent && !selected ? 'current' : ''}"
              @click=${() => this._selectMonth(i)}>
              ${name}
            </button>
          `;
        })}
      </div>
    `;
  }

  private _renderYearsView() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => this._yearRangeStart + i);
    const rangeLabel = `${this._yearRangeStart} – ${this._yearRangeStart + 11}`;

    return html`
      <div class="header" part="header">
        <button class="nav-btn" aria-label="Previous year range" @click=${this._prevYearRange}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="month-label" style="cursor: default;">${rangeLabel}</span>
        <button class="nav-btn" aria-label="Next year range" @click=${this._nextYearRange}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="picker-grid">
        ${years.map(year => {
          const selected = year === this._viewYear;
          const isCurrent = year === currentYear;
          return html`
            <button class="picker-cell ${selected ? 'selected' : ''} ${isCurrent && !selected ? 'current' : ''}"
              @click=${() => this._selectYear(year)}>
              ${year}
            </button>
          `;
        })}
      </div>
    `;
  }

  render() {
    return html`
      <div class="calendar">
        ${this._pickerView === 'days' ? this._renderDaysView()
        : this._pickerView === 'months' ? this._renderMonthsView()
        : this._renderYearsView()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-calendar': AmCalendar;
  }
}
