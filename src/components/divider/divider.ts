import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Divider — a horizontal or vertical separator line.
 *
 * @cssprop --qz-divider-color - Override color (default: --qz-border)
 * @cssprop --qz-divider-width - Override thickness (default: 1px)
 * @cssprop --qz-divider-spacing - Override margin (default: --qz-space-4)
 */
@customElement('qz-divider')
export class QzDivider extends LitElement {
  /** Orientation of the divider. */
  @property({ reflect: true })
  orientation: 'horizontal' | 'vertical' = 'horizontal';

  static styles = css`
    :host {
      display: block;
    }

    :host([orientation='horizontal']) {
      border: none;
      border-top: var(--qz-divider-width, 1px) solid
        var(--qz-divider-color, var(--qz-border));
      margin-block: var(--qz-divider-spacing, var(--qz-space-4));
    }

    :host([orientation='vertical']) {
      display: inline-block;
      border: none;
      border-left: var(--qz-divider-width, 1px) solid
        var(--qz-divider-color, var(--qz-border));
      margin-inline: var(--qz-divider-spacing, var(--qz-space-4));
      align-self: stretch;
      min-height: 1em;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'separator');
    if (this.orientation === 'vertical') {
      this.setAttribute('aria-orientation', 'vertical');
    }
  }

  render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-divider': QzDivider;
  }
}
