import axe, { type Result } from 'axe-core';

/**
 * Run axe-core against an element and return any violations.
 *
 * In the jsdom lane, `color-contrast` and `region` are disabled by default
 * (jsdom has no computed styles / layout). The browser lane passes
 * `{ includeDefaultDisabled: false }` so those two rules actually execute
 * against real Chromium computed styles (TEST-08, OQ-2 — in-browser axe-core).
 */
export async function checkA11y(
  element: HTMLElement,
  disabledRules: string[] = [],
  options: { includeDefaultDisabled?: boolean } = {},
): Promise<Result[]> {
  const { includeDefaultDisabled = true } = options;
  const defaultDisabled = includeDefaultDisabled
    ? [
        'color-contrast', // jsdom has no computed styles
        'region', // component-level testing, not page-level
      ]
    : [];

  const rules: Record<string, { enabled: boolean }> = {};
  for (const rule of [...defaultDisabled, ...disabledRules]) {
    rules[rule] = { enabled: false };
  }

  const results = await axe.run(element, { rules });
  return results.violations;
}

/**
 * Format violations into a readable string for assertion messages.
 */
export function formatViolations(violations: Result[]): string {
  return violations
    .map(v => {
      const nodes = v.nodes.map(n => `  - ${n.html}`).join('\n');
      return `[${v.id}] ${v.help} (${v.impact})\n${nodes}`;
    })
    .join('\n\n');
}
