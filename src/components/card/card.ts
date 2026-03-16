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
 * @cssprop --qz-card-padding - Override internal padding
 * @cssprop --qz-card-radius - Override border radius
 */
@customElement('qz-card')
export class QzCard extends LitElement {
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
        background: var(--qz-surface-raised);
        border-radius: var(--qz-card-radius, var(--qz-radius-2xl));
        corner-shape: squircle;
        overflow: hidden;
        color: var(--qz-text);
      }

      :host([bordered]) {
        border: var(--qz-border-1) solid var(--qz-border);
      }

      :host([elevated]) {
        box-shadow: var(--qz-shadow-raised);
        border-color: transparent;
      }

      .header {
        padding: var(--qz-card-padding, var(--qz-space-5))
          var(--qz-card-padding, var(--qz-space-6));
        padding-bottom: 0;
      }

      .body {
        padding: var(--qz-card-padding, var(--qz-space-5))
          var(--qz-card-padding, var(--qz-space-6));
      }

      .header + .body {
        padding-top: var(--qz-space-3);
      }

      .footer {
        padding: var(--qz-space-4) var(--qz-card-padding, var(--qz-space-6));
        border-top: var(--qz-border-1) solid var(--qz-border-subtle);
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
    'qz-card': QzCard;
  }
}
