import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';

/**
 * Dropdown — a trigger button with a floating menu panel.
 *
 * Combines a trigger element with a floating panel,
 * handling positioning, open/close, and keyboard interaction.
 *
 * @slot - The trigger element
 * @slot content - Dropdown panel content (typically `<am-menu>`)
 *
 * @csspart panel - The floating panel
 *
 * @fires am-open - Fires when the dropdown opens
 * @fires am-close - Fires when the dropdown closes
 *
 * @example
 * ```html
 * <am-dropdown>
 *   <am-button variant="outlined">Options</am-button>
 *   <am-menu slot="content">
 *     <am-menu-item>Edit</am-menu-item>
 *     <am-menu-item>Duplicate</am-menu-item>
 *     <am-menu-divider></am-menu-divider>
 *     <am-menu-item destructive>Delete</am-menu-item>
 *   </am-menu>
 * </am-dropdown>
 * ```
 */
@customElement('am-dropdown')
export class AmDropdown extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() placement: Placement = 'bottom-start';
  @property({ type: Number }) offset = 4;
  @property({ type: Boolean, reflect: true }) disabled = false;

  @query('.panel') private _panel!: HTMLElement;

  /**
   * Floating positioning delegated to the shared controller (PERF-04). Options
   * mirror the previous inline setup exactly: anchored to the slotted trigger,
   * fixed strategy, live `placement`/`offset` getters. autoUpdate is gated to
   * the open transition — {@link start} on open, {@link stop} on close, and
   * {@link hostDisconnected} on disconnect.
   */
  private _floatingController = new FloatingPositionController(this, {
    reference: () => this.firstElementChild as HTMLElement | null,
    floating: () => this._panel,
    placement: () => this.placement,
    strategy: 'fixed',
    offset: () => this.offset,
  });

  static styles = [
    resetStyles,
    css`
      :host { display: inline-flex; position: relative; }

      .trigger { display: inline-flex; }

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

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachGlobalListeners();
    // The floating autoUpdate teardown is mirrored in the controller's
    // hostDisconnected (invoked during super.disconnectedCallback above).
  }

  private _attachGlobalListeners() {
    document.addEventListener('click', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  private _detachGlobalListeners() {
    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleTriggerClick = () => {
    if (this.disabled) return;
    this.open = !this.open;
  };

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) {
      this.open = false;
    }
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
    }
  };

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._attachGlobalListeners();
        this._floatingController.start();
        this.dispatchEvent(new CustomEvent('am-open', { bubbles: true, composed: true }));
      } else {
        this._detachGlobalListeners();
        this._floatingController.stop();
        this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
      }
    }
  }

  render() {
    return html`
      <div class="trigger" @click=${this._handleTriggerClick}>
        <slot></slot>
      </div>
      <div class="panel" part="panel">
        <slot name="content"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-dropdown': AmDropdown;
  }
}
