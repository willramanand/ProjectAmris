import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

/**
 * Drawer — a slide-out panel overlay.
 *
 * Uses the native `<dialog>` element for focus trapping and
 * proper modal semantics, matching the Dialog component pattern.
 *
 * @slot - Drawer body content
 * @slot header - Header content (overrides `label`)
 * @slot footer - Footer content (action buttons)
 *
 * @csspart dialog - The native dialog element
 * @csspart header - The header region
 * @csspart body - The body region
 * @csspart footer - The footer region
 * @csspart close - The close button
 *
 * @cssprop --am-drawer-size - Override width (start/end) or height (top/bottom)
 *
 * @fires am-open - Fires when the drawer opens
 * @fires am-close - Fires when the drawer closes
 *
 * @example
 * ```html
 * <am-drawer label="Settings" placement="end" open>
 *   <p>Drawer body content here.</p>
 *   <div slot="footer">
 *     <am-button variant="ghost" onclick="this.closest('am-drawer').open = false">Cancel</am-button>
 *     <am-button>Save</am-button>
 *   </div>
 * </am-drawer>
 * ```
 */
@customElement('am-drawer')
export class AmDrawer extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() label = '';
  @property({ reflect: true }) placement: DrawerPlacement = 'end';
  @property({ reflect: true }) size: DrawerSize = 'md';
  @property({ type: Boolean }) closable = true;
  @property({ type: Boolean, attribute: 'close-on-backdrop' }) closeOnBackdrop = true;

  @query('dialog') private _dialog!: HTMLDialogElement;

  private _previouslyFocused: Element | null = null;

  static styles = [
    resetStyles,
    css`
      :host { display: contents; }

      dialog {
        position: fixed;
        border: none;
        padding: 0;
        margin: 0;
        background: var(--am-surface-raised);
        color: var(--am-text);
        box-shadow: var(--am-shadow-xl);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        max-width: none;
        max-height: none;
      }

      dialog:not([open]) { display: none; }

      dialog::backdrop {
        background: rgb(0 0 0 / 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      /* ---- Placement: start (left) / end (right) ---- */

      :host([placement='start']) dialog,
      :host([placement='end']) dialog {
        top: 0;
        bottom: 0;
        height: 100vh;
        height: 100dvh;
      }

      :host([placement='start']) dialog { left: 0; border-radius: 0 var(--am-radius-2xl) var(--am-radius-2xl) 0; }
      :host([placement='end']) dialog, :host(:not([placement])) dialog {
        right: 0;
        left: auto;
        border-radius: var(--am-radius-2xl) 0 0 var(--am-radius-2xl);
        top: 0; bottom: 0; height: 100vh; height: 100dvh;
      }

      /* Width for horizontal drawers */
      :host([placement='start'][size='sm']) dialog, :host([placement='end'][size='sm']) dialog { width: var(--am-drawer-size, min(20rem, 85vw)); }
      :host([placement='start'][size='md']) dialog, :host([placement='end'][size='md']) dialog,
      :host([placement='start']:not([size])) dialog, :host([placement='end']:not([size])) dialog,
      :host(:not([placement]):not([size])) dialog, :host(:not([placement])[size='md']) dialog { width: var(--am-drawer-size, min(28rem, 85vw)); }
      :host([placement='start'][size='lg']) dialog, :host([placement='end'][size='lg']) dialog,
      :host(:not([placement])[size='lg']) dialog { width: var(--am-drawer-size, min(40rem, 85vw)); }

      /* ---- Placement: top / bottom ---- */

      :host([placement='top']) dialog,
      :host([placement='bottom']) dialog {
        left: 0;
        right: 0;
        width: 100vw;
      }

      :host([placement='top']) dialog { top: 0; border-radius: 0 0 var(--am-radius-2xl) var(--am-radius-2xl); }
      :host([placement='bottom']) dialog { bottom: 0; top: auto; border-radius: var(--am-radius-2xl) var(--am-radius-2xl) 0 0; }

      :host([placement='top'][size='sm']) dialog, :host([placement='bottom'][size='sm']) dialog { height: var(--am-drawer-size, min(16rem, 60vh)); }
      :host([placement='top'][size='md']) dialog, :host([placement='bottom'][size='md']) dialog,
      :host([placement='top']:not([size])) dialog, :host([placement='bottom']:not([size])) dialog { height: var(--am-drawer-size, min(24rem, 60vh)); }
      :host([placement='top'][size='lg']) dialog, :host([placement='bottom'][size='lg']) dialog { height: var(--am-drawer-size, min(36rem, 80vh)); }

      /* ---- Interior layout ---- */

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--am-space-3);
        padding: var(--am-space-5) var(--am-space-6);
        padding-bottom: 0;
      }

      .title {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-lg);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text);
        margin: 0;
        flex: 1;
        min-width: 0;
      }

      .close-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        cursor: pointer;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition:
          background var(--am-duration-fast) var(--am-ease-default),
          color var(--am-duration-fast) var(--am-ease-default);
      }

      .close-btn:hover { background: var(--am-hover-overlay); color: var(--am-text); }
      .close-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .body {
        padding: var(--am-space-4) var(--am-space-6);
        overflow-y: auto;
        flex: 1;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text-secondary);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--am-space-2);
        padding: var(--am-space-4) var(--am-space-6);
        border-top: var(--am-border-1) solid var(--am-border-subtle);
      }

      .footer:not(:has(::slotted(*))) { display: none; }

      @media (prefers-reduced-motion: reduce) {
        .close-btn { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('open')) {
      if (this.open) this._show();
      else this._hide();
    }
  }

  private _show() {
    this._previouslyFocused = document.activeElement;
    this._dialog?.showModal();
    this.dispatchEvent(new CustomEvent('am-open', { bubbles: true, composed: true }));
  }

  private _hide() {
    this._dialog?.close();
    if (this._previouslyFocused instanceof HTMLElement) {
      this._previouslyFocused.focus();
    }
    this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
  }

  private _handleBackdropClick(e: MouseEvent) {
    const rect = this._dialog.getBoundingClientRect();
    const clickedBackdrop =
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom;

    if (clickedBackdrop && this.closeOnBackdrop) {
      this.open = false;
    }
  }

  private _handleCancel(e: Event) {
    e.preventDefault();
    if (this.closeOnBackdrop) {
      this.open = false;
    }
  }

  private _handleClose() {
    this.open = false;
  }

  render() {
    return html`
      <dialog
        part="dialog"
        aria-label=${this.label || nothing}
        @click=${this._handleBackdropClick}
        @cancel=${this._handleCancel}
        @close=${this._handleClose}
      >
        <div class="header" part="header">
          <h2 class="title">
            <slot name="header">${this.label}</slot>
          </h2>
          ${this.closable
            ? html`<button class="close-btn" part="close" aria-label="Close drawer" @click=${() => { this.open = false; }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>`
            : nothing}
        </div>
        <div class="body" part="body">
          <slot></slot>
        </div>
        <div class="footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-drawer': AmDrawer;
  }
}
