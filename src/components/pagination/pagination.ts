import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Pagination — page navigation control.
 *
 * Renders page buttons with previous/next arrows and ellipsis
 * for large page counts.
 *
 * @csspart nav - The nav element
 * @csspart button - Each page/arrow button
 * @csspart active - The active page button
 * @csspart ellipsis - The ellipsis span
 *
 * @fires am-change - Fires when the page changes with `{ page }` detail
 *
 * @example
 * ```html
 * <am-pagination total="50" page="3"></am-pagination>
 * ```
 */
@customElement('am-pagination')
export class AmPagination extends LitElement {
  /** Total number of pages. */
  @property({ type: Number }) total = 1;

  /** Current active page (1-based). */
  @property({ type: Number, reflect: true }) page = 1;

  /** Maximum number of visible page buttons (excluding prev/next). */
  @property({ type: Number }) siblings = 1;

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      nav {
        display: flex;
        align-items: center;
        gap: var(--am-space-1);
        font-family: var(--am-font-sans);
      }

      button {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2rem;
        height: 2rem;
        padding: 0 var(--am-space-1-5);
        font-size: var(--am-text-sm);
        color: var(--am-text-secondary);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        user-select: none;
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
      }

      button:hover { background: var(--am-hover-overlay); color: var(--am-text); }
      button:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      button[aria-current='page'] {
        background: var(--am-primary);
        color: var(--am-primary-text);
        font-weight: var(--am-weight-medium);
      }

      button[aria-current='page']:hover {
        background: var(--am-primary-hover);
      }

      button[disabled] {
        opacity: var(--am-disabled-opacity);
        pointer-events: none;
        cursor: default;
      }

      .ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2rem;
        height: 2rem;
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
        user-select: none;
      }

      .arrow-icon {
        width: 1rem;
        height: 1rem;
      }

      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
      }
    `,
  ];

  private _getPageRange(): (number | 'ellipsis')[] {
    const total = Math.max(1, this.total);
    const current = Math.max(1, Math.min(this.page, total));
    const siblings = this.siblings;

    // If total pages is small enough, show all
    if (total <= (siblings * 2) + 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const leftSibling = Math.max(current - siblings, 1);
    const rightSibling = Math.min(current + siblings, total);

    const showLeftEllipsis = leftSibling > 3;
    const showRightEllipsis = rightSibling < total - 2;

    const pages: (number | 'ellipsis')[] = [];

    // Always show first page
    pages.push(1);

    if (showLeftEllipsis) {
      pages.push('ellipsis');
    } else {
      for (let i = 2; i < leftSibling; i++) pages.push(i);
    }

    // Sibling range
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== total) pages.push(i);
    }

    if (showRightEllipsis) {
      pages.push('ellipsis');
    } else {
      for (let i = rightSibling + 1; i < total; i++) pages.push(i);
    }

    // Always show last page
    if (total > 1) pages.push(total);

    return pages;
  }

  private _setPage(p: number) {
    const clamped = Math.max(1, Math.min(p, this.total));
    if (clamped === this.page) return;
    this.page = clamped;
    this.dispatchEvent(new CustomEvent('am-change', {
      detail: { page: this.page },
      bubbles: true,
      composed: true,
    }));
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Pagination');
  }

  render() {
    const pages = this._getPageRange();
    const current = Math.max(1, Math.min(this.page, this.total));

    return html`
      <nav part="nav">
        <button
          part="button"
          aria-label="Previous page"
          ?disabled=${current <= 1}
          @click=${() => this._setPage(current - 1)}
        >
          <svg class="arrow-icon" viewBox="0 0 16 16" fill="none">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        ${pages.map(p =>
          p === 'ellipsis'
            ? html`<span class="ellipsis" part="ellipsis" aria-hidden="true">&hellip;</span>`
            : html`<button
                part=${p === current ? 'button active' : 'button'}
                aria-current=${p === current ? 'page' : nothing}
                @click=${() => this._setPage(p)}
              >${p}</button>`
        )}

        <button
          part="button"
          aria-label="Next page"
          ?disabled=${current >= this.total}
          @click=${() => this._setPage(current + 1)}
        >
          <svg class="arrow-icon" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-pagination': AmPagination;
  }
}
