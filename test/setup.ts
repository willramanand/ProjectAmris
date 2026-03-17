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

const nativeAttachInternals = HTMLElement.prototype.attachInternals;

Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
  configurable: true,
  value(this: HTMLElement) {
    try {
      const internals = nativeAttachInternals?.call(this);
      if (
        internals &&
        typeof (internals as Partial<ElementInternals>).setFormValue === 'function'
      ) {
        return internals;
      }
    } catch {
      // Fall back to a mock when jsdom throws or returns a partial implementation.
    }

    if (!this[internalsKey]) {
      this[internalsKey] = new MockElementInternals();
    }

    return this[internalsKey];
  },
});

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

afterEach(() => {
  document.body.innerHTML = '';
});

export { internalsKey, MockElementInternals };
