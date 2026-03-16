import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type StatTrend = 'up' | 'down' | 'neutral';

/**
 * Stat — a metric display for dashboards and summaries.
 *
 * @slot - Value text
 * @slot label - Metric label
 * @slot description - Secondary description or change info
 * @slot icon - Optional leading icon
 *
 * @csspart stat - The container
 * @csspart label - The label element
 * @csspart value - The value element
 * @csspart description - The description element
 * @csspart trend - The trend indicator
 *
 * @example
 * ```html
 * <am-stat trend="up">
 *   <span slot="label">Revenue</span>
 *   $48,200
 *   <span slot="description">+12.5% from last month</span>
 * </am-stat>
 * ```
 */
@customElement('am-stat')
export class AmStat extends LitElement {
  /** Trend direction — colors the description accordingly. */
  @property({ reflect: true }) trend: StatTrend = 'neutral';

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        font-family: var(--am-font-sans);
      }

      .stat {
        display: flex;
        flex-direction: column;
        gap: var(--am-space-1);
      }

      .label-row {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
      }

      .icon {
        display: inline-flex;
        color: var(--am-text-tertiary);
      }

      .icon ::slotted(svg) { width: 1.25rem; height: 1.25rem; }

      .label {
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text-secondary);
        line-height: var(--am-leading-snug);
      }

      .value {
        font-size: var(--am-text-2xl);
        font-weight: var(--am-weight-bold);
        color: var(--am-text);
        line-height: 1.2;
        letter-spacing: -0.02em;
      }

      .description-row {
        display: flex;
        align-items: center;
        gap: var(--am-space-1);
        font-size: var(--am-text-xs);
        line-height: var(--am-leading-normal);
      }

      .trend-icon {
        width: 0.875rem;
        height: 0.875rem;
        flex-shrink: 0;
      }

      :host([trend='up']) .description-row { color: var(--am-success-text); }
      :host([trend='down']) .description-row { color: var(--am-danger-text); }
      :host([trend='neutral']) .description-row, :host(:not([trend])) .description-row { color: var(--am-text-tertiary); }
    `,
  ];

  render() {
    const trendIcon = this.trend === 'up'
      ? html`<svg class="trend-icon" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : this.trend === 'down'
        ? html`<svg class="trend-icon" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : html``;

    return html`
      <div class="stat" part="stat">
        <div class="label-row">
          <span class="icon"><slot name="icon"></slot></span>
          <span class="label" part="label"><slot name="label"></slot></span>
        </div>
        <span class="value" part="value"><slot></slot></span>
        <div class="description-row">
          ${trendIcon}
          <span part="description"><slot name="description"></slot></span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-stat': AmStat;
  }
}
