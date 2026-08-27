import { afterEach } from 'vitest';

type MockInternalsState = {
  formValue: FormData | File | string | null;
  validity: ValidityStateFlags;
  validationMessage: string;
};

const internalsKey = Symbol.for('amris.test.elementInternals');

class MockElementInternals implements Partial<ElementInternals> {
  form: HTMLFormElement | null = null;
  labels = [] as unknown as NodeListOf<HTMLLabelElement>;
  role: string | null = null;
  states = new Set<string>() as unknown as CustomStateSet;
  ariaAtomic: string | null = null;
  ariaAutoComplete: string | null = null;
  ariaBrailleLabel: string | null = null;
  ariaBrailleRoleDescription: string | null = null;
  ariaBusy: string | null = null;
  ariaChecked: string | null = null;
  ariaColCount: string | null = null;
  ariaColIndex: string | null = null;
  ariaColIndexText: string | null = null;
  ariaColSpan: string | null = null;
  ariaCurrent: string | null = null;
  ariaDescription: string | null = null;
  ariaDisabled: string | null = null;
  ariaExpanded: string | null = null;
  ariaHasPopup: string | null = null;
  ariaHidden: string | null = null;
  ariaInvalid: string | null = null;
  ariaKeyShortcuts: string | null = null;
  ariaLabel: string | null = null;
  ariaLevel: string | null = null;
  ariaLive: string | null = null;
  ariaModal: string | null = null;
  ariaMultiLine: string | null = null;
  ariaMultiSelectable: string | null = null;
  ariaOrientation: string | null = null;
  ariaPlaceholder: string | null = null;
  ariaPosInSet: string | null = null;
  ariaPressed: string | null = null;
  ariaReadOnly: string | null = null;
  ariaRequired: string | null = null;
  ariaRoleDescription: string | null = null;
  ariaRowCount: string | null = null;
  ariaRowIndex: string | null = null;
  ariaRowIndexText: string | null = null;
  ariaRowSpan: string | null = null;
  ariaSelected: string | null = null;
  ariaSetSize: string | null = null;
  ariaSort: string | null = null;
  ariaValueMax: string | null = null;
  ariaValueMin: string | null = null;
  ariaValueNow: string | null = null;
  ariaValueText: string | null = null;

  private state: MockInternalsState = {
    formValue: null,
    validity: {},
    validationMessage: '',
  };

  get shadowRoot(): ShadowRoot | null {
    return null;
  }

  get validity(): ValidityState {
    return this.state.validity as ValidityState;
  }

  get validationMessage(): string {
    return this.state.validationMessage;
  }

  get willValidate(): boolean {
    return true;
  }

  checkValidity(): boolean {
    return !Object.values(this.state.validity).some(Boolean);
  }

  reportValidity(): boolean {
    return this.checkValidity();
  }

  setFormValue(value: FormData | File | string | null) {
    this.state.formValue = value;
  }

  setValidity(flags: ValidityStateFlags = {}, message = '') {
    this.state.validity = flags;
    this.state.validationMessage = message;
  }

  get formValue(): FormData | File | string | null {
    return this.state.formValue;
  }
}

declare global {
  interface HTMLElement {
    [internalsKey]?: MockElementInternals;
  }

  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

// jsdom lane only: this file is the jsdom project's setupFile; the browser lane
// deliberately omits setupFiles so it exercises native Chromium ElementInternals.
//
// jsdom's form-associated ElementInternals support is incomplete — notably
// `setFormValue` is not implemented as of the pinned jsdom (^29) — and the whole
// jsdom form suite reads component form state through MockElementInternals via
// getMockInternals() (test/helpers.ts). Previously this override probed jsdom's
// native implementation and only fell back to the mock when `setFormValue` was
// missing. That coupled the suite to jsdom NOT implementing setFormValue: a
// future jsdom that added it would silently take the native branch and break
// every getMockInternals() call site with a confusing error (WR-08). Pin the
// jsdom lane to the mock unconditionally instead — behaviour-identical on the
// current jsdom, and no longer dependent on jsdom's form-support version.
// Real form-association fidelity is covered by the browser lane.
Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
  configurable: true,
  value(this: HTMLElement) {
    if (!this[internalsKey]) {
      this[internalsKey] = new MockElementInternals();
    }

    return this[internalsKey];
  },
});

// Phase 10 (COMPAT-01/02): jsdom's GLOBAL `ElementInternals` is a partial stub —
// `setFormValue` is absent from its prototype, unlike every real browser at or
// above the Safari 16.4 floor, where `ElementInternals` ships form association
// wholesale. `capabilities.ts`'s `hasFormAssociation()` probe reads
// `'setFormValue' in globalThis.ElementInternals.prototype` to detect that floor,
// so WITHOUT this shim the jsdom lane would read as BELOW the floor and
// short-circuit `attachInternalsSafe()` to null — regressing every above-floor
// form/validation spec (which reach form state through the MockElementInternals
// the `attachInternals` override above already provides). Define a no-op
// `setFormValue` on the jsdom global prototype so it honestly advertises the
// form-association capability the mock actually implements. The capability-off
// specs delete the whole `globalThis.ElementInternals` to force the below-floor
// path deterministically.
if (
  typeof globalThis.ElementInternals !== 'undefined' &&
  !('setFormValue' in globalThis.ElementInternals.prototype)
) {
  Object.defineProperty(globalThis.ElementInternals.prototype, 'setFormValue', {
    configurable: true,
    writable: true,
    value(this: ElementInternals) {
      /* no-op: jsdom form-association fidelity is covered by the browser lane */
    },
  });
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

if (!window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
}

const dialogPrototype = HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal?: () => void;
  close?: (returnValue?: string) => void;
  returnValue?: string;
};

if (!dialogPrototype.showModal) {
  dialogPrototype.showModal = function showModal() {
    this.setAttribute('open', '');
    this.open = true;
  };
}

if (!dialogPrototype.close) {
  dialogPrototype.close = function close(returnValue = '') {
    this.returnValue = returnValue;
    this.removeAttribute('open');
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

if (typeof globalThis.DataTransfer === 'undefined') {
  class DataTransferStub {
    private _items: File[] = [];

    get items() {
      const self = this;
      return {
        add(file: File) { self._items.push(file); },
        remove(i: number) { self._items.splice(i, 1); },
        clear() { self._items.length = 0; },
        get length() { return self._items.length; },
        [Symbol.iterator]() { return self._items[Symbol.iterator](); },
      };
    }

    get files(): FileList {
      const items = this._items;
      const list = Object.create(FileList.prototype);
      items.forEach((f, i) => { list[i] = f; });
      Object.defineProperty(list, 'length', { value: items.length });
      list.item = (idx: number) => items[idx] ?? null;
      return list;
    }
  }

  (globalThis as Record<string, unknown>).DataTransfer = DataTransferStub;
}

afterEach(() => {
  document.body.innerHTML = '';
});

export { internalsKey, MockElementInternals };
