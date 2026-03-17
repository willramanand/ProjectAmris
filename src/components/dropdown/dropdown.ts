import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, offset, type Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

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
 * @fires am-show - Fires when the dropdown opens
 * @fires am-hide - Fires when the dropdown closes
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

  private _cleanupAutoUpdate: (() => void) | null = null;

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

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleKeydown);
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
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
        this._startAutoUpdate();
        this.dispatchEvent(new CustomEvent('am-show', { bubbles: true, composed: true }));
      } else {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        this.dispatchEvent(new CustomEvent('am-hide', { bubbles: true, composed: true }));
      }
    }
  }

  private _startAutoUpdate() {
    this._cleanupAutoUpdate?.();
    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this._panel) return;
    this._cleanupAutoUpdate = autoUpdate(trigger, this._panel, () => this._updatePosition());
  }

  private async _updatePosition() {
    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this._panel) return;

    const { x, y } = await computePosition(trigger, this._panel, {
      placement: this.placement,
      strategy: 'fixed',
      middleware: [offset(this.offset), flip(), shift({ padding: 8 })],
    });

    Object.assign(this._panel.style, { left: `${x}px`, top: `${y}px` });
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
