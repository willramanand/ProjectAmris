let counter = 0;

/**
 * Generate a unique ID for ARIA associations and label linking.
 */
export function uniqueId(prefix = 'qz'): string {
  return `${prefix}-${++counter}`;
}
