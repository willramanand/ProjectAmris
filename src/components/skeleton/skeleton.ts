import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

/**
 * Skeleton — a loading placeholder with a shimmer animation.
 *
 * Renders a pulsing placeholder shape while content loads.
 *
 * @csspart skeleton - The skeleton element
 *
 * @cssprop --am-skeleton-radius - Override border radius
 * @cssprop --am-skeleton-color - Override base color
 * @cssprop --am-skeleton-highlight - Override shimmer highlight color
 *
 * @example
 * ```html
 * <am-skeleton variant="text" style="width: 200px;"></am-skeleton>
 * <am-skeleton variant="circular" style="width: 48px; height: 48px;"></am-skeleton>
 * <am-skeleton variant="rectangular" style="width: 100%; height: 120px;"></am-skeleton>
 * ```
 */
@customElement('am-skeleton')
export class AmSkeleton extends LitElement {
  @property({ reflect: true }) variant: SkeletonVariant = 'text';

  /** Number of text lines to render (only for variant="text"). */
  @property({ type: Number }) lines = 1;

  static styles = css`
    :host {
      display: block;
    }

    :host([variant='text']) {
      height: calc(var(--am-text-sm, 0.875rem) * var(--am-leading-normal, 1.5));
      border-radius: var(--am-skeleton-radius, var(--am-radius-sm, 4px));
    }

    :host([variant='circular']) {
      border-radius: var(--am-skeleton-radius, var(--am-radius-full, 9999px));
    }

    :host([variant='rectangular']) {
      border-radius: var(--am-skeleton-radius, var(--am-radius-lg, 8px));
      corner-shape: squircle;
    }

    :host {
      background: var(--am-skeleton-color, var(--am-surface-sunken, #f0f0f0));
      background-image: linear-gradient(
        90deg,
        var(--am-skeleton-color, var(--am-surface-sunken, #f0f0f0)) 0%,
        var(--am-skeleton-highlight, var(--am-surface-raised, #fafafa)) 50%,
        var(--am-skeleton-color, var(--am-surface-sunken, #f0f0f0)) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
        background-image: none;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', 'Loading');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-skeleton': AmSkeleton;
  }
}
