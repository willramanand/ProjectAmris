/**
 * form-participation — internal helper for the opt-in hidden-input Light-DOM
 * form-participation fallback (COMPAT-03).
 *
 * Below the ElementInternals form-association floor (Safari < 16.4, Firefox < 98,
 * Chrome < 77) a form-associated custom element cannot report its value to the
 * enclosing `<form>` via `setFormValue`. This module restores form submission by
 * mirroring the control's value (and native `required`/`pattern` constraints)
 * onto a `<input type="hidden">` appended as a LIGHT-DOM child of the host — a
 * light-DOM descendant of the host is a descendant of the `<form>`, so the native
 * form serializes it (proven necessary by the `am-search-field` shadow-input
 * non-association finding, test/browser/form-association.test.ts:275-288).
 *
 * ## Off-CEM-surface discipline (mirrors lazy-load.ts)
 *
 * It registers no custom element and exports no component, so it never appears on
 * the frozen CEM/public surface. It lives under `src/internal/` and is imported
 * only by component source and by `src/compat-forms.ts` — never re-exported from
 * `src/index.ts` / `src/index.all.ts`, and tree-shaken from consumer bundles when
 * the opt-in subpath is not imported.
 *
 * ## Opt-in + XOR gate (D-01 / D-03)
 *
 * The fallback is a GLOBAL side-effect opt-in: `enableFormFallback()` is called
 * exactly once, by `src/compat-forms.ts`'s module side effect, when the consumer
 * imports `@willramanand/amris/compat-forms` at app init. The mechanism never
 * self-activates — `isFormFallbackEnabled()` defaults `false`.
 *
 * This module is deliberately capabilities.ts-agnostic: it makes NO capability
 * probe of its own. The XOR gate (engage the fallback ONLY when ElementInternals
 * form-association is absent, never alongside it — no double-submit) is the
 * CALLER's responsibility (the form components wired in Plans 04/05/06). Keeping
 * the gate out of this module is what makes it testable standalone.
 *
 * ## Lit-safe templating (CLAUDE.md constraint)
 *
 * The hidden-input mirror is built with `document.createElement('input')` and
 * direct property/attribute assignment only — no HTML-string parsing, no dynamic
 * code evaluation (CLAUDE.md Lit-safe templating constraint).
 */

/**
 * Reserved internal marker attribute stamped on every mirrored input so the
 * fallback node is identifiable in consumer light DOM (and discouraged as a
 * consumer script target). The value is authoritative in the owning component;
 * the input is a one-way mirror.
 */
const FALLBACK_MARKER = 'data-am-fallback';

/**
 * Per-host reference to the mirrored input, so a repeat {@link syncFormFallback}
 * updates the SAME node (idempotent find-or-create) instead of appending a
 * duplicate, and {@link teardownFormFallback} can remove exactly the node this
 * module created. Keyed by host so entries are GC'd with the host — no leak.
 */
const _mirrors = new WeakMap<HTMLElement, HTMLInputElement>();

/** Module-level opt-in flag; flipped true only by {@link enableFormFallback}. */
let _fallbackEnabled = false;

/** Module-level one-time dedup guard for {@link warnBelowFloorOnce}. */
let _warned = false;

/**
 * Options describing the control state to mirror onto the hidden input. `value`
 * and `name` are always mirrored; `required`/`pattern`/`disabled` project native
 * constraints (D-03 value + native validation).
 */
export type FormFallbackOptions = {
  name: string;
  value: string;
  required?: boolean;
  pattern?: string;
  disabled?: boolean;
};

/**
 * Enable the Light-DOM form-participation fallback process-wide. Called only by
 * `src/compat-forms.ts`'s module-level side effect when the consumer imports the
 * `@willramanand/amris/compat-forms` opt-in subpath.
 */
export function enableFormFallback(): void {
  _fallbackEnabled = true;
}

/**
 * Whether the consumer has opted into the Light-DOM form-participation fallback.
 * Defaults `false`; the mechanism never self-activates.
 */
export function isFormFallbackEnabled(): boolean {
  return _fallbackEnabled;
}

/**
 * Idempotently mirror `opts` onto a hidden `<input>` that is a light-DOM child of
 * `host`. The first call creates the input (appended to `host`, never the shadow
 * root) and stamps the reserved marker; every later call updates that SAME node.
 *
 * The caller is responsible for the XOR gate — call this ONLY when
 * ElementInternals form-association is absent (this module makes no such probe).
 */
export function syncFormFallback(host: HTMLElement, opts: FormFallbackOptions): void {
  let input = _mirrors.get(host);
  if (!input || input.parentNode !== host) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.hidden = true;
    input.setAttribute('aria-hidden', 'true');
    input.setAttribute(FALLBACK_MARKER, '');
    host.appendChild(input);
    _mirrors.set(host, input);
  }

  input.name = opts.name;
  input.value = opts.value;
  input.required = opts.required ?? false;
  input.disabled = opts.disabled ?? false;
  // `pattern` is set only when provided — omit the attribute entirely otherwise
  // (and clear a previously-set one on update) so native constraint validation
  // matches the control's actual constraints (D-03).
  if (opts.pattern !== undefined) {
    input.setAttribute('pattern', opts.pattern);
  } else {
    input.removeAttribute('pattern');
  }
}

/**
 * Remove the mirrored hidden input (if present) from `host` and clear the tracking
 * entry, so a `disconnectedCallback` leaves no stale node and a subsequent
 * connect + {@link syncFormFallback} cycle starts clean (no leak, no
 * double-register).
 */
export function teardownFormFallback(host: HTMLElement): void {
  const input = _mirrors.get(host);
  if (input && input.parentNode === host) {
    host.removeChild(input);
  }
  _mirrors.delete(host);
}

/**
 * Emit exactly one `console.warn` across the whole page, naming `tagName` and
 * pointing at the `@willramanand/amris/compat-forms` opt-in. The one-time global
 * guard means later calls — for the same OR a different tag — are silent until
 * {@link __resetFormParticipationForTest} runs (D-04: one-time, globally-deduped).
 */
export function warnBelowFloorOnce(tagName: string): void {
  if (_warned) return;
  _warned = true;
  console.warn(
    `[amris] <${tagName}> is below the ElementInternals form-association floor, ` +
      `so it cannot submit its value to an enclosing <form>. Import ` +
      `'@willramanand/amris/compat-forms' at app init to enable the hidden-input ` +
      `Light-DOM fallback below the floor.`,
  );
}

/**
 * Test-only: reset the module-level opt-in flag and one-time warn guard so each
 * spec starts from the default state (mirrors `__resetLazyLoadCachesForTest`).
 * Does not touch the per-host mirror WeakMap — those entries are keyed by host and
 * GC'd with the host. @internal — not re-exported from any barrel, tree-shaken
 * from consumer bundles.
 */
export function __resetFormParticipationForTest(): void {
  _fallbackEnabled = false;
  _warned = false;
}
