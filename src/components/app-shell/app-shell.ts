import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * App Shell — a top-level layout structure for applications.
 *
 * Provides a standard header/sidebar/main/footer layout pattern.
 *
 * @slot header - Top navigation bar area
 * @slot sidebar - Left sidebar (e.g. `<am-side-nav>`)
 * @slot - Main content area
 * @slot footer - Bottom footer area
 *
 * @csspart header - The header region
 * @csspart sidebar - The sidebar region
 * @csspart main - The main content region
 * @csspart footer - The footer region
 *
 * @cssprop --am-app-shell-sidebar-width - Override sidebar width (default: auto, driven by sidebar content)
 * @cssprop --am-app-shell-header-height - Override header height (default: auto)
 *
 * @example
 * ```html
 * <am-app-shell>
 *   <am-nav-bar slot="header">...</am-nav-bar>
 *   <am-side-nav slot="sidebar">...</am-side-nav>
 *   <div>Main content</div>
 * </am-app-shell>
 * ```
 */
@customElement('am-app-shell')
export class AmAppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--am-surface-sunken, #fafafa);
      color: var(--am-text);
    }

    .header {
      flex-shrink: 0;
      z-index: 10;
    }

    .header:not(:has(::slotted(*))) { display: none; }

    .body {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .sidebar {
      flex-shrink: 0;
      width: var(--am-app-shell-sidebar-width, auto);
    }

    .sidebar:not(:has(::slotted(*))) { display: none; }

    .main {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
    }

    .footer {
      flex-shrink: 0;
    }

    .footer:not(:has(::slotted(*))) { display: none; }
  `;

  render() {
    return html`
      <div class="header" part="header"><slot name="header"></slot></div>
      <div class="body">
        <div class="sidebar" part="sidebar"><slot name="sidebar"></slot></div>
        <main class="main" part="main"><slot></slot></main>
      </div>
      <div class="footer" part="footer"><slot name="footer"></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-app-shell': AmAppShell;
  }
}
