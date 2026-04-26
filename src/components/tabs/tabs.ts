import { LitElement, css, html } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type TabVariant = 'underline' | 'pill' | 'vertical';

/* ================================================================
   AmTab — individual tab trigger
   ================================================================ */

/**
 * Tab — a single tab trigger. Place inside am-tabs with slot="nav".
 *
 * @slot - Tab label content
 * @csspart tab - The tab button
 */
@customElement('am-tab')
export class AmTab extends LitElement {
  /** The name of the panel this tab controls. */
  @property({ reflect: true }) panel = '';

  /** Whether this tab is selected. Managed by am-tabs. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Whether this tab is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Visual variant. Managed by am-tabs. */
  @property({ reflect: true }) variant: TabVariant = 'underline';

  static styles = css`
    :host { display: inline-flex; }

    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: var(--am-space-2);
      padding: var(--am-space-2) var(--am-space-4);
      font-family: var(--am-font-sans);
      font-size: var(--am-text-sm);
      font-weight: var(--am-weight-medium);
      color: var(--am-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition:
        color var(--am-duration-fast) var(--am-ease-default),
        border-color var(--am-duration-fast) var(--am-ease-default);
    }

    button:hover { color: var(--am-text); }

    :host([selected]) button {
      color: var(--am-primary);
      border-bottom-color: var(--am-primary);
    }

    :host([disabled]) button {
      opacity: var(--am-disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
    }

    button:focus-visible {
      outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
      outline-offset: calc(-1 * var(--am-focus-ring-width));
      border-radius: var(--am-radius-sm);
    }

    /* ---- Pill variant ---- */

    :host([variant='pill']) button {
      border-bottom: none;
      border-radius: var(--am-radius-lg);
      corner-shape: squircle;
      padding: var(--am-space-2) var(--am-space-4);
      transition:
        color var(--am-duration-fast) var(--am-ease-default),
        background var(--am-duration-fast) var(--am-ease-default),
        box-shadow var(--am-duration-fast) var(--am-ease-default);
    }

    :host([variant='pill'][selected]) button {
      color: var(--am-text);
      font-weight: var(--am-weight-semibold);
      background: var(--am-surface-raised);
      box-shadow: var(--am-shadow-xs);
    }

    :host([variant='pill']) button:focus-visible {
      border-radius: var(--am-radius-lg);
      corner-shape: squircle;
    }

    /* ---- Vertical variant ---- */

    :host([variant='vertical']) { display: flex; }

    :host([variant='vertical']) button {
      position: relative;
      width: 100%;
      border-bottom: none;
      border-radius: var(--am-radius-lg);
      corner-shape: squircle;
      padding: var(--am-space-3) var(--am-space-4);
      transition:
        color var(--am-duration-fast) var(--am-ease-default),
        background var(--am-duration-fast) var(--am-ease-default);
    }

    :host([variant='vertical']) button::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%) scaleY(0);
      width: 2px;
      height: 60%;
      border-radius: var(--am-radius-full);
      background: var(--am-primary);
      transition: transform var(--am-duration-fast) var(--am-ease-spring);
    }

    :host([variant='vertical']) button:hover {
      background: var(--am-hover-overlay);
    }

    :host([variant='vertical'][selected]) button {
      color: var(--am-primary);
      background: var(--am-hover-overlay);
    }

    :host([variant='vertical'][selected]) button::before {
      transform: translateY(-50%) scaleY(1);
    }

    :host([variant='vertical']) button:focus-visible {
      border-radius: var(--am-radius-lg);
      corner-shape: squircle;
    }

    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `;

  render() {
    return html`
      <button
        part="tab"
        role="tab"
        aria-selected=${String(this.selected)}
        ?disabled=${this.disabled}
        tabindex=${this.selected ? '0' : '-1'}
      >
        <slot></slot>
      </button>
    `;
  }
}

/* ================================================================
   AmTabPanel — individual tab panel
   ================================================================ */

/**
 * Tab Panel — content panel controlled by a am-tab.
 *
 * @slot - Panel content
 */
@customElement('am-tab-panel')
export class AmTabPanel extends LitElement {
  /** Unique name linking this panel to a am-tab. */
  @property({ reflect: true }) name = '';

  /** Whether this panel is active. Managed by am-tabs. */
  @property({ type: Boolean, reflect: true }) active = false;

