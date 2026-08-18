/**
 * ShortcutRegistry — the FEAT-03 keyboard-shortcut engine: registration with
 * same-scope conflict detection, `mod`/`opt` platform normalization, scope
 * stacking, and a serializable help-sheet list.
 *
 * It registers no custom element, so it never appears on the frozen CEM/public
 * surface (D-08/D-09). It lives under `src/internal/` and is imported only by
 * component source (the `am-shortcuts` provider in a later plan) — it is NEVER
 * re-exported from `src/index.ts` / `src/index.all.ts`.
 *
 * The registry is an EXPLICIT INSTANCE — there is no module-level mutable state
 * and no global singleton (D-08 no-global-state). A provider element owns one
 * instance and hands it down its subtree.
 *
 * Conflict policy (D-11): a same-scope collision keeps the FIRST binding and
 * refuses the second, returning an inspectable `{ ok: false, reason: 'conflict',
 * existingId }`. `register` NEVER throws — a conflict during a component connect
 * must not break rendering. Combos are parsed into structured modifier flags;
 * the registry never `eval`s / `new Function`s any combo string (ASVS V5).
 */

/** A shortcut scope. `'global'` is the always-present base scope. */
export type ShortcutScope = 'global' | (string & {});

/**
 * A shortcut registration (the frozen v1.0 argument shape — Option A, D-08).
 *
 * @property id           Stable id for the registration (used by `unregister`).
 * @property keys         Combo notation, e.g. `'mod+k'`, `'opt+shift+p'`. `mod`
 *                        normalizes to Cmd on macOS else Ctrl; `opt` to Alt.
 * @property scope        Scope name; defaults to `'global'`.
 * @property handler      Invoked when the combo resolves in an active scope.
 * @property allowSingleKey  Opt-in for bare single-character shortcuts
 *                        (WCAG 2.1.4 — off by default).
 * @property description  Human label for the help sheet (`list`/`serialize`).
 */
export type Shortcut = {
  id: string;
  keys: string;
  scope?: ShortcutScope;
  handler: (e: KeyboardEvent) => void;
  allowSingleKey?: boolean;
  description?: string;
};

/**
 * The frozen v1.0 result of {@link ShortcutRegistry.register} (Option A, D-11).
 * Never thrown — always returned and inspectable. `existingId` names the
 * winning first binding on a conflict.
 */
export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: 'conflict' | 'reserved'; existingId?: string };

/** A serializable registration entry for the help sheet (FEAT-V2-01 seam). */
export type ShortcutListEntry = {
  id: string;
  keys: string;
  scope: ShortcutScope;
  description?: string;
};

/** Construction options — `platform` is injectable so tests can pin macOS/Win. */
export type ShortcutRegistryOptions = {
  /**
   * Raw platform string (as from `navigator.platform` /
   * `navigator.userAgentData.platform`). When omitted it is detected once from
   * `navigator`. Injectable purely so the mod/opt normalization is testable.
   */
  platform?: string;
};

type StoredShortcut = {
  id: string;
  keys: string;
  combo: string;
  scope: ShortcutScope;
  handler: (e: KeyboardEvent) => void;
  description?: string;
};

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

type NormalizedCombo = {
  /** Canonical combo string, e.g. `'ctrl+shift+k'`. */
  combo: string;
  /** Number of modifier keys in the combo. */
  modifierCount: number;
  /** The non-modifier key, lowercased, e.g. `'k'`, `'tab'`, `'f5'`. */
  mainKey: string;
};

/** Detect the platform string once, defensively (SSR/jsdom-safe). */
function detectPlatform(): string {
  const nav: (Navigator & { userAgentData?: { platform?: string } }) | undefined =
    typeof navigator !== 'undefined' ? navigator : undefined;
  return nav?.userAgentData?.platform ?? nav?.platform ?? '';
}

export class ShortcutRegistry {
  /** Whether `mod` maps to Cmd (metaKey). Detected ONCE at construction. */
  private readonly _isMac: boolean;

  /** scope → (normalized combo → registration). */
  private readonly _byScope = new Map<ShortcutScope, Map<string, StoredShortcut>>();

  /** id → registration, preserving insertion order for {@link list}. */
  private readonly _byId = new Map<string, StoredShortcut>();

  constructor(options?: ShortcutRegistryOptions) {
    const platform = options?.platform ?? detectPlatform();
    this._isMac = /mac|iphone|ipad|ipod/i.test(platform);
  }

