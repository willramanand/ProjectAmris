import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { resetStyles } from '../../styles/reset.css.js';
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { attachInternalsSafe } from '../../internal/helpers/attach-internals-safe.js';
import {
  isFormFallbackEnabled,
  syncFormFallback,
  teardownFormFallback,
  warnBelowFloorOnce,
} from '../../internal/helpers/form-participation.js';
import { uniqueId } from '../../utilities/unique-id.js';
import {
  VIRTUALIZE_ROW_THRESHOLD,
  ariaPosinset,
  ariaSetsize,
  scrollVirtualizerToIndex,
} from '../../internal/helpers/virtualize-support.js';
import {
  prefetchFloating,
  loadVirtualizer,
  prefetchVirtualizer,
} from '../../internal/helpers/lazy-load.js';

export type SelectSize = 'sm' | 'md' | 'lg';

/** PageUp/PageDown highlight jump distance for the virtualized listbox. */
const OPTION_PAGE_SIZE = 10;

/**
 * Flattened, state-owned view of a slotted `am-option` used ONLY on the
 * virtualized render path (above {@link VIRTUALIZE_ROW_THRESHOLD}). Above the
 * threshold the slotted custom elements are hidden and windowed option rows are
 * rendered from this model instead, so ARIA counts and selection stay driven by
 * state rather than by which option nodes are mounted (Pitfall 2).
 */
type SelectOptionModel = { value: string; label: string; disabled: boolean };

/**
 * Default message surfaced for a required-empty composite control. Unlike
 * am-input (which sources the browser-localized message from an inner native
 * `<input>`), the overlay controls have no native constraint-validating inner
 * input as their primary focusable, so the host supplies the `valueMissing`
 * message it mirrors onto `ElementInternals.setValidity` (D-01/FEAT-01).
 */
const VALUE_MISSING_MESSAGE = 'Please fill out this field.';

/* ================================================================
   AmOption — individual selectable option
   ================================================================ */

/**
 * Option — a single selectable option inside a am-select.
 *
 * @slot - Option label text
 *
 * @fires am-change - Fires on click with the option's value in `{ value }` detail (consumed by the parent am-select)
 *
 * @example
 * ```html
 * <am-option value="apple">Apple</am-option>
 * <am-option value="banana" disabled>Banana</am-option>
 * ```
 */
@customElement('am-option')
export class AmOption extends LitElement {
  /** The value associated with this option. */
  @property() value = '';

