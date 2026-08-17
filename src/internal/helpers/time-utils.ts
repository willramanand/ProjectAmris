/**
 * Pure time-math helpers extracted from `am-time-picker` (D-07/D-08).
 *
 * This is a plain ESM module, NOT a ReactiveController: the logic is stateless
 * clock arithmetic and value parsing/formatting with no DOM access and no host
 * lifecycle to hook, so a pure module is the correct fit (D-07). It registers no
 * custom element and is never exported from a barrel or `package.json` exports,
 * so it stays off the frozen CEM/public surface (D-09).
 *
 * time-picker uses no `@floating-ui/dom` and has no listbox, so it receives a
 * pure-helper split rather than the FloatingPositionController or the
 * ListboxNavController (Pitfall 5). Every function is relocated from time-picker
 * verbatim (same inputs/outputs) to keep the refactor behavior-preserving (D-10).
 */

/** A numeric time segment the picker can move over. */
export type TimeSegment = 'hours' | 'minutes' | 'seconds' | 'period';

/** Parsed clock fields from an `HH:MM` / `HH:MM:SS` value. */
export interface ParsedTime {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Parse an `HH:MM` or `HH:MM:SS` value into clamped hour/minute/second fields.
 * Hours clamp to 0-23, minutes and seconds to 0-59 — byte-for-byte the previous
 * inline `_parseValue` behavior. Missing segments default to `0`.
 */
export function parseTime(value: string): ParsedTime {
  const parts = value.split(':');
  return {
    hours: Math.max(0, Math.min(23, parseInt(parts[0] || '0', 10))),
    minutes: Math.max(0, Math.min(59, parseInt(parts[1] || '0', 10))),
    seconds: Math.max(0, Math.min(59, parseInt(parts[2] || '0', 10))),
  };
}

/** Derive the AM/PM period from a 24-hour `hours` value. */
export function periodFromHours(hours: number): 'AM' | 'PM' {
  return hours >= 12 ? 'PM' : 'AM';
}

/**
 * Format hour/minute/second fields into a zero-padded `HH:MM` string, or
 * `HH:MM:SS` when `showSeconds` is set.
 */
export function formatTime(
  hours: number,
  minutes: number,
  seconds: number,
  showSeconds: boolean,
): string {
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  if (showSeconds) {
    const ss = String(seconds).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
}

/**
 * Render the hour field for display. In 12-hour mode a 24-hour value is folded
 * to 1-12 (midnight/noon shown as `12`); otherwise the 24-hour value is shown.
 */
export function displayHours(hours: number, use12Hour: boolean): string {
  if (use12Hour) {
    const h = hours % 12;
    return String(h === 0 ? 12 : h).padStart(2, '0');
  }
  return String(hours).padStart(2, '0');
}

/** Wrap the hour value by `delta`, staying within 0-23. */
export function adjustHours(hours: number, delta: number): number {
  return ((hours + delta) + 24) % 24;
}

/** Wrap the minute value by `delta` steps of `step`, staying within 0-59. */
export function adjustMinutes(minutes: number, delta: number, step: number): number {
  return ((minutes + delta * step) + 60) % 60;
}

/** Wrap the second value by `delta`, staying within 0-59. */
export function adjustSeconds(seconds: number, delta: number): number {
  return ((seconds + delta) + 60) % 60;
}

/** Toggle AM/PM by shifting the 24-hour value by 12 (wrapping at 24). */
export function togglePeriodHours(hours: number): number {
  return (hours + 12) % 24;
}

/** Digit-entry bounds for a numeric segment, depending on 12/24-hour mode. */
export interface SegmentInputBounds {
  /** Largest first digit that can still begin a two-digit value. */
  maxFirst: number;
  /** Largest committed value the segment accepts. */
  maxVal: number;
  /** Smallest committed value the segment accepts. */
  minVal: number;
}

/**
 * Compute the digit-entry bounds for a numeric segment — mirrors the inline
 * `maxFirst` / `maxVal` / `minVal` derivation in `_handleDigitInput`.
 */
export function segmentInputBounds(
  segment: 'hours' | 'minutes' | 'seconds',
  use12Hour: boolean,
): SegmentInputBounds {
  const maxFirst = segment === 'hours' ? (use12Hour ? 1 : 2) : 5;
  const maxVal = segment === 'hours' ? (use12Hour ? 12 : 23) : 59;
  const minVal = segment === 'hours' && use12Hour ? 1 : 0;
  return { maxFirst, maxVal, minVal };
}

/**
 * Convert a 12-hour hour entry (`val`, 1-12) plus the current `period` into a
 * 24-hour internal value — mirrors the inline conversion in
 * `_commitSegmentValue`.
 */
export function to24Hour(val: number, period: 'AM' | 'PM'): number {
  const wasPM = period === 'PM';
  let h24 = val;
  if (val === 12) h24 = wasPM ? 12 : 0;
  else if (wasPM) h24 = val + 12;
  return h24;
}
