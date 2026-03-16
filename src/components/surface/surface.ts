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
 * @cssprop --qz-surface-padding - Override padding (default: --qz-space-6)
 * @cssprop --qz-surface-radius - Override border radius (default: --qz-radius-xl)
 */
@customElement('qz-surface')
export class QzSurface extends LitElement {
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
        background: var(--qz-surface);
        border-radius: var(--qz-surface-radius, var(--qz-radius-xl));
        corner-shape: squircle;
        padding: var(--qz-surface-padding, var(--qz-space-6));
        color: var(--qz-text);
      }

      :host([flush]) {
        border-radius: 0;
        corner-shape: unset;
      }

      :host([bordered]) {
        border: var(--qz-border-1) solid var(--qz-border);
      }

      :host([variant='raised']) {
        background: var(--qz-surface-raised);
        box-shadow: var(--qz-shadow-raised);
      }

      :host([variant='sunken']) {
        background: var(--qz-surface-sunken);
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-surface': QzSurface;
  }
}
