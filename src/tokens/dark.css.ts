import { css } from 'lit';

/**
 * Dark theme semantic token overrides.
 * Applied when theme="dark" or prefers-color-scheme: dark (system).
 *
 * References role-based primitive names so consuming apps that
 * override --qz-color-{role}-* get dark mode for free.
 */
export const darkTokens = css`
  :host([theme='dark']) {
    color-scheme: dark;

    /* Surfaces */
    --qz-surface: var(--qz-color-neutral-900);
    --qz-surface-raised: var(--qz-color-neutral-850);
    --qz-surface-sunken: var(--qz-color-neutral-950);
    --qz-surface-overlay: var(--qz-color-neutral-850);

    /* Borders */
    --qz-border: var(--qz-color-neutral-800);
    --qz-border-subtle: var(--qz-color-neutral-850);
    --qz-border-strong: var(--qz-color-neutral-700);

    /* Text */
    --qz-text: var(--qz-color-neutral-50);
    --qz-text-secondary: var(--qz-color-neutral-400);
    --qz-text-tertiary: var(--qz-color-neutral-500);
    --qz-text-inverse: var(--qz-color-neutral-900);
    --qz-text-disabled: var(--qz-color-neutral-600);
    --qz-text-link: var(--qz-color-primary-400);

    /* Primary */
    --qz-primary: var(--qz-color-primary-500);
    --qz-primary-hover: var(--qz-color-primary-400);
    --qz-primary-active: var(--qz-color-primary-300);
    --qz-primary-subtle: var(--qz-color-primary-950);
    --qz-primary-subtle-hover: var(--qz-color-primary-900);
    --qz-primary-text: var(--qz-color-neutral-0);

    /* Secondary */
    --qz-secondary: var(--qz-color-secondary-500);
    --qz-secondary-hover: var(--qz-color-secondary-400);
    --qz-secondary-active: var(--qz-color-secondary-300);
    --qz-secondary-subtle: var(--qz-color-secondary-950);
    --qz-secondary-subtle-hover: var(--qz-color-secondary-900);
    --qz-secondary-text: var(--qz-color-neutral-0);

    /* Success */
    --qz-success: var(--qz-color-success-500);
    --qz-success-subtle: var(--qz-color-success-950);
    --qz-success-text: var(--qz-color-success-300);

    /* Warning */
    --qz-warning: var(--qz-color-warning-400);
    --qz-warning-subtle: var(--qz-color-warning-950);
    --qz-warning-text: var(--qz-color-warning-300);

    /* Danger */
    --qz-danger: var(--qz-color-danger-500);
    --qz-danger-hover: var(--qz-color-danger-400);
    --qz-danger-active: var(--qz-color-danger-300);
    --qz-danger-subtle: var(--qz-color-danger-950);
    --qz-danger-text: var(--qz-color-danger-300);

    /* Info */
    --qz-info: var(--qz-color-info-400);
    --qz-info-subtle: var(--qz-color-info-950);
    --qz-info-text: var(--qz-color-info-300);

    /* Interactive */
    --qz-hover-overlay: rgb(255 255 255 / 0.06);
    --qz-active-overlay: rgb(255 255 255 / 0.1);

    /* Focus */
    --qz-focus-ring: var(--qz-color-primary-400);

    /* Shadows — heavier in dark mode for visibility */
    --qz-shadow-raised: 0 1px 3px 0 rgb(0 0 0 / 0.3),
      0 1px 2px -1px rgb(0 0 0 / 0.3);
    --qz-shadow-overlay: 0 10px 15px -3px rgb(0 0 0 / 0.4),
      0 4px 6px -4px rgb(0 0 0 / 0.3);
  }

  @media (prefers-color-scheme: dark) {
    :host(:not([theme='light'])) {
      color-scheme: dark;

      /* Surfaces */
      --qz-surface: var(--qz-color-neutral-900);
      --qz-surface-raised: var(--qz-color-neutral-850);
      --qz-surface-sunken: var(--qz-color-neutral-950);
      --qz-surface-overlay: var(--qz-color-neutral-850);

      /* Borders */
      --qz-border: var(--qz-color-neutral-800);
      --qz-border-subtle: var(--qz-color-neutral-850);
      --qz-border-strong: var(--qz-color-neutral-700);

      /* Text */
      --qz-text: var(--qz-color-neutral-50);
      --qz-text-secondary: var(--qz-color-neutral-400);
      --qz-text-tertiary: var(--qz-color-neutral-500);
      --qz-text-inverse: var(--qz-color-neutral-900);
      --qz-text-disabled: var(--qz-color-neutral-600);
      --qz-text-link: var(--qz-color-primary-400);

      /* Primary */
      --qz-primary: var(--qz-color-primary-500);
      --qz-primary-hover: var(--qz-color-primary-400);
      --qz-primary-active: var(--qz-color-primary-300);
      --qz-primary-subtle: var(--qz-color-primary-950);
      --qz-primary-subtle-hover: var(--qz-color-primary-900);
      --qz-primary-text: var(--qz-color-neutral-0);

      /* Secondary */
      --qz-secondary: var(--qz-color-secondary-500);
      --qz-secondary-hover: var(--qz-color-secondary-400);
      --qz-secondary-active: var(--qz-color-secondary-300);
      --qz-secondary-subtle: var(--qz-color-secondary-950);
      --qz-secondary-subtle-hover: var(--qz-color-secondary-900);
      --qz-secondary-text: var(--qz-color-neutral-0);

      /* Success */
      --qz-success: var(--qz-color-success-500);
      --qz-success-subtle: var(--qz-color-success-950);
      --qz-success-text: var(--qz-color-success-300);

      /* Warning */
      --qz-warning: var(--qz-color-warning-400);
      --qz-warning-subtle: var(--qz-color-warning-950);
      --qz-warning-text: var(--qz-color-warning-300);

      /* Danger */
      --qz-danger: var(--qz-color-danger-500);
      --qz-danger-hover: var(--qz-color-danger-400);
      --qz-danger-active: var(--qz-color-danger-300);
      --qz-danger-subtle: var(--qz-color-danger-950);
      --qz-danger-text: var(--qz-color-danger-300);

      /* Info */
      --qz-info: var(--qz-color-info-400);
      --qz-info-subtle: var(--qz-color-info-950);
      --qz-info-text: var(--qz-color-info-300);

      /* Interactive */
      --qz-hover-overlay: rgb(255 255 255 / 0.06);
      --qz-active-overlay: rgb(255 255 255 / 0.1);

      /* Focus */
      --qz-focus-ring: var(--qz-color-primary-400);

      /* Shadows */
      --qz-shadow-raised: 0 1px 3px 0 rgb(0 0 0 / 0.3),
        0 1px 2px -1px rgb(0 0 0 / 0.3);
      --qz-shadow-overlay: 0 10px 15px -3px rgb(0 0 0 / 0.4),
        0 4px 6px -4px rgb(0 0 0 / 0.3);
    }
  }
`;
