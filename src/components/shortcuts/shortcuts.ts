import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ContextProvider, createContext } from '@lit/context';
import { ShortcutRegistry } from '../../internal/controllers/shortcut-registry.js';
import { TeardownScope } from '../../internal/helpers/teardown-scope.js';

/**
 * The context key that distributes a {@link ShortcutRegistry} instance down an
 * `am-shortcuts` subtree. Consumers (e.g. `am-command-palette`) resolve this via
 * a `ContextConsumer` to register rebindable shortcuts through the provider.
 */
export const shortcutRegistryContext = createContext<ShortcutRegistry>(
  'amris-shortcut-registry',
);

/**
 * True when `el` is an editable target that owns keyboard input — a native
 * `input`/`textarea`/`select`, a `contenteditable` node, or a form-associated
 * custom element. Single-key shortcuts are suppressed while such a target is
 * focused so typing a bare character never triggers a shortcut (WCAG 2.1.4).
 */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }
  if (el.isContentEditable) {
    return true;
  }
  // Form-associated custom elements (am-input, am-checkbox, …) own input too.
  const ctor = el.constructor as { formAssociated?: boolean };
  return ctor?.formAssociated === true;
}

/**
 * Shortcuts provider — owns a {@link ShortcutRegistry} instance and distributes
 * it per-subtree via `@lit/context`, then drives it from a single document
 * `keydown` listener.
 *
 * The listener resolves the true focused element with `event.composedPath()[0]`
 * so shadow-DOM retargeting cannot hide it (a document listener otherwise sees
 * the retargeted host). Single-key shortcuts are suppressed while that element
 * is editable or while `event.isComposing` is true (IME), so typing never fires
 * a shortcut. The listener is attached with a {@link TeardownScope} signal and
 * torn down on disconnect (no leak).
 *
 * The registry is an EXPLICIT INSTANCE owned by this element — there is no
 * module-level singleton or global state (D-08). Register imperatively via the
 * {@link registry} getter, or let subtree consumers register through context.
 *
 * @slot - Default slot for the subtree that shares this registry.
 *
 * @example
 * ```html
 * <am-shortcuts>
 *   <am-command-palette></am-command-palette>
 * </am-shortcuts>
 * ```
 */
@customElement('am-shortcuts')
export class AmShortcuts extends LitElement {
  /** The explicit registry instance owned by this provider (not a singleton). */
  private _registry = new ShortcutRegistry();

  /** Distributes {@link _registry} to the subtree via `@lit/context`. */
  private _provider = new ContextProvider(this, {
    context: shortcutRegistryContext,
    initialValue: this._registry,
  });

  /** Tears down the document `keydown` listener on disconnect (no leak). */
  private _teardown = new TeardownScope();

  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
  ];

  /**
   * The {@link ShortcutRegistry} this provider owns and distributes, so a
   * consumer can register/list shortcuts imperatively without context wiring.
   */
  get registry(): ShortcutRegistry {
    return this._registry;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Keep the provider value pinned to the owned instance across reconnects.
    this._provider.setValue(this._registry);
    document.addEventListener('keydown', this._onKeydown, {
      signal: this._teardown.signal,
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown.clear();
  }

  /**
   * Build the combo string for the registry from a keyboard event. Returns
   * `null` for a bare modifier press (e.g. pressing Ctrl alone), which is never
   * a shortcut. Canonical modifier tokens are used so the registry normalizes
   * them order-independently.
   */
  private _comboFromEvent(e: KeyboardEvent): string | null {
    const key = e.key;
    if (key === 'Control' || key === 'Meta' || key === 'Alt' || key === 'Shift') {
      return null;
    }
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('meta');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    const combo = this._comboFromEvent(e);
    if (combo === null) {
      return;
    }

    // Pierce shadow roots: a document listener otherwise sees the retargeted
    // host, not the true focused node (Pitfall 4).
    const target = e.composedPath()[0] ?? e.target;

    // A single-key shortcut is one WITHOUT ctrl/meta/alt — shift alone still
    // produces a character, so it counts as typing. Combos like mod+k always
    // fire (that is the point of a command-palette shortcut inside a field).
    const isSingleKey = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isSingleKey && (isEditableTarget(target) || e.isComposing)) {
      return;
    }

    const handler = this._registry.resolve(combo, ['global']);
    if (handler) {
      // The registry refuses reserved browser/OS combos at registration, so a
      // resolved handler is always a consumer combo we may safely default-cancel.
      e.preventDefault();
      handler(e);
    }
  };

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-shortcuts': AmShortcuts;
  }
}
