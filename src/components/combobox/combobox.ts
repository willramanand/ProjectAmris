import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { virtualize } from '@lit-labs/virtualizer/virtualize.js';
import { resetStyles } from '../../styles/reset.css.js';
import { requestAssociatedFormSubmit } from '../../utilities/form-actions.js';
import { prefetchFloating } from '../../internal/helpers/lazy-load.js';
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';
import { ListboxNavController } from '../../internal/controllers/listbox-nav.js';
import { filterOptions } from '../../internal/controllers/option-filter.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { uniqueId } from '../../utilities/unique-id.js';
import {
  VIRTUALIZE_ROW_THRESHOLD,
  ariaPosinset,
  ariaSetsize,
  scrollVirtualizerToIndex,
} from '../../internal/helpers/virtualize-support.js';

/** PageUp/PageDown highlight jump distance for listbox keyboard navigation. */
const OPTION_PAGE_SIZE = 10;

export type ComboboxSize = 'sm' | 'md' | 'lg';

/**
 * Default message surfaced for a required-empty combobox. The select-mode
 * primary focusable is a `role=combobox` wrapper (no native inner input), so the
 * host supplies the `valueMissing` message it mirrors onto
 * `ElementInternals.setValidity` (D-01/FEAT-01). Text-mode uses the same message
 * for a uniform experience across both modes.
 */
const VALUE_MISSING_MESSAGE = 'Please fill out this field.';

