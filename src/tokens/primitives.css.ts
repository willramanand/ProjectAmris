import { css } from 'lit';

/**
 * Primitive design tokens — raw values that never change between themes.
 * These are the lowest-level tokens in the system.
 *
 * Color scales use ROLE-BASED names so consuming applications can override
 * any scale by redefining the CSS custom properties on their theme provider.
 *
 * Default palette based on Pegasus 1.8 Design System (WCAG 2.1 AA accessible
 * palette), desaturated ~15% for a refined, premium feel.
 * Blended with Apple HIG clarity and Rivian's earthy sophistication.
 *
 * Naming: --qz-{category}-{scale}
 */
export const primitiveTokens = css`
  :host {
    /* ================================================================
       COLOR — Neutral
       Clean grays with a very subtle cool undertone.
       ================================================================ */
    --qz-color-neutral-0: #ffffff;
    --qz-color-neutral-50: #fafafa;
    --qz-color-neutral-100: #f4f4f5;
    --qz-color-neutral-150: #ececed;
    --qz-color-neutral-200: #e4e4e7;
    --qz-color-neutral-300: #d1d1d6;
    --qz-color-neutral-400: #a0a0ab;
    --qz-color-neutral-500: #70707b;
    --qz-color-neutral-600: #52525c;
    --qz-color-neutral-700: #3e3e47;
    --qz-color-neutral-800: #2d2d35;
    --qz-color-neutral-850: #232329;
    --qz-color-neutral-900: #1a1a1f;
    --qz-color-neutral-950: #111114;
    --qz-color-neutral-1000: #000000;

    /* ================================================================
       COLOR — Primary
       Default: Pegasus-derived violet, slightly desaturated.
       Override this scale to change the brand identity.
       ================================================================ */
    --qz-color-primary-50: #f5f3ff;
    --qz-color-primary-100: #ede9fe;
    --qz-color-primary-200: #ddd6fe;
    --qz-color-primary-300: #c4b5fc;
    --qz-color-primary-400: #a78bf5;
    --qz-color-primary-500: #8b6ae5;
    --qz-color-primary-600: #7350cf;
    --qz-color-primary-700: #6040b5;
    --qz-color-primary-800: #4e349a;
    --qz-color-primary-900: #402c7c;
    --qz-color-primary-950: #291b52;

    /* ================================================================
       COLOR — Secondary
       Default: Pegasus-derived blue, slightly desaturated.
       Override this scale for secondary actions and accents.
       ================================================================ */
    --qz-color-secondary-50: #eff5ff;
    --qz-color-secondary-100: #ddeafe;
    --qz-color-secondary-200: #bdd8fd;
    --qz-color-secondary-300: #94bffc;
    --qz-color-secondary-400: #63a0f7;
    --qz-color-secondary-500: #4585ed;
    --qz-color-secondary-600: #3369d5;
    --qz-color-secondary-700: #2a55b8;
    --qz-color-secondary-800: #254798;
    --qz-color-secondary-900: #213d7c;
    --qz-color-secondary-950: #162650;

    /* ================================================================
       COLOR — Success
       Default: Pegasus-derived green, slightly desaturated.
       ================================================================ */
    --qz-color-success-50: #eefbf3;
    --qz-color-success-100: #d6f5e2;
    --qz-color-success-200: #b0eac7;
    --qz-color-success-300: #7cd9a5;
    --qz-color-success-400: #4abf7d;
    --qz-color-success-500: #33a566;
    --qz-color-success-600: #278750;
    --qz-color-success-700: #226d42;
    --qz-color-success-800: #1f5837;
    --qz-color-success-900: #1a4a2f;
    --qz-color-success-950: #0e2a1b;

    /* ================================================================
       COLOR — Warning
       Default: Pegasus-derived yellow, slightly desaturated.
       ================================================================ */
    --qz-color-warning-50: #fefce8;
    --qz-color-warning-100: #fef7c3;
    --qz-color-warning-200: #feec89;
    --qz-color-warning-300: #fdd94a;
    --qz-color-warning-400: #f9c518;
    --qz-color-warning-500: #e0a80e;
    --qz-color-warning-600: #b8830b;
    --qz-color-warning-700: #8e5f0a;
    --qz-color-warning-800: #764c0e;
    --qz-color-warning-900: #633f12;
    --qz-color-warning-950: #3a2108;

    /* ================================================================
       COLOR — Danger
       Default: Slightly desaturated red.
       ================================================================ */
    --qz-color-danger-50: #fef2f2;
    --qz-color-danger-100: #fde3e3;
    --qz-color-danger-200: #fccaca;
    --qz-color-danger-300: #f9a8a8;
    --qz-color-danger-400: #f47272;
    --qz-color-danger-500: #e94d4d;
    --qz-color-danger-600: #d43030;
    --qz-color-danger-700: #b52525;
    --qz-color-danger-800: #962222;
    --qz-color-danger-900: #7c2020;
    --qz-color-danger-950: #460e0e;

    /* ================================================================
       COLOR — Info
       Default: Blue, for informational states and notices.
       ================================================================ */
    --qz-color-info-50: #eff5ff;
    --qz-color-info-100: #ddeafe;
    --qz-color-info-200: #bdd8fd;
    --qz-color-info-300: #94bffc;
    --qz-color-info-400: #63a0f7;
    --qz-color-info-500: #4585ed;
    --qz-color-info-600: #3369d5;
    --qz-color-info-700: #2a55b8;
    --qz-color-info-800: #254798;
    --qz-color-info-900: #213d7c;
    --qz-color-info-950: #162650;

    /* ================================================================
       TYPOGRAPHY — Font Families
       Apple-style system font stack
       ================================================================ */
    --qz-font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
      'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue',
      sans-serif;
    --qz-font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono',
      'Cascadia Code', Consolas, monospace;

    /* ================================================================
       TYPOGRAPHY — Font Sizes
       ================================================================ */
    --qz-text-xs: 0.75rem;
    --qz-text-sm: 0.875rem;
    --qz-text-base: 1rem;
    --qz-text-lg: 1.125rem;
    --qz-text-xl: 1.25rem;
    --qz-text-2xl: 1.5rem;
    --qz-text-3xl: 1.875rem;
    --qz-text-4xl: 2.25rem;
    --qz-text-5xl: 3rem;
    --qz-text-6xl: 3.75rem;

    /* ================================================================
       TYPOGRAPHY — Line Heights
       ================================================================ */
    --qz-leading-none: 1;
    --qz-leading-tight: 1.15;
    --qz-leading-snug: 1.3;
    --qz-leading-normal: 1.5;
    --qz-leading-relaxed: 1.625;

    /* ================================================================
       TYPOGRAPHY — Font Weights
       ================================================================ */
    --qz-weight-regular: 400;
    --qz-weight-medium: 500;
    --qz-weight-semibold: 600;
    --qz-weight-bold: 700;

    /* ================================================================
       TYPOGRAPHY — Letter Spacing
       ================================================================ */
    --qz-tracking-tighter: -0.04em;
    --qz-tracking-tight: -0.02em;
    --qz-tracking-normal: 0em;
    --qz-tracking-wide: 0.02em;
    --qz-tracking-wider: 0.04em;

    /* ================================================================
       SPACING — 4px base unit
       ================================================================ */
    --qz-space-0: 0;
    --qz-space-px: 1px;
    --qz-space-0-5: 0.125rem;
    --qz-space-1: 0.25rem;
    --qz-space-1-5: 0.375rem;
    --qz-space-2: 0.5rem;
    --qz-space-2-5: 0.625rem;
    --qz-space-3: 0.75rem;
    --qz-space-4: 1rem;
    --qz-space-5: 1.25rem;
    --qz-space-6: 1.5rem;
    --qz-space-8: 2rem;
    --qz-space-10: 2.5rem;
    --qz-space-12: 3rem;
    --qz-space-16: 4rem;
    --qz-space-20: 5rem;
    --qz-space-24: 6rem;

    /* ================================================================
       BORDER RADIUS
       Apple-like generous radii — paired with corner-shape: squircle
       ================================================================ */
    --qz-radius-none: 0;
    --qz-radius-sm: 0.25rem;
    --qz-radius-md: 0.375rem;
    --qz-radius-lg: 0.5rem;
    --qz-radius-xl: 0.75rem;
    --qz-radius-2xl: 1rem;
    --qz-radius-3xl: 1.5rem;
    --qz-radius-full: 9999px;

    /* ================================================================
       BORDER WIDTH
       ================================================================ */
    --qz-border-0: 0px;
    --qz-border-1: 1px;
    --qz-border-2: 2px;

    /* ================================================================
       SHADOWS — Apple-style subtle, layered depth
       ================================================================ */
    --qz-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
    --qz-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.08),
      0 1px 2px -1px rgb(0 0 0 / 0.08);
    --qz-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07),
      0 2px 4px -2px rgb(0 0 0 / 0.07);
    --qz-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08),
      0 4px 6px -4px rgb(0 0 0 / 0.06);
    --qz-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08),
      0 8px 10px -6px rgb(0 0 0 / 0.06);
    --qz-shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.2);
    --qz-shadow-none: 0 0 0 0 transparent;

    /* ================================================================
       MOTION — Duration
       ================================================================ */
    --qz-duration-instant: 50ms;
    --qz-duration-fast: 100ms;
    --qz-duration-normal: 200ms;
    --qz-duration-slow: 300ms;
    --qz-duration-slower: 500ms;

    /* ================================================================
       MOTION — Easing
       Apple-style spring curves
       ================================================================ */
    --qz-ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
    --qz-ease-in: cubic-bezier(0.42, 0, 1, 1);
    --qz-ease-out: cubic-bezier(0, 0, 0.58, 1);
    --qz-ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
    --qz-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);

    /* ================================================================
       Z-INDEX — Layering scale
       ================================================================ */
    --qz-z-base: 0;
    --qz-z-dropdown: 1000;
    --qz-z-sticky: 1100;
    --qz-z-overlay: 1200;
    --qz-z-modal: 1300;
    --qz-z-popover: 1400;
    --qz-z-tooltip: 1500;

    /* ================================================================
       SIZING — Component heights
       ================================================================ */
    --qz-size-sm: 2rem;
    --qz-size-md: 2.5rem;
    --qz-size-lg: 3rem;

    /* ================================================================
       FOCUS — Ring style
       ================================================================ */
    --qz-focus-ring-width: 2px;
    --qz-focus-ring-offset: 2px;
  }
`;
