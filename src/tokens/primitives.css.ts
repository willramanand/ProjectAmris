import { css } from "lit";

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
 * Naming: --am-{category}-{scale}
 */
export const primitiveTokens = css`
  :host {
    /* ================================================================
       COLOR — Neutral
       Clean grays with a very subtle cool undertone.
       ================================================================ */
    --am-color-neutral-0: #ffffff;
    --am-color-neutral-50: #fafafa;
    --am-color-neutral-100: #f4f4f5;
    --am-color-neutral-150: #ececed;
    --am-color-neutral-200: #e4e4e7;
    --am-color-neutral-300: #d1d1d6;
    --am-color-neutral-400: #a0a0ab;
    --am-color-neutral-500: #70707b;
    --am-color-neutral-600: #52525c;
    --am-color-neutral-700: #3e3e47;
    --am-color-neutral-800: #2d2d35;
    --am-color-neutral-850: #232329;
    --am-color-neutral-900: #1a1a1f;
    --am-color-neutral-950: #111114;
    --am-color-neutral-1000: #000000;

    /* ================================================================
       COLOR — Primary
       Default: Pegasus-derived violet, slightly desaturated.
       Override this scale to change the brand identity.
       ================================================================ */
    --am-color-primary-50: #f5f3ff;
    --am-color-primary-100: #ede9fe;
    --am-color-primary-200: #ddd6fe;
    --am-color-primary-300: #c4b5fc;
    --am-color-primary-400: #a78bf5;
    --am-color-primary-500: #8b6ae5;
    --am-color-primary-600: #7350cf;
    --am-color-primary-700: #6040b5;
    --am-color-primary-800: #4e349a;
    --am-color-primary-900: #402c7c;
    --am-color-primary-950: #291b52;

    /* ================================================================
       COLOR — Secondary
       Default: Pegasus-derived blue, slightly desaturated.
       Override this scale for secondary actions and accents.
       ================================================================ */
    --am-color-secondary-50: #eff5ff;
    --am-color-secondary-100: #ddeafe;
    --am-color-secondary-200: #bdd8fd;
    --am-color-secondary-300: #94bffc;
    --am-color-secondary-400: #63a0f7;
    --am-color-secondary-500: #4585ed;
    --am-color-secondary-600: #3369d5;
    --am-color-secondary-700: #2a55b8;
    --am-color-secondary-800: #254798;
    --am-color-secondary-900: #213d7c;
    --am-color-secondary-950: #162650;

    /* ================================================================
       COLOR — Success
       Default: Pegasus-derived green, slightly desaturated.
       ================================================================ */
    --am-color-success-50: #eefbf3;
    --am-color-success-100: #d6f5e2;
    --am-color-success-200: #b0eac7;
    --am-color-success-300: #7cd9a5;
    --am-color-success-400: #4abf7d;
    --am-color-success-500: #33a566;
    --am-color-success-600: #278750;
    --am-color-success-700: #226d42;
    --am-color-success-800: #1f5837;
    --am-color-success-900: #1a4a2f;
    --am-color-success-950: #0e2a1b;

    /* ================================================================
       COLOR — Warning
       Default: Pegasus-derived yellow, slightly desaturated.
       ================================================================ */
    --am-color-warning-50: #fefce8;
    --am-color-warning-100: #fef7c3;
    --am-color-warning-200: #feec89;
    --am-color-warning-300: #fdd94a;
    --am-color-warning-400: #f9c518;
    --am-color-warning-500: #e0a80e;
    --am-color-warning-600: #b8830b;
    --am-color-warning-700: #8e5f0a;
    --am-color-warning-800: #764c0e;
    --am-color-warning-900: #633f12;
    --am-color-warning-950: #3a2108;

    /* ================================================================
       COLOR — Danger
       Default: Slightly desaturated red.
       ================================================================ */
    --am-color-danger-50: #fef2f2;
    --am-color-danger-100: #fde3e3;
    --am-color-danger-200: #fccaca;
    --am-color-danger-300: #f9a8a8;
    --am-color-danger-400: #f47272;
    --am-color-danger-500: #e94d4d;
    --am-color-danger-600: #d43030;
    --am-color-danger-700: #b52525;
    --am-color-danger-800: #962222;
    --am-color-danger-900: #7c2020;
    --am-color-danger-950: #460e0e;

    /* ================================================================
       COLOR — Info
       Default: Blue, for informational states and notices.
       ================================================================ */
    --am-color-info-50: #eff5ff;
    --am-color-info-100: #ddeafe;
    --am-color-info-200: #bdd8fd;
    --am-color-info-300: #94bffc;
    --am-color-info-400: #63a0f7;
    --am-color-info-500: #4585ed;
    --am-color-info-600: #3369d5;
    --am-color-info-700: #2a55b8;
    --am-color-info-800: #254798;
    --am-color-info-900: #213d7c;
    --am-color-info-950: #162650;

    /* ================================================================
       TYPOGRAPHY — Font Families
       Apple-style system font stack
       ================================================================ */
    --am-font-sans:
      system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    --am-font-mono:
      "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "Cascadia Code",
      Consolas, monospace;

    /* ================================================================
       TYPOGRAPHY — Font Sizes
       ================================================================ */
    --am-text-xs: 0.75rem;
    --am-text-sm: 0.875rem;
    --am-text-base: 1rem;
    --am-text-lg: 1.125rem;
    --am-text-xl: 1.25rem;
    --am-text-2xl: 1.5rem;
    --am-text-3xl: 1.875rem;
    --am-text-4xl: 2.25rem;
    --am-text-5xl: 3rem;
    --am-text-6xl: 3.75rem;

    /* ================================================================
       TYPOGRAPHY — Line Heights
       ================================================================ */
    --am-leading-none: 1;
    --am-leading-tight: 1.15;
    --am-leading-snug: 1.3;
    --am-leading-normal: 1.5;
    --am-leading-relaxed: 1.625;

    /* ================================================================
       TYPOGRAPHY — Font Weights
       ================================================================ */
    --am-weight-regular: 400;
    --am-weight-medium: 500;
    --am-weight-semibold: 600;
    --am-weight-bold: 700;

    /* ================================================================
       TYPOGRAPHY — Letter Spacing
       ================================================================ */
    --am-tracking-tighter: -0.04em;
    --am-tracking-tight: -0.02em;
    --am-tracking-normal: 0em;
    --am-tracking-wide: 0.02em;
    --am-tracking-wider: 0.04em;

    /* ================================================================
       SPACING — 4px base unit
       ================================================================ */
    --am-space-0: 0;
    --am-space-px: 1px;
    --am-space-0-5: 0.125rem;
    --am-space-1: 0.25rem;
    --am-space-1-5: 0.375rem;
    --am-space-2: 0.5rem;
    --am-space-2-5: 0.625rem;
    --am-space-3: 0.75rem;
    --am-space-4: 1rem;
    --am-space-5: 1.25rem;
    --am-space-6: 1.5rem;
    --am-space-8: 2rem;
    --am-space-10: 2.5rem;
    --am-space-12: 3rem;
    --am-space-16: 4rem;
    --am-space-20: 5rem;
    --am-space-24: 6rem;

    /* ================================================================
       BORDER RADIUS
       Apple-like generous radii — paired with corner-shape: squircle
       ================================================================ */
    --am-radius-none: 0;
    --am-radius-sm: 0.25rem;
    --am-radius-md: 0.375rem;
    --am-radius-lg: 0.5rem;
    --am-radius-xl: 0.75rem;
    --am-radius-2xl: 1rem;
    --am-radius-3xl: 1.5rem;
    --am-radius-full: 9999px;

    /* ================================================================
       BORDER WIDTH
       ================================================================ */
    --am-border-0: 0px;
    --am-border-1: 1px;
    --am-border-2: 2px;

    /* ================================================================
       SHADOWS — Apple-style subtle, layered depth
       ================================================================ */
    --am-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
    --am-shadow-sm:
      0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08);
    --am-shadow-md:
      0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
    --am-shadow-lg:
      0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06);
    --am-shadow-xl:
      0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.06);
    --am-shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.2);
    --am-shadow-none: 0 0 0 0 transparent;

    /* ================================================================
       MOTION — Duration
       ================================================================ */
    --am-duration-instant: 50ms;
    --am-duration-fast: 100ms;
    --am-duration-normal: 200ms;
    --am-duration-slow: 300ms;
    --am-duration-slower: 500ms;

    /* ================================================================
       MOTION — Easing
       Apple-style spring curves
       ================================================================ */
    --am-ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
    --am-ease-in: cubic-bezier(0.42, 0, 1, 1);
    --am-ease-out: cubic-bezier(0, 0, 0.58, 1);
    --am-ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
    --am-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);

    /* ================================================================
       Z-INDEX — Layering scale
       ================================================================ */
    --am-z-base: 0;
    --am-z-dropdown: 1000;
    --am-z-sticky: 1100;
    --am-z-overlay: 1200;
    --am-z-modal: 1300;
    --am-z-popover: 1400;
    --am-z-tooltip: 1500;

    /* ================================================================
       SIZING — Component heights
       ================================================================ */
    --am-size-sm: 2rem;
    --am-size-md: 2.5rem;
    --am-size-lg: 3rem;

    /* ================================================================
       FOCUS — Ring style
       ================================================================ */
    --am-focus-ring-width: 2px;
    --am-focus-ring-offset: 2px;
  }
`;
