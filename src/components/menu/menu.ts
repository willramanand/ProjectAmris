import { LitElement, css, html } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/* ================================================================
   QzMenuDivider — horizontal separator between menu items
   ================================================================ */

/**
 * Menu Divider — a visual separator for grouping menu items.
 */
@customElement('qz-menu-divider')
export class QzMenuDivider extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: var(--qz-border-1);
      background: var(--qz-border);
      margin: var(--qz-space-1) 0;
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
   QzMenuItem — a single actionable item inside a menu
   ================================================================ */

/**
 * Menu Item — an actionable entry within a qz-menu.
 *
 * @slot - Label text
 * @slot prefix - Icon or content before the label
 * @slot suffix - Content after the label (e.g. keyboard shortcut hint)
 *
 * @fires qz-select - Fires on click with `{ item }` detail
 */
@customElement('qz-menu-item')
export class QzMenuItem extends LitElement {
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
        gap: var(--qz-space-2-5);
        padding: var(--qz-space-2) var(--qz-space-3);
        font-size: var(--qz-text-sm);
        color: var(--qz-text);
        border-radius: var(--qz-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        user-select: none;
        transition: background var(--qz-duration-fast) var(--qz-ease-default);
      }

      :host(:hover) {
        background: var(--qz-hover-overlay);
      }

      :host(:focus-visible) {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: calc(-1 * var(--qz-focus-ring-width));
      }

      :host([destructive]) {
        color: var(--qz-danger);
      }

      :host([destructive]:hover) {
        background: color-mix(in srgb, var(--qz-danger) 10%, transparent);
      }

      :host([disabled]) {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .checkmark {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        visibility: hidden;
      }

      :host([selected]) .checkmark {
        visibility: visible;
      }

      .prefix, .suffix {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      .label {
        flex: 1;
        min-width: 0;
      }

      .suffix {
        margin-left: auto;
        color: var(--qz-text-tertiary);
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
      new CustomEvent('qz-select', {
        detail: { item: this },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <svg class="checkmark" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="prefix"><slot name="prefix"></slot></span>
      <span class="label"><slot></slot></span>
      <span class="suffix"><slot name="suffix"></slot></span>
    `;
  }
}

/* ================================================================
   QzMenu — container for menu items with keyboard navigation
   ================================================================ */

/**
 * Menu — a container for menu items supporting keyboard navigation.
 *
 * Uses roving tabindex and arrow-key navigation between items.
 *
 * @slot - Menu items (qz-menu-item and qz-menu-divider elements)
 *
 * @example
 * ```html
 * <qz-menu>
 *   <qz-menu-item>Cut</qz-menu-item>
 *   <qz-menu-item>Copy</qz-menu-item>
 *   <qz-menu-item>Paste</qz-menu-item>
 *   <qz-menu-divider></qz-menu-divider>
 *   <qz-menu-item destructive>Delete</qz-menu-item>
 * </qz-menu>
 * ```
 */
@customElement('qz-menu')
export class QzMenu extends LitElement {
  @queryAssignedElements({ selector: 'qz-menu-item' })
  private _items!: QzMenuItem[];

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        padding: var(--qz-space-1);
        background: var(--qz-surface-raised);
        border: var(--qz-border-1) solid var(--qz-border);
        border-radius: var(--qz-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--qz-shadow-lg);
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

  private _getEnabledItems(): QzMenuItem[] {
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

    const current = e.target as QzMenuItem;
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
    'qz-menu': QzMenu;
    'qz-menu-item': QzMenuItem;
    'qz-menu-divider': QzMenuDivider;
  }
}
