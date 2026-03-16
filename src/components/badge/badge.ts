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
@customElement('am-badge')
export class AmBadge extends LitElement {
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
        gap: var(--am-space-1);
        font-family: var(--am-font-sans);
        font-weight: var(--am-weight-medium);
        border-radius: var(--am-radius-full);
        corner-shape: squircle;
        white-space: nowrap;
        line-height: 1;
      }

      /* Sizes */
      :host([size='sm']) .badge { padding: 0.25rem 0.5rem; font-size: 0.6875rem; }
      :host([size='md']) .badge, :host(:not([size])) .badge { padding: 0.3125rem 0.625rem; font-size: 0.75rem; }
      :host([size='lg']) .badge { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }

      /* Variants */
      :host([variant='neutral']) .badge, :host(:not([variant])) .badge { background: var(--am-color-neutral-100); color: var(--am-text-secondary); }
      :host([variant='primary']) .badge { background: var(--am-primary-subtle); color: var(--am-primary); }
      :host([variant='secondary']) .badge { background: var(--am-secondary-subtle); color: var(--am-secondary); }
      :host([variant='success']) .badge { background: var(--am-success-subtle); color: var(--am-success-text); }
      :host([variant='warning']) .badge { background: var(--am-warning-subtle); color: var(--am-warning-text); }
      :host([variant='danger']) .badge { background: var(--am-danger-subtle); color: var(--am-danger-text); }
      :host([variant='info']) .badge { background: var(--am-info-subtle); color: var(--am-info-text); }
    `,
  ];

  render() {
    return html`<span class="badge" part="badge"><slot></slot></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-badge': AmBadge;
  }
}
