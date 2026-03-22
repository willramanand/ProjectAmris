import { css } from 'lit';

/**
 * Semantic design tokens — meaningful names that map to primitives.
 * These are the tokens components actually reference.
 * Default values are the LIGHT theme.
 *
 * Primitive scales use role-based names so consuming apps can swap
 * entire palettes by overriding --am-color-{role}-* variables.
 *
 * Naming: --am-{purpose}
 */
export const semanticTokens = css`
  :host {
    /* ================================================================
       SURFACES
       ================================================================ */
    --am-surface: var(--am-color-neutral-0);
    --am-surface-raised: var(--am-color-neutral-0);
    --am-surface-sunken: var(--am-color-neutral-50);
    --am-surface-overlay: var(--am-color-neutral-0);

    /* ================================================================
       BORDERS
       ================================================================ */
    --am-border: var(--am-color-neutral-200);
    --am-border-subtle: var(--am-color-neutral-150);
    --am-border-strong: var(--am-color-neutral-300);

    /* ================================================================
       TEXT
       ================================================================ */
    --am-text: var(--am-color-neutral-900);
    --am-text-secondary: var(--am-color-neutral-600);
    --am-text-tertiary: var(--am-color-neutral-500);
    --am-text-inverse: var(--am-color-neutral-0);
    --am-text-disabled: var(--am-color-neutral-300);
    --am-text-link: var(--am-color-primary-600);

    /* ================================================================
       PRIMARY
       ================================================================ */
    --am-primary: var(--am-color-primary-600);
    --am-primary-hover: var(--am-color-primary-700);
    --am-primary-active: var(--am-color-primary-800);
    --am-primary-subtle: var(--am-color-primary-50);
    --am-primary-subtle-hover: var(--am-color-primary-100);
    --am-primary-subtle-text: var(--am-color-primary-600);
    --am-primary-text: var(--am-color-neutral-0);

    /* ================================================================
       SECONDARY
       ================================================================ */
    --am-secondary: var(--am-color-secondary-700);
    --am-secondary-hover: var(--am-color-secondary-800);
    --am-secondary-active: var(--am-color-secondary-900);
    --am-secondary-subtle: var(--am-color-secondary-50);
    --am-secondary-subtle-hover: var(--am-color-secondary-100);
    --am-secondary-text: var(--am-color-neutral-0);

    /* ================================================================
       SUCCESS
       ================================================================ */
    --am-success: var(--am-color-success-600);
    --am-success-subtle: var(--am-color-success-50);
    --am-success-text: var(--am-color-success-700);

    /* ================================================================
       WARNING
       ================================================================ */
    --am-warning: var(--am-color-warning-500);
    --am-warning-subtle: var(--am-color-warning-50);
    --am-warning-text: var(--am-color-warning-700);

    /* ================================================================
       DANGER
       ================================================================ */
    --am-danger: var(--am-color-danger-600);
    --am-danger-hover: var(--am-color-danger-700);
    --am-danger-active: var(--am-color-danger-800);
    --am-danger-subtle: var(--am-color-danger-50);
    --am-danger-text: var(--am-color-danger-700);

    /* ================================================================
       INFO
       ================================================================ */
    --am-info: var(--am-color-info-600);
    --am-info-subtle: var(--am-color-info-50);
    --am-info-text: var(--am-color-info-700);

    /* ================================================================
       INTERACTIVE — Hover/press overlays
       ================================================================ */
    /* ================================================================
       NEUTRAL
       ================================================================ */
    --am-neutral-subtle: var(--am-color-neutral-100);

    /* ================================================================
       INTERACTIVE — Hover/press overlays
       ================================================================ */
    --am-hover-overlay: rgb(0 0 0 / 0.04);
    --am-active-overlay: rgb(0 0 0 / 0.08);
    --am-disabled-opacity: 0.5;

    /* ================================================================
       FOCUS
       ================================================================ */
    --am-focus-ring: var(--am-color-primary-500);

    /* ================================================================
       SHADOW (semantic)
       ================================================================ */
    --am-shadow-surface: var(--am-shadow-none);
    --am-shadow-raised: var(--am-shadow-sm);
    --am-shadow-overlay: var(--am-shadow-lg);
  }
`;
