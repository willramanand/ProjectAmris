import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

/**
 * File Upload — a drag-and-drop file upload zone with file list.
 *
 * Handles file selection via click or drag-and-drop. Does NOT perform
 * actual uploads — fires events for the consumer to handle.
 *
 * @csspart dropzone - The drop area
 * @csspart file-list - The file list container
 *
 * @fires am-files-selected - Fires when files are selected with { files: File[] } detail
 * @fires am-file-remove - Fires when a file is removed with { file, id } detail
 *
 * @example
 * ```html
 * <am-file-upload accept=".jpg,.png,.pdf" max-size="5242880" multiple></am-file-upload>
 * ```
 */
@customElement('am-file-upload')
export class AmFileUpload extends LitElement {
  @property() label = '';
  /** Comma-separated accepted file types (e.g. ".jpg,.png,image/*"). */
  @property() accept = '';
  /** Maximum file size in bytes. */
  @property({ type: Number, attribute: 'max-size' }) maxSize = 0;
  /** Maximum number of files. */
  @property({ type: Number, attribute: 'max-files' }) maxFiles = 0;
  @property({ type: Boolean, reflect: true }) multiple = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;

  @state() private _files: UploadFile[] = [];
  @state() private _dragging = false;

  @query('input[type="file"]') private _input!: HTMLInputElement;

  static styles = [
    resetStyles,
    css`
      :host { display: block; font-family: var(--am-font-sans); }
      :host([disabled]) { opacity: var(--am-disabled-opacity); pointer-events: none; }

      .label {
        display: block;
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      .dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--am-space-2);
        padding: var(--am-space-8) var(--am-space-4);
        border: 2px dashed var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface-sunken);
        cursor: pointer;
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    background var(--am-duration-fast) var(--am-ease-default);
      }

      .dropzone:hover { border-color: var(--am-primary); }

      .dropzone.dragging {
        border-color: var(--am-primary);
        background: var(--am-primary-subtle);
      }

      .dropzone.invalid { border-color: var(--am-danger); }

      .upload-icon {
        width: 2.5rem; height: 2.5rem;
        color: var(--am-text-tertiary);
      }

      .dropzone-text {
        font-size: var(--am-text-sm);
        color: var(--am-text-secondary);
        text-align: center;
      }

      .dropzone-text strong {
        color: var(--am-primary);
        font-weight: var(--am-weight-medium);
      }

      .hint {
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
      }

      input[type='file'] { display: none; }

      .file-list {
        display: flex;
        flex-direction: column;
        gap: var(--am-space-2);
        margin-top: var(--am-space-3);
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: var(--am-space-3);
        padding: var(--am-space-2-5) var(--am-space-3);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        background: var(--am-surface);
        font-size: var(--am-text-sm);
      }

      .file-item.error { border-color: var(--am-danger); }

      .file-icon {
        width: 1.25rem; height: 1.25rem;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
      }

      .file-info {
        flex: 1;
        min-width: 0;
      }

      .file-name {
        color: var(--am-text);
        font-weight: var(--am-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-size {
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
      }

      .file-error {
        font-size: var(--am-text-xs);
        color: var(--am-danger);
      }

      .remove-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem; height: 1.5rem;
        border-radius: var(--am-radius-full);
        cursor: pointer;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
      }

      .remove-btn:hover { background: var(--am-hover-overlay); color: var(--am-text); }
      .remove-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .progress-bar {
        width: 100%;
        height: 3px;
        background: var(--am-border);
        border-radius: var(--am-radius-full);
        margin-top: var(--am-space-1);
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: var(--am-primary);
        border-radius: var(--am-radius-full);
        transition: width var(--am-duration-fast) var(--am-ease-default);
      }

      @media (prefers-reduced-motion: reduce) {
        .dropzone, .remove-btn, .progress-fill { transition: none; }
      }
    `,
  ];

  private _handleClick() {
    this._input?.click();
  }

  private _handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this._addFiles(Array.from(input.files));
    input.value = '';
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    this._dragging = true;
  }

  private _handleDragLeave() {
    this._dragging = false;
  }

  private _handleDrop(e: DragEvent) {
    e.preventDefault();
    this._dragging = false;
    if (e.dataTransfer?.files) {
      this._addFiles(Array.from(e.dataTransfer.files));
    }
  }

  private _addFiles(files: File[]) {
    const newFiles: UploadFile[] = files.map(file => {
      let status: UploadFile['status'] = 'pending';
      let error: string | undefined;

      if (this.maxSize && file.size > this.maxSize) {
        status = 'error';
        error = `File exceeds maximum size (${this._formatSize(this.maxSize)})`;
      }

      return {
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        progress: 0,
        status,
        error,
      };
    });

    if (this.multiple) {
      const total = this._files.length + newFiles.length;
      if (this.maxFiles && total > this.maxFiles) {
        newFiles.splice(this.maxFiles - this._files.length);
      }
      this._files = [...this._files, ...newFiles];
    } else {
      this._files = [newFiles[0]];
    }

    const validFiles = newFiles.filter(f => f.status !== 'error').map(f => f.file);
    if (validFiles.length > 0) {
      this.dispatchEvent(new CustomEvent('am-files-selected', {
        detail: { files: validFiles },
        bubbles: true, composed: true,
      }));
    }
  }

  private _removeFile(uploadFile: UploadFile) {
    this._files = this._files.filter(f => f.id !== uploadFile.id);
    this.dispatchEvent(new CustomEvent('am-file-remove', {
      detail: { file: uploadFile.file, id: uploadFile.id },
      bubbles: true, composed: true,
    }));
  }

  /** Update file progress externally. */
  updateFileProgress(id: string, progress: number, status?: UploadFile['status']) {
    this._files = this._files.map(f =>
      f.id === id ? { ...f, progress, status: status ?? (progress >= 100 ? 'complete' : 'uploading') } : f
    );
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  render() {
    const hintParts: string[] = [];
    if (this.accept) hintParts.push(this.accept);
    if (this.maxSize) hintParts.push(`Max ${this._formatSize(this.maxSize)}`);
    if (this.maxFiles) hintParts.push(`Up to ${this.maxFiles} files`);

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div
        class="dropzone ${this._dragging ? 'dragging' : ''} ${this.invalid ? 'invalid' : ''}"
        part="dropzone"
        @click=${this._handleClick}
        @dragover=${this._handleDragOver}
        @dragleave=${this._handleDragLeave}
        @drop=${this._handleDrop}
      >
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="dropzone-text">
          <strong>Click to upload</strong> or drag and drop
        </div>
        ${hintParts.length > 0 ? html`<div class="hint">${hintParts.join(' · ')}</div>` : nothing}
      </div>
      <input type="file" .accept=${this.accept} ?multiple=${this.multiple} @change=${this._handleFileSelect} />

      ${this._files.length > 0 ? html`
        <div class="file-list" part="file-list">
          ${this._files.map(f => html`
            <div class="file-item ${f.status === 'error' ? 'error' : ''}">
              <svg class="file-icon" viewBox="0 0 16 16" fill="none">
                <path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M9 1v4h4" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              <div class="file-info">
                <div class="file-name">${f.file.name}</div>
                <div class="file-size">${this._formatSize(f.file.size)}</div>
                ${f.error ? html`<div class="file-error">${f.error}</div>` : nothing}
                ${f.status === 'uploading' ? html`
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${f.progress}%"></div>
                  </div>
                ` : nothing}
              </div>
              <button class="remove-btn" aria-label="Remove file" @click=${() => this._removeFile(f)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          `)}
        </div>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-file-upload': AmFileUpload;
  }
}
