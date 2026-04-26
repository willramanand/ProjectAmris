import { LitElement, css, html } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/* ================================================================
   AmMenuDivider — horizontal separator between menu items
   ================================================================ */

/**
 * Menu Divider — a visual separator for grouping menu items.
 */
@customElement('am-menu-divider')
export class AmMenuDivider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: var(--am-border-1);
      background: var(--am-border);
      margin: var(--am-space-1) 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'separator');
  }

  render() {
    return html``;
  }
}

/* ================================================================
   AmMenuItem — a single actionable item inside a menu
   ================================================================ */

/**
 * Menu Item — an actionable entry within a am-menu.
 *
 * @slot - Label text
 * @slot prefix - Icon or content before the label
 * @slot suffix - Content after the label (e.g. keyboard shortcut hint)
 *
 * @fires am-select - Fires on click with `{ item }` detail
 */
@customElement('am-menu-item')
export class AmMenuItem extends LitElement {
  /** Whether this item is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Whether this item uses danger/destructive styling. */
  @property({ type: Boolean, reflect: true }) destructive = false;

  /** Whether this item is selected (shows a checkmark). */
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--am-space-2-5);
        padding: var(--am-space-2) var(--am-space-3);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        user-select: none;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      :host(:hover) {
        background: var(--am-hover-overlay);
      }

      :host(:focus-visible) {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: calc(-1 * var(--am-focus-ring-width));
      }

      :host([destructive]) {
        color: var(--am-danger);
      }

      :host([destructive]:hover) {
        background: color-mix(in srgb, var(--am-danger) 10%, transparent);
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .leading {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
      }

      .leading svg {
        width: 1rem;
        height: 1rem;
      }

      .label {
        flex: 1;
        min-width: 0;
      }

      .suffix {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        margin-inline-start: auto;
        color: var(--am-text-tertiary);
      }

      @media (prefers-reduced-motion: reduce) {
        :host { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'menuitem');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  updated() {
    this.setAttribute('aria-disabled', String(this.disabled));
  }

  private _handleClick = () => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('am-select', {
        detail: { item: this },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <span class="leading">
        ${this.selected
          ? html`<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
          : html`<slot name="prefix"></slot>`}
      </span>
      <span class="label"><slot></slot></span>
      <span class="suffix"><slot name="suffix"></slot></span>
    `;
  }
}

/* ================================================================
   AmMenu — container for menu items with keyboard navigation
   ================================================================ */

/**
 * Menu — a container for menu items supporting keyboard navigation.
 *
 * Uses roving tabindex and arrow-key navigation between items.
 *
 * @slot - Menu items (am-menu-item and am-menu-divider elements)
 *
 * @example
 * ```html
 * <am-menu>
 *   <am-menu-item>Cut</am-menu-item>
 *   <am-menu-item>Copy</am-menu-item>
 *   <am-menu-item>Paste</am-menu-item>
 *   <am-menu-divider></am-menu-divider>
 *   <am-menu-item destructive>Delete</am-menu-item>
 * </am-menu>
 * ```
 */
@customElement('am-menu')
export class AmMenu extends LitElement {
  @queryAssignedElements({ selector: 'am-menu-item' })
  private _items!: AmMenuItem[];

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        padding: var(--am-space-1);
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-lg);
        min-width: 12rem;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'menu');
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  private _getEnabledItems(): AmMenuItem[] {
    return (this._items ?? []).filter(item => !item.disabled);
  }

  private _setFocus(index: number) {
    const enabled = this._getEnabledItems();
    if (enabled.length === 0) return;

    // Clamp index
    const clamped = Math.max(0, Math.min(index, enabled.length - 1));
    // Update tabindex on all items (roving tabindex)
    const allItems = this._items ?? [];
    allItems.forEach(item => {
      item.setAttribute('tabindex', '-1');
    });

    const target = enabled[clamped];
    target.setAttribute('tabindex', '0');
    target.focus();
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    const enabled = this._getEnabledItems();
    if (enabled.length === 0) return;

    const current = e.target as AmMenuItem;
    const currentIdx = enabled.indexOf(current);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : (currentIdx + 1) % enabled.length;
        this._setFocus(next);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev =
          currentIdx < 0
            ? enabled.length - 1
            : (currentIdx - 1 + enabled.length) % enabled.length;
        this._setFocus(prev);
        break;
      }
      case 'Home': {
        e.preventDefault();
        this._setFocus(0);
        break;
      }
      case 'End': {
        e.preventDefault();
        this._setFocus(enabled.length - 1);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (current && enabled.includes(current)) {
          current.click();
        }
        break;
      }
    }
  };

  private _handleSlotChange() {
    // Initialize roving tabindex: first enabled item gets tabindex 0
    const allItems = this._items ?? [];
    const enabled = this._getEnabledItems();

    allItems.forEach(item => {
      item.setAttribute('tabindex', '-1');
    });

    if (enabled.length > 0) {
      enabled[0].setAttribute('tabindex', '0');
    }
  }

  render() {
    return html`<slot @slotchange=${this._handleSlotChange}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-menu': AmMenu;
    'am-menu-item': AmMenuItem;
    'am-menu-divider': AmMenuDivider;
  }
}
