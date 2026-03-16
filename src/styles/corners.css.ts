import { css } from 'lit';

/**
 * Squircle corner shape utility.
 *
 * Uses CSS `corner-shape: squircle` (CSS Backgrounds L4) with
 * standard `border-radius` as the fallback for older browsers.
 * Squircles provide the smooth, continuous curvature seen in
 * Apple's HIG — a superellipse rather than a simple arc.
 */
export const squircleCorners = css`
  :host {
    corner-shape: squircle;
  }
`;
