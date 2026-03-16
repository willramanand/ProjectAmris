import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { computePosition, flip, shift, offset, size } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

export type SelectSize = 'sm' | 'md' | 'lg';

/* ================================================================
   QzOption — individual selectable option
   ================================================================ */

/**
 * Option — a single selectable option inside a qz-select.
 *
 * @slot - Option label text
 *
 * @example
 * ```html
 * <qz-option value="apple">Apple</qz-option>
 * <qz-option value="banana" disabled>Banana</qz-option>
 * ```
 */
@customElement('qz-option')
export class QzOption extends LitElement {
  /** The value associated with this option. */
  @property() value = '';

  /** Whether this option is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Whether this option is currently selected. */
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--qz-space-2);
      padding: var(--qz-space-2) var(--qz-space-3);
      font-family: var(--qz-font-sans);
      font-size: var(--qz-text-sm);
      color: var(--qz-text);
      cursor: pointer;
      user-select: none;
      transition:
        background var(--qz-duration-fast) var(--qz-ease-default),
        color var(--qz-duration-fast) var(--qz-ease-default);
    }

    :host(:hover) {
      background: var(--qz-hover-overlay);
      border-radius: var(--qz-radius-md);
      corner-shape: squircle;
    }

    :host([selected]) {
      color: var(--qz-primary);
      font-weight: var(--qz-weight-medium);
    }

    :host([disabled]) {
      opacity: var(--qz-disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
    }

    .check {
      flex-shrink: 0;
      width: 0.875rem;
      height: 0.875rem;
      color: var(--qz-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      :host { transition: none; }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'option');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('selected')) {
      this.setAttribute('aria-selected', String(this.selected));
    }
    if (changed.has('disabled')) {
      if (this.disabled) {
        this.setAttribute('aria-disabled', 'true');
      } else {
        this.removeAttribute('aria-disabled');
      }
    }
  }

  private _handleClick = () => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('qz-select-option', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    return html`
      <slot></slot>
      ${this.selected
        ? html`<svg class="check" viewBox="0 0 14 14" fill="none">
            <polyline points="2.5,7 5.5,10 11.5,4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
        : nothing}
    `;
  }
}

/* ================================================================
   QzSelect — custom dropdown select with floating label
   ================================================================ */

/**
 * Select — a custom dropdown select with floating label support.
 * Uses Floating UI for dropdown positioning.
 *
 * @slot - Option elements (qz-option)
 *
 * @csspart trigger - The select trigger button
 * @csspart listbox - The dropdown panel
 * @csspart label - The floating label element
 * @csspart clear - The clear button
 *
 * @fires qz-change - Fires on selection change with { value } detail
 *
 * @example
 * ```html
 * <qz-select label="Fruit" placeholder="Choose a fruit">
 *   <qz-option value="apple">Apple</qz-option>
 *   <qz-option value="banana">Banana</qz-option>
 *   <qz-option value="cherry">Cherry</qz-option>
 * </qz-select>
 * ```
 */
@customElement('qz-select')
export class QzSelect extends LitElement {
  static formAssociated = true;

  /** Floating label text. When set, uses the floating label pattern. */
  @property() label = '';

  /** Currently selected value. */
  @property() value = '';

  /** Placeholder text shown when no value is selected. */
  @property() placeholder = '';

  /** Form field name. */
  @property() name = '';

  /** Whether the select is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Whether the select is read-only. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  /** Whether the select is in an invalid state. */
  @property({ type: Boolean, reflect: true }) invalid = false;

  /** Whether a value is required. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Whether the select can be cleared. */
  @property({ type: Boolean, reflect: true }) clearable = false;

  /** Size variant. */
  @property({ reflect: true }) size: SelectSize = 'md';

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _highlightedIndex = -1;

  @query('.trigger') private triggerEl!: HTMLElement;
  @query('.listbox') private listboxEl!: HTMLElement;

  @queryAssignedElements({ selector: 'qz-option' })
  private _options!: QzOption[];

  private internals: ElementInternals;
  private _documentClickHandler = this._handleDocumentClick.bind(this);

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        position: relative;
      }

      /* ---- Trigger (matches qz-input wrapper styling) ---- */

      .trigger {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--qz-space-2);
        width: 100%;
        border: var(--qz-border-1) solid var(--qz-border-strong);
        border-radius: var(--qz-input-radius, var(--qz-radius-xl));
        corner-shape: squircle;
        background: var(--qz-surface);
        transition:
          border-color var(--qz-duration-fast) var(--qz-ease-default),
          box-shadow var(--qz-duration-fast) var(--qz-ease-default);
        color: var(--qz-text);
        position: relative;
        cursor: pointer;
        box-sizing: border-box;
      }

      .trigger:hover:not(.disabled) {
        border-color: var(--qz-text-tertiary);
      }

      .trigger.focused {
        border-color: var(--qz-primary);
        box-shadow: 0 0 0 var(--qz-focus-ring-width) color-mix(in srgb, var(--qz-focus-ring) 25%, transparent);
      }

      .trigger.invalid {
        border-color: var(--qz-danger);
      }

      .trigger.invalid.focused {
        box-shadow: 0 0 0 var(--qz-focus-ring-width) color-mix(in srgb, var(--qz-danger) 25%, transparent);
      }

      .trigger.disabled {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .trigger:not(.has-label) { height: var(--qz-size-sm); padding-inline: var(--qz-space-2-5); font-size: var(--qz-text-sm); }
      :host([size='md']) .trigger:not(.has-label), :host(:not([size])) .trigger:not(.has-label) { height: var(--qz-size-md); padding-inline: var(--qz-space-3); font-size: var(--qz-text-sm); }
      :host([size='lg']) .trigger:not(.has-label) { height: var(--qz-size-lg); padding-inline: var(--qz-space-4); font-size: var(--qz-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .trigger.has-label { height: 2.75rem; padding-inline: var(--qz-space-2-5); font-size: var(--qz-text-sm); }
      :host([size='md']) .trigger.has-label, :host(:not([size])) .trigger.has-label { height: 3.25rem; padding-inline: var(--qz-space-3); font-size: var(--qz-text-sm); }
      :host([size='lg']) .trigger.has-label { height: 3.5rem; padding-inline: var(--qz-space-4); font-size: var(--qz-text-base); }

      /* ---- Input group (mirrors qz-input) ---- */

      .input-group {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        position: relative;
      }

      .has-label .input-group {
        justify-content: flex-end;
        padding-bottom: 0.375rem;
      }

      .display-value {
        font: inherit;
        color: inherit;
        line-height: var(--qz-leading-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .display-value.placeholder {
        color: var(--qz-text-tertiary);
      }

      /* Hide placeholder when floating label is not floated */
      .has-label:not(.floated) .display-value.placeholder {
        color: transparent;
      }

      /* ---- Floating label ---- */

      .floating-label {
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        font-family: var(--qz-font-sans);
        font-size: inherit;
        color: var(--qz-text-tertiary);
        pointer-events: none;
        transform-origin: left center;
        transition:
          top var(--qz-duration-normal) var(--qz-ease-spring),
          transform var(--qz-duration-normal) var(--qz-ease-spring),
          font-size var(--qz-duration-normal) var(--qz-ease-spring),
          color var(--qz-duration-fast) var(--qz-ease-default);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .floated .floating-label {
        top: 0.35rem;
        transform: none;
        font-size: 0.625rem;
        color: var(--qz-text-secondary);
      }

      .focused .floating-label {
        color: var(--qz-primary);
      }

      .invalid .floating-label {
        color: var(--qz-danger);
      }

      /* ---- Chevron ---- */

      .chevron {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        color: var(--qz-text-tertiary);
        transition: transform var(--qz-duration-fast) var(--qz-ease-default);
      }

      .chevron.open {
        transform: rotate(180deg);
      }

      /* ---- Clear button ---- */

      .clear-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--qz-radius-full);
        cursor: pointer;
        color: var(--qz-text-tertiary);
        flex-shrink: 0;
        transition:
          color var(--qz-duration-fast) var(--qz-ease-default),
          background var(--qz-duration-fast) var(--qz-ease-default);
      }

      .clear-btn:hover {
        color: var(--qz-text);
        background: var(--qz-hover-overlay);
      }

      .clear-btn:focus-visible {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
      }

      /* ---- Dropdown panel ---- */

      .listbox {
        position: fixed;
        z-index: var(--qz-z-dropdown);
        background: var(--qz-surface-raised);
        border: var(--qz-border-1) solid var(--qz-border);
        border-radius: var(--qz-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--qz-shadow-lg);
        padding: var(--qz-space-1);
        max-height: 16rem;
        overflow-y: auto;
        opacity: 0;
        transform: translateY(-4px);
        pointer-events: none;
        transition:
          opacity var(--qz-duration-fast) var(--qz-ease-default),
          transform var(--qz-duration-fast) var(--qz-ease-default);
      }

      .listbox.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      @media (prefers-reduced-motion: reduce) {
        .trigger, .floating-label, .clear-btn, .chevron, .listbox { transition: none; }
      }
    `,
  ];

  private get _floated(): boolean {
    return this._focused || this._open || this.value.length > 0 || this._displayText.length > 0;
  }

  /** Get the display text for the currently selected value. */
  private get _displayText(): string {
    const options = this._options ?? [];
    const match = options.find(opt => opt.value === this.value);
    return match ? (match.textContent?.trim() ?? this.value) : '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('qz-select-option', this._handleOptionSelect as EventListener);
    document.addEventListener('click', this._documentClickHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('qz-select-option', this._handleOptionSelect as EventListener);
    document.removeEventListener('click', this._documentClickHandler);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
      this._syncOptionSelected();
    }
    if (changed.has('_open') && this._open) {
      this._updatePosition();
    }
  }

  private _syncOptionSelected() {
    const options = this._options ?? [];
    options.forEach(opt => {
      opt.selected = opt.value === this.value;
    });
  }

  private async _updatePosition() {
    if (!this.triggerEl || !this.listboxEl) return;

    const { x, y } = await computePosition(
      this.triggerEl,
      this.listboxEl,
      {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
          offset(4),
          flip(),
          shift({ padding: 8 }),
          size({
            apply({ rects, elements }) {
              Object.assign(elements.floating.style, {
                width: `${rects.reference.width}px`,
              });
            },
          }),
        ],
      },
    );

    Object.assign(this.listboxEl.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  }

  private _toggleOpen() {
    if (this.disabled || this.readonly) return;
    this._open = !this._open;
    if (this._open) {
      this._highlightedIndex = -1;
    }
  }

  private _close() {
    this._open = false;
    this._highlightedIndex = -1;
  }

  private _handleTriggerClick() {
    this._toggleOpen();
  }

  private _handleOptionSelect = (e: CustomEvent<{ value: string }>) => {
    const newValue = e.detail.value;
    if (newValue !== this.value) {
      this.value = newValue;
      this.dispatchEvent(
        new CustomEvent('qz-change', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this._close();
    this.triggerEl?.focus();
  };

  private _handleDocumentClick(e: MouseEvent) {
    if (!this._open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._close();
    }
  }

  private _handleFocus() {
    this._focused = true;
  }

  private _handleBlur() {
    this._focused = false;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    const options = this._getNavigableOptions();

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this._open && this._highlightedIndex >= 0 && this._highlightedIndex < options.length) {
          const opt = options[this._highlightedIndex];
          opt.click();
        } else {
          this._toggleOpen();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) {
          this._open = true;
          this._highlightedIndex = 0;
        } else {
          this._moveHighlight(1, options);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!this._open) {
          this._open = true;
          this._highlightedIndex = options.length - 1;
        } else {
          this._moveHighlight(-1, options);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this._close();
        this.triggerEl?.focus();
        break;

      case 'Tab':
        this._close();
        break;
    }
  }

  private _getNavigableOptions(): QzOption[] {
    return (this._options ?? []).filter(opt => !opt.disabled);
  }

  private _moveHighlight(direction: number, options: QzOption[]) {
    if (options.length === 0) return;
    let idx = this._highlightedIndex + direction;
    if (idx < 0) idx = options.length - 1;
    if (idx >= options.length) idx = 0;
    this._highlightedIndex = idx;
    this._scrollHighlightedIntoView(options[idx]);
  }

  private _scrollHighlightedIntoView(option: QzOption) {
    option.scrollIntoView?.({ block: 'nearest' });
  }

  private _handleClear(e: Event) {
    e.stopPropagation();
    if (this.value) {
      this.value = '';
      this.dispatchEvent(
        new CustomEvent('qz-change', {
          detail: { value: '' },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.triggerEl?.focus();
  }

  private _handleSlotChange() {
    this._syncOptionSelected();
    this.requestUpdate();
  }

  /** Programmatically focus the select. */
  focus(options?: FocusOptions) {
    this.triggerEl?.focus(options);
  }

  render() {
    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    const displayText = this._displayText;
    const showClear = this.clearable && this.value.length > 0 && !this.disabled && !this.readonly;

    const triggerClasses = [
      'trigger',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <button
        class=${triggerClasses}
        part="trigger"
        type="button"
        role="combobox"
        aria-expanded=${String(this._open)}
        aria-haspopup="listbox"
        aria-label=${this.label || nothing}
        aria-invalid=${this.invalid ? 'true' : nothing}
        ?disabled=${this.disabled}
        @click=${this._handleTriggerClick}
        @focus=${this._handleFocus}
        @blur=${this._handleBlur}
        @keydown=${this._handleKeyDown}
      >
        <div class="input-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <span class="display-value ${displayText ? '' : 'placeholder'}">
            ${displayText || this.placeholder}
          </span>
        </div>
        ${showClear
          ? html`
              <button
                class="clear-btn"
                part="clear"
                type="button"
                aria-label="Clear"
                @click=${this._handleClear}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            `
          : nothing}
        <svg class="chevron ${this._open ? 'open' : ''}" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div
        class="listbox ${this._open ? 'open' : ''}"
        part="listbox"
        role="listbox"
      >
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-option': QzOption;
    'qz-select': QzSelect;
  }
}