  /** Whether this option is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Whether this option is currently selected. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Whether this option is currently highlighted via keyboard. */
  @property({ type: Boolean, reflect: true }) highlighted = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--am-space-2);
      padding: var(--am-space-2) var(--am-space-3);
      font-family: var(--am-font-sans);
      font-size: var(--am-text-sm);
      color: var(--am-text);
      cursor: pointer;
      user-select: none;
      transition:
        background var(--am-duration-fast) var(--am-ease-default),
        color var(--am-duration-fast) var(--am-ease-default);
    }

    :host(:hover),
    :host([highlighted]) {
      background: var(--am-hover-overlay);
      border-radius: var(--am-radius-md);
      corner-shape: squircle;
    }

    :host([selected]) {
      color: var(--am-primary);
      font-weight: var(--am-weight-medium);
    }

    :host([disabled]) {
      opacity: var(--am-disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
    }

    .check {
      flex-shrink: 0;
      width: 0.875rem;
      height: 0.875rem;
      color: var(--am-primary);
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
      new CustomEvent('am-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: false,
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
   AmSelect — custom dropdown select with floating label
   ================================================================ */

/**
 * Select — a custom dropdown select with floating label support.
 * Uses Floating UI for dropdown positioning.
 *
 * @slot - Option elements (am-option)
 *
 * @csspart trigger - The select trigger button
 * @csspart listbox - The dropdown panel
 * @csspart label - The floating label element
 * @csspart clear - The clear button
 *
 * @fires input - Fires when the selected value changes
 * @fires change - Fires when the selected value changes
 *
 * @example
 * ```html
 * <am-select label="Fruit" placeholder="Choose a fruit">
 *   <am-option value="apple">Apple</am-option>
 *   <am-option value="banana">Banana</am-option>
 *   <am-option value="cherry">Cherry</am-option>
 * </am-select>
 * ```
 */
@customElement('am-select')
export class AmSelect extends LitElement {
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

  @queryAssignedElements({ selector: 'am-option' })
  private _options!: AmOption[];

  /**
   * Attached form internals, or `null` below the ElementInternals floor where
   * {@link attachInternalsSafe} could not attach (COMPAT-02). Null-safe at every
   * call site; below the floor the opt-in hidden-input fallback (COMPAT-03)
   * mirrors the selected value instead.
   */
  private internals: ElementInternals | null;
  private _documentClickHandler = this._handleDocumentClick.bind(this);

  /** Stable id shared by the error message node and the trigger's aria-describedby. */
  private readonly _errorId = uniqueId('am-select-error');

  /**
   * Per-instance base for deterministic per-option `id`s used by the virtualized
   * popup's `aria-activedescendant` (PERF-03). Index-based so the id stays stable
   * across virtualizer recycling.
   */
  private readonly _optionIdBase = uniqueId('am-select-opt');

  /**
   * Resolves the displayed validation message + shown-state from the native
   * constraint message and any consumer-supplied {@link setCustomError} error.
   * Lives on the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this.triggerEl,
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
   * component's previous inline setup exactly: anchored to `.trigger`, fixed
   * strategy, 4px offset, plus a `size` middleware that matches the listbox
   * width to the trigger. autoUpdate stays ungated (behavior-preserving, D-10).
   */
  private _floatingController = new FloatingPositionController(this, {
    reference: () => this.triggerEl,
    floating: () => this.listboxEl,
    placement: 'bottom-start',
    strategy: 'fixed',
    offset: 4,
    // The `size` middleware is built from the deferred-loaded @floating-ui/dom
    // module (D-06) so select carries no static floating-ui runtime import; the
    // width-match behavior is byte-identical to the previous static form.
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
   * The lazily-loaded `virtualize()` directive, set once the virtualizer chunk
   * resolves (D-05/D-06). Until then the virtualized render path falls back to a
   * fully-functional unwindowed `repeat()` so the popup works cold (D-05).
   */
  private _virtualize:
    | typeof import('@lit-labs/virtualizer/virtualize.js')['virtualize']
    | null = null;
  /** Guards against re-issuing the memoized virtualizer load on every render. */
  private _virtualizerLoading = false;

  constructor() {
    super();
    this.internals = attachInternalsSafe(this);
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        position: relative;
      }

      /* ---- Trigger (matches am-input wrapper styling) ---- */

      .trigger {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        width: 100%;
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-input-radius, var(--am-radius-xl));
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          border-color var(--am-duration-fast) var(--am-ease-default),
          box-shadow var(--am-duration-fast) var(--am-ease-default);
        color: var(--am-text);
        position: relative;
        cursor: pointer;
        box-sizing: border-box;
      }

      .trigger:hover:not(.disabled) {
        border-color: var(--am-border-strong);
      }

      .trigger.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .trigger.invalid {
        border-color: var(--am-danger);
      }

      .trigger.invalid.focused {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      .trigger.disabled {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .trigger:not(.has-label) { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .trigger:not(.has-label), :host(:not([size])) .trigger:not(.has-label) { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .trigger:not(.has-label) { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .trigger.has-label { height: 3rem; padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .trigger.has-label, :host(:not([size])) .trigger.has-label { height: 3.5rem; padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .trigger.has-label { height: 3.75rem; padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Input group (mirrors am-input) ---- */

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
        padding-bottom: 0.5rem;
      }

      .display-value {
        font: inherit;
        color: inherit;
        line-height: var(--am-leading-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .display-value.placeholder {
        color: var(--am-text-tertiary);
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
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        color: var(--am-text-tertiary);
        transition: transform var(--am-duration-fast) var(--am-ease-default);
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
        border-radius: var(--am-radius-full);
        cursor: pointer;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition:
          color var(--am-duration-fast) var(--am-ease-default),
          background var(--am-duration-fast) var(--am-ease-default);
      }

      .clear-btn:hover {
        color: var(--am-text);
        background: var(--am-hover-overlay);
      }

      .clear-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
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
        transform: translateY(-4px);
        pointer-events: none;
        transition:
          opacity var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-default);
      }

      .listbox.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      /* ---- Virtualized option rows (above the threshold) ---- */
      /* Above VIRTUALIZE_ROW_THRESHOLD the slotted am-option elements are hidden
         and windowed rows are rendered from state. These mirror am-option's
         visual treatment so the popup looks identical to the slotted path. */

      .v-option {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        padding: var(--am-space-2) var(--am-space-3);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        cursor: pointer;
        user-select: none;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .v-option:hover:not([aria-disabled='true']),
      .v-option.highlighted {
        background: var(--am-hover-overlay);
      }

      .v-option.selected {
        color: var(--am-primary);
        font-weight: var(--am-weight-medium);
      }

      .v-option[aria-disabled='true'] {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
      }

      /* Hide the slotted am-option projection while the virtualized rows render,
         keeping the slot present so queryAssignedElements + slotchange still work. */
      .options-hidden {
        display: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .v-option { transition: none; }
      }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
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
    this.addEventListener('am-change', this._handleOptionSelect as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('am-change', this._handleOptionSelect as EventListener);
    document.removeEventListener('click', this._documentClickHandler);
    // The floating autoUpdate teardown is mirrored in the controller's
    // hostDisconnected (invoked during super.disconnectedCallback above).
    // Remove the below-floor hidden-input mirror (if one was created) so a
    // disconnect leaves no stale light-DOM node (COMPAT-03 teardown).
    teardownFormFallback(this);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals?.setFormValue(this.value);
      // Below the ElementInternals floor (internals null): the XOR-gated opt-in
      // hidden-input fallback mirrors the selected value (COMPAT-03), else a
      // one-time dev warning.
      if (!this.internals) {
        isFormFallbackEnabled()
          ? syncFormFallback(this, {
              name: this.name,
              value: this.value,
              required: this.required,
              disabled: this.disabled,
            })
          : warnBelowFloorOnce('am-select');
      }
      this._syncOptionSelected();
    }
    if (changed.has('_open')) {
      if (this._open) {
        document.addEventListener('click', this._documentClickHandler);
        this._floatingController.start();
        // Warm the virtualizer chunk on open when the option count is over the
        // threshold (D-04), so the repeat()→virtualize() swap lands promptly.
        if (this._isVirtual) prefetchVirtualizer();
      } else {
        document.removeEventListener('click', this._documentClickHandler);
        this._floatingController.stop();
      }
    }
    // Native constraint validity for this overlay control is computed from the
    // required/empty state (no inner native input) and mirrored onto internals
    // post-render; this reflection may schedule one further bounded update.
    this._syncValidation();
  }

  /**
   * Mirror the control's required/empty validity onto ElementInternals, then
   * reflect the controller's resolved message + shown-state into render state
   * and the `invalid` attribute. Never throws; bounded (idempotent) re-render.
   */
  private _syncValidation(): void {
    const anchor = this.triggerEl;
    if (anchor) {
      if (this.required && this.value === '') {
        this.internals?.setValidity({ valueMissing: true }, VALUE_MISSING_MESSAGE, anchor);
      } else {
        this.internals?.setValidity({});
      }
    }

    const show = this._validation.invalid;
    const message = show ? this._validation.message : '';

    if (message !== this._errorMessage) {
      this._errorMessage = message;
    }
    if (show !== this._showError) {
      this._showError = show;
      // Reflect :host([invalid]) without clobbering a consumer-set `invalid`
      // attribute — only validation-owned reflections are cleared by validation.
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

  private _syncOptionSelected() {
    const options = this._options ?? [];
    options.forEach(opt => {
      opt.selected = opt.value === this.value;
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
    this._syncHighlight();
  }

  private _handleTriggerClick() {
    this._toggleOpen();
  }

  /**
   * Warm the deferred chunks on trigger intent (pointer/focus, D-01/D-03/D-04):
   * floating-ui for positioning, and the virtualizer when the option count is
   * over the threshold — so the module is usually resolved before the popup opens.
   */
  private _handleTriggerIntent = () => {
    prefetchFloating();
    if (this._isVirtual) prefetchVirtualizer();
  };

  private _handleOptionSelect = (e: CustomEvent<{ value: string }>) => {
    // Stop the internal am-option `am-change` at the am-select boundary so it
    // does not leak past the component and collide with the canonical
    // value-change event. Consumers observe am-select's native input/change.
    e.stopPropagation();
    this._commitValue(e.detail.value);
  };

  /**
   * Commit a new value: update state, fire input/change (only when the value
   * actually changed), close the popup and return focus to the trigger. Shared
   * by the slotted `am-change` path and the virtualized option-row click/Enter
   * path, so selection is always driven by value (state), never option-node
   * presence (Pitfall 2 / T-04-22).
   */
  private _commitValue(newValue: string): void {
    if (newValue !== this.value) {
      this.value = newValue;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    this._close();
    this.triggerEl?.focus();
  }

  /** Flattened, state-owned view of the slotted options (virtual path only). */
  private get _optionModel(): SelectOptionModel[] {
    return (this._options ?? []).map(opt => ({
      value: opt.value,
      label: opt.textContent?.trim() ?? opt.value,
      disabled: opt.disabled,
    }));
  }

  /** True once the option count crosses the virtualization threshold (D-06). */
  private get _isVirtual(): boolean {
    return (this._options?.length ?? 0) > VIRTUALIZE_ROW_THRESHOLD;
  }

  /** Deterministic per-option id (index-based) — stable across recycling. */
  private _optionId(index: number): string {
    return `${this._optionIdBase}-${index}`;
  }

  /**
   * Active option id for `aria-activedescendant`, or `nothing` when no in-range
   * option is highlighted. Clamped to the model range WITHOUT re-clamping
   * `_highlightedIndex` (FIX-02) — a stale index yields no activedescendant
   * rather than referencing an absent id (T-04-21).
   */
  private _activeDescendant(total: number): string | typeof nothing {
    return this._highlightedIndex >= 0 && this._highlightedIndex < total
      ? this._optionId(this._highlightedIndex)
      : nothing;
  }

  /**
   * Move the highlight and scroll the target into the virtualization window
   * FIRST, so the subsequent render surfaces it via aria-activedescendant with
   * the id already present (Pitfall 2). No-op scroll below the threshold.
   */
  private _setHighlighted(index: number): void {
    this._highlightedIndex = index;
    if (index >= 0) scrollVirtualizerToIndex(this.listboxEl, index);
  }

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
    // D-01 timing gate: a native constraint error may surface only after the
    // trigger is touched (blur), never on first paint.
    this._validation.markTouched();
  }

  private _handleKeyDown(e: KeyboardEvent) {
    // Above the threshold the popup is virtualized (state-driven rows, not
    // slotted am-option elements), so keyboard nav runs over the flattened
    // model with aria-activedescendant + scroll-into-window. Below it, the
    // existing element-based wraparound nav stands unchanged.
    if (this._isVirtual) {
      this._handleVirtualKeyDown(e);
      return;
    }

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
          requestAnimationFrame(() => this._syncHighlight(options));
        } else {
          this._moveHighlight(1, options);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!this._open) {
          this._open = true;
          this._highlightedIndex = options.length - 1;
          requestAnimationFrame(() => this._syncHighlight(options));
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

  private _getNavigableOptions(): AmOption[] {
    return (this._options ?? []).filter(opt => !opt.disabled);
  }

  private _moveHighlight(direction: number, options: AmOption[]) {
    if (options.length === 0) return;
    let idx = this._highlightedIndex + direction;
    if (idx < 0) idx = options.length - 1;
    if (idx >= options.length) idx = 0;
    this._highlightedIndex = idx;
    this._syncHighlight(options);
    this._scrollHighlightedIntoView(options[idx]);
  }

  private _syncHighlight(options?: AmOption[]) {
    const navOptions = options ?? this._getNavigableOptions();
    navOptions.forEach((opt, i) => {
      opt.highlighted = i === this._highlightedIndex;
    });
  }

  private _scrollHighlightedIntoView(option: AmOption) {
    option.scrollIntoView?.({ block: 'nearest' });
  }

  /**
   * Keyboard nav for the virtualized popup. Preserves select's element-based
   * WRAPAROUND model (Arrow wraps end↔start, skipping disabled) — it is NOT the
   * combobox string-clamp model. Every highlight move routes through
   * {@link _setHighlighted} so the target is scrolled into the window before
   * aria-activedescendant references it.
   */
  private _handleVirtualKeyDown(e: KeyboardEvent) {
    const model = this._optionModel;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (
          this._open &&
          this._highlightedIndex >= 0 &&
          this._highlightedIndex < model.length &&
          !model[this._highlightedIndex].disabled
        ) {
          this._commitValue(model[this._highlightedIndex].value);
        } else {
          this._toggleOpen();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) this._open = true;
        this._moveVirtualHighlight(1, model);
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!this._open) this._open = true;
        this._moveVirtualHighlight(-1, model);
        break;

      case 'Home':
        if (this._open) {
          e.preventDefault();
          this._highlightEdge(1, model);
        }
        break;

      case 'End':
        if (this._open) {
          e.preventDefault();
          this._highlightEdge(-1, model);
        }
        break;

      case 'PageDown':
        if (this._open) {
          e.preventDefault();
          this._pageVirtualHighlight(OPTION_PAGE_SIZE, model);
        }
        break;

      case 'PageUp':
        if (this._open) {
          e.preventDefault();
          this._pageVirtualHighlight(-OPTION_PAGE_SIZE, model);
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

  /** Move ±1 with wraparound, skipping disabled options. */
  private _moveVirtualHighlight(direction: number, model: SelectOptionModel[]) {
    const n = model.length;
    if (n === 0) return;
    let idx = this._highlightedIndex;
    for (let step = 0; step < n; step++) {
      idx += direction;
      if (idx < 0) idx = n - 1;
      if (idx >= n) idx = 0;
      if (!model[idx].disabled) {
        this._setHighlighted(idx);
        return;
      }
    }
  }

  /** Highlight the first (direction=1) or last (direction=-1) enabled option. */
  private _highlightEdge(direction: number, model: SelectOptionModel[]) {
    const n = model.length;
    let idx = direction > 0 ? 0 : n - 1;
    while (idx >= 0 && idx < n && model[idx].disabled) idx += direction;
    if (idx >= 0 && idx < n) this._setHighlighted(idx);
  }

  /** Jump by a page, then settle on the nearest enabled option in that direction. */
  private _pageVirtualHighlight(delta: number, model: SelectOptionModel[]) {
    const n = model.length;
    if (n === 0) return;
    const base = this._highlightedIndex < 0 ? 0 : this._highlightedIndex;
    let idx = Math.min(Math.max(base + delta, 0), n - 1);
    const dir = delta > 0 ? 1 : -1;
    while (idx >= 0 && idx < n && model[idx].disabled) idx += dir;
    if (idx >= 0 && idx < n) this._setHighlighted(idx);
  }

  /**
   * Render one virtualized option row from the state model. `aria-setsize` is
   * the FULL model total (never the mounted count) and `aria-selected` is driven
   * by `this.value`. Text binding only — no raw-HTML sink (T-04-20).
   */
  private _renderVirtualOption(o: SelectOptionModel, i: number, total: number): TemplateResult {
    const selected = o.value === this.value;
    return html`
      <div
        class="v-option ${i === this._highlightedIndex ? 'highlighted' : ''} ${selected ? 'selected' : ''}"
        role="option"
        id=${this._optionId(i)}
        aria-setsize=${ariaSetsize(total)}
        aria-posinset=${ariaPosinset(i)}
        aria-selected=${selected ? 'true' : 'false'}
        aria-disabled=${o.disabled ? 'true' : nothing}
        @click=${() => { if (!o.disabled) this._commitValue(o.value); }}
      >${o.label}</div>
    `;
  }

  /**
   * Windowed option body via the shared `virtualize()` directive (D-06), lazily
   * loaded. Until the virtualizer chunk resolves the popup renders a functional
   * unwindowed `repeat()` over the SAME state model with identical per-row ARIA
   * (D-05 cold-chunk fallback); it swaps to `virtualize()` on the next render
   * once the directive is set. No 0,0 frame — both paths render real rows.
   */
  private _renderVirtualOptions(model: SelectOptionModel[]): unknown {
    if (this._virtualize) {
      return this._virtualize({
        items: model,
        keyFunction: (o: SelectOptionModel) => o.value,
        renderItem: (o: SelectOptionModel, i: number) =>
          this._renderVirtualOption(o, i, model.length),
      });
    }
    // Cold-chunk fallback: kick off the memoized load once, then render an
    // unwindowed repeat() so the popup is fully usable during the fetch gap.
    if (!this._virtualizerLoading) {
      this._virtualizerLoading = true;
      void loadVirtualizer().then(m => {
        this._virtualize = m.virtualize;
        this.requestUpdate();
      });
    }
    return repeat(
      model,
      (o: SelectOptionModel) => o.value,
      (o: SelectOptionModel, i: number) => this._renderVirtualOption(o, i, model.length),
    );
  }

  private _handleClear(e: Event) {
    e.stopPropagation();
    if (this.value) {
      this.value = '';
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
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
        aria-describedby=${this._showError ? this._errorId : nothing}
        ?disabled=${this.disabled}
        @click=${this._handleTriggerClick}
        @pointerenter=${this._handleTriggerIntent}
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
        aria-label=${this.label || 'Options'}
        aria-activedescendant=${this._isVirtual && this._open
          ? this._activeDescendant(this._options?.length ?? 0)
          : nothing}
      >
        ${this._isVirtual ? this._renderVirtualOptions(this._optionModel) : nothing}
        <slot
          class=${this._isVirtual ? 'options-hidden' : ''}
          @slotchange=${this._handleSlotChange}
        ></slot>
      </div>
      ${this._showError
        ? html`<div
            id=${this._errorId}
            part="error"
            class="error-text"
            role=${this._submitFailed ? 'alert' : nothing}
            aria-live=${this._submitFailed ? 'off' : 'polite'}
          >${this._errorMessage}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-option': AmOption;
    'am-select': AmSelect;
  }
}
