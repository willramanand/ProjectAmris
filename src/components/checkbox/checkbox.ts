import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Checkbox — a styled checkbox with label support.
 *
 * @slot - Label content
 * @csspart control - The visual checkbox box
 * @csspart label - The label wrapper
 *
 * @fires input - Fires when checked state changes
 * @fires change - Fires when checked state changes
 *
 * @example
 * ```html
 * <am-checkbox>Accept terms and conditions</am-checkbox>
 * <am-checkbox checked>Remember me</am-checkbox>
 * <am-checkbox indeterminate>Select all</am-checkbox>
 * ```
 */
@customElement('am-checkbox')
export class AmCheckbox extends LitElement {
  static formAssociated = true;

  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property() name = '';
  @property() value = 'on';
  @property({ attribute: 'aria-label' }) ariaLabel: string | null = null;

  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        align-items: flex-start;
        gap: var(--am-space-2);
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .control {
        position: relative;
        flex-shrink: 0;
        width: 1.125rem;
        height: 1.125rem;
        margin-top: 0.125rem;
        border: var(--am-border-2) solid var(--am-border-strong);
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          background var(--am-duration-fast) var(--am-ease-default),
          border-color var(--am-duration-fast) var(--am-ease-default);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host(:hover:not([disabled])) .control {
        border-color: var(--am-primary);
      }

      :host([checked]) .control,
      :host([indeterminate]) .control {
        background: var(--am-primary);
        border-color: var(--am-primary);
      }

      :host(:hover[checked]:not([disabled])) .control,
      :host(:hover[indeterminate]:not([disabled])) .control {
        background: var(--am-primary-hover);
        border-color: var(--am-primary-hover);
      }

      .control:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .check-icon {
        width: 0.75rem;
        height: 0.75rem;
        color: var(--am-primary-text);
        opacity: 0;
        transform: scale(0.5);
        transition:
          opacity var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-spring);
      }

      :host([checked]) .check-icon,
      :host([indeterminate]) .check-icon {
        opacity: 1;
        transform: scale(1);
      }

      .label {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text);
      }

      input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .control, .check-icon { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('checked')) {
      this.internals.setFormValue(this.checked ? this.value : null);
    }
  }

  private _toggle = () => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._toggle();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._toggle);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._toggle);
  }

  render() {
    return html`
      <div
        class="control"
        part="control"
        role="checkbox"
        tabindex=${this.disabled ? nothing : '0'}
        aria-checked=${this.indeterminate ? 'mixed' : String(this.checked)}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-labelledby=${this.ariaLabel ? nothing : 'label'}
        @keydown=${this._handleKeyDown}
      >
        ${this.indeterminate
          ? html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
          : html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
      </div>
      <span class="label" part="label" id="label">
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-checkbox': AmCheckbox;
  }
}
