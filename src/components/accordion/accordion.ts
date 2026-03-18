import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { uniqueId } from '../../utilities/unique-id.js';

/* ================================================================
   AmAccordionItem — individual expandable section
   ================================================================ */

/**
 * Accordion Item — a single collapsible section.
 *
 * @slot - Body content
 * @slot header - Header/trigger content
 *
 * @csspart header - The clickable header button
 * @csspart body - The collapsible body region
 * @csspart chevron - The expand/collapse chevron icon
 *
 * @fires qz-toggle - Fires when toggled with { open } detail
 */
@customElement('am-accordion-item')
export class AmAccordionItem extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _headerId = uniqueId('accordion-header');
  private _bodyId = uniqueId('accordion-body');

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        border-bottom: var(--am-border-1) solid var(--am-border);
      }

      :host(:last-of-type) {
        border-bottom: none;
      }

      .header {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        box-sizing: border-box;
        padding: var(--am-space-4) var(--am-space-1);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        cursor: pointer;
        user-select: none;
        transition: color var(--am-duration-fast) var(--am-ease-default);
      }

      .header:hover { color: var(--am-primary); }

      :host([disabled]) .header {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .header:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: calc(-1 * var(--am-focus-ring-width));
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
      }

      .chevron {
        width: 1rem;
        height: 1rem;
        color: var(--am-text-tertiary);
        transition: transform var(--am-duration-normal) var(--am-ease-spring);
        flex-shrink: 0;
      }

      :host([open]) .chevron {
        transform: rotate(180deg);
      }

      .body-wrapper {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows var(--am-duration-normal) var(--am-ease-spring);
      }

      :host([open]) .body-wrapper {
        grid-template-rows: 1fr;
      }

      .body {
        overflow: hidden;
      }

      .body-inner {
        padding: 0 var(--am-space-1) var(--am-space-4);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text-secondary);
        line-height: var(--am-leading-normal);
      }

      @media (prefers-reduced-motion: reduce) {
        .chevron, .body-wrapper { transition: none; }
      }
    `,
  ];

  private _toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('am-toggle', { detail: { open: this.open }, bubbles: true, composed: true }));
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle();
    }
  }

  render() {
    return html`
      <button
        class="header"
        part="header"
        id=${this._headerId}
        aria-expanded=${String(this.open)}
        aria-controls=${this._bodyId}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @click=${this._toggle}
        @keydown=${this._handleKeyDown}
      >
        <slot name="header"></slot>
        <svg class="chevron" part="chevron" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="body-wrapper">
        <div
          class="body"
          part="body"
          id=${this._bodyId}
          role="region"
          aria-labelledby=${this._headerId}
        >
          <div class="body-inner">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

/* ================================================================
   AmAccordion — container that manages single/multiple expansion
   ================================================================ */

/**
 * Accordion — a group of collapsible sections.
 *
 * @slot - Accordion items (qz-accordion-item elements)
 *
 * @example
 * ```html
 * <qz-accordion>
 *   <qz-accordion-item open>
 *     <span slot="header">Section 1</span>
 *     Content for section 1.
 *   </qz-accordion-item>
 *   <qz-accordion-item>
 *     <span slot="header">Section 2</span>
 *     Content for section 2.
 *   </qz-accordion-item>
 * </qz-accordion>
 * ```
 */
@customElement('am-accordion')
export class AmAccordion extends LitElement {
  /** When true, only one item can be open at a time. */
  @property({ type: Boolean, reflect: true }) single = false;

  @queryAssignedElements({ selector: 'am-accordion-item' })
  private _items!: AmAccordionItem[];

  static styles = css`
    :host {
      display: block;
      border-radius: var(--am-radius-xl);
      corner-shape: squircle;
      overflow: hidden;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('am-toggle', this._handleToggle as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('am-toggle', this._handleToggle as EventListener);
  }

  private _handleToggle = (e: CustomEvent) => {
    if (!this.single) return;
    const toggled = e.target as AmAccordionItem;
    if (!toggled.open) return;
    for (const item of this._items) {
      if (item !== toggled) item.open = false;
    }
  };

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-accordion-item': AmAccordionItem;
    'am-accordion': AmAccordion;
  }
}
