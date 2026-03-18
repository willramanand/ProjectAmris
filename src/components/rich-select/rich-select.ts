import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, offset, size as sizeMiddleware } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

export type RichSelectSize = 'sm' | 'md' | 'lg';

export interface RichOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  group?: string;
}

/**
 * Rich Select — a select dropdown with support for descriptions, icons, and groups.
 *
 * Unlike `am-select` (which uses slotted `am-option` elements), Rich Select
 * takes a `RichOption[]` property for fully data-driven rendering.
 *
 * @csspart trigger - The select trigger button
 * @csspart listbox - The dropdown panel
 *
 * @fires am-change - Fires on selection with { value, option } detail
 *
 * @example
 * ```html
 * <am-rich-select label="Assignee" .options=${[
 *   { value: 'alice', label: 'Alice', description: 'Engineering' },
 *   { value: 'bob', label: 'Bob', description: 'Design', icon: '🎨' },
 * ]}></am-rich-select>
 * ```
 */
@customElement('am-rich-select')
export class AmRichSelect extends LitElement {
  static formAssociated = true;

  @property() label = '';
  @property() value = '';
  @property() placeholder = 'Select…';
  @property() name = '';
  @property({ reflect: true }) size: RichSelectSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean }) searchable = false;

  @property({ type: Array }) options: RichOption[] = [];

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _highlightedIndex = -1;
  @state() private _searchQuery = '';

  @query('.trigger') private _trigger!: HTMLElement;
  @query('.listbox') private _listbox!: HTMLElement;
  @query('.search-input') private _searchInput!: HTMLInputElement;

  private _internals: ElementInternals;
  private _cleanupAutoUpdate: (() => void) | null = null;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: flex; flex-direction: column; font-family: var(--am-font-sans); }

      .label {
        display: block;
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      .trigger {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        box-sizing: border-box;
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        cursor: pointer;
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
      }

      :host([size='sm']) .trigger { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .trigger, :host(:not([size])) .trigger { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .trigger { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      .trigger.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .trigger.invalid { border-color: var(--am-danger); }
      :host([disabled]) .trigger { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      .selected-display {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
      }

      .selected-icon { flex-shrink: 0; }

      .selected-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--am-text);
      }

      .placeholder { color: var(--am-text-tertiary); }

      .chevron {
        width: 1rem; height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--am-duration-fast) var(--am-ease-default);
      }

      .chevron.open { transform: rotate(180deg); }

      .listbox {
        position: fixed;
        z-index: var(--am-z-dropdown);
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-lg);
        padding: var(--am-space-1);
        width: max-content;
        max-height: 20rem;
        overflow-y: auto;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .listbox.open { opacity: 1; pointer-events: auto; }

      .search-wrapper {
        padding: var(--am-space-1) var(--am-space-2) var(--am-space-2);
        position: sticky;
        top: 0;
        background: var(--am-surface-raised);
      }

      .search-input {
        all: unset;
        width: 100%;
        box-sizing: border-box;
        padding: var(--am-space-1-5) var(--am-space-2);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
      }

      .search-input::placeholder { color: var(--am-text-tertiary); }

      .group-label {
        padding: var(--am-space-2) var(--am-space-3) var(--am-space-1);
        font-size: var(--am-text-xs);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .option {
        display: flex;
        align-items: center;
        gap: var(--am-space-2-5);
        padding: var(--am-space-2) var(--am-space-3);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .option:hover, .option.highlighted { background: var(--am-hover-overlay); }
      .option.selected { color: var(--am-primary); }
      .option.disabled { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .option-icon { flex-shrink: 0; font-size: 1.125rem; }

      .option-content {
        flex: 1;
        min-width: 0;
      }

      .option-label {
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      .option.selected .option-label { color: var(--am-primary); font-weight: var(--am-weight-medium); }

      .option-description {
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
        margin-top: 1px;
      }

      .check {
        width: 0.875rem; height: 0.875rem;
        color: var(--am-primary);
        flex-shrink: 0;
      }

      .empty {
        padding: var(--am-space-4);
        text-align: center;
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
      }

      @media (prefers-reduced-motion: reduce) {
        .trigger, .chevron, .listbox, .option { transition: none; }
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
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this._internals.setFormValue(this.value);
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
    if (!this._trigger || !this._listbox) return;
    this._cleanupAutoUpdate = autoUpdate(this._trigger, this._listbox, () => this._updatePosition());
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (this._open && !e.composedPath().includes(this)) {
      this._close();
    }
  };

  private get _filteredOptions(): RichOption[] {
    if (!this._searchQuery) return this.options;
    const q = this._searchQuery.toLowerCase();
    return this.options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.description?.toLowerCase().includes(q))
    );
  }

  private get _selectedOption(): RichOption | undefined {
    return this.options.find(o => o.value === this.value);
  }

  private _toggleOpen() {
    if (this.disabled) return;
    this._open = !this._open;
    if (this._open) {
      this._highlightedIndex = -1;
      this._searchQuery = '';
      requestAnimationFrame(() => this._searchInput?.focus());
    }
  }

  private _close() {
    this._open = false;
    this._searchQuery = '';
    this._highlightedIndex = -1;
  }

  private _select(option: RichOption) {
    if (option.disabled) return;
    this.value = option.value;
    this._close();
    this._trigger?.focus();
    this.dispatchEvent(new CustomEvent('am-change', {
      detail: { value: option.value, option },
      bubbles: true, composed: true,
    }));
  }

  private _handleSearchInput(e: Event) {
    this._searchQuery = (e.target as HTMLInputElement).value;
    this._highlightedIndex = -1;
  }

  private _handleKeydown(e: KeyboardEvent) {
    const options = this._filteredOptions.filter(o => !o.disabled);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) { this._toggleOpen(); return; }
        this._highlightedIndex = Math.min(this._highlightedIndex + 1, options.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (this._open && this._highlightedIndex >= 0) {
          this._select(options[this._highlightedIndex]);
        } else {
          this._toggleOpen();
        }
        break;
      case 'Escape':
        if (this._open) { e.preventDefault(); this._close(); this._trigger?.focus(); }
        break;
    }
  }

  private async _updatePosition() {
    if (!this._trigger || !this._listbox) return;
    const { x, y } = await computePosition(this._trigger, this._listbox, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [
        offset(4), flip(), shift({ padding: 8 }),
        sizeMiddleware({ apply({ rects, elements }) { elements.floating.style.minWidth = `${rects.reference.width}px`; } }),
      ],
    });
    Object.assign(this._listbox.style, { left: `${x}px`, top: `${y}px` });
  }

  private _renderOptions() {
    const filtered = this._filteredOptions;
    if (filtered.length === 0) return html`<div class="empty">No options</div>`;

    // Group support
    const groups = new Map<string, RichOption[]>();
    const ungrouped: RichOption[] = [];
    for (const opt of filtered) {
      if (opt.group) {
        if (!groups.has(opt.group)) groups.set(opt.group, []);
        groups.get(opt.group)!.push(opt);
      } else {
        ungrouped.push(opt);
      }
    }

    let flatIndex = 0;
    const renderOption = (opt: RichOption) => {
      const idx = flatIndex++;
      const selected = opt.value === this.value;
      return html`
        <div class="option ${selected ? 'selected' : ''} ${idx === this._highlightedIndex ? 'highlighted' : ''} ${opt.disabled ? 'disabled' : ''}"
          role="option" aria-selected=${selected ? 'true' : 'false'}
          @click=${() => this._select(opt)}>
          ${opt.icon ? html`<span class="option-icon">${opt.icon}</span>` : nothing}
          <div class="option-content">
            <div class="option-label">${opt.label}</div>
            ${opt.description ? html`<div class="option-description">${opt.description}</div>` : nothing}
          </div>
          ${selected ? html`<svg class="check" viewBox="0 0 14 14" fill="none">
            <polyline points="2.5,7 5.5,10 11.5,4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>` : nothing}
        </div>
      `;
    };

    return html`
      ${ungrouped.map(renderOption)}
      ${[...groups.entries()].map(([group, opts]) => html`
        <div class="group-label">${group}</div>
        ${opts.map(renderOption)}
      `)}
    `;
  }

  render() {
    const selected = this._selectedOption;

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <button class="trigger ${this._focused ? 'focused' : ''} ${this.invalid ? 'invalid' : ''}"
        part="trigger"
        type="button"
        role="combobox"
        aria-expanded=${String(this._open)}
        aria-haspopup="listbox"
        aria-label=${this.label || nothing}
        ?disabled=${this.disabled}
        @click=${this._toggleOpen}
        @focus=${() => { this._focused = true; }}
        @blur=${() => { this._focused = false; }}
        @keydown=${this._handleKeydown}>
        <div class="selected-display">
          ${selected
            ? html`
                ${selected.icon ? html`<span class="selected-icon">${selected.icon}</span>` : nothing}
                <span class="selected-label">${selected.label}</span>
              `
            : html`<span class="selected-label placeholder">${this.placeholder}</span>`}
        </div>
        <svg class="chevron ${this._open ? 'open' : ''}" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="listbox ${this._open ? 'open' : ''}" part="listbox">
        ${this.searchable ? html`
          <div class="search-wrapper">
            <input class="search-input" type="text" placeholder="Search…"
              aria-label="Filter options"
              .value=${this._searchQuery}
              @input=${this._handleSearchInput}
              @keydown=${this._handleKeydown} />
          </div>
        ` : nothing}
        <div role="listbox" aria-label=${this.label || 'Options'}>
          ${this._renderOptions()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-rich-select': AmRichSelect;
  }
}
