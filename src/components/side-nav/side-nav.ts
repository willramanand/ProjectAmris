import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Side Nav Item — a single navigation link in a side nav.
 *
 * @slot - Label text
 * @slot prefix - Leading icon
 *
 * @csspart item - The item element
 *
 * @example
 * ```html
 * <am-side-nav-item href="/dashboard" active>Dashboard</am-side-nav-item>
 * ```
 */
@customElement('am-side-nav-item')
export class AmSideNavItem extends LitElement {
  @property() href = '';
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      a {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--am-space-2-5);
        padding: var(--am-space-2) var(--am-space-3);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text-secondary);
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
      }

      a:hover { background: var(--am-hover-overlay); color: var(--am-text); }

      a:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: calc(-1 * var(--am-focus-ring-width));
      }

      :host([active]) a {
        background: var(--am-primary-subtle);
        color: var(--am-primary);
      }

      :host([disabled]) a {
        opacity: var(--am-disabled-opacity);
        pointer-events: none;
      }

      .prefix {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }

      .prefix ::slotted(svg) { width: 1.125rem; height: 1.125rem; }

      @media (prefers-reduced-motion: reduce) {
        a { transition: none; }
      }
    `,
  ];

  render() {
    return html`
      <a part="item" href=${this.href || 'javascript:void(0)'}
         aria-current=${this.active ? 'page' : 'false'}>
        <span class="prefix"><slot name="prefix"></slot></span>
        <slot></slot>
      </a>
    `;
  }
}

/* ================================================================
   AmSideNav — vertical sidebar navigation container
   ================================================================ */

/**
 * Side Nav — a vertical sidebar navigation.
 *
 * @slot - `<am-side-nav-item>` elements
 * @slot header - Optional header content (logo, title)
 * @slot footer - Optional footer content
 *
 * @csspart nav - The nav container
 *
 * @cssprop --am-side-nav-width - Override width (default: 14rem)
 *
 * @example
 * ```html
 * <am-side-nav>
 *   <span slot="header" style="font-weight: 600;">My App</span>
 *   <am-side-nav-item href="/" active>Dashboard</am-side-nav-item>
 *   <am-side-nav-item href="/projects">Projects</am-side-nav-item>
 *   <am-side-nav-item href="/settings">Settings</am-side-nav-item>
 * </am-side-nav>
 * ```
 */
@customElement('am-side-nav')
export class AmSideNav extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: var(--am-side-nav-width, 14rem);
        height: 100%;
        background: var(--am-surface);
        border-inline-end: var(--am-border-1) solid var(--am-border);
        font-family: var(--am-font-sans);
      }

      .header {
        padding: var(--am-space-4) var(--am-space-4) var(--am-space-2);
        font-size: var(--am-text-sm);
      }

      .header:not(:has(::slotted(*))) { display: none; }

      .items {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--am-space-0-5);
        padding: var(--am-space-2) var(--am-space-2);
        overflow-y: auto;
      }

      .footer {
        padding: var(--am-space-2) var(--am-space-4) var(--am-space-4);
        border-top: var(--am-border-1) solid var(--am-border-subtle);
      }

      .footer:not(:has(::slotted(*))) { display: none; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
  }

  render() {
    return html`
      <div class="header"><slot name="header"></slot></div>
      <div class="items" part="nav"><slot></slot></div>
      <div class="footer"><slot name="footer"></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-side-nav': AmSideNav;
    'am-side-nav-item': AmSideNavItem;
  }
}
