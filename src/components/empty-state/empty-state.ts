import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Empty State — a placeholder for empty content areas.
 *
 * @slot icon - Icon or illustration displayed above the heading
 * @slot heading - Primary heading text
 * @slot - Description/body text
 * @slot action - Call-to-action buttons
 *
 * @csspart container - The root container
 * @csspart icon - The icon wrapper
 * @csspart heading - The heading wrapper
 * @csspart body - The description wrapper
 * @csspart action - The action wrapper
 *
 * @example
 * ```html
 * <am-empty-state>
 *   <svg slot="icon" ...></svg>
 *   <span slot="heading">No results found</span>
 *   Try adjusting your search or filter criteria.
 *   <am-button slot="action">Clear filters</am-button>
 * </am-empty-state>
 * ```
 */
@customElement('am-empty-state')
export class AmEmptyState extends LitElement {
  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: var(--am-space-8) var(--am-space-4);
        gap: var(--am-space-3);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--am-text-tertiary);
        margin-bottom: var(--am-space-1);
      }

      .icon ::slotted(svg),
      .icon ::slotted(am-icon) {
        width: 3rem;
        height: 3rem;
      }

      .heading {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-lg);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text);
        line-height: var(--am-leading-snug);
      }

      .body {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        color: var(--am-text-secondary);
        line-height: var(--am-leading-normal);
        max-width: 28rem;
      }

      .action {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        margin-top: var(--am-space-1);
      }
    `,
  ];

  render() {
    return html`
      <div class="container" part="container">
        <div class="icon" part="icon"><slot name="icon"></slot></div>
        <div class="heading" part="heading"><slot name="heading"></slot></div>
        <div class="body" part="body"><slot></slot></div>
        <div class="action" part="action"><slot name="action"></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-empty-state': AmEmptyState;
  }
}
