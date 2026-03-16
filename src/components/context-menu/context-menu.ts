import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Context Menu — a right-click triggered floating menu.
 *
 * Wraps a trigger area; right-clicking within it positions
 * and opens the menu content at the cursor.
 *
 * @slot - Trigger area content
 * @slot menu - Menu content (typically `<am-menu>`)
 *
 * @csspart panel - The floating menu panel
 *
 * @fires am-show - Fires when the menu opens
 * @fires am-hide - Fires when the menu closes
 *
 * @example
 * ```html
 * <am-context-menu>
 *   <div style="padding: 2rem; border: 1px dashed grey;">Right-click here</div>
 *   <am-menu slot="menu">
 *     <am-menu-item>Cut</am-menu-item>
 *     <am-menu-item>Copy</am-menu-item>
 *     <am-menu-item>Paste</am-menu-item>
 *   </am-menu>
 * </am-context-menu>
 * ```
 */
@customElement('am-context-menu')
export class AmContextMenu extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  @query('.panel') private _panel!: HTMLElement;

  static styles = [
    resetStyles,
    css`
      :host { display: block; position: relative; }

      .panel {
        position: fixed;
        z-index: var(--am-z-dropdown);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      :host([open]) .panel {
        opacity: 1;
        pointer-events: auto;
      }

      @media (prefers-reduced-motion: reduce) {
        .panel { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('contextmenu', this._handleContextMenu);
    document.addEventListener('click', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
    document.addEventListener('contextmenu', this._handleDocumentContext);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('contextmenu', this._handleContextMenu);
    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
    document.removeEventListener('contextmenu', this._handleDocumentContext);
  }

  private _handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    this.open = true;

    // Position at cursor
    if (this._panel) {
      // Ensure it fits in viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = e.clientX;
      let y = e.clientY;

      // Defer to let panel render, then adjust
      requestAnimationFrame(() => {
        if (!this._panel) return;
        const rect = this._panel.getBoundingClientRect();
        if (x + rect.width > vw) x = vw - rect.width - 4;
        if (y + rect.height > vh) y = vh - rect.height - 4;
        Object.assign(this._panel.style, { left: `${x}px`, top: `${y}px` });
      });

      Object.assign(this._panel.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
    }

    this.dispatchEvent(new CustomEvent('am-show', { bubbles: true, composed: true }));
  };

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!this.open) return;
    if (!e.composedPath().includes(this._panel)) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('am-hide', { bubbles: true, composed: true }));
    }
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('am-hide', { bubbles: true, composed: true }));
    }
  };

  private _handleDocumentContext = (e: MouseEvent) => {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) {
      this.open = false;
    }
  };

  render() {
    return html`
      <slot></slot>
      <div class="panel" part="panel">
        <slot name="menu"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-context-menu': AmContextMenu;
  }
}
