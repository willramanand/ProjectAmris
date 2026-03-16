import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type SurfaceVariant = 'default' | 'raised' | 'sunken';

/**
 * Surface — a themed container that applies background, border,
 * and shadow tokens. The building block for cards, panels, and regions.
 *
 * @slot - Default slot for content
 * @csspart surface - The surface container element
 *
 * @cssprop --am-surface-padding - Override padding (default: --am-space-6)
 * @cssprop --am-surface-radius - Override border radius (default: --am-radius-xl)
 */
@customElement('am-surface')
export class AmSurface extends LitElement {
  /** Visual elevation variant. */
  @property({ reflect: true })
  variant: SurfaceVariant = 'default';

  /** Whether to show a border. */
  @property({ type: Boolean, reflect: true })
  bordered = false;

  /** Removes border-radius (useful for full-bleed page wrappers). */
  @property({ type: Boolean, reflect: true })
  flush = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        background: var(--am-surface);
        border-radius: var(--am-surface-radius, var(--am-radius-xl));
        corner-shape: squircle;
        padding: var(--am-surface-padding, var(--am-space-6));
        color: var(--am-text);
      }

      :host([flush]) {
        border-radius: 0;
        corner-shape: unset;
      }

      :host([bordered]) {
        border: var(--am-border-1) solid var(--am-border);
      }

      :host([variant='raised']) {
        background: var(--am-surface-raised);
        box-shadow: var(--am-shadow-raised);
      }

      :host([variant='sunken']) {
        background: var(--am-surface-sunken);
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-surface': AmSurface;
  }
}
