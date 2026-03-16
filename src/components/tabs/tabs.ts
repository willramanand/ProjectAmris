import { LitElement, css, html } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/* ================================================================
   QzTab — individual tab trigger
   ================================================================ */

/**
 * Tab — a single tab trigger. Place inside qz-tabs with slot="nav".
 *
 * @slot - Tab label content
 * @csspart tab - The tab button
 */
@customElement('qz-tab')
export class QzTab extends LitElement {
  /** The name of the panel this tab controls. */
  @property({ reflect: true }) panel = '';

  /** Whether this tab is selected. Managed by qz-tabs. */
  @property({ type: Boolean, reflect: true }) selected = false;

  /** Whether this tab is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = css`
    :host { display: inline-flex; }

    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: var(--qz-space-2);
      padding: var(--qz-space-2) var(--qz-space-4);
      font-family: var(--qz-font-sans);
      font-size: var(--qz-text-sm);
      font-weight: var(--qz-weight-medium);
      color: var(--qz-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition:
        color var(--qz-duration-fast) var(--qz-ease-default),
        border-color var(--qz-duration-fast) var(--qz-ease-default);
    }

    button:hover { color: var(--qz-text); }

    :host([selected]) button {
      color: var(--qz-primary);
      border-bottom-color: var(--qz-primary);
    }

    :host([disabled]) button {
      opacity: var(--qz-disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
    }

    button:focus-visible {
      outline: var(--qz-focus-ring-width) solid var(--qz-focus-ring);
      outline-offset: calc(-1 * var(--qz-focus-ring-width));
      border-radius: var(--qz-radius-sm);
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
   QzTabPanel — individual tab panel
   ================================================================ */

/**
 * Tab Panel — content panel controlled by a qz-tab.
 *
 * @slot - Panel content
 */
@customElement('qz-tab-panel')
export class QzTabPanel extends LitElement {
  /** Unique name linking this panel to a qz-tab. */
  @property({ reflect: true }) name = '';

  /** Whether this panel is active. Managed by qz-tabs. */
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
   QzTabs — tab group container
   ================================================================ */

/**
 * Tabs — a tabbed interface container. Manages selection,
 * ARIA attributes, and keyboard navigation.
 *
 * @slot nav - Tab triggers (qz-tab elements)
 * @slot - Tab panels (qz-tab-panel elements)
 *
 * @csspart nav - The tab navigation bar
 *
 * @fires qz-tab-change - Fires when the active tab changes with { panel } detail
 *
 * @example
 * ```html
 * <qz-tabs>
 *   <qz-tab slot="nav" panel="one">Tab 1</qz-tab>
 *   <qz-tab slot="nav" panel="two">Tab 2</qz-tab>
 *   <qz-tab-panel name="one">Content 1</qz-tab-panel>
 *   <qz-tab-panel name="two">Content 2</qz-tab-panel>
 * </qz-tabs>
 * ```
 */
@customElement('qz-tabs')
export class QzTabs extends LitElement {
  /** The currently active panel name. */
  @property({ reflect: true, attribute: 'active-panel' }) activePanel = '';

  @queryAssignedElements({ slot: 'nav', selector: 'qz-tab' })
  private _tabs!: QzTab[];

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .nav {
        display: flex;
        border-bottom: var(--qz-border-1) solid var(--qz-border);
        overflow-x: auto;
        scrollbar-width: none;
      }

      .nav::-webkit-scrollbar { display: none; }

      .panels {
        padding-top: var(--qz-space-4);
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

  protected firstUpdated() {
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
    });

    panels.forEach(panel => {
      panel.active = panel.name === this.activePanel;
    });
  }

  private _getPanels(): QzTabPanel[] {
    return [...this.querySelectorAll('qz-tab-panel')] as QzTabPanel[];
  }

  private _handleTabClick = (e: Event) => {
    const tab = (e.target as Element).closest('qz-tab') as QzTab | null;
    if (!tab || tab.disabled) return;
    this._selectTab(tab.panel);
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    const tab = (e.target as Element).closest('qz-tab') as QzTab | null;
    if (!tab) return;

    const tabs = this._tabs.filter(t => !t.disabled);
    const idx = tabs.indexOf(tab);
    let next: QzTab | undefined;

    if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
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
    this.dispatchEvent(new CustomEvent('qz-tab-change', { detail: { panel }, bubbles: true, composed: true }));
  }

  private _handleSlotChange() {
    this._syncTabs();
  }

  render() {
    return html`
      <div class="nav" part="nav" role="tablist">
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
    'qz-tab': QzTab;
    'qz-tab-panel': QzTabPanel;
    'qz-tabs': QzTabs;
  }
}
