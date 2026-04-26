import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Nav Bar — a horizontal navigation bar.
 *
 * @slot brand - Logo or brand name (left)
 * @slot - Navigation items (center)
 * @slot actions - Action buttons/controls (right)
 *
 * @csspart nav - The nav container
 * @csspart brand - The brand slot wrapper
 * @csspart items - The navigation items wrapper
 * @csspart actions - The actions wrapper
 *
 * @cssprop --am-nav-bar-height - Override height (default: 3.5rem)
 * @cssprop --am-nav-bar-padding - Override horizontal padding
 *
 * @example
 * ```html
 * <am-nav-bar>
 *   <span slot="brand">Amris</span>
 *   <a href="/">Home</a>
 *   <a href="/docs">Docs</a>
 *   <am-button slot="actions" size="sm">Sign in</am-button>
 * </am-nav-bar>
 * ```
 */
@customElement('am-nav-bar')
export class AmNavBar extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        background: var(--am-surface);
        border-bottom: var(--am-border-1) solid var(--am-border);
      }

      nav {
        display: flex;
        align-items: center;
        height: var(--am-nav-bar-height, 3.5rem);
        padding-inline: var(--am-nav-bar-padding, var(--am-space-6));
        gap: var(--am-space-6);
        font-family: var(--am-font-sans);
      }

      .brand {
        display: flex;
        align-items: center;
        font-weight: var(--am-weight-semibold);
        font-size: var(--am-text-base);
        color: var(--am-text);
        flex-shrink: 0;
      }

      .items {
        display: flex;
        align-items: center;
        gap: var(--am-space-1);
        flex: 1;
      }

      .items ::slotted(a),
      .items ::slotted(button) {
        all: unset;
        display: inline-flex;
        align-items: center;
        padding: var(--am-space-1-5) var(--am-space-3);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text-secondary);
        border-radius: var(--am-radius-lg);
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
        text-decoration: none;
      }

      .items ::slotted(a:hover),
      .items ::slotted(button:hover) {
        background: var(--am-hover-overlay);
        color: var(--am-text);
      }

      .items ::slotted(a[aria-current]),
      .items ::slotted(a.active) {
        color: var(--am-primary);
        background: var(--am-primary-subtle);
      }

      .actions {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        margin-inline-start: auto;
      }

      @media (prefers-reduced-motion: reduce) {
        .items ::slotted(a), .items ::slotted(button) { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
  }

  render() {
    return html`
      <nav part="nav">
        <div class="brand" part="brand"><slot name="brand"></slot></div>
        <div class="items" part="items"><slot></slot></div>
        <div class="actions" part="actions"><slot name="actions"></slot></div>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-nav-bar': AmNavBar;
  }
}
