import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Divider — a horizontal or vertical separator line.
 *
 * @cssprop --am-divider-color - Override color (default: --am-border)
 * @cssprop --am-divider-width - Override thickness (default: 1px)
 * @cssprop --am-divider-spacing - Override margin (default: --am-space-4)
 */
@customElement('am-divider')
export class AmDivider extends LitElement {
  /** Orientation of the divider. */
  @property({ reflect: true })
  orientation: 'horizontal' | 'vertical' = 'horizontal';

  static styles = css`
    :host {
      display: block;
    }

    :host([orientation='horizontal']) {
      border: none;
      border-top: var(--am-divider-width, 1px) solid
        var(--am-divider-color, var(--am-border));
      margin-block: var(--am-divider-spacing, var(--am-space-4));
    }

    :host([orientation='vertical']) {
      display: inline-block;
      border: none;
      border-inline-start: var(--am-divider-width, 1px) solid
        var(--am-divider-color, var(--am-border));
      margin-inline: var(--am-divider-spacing, var(--am-space-4));
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
    'am-divider': AmDivider;
  }
}
