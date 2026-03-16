import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * List Item — a single row in a structured list.
 *
 * @slot - Primary label
 * @slot description - Secondary description text
 * @slot prefix - Leading content (icon, avatar)
 * @slot suffix - Trailing content (badge, action)
 *
 * @csspart item - The item container
 * @csspart prefix - The leading slot wrapper
 * @csspart content - The label + description wrapper
 * @csspart suffix - The trailing slot wrapper
 *
 * @fires am-select - Fires on click when interactive
 *
 * @example
 * ```html
 * <am-list-item>
 *   <am-avatar slot="prefix" initials="JD" size="sm"></am-avatar>
 *   Jane Doe
 *   <span slot="description">jane@example.com</span>
 *   <am-badge slot="suffix" variant="success" size="sm">Active</am-badge>
 * </am-list-item>
 * ```
 */
@customElement('am-list-item')
export class AmListItem extends LitElement {
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) interactive = false;
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--am-space-3);
        padding: var(--am-space-3) var(--am-space-4);
        font-family: var(--am-font-sans);
        color: var(--am-text);
      }

      :host([interactive]) {
        cursor: pointer;
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      :host([interactive]:hover) {
        background: var(--am-hover-overlay);
      }

      :host([interactive]:focus-visible) {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: calc(-1 * var(--am-focus-ring-width));
      }

      :host([selected]) {
        background: var(--am-primary-subtle);
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        pointer-events: none;
      }

      .prefix, .suffix {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      .content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .label {
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-snug);
      }

      .description {
        font-size: var(--am-text-xs);
        color: var(--am-text-secondary);
        line-height: var(--am-leading-normal);
      }

      .suffix {
        margin-left: auto;
      }

      @media (prefers-reduced-motion: reduce) {
        :host([interactive]) { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (this.interactive) {
      this.setAttribute('role', 'option');
      this.setAttribute('tabindex', '0');
      this.addEventListener('click', this._handleClick);
      this.addEventListener('keydown', this._handleKeyDown);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleClick = () => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('am-select', {
      detail: { item: this },
      bubbles: true,
      composed: true,
    }));
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
      e.preventDefault();
      this._handleClick();
    }
  };

  render() {
    return html`
      <span class="prefix" part="prefix"><slot name="prefix"></slot></span>
      <span class="content" part="content">
        <span class="label"><slot></slot></span>
        <span class="description"><slot name="description"></slot></span>
      </span>
      <span class="suffix" part="suffix"><slot name="suffix"></slot></span>
    `;
  }
}

/* ================================================================
   AmList — container for list items
   ================================================================ */

/**
 * List — a structured vertical list container.
 *
 * @slot - `<am-list-item>` elements
 * @csspart list - The list container
 *
 * @cssprop --am-list-divider - Set to "1" to show dividers between items
 *
 * @example
 * ```html
 * <am-list dividers>
 *   <am-list-item>Item one</am-list-item>
 *   <am-list-item>Item two</am-list-item>
 * </am-list>
 * ```
 */
@customElement('am-list')
export class AmList extends LitElement {
  /** Whether to show dividers between items. */
  @property({ type: Boolean, reflect: true }) dividers = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }

      :host([dividers]) ::slotted(am-list-item:not(:last-child)) {
        border-bottom: var(--am-border-1) solid var(--am-border-subtle);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'list');
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-list': AmList;
    'am-list-item': AmListItem;
  }
}
