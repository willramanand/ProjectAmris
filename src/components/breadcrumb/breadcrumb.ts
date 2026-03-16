import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Breadcrumb Item — a single link/label in a breadcrumb trail.
 *
 * @slot - Label content
 * @csspart link - The anchor/span element
 * @csspart separator - The trailing separator
 *
 * @example
 * ```html
 * <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
 * <am-breadcrumb-item>Current Page</am-breadcrumb-item>
 * ```
 */
@customElement('am-breadcrumb-item')
export class AmBreadcrumbItem extends LitElement {
  /** URL this breadcrumb links to. Omit for the current (last) item. */
  @property() href = '';

  /** Marks this as the current page (auto-set by `am-breadcrumb`). */
  @property({ type: Boolean, reflect: true }) current = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--am-space-1-5);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
      }

      a {
        color: var(--am-text-link);
        text-decoration: none;
        border-radius: var(--am-radius-sm);
        transition: color var(--am-duration-fast) var(--am-ease-default);
      }

      a:hover { text-decoration: underline; }
      a:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .current-label {
        color: var(--am-text);
        font-weight: var(--am-weight-medium);
      }

      .separator {
        color: var(--am-text-tertiary);
        user-select: none;
        font-weight: normal;
      }

      .separator::after {
        content: var(--am-breadcrumb-separator, "/");
      }

      :host([current]) .separator { display: none; }

      @media (prefers-reduced-motion: reduce) {
        a { transition: none; }
      }
    `,
  ];

  render() {
    const label = this.href && !this.current
      ? html`<a part="link" href=${this.href}><slot></slot></a>`
      : html`<span class="current-label" part="link" aria-current=${this.current ? 'page' : 'false'}><slot></slot></span>`;

    return html`
      ${label}
      <span class="separator" part="separator" aria-hidden="true"></span>
    `;
  }
}

/* ================================================================
   AmBreadcrumb — container with auto-current detection
   ================================================================ */

/**
 * Breadcrumb — a navigation trail showing page hierarchy.
 *
 * Automatically marks the last item as `current`.
 *
 * @slot - `<am-breadcrumb-item>` elements
 * @csspart nav - The nav element
 *
 * @cssprop --am-breadcrumb-separator - Override separator character (default: "/")
 *
 * @example
 * ```html
 * <am-breadcrumb>
 *   <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
 *   <am-breadcrumb-item href="/products">Products</am-breadcrumb-item>
 *   <am-breadcrumb-item>Widget Pro</am-breadcrumb-item>
 * </am-breadcrumb>
 * ```
 */
@customElement('am-breadcrumb')
export class AmBreadcrumb extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      nav {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--am-space-1);
      }
    `,
  ];

  private _handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    const items = slot.assignedElements({ flatten: true })
      .filter((el): el is AmBreadcrumbItem => el.tagName === 'AM-BREADCRUMB-ITEM');

    items.forEach((item, i) => {
      item.current = i === items.length - 1;
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-label', 'Breadcrumb');
  }

  render() {
    return html`
      <nav part="nav" role="navigation">
        <slot @slotchange=${this._handleSlotChange}></slot>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-breadcrumb': AmBreadcrumb;
    'am-breadcrumb-item': AmBreadcrumbItem;
  }
}
