import { LitElement, css, html } from 'lit';
import { customElement, queryAssignedElements, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Field — a structural wrapper for composing label + input + hint/error.
 * Provides consistent vertical spacing for form groups.
 *
 * Per D-02 (Material `supporting-text`→`error-text` model), while the
 * slotted form control is invalid the slotted `hint` is hidden and the
 * slotted `error` is shown in its place; the hint returns once the control
 * is valid again. This is presentational only — the control itself owns the
 * SR-authoritative message and `aria-describedby` wiring (see
 * `ValidationController` / `src/components/input/input.ts`).
 *
 * @slot - Default slot for form controls (am-input, am-checkbox, etc.)
 * @slot label - Label slot (am-label)
 * @slot hint - Hint text slot (am-hint-text); hidden while the control is invalid
 * @slot error - Error text slot (am-error-text); shown while the control is invalid
 *
 * @csspart field - The outer field container
 *
 * @cssprop --am-field-gap - Override gap between elements (default: --am-space-1-5)
 *
 * @example
 * ```html
 * <am-field>
 *   <am-label slot="label" required>Email</am-label>
 *   <am-input type="email" placeholder="you@example.com"></am-input>
 *   <am-hint-text slot="hint">We'll never share your email.</am-hint-text>
 *   <am-error-text slot="error">A valid email is required.</am-error-text>
 * </am-field>
 * ```
 */
@customElement('am-field')
export class AmField extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: var(--am-field-gap, var(--am-space-1-5));
      }
    `,
  ];

  /** The form control(s) assigned to the default slot (light DOM). */
  @queryAssignedElements() private _defaultSlotted!: Element[];

  /** Whether the observed control currently reflects `invalid` (D-02 swap state). */
  @state() private _controlInvalid = false;

  /**
   * Per-instance MutationObserver watching the resolved control's reflected
   * `invalid` attribute. No module-level singleton / global state (per
   * no-global-state constraint) — lives entirely on the instance and is
   * disconnected in {@link disconnectedCallback}.
   */
  private _observer: MutationObserver | null = null;
  private _observedControl: Element | null = null;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownObserver();
  }

  /**
   * Re-resolve the default-slotted control whenever slot assignment changes
   * (including the initial assignment) and (re)attach the per-instance
   * observer to it.
   */
  private _handleDefaultSlotChange = (): void => {
    const control = this._defaultSlotted.find((el) => el instanceof HTMLElement) ?? null;

    if (control === this._observedControl) {
      this._controlInvalid = control?.hasAttribute('invalid') ?? false;
      return;
    }

    this._teardownObserver();
    this._observedControl = control;

    if (control) {
      this._controlInvalid = control.hasAttribute('invalid');
      this._observer = new MutationObserver(() => {
        this._controlInvalid = control.hasAttribute('invalid');
      });
      this._observer.observe(control, { attributes: true, attributeFilter: ['invalid'] });
    } else {
      this._controlInvalid = false;
    }
  };

  private _teardownObserver(): void {
    this._observer?.disconnect();
    this._observer = null;
    this._observedControl = null;
  }

  render() {
    return html`
      <div class="field" part="field">
        <slot name="label"></slot>
        <slot @slotchange=${this._handleDefaultSlotChange}></slot>
        <slot name="hint" ?hidden=${this._controlInvalid}></slot>
        <slot name="error" ?hidden=${!this._controlInvalid}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-field': AmField;
  }
}
