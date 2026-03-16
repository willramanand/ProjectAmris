import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { uniqueId } from '../../utilities/unique-id.js';

/* ================================================================
   QzAccordionItem — individual expandable section
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
@customElement('qz-accordion-item')
export class QzAccordionItem extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _headerId = uniqueId('accordion-header');
  private _bodyId = uniqueId('accordion-body');

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        border-bottom: var(--qz-border-1) solid var(--qz-border);
      }

      .header {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        box-sizing: border-box;
        padding: var(--qz-space-4) var(--qz-space-1);
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        font-weight: var(--qz-weight-medium);
        color: var(--qz-text);
        cursor: pointer;
        user-select: none;
        transition: color var(--qz-duration-fast) var(--qz-ease-default);
      }

      .header:hover { color: var(--qz-primary); }

      :host([disabled]) .header {
        opacity: var(--qz-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .header:focus-visible {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: calc(-1 * var(--qz-focus-ring-width));
        border-radius: var(--qz-radius-sm);
        corner-shape: squircle;
      }

      .chevron {
        width: 1rem;
        height: 1rem;
        color: var(--qz-text-tertiary);
        transition: transform var(--qz-duration-normal) var(--qz-ease-spring);
        flex-shrink: 0;
      }

      :host([open]) .chevron {
        transform: rotate(180deg);
      }

      .body-wrapper {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows var(--qz-duration-normal) var(--qz-ease-spring);
      }

      :host([open]) .body-wrapper {
        grid-template-rows: 1fr;
      }

      .body {
        overflow: hidden;
      }

      .body-inner {
        padding: 0 var(--qz-space-1) var(--qz-space-4);
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        color: var(--qz-text-secondary);
        line-height: var(--qz-leading-normal);
      }

      @media (prefers-reduced-motion: reduce) {
        .chevron, .body-wrapper { transition: none; }
      }
    `,
  ];

  private _toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('qz-toggle', { detail: { open: this.open }, bubbles: true, composed: true }));
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
   QzAccordion — container that manages single/multiple expansion
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
@customElement('qz-accordion')
export class QzAccordion extends LitElement {
  /** When true, only one item can be open at a time. */
  @property({ type: Boolean, reflect: true }) single = false;

  @queryAssignedElements({ selector: 'qz-accordion-item' })
  private _items!: QzAccordionItem[];

  static styles = css`
    :host {
      display: block;
      border-radius: var(--qz-radius-xl);
      corner-shape: squircle;
      overflow: hidden;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('qz-toggle', this._handleToggle as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('qz-toggle', this._handleToggle as EventListener);
  }

  private _handleToggle = (e: CustomEvent) => {
    if (!this.single) return;
    const toggled = e.target as QzAccordionItem;
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
    'qz-accordion-item': QzAccordionItem;
    'qz-accordion': QzAccordion;
  }
}
