import { css } from 'lit';

/**
 * Dark theme semantic token overrides.
 * Applied when theme="dark" or prefers-color-scheme: dark (system).
 *
 * References role-based primitive names so consuming apps that
 * override --am-color-{role}-* get dark mode for free.
 */
export const darkTokens = css`
  :host([theme='dark']) {
    color-scheme: dark;

    /* Surfaces */
    --am-surface: var(--am-color-neutral-900);
    --am-surface-raised: var(--am-color-neutral-850);
    --am-surface-sunken: var(--am-color-neutral-950);
    --am-surface-overlay: var(--am-color-neutral-850);

    /* Borders */
    --am-border: var(--am-color-neutral-800);
    --am-border-subtle: var(--am-color-neutral-850);
    --am-border-strong: var(--am-color-neutral-700);

    /* Text */
    --am-text: var(--am-color-neutral-50);
    --am-text-secondary: var(--am-color-neutral-300);
    --am-text-tertiary: var(--am-color-neutral-400);
    --am-text-inverse: var(--am-color-neutral-900);
    --am-text-disabled: var(--am-color-neutral-600);
    --am-text-link: var(--am-color-primary-400);

    /* Primary */
    --am-primary: var(--am-color-primary-400);
    --am-primary-hover: var(--am-color-primary-300);
    --am-primary-active: var(--am-color-primary-200);
    --am-primary-subtle: var(--am-color-primary-950);
    --am-primary-subtle-hover: var(--am-color-primary-900);
    --am-primary-subtle-text: var(--am-color-primary-300);
    --am-primary-text: var(--am-color-neutral-0);

    /* Secondary */
    --am-secondary: var(--am-color-secondary-500);
    --am-secondary-hover: var(--am-color-secondary-400);
    --am-secondary-active: var(--am-color-secondary-300);
    --am-secondary-subtle: var(--am-color-secondary-950);
    --am-secondary-subtle-hover: var(--am-color-secondary-900);
    --am-secondary-text: var(--am-color-secondary-950);

    /* Success */
    --am-success: var(--am-color-success-500);
    --am-success-subtle: var(--am-color-success-950);
    --am-success-text: var(--am-color-success-300);

    /* Warning */
    --am-warning: var(--am-color-warning-400);
    --am-warning-subtle: var(--am-color-warning-950);
    --am-warning-text: var(--am-color-warning-300);

    /* Danger */
    --am-danger: var(--am-color-danger-700);
    --am-danger-hover: var(--am-color-danger-600);
    --am-danger-active: var(--am-color-danger-500);
    --am-danger-subtle: var(--am-color-danger-950);
    --am-danger-text: var(--am-color-danger-300);

    /* Info */
    --am-info: var(--am-color-info-400);
    --am-info-subtle: var(--am-color-info-950);
    --am-info-text: var(--am-color-info-300);

    /* Neutral */
    --am-neutral-subtle: var(--am-color-neutral-800);

    /* Interactive */
    --am-hover-overlay: rgb(255 255 255 / 0.06);
    --am-active-overlay: rgb(255 255 255 / 0.1);

    /* Focus */
    --am-focus-ring: var(--am-color-primary-400);

    /* Shadows — heavier in dark mode for visibility */
    --am-shadow-raised: 0 1px 3px 0 rgb(0 0 0 / 0.3),
      0 1px 2px -1px rgb(0 0 0 / 0.3);
    --am-shadow-overlay: 0 10px 15px -3px rgb(0 0 0 / 0.4),
      0 4px 6px -4px rgb(0 0 0 / 0.3);
  }

  @media (prefers-color-scheme: dark) {
    :host(:not([theme='light'])) {
      color-scheme: dark;

      /* Surfaces */
      --am-surface: var(--am-color-neutral-900);
      --am-surface-raised: var(--am-color-neutral-850);
      --am-surface-sunken: var(--am-color-neutral-950);
      --am-surface-overlay: var(--am-color-neutral-850);

      /* Borders */
      --am-border: var(--am-color-neutral-800);
      --am-border-subtle: var(--am-color-neutral-850);
      --am-border-strong: var(--am-color-neutral-700);

      /* Text */
      --am-text: var(--am-color-neutral-50);
      --am-text-secondary: var(--am-color-neutral-300);
      --am-text-tertiary: var(--am-color-neutral-400);
      --am-text-inverse: var(--am-color-neutral-900);
      --am-text-disabled: var(--am-color-neutral-600);
      --am-text-link: var(--am-color-primary-400);

      /* Primary */
      --am-primary: var(--am-color-primary-400);
      --am-primary-hover: var(--am-color-primary-300);
      --am-primary-active: var(--am-color-primary-200);
      --am-primary-subtle: var(--am-color-primary-950);
      --am-primary-subtle-hover: var(--am-color-primary-900);
      --am-primary-subtle-text: var(--am-color-primary-300);
      --am-primary-text: var(--am-color-neutral-0);

      /* Secondary */
      --am-secondary: var(--am-color-secondary-500);
      --am-secondary-hover: var(--am-color-secondary-400);
      --am-secondary-active: var(--am-color-secondary-300);
      --am-secondary-subtle: var(--am-color-secondary-950);
      --am-secondary-subtle-hover: var(--am-color-secondary-900);
      --am-secondary-text: var(--am-color-secondary-950);

      /* Success */
      --am-success: var(--am-color-success-500);
      --am-success-subtle: var(--am-color-success-950);
      --am-success-text: var(--am-color-success-300);

      /* Warning */
      --am-warning: var(--am-color-warning-400);
      --am-warning-subtle: var(--am-color-warning-950);
      --am-warning-text: var(--am-color-warning-300);

      /* Danger */
      --am-danger: var(--am-color-danger-700);
      --am-danger-hover: var(--am-color-danger-600);
      --am-danger-active: var(--am-color-danger-500);
      --am-danger-subtle: var(--am-color-danger-950);
      --am-danger-text: var(--am-color-danger-300);

      /* Info */
      --am-info: var(--am-color-info-400);
      --am-info-subtle: var(--am-color-info-950);
      --am-info-text: var(--am-color-info-300);

      /* Neutral */
      --am-neutral-subtle: var(--am-color-neutral-800);

      /* Interactive */
      --am-hover-overlay: rgb(255 255 255 / 0.06);
      --am-active-overlay: rgb(255 255 255 / 0.1);

      /* Focus */
      --am-focus-ring: var(--am-color-primary-400);

      /* Shadows */
      --am-shadow-raised: 0 1px 3px 0 rgb(0 0 0 / 0.3),
        0 1px 2px -1px rgb(0 0 0 / 0.3);
      --am-shadow-overlay: 0 10px 15px -3px rgb(0 0 0 / 0.4),
        0 4px 6px -4px rgb(0 0 0 / 0.3);
    }
  }
`;
