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
 * @fires qz-change - Fires when checked state changes with { checked } detail
 *
 * @example
 * ```html
 * <qz-checkbox>Accept terms and conditions</qz-checkbox>
 * <qz-checkbox checked>Remember me</qz-checkbox>
 * <qz-checkbox indeterminate>Select all</qz-checkbox>
 * ```
 */
@customElement('qz-checkbox')
export class QzCheckbox extends LitElement {
  static formAssociated = true;

  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property() name = '';
  @property() value = 'on';

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
        gap: var(--qz-space-2);
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .control {
        position: relative;
        flex-shrink: 0;
        width: 1.125rem;
        height: 1.125rem;
        margin-top: 0.125rem;
        border: var(--qz-border-2) solid var(--qz-border-strong);
        border-radius: var(--qz-radius-sm);
        corner-shape: squircle;
        background: var(--qz-surface);
        transition:
          background var(--qz-duration-fast) var(--qz-ease-default),
          border-color var(--qz-duration-fast) var(--qz-ease-default);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host(:hover:not([disabled])) .control {
        border-color: var(--qz-primary);
      }

      :host([checked]) .control,
      :host([indeterminate]) .control {
        background: var(--qz-primary);
        border-color: var(--qz-primary);
      }

      :host(:hover[checked]:not([disabled])) .control,
      :host(:hover[indeterminate]:not([disabled])) .control {
        background: var(--qz-primary-hover);
        border-color: var(--qz-primary-hover);
      }

      .control:focus-visible {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
      }

      .check-icon {
        width: 0.75rem;
        height: 0.75rem;
        color: var(--qz-primary-text);
        opacity: 0;
        transform: scale(0.5);
        transition:
          opacity var(--qz-duration-fast) var(--qz-ease-default),
          transform var(--qz-duration-fast) var(--qz-ease-spring);
      }

      :host([checked]) .check-icon,
      :host([indeterminate]) .check-icon {
        opacity: 1;
        transform: scale(1);
      }

      .label {
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        line-height: var(--qz-leading-normal);
        color: var(--qz-text);
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
    this.dispatchEvent(new CustomEvent('qz-change', { detail: { checked: this.checked }, bubbles: true, composed: true }));
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
        @keydown=${this._handleKeyDown}
      >
        ${this.indeterminate
          ? html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
          : html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
      </div>
      <span class="label" part="label">
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-checkbox': QzCheckbox;
  }
}
