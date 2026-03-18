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
      ? html`<svg class="trend-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M240,56v64a8,8,0,0,1-13.66,5.66L200,99.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,188.69,88,162.34,61.66A8,8,0,0,1,168,48h64A8,8,0,0,1,240,56Z"/></svg>`
      : this.trend === 'down'
        ? html`<svg class="trend-icon" viewBox="0 0 256 256" fill="currentColor"><path d="M240,128v64a8,8,0,0,1-8,8H168a8,8,0,0,1-5.66-13.66L188.69,160,136,107.31l-34.34,34.35a8,8,0,0,1-11.32,0l-72-72A8,8,0,0,1,29.66,58.34L96,124.69l34.34-34.35a8,8,0,0,1,11.32,0L200,148.69l26.34-26.35A8,8,0,0,1,240,128Z"/></svg>`
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
