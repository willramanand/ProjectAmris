import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { computePosition, flip, shift, offset, size as sizeMiddleware } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

export type AutocompleteSize = 'sm' | 'md' | 'lg';

/**
 * Autocomplete — a text input with async suggestion dropdown.
 *
 * Unlike Combobox (which takes a static options array), Autocomplete
 * fires an `am-search` event on input, letting the consumer provide
 * results asynchronously via the `results` property.
 *
 * @csspart input - The native input
 * @csspart listbox - The dropdown panel
 *
 * @fires am-search - Fires when the user types, with { query } detail
 * @fires am-change - Fires when a result is selected
 *
 * @example
 * ```html
 * <am-autocomplete label="Search users" placeholder="Type a name..."></am-autocomplete>
 * <script>
 *   const ac = document.querySelector('am-autocomplete');
 *   ac.addEventListener('am-search', async (e) => {
 *     const res = await fetch(`/api/users?q=${e.detail.query}`);
 *     ac.results = await res.json();
 *   });
 * </script>
 * ```
 */
@customElement('am-autocomplete')
export class AmAutocomplete extends LitElement {
  @property() label = '';
  @property() value = '';
  @property() placeholder = '';
  @property() name = '';
  @property({ reflect: true }) size: AutocompleteSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) loading = false;

  /** Results to display. Set this in response to `am-search` events. */
  @property({ type: Array }) results: string[] = [];

  /** Minimum characters before firing am-search. */
  @property({ type: Number, attribute: 'min-chars' }) minChars = 1;

  @state() private _open = false;
  @state() private _focused = false;
  @state() private _highlightedIndex = -1;

  @query('input') private _input!: HTMLInputElement;
  @query('.listbox') private _listbox!: HTMLElement;

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .wrapper {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border-strong);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
        position: relative;
      }

      :host([size='sm']) .wrapper { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper, :host(:not([size])) .wrapper { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      :host([disabled]) .wrapper { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      .search-icon { width: 1rem; height: 1rem; color: var(--am-text-tertiary); flex-shrink: 0; }

      input {
        all: unset;
        flex: 1;
        min-width: 0;
        font: inherit;
        color: var(--am-text);
      }

      input::placeholder { color: var(--am-text-tertiary); }

      .spinner {
        width: 0.875rem; height: 0.875rem;
        border: 2px solid var(--am-border);
        border-top-color: var(--am-primary);
        border-radius: var(--am-radius-full);
        animation: spin 0.6s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

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

      .listbox.open { opacity: 1; pointer-events: auto; }

      .option {
        padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-sm);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .option:hover, .option.highlighted { background: var(--am-hover-overlay); }

      .empty {
        padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
        text-align: center;
      }

      .label {
        display: block;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .listbox, .option, .spinner { transition: none; }
        .spinner { animation-duration: 1.5s; }
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
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('results') && this.results.length > 0 && this._focused) {
      this._open = true;
      this._highlightedIndex = -1;
    }
    if (this._open) this._updatePosition();
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (this._open && !e.composedPath().includes(this)) {
      this._open = false;
    }
  };

  private _handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    if (this.value.length >= this.minChars) {
      this.dispatchEvent(new CustomEvent('am-search', { detail: { query: this.value }, bubbles: true, composed: true }));
    } else {
      this._open = false;
    }
  }

  private _handleFocus() { this._focused = true; if (this.results.length > 0 && this.value.length >= this.minChars) this._open = true; }
  private _handleBlur() { this._focused = false; }

  private _handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open && this.results.length) this._open = true;
        this._highlightedIndex = Math.min(this._highlightedIndex + 1, this.results.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;
      case 'Enter':
        if (this._open && this._highlightedIndex >= 0) {
          e.preventDefault();
          this._select(this.results[this._highlightedIndex]);
        }
        break;
      case 'Escape':
        if (this._open) { e.preventDefault(); this._open = false; }
        break;
    }
  }

  private _select(val: string) {
    this.value = val;
    this._open = false;
    this._input?.focus();
    this.dispatchEvent(new CustomEvent('am-change', { detail: { value: val }, bubbles: true, composed: true }));
  }

  private async _updatePosition() {
    const wrapper = this.shadowRoot?.querySelector('.wrapper') as HTMLElement;
    if (!wrapper || !this._listbox) return;

    const { x, y } = await computePosition(wrapper, this._listbox, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [
        offset(4), flip(), shift({ padding: 8 }),
        sizeMiddleware({ apply({ rects, elements }) { elements.floating.style.width = `${rects.reference.width}px`; } }),
      ],
    });

    Object.assign(this._listbox.style, { left: `${x}px`, top: `${y}px` });
  }

  render() {
    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="wrapper ${this._focused ? 'focused' : ''} ${this.invalid ? 'invalid' : ''}">
        <svg class="search-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M14 14l-3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          part="input"
          type="text"
          .value=${live(this.value)}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.disabled}
          aria-label=${this.label || nothing}
          aria-expanded=${this._open ? 'true' : 'false'}
          aria-autocomplete="list"
          role="combobox"
          @input=${this._handleInput}
          @focus=${this._handleFocus}
          @blur=${this._handleBlur}
          @keydown=${this._handleKeydown}
        />
        ${this.loading ? html`<span class="spinner" aria-hidden="true"></span>` : nothing}
      </div>
      <div class="listbox ${this._open ? 'open' : ''}" part="listbox" role="listbox">
        ${this.results.length > 0
          ? this.results.map((r, i) => html`
              <div class="option ${i === this._highlightedIndex ? 'highlighted' : ''}"
                role="option" @click=${() => this._select(r)}>${r}</div>
            `)
          : html`<div class="empty">No results</div>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-autocomplete': AmAutocomplete;
  }
}