/**
 * Combobox — a text input with a filterable dropdown list.
 * Typing filters the available options; selecting an option sets the value.
 *
 * When `remote` is set, client-side filtering is disabled. Instead, the
 * component fires `am-search` events and expects the consumer to update
 * the `options` property with results from an external source.
 *
 * @csspart input - The native input element
 * @csspart listbox - The dropdown panel
 * @csspart label - The floating label element
 *
 * @fires input - Fires when the value changes
 * @fires change - Fires when a value is selected
 * @fires am-search - Fires when the user types in async mode, with { query } detail
 *
 * @example
 * ```html
 * <am-combobox label="Country" .options=${['Canada', 'Chile', 'China']}></am-combobox>
 * ```
 *
 * @example Remote mode
 * ```html
 * <am-combobox remote label="Search users" placeholder="Type a name..."></am-combobox>
 * <script>
 *   const cb = document.querySelector('am-combobox');
 *   cb.addEventListener('am-search', async (e) => {
 *     cb.loading = true;
 *     const res = await fetch(`/api/users?q=${e.detail.query}`);
 *     cb.options = await res.json();
 *     cb.loading = false;
 *   });
 * </script>
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

  /** When true, disables client-side filtering and fires `am-search` events instead. */
  @property({ type: Boolean, reflect: true }) remote = false;

  /** Shows a loading spinner (useful in async mode while fetching results). */
  @property({ type: Boolean, reflect: true }) loading = false;

  /** Minimum characters before firing `am-search` in async mode. */
  @property({ type: Number, attribute: 'min-chars' }) minChars = 1;

  /** When true, uses a select-style trigger with search inside the dropdown. */
  @property({ type: Boolean, reflect: true, attribute: 'search-in-trigger' }) searchInTrigger = false;

  /** List of available options. Set via property, not attribute. */
  @property({ type: Array }) options: string[] = [];

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _highlightedIndex = -1;
  @state() private _dropdownQuery = '';
  @state() private _slottedOptions: string[] = [];

  @query('input') private inputEl!: HTMLInputElement;
  @query('.listbox') private listboxEl!: HTMLElement;
  @query('.select-listbox') private _selectListboxEl!: HTMLElement;
  @query('.dropdown-search') private _dropdownSearchEl!: HTMLInputElement;

  private internals: ElementInternals;

  /** Stable id shared by the error message node and the focusable's aria-describedby. */
  private readonly _errorId = uniqueId('am-combobox-error');

  /**
   * Per-instance base for deterministic per-option `id`s. The active option's id
   * is surfaced via `aria-activedescendant` on the focusable (PERF-03 — combobox
   * had neither option ids nor activedescendant before). Deterministic by index
   * so the id stays stable across `repeat()`/`virtualize()` recycling.
   */
  private readonly _optionIdBase = uniqueId('am-combobox-opt');

  /** Stable listbox id, referenced by the focusable's `aria-controls`. */
  private readonly _listboxId = uniqueId('am-combobox-listbox');

  /**
   * Resolves the displayed validation message + shown-state from the native
   * constraint message and any consumer-supplied {@link setCustomError} error.
   * Lives on the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this._anchorEl,
    describedById: this._errorId,
  });

  /** Resolved error text mirrored from the controller for render. */
  @state() private _errorMessage = '';
  /** Whether the error message region is currently shown. */
  @state() private _showError = false;
  /** True once a failed form submit occurred — drives assertive role=alert (D-04). */
  @state() private _submitFailed = false;
  /** Tracks whether the reflected `invalid` attribute is owned by validation. */
  private _invalidFromValidation = false;

  /**
   * Floating positioning delegated to the shared controller. Options mirror the
   * component's previous inline setup exactly: anchored to `.wrapper`, fixed
   * strategy, 4px offset, plus a `size` middleware that matches the listbox
   * width to the reference. autoUpdate stays ungated (behavior-preserving).
   *
   * The `size` middleware is built from the deferred-loaded `@floating-ui/dom`
   * module inside the module-receiving getter (D-06) — NOT from a static import
   * in a construction-time array, which would evaluate before the chunk loads.
   */
  private _floatingController = new FloatingPositionController(this, {
    reference: () => this.shadowRoot?.querySelector('.wrapper') as HTMLElement | null,
    floating: () => this.listboxEl,
    placement: 'bottom-start',
    strategy: 'fixed',
    offset: 4,
    middleware: (mod) => [
      mod.size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
  });

  /**
   * Listbox keyboard navigation delegated to the shared controller. It reads
   * and writes this component's own `_highlightedIndex` / `_open` state and
   * navigates over the same client-filtered list the input renders. The Enter
   * fallback (form submit) and option selection stay host-owned via callbacks.
   */
  private _listboxNav = new ListboxNavController(this, {
    getOptions: () => filterOptions(this._allOptions, this.value, this.remote),
    getIndex: () => this._highlightedIndex,
    // Route every highlight move through the host so the target option is
    // scrolled into the virtualization window BEFORE the re-render surfaces it
    // via aria-activedescendant (the referenced id must exist — Pitfall 2).
    setIndex: (index: number) => { this._setHighlighted(index); },
    getOpen: () => this._open,
    setOpen: (open: boolean) => { this._open = open; },
    onSelect: (option: string) => this._selectOption(option),
    onEnterWithoutSelection: (e: KeyboardEvent) => {
      requestAssociatedFormSubmit(this, {
        event: e,
        internals: this.internals,
        disabled: this.disabled,
        readonly: this.readonly,
      });
    },
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  /**
   * The primary focusable the validation message anchors to: the text-mode
   * `<input>`, or the select-mode `role=combobox` wrapper (searchInTrigger).
   * Never a node in am-field light DOM (Pitfall 3).
   */
  private get _anchorEl(): HTMLElement | null {
    return this.searchInTrigger
      ? (this.shadowRoot?.querySelector('.wrapper') as HTMLElement | null)
      : (this.inputEl ?? null);
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

      /* ---- Loading spinner ---- */

      .spinner {
        width: 0.875rem;
        height: 0.875rem;
        border: 2px solid var(--am-border);
        border-top-color: var(--am-primary);
        border-radius: var(--am-radius-full);
        animation: spin 0.6s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

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

      .wrapper.select-mode {
        cursor: pointer;
      }

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

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .floating-label, .chevron, .listbox, .option, .spinner { transition: none; }
        .spinner { animation-duration: 1.5s; }
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

  disconnectedCallback() {
    super.disconnectedCallback();
    // The floating autoUpdate teardown is mirrored in the controller's
    // hostDisconnected (invoked during super.disconnectedCallback above).
    document.removeEventListener('click', this._handleDocumentClick);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
    }
    // In remote mode, open the dropdown when new options arrive while focused
    if (this.remote && changed.has('options') && this.options.length > 0 && this._focused) {
      this._open = true;
      this._highlightedIndex = -1;
    }
    if (changed.has('_open')) {
      if (this._open) {
        document.addEventListener('click', this._handleDocumentClick);
        this._floatingController.start();
      } else {
        document.removeEventListener('click', this._handleDocumentClick);
        this._floatingController.stop();
      }
    }
    // Native constraint validity is computed from the required/empty state (no
    // inner native constraint input in select-mode) and mirrored onto internals
    // post-render; this reflection may schedule one further bounded update.
    this._syncValidation();
  }

  /**
   * Mirror the control's required/empty validity onto ElementInternals, then
   * reflect the controller's resolved message + shown-state into render state
   * and the `invalid` attribute. Never throws; bounded (idempotent) re-render.
   */
  private _syncValidation(): void {
    const anchor = this._anchorEl;
    if (anchor) {
      if (this.required && this.value === '') {
        this.internals.setValidity({ valueMissing: true }, VALUE_MISSING_MESSAGE, anchor);
      } else {
        this.internals.setValidity({});
      }
    }

    const show = this._validation.invalid;
    const message = show ? this._validation.message : '';

    if (message !== this._errorMessage) {
      this._errorMessage = message;
    }
    if (show !== this._showError) {
      this._showError = show;
      if (show) {
        this.invalid = true;
        this._invalidFromValidation = true;
      } else if (this._invalidFromValidation) {
        this.invalid = false;
        this._invalidFromValidation = false;
      }
    }
    if (!show) {
      this._submitFailed = false;
    }
  }

  private _onInvalid = (event: Event): void => {
    event.preventDefault();
    this._submitFailed = true;
    this._validation.markTouched();
  };

  /**
   * Set or clear a custom validation error (e.g. a server-side rejection).
   *
   * A non-empty message overrides the native constraint message and is shown
   * immediately; passing `''` clears the custom error and falls back to the
   * native constraint message (if any). Custom message wins over native (D-03).
   *
   * @param message - The error text to display, or `''` to clear to native.
   */
  setCustomError(message: string): void {
    this._validation.setCustomError(message);
  }

  private _handleDocumentClick = (e: MouseEvent) => {
    if (!this._open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._open = false;
    }
  };

  /**
   * Warm the deferred floating-ui chunk on trigger intent (hover/focus, D-01/D-03)
   * so the module is usually resolved by the time the controller `await`s it on
   * open — keeping the open→position ordering tight. A wasted warm is accepted cost.
   */
  private _handlePrefetch = () => {
    prefetchFloating();
  };

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this._highlightedIndex = -1;

    if (this.remote) {
      if (this.value.length >= this.minChars) {
        this.dispatchEvent(new CustomEvent('am-search', { detail: { query: this.value }, bubbles: true, composed: true }));
      } else {
        this._open = false;
      }
    } else {
      if (!this._open && this.value.length > 0) {
        this._open = true;
      }
    }

  }

  private _handleFocus() {
    this._focused = true;
    if (this.remote) {
      if (this._allOptions.length > 0 && this.value.length >= this.minChars) {
        this._open = true;
      }
    } else if (this._allOptions.length > 0) {
      this._open = true;
    }
  }

  private _handleBlur() {
    this._focused = false;
    // D-01 timing gate: a native constraint error may surface only after the
    // input is touched (blur), never on first paint.
    this._validation.markTouched();
  }

  private _handleKeydown(e: KeyboardEvent) {
    // Home/End/PageUp/PageDown jump to a possibly off-screen option; handle them
    // here (the shared ListboxNavController owns only Arrow/Enter/Escape/Tab and
    // must stay untouched to preserve FIX-02's no-re-clamp-on-replace). Every
    // jump routes through _setHighlighted so the target scrolls into the window
    // before aria-activedescendant points at it.
    const filtered = filterOptions(this._allOptions, this.value, this.remote);
    if (this._handleExtendedNav(e, filtered)) return;
    this._listboxNav.handleKeydown(e);
  }

  /**
   * Handle Home/End/PageUp/PageDown highlight jumps over the filtered option
   * list. Returns true when the key was consumed. No-op (returns false) when the
   * listbox is closed or empty, so normal typing/navigation is unaffected.
   */
  private _handleExtendedNav(e: KeyboardEvent, filtered: string[]): boolean {
    if (!this._open || filtered.length === 0) return false;
    const current = this._highlightedIndex < 0 ? 0 : this._highlightedIndex;
    let target: number;
    switch (e.key) {
      case 'Home': target = 0; break;
      case 'End': target = filtered.length - 1; break;
      case 'PageDown': target = Math.min(current + OPTION_PAGE_SIZE, filtered.length - 1); break;
      case 'PageUp': target = Math.max(current - OPTION_PAGE_SIZE, 0); break;
      default: return false;
    }
    e.preventDefault();
    if (!this._open) this._open = true;
    this._setHighlighted(target);
    return true;
  }

  /** Deterministic per-option id (index-based) — stable across recycling. */
  private _optionId(index: number): string {
    return `${this._optionIdBase}-${index}`;
  }

  /** The element hosting the active `virtualize()` directive for the open popup. */
  private get _optionScrollHost(): HTMLElement | null {
    return this.searchInTrigger ? this._selectListboxEl : this.listboxEl;
  }

  /**
   * Move the highlight and scroll the target into the virtualization window
   * FIRST, so a subsequent render can surface it via aria-activedescendant with
   * the id already present in the DOM (Pitfall 2 / T-04-21). Below the threshold
   * the scroll is a no-op (no virtualizer attached).
   */
  private _setHighlighted(index: number): void {
    this._highlightedIndex = index;
    if (index >= 0) scrollVirtualizerToIndex(this._optionScrollHost, index);
  }

  /**
   * The active option's id for `aria-activedescendant`, or `nothing` when no
   * in-range option is highlighted. Clamped to the rendered range WITHOUT
   * re-clamping `_highlightedIndex` state (FIX-02) — a transiently stale index
   * simply yields no activedescendant rather than pointing at an absent id.
   */
  private _activeDescendant(total: number): string | typeof nothing {
    return this._highlightedIndex >= 0 && this._highlightedIndex < total
      ? this._optionId(this._highlightedIndex)
      : nothing;
  }

  /**
   * Render a single option row. Shared by the `repeat()` (at/below threshold)
   * and `virtualize()` (above threshold) paths so the ARIA shape is identical.
   * `aria-setsize` is the FULL filtered total from state (never the mounted
   * count) and `aria-selected` is driven by `this.value`, never node presence.
   */
  private _renderOption(option: string, i: number, total: number): TemplateResult {
    return html`
      <div
        class="option ${i === this._highlightedIndex ? 'highlighted' : ''}"
        role="option"
        id=${this._optionId(i)}
        aria-setsize=${ariaSetsize(total)}
        aria-posinset=${ariaPosinset(i)}
        aria-selected=${this.value === option ? 'true' : 'false'}
        @click=${() => this._selectOption(option)}
      >${option}</div>
    `;
  }

  /**
   * Render the option list body. Above {@link VIRTUALIZE_ROW_THRESHOLD} (D-06)
   * the `virtualize()` directive windows the list; at/below it the existing
   * `repeat()` path stands. Both share {@link _renderOption} so ARIA is uniform.
   */
  private _renderOptionList(filtered: string[]): unknown {
    if (filtered.length === 0) {
      return html`<div class="empty" role="option" aria-disabled="true">No results</div>`;
    }
    if (filtered.length > VIRTUALIZE_ROW_THRESHOLD) {
      return virtualize({
        items: filtered,
        keyFunction: (opt: string) => opt,
        renderItem: (opt: string, i: number) => this._renderOption(opt, i, filtered.length),
      });
    }
    return repeat(
      filtered,
      option => option,
      (option, i) => this._renderOption(option, i, filtered.length),
    );
  }

  private _selectOption(option: string) {
    this.value = option;
    this._open = false;
    this._highlightedIndex = -1;
    this._dropdownQuery = '';
    if (!this.searchInTrigger) this.inputEl?.focus();
    if (!this.searchInTrigger && this.inputEl) {
      this.inputEl.value = this.value;
      this.inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return;
    }
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _handleDropdownSearch(e: Event) {
    this._dropdownQuery = (e.target as HTMLInputElement).value;
    this._highlightedIndex = -1;
  }

  private _handleDropdownSearchKeydown(e: KeyboardEvent) {
    const filtered = this._selectFilteredOptions;
    if (this._handleExtendedNav(e, filtered)) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._setHighlighted(Math.min(this._highlightedIndex + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._setHighlighted(Math.max(this._highlightedIndex - 1, 0));
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
    // Select-mode search is always client-side (never remote); an empty query
    // matches everything, preserving the prior "return all when blank" behavior.
    return filterOptions(this._allOptions, this._dropdownQuery, false);
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
      if (this.searchInTrigger) {
        this._toggleSelect();
      } else {
        this.inputEl?.focus();
      }
    }
  }

  /** Programmatically focus the input. */
  focus(options?: FocusOptions) { this.inputEl?.focus(options); }

  /** Same-shadow-root validation message region (shared by both render modes). */
  private _renderError() {
    return this._showError
      ? html`<div
          id=${this._errorId}
          part="error"
          class="error-text"
          role=${this._submitFailed ? 'alert' : nothing}
          aria-live=${this._submitFailed ? 'off' : 'polite'}
        >${this._errorMessage}</div>`
      : nothing;
  }

  render() {
    if (this.searchInTrigger) return this._renderSelectMode();

    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    // In remote mode, show all options as-is (server already filtered them)
    const filteredOptions = filterOptions(this._allOptions, this.value, this.remote);

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
        @pointerenter=${this._handlePrefetch} @focusin=${this._handlePrefetch}>
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
            aria-describedby=${this._showError ? this._errorId : nothing}
            aria-expanded=${this._open ? 'true' : 'false'}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-controls=${this._open ? this._listboxId : nothing}
            aria-activedescendant=${this._open ? this._activeDescendant(filteredOptions.length) : nothing}
            role="combobox"
            @input=${this._handleInput}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
            @keydown=${this._handleKeydown}
          />
        </div>
        ${this.loading
          ? html`<span class="spinner" aria-hidden="true"></span>`
          : html`<svg class="chevron ${this._open ? 'open' : ''}" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`}
      </div>
      <div id=${this._listboxId} class="listbox ${this._open ? 'open' : ''}" part="listbox" role="listbox" tabindex="0" aria-label=${this.label || 'Options'}>
        ${this._renderOptionList(filteredOptions)}
      </div>
      <div class="options-slot"><slot @slotchange=${this._handleOptionsSlotChange}></slot></div>
      ${this._renderError()}
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
      <div class="${wrapperClasses} select-mode" @click=${this._handleWrapperClick}
        @pointerenter=${this._handlePrefetch}
        role="combobox"
        aria-expanded=${this._open ? 'true' : 'false'}
        aria-haspopup="listbox"
        aria-label=${this.label || nothing}
        aria-invalid=${this.invalid ? 'true' : nothing}
        aria-describedby=${this._showError ? this._errorId : nothing}
        tabindex=${this.disabled ? nothing : '0'}
        @focus=${() => { this._focused = true; }}
        @blur=${() => { this._focused = false; this._validation.markTouched(); }}
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
      <div class="listbox ${this._open ? 'open' : ''}" part="listbox">
        <div class="dropdown-search-wrapper">
          <input class="dropdown-search" type="text" placeholder="Search…"
            aria-label="Filter options"
            .value=${this._dropdownQuery}
            @input=${this._handleDropdownSearch}
            @keydown=${this._handleDropdownSearchKeydown} />
        </div>
        <div class="select-listbox" role="listbox" tabindex="0"
          aria-label=${this.label || 'Options'}
          aria-activedescendant=${this._activeDescendant(filtered.length)}>
          ${this._renderOptionList(filtered)}
        </div>
      </div>
      <div class="options-slot"><slot @slotchange=${this._handleOptionsSlotChange}></slot></div>
      ${this._renderError()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-combobox': AmCombobox;
  }
}


