import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Textarea — a styled multi-line text input with a Pegasus-style
 * floating label that animates upward when focused or filled.
 *
 * @csspart textarea - The native textarea element
 * @csspart wrapper - The outer wrapper
 * @csspart label - The floating label element
 * @csspart clear - The clear button
 *
 * @cssprop --am-textarea-radius - Override border radius
 * @cssprop --am-textarea-min-height - Override minimum height
 *
 * @fires qz-input - Fires on input with { value } detail
 * @fires qz-change - Fires on change with { value } detail
 * @fires qz-clear - Fires when the clear button is clicked
 *
 * @example
 * ```html
 * <qz-textarea label="Message"></qz-textarea>
 * <qz-textarea label="Bio" clearable></qz-textarea>
 * ```
 */
@customElement('am-textarea')
export class AmTextarea extends LitElement {
  static formAssociated = true;

  /** Floating label text. */
  @property() label = '';

  @property() value = '';
  @property() placeholder = '';
  @property() name = '';
  @property({ type: Number }) rows = 3;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) resize = true;
  @property({ type: Boolean, reflect: true }) clearable = false;
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;

  @query('textarea') private textareaEl!: HTMLTextAreaElement;
  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .wrapper {
        display: flex;
        position: relative;
        border: var(--am-border-1) solid var(--am-border-strong);
        border-radius: var(--am-textarea-radius, var(--am-radius-xl));
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          border-color var(--am-duration-fast) var(--am-ease-default),
          box-shadow var(--am-duration-fast) var(--am-ease-default);
        cursor: text;
      }

      .wrapper:hover:not(.disabled) { border-color: var(--am-text-tertiary); }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      .wrapper.invalid.focused { box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent); }
      .wrapper.disabled { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      .textarea-group {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      textarea {
        all: unset;
        flex: 1;
        min-width: 0;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        padding: var(--am-space-2-5) var(--am-space-3) var(--am-space-3);
        min-height: var(--am-textarea-min-height, 5rem);
        line-height: var(--am-leading-normal);
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      /* Add top padding when floating label is present */
      .has-label textarea {
        padding-top: 1.5rem;
      }

      /* Hide native placeholder when label is not floated */
      .has-label:not(.floated) textarea::placeholder {
        color: transparent;
      }

      :host([resize]) textarea { resize: vertical; }
      :host(:not([resize])) textarea { resize: none; }

      textarea::placeholder { color: var(--am-text-tertiary); }
      textarea:disabled { cursor: not-allowed; }

      /* ---- Floating label ---- */

      .floating-label {
        position: absolute;
        top: 0.875rem;
        left: var(--am-space-3);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
        pointer-events: none;
        transform-origin: left center;
        transition:
          top var(--am-duration-normal) var(--am-ease-spring),
          font-size var(--am-duration-normal) var(--am-ease-spring),
          color var(--am-duration-fast) var(--am-ease-default);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(100% - 2rem);
      }

      .floated .floating-label {
        top: 0.25rem;
        font-size: 0.625rem;
        color: var(--am-text-secondary);
      }

      .focused .floating-label {
        color: var(--am-primary);
      }

      .invalid .floating-label {
        color: var(--am-danger);
      }

      /* ---- Clear button ---- */

      .clear-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
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

      .clear-btn:hover { color: var(--am-text); background: var(--am-hover-overlay); }
      .clear-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
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
    this.value = (e.target as HTMLTextAreaElement).value;
    this.dispatchEvent(new CustomEvent('am-input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleChange() {
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  private _handleFocus() { this._focused = true; this.requestUpdate(); }
  private _handleBlur() { this._focused = false; this.requestUpdate(); }

  private _handleClear() {
    this.value = '';
    this.textareaEl?.focus();
    this.dispatchEvent(new CustomEvent('am-clear', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('am-input', { detail: { value: '' }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: '' }, bubbles: true, composed: true }));
  }

  private _handleWrapperClick() {
    this.textareaEl?.focus();
  }

  focus(options?: FocusOptions) { this.textareaEl?.focus(options); }

  render() {
    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    const showClear = this.clearable && this.value.length > 0 && !this.disabled && !this.readonly;

    const classes = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${classes} part="wrapper" @click=${this._handleWrapperClick}>
        <div class="textarea-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <textarea
            part="textarea"
            .value=${live(this.value)}
            rows=${this.rows}
            placeholder=${this.placeholder || (hasLabel ? ' ' : nothing)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            minlength=${this.minlength ?? nothing}
            maxlength=${this.maxlength ?? nothing}
            aria-label=${this.label || nothing}
            aria-invalid=${this.invalid ? 'true' : nothing}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
          ></textarea>
        </div>
        ${showClear
          ? html`
              <button class="clear-btn" part="clear" type="button" aria-label="Clear" @click=${this._handleClear}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-textarea': AmTextarea;
  }
}
