import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Tree Item — a single node in a tree view that can contain nested children.
 *
 * @slot - Nested tree items (children)
 * @slot icon - Icon before the label
 *
 * @csspart label - The label button
 * @csspart children - The children container
 *
 * @fires am-select - Fires when this item is selected with { value, label } detail
 * @fires am-toggle - Fires when expanded/collapsed with { open, value } detail
 *
 * @example
 * ```html
 * <am-tree-item label="Documents" value="docs">
 *   <am-tree-item label="README.md" value="readme"></am-tree-item>
 *   <am-tree-item label="LICENSE" value="license"></am-tree-item>
 * </am-tree-item>
 * ```
 */
@customElement('am-tree-item')
export class AmTreeItem extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Indentation depth — set automatically by the parent tree. */
  @property({ type: Number, reflect: true }) depth = 0;

  @property({ type: Boolean }) leaf = false;

  static styles = [
    resetStyles,
    css`
      :host { display: block; }
      :host([disabled]) { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .row {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--am-space-1-5);
        width: 100%;
        box-sizing: border-box;
        padding: var(--am-space-1-5) var(--am-space-2);
        padding-left: calc(var(--am-space-4) * var(--_depth, 0) + var(--am-space-2));
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
        cursor: pointer;
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .row:hover { background: var(--am-hover-overlay); }
      .row:active { background: var(--am-active-overlay); }

      :host([selected]) .row {
        background: var(--am-primary-subtle);
        color: var(--am-primary);
        font-weight: var(--am-weight-medium);
      }

      .row:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: calc(-1 * var(--am-focus-ring-width));
      }

      .chevron {
        width: 1rem; height: 1rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition: transform var(--am-duration-fast) var(--am-ease-default);
      }

      :host([open]) .chevron { transform: rotate(90deg); }

      .chevron-placeholder { width: 1rem; flex-shrink: 0; }

      ::slotted([slot='icon']) {
        width: 1rem; height: 1rem;
        flex-shrink: 0;
        color: var(--am-text-tertiary);
      }

      .children {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows var(--am-duration-normal) var(--am-ease-spring);
      }

      :host([open]) .children { grid-template-rows: 1fr; }

      .children-inner { overflow: hidden; }

      @media (prefers-reduced-motion: reduce) {
        .row, .chevron, .children { transition: none; }
      }
    `,
  ];

  private _hasChildren = false;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'treeitem');
  }

  private _handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    const children = slot.assignedElements().filter(el => el.tagName === 'AM-TREE-ITEM');
    this._hasChildren = children.length > 0;
    // Set depth on children
    children.forEach(child => {
      (child as AmTreeItem).depth = this.depth + 1;
    });
    this.requestUpdate();
  }

  private _toggle(e: Event) {
    e.stopPropagation();
    if (this.disabled) return;

    if (this._hasChildren) {
      this.open = !this.open;
      this.dispatchEvent(new CustomEvent('am-toggle', {
        detail: { open: this.open, value: this.value },
        bubbles: true, composed: true,
      }));
    }

    this.selected = true;
    this.dispatchEvent(new CustomEvent('am-select', {
      detail: { value: this.value, label: this.label },
      bubbles: true, composed: true,
    }));
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle(e);
    }
    if (e.key === 'ArrowRight' && this._hasChildren && !this.open) {
      e.preventDefault();
      this.open = true;
    }
    if (e.key === 'ArrowLeft' && this._hasChildren && this.open) {
      e.preventDefault();
      this.open = false;
    }
  }

  protected updated() {
    this.style.setProperty('--_depth', String(this.depth));
  }

  render() {
    return html`
      <button class="row" part="label"
        aria-expanded=${this._hasChildren ? String(this.open) : nothing}
        aria-selected=${String(this.selected)}
        @click=${this._toggle}
        @keydown=${this._handleKeydown}>
        ${this._hasChildren
          ? html`<svg class="chevron" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
          : html`<span class="chevron-placeholder"></span>`}
        <slot name="icon"></slot>
        <span>${this.label}</span>
      </button>
      <div class="children" part="children" role="group">
        <div class="children-inner">
          <slot @slotchange=${this._handleSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

/**
 * Tree View — a hierarchical list for navigating nested structures.
 *
 * @slot - Tree items (am-tree-item elements)
 *
 * @example
 * ```html
 * <am-tree-view>
 *   <am-tree-item label="src" value="src">
 *     <am-tree-item label="index.ts" value="index"></am-tree-item>
 *     <am-tree-item label="components" value="components">
 *       <am-tree-item label="button.ts" value="button"></am-tree-item>
 *     </am-tree-item>
 *   </am-tree-item>
 * </am-tree-view>
 * ```
 */
@customElement('am-tree-view')
export class AmTreeView extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--am-font-sans);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tree');
    this.addEventListener('am-select', this._handleSelect as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('am-select', this._handleSelect as EventListener);
  }

  private _handleSelect = (e: CustomEvent) => {
    // Deselect all other items
    const items = this.querySelectorAll('am-tree-item');
    items.forEach(item => {
      if (item !== e.target) item.selected = false;
    });
  };

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-tree-item': AmTreeItem;
    'am-tree-view': AmTreeView;
  }
}
