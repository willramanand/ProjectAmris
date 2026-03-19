import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Dialog — a modal dialog overlay with focus trapping.
 * Uses the native <dialog> element for proper semantics.
 *
 * @slot - Dialog body content
 * @slot header - Dialog header (title area)
 * @slot footer - Dialog footer (action buttons)
 *
 * @csspart dialog - The native dialog element
 * @csspart header - The header region
 * @csspart body - The body region
 * @csspart footer - The footer region
 * @csspart close - The close button
 * @csspart backdrop - The backdrop overlay
 *
 * @cssprop --am-dialog-radius - Override border radius
 * @cssprop --am-dialog-padding - Override content padding
 *
 * @fires am-open - Fires when the dialog opens
 * @fires am-close - Fires when the dialog closes
 *
 * @example
 * ```html
 * <am-dialog label="Confirm" open>
 *   <p>Are you sure you want to continue?</p>
 *   <div slot="footer">
 *     <am-button variant="ghost" onclick="this.closest('am-dialog').open = false">Cancel</am-button>
 *     <am-button>Confirm</am-button>
 *   </div>
 * </am-dialog>
 * ```
 */
@customElement('am-dialog')
export class AmDialog extends LitElement {
  /** Whether the dialog is open. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Accessible label for the dialog. */
  @property() label = '';

  /** Dialog width preset. */
  @property({ reflect: true }) size: DialogSize = 'md';

  /** Whether to show a close button. */
  @property({ type: Boolean }) closable = true;

  /** Whether clicking the backdrop closes the dialog. */
  @property({ type: Boolean, attribute: 'close-on-backdrop' }) closeOnBackdrop = false;

  @query('dialog') private dialogEl!: HTMLDialogElement;

  private _previouslyFocused: Element | null = null;

  static styles = [
    resetStyles,
    css`
      :host { display: contents; }

      dialog {
        position: fixed;
        inset: 0;
        margin: auto;
        border: none;
        padding: 0;
        background: var(--am-surface-raised);
        color: var(--am-text);
        border-radius: var(--am-dialog-radius, var(--am-radius-2xl));
        corner-shape: squircle;
        box-shadow: var(--am-shadow-xl);
        max-height: min(85vh, 40rem);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      dialog:not([open]) { display: none; }

      /* Sizes */
      :host([size='sm']) dialog { width: min(24rem, calc(100vw - 2rem)); }
      :host([size='md']) dialog, :host(:not([size])) dialog { width: min(32rem, calc(100vw - 2rem)); }
      :host([size='lg']) dialog { width: min(40rem, calc(100vw - 2rem)); }
      :host([size='xl']) dialog { width: min(56rem, calc(100vw - 2rem)); }

      dialog::backdrop {
        background: rgb(0 0 0 / 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--am-space-3);
        padding: var(--am-dialog-padding, var(--am-space-5)) var(--am-dialog-padding, var(--am-space-6));
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
        padding: var(--am-space-4) var(--am-dialog-padding, var(--am-space-6));
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
        padding: var(--am-space-4) var(--am-dialog-padding, var(--am-space-6));
        border-top: var(--am-border-1) solid var(--am-border-subtle);
      }

      /* Hide empty footer */
      .footer:not(:has(::slotted(*))) { display: none; }

      /* ---- Nudge animation on blocked backdrop click ---- */

      @keyframes dialog-nudge {
        0% { transform: scale(1); }
        25% { transform: scale(1.02); }
        50% { transform: scale(0.98); }
        75% { transform: scale(1.01); }
        100% { transform: scale(1); }
      }

      dialog.nudge {
        animation: dialog-nudge 0.3s var(--am-ease-spring);
      }

      @media (prefers-reduced-motion: reduce) {
        .close-btn { transition: none; }
        dialog.nudge { animation: none; }
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
    this.dialogEl?.showModal();
    this.dispatchEvent(new CustomEvent('am-open', { bubbles: true, composed: true }));
  }

  private _hide() {
    this.dialogEl?.close();
    if (this._previouslyFocused instanceof HTMLElement) {
      this._previouslyFocused.focus();
    }
    this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
  }

  private _handleBackdropClick(e: MouseEvent) {
    const rect = this.dialogEl.getBoundingClientRect();
    const clickedBackdrop =
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom;

    if (!clickedBackdrop) return;

    if (this.closeOnBackdrop) {
      this.open = false;
    } else {
      this._nudge();
    }
  }

  private _nudge() {
    this.dialogEl.classList.remove('nudge');
    // Force reflow so re-adding the class restarts the animation
    void this.dialogEl.offsetWidth;
    this.dialogEl.classList.add('nudge');
    this.dialogEl.addEventListener('animationend', () => {
      this.dialogEl.classList.remove('nudge');
    }, { once: true });
  }

  private _handleCancel(e: Event) {
    if (!this.closeOnBackdrop) {
      e.preventDefault();
      this._nudge();
      return;
    }
    e.preventDefault();
    this.open = false;
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
            ? html`<button class="close-btn" part="close" aria-label="Close dialog" @click=${() => { this.open = false; }}>
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
    'am-dialog': AmDialog;
  }
}
