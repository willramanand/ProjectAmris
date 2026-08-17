/**
 * Client-side option filtering shared by combobox and other option-list
 * components. This is a pure module (D-07) rather than a Reactive Controller:
 * filtering is stateless — the only "async gating" concern is the `remote`
 * flag, which is a caller-supplied boolean, not lifecycle state. There is
 * nothing to hook into the host's update cycle, so a plain function is the
 * better fit for the real call sites.
 *
 * When `remote` is true, client-side filtering is disabled and the options are
 * returned as-is (the consumer's external source already filtered them). This
 * mirrors combobox's previous inline behavior byte-for-byte, including the
 * case-insensitive `includes` match (an empty query matches everything).
 */
export function filterOptions(options: string[], query: string, remote = false): string[] {
  if (remote) return options;
  const q = query.toLowerCase();
  return options.filter(o => o.toLowerCase().includes(q));
}
