import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Card — a contained surface for grouping related content.
 * Built on the surface token system with header/body/footer slots.
 *
 * @slot - Default slot (card body)
 * @slot header - Card header content
 * @slot footer - Card footer content
 *
 * @csspart card - The outer card container
 * @csspart header - The header region
 * @csspart body - The body region
 * @csspart footer - The footer region
 *
 * @cssprop --am-card-padding - Override internal padding
 * @cssprop --am-card-radius - Override border radius
 */
@customElement('am-card')
export class AmCard extends LitElement {
  /** Whether the card appears elevated with a shadow. */
  @property({ type: Boolean, reflect: true })
  elevated = false;

  /** Whether to show a border. */
  @property({ type: Boolean, reflect: true })
  bordered = true;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        background: var(--am-surface-raised);
        border-radius: var(--am-card-radius, var(--am-radius-2xl));
        corner-shape: squircle;
        overflow: hidden;
        color: var(--am-text);
      }

      :host([bordered]) {
        border: var(--am-border-1) solid var(--am-border);
      }

      :host([elevated]) {
        box-shadow: var(--am-shadow-raised);
        border-color: transparent;
      }

      .header {
        padding: var(--am-card-padding, var(--am-space-5))
          var(--am-card-padding, var(--am-space-6));
        padding-bottom: 0;
      }

      .body {
        padding: var(--am-card-padding, var(--am-space-5))
          var(--am-card-padding, var(--am-space-6));
      }

      .header + .body {
        padding-top: var(--am-space-3);
      }

      .footer {
        padding: var(--am-space-4) var(--am-card-padding, var(--am-space-6));
        border-top: var(--am-border-1) solid var(--am-border-subtle);
      }

      /* Hide empty slots */
      .header:not(:has(::slotted(*))) {
        display: none;
      }
      .footer:not(:has(::slotted(*))) {
        display: none;
      }
    `,
  ];

  render() {
    return html`
      <div part="card">
        <div class="header" part="header">
          <slot name="header"></slot>
        </div>
        <div class="body" part="body">
          <slot></slot>
        </div>
        <div class="footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-card': AmCard;
  }
}
