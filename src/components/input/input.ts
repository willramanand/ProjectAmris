import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { resetStyles } from '../../styles/reset.css.js';

export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input — a styled text input with a Pegasus-style floating label.
 * The label sits inside the input as placeholder text and animates
 * upward when the input is focused or has a value.
 *
 * @slot prefix - Content before the input (e.g. icon)
 * @slot suffix - Content after the input (e.g. icon, button)
 * @csspart input - The native input element
 * @csspart wrapper - The outer input wrapper
 * @csspart label - The floating label element
 * @csspart clear - The clear button
 *
 * @cssprop --qz-input-radius - Override border radius
 *
 * @fires qz-input - Fires on input with { value } detail
 * @fires qz-change - Fires on change with { value } detail
 * @fires qz-clear - Fires when the clear button is clicked
 *
 * @example
 * ```html
 * <qz-input label="Email address" type="email"></qz-input>
 * <qz-input label="Search" clearable></qz-input>
 * ```
 */
@customElement('qz-input')
export class QzInput extends LitElement {
  static formAssociated = true;

  /** Floating label text. When set, uses the floating label pattern. */
  @property() label = '';

  @property() type: string = 'text';
  @property() value = '';
  @property() placeholder = '';
  @property() name = '';
  @property({ reflect: true }) size: InputSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) clearable = false;
  @property() autocomplete = '';
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;
  @property() pattern = '';

  @query('input') private inputEl!: HTMLInputElement;
  private internals: ElementInternals;

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
        gap: var(--qz-space-2);
        border: var(--qz-border-1) solid var(--qz-border-strong);
        border-radius: var(--qz-input-radius, var(--qz-radius-xl));
        corner-shape: squircle;
        background: var(--qz-surface);
        transition:
          border-color var(--qz-duration-fast) var(--qz-ease-default),
          box-shadow var(--qz-duration-fast) var(--qz-ease-default);
        color: var(--qz-text);
        position: relative;
        cursor: text;
      }

      .wrapper:hover:not(.disabled) {
        border-color: var(--qz-text-tertiary);
      }

      .wrapper.focused {
        border-color: var(--qz-primary);
        box-shadow: 0 0 0 var(--qz-focus-ring-width) color-mix(in srgb, var(--qz-focus-ring) 25%, transparent);
      }

      .wrapper.invalid {
        border-color: var(--qz-danger);
      }

      .wrapper.invalid.focused {
        box-shadow: 0 0 0 var(--qz-focus-ring-width) color-mix(in srgb, var(--qz-danger) 25%, transparent);
      }

      .wrapper.disabled {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .wrapper:not(.has-label) { height: var(--qz-size-sm); padding-inline: var(--qz-space-2-5); font-size: var(--qz-text-sm); }
      :host([size='md']) .wrapper:not(.has-label), :host(:not([size])) .wrapper:not(.has-label) { height: var(--qz-size-md); padding-inline: var(--qz-space-3); font-size: var(--qz-text-sm); }
      :host([size='lg']) .wrapper:not(.has-label) { height: var(--qz-size-lg); padding-inline: var(--qz-space-4); font-size: var(--qz-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .wrapper.has-label { height: 2.75rem; padding-inline: var(--qz-space-2-5); font-size: var(--qz-text-sm); }
      :host([size='md']) .wrapper.has-label, :host(:not([size])) .wrapper.has-label { height: 3.25rem; padding-inline: var(--qz-space-3); font-size: var(--qz-text-sm); }
      :host([size='lg']) .wrapper.has-label { height: 3.5rem; padding-inline: var(--qz-space-4); font-size: var(--qz-text-base); }

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
        padding-bottom: 0.5rem;
      }

      input {
        all: unset;
        width: 100%;
        font: inherit;
        color: inherit;
        line-height: 1.25;
      }

      input::placeholder {
        color: var(--qz-text-tertiary);
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

      /* ---- Slots ---- */

      ::slotted([slot='prefix']),
      ::slotted([slot='suffix']) {
        display: flex;
        align-items: center;
        color: var(--qz-text-tertiary);
        flex-shrink: 0;
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

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .floating-label, .clear-btn { transition: none; }
      }
    `,
  ];

  private _focused = false;

  private get _floated(): boolean {
    return this._focused || this.value.length > 0;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
    }
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent('qz-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleChange() {
    this.dispatchEvent(new CustomEvent('qz-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleFocus() { this._focused = true; this.requestUpdate(); }
  private _handleBlur() { this._focused = false; this.requestUpdate(); }

  private _handleClear() {
    this.value = '';
    this.inputEl?.focus();
    this.dispatchEvent(new CustomEvent('qz-clear', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('qz-input', { detail: { value: '' }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('qz-change', { detail: { value: '' }, bubbles: true, composed: true }));
  }

  private _handleWrapperClick() {
    this.inputEl?.focus();
  }

  /** Programmatically focus the input. */
  focus(options?: FocusOptions) { this.inputEl?.focus(options); }

  /** Programmatically select the input text. */
  select() { this.inputEl?.select(); }

  render() {
    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    const showClear = this.clearable && this.value.length > 0 && !this.disabled && !this.readonly;

    const wrapperClasses = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${wrapperClasses} part="wrapper" @click=${this._handleWrapperClick}>
        <slot name="prefix"></slot>
        <div class="input-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <input
            part="input"
            type=${this.type}
            .value=${live(this.value)}
            placeholder=${this.placeholder || (hasLabel ? ' ' : nothing)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            autocomplete=${this.autocomplete || nothing}
            minlength=${this.minlength ?? nothing}
            maxlength=${this.maxlength ?? nothing}
            pattern=${this.pattern || nothing}
            aria-label=${this.label || nothing}
            aria-invalid=${this.invalid ? 'true' : nothing}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
          />
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
        <slot name="suffix"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-input': QzInput;
  }
}
