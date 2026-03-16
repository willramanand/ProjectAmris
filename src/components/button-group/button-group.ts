import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type ButtonGroupOrientation = 'horizontal' | 'vertical';

/**
 * Button Group — visually merges adjacent buttons into a connected set.
 *
 * Children should be `<am-button>` or `<am-icon-button>` elements.
 * The group collapses inner border radii so buttons appear joined.
 *
 * @slot - Button elements
 * @csspart group - The group container
 *
 * @example
 * ```html
 * <am-button-group>
 *   <am-button variant="secondary">Left</am-button>
 *   <am-button variant="secondary">Center</am-button>
 *   <am-button variant="secondary">Right</am-button>
 * </am-button-group>
 * ```
 */
@customElement('am-button-group')
export class AmButtonGroup extends LitElement {
  @property({ reflect: true }) orientation: ButtonGroupOrientation = 'horizontal';

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
      }

      .group {
        display: inline-flex;
        isolation: isolate;
      }

      :host([orientation='vertical']) .group {
        flex-direction: column;
      }

      /* Horizontal: collapse inner radii and borders */
      :host([orientation='horizontal']) ::slotted(*),
      :host(:not([orientation])) ::slotted(*) {
        --am-button-radius: 0;
        margin-inline-start: calc(-1 * var(--am-border-1, 1px));
      }

      :host([orientation='horizontal']) ::slotted(:first-child),
      :host(:not([orientation])) ::slotted(:first-child) {
        --am-button-radius: var(--am-radius-xl) 0 0 var(--am-radius-xl);
        margin-inline-start: 0;
      }

      :host([orientation='horizontal']) ::slotted(:last-child),
      :host(:not([orientation])) ::slotted(:last-child) {
        --am-button-radius: 0 var(--am-radius-xl) var(--am-radius-xl) 0;
      }

      :host([orientation='horizontal']) ::slotted(:only-child),
      :host(:not([orientation])) ::slotted(:only-child) {
        --am-button-radius: var(--am-radius-xl);
      }

      /* Vertical: collapse top/bottom radii and borders */
      :host([orientation='vertical']) ::slotted(*) {
        --am-button-radius: 0;
        margin-block-start: calc(-1 * var(--am-border-1, 1px));
        width: 100%;
      }

      :host([orientation='vertical']) ::slotted(:first-child) {
        --am-button-radius: var(--am-radius-xl) var(--am-radius-xl) 0 0;
        margin-block-start: 0;
      }

      :host([orientation='vertical']) ::slotted(:last-child) {
        --am-button-radius: 0 0 var(--am-radius-xl) var(--am-radius-xl);
      }

      :host([orientation='vertical']) ::slotted(:only-child) {
        --am-button-radius: var(--am-radius-xl);
      }

      /* Hovered button should sit above siblings to show full border */
      ::slotted(:hover) {
        z-index: 1;
      }

      ::slotted(:focus-within) {
        z-index: 2;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
  }

  render() {
    return html`<div class="group" part="group"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-button-group': AmButtonGroup;
  }
}
