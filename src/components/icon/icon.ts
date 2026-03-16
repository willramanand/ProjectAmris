import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Icon — renders an SVG icon from a sprite sheet or inline SVG.
 * Uses an external SVG sprite referenced by `name` and optional `src`.
 *
 * @slot - Optional: provide your own inline SVG instead of using name/src
 * @csspart svg - The SVG use element container
 *
 * @cssprop --qz-icon-size - Override size
 * @cssprop --qz-icon-color - Override color (default: currentColor)
 *
 * @example
 * ```html
 * <!-- From sprite sheet -->
 * <qz-icon name="check" src="/icons.svg"></qz-icon>
 *
 * <!-- Inline SVG -->
 * <qz-icon label="Checkmark">
 *   <svg viewBox="0 0 24 24">...</svg>
 * </qz-icon>
 * ```
 */
@customElement('qz-icon')
export class QzIcon extends LitElement {
  /** Icon name (references an ID in the SVG sprite). */
  @property()
  name = '';

  /** URL of the SVG sprite sheet. */
  @property()
  src = '';

  /** Accessible label. If empty, icon is treated as decorative. */
  @property()
  label = '';

  /** Visual size preset. */
  @property({ reflect: true })
  size: IconSize = 'md';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--qz-icon-color, currentColor);
      line-height: 0;
    }

    :host([size='xs']) {
      --_size: var(--qz-icon-size, 0.875rem);
    }
    :host([size='sm']) {
      --_size: var(--qz-icon-size, 1rem);
    }
    :host([size='md']),
    :host(:not([size])) {
      --_size: var(--qz-icon-size, 1.25rem);
    }
    :host([size='lg']) {
      --_size: var(--qz-icon-size, 1.5rem);
    }
    :host([size='xl']) {
      --_size: var(--qz-icon-size, 2rem);
    }

    svg,
    ::slotted(svg) {
      width: var(--_size);
      height: var(--_size);
      fill: currentColor;
    }
  `;

  render() {
    const isDecorative = !this.label;

    if (this.name && this.src) {
      return html`
        <svg
          part="svg"
          role=${isDecorative ? 'presentation' : 'img'}
          aria-hidden=${isDecorative ? 'true' : 'false'}
          aria-label=${this.label || nothing}
        >
          <use href="${this.src}#${this.name}"></use>
        </svg>
      `;
    }

    return html`
      <slot
        role=${isDecorative ? 'presentation' : 'img'}
        aria-hidden=${isDecorative ? 'true' : 'false'}
        aria-label=${this.label || nothing}
      ></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-icon': QzIcon;
  }
}
