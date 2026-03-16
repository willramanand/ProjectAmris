import { css } from 'lit';

/**
 * Minimal shadow DOM reset applied inside every component.
 * Keeps things consistent without requiring a global CSS reset.
 */
export const resetStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host {
    font-family: var(--am-font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :host([hidden]) {
    display: none !important;
  }
`;

/**
 * Focus-visible ring utility — apply to interactive elements.
 */
export const focusRingStyles = css`
  :focus-visible {
    outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
    outline-offset: var(--am-focus-ring-offset);
  }

  :focus:not(:focus-visible) {
    outline: none;
  }
`;
