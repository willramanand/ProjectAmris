import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ContextConsumer } from '@lit/context';
import { resetStyles } from '../../styles/reset.css.js';
import { shortcutRegistryContext } from '../shortcuts/shortcuts.js';
import type { ShortcutRegistry } from '../../internal/controllers/shortcut-registry.js';

/** The id this palette uses when it registers its open combo through a provider. */
const OPEN_SHORTCUT_ID = 'command-palette.open';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group?: string;
  action?: () => void;
}

/**
 * Command Palette — a keyboard-triggered search and command interface.
 *
 * Open with Ctrl+K / Cmd+K, or set `open` programmatically.
 * Pass an array of `CommandItem` objects via the `commands` property.
 *
 * When placed inside an `am-shortcuts` provider, the open combo is registered
 * through the shared registry (rebindable as `command-palette.open`). With no
 * provider present it falls back to a hardcoded Cmd/Ctrl+K document listener,
 * so the drop-in behavior is unchanged (D-09).
 *
 * @csspart dialog - The dialog element
 * @csspart input - The search input
 * @csspart list - The results list
 * @csspart item - Each result item
 *
 * @fires am-select - Fires when a command is selected with { command } detail
 * @fires am-close - Fires when the palette closes
 *
 * @example
 * ```html
 * <am-command-palette .commands=${commands}></am-command-palette>
 * ```
 */
