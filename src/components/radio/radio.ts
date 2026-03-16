import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/* ================================================================
   QzRadio — individual radio button
   ================================================================ */

/**
 * Radio — a styled radio button with label support.
 *
 * @slot - Label content
 * @csspart control - The visual radio circle
 * @csspart label - The label wrapper
 *
 * @fires qz-change - Fires when checked state changes with { checked, value } detail
 *
 * @example
 * ```html
 * <qz-radio value="a">Option A</qz-radio>
 * <qz-radio value="b" checked>Option B</qz-radio>
 * ```
 */
@customElement('qz-radio')
export class QzRadio extends LitElement {
  static formAssociated = true;

  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() name = '';

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
        align-items: center;
        gap: var(--qz-space-2-5);
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
        flex-shrink: 0;
        width: 1.125rem;
        height: 1.125rem;
        display: block;
      }

      .control:focus-visible {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
        border-radius: 50%;
      }

      .radio-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .radio-ring {
        stroke: var(--qz-border-strong);
        fill: var(--qz-surface);
        stroke-width: 2;
        transition: stroke var(--qz-duration-fast) var(--qz-ease-default);
      }

      :host(:hover:not([disabled])) .radio-ring {
        stroke: var(--qz-text-tertiary);
      }

      :host([checked]) .radio-ring {
        stroke: var(--qz-primary);
      }

      :host(:hover[checked]:not([disabled])) .radio-ring {
        stroke: var(--qz-primary-hover);
      }

      .radio-dot {
        fill: var(--qz-primary);
        opacity: 0;
        transform-box: fill-box;
        transform-origin: center;
        transform: scale(0);
        transition:
          opacity var(--qz-duration-fast) var(--qz-ease-default),
          transform var(--qz-duration-fast) var(--qz-ease-spring);
      }

      :host([checked]) .radio-dot {
        opacity: 1;
        transform: scale(1);
      }

      .label {
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        line-height: var(--qz-leading-normal);
        color: var(--qz-text);
      }

      @media (prefers-reduced-motion: reduce) {
        .radio-ring,
        .radio-dot {
          transition: none;
        }
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
    if (this.checked) return;
    this.checked = true;
    this.dispatchEvent(
      new CustomEvent('qz-change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
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
        role="radio"
        tabindex=${this.disabled ? nothing : '0'}
        aria-checked=${String(this.checked)}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @keydown=${this._handleKeyDown}
      >
        <svg class="radio-svg" viewBox="0 0 18 18">
          <circle class="radio-ring" cx="9" cy="9" r="8"/>
          <circle class="radio-dot" cx="9" cy="9" r="4"/>
        </svg>
      </div>
      <span class="label" part="label">
        <slot></slot>
      </span>
    `;
  }
}

/* ================================================================
   QzRadioGroup — radio group container
   ================================================================ */

/**
 * Radio Group — manages single-selection across qz-radio children.
 * Provides roving tabindex keyboard navigation and form association.
 *
 * @slot - Radio buttons (qz-radio elements)
 *
 * @fires qz-change - Fires when the selected radio changes with { value } detail
 *
 * @example
 * ```html
 * <qz-radio-group label="Choose a plan" name="plan" value="pro">
 *   <qz-radio value="free">Free</qz-radio>
 *   <qz-radio value="pro">Pro</qz-radio>
 *   <qz-radio value="enterprise">Enterprise</qz-radio>
 * </qz-radio-group>
 * ```
 */
@customElement('qz-radio-group')
export class QzRadioGroup extends LitElement {
  static formAssociated = true;

  /** The value of the currently selected radio. */
  @property({ reflect: true }) value = '';

  /** Accessible label for the radio group. */
  @property() label = '';

  /** Disables all radios in the group. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Marks the group as required for form validation. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Name attribute for form association. */
  @property() name = '';

  @queryAssignedElements({ selector: 'qz-radio' })
  private _radios!: QzRadio[];

  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--qz-space-2-5);
      }

      :host([disabled]) {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'radiogroup');
    this.addEventListener('qz-change', this._handleRadioChange as EventListener);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('qz-change', this._handleRadioChange as EventListener);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  protected firstUpdated() {
    this._syncRadios();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('aria-label', this.label);
      } else {
        this.removeAttribute('aria-label');
      }
    }

    if (changed.has('disabled')) {
      this._syncRadios();
    }

    if (changed.has('value')) {
      this.internals.setFormValue(this.value || null);
      this._syncRadios();
    }
  }

  private _getRadios(): QzRadio[] {
    return this._radios ?? [];
  }

  private _getEnabledRadios(): QzRadio[] {
    return this._getRadios().filter(r => !r.disabled);
  }

  private _syncRadios() {
    const radios = this._getRadios();
    const enabledRadios = this._getEnabledRadios();
    const selectedRadio = radios.find(r => r.value === this.value);

    radios.forEach(radio => {
      radio.checked = radio.value === this.value;

      if (this.disabled) {
        radio.disabled = true;
      }

      // Roving tabindex: only the selected (or first enabled) radio is tabbable
      const control = radio.shadowRoot?.querySelector('.control');
      if (control) {
        if (selectedRadio) {
          control.setAttribute('tabindex', radio === selectedRadio ? '0' : '-1');
        } else if (enabledRadios.length > 0) {
          control.setAttribute('tabindex', radio === enabledRadios[0] ? '0' : '-1');
        }
      }
    });
  }

  private _handleRadioChange = (e: CustomEvent) => {
    const target = e.target as QzRadio;
    if (!(target instanceof QzRadio)) return;

    // Stop the child radio's event from propagating beyond the group
    e.stopPropagation();

    const newValue = target.value;
    if (newValue === this.value) return;

    this.value = newValue;
    this._syncRadios();

    this.dispatchEvent(
      new CustomEvent('qz-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as Element;
    const radio = target.closest('qz-radio') as QzRadio | null;
    if (!radio) return;

    const radios = this._getEnabledRadios();
    if (radios.length === 0) return;

    const idx = radios.indexOf(radio);
    if (idx === -1) return;

    let next: QzRadio | undefined;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      next = radios[(idx + 1) % radios.length];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      next = radios[(idx - 1 + radios.length) % radios.length];
    }

    if (next) {
      e.preventDefault();
      next.checked = true;
      this.value = next.value;
      this._syncRadios();

      next.shadowRoot?.querySelector<HTMLElement>('.control')?.focus();

      // Stop child event and dispatch group event
      this.dispatchEvent(
        new CustomEvent('qz-change', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  private _handleSlotChange() {
    this._syncRadios();
  }

  render() {
    return html`
      <slot @slotchange=${this._handleSlotChange}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-radio': QzRadio;
    'qz-radio-group': QzRadioGroup;
  }
}
