import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Panel — a generic content container with optional header.
 *
 * Less opinionated than Card — no shadow by default, minimal decoration.
 * Good for page sections, sidebar panels, and layout regions.
 *
 * @slot - Body content
 * @slot header - Header content (title, actions)
 *
 * @csspart panel - The outer container
 * @csspart header - The header region
 * @csspart body - The body region
 *
 * @cssprop --am-panel-padding - Override padding
 * @cssprop --am-panel-radius - Override border radius
 *
 * @example
 * ```html
 * <am-panel bordered>
 *   <span slot="header">Section Title</span>
 *   <p>Panel body content.</p>
 * </am-panel>
 * ```
 */
@customElement('am-panel')
export class AmPanel extends LitElement {
  @property({ type: Boolean, reflect: true }) bordered = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        color: var(--am-text);
      }

      :host([bordered]) {
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-panel-radius, var(--am-radius-xl));
        corner-shape: squircle;
        overflow: hidden;
      }

      .header {
        padding: var(--am-panel-padding, var(--am-space-4)) var(--am-panel-padding, var(--am-space-5));
        padding-bottom: 0;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text);
      }

      .header:not(:has(::slotted(*))) { display: none; }

      .body {
        padding: var(--am-panel-padding, var(--am-space-4)) var(--am-panel-padding, var(--am-space-5));
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text-secondary);
      }
    `,
  ];

  render() {
    return html`
      <div part="panel">
        <div class="header" part="header"><slot name="header"></slot></div>
        <div class="body" part="body"><slot></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-panel': AmPanel;
  }
}
