import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles, focusRingStyles } from '../../styles/reset.css.js';

export type LinkButtonVariant = 'primary' | 'outlined' | 'link' | 'ghost' | 'subtle' | 'danger';
export type LinkButtonSize = 'sm' | 'md' | 'lg';

/**
 * Link Button — an anchor element styled as a button.
 *
 * Use when you need navigation semantics (an `<a>`) with
 * button styling, such as CTA links.
 *
 * @slot - Label content
 * @slot prefix - Content before the label
 * @slot suffix - Content after the label
 *
 * @csspart link - The anchor element
 * @csspart label - The label wrapper
 *
 * @cssprop --am-button-radius - Override border radius
 *
 * @example
 * ```html
 * <am-link-button href="/signup">Get started</am-link-button>
 * <am-link-button href="/docs" variant="outlined">Documentation</am-link-button>
 * <am-link-button href="/learn" variant="link">Learn more</am-link-button>
 * ```
 */
@customElement('am-link-button')
export class AmLinkButton extends LitElement {
  @property() href = '';
  @property() target = '';
  @property() rel = '';
  @property({ reflect: true }) variant: LinkButtonVariant = 'primary';
  @property({ reflect: true }) size: LinkButtonSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = [
    resetStyles,
    focusRingStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      a {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--am-space-2);
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        text-decoration: none;
        font-family: var(--am-font-sans);
        font-weight: var(--am-weight-medium);
        border-radius: var(--am-button-radius, var(--am-radius-xl));
        corner-shape: squircle;
        transition:
          background var(--am-duration-fast) var(--am-ease-default),
          color var(--am-duration-fast) var(--am-ease-default),
          border-color var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-spring);
      }

      /* Sizes */
      :host([size='sm']) a { height: var(--am-size-sm); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); border-radius: var(--am-button-radius, var(--am-radius-lg)); }
      :host([size='md']) a, :host(:not([size])) a { height: var(--am-size-md); padding-inline: var(--am-space-4); font-size: var(--am-text-sm); }
      :host([size='lg']) a { height: var(--am-size-lg); padding-inline: var(--am-space-6); font-size: var(--am-text-base); }

      /* Primary */
      :host([variant='primary']) a, :host(:not([variant])) a { background: var(--am-primary); color: var(--am-primary-text); }
      :host([variant='primary']) a:hover, :host(:not([variant])) a:hover { background: var(--am-primary-hover); }
      :host([variant='primary']) a:active, :host(:not([variant])) a:active { background: var(--am-primary-active); transform: scale(0.98); }

      /* Outlined */
      :host([variant='outlined']) a { background: transparent; color: var(--am-text); border: var(--am-border-1) solid var(--am-border-strong); }
      :host([variant='outlined']) a:hover { background: var(--am-hover-overlay); border-color: var(--am-text-secondary); }
      :host([variant='outlined']) a:active { background: var(--am-active-overlay); transform: scale(0.98); }

      /* Link — plain text link style, no button chrome */
      :host([variant='link']) a {
        background: transparent;
        color: var(--am-text);
        padding-inline: 0;
        height: auto;
        border-radius: 0;
      }
      :host([variant='link']) a:hover { color: var(--am-primary); text-decoration: underline; }
      :host([variant='link']) a:active { color: var(--am-primary-active); text-decoration: underline; }

      /* Ghost */
      :host([variant='ghost']) a { background: transparent; color: var(--am-text); }
      :host([variant='ghost']) a:hover { background: var(--am-hover-overlay); }
      :host([variant='ghost']) a:active { background: var(--am-active-overlay); transform: scale(0.98); }

      /* Subtle */
      :host([variant='subtle']) a { background: var(--am-primary-subtle); color: var(--am-primary-subtle-text, var(--am-primary)); }
      :host([variant='subtle']) a:hover { background: var(--am-primary-subtle-hover); }
      :host([variant='subtle']) a:active { background: var(--am-primary-subtle-hover); transform: scale(0.98); }

      /* Danger */
      :host([variant='danger']) a { background: var(--am-danger); color: var(--am-color-neutral-0); }
      :host([variant='danger']) a:hover { background: var(--am-danger-hover); }
      :host([variant='danger']) a:active { background: var(--am-danger-active); transform: scale(0.98); }

      /* Disabled */
      :host([disabled]) a { opacity: var(--am-disabled-opacity); cursor: not-allowed; pointer-events: none; }

      .label { display: inline-flex; align-items: center; }

      @media (prefers-reduced-motion: reduce) {
        a { transition: none; }
        a:active { transform: none; }
      }
    `,
  ];

  render() {
    return html`
      <a
        part="link"
        href=${this.disabled ? nothing : this.href}
        target=${this.target || nothing}
        rel=${this.rel || nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        tabindex=${this.disabled ? '-1' : nothing}
      >
        <slot name="prefix"></slot>
        <span class="label" part="label"><slot></slot></span>
        <slot name="suffix"></slot>
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-link-button': AmLinkButton;
  }
}
