import { css } from 'lit';

/**
 * Semantic design tokens — meaningful names that map to primitives.
 * These are the tokens components actually reference.
 * Default values are the LIGHT theme.
 *
 * Primitive scales use role-based names so consuming apps can swap
 * entire palettes by overriding --qz-color-{role}-{step} variables.
 *
 * Naming: --qz-{purpose}
 */
export const semanticTokens = css`
  :host {
    /* ================================================================
       SURFACES
       ================================================================ */
    --qz-surface: var(--qz-color-neutral-0);
    --qz-surface-raised: var(--qz-color-neutral-0);
    --qz-surface-sunken: var(--qz-color-neutral-50);
    --qz-surface-overlay: var(--qz-color-neutral-0);

    /* ================================================================
       BORDERS
       ================================================================ */
    --qz-border: var(--qz-color-neutral-200);
    --qz-border-subtle: var(--qz-color-neutral-150);
    --qz-border-strong: var(--qz-color-neutral-300);

    /* ================================================================
       TEXT
       ================================================================ */
    --qz-text: var(--qz-color-neutral-900);
    --qz-text-secondary: var(--qz-color-neutral-600);
    --qz-text-tertiary: var(--qz-color-neutral-400);
    --qz-text-inverse: var(--qz-color-neutral-0);
    --qz-text-disabled: var(--qz-color-neutral-300);
    --qz-text-link: var(--qz-color-primary-600);

    /* ================================================================
       PRIMARY
       ================================================================ */
    --qz-primary: var(--qz-color-primary-600);
    --qz-primary-hover: var(--qz-color-primary-700);
    --qz-primary-active: var(--qz-color-primary-800);
    --qz-primary-subtle: var(--qz-color-primary-50);
    --qz-primary-subtle-hover: var(--qz-color-primary-100);
    --qz-primary-text: var(--qz-color-neutral-0);

    /* ================================================================
       SECONDARY
       ================================================================ */
    --qz-secondary: var(--qz-color-secondary-600);
    --qz-secondary-hover: var(--qz-color-secondary-700);
    --qz-secondary-active: var(--qz-color-secondary-800);
    --qz-secondary-subtle: var(--qz-color-secondary-50);
    --qz-secondary-subtle-hover: var(--qz-color-secondary-100);
    --qz-secondary-text: var(--qz-color-neutral-0);

    /* ================================================================
       SUCCESS
       ================================================================ */
    --qz-success: var(--qz-color-success-600);
    --qz-success-subtle: var(--qz-color-success-50);
    --qz-success-text: var(--qz-color-success-700);

    /* ================================================================
       WARNING
       ================================================================ */
    --qz-warning: var(--qz-color-warning-500);
    --qz-warning-subtle: var(--qz-color-warning-50);
    --qz-warning-text: var(--qz-color-warning-700);

    /* ================================================================
       DANGER
       ================================================================ */
    --qz-danger: var(--qz-color-danger-600);
    --qz-danger-hover: var(--qz-color-danger-700);
    --qz-danger-active: var(--qz-color-danger-800);
    --qz-danger-subtle: var(--qz-color-danger-50);
    --qz-danger-text: var(--qz-color-danger-700);

    /* ================================================================
       INFO
       ================================================================ */
    --qz-info: var(--qz-color-info-600);
    --qz-info-subtle: var(--qz-color-info-50);
    --qz-info-text: var(--qz-color-info-700);

    /* ================================================================
       INTERACTIVE — Hover/press overlays
       ================================================================ */
    --qz-hover-overlay: rgb(0 0 0 / 0.04);
    --qz-active-overlay: rgb(0 0 0 / 0.08);
    --qz-disabled-opacity: 0.5;

    /* ================================================================
       FOCUS
       ================================================================ */
    --qz-focus-ring: var(--qz-color-primary-500);

    /* ================================================================
       SHADOW (semantic)
       ================================================================ */
    --qz-shadow-surface: var(--qz-shadow-none);
    --qz-shadow-raised: var(--qz-shadow-sm);
    --qz-shadow-overlay: var(--qz-shadow-lg);
  }
`;
