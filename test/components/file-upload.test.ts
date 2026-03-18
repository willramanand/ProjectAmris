import { describe, expect, it } from 'vitest';

import '../../src/components/file-upload/file-upload';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

function createFile(name: string, size: number, type = 'text/plain'): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('am-file-upload', () => {
  it('renders a dropzone', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const dropzone = shadowQuery<HTMLElement>(element, '.dropzone');
    expect(dropzone).toBeTruthy();
  });

  it('renders a hidden file input', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload accept=".jpg,.png"></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    expect(input).toBeTruthy();
    expect(input.accept).toBe('.jpg,.png');
  });

  it('supports multiple file selection', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload multiple></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    expect(input.multiple).toBe(true);
  });

  it('reflects disabled state', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload disabled></am-file-upload>',
    );

    expect(element.hasAttribute('disabled')).toBe(true);
  });

  it('renders label when provided', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload label="Upload files"></am-file-upload>',
    );

    const label = element.shadowRoot?.querySelector('.label');
    expect(label?.textContent?.trim()).toBe('Upload files');
  });

  it('adds files via the file input change event and emits am-files-selected', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    const file = createFile('test.txt', 100);

    // Simulate file selection
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });

    const eventPromise = oneEvent<{ files: File[] }>(element, 'am-files-selected');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);
    const event = await eventPromise;

    expect(event.detail.files).toHaveLength(1);
    expect(event.detail.files[0].name).toBe('test.txt');

    // File should appear in the file list
    const fileItem = element.shadowRoot?.querySelector('.file-item');
    expect(fileItem).toBeTruthy();

    const fileName = element.shadowRoot?.querySelector('.file-name');
    expect(fileName?.textContent).toBe('test.txt');
  });

  it('shows error for files exceeding max-size', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload max-size="50"></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    const file = createFile('big.txt', 100);

    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });

    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);

    // File should be in error state
    const errorItem = element.shadowRoot?.querySelector('.file-item.error');
    expect(errorItem).toBeTruthy();

    const errorMsg = element.shadowRoot?.querySelector('.file-error');
    expect(errorMsg?.textContent).toContain('exceeds maximum size');
  });

  it('handles drag-and-drop events', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const dropzone = shadowQuery<HTMLElement>(element, '.dropzone');

    // Dragover
    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true }) as DragEvent;
    dropzone.dispatchEvent(dragOverEvent);
    await waitForUpdate(element);

    expect(dropzone.classList.contains('dragging')).toBe(true);

    // Dragleave
    dropzone.dispatchEvent(new Event('dragleave', { bubbles: true }));
    await waitForUpdate(element);

    expect(dropzone.classList.contains('dragging')).toBe(false);
  });

  it('handles file drop', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const dropzone = shadowQuery<HTMLElement>(element, '.dropzone');
    const file = createFile('dropped.txt', 50);

    const dt = new DataTransfer();
    dt.items.add(file);

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dt });
    Object.defineProperty(dropEvent, 'preventDefault', { value: () => {} });

    const eventPromise = oneEvent<{ files: File[] }>(element, 'am-files-selected');
    dropzone.dispatchEvent(dropEvent);
    await waitForUpdate(element);
    const event = await eventPromise;

    expect(event.detail.files[0].name).toBe('dropped.txt');
  });

  it('removes a file and emits am-file-remove', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    // Add a file first
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    const file = createFile('remove-me.txt', 50);
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);

    // Now remove it
    const removeBtn = shadowQuery<HTMLButtonElement>(element, '.remove-btn');
    const removeEvent = oneEvent<{ file: File; id: string }>(element, 'am-file-remove');
    await click(removeBtn, element);
    const event = await removeEvent;

    expect(event.detail.file.name).toBe('remove-me.txt');

    // File list should be empty
    expect(element.shadowRoot?.querySelector('.file-item')).toBeNull();
  });

  it('limits files when maxFiles is set in multiple mode', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload multiple max-files="2"></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(createFile('a.txt', 10));
    dt.items.add(createFile('b.txt', 10));
    dt.items.add(createFile('c.txt', 10));
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);

    const items = element.shadowRoot?.querySelectorAll('.file-item');
    expect(items?.length).toBe(2);
  });

  it('replaces file in single mode', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');

    // Add first file
    let dt = new DataTransfer();
    dt.items.add(createFile('first.txt', 10));
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);

    // Add second file — should replace
    dt = new DataTransfer();
    dt.items.add(createFile('second.txt', 10));
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);

    const items = element.shadowRoot?.querySelectorAll('.file-item');
    expect(items?.length).toBe(1);
    expect(element.shadowRoot?.querySelector('.file-name')?.textContent).toBe('second.txt');
  });

  it('renders hint text with accept, max-size, and max-files', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload accept=".pdf" max-size="1048576" max-files="3"></am-file-upload>',
    );

    const hint = element.shadowRoot?.querySelector('.hint');
    expect(hint?.textContent).toContain('.pdf');
    expect(hint?.textContent).toContain('Max');
    expect(hint?.textContent).toContain('Up to 3 files');
  });

  it('opens the file input when the dropzone is clicked', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    let clicked = false;
    input.click = () => { clicked = true; };

    const dropzone = shadowQuery<HTMLElement>(element, '.dropzone');
    await click(dropzone, element);

    expect(clicked).toBe(true);
  });

  it('exposes updateFileProgress method', async () => {
    const element = await fixture<HTMLElement>(
      '<am-file-upload></am-file-upload>',
    ) as HTMLElement & { updateFileProgress: (id: string, progress: number, status?: string) => void };

    // Add a file
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(createFile('progress.txt', 10));
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });

    const eventPromise = oneEvent<{ files: File[] }>(element, 'am-files-selected');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUpdate(element);
    await eventPromise;

    // Get the file id from the internal state
    const fileItem = element.shadowRoot?.querySelector('.file-item');
    expect(fileItem).toBeTruthy();

    // updateFileProgress exists and is callable
    expect(typeof element.updateFileProgress).toBe('function');
  });
});
