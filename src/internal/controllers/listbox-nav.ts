import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Per-host wiring for {@link ListboxNavController}.
 *
 * The controller owns the Arrow/Enter/Escape/Tab keyboard machinery but reads
 * and writes the host's own `_highlightedIndex` / open state through accessor
 * callbacks — so the index remains the host's `@state` (observable to the
 * characterization tests) rather than being absorbed into the controller. The
 * host keeps ownership of selection and the form-submit branch.
 */
export interface ListboxNavOptions {
  /** The currently-filtered option list the navigation moves over. */
  getOptions: () => string[];
  /** Read the host's highlighted index. */
  getIndex: () => number;
  /** Write the host's highlighted index. */
  setIndex: (index: number) => void;
  /** Read the host's open state. */
  getOpen: () => boolean;
  /** Write the host's open state. */
  setOpen: (open: boolean) => void;
  /** Commit the selected option (host-owned side effects: value, events). */
  onSelect: (option: string) => void;
  /**
   * Host-specific Enter fallback when no option is highlighted — combobox uses
   * this to request the associated form's submission. Kept in the host, passed
   * as a callback so it is never absorbed into the shared controller.
   */
  onEnterWithoutSelection: (event: KeyboardEvent) => void;
}

/**
 * ListboxNavController — a Lit Reactive Controller that owns the listbox
 * keyboard navigation (Arrow/Enter/Escape/Tab) and highlighted-index movement
 * previously inlined in combobox's `_handleKeydown`. It registers no custom
 * element (D-08/D-09).
 *
 * Behavior-preserving (D-10): the highlighted-index clamp matches combobox
 * exactly, INCLUDING the known un-clamp-on-replace — the index is NOT
 * re-clamped when the option list changes (that is FIX-02 / Phase 3). Movement
 * clamps only on the ArrowDown/ArrowUp keystroke, exactly as before.
 */
export class ListboxNavController implements ReactiveController {
  private opts: ListboxNavOptions;

  constructor(host: ReactiveControllerHost & HTMLElement, opts: ListboxNavOptions) {
    this.opts = opts;
    host.addController(this);
  }

  hostDisconnected(): void {
    // No global listeners owned here — the host manages its own teardown.
  }

  /** Handle a keydown from the host's input, mutating host state via callbacks. */
  handleKeydown(e: KeyboardEvent): void {
    const filtered = this.opts.getOptions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.opts.getOpen()) {
          this.opts.setOpen(true);
        }
        this.opts.setIndex(Math.min(this.opts.getIndex() + 1, filtered.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.opts.setIndex(Math.max(this.opts.getIndex() - 1, 0));
        break;

      case 'Enter': {
        const index = this.opts.getIndex();
        if (this.opts.getOpen() && index >= 0 && index < filtered.length) {
          e.preventDefault();
          this.opts.onSelect(filtered[index]);
          break;
        }

        this.opts.onEnterWithoutSelection(e);
        break;
      }

      case 'Escape':
        if (this.opts.getOpen()) {
          e.preventDefault();
          this.opts.setOpen(false);
          this.opts.setIndex(-1);
        }
        break;

      case 'Tab':
        this.opts.setOpen(false);
        this.opts.setIndex(-1);
        break;
    }
  }
}
