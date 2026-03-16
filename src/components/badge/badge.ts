import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge — a small status indicator label.
 *
 * @slot - Badge text content
 * @csspart badge - The badge element
 *
 * @example
 * ```html
 * <qz-badge variant="success">Active</qz-badge>
 * <qz-badge variant="warning" size="sm">Pending</qz-badge>
 * ```
 */
@customElement('qz-badge')
export class QzBadge extends LitElement {
  @property({ reflect: true }) variant: BadgeVariant = 'neutral';
  @property({ reflect: true }) size: BadgeSize = 'md';

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: var(--qz-space-1);
        font-family: var(--qz-font-sans);
        font-weight: var(--qz-weight-medium);
        border-radius: var(--qz-radius-full);
        corner-shape: squircle;
        white-space: nowrap;
        line-height: 1;
      }

      /* Sizes */
      :host([size='sm']) .badge { padding: 0.25rem 0.5rem; font-size: 0.6875rem; }
      :host([size='md']) .badge, :host(:not([size])) .badge { padding: 0.3125rem 0.625rem; font-size: 0.75rem; }
      :host([size='lg']) .badge { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }

      /* Variants */
      :host([variant='neutral']) .badge, :host(:not([variant])) .badge { background: var(--qz-color-neutral-100); color: var(--qz-text-secondary); }
      :host([variant='primary']) .badge { background: var(--qz-primary-subtle); color: var(--qz-primary); }
      :host([variant='secondary']) .badge { background: var(--qz-secondary-subtle); color: var(--qz-secondary); }
      :host([variant='success']) .badge { background: var(--qz-success-subtle); color: var(--qz-success-text); }
      :host([variant='warning']) .badge { background: var(--qz-warning-subtle); color: var(--qz-warning-text); }
      :host([variant='danger']) .badge { background: var(--qz-danger-subtle); color: var(--qz-danger-text); }
      :host([variant='info']) .badge { background: var(--qz-info-subtle); color: var(--qz-info-text); }
    `,
  ];

  render() {
    return html`<span class="badge" part="badge"><slot></slot></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-badge': QzBadge;
  }
}
