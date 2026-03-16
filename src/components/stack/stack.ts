import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type StackDirection = 'vertical' | 'horizontal';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between';

/**
 * Stack — a flex layout primitive for vertical or horizontal stacking.
 *
 * @slot - Child elements
 * @csspart stack - The flex container
 *
 * @cssprop --am-stack-gap - Override gap (default: based on gap attribute)
 *
 * @example
 * ```html
 * <am-stack gap="4">
 *   <am-button>First</am-button>
 *   <am-button>Second</am-button>
 * </am-stack>
 *
 * <am-stack direction="horizontal" gap="3" align="center">
 *   <am-avatar initials="JD"></am-avatar>
 *   <span>Jane Doe</span>
 * </am-stack>
 * ```
 */
@customElement('am-stack')
export class AmStack extends LitElement {
  @property({ reflect: true }) direction: StackDirection = 'vertical';
  @property({ reflect: true }) align: StackAlign = 'stretch';
  @property({ reflect: true }) justify: StackJustify = 'start';

  /** Gap using the spacing scale (e.g. "2" = --am-space-2). */
  @property({ reflect: true }) gap = '3';

  /** Whether children should wrap. */
  @property({ type: Boolean, reflect: true }) wrap = false;

  static styles = css`
    :host {
      display: flex;
    }

    :host([direction='vertical']), :host(:not([direction])) {
      flex-direction: column;
    }

    :host([direction='horizontal']) {
      flex-direction: row;
    }

    :host([wrap]) { flex-wrap: wrap; }

    /* Align */
    :host([align='start']) { align-items: flex-start; }
    :host([align='center']) { align-items: center; }
    :host([align='end']) { align-items: flex-end; }
    :host([align='stretch']), :host(:not([align])) { align-items: stretch; }

    /* Justify */
    :host([justify='start']), :host(:not([justify])) { justify-content: flex-start; }
    :host([justify='center']) { justify-content: center; }
    :host([justify='end']) { justify-content: flex-end; }
    :host([justify='between']) { justify-content: space-between; }

    /* Gap — map to spacing tokens */
    :host([gap='0']) { gap: 0; }
    :host([gap='1']) { gap: var(--am-space-1); }
    :host([gap='1-5']), :host([gap='1.5']) { gap: var(--am-space-1-5); }
    :host([gap='2']) { gap: var(--am-space-2); }
    :host([gap='2-5']), :host([gap='2.5']) { gap: var(--am-space-2-5); }
    :host([gap='3']), :host(:not([gap])) { gap: var(--am-space-3); }
    :host([gap='4']) { gap: var(--am-space-4); }
    :host([gap='5']) { gap: var(--am-space-5); }
    :host([gap='6']) { gap: var(--am-space-6); }
    :host([gap='8']) { gap: var(--am-space-8); }
    :host([gap='10']) { gap: var(--am-space-10); }
    :host([gap='12']) { gap: var(--am-space-12); }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-stack': AmStack;
  }
}
