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
 * @cssprop --qz-dialog-radius - Override border radius
 * @cssprop --qz-dialog-padding - Override content padding
 *
 * @fires qz-open - Fires when the dialog opens
 * @fires qz-close - Fires when the dialog closes
 *
 * @example
 * ```html
 * <qz-dialog label="Confirm" open>
 *   <p>Are you sure you want to continue?</p>
 *   <div slot="footer">
 *     <qz-button variant="ghost" onclick="this.closest('qz-dialog').open = false">Cancel</qz-button>
 *     <qz-button>Confirm</qz-button>
 *   </div>
 * </qz-dialog>
 * ```
 */
@customElement('qz-dialog')
export class QzDialog extends LitElement {
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
        background: var(--qz-surface-raised);
        color: var(--qz-text);
        border-radius: var(--qz-dialog-radius, var(--qz-radius-2xl));
        corner-shape: squircle;
        box-shadow: var(--qz-shadow-xl);
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
        gap: var(--qz-space-3);
        padding: var(--qz-dialog-padding, var(--qz-space-5)) var(--qz-dialog-padding, var(--qz-space-6));
        padding-bottom: 0;
      }

      .title {
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-lg);
        font-weight: var(--qz-weight-semibold);
        color: var(--qz-text);
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
        border-radius: var(--qz-radius-lg);
        corner-shape: squircle;
        cursor: pointer;
        color: var(--qz-text-tertiary);
        flex-shrink: 0;
        transition:
          background var(--qz-duration-fast) var(--qz-ease-default),
          color var(--qz-duration-fast) var(--qz-ease-default);
      }

      .close-btn:hover { background: var(--qz-hover-overlay); color: var(--qz-text); }
      .close-btn:focus-visible {
        outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
        outline-offset: var(--qz-focus-ring-offset);
      }

      .body {
        padding: var(--qz-space-4) var(--qz-dialog-padding, var(--qz-space-6));
        overflow-y: auto;
        flex: 1;
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-sm);
        line-height: var(--qz-leading-normal);
        color: var(--qz-text-secondary);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--qz-space-2);
        padding: var(--qz-space-4) var(--qz-dialog-padding, var(--qz-space-6));
        border-top: var(--qz-border-1) solid var(--qz-border-subtle);
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
        animation: dialog-nudge 0.3s var(--qz-ease-spring);
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
    this.dispatchEvent(new CustomEvent('qz-open', { bubbles: true, composed: true }));
  }

  private _hide() {
    this.dialogEl?.close();
    if (this._previouslyFocused instanceof HTMLElement) {
      this._previouslyFocused.focus();
    }
    this.dispatchEvent(new CustomEvent('qz-close', { bubbles: true, composed: true }));
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
    'qz-dialog': QzDialog;
  }
}
