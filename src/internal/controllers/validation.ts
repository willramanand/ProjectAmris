import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Per-host options for {@link ValidationController}.
 *
 * `internals` and `anchor` are accessor callbacks (not eagerly-captured nodes)
 * so the controller reads each host's Shadow-DOM state lazily — the host may
 * attach its `ElementInternals` in the constructor and render its focusable
 * `anchor` only after the first update. `describedById` is the stable id the
 * host stamps onto BOTH the same-shadow-root message node and the inner
 * focusable's `aria-describedby` (Pitfall 3 — the reference only resolves when
 * target and referrer share a root).
 */
export type ValidationControllerOptions = {
  /** Resolves the host's attached ElementInternals. */
  internals: () => ElementInternals;
  /** Resolves the inner focusable the validity anchors to (e.g. the `<input>`). */
  anchor: () => HTMLElement | null;
  /** Stable id shared by the message node and the focusable's aria-describedby. */
  describedById: string;
};

/**
 * ValidationController — a Lit Reactive Controller that resolves a
 * form-associated control's *displayed* validation message and *shown* state
 * from two sources: a consumer/server-supplied custom error and the browser's
 * native `ElementInternals.validationMessage`.
 *
 * It registers no custom element, so it never appears on the frozen CEM/public
 * surface (D-09). It lives under `src/internal/` and is imported only by
 * component source — never re-exported from `src/index.ts` / `src/index.all.ts`.
 *
 * Precedence (D-03 custom-wins): a non-empty {@link setCustomError} message
 * overrides the native constraint message while set; `setCustomError('')`
 * clears the custom message and falls back to the native one (or to nothing
 * when there is no native violation).
 *
 * Timing (D-01): a *native* constraint message is withheld until the field has
 * been {@link markTouched} (blur or a failed form submit), so a pristine
 * required field shows NO error on first paint. A *custom* error is an explicit
 * programmatic act and shows immediately, independent of touch.
 *
 * The host owns rendering and `setValidity`; this controller only resolves
 * {@link message} / {@link invalid} and requests a host re-render. It never
 * throws — if internals are unavailable it resolves to empty/valid.
 */
export class ValidationController implements ReactiveController {
  private readonly _host: ReactiveControllerHost & HTMLElement;
  private readonly _opts: ValidationControllerOptions;
  private _custom: string | null = null;
  private _touched = false;

  constructor(host: ReactiveControllerHost & HTMLElement, opts: ValidationControllerOptions) {
    this._host = host;
    this._opts = opts;
    host.addController(this);
  }

  /**
   * No teardown is required — the controller holds no timers or listeners and
   * reads host state lazily via accessors. Present to satisfy the
   * {@link ReactiveController} contract.
   */
  hostDisconnected(): void {}

  /**
   * Set (or clear) the consumer/server-supplied error.
   *
   * @param message - The custom error text. A non-empty string overrides the
   *   native constraint message and shows immediately; `''` clears the custom
   *   error and falls back to the native message (D-03 custom-wins).
   */
  setCustomError(message: string): void {
    this._custom = message === '' ? null : message;
    this._refresh();
  }

  /** Mark the field interacted-with so native messages may surface (D-01). */
  markTouched(): void {
    this._touched = true;
    this._refresh();
  }

  /** Clear custom error and touched state (e.g. on form reset). */
  reset(): void {
    this._custom = null;
    this._touched = false;
    this._refresh();
  }

  /** The stable id shared by the message node and the anchor's aria-describedby. */
  get describedById(): string {
    return this._opts.describedById;
  }

  /**
   * The resolved message text: the custom error when set, else the native
   * constraint message. This is the text the host renders when {@link invalid}.
   */
  get message(): string {
    return this._custom ?? this._nativeMessage();
  }

  /**
   * Whether the error should be shown. A custom error shows immediately; a
   * native message shows only once the field is touched (D-01). Empty message
   * is never "invalid".
   */
  get invalid(): boolean {
    if (this.message === '') return false;
    return this._custom !== null || this._touched;
  }

  private _nativeMessage(): string {
    try {
      return this._opts.internals().validationMessage ?? '';
    } catch {
      // Internals not attached yet (e.g. jsdom without form support) — resolve
      // to no message rather than throwing into the host's render.
      return '';
    }
  }

  private _refresh(): void {
    this._host.requestUpdate();
  }
}