  /**
   * Register a shortcut. On a same-scope collision keeps the first binding and
   * returns `{ ok: false, reason: 'conflict', existingId }` (D-11 — never
   * throws). The same combo in a different scope registers independently.
   */
  register(shortcut: Shortcut): RegisterResult {
    const scope: ShortcutScope = shortcut.scope ?? 'global';
    const { combo } = this._normalize(shortcut.keys);

    const scopeBindings = this._byScope.get(scope);
    const existing = scopeBindings?.get(combo);
    if (existing) {
      return { ok: false, reason: 'conflict', existingId: existing.id };
    }

    const stored: StoredShortcut = {
      id: shortcut.id,
      keys: shortcut.keys,
      combo,
      scope,
      handler: shortcut.handler,
      description: shortcut.description,
    };

    if (scopeBindings) {
      scopeBindings.set(combo, stored);
    } else {
      this._byScope.set(scope, new Map([[combo, stored]]));
    }
    this._byId.set(shortcut.id, stored);

    return { ok: true };
  }

  /**
   * Resolve a combo against a stack of active scopes. The topmost active scope
   * that binds the combo wins; `'global'` is always the base fallback. Returns
   * the bound handler, or `undefined` when nothing binds it.
   */
  resolve(
    keys: string,
    activeScopes: readonly ShortcutScope[],
  ): ((e: KeyboardEvent) => void) | undefined {
    const { combo } = this._normalize(keys);

    // Topmost first: the most recently pushed scope wins.
    const searchOrder: ShortcutScope[] = [...activeScopes].reverse();
    if (!searchOrder.includes('global')) {
      searchOrder.push('global');
    }

    for (const scope of searchOrder) {
      const hit = this._byScope.get(scope)?.get(combo);
      if (hit) {
        return hit.handler;
      }
    }
    return undefined;
  }

  /** Remove a registration by id. Returns whether a binding was removed. */
  unregister(id: string): boolean {
    const stored = this._byId.get(id);
    if (!stored) {
      return false;
    }

    this._byId.delete(id);
    const scopeBindings = this._byScope.get(stored.scope);
    scopeBindings?.delete(stored.combo);
    if (scopeBindings && scopeBindings.size === 0) {
      this._byScope.delete(stored.scope);
    }
    return true;
  }

  /**
   * The current registrations, in registration order, as a readonly list for a
   * help sheet. Original `keys` notation is preserved (e.g. `'mod+k'`) so a UI
   * can render it platform-aware.
   */
  list(): ReadonlyArray<ShortcutListEntry> {
    const entries: ShortcutListEntry[] = [];
    for (const stored of this._byId.values()) {
      entries.push(this._toEntry(stored));
    }
    return entries;
  }

  /**
   * A JSON-serializable snapshot of the registrations (the FEAT-V2-01
   * persistence seam — the registry ships NO persistence store; storage stays
   * consumer-owned). Handlers are intentionally omitted.
   */
  serialize(): ShortcutListEntry[] {
    return this.list().map((entry) => ({ ...entry }));
  }

  private _toEntry(stored: StoredShortcut): ShortcutListEntry {
    return {
      id: stored.id,
      keys: stored.keys,
      scope: stored.scope,
      description: stored.description,
    };
  }

  /**
   * Parse a combo string into a canonical, order-independent form. `mod`/`opt`
   * are normalized to the platform's real modifiers. Never throws: malformed or
   * empty input yields an empty/degenerate combo rather than an error.
   */
  private _normalize(keys: string): NormalizedCombo {
    const raw = String(keys ?? '');
    const tokens = raw
      .toLowerCase()
      .split('+')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const mods = new Set<Modifier>();
    let mainKey = '';

    for (const token of tokens) {
      switch (token) {
        case 'mod':
          mods.add(this._isMac ? 'meta' : 'ctrl');
          break;
        case 'cmd':
        case 'command':
        case 'meta':
        case 'super':
        case 'win':
          mods.add('meta');
          break;
        case 'ctrl':
        case 'control':
          mods.add('ctrl');
          break;
        case 'opt':
        case 'option':
        case 'alt':
          mods.add('alt');
          break;
        case 'shift':
          mods.add('shift');
          break;
        default:
          mainKey = token;
          break;
      }
    }

    const orderedMods = MODIFIER_ORDER.filter((m) => mods.has(m));
    const combo = [...orderedMods, mainKey].filter((p) => p.length > 0).join('+');
    return { combo, modifierCount: orderedMods.length, mainKey };
  }
}
