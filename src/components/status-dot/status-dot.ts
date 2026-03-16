import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StatusDotVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type StatusDotSize = 'sm' | 'md' | 'lg';

/**
 * Status Dot — a small colored indicator.
 *
 * @slot - Optional label text
 * @csspart dot - The dot element
 * @csspart label - The label text
 *
 * @cssprop --am-status-dot-size - Override dot size
 * @cssprop --am-status-dot-color - Override dot color
 *
 * @example
 * ```html
 * <am-status-dot variant="success">Online</am-status-dot>
 * <am-status-dot variant="danger">Offline</am-status-dot>
 * <am-status-dot variant="warning"></am-status-dot>
 * ```
 */
@customElement('am-status-dot')
export class AmStatusDot extends LitElement {
  @property({ reflect: true }) variant: StatusDotVariant = 'neutral';
  @property({ reflect: true }) size: StatusDotSize = 'md';

  /** Whether the dot should pulse to indicate activity. */
  @property({ type: Boolean, reflect: true }) pulse = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--am-space-1-5);
      font-family: var(--am-font-sans);
      font-size: var(--am-text-sm);
      color: var(--am-text-secondary);
      line-height: 1;
    }

    .dot {
      flex-shrink: 0;
      border-radius: var(--am-radius-full);
      position: relative;
    }

    :host([size='sm']) .dot { width: var(--am-status-dot-size, 0.375rem); height: var(--am-status-dot-size, 0.375rem); }
    :host([size='md']) .dot, :host(:not([size])) .dot { width: var(--am-status-dot-size, 0.5rem); height: var(--am-status-dot-size, 0.5rem); }
    :host([size='lg']) .dot { width: var(--am-status-dot-size, 0.625rem); height: var(--am-status-dot-size, 0.625rem); }

    /* Variants */
    :host([variant='neutral']) .dot, :host(:not([variant])) .dot { background: var(--am-status-dot-color, var(--am-text-tertiary)); }
    :host([variant='primary']) .dot { background: var(--am-status-dot-color, var(--am-primary)); }
    :host([variant='success']) .dot { background: var(--am-status-dot-color, var(--am-success)); }
    :host([variant='warning']) .dot { background: var(--am-status-dot-color, var(--am-warning)); }
    :host([variant='danger']) .dot { background: var(--am-status-dot-color, var(--am-danger)); }
    :host([variant='info']) .dot { background: var(--am-status-dot-color, var(--am-info)); }

    /* Pulse animation */
    :host([pulse]) .dot::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: inherit;
      animation: pulse 2s var(--am-ease-default) infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.7; transform: scale(1); }
      70% { opacity: 0; transform: scale(2.5); }
      100% { opacity: 0; transform: scale(2.5); }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([pulse]) .dot::after { animation: none; }
    }
  `;

  render() {
    return html`
      <span class="dot" part="dot" aria-hidden="true"></span>
      <span part="label"><slot></slot></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-status-dot': AmStatusDot;
  }
}
