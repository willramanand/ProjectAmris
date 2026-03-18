import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { computePosition, autoUpdate, flip, shift, offset, size as sizeMiddleware } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

export type ComboboxSize = 'sm' | 'md' | 'lg';

/**
 * Combobox — a text input with a filterable dropdown list.
 * Typing filters the available options; selecting an option sets the value.
 *
 * @csspart input - The native input element
 * @csspart listbox - The dropdown panel
 * @csspart label - The floating label element
 *
 * @fires qz-input - Fires on input with { value } detail
 * @fires qz-change - Fires on selection with { value } detail
 *
 * @example
 * ```html
 * <qz-combobox label="Country" .options=${['Canada', 'Chile', 'China']}></qz-combobox>
 * ```
 */
@customElement('am-combobox')
export class AmCombobox extends LitElement {
  static formAssociated = true;

  /** Floating label text. When set, uses the floating label pattern. */
  @property() label = '';

  @property() value = '';
  @property() placeholder = '';
  @property() name = '';
  @property({ reflect: true }) size: ComboboxSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;

  /** When true, uses a select-style trigger with search inside the dropdown. */
  @property({ type: Boolean, reflect: true }) select = false;

  /** List of available options. Set via property, not attribute. */
  @property({ type: Array }) options: string[] = [];

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _highlightedIndex = -1;
  @state() private _dropdownQuery = '';
  @state() private _slottedOptions: string[] = [];

  @query('input') private inputEl!: HTMLInputElement;
  @query('.listbox') private listboxEl!: HTMLElement;
  @query('.dropdown-search') private _dropdownSearchEl!: HTMLInputElement;

  private internals: ElementInternals;
  private _cleanupAutoUpdate: (() => void) | null = null;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .wrapper {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          border-color var(--am-duration-fast) var(--am-ease-default),
          box-shadow var(--am-duration-fast) var(--am-ease-default);
        color: var(--am-text);
        position: relative;
        cursor: text;
      }

      .wrapper:hover:not(.disabled) {
        border-color: var(--am-border-strong);
      }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid {
        border-color: var(--am-danger);
      }

