import axe, { type Result } from 'axe-core';

/**
 * Run axe-core against an element and return any violations.
 * Disables rules that don't apply in jsdom (no computed styles).
 */
export async function checkA11y(
  element: HTMLElement,
  disabledRules: string[] = [],
): Promise<Result[]> {
  const defaultDisabled = [
    'color-contrast',        // jsdom has no computed styles
    'region',                // component-level testing, not page-level
  ];

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
