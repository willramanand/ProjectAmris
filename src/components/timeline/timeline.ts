import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type TimelineItemVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Timeline Item — a single event in a timeline.
 *
 * @slot - Content/description of the event
 * @slot icon - Custom icon for the dot (overrides the default dot)
 * @slot heading - Event title/heading
 * @slot timestamp - Time/date text
 *
 * @csspart item - The item container
 * @csspart dot - The timeline dot
 * @csspart content - The content wrapper
 *
 * @example
 * ```html
 * <am-timeline-item variant="success">
 *   <span slot="heading">Deployed to production</span>
 *   <span slot="timestamp">2 hours ago</span>
 *   Build #1234 deployed successfully.
 * </am-timeline-item>
 * ```
 */
@customElement('am-timeline-item')
export class AmTimelineItem extends LitElement {
  @property({ reflect: true }) variant: TimelineItemVariant = 'neutral';

  static styles = [
    resetStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: 1.5rem 1fr;
        gap: var(--am-space-3);
        font-family: var(--am-font-sans);
        position: relative;
        padding-bottom: var(--am-space-6);
      }

      /* Vertical line connecting dots */
      :host::before {
        content: '';
        position: absolute;
        left: calc(0.75rem - 0.5px);
        top: 1rem;
        bottom: 0;
        width: 1px;
        background: var(--am-border);
      }

      /* Hide line on last item */
      :host(:last-child)::before { display: none; }
      :host(:last-child) { padding-bottom: 0; }

      .dot-wrapper {
        display: flex;
        justify-content: center;
        padding-top: 0.1875rem;
        position: relative;
        z-index: 1;
      }

      .dot {
        width: 0.625rem;
        height: 0.625rem;
        border-radius: var(--am-radius-full);
        flex-shrink: 0;
      }

      :host([variant='neutral']) .dot, :host(:not([variant])) .dot { background: var(--am-border-strong); }
      :host([variant='primary']) .dot { background: var(--am-primary); }
      :host([variant='success']) .dot { background: var(--am-success); }
      :host([variant='warning']) .dot { background: var(--am-warning); }
      :host([variant='danger']) .dot { background: var(--am-danger); }
      :host([variant='info']) .dot { background: var(--am-info); }

      .icon ::slotted(svg) { width: 1rem; height: 1rem; }

      .content {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .heading {
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text);
        line-height: var(--am-leading-snug);
      }

      .timestamp {
        font-size: var(--am-text-xs);
        color: var(--am-text-tertiary);
      }

      .body {
        font-size: var(--am-text-sm);
        color: var(--am-text-secondary);
        line-height: var(--am-leading-normal);
        margin-top: var(--am-space-0-5);
      }
    `,
  ];

  render() {
    return html`
      <div class="dot-wrapper">
        <span class="icon"><slot name="icon"><span class="dot" part="dot"></span></slot></span>
      </div>
      <div class="content" part="content">
        <span class="heading" part="heading"><slot name="heading"></slot></span>
        <span class="timestamp"><slot name="timestamp"></slot></span>
        <div class="body"><slot></slot></div>
      </div>
    `;
  }
}

/* ================================================================
   AmTimeline — container for timeline items
   ================================================================ */

/**
 * Timeline — a vertical sequence of events.
 *
 * @slot - `<am-timeline-item>` elements
 *
 * @example
 * ```html
 * <am-timeline>
 *   <am-timeline-item variant="success">
 *     <span slot="heading">Order shipped</span>
 *     <span slot="timestamp">Jan 15</span>
 *   </am-timeline-item>
 *   <am-timeline-item>
 *     <span slot="heading">Order placed</span>
 *     <span slot="timestamp">Jan 12</span>
 *   </am-timeline-item>
 * </am-timeline>
 * ```
 */
@customElement('am-timeline')
export class AmTimeline extends LitElement {
  static styles = css`
    :host { display: block; }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-timeline': AmTimeline;
    'am-timeline-item': AmTimelineItem;
  }
}