@customElement('am-command-palette')
export class AmCommandPalette extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() placeholder = 'Search commands...';
  @property({ type: Array }) commands: CommandItem[] = [];

  @state() private _query = '';
  @state() private _highlightedIndex = 0;

  @query('dialog') private _dialog!: HTMLDialogElement;
  @query('input') private _input!: HTMLInputElement;

  private _previouslyFocused: Element | null = null;

  /**
   * The registry this palette registered its open combo with, when an
   * `am-shortcuts` provider exists in its subtree. `undefined` means no provider
   * is present and the hardcoded Cmd/Ctrl+K document listener is the active path
   * (D-09 graceful fallback).
   */
  private _activeRegistry?: ShortcutRegistry;

  /** Whether the hardcoded document-keydown fallback is currently attached. */
  private _fallbackActive = false;

  constructor() {
    super();
    // Subscribe to a shortcut registry provided up the subtree (D-09). The
    // ContextConsumer registers itself as a reactive controller (side effect),
    // so no stored reference is needed. When a registry appears the palette
    // registers a rebindable `mod+k` through it and drops the hardcoded document
    // listener; when it disappears, the hardcoded Cmd/Ctrl+K fallback is restored.
    new ContextConsumer(this, {
      context: shortcutRegistryContext,
      subscribe: true,
      callback: (registry?: ShortcutRegistry) => {
        this._onRegistryChange(registry);
      },
    });
  }

  static styles = [
    resetStyles,
    css`
      :host { display: contents; }

      dialog {
        position: fixed;
        inset: 0;
        margin: auto;
        margin-top: min(20vh, 10rem);
        margin-bottom: auto;
        border: none;
        padding: 0;
        background: var(--am-surface-raised);
        color: var(--am-text);
        border-radius: var(--am-radius-2xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-xl);
        width: min(36rem, calc(100vw - 2rem));
        max-height: min(60vh, 24rem);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      dialog:not([open]) { display: none; }

      dialog::backdrop {
        background: rgb(0 0 0 / 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .input-row {
        display: flex;
        align-items: center;
        gap: var(--am-space-3);
        padding: var(--am-space-3) var(--am-space-4);
        border-bottom: var(--am-border-1) solid var(--am-border-subtle);
      }

      .search-icon {
        width: 1.125rem;
        height: 1.125rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
      }

      input {
        all: unset;
        flex: 1;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      input::placeholder { color: var(--am-text-tertiary); }

      .list {
        flex: 1;
        overflow-y: auto;
        padding: var(--am-space-1);
      }

      .group-label {
        padding: var(--am-space-2) var(--am-space-3);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .item {
        display: flex;
        align-items: center;
        gap: var(--am-space-3);
        padding: var(--am-space-2) var(--am-space-3);
        border-radius: var(--am-radius-md);
        corner-shape: squircle;
        cursor: pointer;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      .item:hover, .item.highlighted {
        background: var(--am-hover-overlay);
      }

      .item-content {
        flex: 1;
        min-width: 0;
      }

      .item-label {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text);
      }

      .item-description {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
      }

      .item-shortcut {
        display: inline-flex;
        align-items: center;
        gap: 0.125rem;
        font-family: var(--am-font-mono, monospace);
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
        background: var(--am-surface-sunken);
        padding: 0.125rem 0.375rem;
        border-radius: var(--am-radius-sm);
        flex-shrink: 0;
      }

      .item-shortcut .cmd-icon {
        width: 0.75rem;
        height: 0.75rem;
      }

      .empty {
        padding: var(--am-space-6) var(--am-space-4);
        text-align: center;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text-tertiary);
      }

      .footer {
        display: flex;
        align-items: center;
        gap: var(--am-space-3);
        padding: var(--am-space-2) var(--am-space-4);
        border-top: var(--am-border-1) solid var(--am-border-subtle);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
      }

      kbd {
        font-family: var(--am-font-mono, monospace);
        font-size: 0.625rem;
        background: var(--am-surface-sunken);
        padding: 0.0625rem 0.25rem;
        border-radius: var(--am-radius-sm);
        border: var(--am-border-1) solid var(--am-border);
      }

      @media (prefers-reduced-motion: reduce) {
        .item { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    // The context consumer requests the registry during super.connectedCallback()
    // (its hostConnected). If a provider responded synchronously, the registry
    // path is already active; otherwise fall back to the hardcoded listener.
    if (!this._activeRegistry) {
      this._addFallback();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeFallback();
    if (this._activeRegistry) {
      this._activeRegistry.unregister(OPEN_SHORTCUT_ID);
      this._activeRegistry = undefined;
    }
  }

  /**
   * React to a change in the provided registry (D-09). Registering through a
   * provider takes over from the hardcoded fallback; losing the provider
   * restores it. Idempotent for repeat callbacks with the same registry.
   */
  private _onRegistryChange(registry?: ShortcutRegistry) {
    if (registry === this._activeRegistry) return;

    // Tear down the previous registration (if any).
    if (this._activeRegistry) {
      this._activeRegistry.unregister(OPEN_SHORTCUT_ID);
      this._activeRegistry = undefined;
    }

    if (registry) {
      // Provider present: register a rebindable open combo, drop the fallback.
      this._removeFallback();
      registry.register({
        id: OPEN_SHORTCUT_ID,
        keys: 'mod+k',
        handler: () => {
          this.open = !this.open;
        },
        description: 'Open command palette',
      });
      this._activeRegistry = registry;
    } else {
      // Provider gone: restore today's hardcoded Cmd/Ctrl+K behavior.
      this._addFallback();
    }
  }

  private _addFallback() {
    if (this._fallbackActive) return;
    document.addEventListener('keydown', this._handleGlobalKeydown);
    this._fallbackActive = true;
  }

  private _removeFallback() {
    if (!this._fallbackActive) return;
    document.removeEventListener('keydown', this._handleGlobalKeydown);
    this._fallbackActive = false;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('open')) {
      // `changed.get('open')` is the PREVIOUS value — `undefined` on the first
      // update. Open whenever `open` is truthy (so a mounted-open palette still
      // shows); only run the close/am-close branch when a prior open state
      // existed, so a never-opened palette never emits a spurious am-close on
      // mount (WR-01).
      const prev = changed.get('open');
      if (this.open) {
        this._previouslyFocused = document.activeElement;
        this._query = '';
        this._highlightedIndex = 0;
        this._dialog?.showModal();
        requestAnimationFrame(() => this._input?.focus());
      } else if (prev) {
        this._dialog?.close();
        if (this._previouslyFocused instanceof HTMLElement && this._previouslyFocused.isConnected) {
          this._previouslyFocused.focus();
        }
        this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
      }
    }
  }

  private _handleGlobalKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.open = !this.open;
    }
  };

  private get _filtered(): CommandItem[] {
    if (!this._query) return this.commands;
    const q = this._query.toLowerCase();
    return this.commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q)
    );
  }

  /**
   * The filtered commands flattened into the SAME grouped order that
   * {@link render} emits (items are grouped by `group` in first-seen order).
   * Keyboard navigation and Enter-selection index into this list so the
   * visually `.highlighted` item is always the item Enter executes, even when
   * consumer groups interleave, e.g. `[{group:'A'},{group:'B'},{group:'A'}]`
   * (CR-01).
   */
  private get _ordered(): CommandItem[] {
    const groups = new Map<string, CommandItem[]>();
    for (const cmd of this._filtered) {
      const g = cmd.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(cmd);
    }
    return Array.from(groups.values()).flat();
  }

  private _handleInput(e: Event) {
    this._query = (e.target as HTMLInputElement).value;
    this._highlightedIndex = 0;
  }

  private _handleKeydown(e: KeyboardEvent) {
    const ordered = this._ordered;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._highlightedIndex = Math.min(this._highlightedIndex + 1, ordered.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;
      case 'Enter':
        if (ordered[this._highlightedIndex]) {
          e.preventDefault();
          this._selectCommand(ordered[this._highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.open = false;
        break;
    }
  }

  private _handleBackdropClick(e: MouseEvent) {
    const rect = this._dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      this.open = false;
    }
  }

  private _cmdIcon = html`<svg class="cmd-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M180,144H160V112h20a36,36,0,1,0-36-36V96H112V76a36,36,0,1,0-36,36H96v32H76a36,36,0,1,0,36,36V160h32v20a36,36,0,1,0,36-36ZM160,76a20,20,0,1,1,20,20H160ZM56,76a20,20,0,0,1,40,0V96H76A20,20,0,0,1,56,76ZM96,180a20,20,0,1,1-20-20H96Zm16-68h32v32H112Zm68,88a20,20,0,0,1-20-20V160h20a20,20,0,0,1,0,40Z"/></svg>`;

  private _renderShortcut(shortcut: string) {
    const parts = shortcut.split('⌘');
    if (parts.length === 1) return shortcut;
    return parts.map((part, i) => html`${i > 0 ? this._cmdIcon : nothing}${part}`);
  }

  private _selectCommand(cmd: CommandItem) {
    this.open = false;
    cmd.action?.();
    this.dispatchEvent(new CustomEvent('am-select', {
      detail: { command: cmd },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const filtered = this._filtered;

    // Group commands
    const groups = new Map<string, CommandItem[]>();
    for (const cmd of filtered) {
      const g = cmd.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(cmd);
    }

    let itemIndex = 0;

    return html`
      <dialog part="dialog"
        @click=${this._handleBackdropClick}
        @cancel=${(e: Event) => { e.preventDefault(); this.open = false; }}
      >
        <div class="input-row">
          <svg class="search-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14l-3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            part="input"
            .value=${this._query}
            placeholder=${this.placeholder}
            @input=${this._handleInput}
            @keydown=${this._handleKeydown}
          />
        </div>

        <div class="list" part="list">
          ${filtered.length === 0
            ? html`<div class="empty">No commands found.</div>`
            : repeat(
                Array.from(groups.entries()),
                ([group]) => group ?? '__ungrouped__',
                ([group, items]) => html`
                  ${group ? html`<div class="group-label">${group}</div>` : nothing}
                  ${repeat(items, cmd => cmd.id, cmd => {
                    const idx = itemIndex++;
                    return html`
                      <div class="item ${idx === this._highlightedIndex ? 'highlighted' : ''}"
                        part="item"
                        @click=${() => this._selectCommand(cmd)}>
                        <div class="item-content">
                          <div class="item-label">${cmd.label}</div>
                          ${cmd.description ? html`<div class="item-description">${cmd.description}</div>` : nothing}
                        </div>
                        ${cmd.shortcut ? html`<span class="item-shortcut">${this._renderShortcut(cmd.shortcut)}</span>` : nothing}
                      </div>
                    `;
                  })}
                `,
              )}
        </div>

        <div class="footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-command-palette': AmCommandPalette;
  }
}