      .wrapper.invalid.focused {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      .wrapper.disabled {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .wrapper:not(.has-label) { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper:not(.has-label), :host(:not([size])) .wrapper:not(.has-label) { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper:not(.has-label) { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .wrapper.has-label { height: 3rem; padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper.has-label, :host(:not([size])) .wrapper.has-label { height: 3.5rem; padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper.has-label { height: 3.75rem; padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Input field ---- */

      .input-group {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        position: relative;
      }

      /* When label is floating, shift input down */
      .has-label .input-group {
        justify-content: flex-end;
        padding-bottom: 0.625rem;
      }

      input {
        all: unset;
        width: 100%;
        font: inherit;
        color: inherit;
        line-height: 1.25;
      }

      input::placeholder {
        color: var(--am-text-tertiary);
      }

      input:disabled {
        cursor: not-allowed;
      }

      /* Hide native placeholder when floating label is not floated */
      .has-label:not(.floated) input::placeholder {
        color: transparent;
      }

      /* ---- Floating label ---- */

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
        color: var(--am-text-secondary);
      }

      .focused .floating-label {
        color: var(--am-primary);
      }

      .invalid .floating-label {
        color: var(--am-danger);
      }

      /* ---- Chevron ---- */

      .chevron {
        width: 1rem;
        height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--am-duration-fast) var(--am-ease-default);
        pointer-events: none;
      }

      .chevron.open {
        transform: rotate(180deg);
      }

      /* ---- Dropdown panel ---- */

      .listbox {
        position: fixed;
        z-index: var(--am-z-dropdown);
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-lg);
        padding: var(--am-space-1);
        max-height: 16rem;
        overflow-y: auto;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .listbox.open {
        opacity: 1;
        pointer-events: auto;
      }

      .option {
        padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-sm);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .option:hover,
      .option.highlighted {
        background: var(--am-hover-overlay);
      }

      .empty {
        padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
        text-align: center;
      }

      /* ---- Select mode ---- */

      .select-display {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font: inherit;
        color: var(--am-text);
        line-height: 1.25;
      }

      .select-display.placeholder { color: var(--am-text-tertiary); }

      .options-slot { display: none; }

      .dropdown-search-wrapper {
        padding: var(--am-space-1) var(--am-space-2) var(--am-space-2);
        position: sticky;
        top: 0;
        background: var(--am-surface-raised);
      }

      .dropdown-search {
        all: unset;
        width: 100%;
        box-sizing: border-box;
        padding: var(--am-space-1-5) var(--am-space-2);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
      }

      .dropdown-search::placeholder { color: var(--am-text-tertiary); }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .floating-label, .chevron, .listbox, .option { transition: none; }
      }
    `,
  ];

  /** Merged options from property + slotted am-option elements. */
  private get _allOptions(): string[] {
    return [...this.options, ...this._slottedOptions];
  }

  private _handleOptionsSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    const nodes = slot.assignedElements({ flatten: true });
    this._slottedOptions = nodes
      .filter((el): el is HTMLElement => el.tagName === 'AM-OPTION')
      .map(el => (el as any).value || el.textContent?.trim() || '');
  }

  private get _floated(): boolean {
    return this._focused || this.value.length > 0;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleDocumentClick);
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
    }
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
    const wrapper = this.shadowRoot?.querySelector('.wrapper') as HTMLElement;
    if (!wrapper || !this.listboxEl) return;
    this._cleanupAutoUpdate = autoUpdate(wrapper, this.listboxEl, () => this._updatePosition());
  }

  private _handleDocumentClick = (e: MouseEvent) => {
    if (!this._open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._open = false;
    }
  };

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this._highlightedIndex = -1;

    if (!this._open && this.value.length > 0) {
      this._open = true;
    }

    this.dispatchEvent(new CustomEvent('am-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleFocus() {
    this._focused = true;
    if (this._allOptions.length > 0) {
      this._open = true;
    }
  }

  private _handleBlur() {
    this._focused = false;
  }

  private _handleKeydown(e: KeyboardEvent) {
    const filtered = this._allOptions.filter(o => o.toLowerCase().includes(this.value.toLowerCase()));

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) {
          this._open = true;
        }
        this._highlightedIndex = Math.min(this._highlightedIndex + 1, filtered.length - 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;

      case 'Enter':
        if (this._open && this._highlightedIndex >= 0 && this._highlightedIndex < filtered.length) {
          e.preventDefault();
          this._selectOption(filtered[this._highlightedIndex]);
        }
        break;

      case 'Escape':
        if (this._open) {
          e.preventDefault();
          this._open = false;
          this._highlightedIndex = -1;
        }
        break;

      case 'Tab':
        this._open = false;
        this._highlightedIndex = -1;
        break;
    }
  }

  private _selectOption(option: string) {
    this.value = option;
    this._open = false;
    this._highlightedIndex = -1;
    this._dropdownQuery = '';
    if (!this.select) this.inputEl?.focus();
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleDropdownSearch(e: Event) {
    this._dropdownQuery = (e.target as HTMLInputElement).value;
    this._highlightedIndex = -1;
  }

  private _handleDropdownSearchKeydown(e: KeyboardEvent) {
    const filtered = this._selectFilteredOptions;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._highlightedIndex = Math.min(this._highlightedIndex + 1, filtered.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;
      case 'Enter':
        if (this._highlightedIndex >= 0 && this._highlightedIndex < filtered.length) {
          e.preventDefault();
          this._selectOption(filtered[this._highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._open = false;
        this._highlightedIndex = -1;
        this._dropdownQuery = '';
        break;
    }
  }

  private get _selectFilteredOptions(): string[] {
    if (!this._dropdownQuery) return this._allOptions;
    const q = this._dropdownQuery.toLowerCase();
    return this._allOptions.filter(o => o.toLowerCase().includes(q));
  }

  private _toggleSelect() {
    if (this.disabled) return;
    this._open = !this._open;
    if (this._open) {
      this._dropdownQuery = '';
      this._highlightedIndex = -1;
      requestAnimationFrame(() => this._dropdownSearchEl?.focus());
    }
  }

  private _handleWrapperClick() {
    if (!this.disabled && !this.readonly) {
      if (this.select) {
        this._toggleSelect();
      } else {
        this.inputEl?.focus();
      }
    }
  }

  private async _updatePosition() {
    const wrapper = this.shadowRoot?.querySelector('.wrapper') as HTMLElement;
    if (!wrapper || !this.listboxEl) return;

    const { x, y } = await computePosition(
      wrapper,
      this.listboxEl,
      {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
          offset(4),
          flip(),
          shift({ padding: 8 }),
          sizeMiddleware({
            apply({ rects, elements }) {
              Object.assign(elements.floating.style, {
                width: `${rects.reference.width}px`,
              });
            },
          }),
        ],
      }
    );

    Object.assign(this.listboxEl.style, { left: `${x}px`, top: `${y}px` });
  }

  /** Programmatically focus the input. */
  focus(options?: FocusOptions) { this.inputEl?.focus(options); }

  render() {
    if (this.select) return this._renderSelectMode();

    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    const filteredOptions = this._allOptions.filter(o => o.toLowerCase().includes(this.value.toLowerCase()));

    const wrapperClasses = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${wrapperClasses} @click=${this._handleWrapperClick}>
        <div class="input-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <input
            part="input"
            type="text"
            .value=${live(this.value)}
            placeholder=${this.placeholder || (hasLabel ? ' ' : nothing)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            aria-label=${this.label || nothing}
            aria-invalid=${this.invalid ? 'true' : nothing}
            aria-expanded=${this._open ? 'true' : 'false'}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            role="combobox"
            @input=${this._handleInput}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
            @keydown=${this._handleKeydown}
          />
        </div>
        <svg class="chevron ${this._open ? 'open' : ''}" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="listbox ${this._open ? 'open' : ''}" part="listbox" role="listbox">
        ${filteredOptions.length > 0
          ? filteredOptions.map(
              (option, i) => html`
                <div
                  class="option ${i === this._highlightedIndex ? 'highlighted' : ''}"
                  role="option"
                  aria-selected=${this.value === option ? 'true' : 'false'}
                  @click=${() => this._selectOption(option)}
                >${option}</div>
              `
            )
          : html`<div class="empty">No results</div>`}
      </div>
      <div class="options-slot"><slot @slotchange=${this._handleOptionsSlotChange}></slot></div>
    `;
  }

  private _renderSelectMode() {
    const filtered = this._selectFilteredOptions;
    const hasLabel = !!this.label;
    const floated = hasLabel && (this._focused || !!this.value);

    const wrapperClasses = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${wrapperClasses} @click=${this._handleWrapperClick}
        style="cursor:pointer"
        role="combobox"
        aria-expanded=${this._open ? 'true' : 'false'}
        aria-haspopup="listbox"
        aria-label=${this.label || nothing}
        tabindex=${this.disabled ? nothing : '0'}
        @focus=${() => { this._focused = true; }}
        @blur=${() => { this._focused = false; }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggleSelect(); }
          else if (e.key === 'Escape' && this._open) { e.preventDefault(); this._open = false; this._dropdownQuery = ''; }
        }}>
        <div class="input-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <span class="select-display ${this.value ? '' : 'placeholder'}">
            ${this.value || (!floated ? '' : this.placeholder || 'Select…')}
          </span>
        </div>
        <svg class="chevron ${this._open ? 'open' : ''}" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="listbox ${this._open ? 'open' : ''}" part="listbox" role="listbox">
        <div class="dropdown-search-wrapper">
          <input class="dropdown-search" type="text" placeholder="Search…"
            .value=${this._dropdownQuery}
            @input=${this._handleDropdownSearch}
            @keydown=${this._handleDropdownSearchKeydown} />
        </div>
        ${filtered.length > 0
          ? filtered.map(
              (option, i) => html`
                <div
                  class="option ${i === this._highlightedIndex ? 'highlighted' : ''}"
                  role="option"
                  aria-selected=${this.value === option ? 'true' : 'false'}
                  @click=${() => this._selectOption(option)}
                >${option}</div>
              `
            )
          : html`<div class="empty">No results</div>`}
      </div>
      <div class="options-slot"><slot @slotchange=${this._handleOptionsSlotChange}></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-combobox': AmCombobox;
  }
}
