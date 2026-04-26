let counter = 0;

/**
 * Generate a unique ID for ARIA associations and label linking.
 */
export function uniqueId(prefix = 'qz'): string {
  return `${prefix}-${++counter}`;
}

/**
 * Reset the internal counter. Intended for SSR: call this at the start of each
 * request to keep generated IDs deterministic across server renders and avoid
 * client/server hydration mismatches.
 */
export function resetUniqueIdCounter(): void {
  counter = 0;
}
