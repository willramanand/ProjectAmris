import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';

/**
 * Avatar — displays a user image, initials, or a fallback icon.
 *
 * Falls back gracefully: image → initials → default person icon.
 *
 * @slot - Custom fallback content
 * @csspart image - The img element
 * @csspart initials - The initials text
 * @csspart fallback - The default fallback icon
 *
 * @cssprop --am-avatar-size - Override size
 * @cssprop --am-avatar-radius - Override border radius
 *
 * @example
 * ```html
 * <am-avatar src="/photo.jpg" alt="Jane Doe"></am-avatar>
 * <am-avatar initials="JD"></am-avatar>
 * <am-avatar></am-avatar>
 * ```
 */
@customElement('am-avatar')
export class AmAvatar extends LitElement {
  /** Image source URL. */
  @property() src = '';

  /** Alt text for the image. */
  @property() alt = '';

  /** Initials to display when no image is available. */
  @property() initials = '';

  /** Size preset. */
  @property({ reflect: true }) size: AvatarSize = 'md';

  /** Shape of the avatar. */
  @property({ reflect: true }) shape: AvatarShape = 'circle';

  @state() private _imgFailed = false;

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        background: var(--am-primary-subtle);
        color: var(--am-primary);
        font-family: var(--am-font-sans);
        font-weight: var(--am-weight-semibold);
        user-select: none;
        vertical-align: middle;
      }

      :host([shape='circle']), :host(:not([shape])) {
        border-radius: var(--am-avatar-radius, var(--am-radius-full));
      }

      :host([shape='square']) {
        border-radius: var(--am-avatar-radius, var(--am-radius-lg));
        corner-shape: squircle;
      }

      :host([size='xs']) { width: var(--am-avatar-size, 1.5rem); height: var(--am-avatar-size, 1.5rem); font-size: 0.5625rem; }
      :host([size='sm']) { width: var(--am-avatar-size, 2rem); height: var(--am-avatar-size, 2rem); font-size: 0.6875rem; }
      :host([size='md']), :host(:not([size])) { width: var(--am-avatar-size, 2.5rem); height: var(--am-avatar-size, 2.5rem); font-size: 0.875rem; }
      :host([size='lg']) { width: var(--am-avatar-size, 3rem); height: var(--am-avatar-size, 3rem); font-size: 1.125rem; }
      :host([size='xl']) { width: var(--am-avatar-size, 4rem); height: var(--am-avatar-size, 4rem); font-size: 1.5rem; }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .initials {
        line-height: 1;
        letter-spacing: 0.02em;
      }

      .fallback-icon {
        width: 55%;
        height: 55%;
        color: currentColor;
      }
    `,
  ];

  private _handleImgError() {
    this._imgFailed = true;
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('src')) {
      this._imgFailed = false;
    }
  }

  render() {
    const showImg = this.src && !this._imgFailed;

    if (showImg) {
      return html`<img
        part="image"
        src=${this.src}
        alt=${this.alt || nothing}
        @error=${this._handleImgError}
      />`;
    }

    if (this.initials) {
      return html`<span class="initials" part="initials" aria-label=${this.alt || this.initials}>${this.initials}</span>`;
    }

    return html`
      <slot>
        <svg class="fallback-icon" part="fallback" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" fill="currentColor"/>
          <path d="M4 21c0-3.87 3.58-7 8-7s8 3.13 8 7" fill="currentColor"/>
        </svg>
      </slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-avatar': AmAvatar;
  }
}
