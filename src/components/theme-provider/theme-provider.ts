import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { primitiveTokens } from '../../tokens/primitives.css.js';
import { semanticTokens } from '../../tokens/semantic.css.js';
import { darkTokens } from '../../tokens/dark.css.js';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme provider — wraps your application and provides design tokens
 * via CSS custom properties that cascade into all child components.
 *
 * @slot - Default slot for page content
 *
 * @example
 * ```html
 * <qz-theme-provider theme="system">
 *   <qz-button variant="primary">Hello</qz-button>
 * </qz-theme-provider>
 * ```
 */
@customElement('qz-theme-provider')
export class QzThemeProvider extends LitElement {
  /**
   * The active theme.
   * - `light` — force light theme
   * - `dark` — force dark theme
   * - `system` — follow `prefers-color-scheme` (default)
   */
  @property({ reflect: true })
  theme: Theme = 'system';

  static styles = [
    primitiveTokens,
    semanticTokens,
    darkTokens,
    css`
      :host {
        display: contents;
        color-scheme: light;
        color: var(--qz-text);
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-base);
        line-height: var(--qz-leading-normal);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      :host([theme='dark']) {
        color-scheme: dark;
      }

      @media (prefers-color-scheme: dark) {
        :host(:not([theme='light'])) {
          color-scheme: dark;
        }
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qz-theme-provider': QzThemeProvider;
  }
}