  static styles = css`
    :host { display: block; }
    :host(:not([active])) { display: none; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
  }

  render() {
    return html`<slot></slot>`;
  }
}

/* ================================================================
   AmTabs — tab group container
   ================================================================ */

/**
 * Tabs — a tabbed interface container. Manages selection,
 * ARIA attributes, and keyboard navigation.
 *
 * @slot nav - Tab triggers (am-tab elements)
 * @slot - Tab panels (am-tab-panel elements)
 *
 * @csspart nav - The tab navigation bar
 *
 * @fires am-tab-change - Fires when the active tab changes with { panel } detail
 *
 * @example
 * ```html
 * <am-tabs>
 *   <am-tab slot="nav" panel="one">Tab 1</am-tab>
 *   <am-tab slot="nav" panel="two">Tab 2</am-tab>
 *   <am-tab-panel name="one">Content 1</am-tab-panel>
 *   <am-tab-panel name="two">Content 2</am-tab-panel>
 * </am-tabs>
 * ```
 */
@customElement('am-tabs')
export class AmTabs extends LitElement {
  /** The currently active panel name. */
  @property({ reflect: true, attribute: 'active-panel' }) activePanel = '';

  /** Visual variant of the tab group. */
  @property({ reflect: true }) variant: TabVariant = 'underline';

  @queryAssignedElements({ slot: 'nav', selector: 'am-tab' })
  private _tabs!: AmTab[];

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .nav {
        display: flex;
        position: relative;
        isolation: isolate;

        overflow-x: auto;
        scrollbar-width: none;
      }

      .nav::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--am-border);
        pointer-events: none;
        z-index: -1;
      }

      .nav::-webkit-scrollbar { display: none; }

      .panels {
        padding-top: var(--am-space-4);
      }

      /* ---- Pill variant ---- */

      :host([variant='pill']) .nav {
        display: inline-flex;
        border-bottom: none;
        background: var(--am-surface-sunken);
        border: var(--am-border-1) solid var(--am-border-subtle);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        padding: var(--am-space-1);
        gap: var(--am-space-1);
      }

      :host([variant='pill']) .nav::after { display: none; }

      /* ---- Vertical variant ---- */

      :host([variant='vertical']) {
        display: flex;
        flex-direction: row;
      }

      :host([variant='vertical']) .nav {
        flex-direction: column;
        flex-shrink: 0;
        overflow-x: visible;
        overflow-y: auto;
        min-width: 12rem;
      }

      :host([variant='vertical']) .nav::after { display: none; }

      :host([variant='vertical']) .panels {
        padding-top: 0;
        padding-inline-start: var(--am-space-4);
        flex: 1;
        min-width: 0;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._handleTabClick);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleTabClick);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  protected async firstUpdated() {
    await this.updateComplete;
    this._syncTabs();
  }

  private _syncTabs() {
    const tabs = this._tabs ?? [];
    const panels = this._getPanels();

    // Auto-select first tab if none active
    if (!this.activePanel && tabs.length > 0) {
      this.activePanel = tabs[0].panel;
    }

    tabs.forEach(tab => {
      tab.selected = tab.panel === this.activePanel;
      tab.variant = this.variant;
    });

    panels.forEach(panel => {
      panel.active = panel.name === this.activePanel;
    });
  }

  private _getPanels(): AmTabPanel[] {
    return [...this.querySelectorAll('am-tab-panel')] as AmTabPanel[];
  }

  private _handleTabClick = (e: Event) => {
    const tab = (e.target as Element).closest('am-tab') as AmTab | null;
    if (!tab || tab.disabled) return;
    this._selectTab(tab.panel);
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    const tab = (e.target as Element).closest('am-tab') as AmTab | null;
    if (!tab) return;

    const tabs = this._tabs.filter(t => !t.disabled);
    const idx = tabs.indexOf(tab);
    let next: AmTab | undefined;

    const isVertical = this.variant === 'vertical';
    const fwd = isVertical ? 'ArrowDown' : 'ArrowRight';
    const bwd = isVertical ? 'ArrowUp' : 'ArrowLeft';

    if (e.key === fwd) next = tabs[(idx + 1) % tabs.length];
    else if (e.key === bwd) next = tabs[(idx - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];

    if (next) {
      e.preventDefault();
      this._selectTab(next.panel);
      next.shadowRoot?.querySelector('button')?.focus();
    }
  };

  private _selectTab(panel: string) {
    if (panel === this.activePanel) return;
    this.activePanel = panel;
    this._syncTabs();
    this.dispatchEvent(new CustomEvent('am-tab-change', { detail: { panel }, bubbles: true, composed: true }));
  }

  private _handleSlotChange() {
    this._syncTabs();
  }

  render() {
    return html`
      <div class="nav" part="nav" role="tablist" aria-orientation=${this.variant === 'vertical' ? 'vertical' : 'horizontal'}>
        <slot name="nav" @slotchange=${this._handleSlotChange}></slot>
      </div>
      <div class="panels">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-tab': AmTab;
    'am-tab-panel': AmTabPanel;
    'am-tabs': AmTabs;
  }
}
