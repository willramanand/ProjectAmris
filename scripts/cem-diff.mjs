// Report-only CEM surface comparator (D-13). Zero-dependency Node script.
// Diffs two custom-elements.json manifests (baseline vs freshly built) by
// tagName, comparing only the frozen public surface: attributes, public fields,
// events, slots, cssParts, and cssProperties (the --am-* freeze surface).
//
// Normalization (Pitfall 3): declarations are keyed by tagName (never array
// position — CEM ordering is not stable across builds), every compared array is
// sorted by name, and volatile fields (`source` module/line refs, description /
// summary prose) are stripped and never compared. Identical builds report zero
// drift.
//
// THIS PHASE IS REPORT-ONLY: the CLI ALWAYS exits 0 (D-13). Phase 6 (SHIP-01)
// flips this to a non-zero exit — a one-line change here, not a workflow edit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

// name-only sorted list of a CEM array (events, slots, cssParts, ...).
const names = (arr) => (arr ?? []).map((x) => x.name).sort();

// Extract the normalized public surface of one custom-element declaration.
// Volatile fields (source, description/summary) are intentionally NOT read.
const pickSurface = (d) => ({
  // attributes carry a semantic default; key by name, keep the default value.
  attributes: (d.attributes ?? [])
    .map((a) => ({ name: a.name, default: a.default ?? null }))
    .sort((x, y) => x.name.localeCompare(y.name)),
  // public reactive fields only — internal @state / private members are not surface.
  fields: (d.members ?? [])
    .filter((m) => m.kind === 'field' && m.privacy !== 'private')
    .map((m) => m.name)
    .sort(),
  events: names(d.events),
  slots: names(d.slots),
  cssParts: names(d.cssParts),
  cssProperties: names(d.cssProperties), // the --am-* freeze surface (API-04)
});

// Build a { tagName -> surface } map from a manifest object.
export const indexManifest = (manifest) => {
  const out = {};
  for (const mod of manifest.modules ?? [])
    for (const d of mod.declarations ?? []) if (d.tagName) out[d.tagName] = pickSurface(d);
  return out;
};

// Diff two sorted string arrays -> { added, removed }.
const diffNameArrays = (base, cur) => {
  const baseSet = new Set(base);
  const curSet = new Set(cur);
  return {
    added: cur.filter((n) => !baseSet.has(n)),
    removed: base.filter((n) => !curSet.has(n)),
  };
};

// Diff two attribute arrays ({name, default}) -> { added, removed, changed }.
const diffAttributes = (base, cur) => {
  const baseMap = new Map(base.map((a) => [a.name, a.default]));
  const curMap = new Map(cur.map((a) => [a.name, a.default]));
  const added = cur.filter((a) => !baseMap.has(a.name)).map((a) => a.name);
  const removed = base.filter((a) => !curMap.has(a.name)).map((a) => a.name);
  const changed = cur
    .filter((a) => baseMap.has(a.name) && baseMap.get(a.name) !== a.default)
    .map((a) => ({ name: a.name, from: baseMap.get(a.name), to: a.default }));
  return { added, removed, changed };
};

const SURFACE_ARRAYS = ['fields', 'events', 'slots', 'cssParts', 'cssProperties'];

// Compare two manifest objects. Returns a structured result:
//   {
//     addedElements: string[],      // tagNames present only in current
//     removedElements: string[],    // tagNames present only in baseline
//     changed: { [tagName]: { attributes:{added,removed,changed}, events:{added,removed}, ... } },
//     hasDrift: boolean
//   }
// Only elements with at least one surface delta appear in `changed`.
export const diffManifests = (baseline, current) => {
  const base = indexManifest(baseline);
  const cur = indexManifest(current);

  const baseTags = new Set(Object.keys(base));
  const curTags = new Set(Object.keys(cur));

  const addedElements = [...curTags].filter((t) => !baseTags.has(t)).sort();
  const removedElements = [...baseTags].filter((t) => !curTags.has(t)).sort();

  const changed = {};
  for (const tag of [...baseTags].filter((t) => curTags.has(t)).sort()) {
    const b = base[tag];
    const c = cur[tag];
    const attrDelta = diffAttributes(b.attributes, c.attributes);
    const elementDelta = {};
    if (attrDelta.added.length || attrDelta.removed.length || attrDelta.changed.length)
      elementDelta.attributes = attrDelta;
    for (const key of SURFACE_ARRAYS) {
      const delta = diffNameArrays(b[key], c[key]);
      if (delta.added.length || delta.removed.length) elementDelta[key] = delta;
    }
    if (Object.keys(elementDelta).length) changed[tag] = elementDelta;
  }

  const hasDrift =
    addedElements.length > 0 || removedElements.length > 0 || Object.keys(changed).length > 0;

  return { addedElements, removedElements, changed, hasDrift };
};

// Render a structured diff result as a human-readable per-element report.
export const formatReport = (result) => {
  const lines = [];
  lines.push('CEM surface diff (report-only, D-13)');
  lines.push('====================================');
  if (!result.hasDrift) {
    lines.push('No surface drift — baseline and current manifests match.');
    return lines.join('\n');
  }
  if (result.addedElements.length) lines.push(`+ Added elements: ${result.addedElements.join(', ')}`);
  if (result.removedElements.length)
    lines.push(`- Removed elements: ${result.removedElements.join(', ')}`);

  for (const [tag, delta] of Object.entries(result.changed)) {
    lines.push(`~ ${tag}`);
    if (delta.attributes) {
      const a = delta.attributes;
      if (a.added.length) lines.push(`    attributes +: ${a.added.join(', ')}`);
      if (a.removed.length) lines.push(`    attributes -: ${a.removed.join(', ')}`);
      for (const c of a.changed)
        lines.push(`    attribute ~ ${c.name}: ${c.from} -> ${c.to}`);
    }
    for (const key of SURFACE_ARRAYS) {
      if (!delta[key]) continue;
      if (delta[key].added.length) lines.push(`    ${key} +: ${delta[key].added.join(', ')}`);
      if (delta[key].removed.length) lines.push(`    ${key} -: ${delta[key].removed.join(', ')}`);
    }
  }
  return lines.join('\n');
};

// CLI entry: `node scripts/cem-diff.mjs <baseline> <current>`. Report-only.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [, , baselinePath, currentPath] = process.argv;
  if (!baselinePath || !currentPath) {
    console.error('usage: node scripts/cem-diff.mjs <baseline.json> <current.json>');
    process.exit(0); // report-only: never fail CI this phase (D-13)
  }
  const result = diffManifests(load(baselinePath), load(currentPath));
  console.log(formatReport(result));
  process.exit(0); // REPORT-ONLY this phase (D-13); Phase 6 (SHIP-01) flips to non-zero.
}
