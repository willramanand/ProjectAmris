import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type SearchFieldSize = 'sm' | 'md' | 'lg';

/**
 * SearchField — a search-optimized input with a search icon prefix and
 * clear button. Built standalone (no am-input wrapping) to avoid shadow
 * DOM nesting issues.
 *
 * @csspart wrapper - The outer wrapper div
 * @csspart input - The native input element
 * @csspart clear - The clear button
 *
 * @fires am-input - Fires on input with { value } detail
 * @fires am-change - Fires on change with { value } detail
 * @fires am-clear - Fires when the clear button is clicked
 * @fires am-search - Fires on Enter key press with { value } detail
 *
 * @example
 * ```html
 * <am-search-field placeholder="Search items..."></am-search-field>
 * <am-search-field size="lg" placeholder="Find anything"></am-search-field>
 * ```
 */
@customElement('am-search-field')
export class AmSearchField extends LitElement {
  @property() value = '';
  @property() placeholder = 'Search...';
  @property({ reflect: true }) size: SearchFieldSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() name = '';

  @query('input') private inputEl!: HTMLInputElement;

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
        cursor: text;
      }

      .wrapper:hover:not(.disabled) {
        border-color: var(--am-border-strong);
      }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.disabled {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes ---- */

      :host([size='sm']) .wrapper {
        height: var(--am-size-sm);
        padding-inline: var(--am-space-2-5);
        font-size: var(--am-text-sm);
      }

      :host([size='md']) .wrapper,
      :host(:not([size])) .wrapper {
        height: var(--am-size-md);
        padding-inline: var(--am-space-3);
        font-size: var(--am-text-sm);
      }

      :host([size='lg']) .wrapper {
        height: var(--am-size-lg);
        padding-inline: var(--am-space-4);
        font-size: var(--am-text-base);
      }

      /* ---- Search icon ---- */

      .search-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
      }

      /* ---- Input ---- */

      input {
        all: unset;
        flex: 1;
        min-width: 0;
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

      @media (prefers-reduced-motion: reduce) {
        .wrapper,
        .clear-btn {
          transition: none;
        }
      }
    `,
  ];

  @state() private _focused = false;

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('am-input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChange() {
    this.dispatchEvent(
      new CustomEvent('am-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFocus() {
    this._focused = true;
  }

  private _handleBlur() {
    this._focused = false;
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.dispatchEvent(
        new CustomEvent('am-search', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        })
      );
    }
    if (e.key === 'Escape') {
      this._handleClear();
    }
  }

  private _handleClear() {
    this.value = '';
    this.inputEl?.focus();
    this.dispatchEvent(
      new CustomEvent('am-clear', { bubbles: true, composed: true })
    );
    this.dispatchEvent(
      new CustomEvent('am-input', {
        detail: { value: '' },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent('am-change', {
        detail: { value: '' },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleWrapperClick() {
    this.inputEl?.focus();
  }

  /** Programmatically focus the input. */
  focus(options?: FocusOptions) {
    this.inputEl?.focus(options);
  }

  render() {
    const showClear = this.value.length > 0 && !this.disabled;

    const wrapperClasses = [
      'wrapper',
      this._focused ? 'focused' : '',
      this.disabled ? 'disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return html`
      <div class=${wrapperClasses} part="wrapper" @click=${this._handleWrapperClick}>
        <span class="search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.25 12.5a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5zM14 14l-3.6-3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <input
          part="input"
          type="search"
          .value=${this.value}
          placeholder=${this.placeholder}
          name=${this.name || nothing}
          ?disabled=${this.disabled}
          aria-label=${this.placeholder}
          @input=${this._handleInput}
          @change=${this._handleChange}
          @focus=${this._handleFocus}
          @blur=${this._handleBlur}
          @keydown=${this._handleKeydown}
        />
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-search-field': AmSearchField;
  }
}
