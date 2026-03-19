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
 * <am-theme-provider theme="system">
 *   <am-button variant="primary">Hello</am-button>
 * </am-theme-provider>
 * ```
 */
@customElement('am-theme-provider')
export class AmThemeProvider extends LitElement {
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
        color: var(--am-text);
        font-family: var(--am-font-sans);
        font-size: var(--am-text-base);
        line-height: var(--am-leading-normal);
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
    'am-theme-provider': AmThemeProvider;
  }
}
