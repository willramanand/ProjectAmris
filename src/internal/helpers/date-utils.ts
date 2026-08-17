/**
 * Pure date-math helpers extracted from `am-date-picker` (D-07/D-08).
 *
 * This is a plain ESM module, NOT a ReactiveController: the logic is stateless
 * calendar arithmetic with no DOM access and no host lifecycle to hook, so a
 * pure module is the correct fit (D-07). It registers no custom element and is
 * never exported from a barrel or `package.json` exports, so it stays off the
 * frozen CEM/public surface (D-09).
 *
 * Every function is relocated from date-picker verbatim (same inputs/outputs)
 * to keep the refactor behavior-preserving (D-10).
 */

/** Number of days in `month` (1-12) of `year`. Mirrors `new Date(year, month, 0)`. */
export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Clamp `day` to the last valid day of `month`/`year`. */
export function clampDay(day: number, month: number, year: number): number {
  const maxDay = daysInMonth(month, year);
  return day > maxDay ? maxDay : day;
}

/** Parsed calendar fields from a `YYYY-MM-DD` value. */
export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Parse a `YYYY-MM-DD` string into clamped year/month/day fields, or `null` when
 * it does not match. Month is clamped to 1-12 and day to the month's valid
 * range — byte-for-byte the previous inline `_parseValue` behavior.
 */
export function parseDate(value: string): ParsedDate | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = Math.max(1, Math.min(12, parseInt(match[2], 10)));
  const day = Math.max(1, Math.min(daysInMonth(month, year), parseInt(match[3], 10)));
  return { year, month, day };
}

/** Format year/month/day into a zero-padded `YYYY-MM-DD` string. */
export function formatDate(year: number, month: number, day: number): string {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
