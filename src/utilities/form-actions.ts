export function getAssociatedForm(host: HTMLElement, internals?: ElementInternals | null): HTMLFormElement | null {
  return (internals?.form as HTMLFormElement | null) ?? host.closest('form');
}

export function requestAssociatedFormSubmit(
  host: HTMLElement,
  options: {
    event?: Event;
    internals?: ElementInternals | null;
    disabled?: boolean;
    readonly?: boolean;
  } = {}
): boolean {
  const { event, internals, disabled = false, readonly = false } = options;
  if (disabled || readonly) {
    return false;
  }

  if (event?.defaultPrevented) {
    return false;
  }

  if (event instanceof KeyboardEvent && event.isComposing) {
    return false;
  }

  const form = getAssociatedForm(host, internals);
  if (!form) {
    return false;
  }

  event?.preventDefault();
  form.requestSubmit();
  return true;
}

export function resetAssociatedForm(host: HTMLElement, internals?: ElementInternals | null): boolean {
  const form = getAssociatedForm(host, internals);
  if (!form) {
    return false;
  }

  form.reset();
  return true;
}
