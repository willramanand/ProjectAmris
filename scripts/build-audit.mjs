// Emits api/AUDIT.md — the cross-component consistency audit (D-12, unpublished).
// Zero-dependency ESM Node script (D-13). Reads dist/custom-elements.json (the
// SAME manifest scripts/cem-diff.mjs reads, so audit + baseline share one source
// of truth) and reconciles CEM `events` against a live `new CustomEvent` grep of
// src/components, so an event dispatched but omitted from its `@fires` JSDoc still
// appears in the matrix (RESEARCH provenance caution).
//
// Declarations are keyed by tagName (never array position — CEM ordering is not
// stable across builds), mirroring scripts/cem-diff.mjs. ALL registered tagNames
// are tabulated (the 66 component files register 79 tagNames, including 13
// compound/sub-elements like am-accordion-item / am-tab / am-option).
//
// THIS PLAN ONLY MEASURES — it renames nothing (renames are Plans 03-05, API-02).
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const MANIFEST = resolve(root, 'dist/custom-elements.json');
const OUT = resolve(root, 'api/AUDIT.md');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// --- Index every declaration that registers a custom element, keyed by tagName. ---
// Mirrors scripts/cem-diff.mjs indexManifest: key by tagName, sort by name.
const elements = [];
for (const mod of manifest.modules ?? [])
  for (const d of mod.declarations ?? [])
    if (d.tagName) elements.push({ tagName: d.tagName, decl: d, modulePath: mod.path });
elements.sort((a, b) => a.tagName.localeCompare(b.tagName));

// --- Live `new CustomEvent(...)` grep of src/components (per source file). ---
// Reconciles against CEM `events` so @fires undercounting cannot hide a dispatch.
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.stories.ts'))
      out.push(p);
  }
  return out;
}
const componentFiles = walk(resolve(root, 'src/components'));

const EVENT_RE = /new CustomEvent\(\s*['"]([^'"]+)['"]/g;
const dispatchedByFile = new Map(); // absolute path -> Set<eventName>
for (const f of componentFiles) {
  const src = readFileSync(f, 'utf8');
  const set = new Set();
  let m;
  while ((m = EVENT_RE.exec(src))) set.add(m[1]);
  dispatchedByFile.set(f, set);
}
// Map a CEM module path -> its dispatched-event set (best-effort per file).
function dispatchedFor(modulePath) {
  if (!modulePath) return new Set();
  const abs = resolve(root, modulePath);
  return dispatchedByFile.get(abs) ?? new Set();
}

const uniq = (a) => [...new Set(a)].sort();
const cemEvents = (d) => (d.events ?? []).map((e) => e.name);
const publicFields = (d) =>
  (d.members ?? []).filter((m) => m.kind === 'field' && m.privacy !== 'private');
const booleanFields = (d) =>
  publicFields(d).filter((m) => (m.type?.text ?? '').split('|').map((s) => s.trim()).includes('boolean'));
const attributes = (d) => d.attributes ?? [];

// ---------------------------------------------------------------------------
// Canonical vocabulary (D-01/D-02/D-03). Outlier = an event/prop this audit maps
// to a different canonical target below. This plan tabulates; it renames nothing.
// ---------------------------------------------------------------------------
const EVENT_OUTLIERS = new Set([
  'am-show', // overlay lifecycle -> am-open (D-01)
  'am-hide', // overlay lifecycle -> am-close (D-01)
  'am-select-option', // value-change selection -> am-change (D-02)
  'am-row-select', // data-grid value-change -> am-change (D-02, payload TBD)
  'am-selection-change', // data-grid value-change -> am-change (D-02, payload TBD)
  'am-tab-change', // value-change family -> am-change (D-03)
]);
// Boolean/prop outliers keyed by "tagName::propName".
const PROP_OUTLIERS = new Set([
  'am-combobox::select', // boolean prop collides with the <am-select> element name
  'am-combobox::async', // reserved-word-ish reflected boolean; audit boolean-naming
]);

const mark = (isOutlier) => (isOutlier ? ' **[OUTLIER]**' : '');
const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/\|/g, '\\|'));

// ---------------------------------------------------------------------------
// Matrix builders (one markdown table per dimension).
// ---------------------------------------------------------------------------
function eventMatrix() {
  const lines = [
    '### Event matrix (CEM `events` ∪ live `new CustomEvent` grep)',
    '',
    'Events are the union of CEM `@fires`-derived events and the live `new CustomEvent`',
    'grep of the source file, so a dispatched-but-undocumented event still appears.',
    '',
    '| Component | Events (CEM ∪ dispatched) | Outliers → target |',
    '| --------- | ------------------------- | ----------------- |',
  ];
  for (const { tagName, decl, modulePath } of elements) {
    const events = uniq([...cemEvents(decl), ...dispatchedFor(modulePath)]);
    const outliers = events.filter((e) => EVENT_OUTLIERS.has(e));
    const targetOf = (e) =>
      e === 'am-show'
        ? 'am-open'
        : e === 'am-hide'
          ? 'am-close'
          : e === 'am-select-option' || e === 'am-row-select' || e === 'am-selection-change'
            ? 'am-change'
            : e === 'am-tab-change'
              ? 'am-change'
              : '?';
    const rendered = events.map((e) => (EVENT_OUTLIERS.has(e) ? `**${e}**` : e)).join(', ');
    const outCol = outliers.length ? outliers.map((e) => `${e} → ${targetOf(e)}`).join('; ') : '—';
    lines.push(`| \`${tagName}\` | ${cell(rendered)} | ${outCol} |`);
  }
  return lines.join('\n');
}

function propMatrix() {
  const lines = [
    '### Prop matrix (public attributes / reactive fields)',
    '',
    '| Component | Public props (attribute names) | Outliers |',
    '| --------- | ------------------------------ | -------- |',
  ];
  for (const { tagName, decl } of elements) {
    const attrs = uniq(attributes(decl).map((a) => a.name));
    const outliers = attrs.filter((p) => PROP_OUTLIERS.has(`${tagName}::${p}`));
    const rendered = attrs.map((p) => (PROP_OUTLIERS.has(`${tagName}::${p}`) ? `**${p}**` : p));
    lines.push(
      `| \`${tagName}\` | ${cell(rendered.join(', '))} | ${outliers.length ? outliers.join(', ') : '—'} |`,
    );
  }
  return lines.join('\n');
}

function booleanMatrix() {
  const lines = [
    '### Boolean-naming matrix (boolean-typed public fields)',
    '',
    'Convention: boolean props read as an affirmative state (`disabled`, `readonly`,',
    '`invalid`, `required`, `clearable`, `loading`, `open`). Outliers collide with an',
    'element name or read ambiguously.',
    '',
    '| Component | Boolean props | Outliers |',
    '| --------- | ------------- | -------- |',
  ];
  for (const { tagName, decl } of elements) {
    const bools = uniq(booleanFields(decl).map((m) => m.name));
    const outliers = bools.filter((p) => PROP_OUTLIERS.has(`${tagName}::${p}`));
    const rendered = bools.map((p) => (PROP_OUTLIERS.has(`${tagName}::${p}`) ? `**${p}**` : p));
    lines.push(
      `| \`${tagName}\` | ${cell(rendered.join(', '))} | ${outliers.length ? outliers.join(', ') : '—'} |`,
    );
  }
  return lines.join('\n');
}

function defaultMatrix() {
  const lines = [
    '### Default-value matrix (attribute defaults)',
    '',
    '| Component | Attribute defaults | Notes |',
    '| --------- | ------------------ | ----- |',
  ];
  for (const { tagName, decl } of elements) {
    const defs = attributes(decl)
      .filter((a) => a.default != null && a.default !== '')
      .map((a) => `${a.name}=${a.default}`);
    lines.push(`| \`${tagName}\` | ${cell(defs.join(', '))} | — |`);
  }
  return lines.join('\n');
}

function renameMapping() {
  const rows = [
    // Overlay lifecycle (D-01 → am-open / am-close)
    ['am-context-menu', 'am-show', 'am-open', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    ['am-context-menu', 'am-hide', 'am-close', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    ['am-popover', 'am-show', 'am-open', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    ['am-popover', 'am-hide', 'am-close', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    ['am-dropdown', 'am-show', 'am-open', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    ['am-dropdown', 'am-hide', 'am-close', 'D-01 overlay lifecycle', 'PENDING-DECISION'],
    // Value-change selection (D-02 → am-change)
    ['am-select', 'am-select-option', 'am-change', 'D-02 value-change selection', 'PENDING-DECISION'],
    [
      'am-data-grid',
      'am-row-select',
      'am-change',
      'D-02 value-change; reconcile single-vs-multi `detail` shape from live API (A1)',
      'PENDING-DECISION',
    ],
    [
      'am-data-grid',
      'am-selection-change',
      'am-change',
      'D-02 value-change; reconcile aggregate-selection `detail` shape from live API (A1)',
      'PENDING-DECISION',
    ],
    // Discrete-pick actions stay am-select (D-02) — recorded as no-change for clarity.
    ['am-menu', 'am-select', 'am-select (keep)', 'D-02 discrete pick — canonical', 'PENDING-DECISION'],
    ['am-list', 'am-select', 'am-select (keep)', 'D-02 discrete pick — canonical', 'PENDING-DECISION'],
    ['am-tree-view', 'am-select', 'am-select (keep)', 'D-02 discrete pick — canonical', 'PENDING-DECISION'],
    [
      'am-command-palette',
      'am-select',
      'am-select (keep)',
      'D-02 discrete pick — canonical',
      'PENDING-DECISION',
    ],
    // Change/toggle family (D-03 full normalization)
    ['am-tabs', 'am-tab-change', 'am-change', 'D-03 value-change → am-change', 'PENDING-DECISION'],
    ['am-pagination', 'am-change', 'am-change (keep)', 'D-03 value-change — canonical', 'PENDING-DECISION'],
    [
      'am-accordion',
      'am-toggle',
      'am-toggle (keep)',
      'D-03 expand-state → am-toggle (distinct from value-change)',
      'PENDING-DECISION',
    ],
    [
      'am-tree-view',
      'am-toggle',
      'am-toggle (keep)',
      'D-03 expand-state → am-toggle (distinct from value-change)',
      'PENDING-DECISION',
    ],
    // Prop / boolean outliers (D-03) — proposed targets for Plan 05 to approve.
    [
      'am-combobox',
      'select (boolean prop)',
      'proposed: `search-in-trigger` / `combo`',
      'D-03 boolean prop collides with <am-select> element name',
      'PENDING-DECISION',
    ],
    [
      'am-combobox',
      'async (boolean prop)',
      'proposed: keep or `remote`',
      'D-03 boolean-naming — `async` reads as a reserved concept',
      'PENDING-DECISION',
    ],
  ];
  const lines = [
    '## Rename mapping (old → new, consumed by Plans 03-05)',
    '',
    'Every row is **PENDING-DECISION**: the rename plans confirm the target at their own',
    'checkpoint before landing (D-04 hard rename, no aliases). This plan renames nothing.',
    '',
    '| Component | Current (old) | Canonical target (new) | Rule / rationale | Status |',
    '| --------- | ------------- | ---------------------- | ---------------- | ------ |',
  ];
  for (const [c, oldN, newN, rule, status] of rows)
    lines.push(`| \`${c}\` | \`${oldN}\` | \`${newN}\` | ${rule} | ${status} |`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Assemble api/AUDIT.md.
// ---------------------------------------------------------------------------
const sections = [];
sections.push('# Amris Cross-Component Consistency Audit (`api/AUDIT.md`)');
sections.push('');
sections.push(
  '> Generated by `node scripts/build-audit.mjs` from `dist/custom-elements.json`. Do not hand-edit — re-run the generator. Unpublished (D-12): `api/` stays out of package.json `files`.',
);
sections.push('');
sections.push('## Behavioral dimension matrices');
sections.push('');
sections.push(eventMatrix());
sections.push('');
sections.push(propMatrix());
sections.push('');
sections.push(booleanMatrix());
sections.push('');
sections.push(defaultMatrix());
sections.push('');
sections.push(renameMapping());
sections.push('');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sections.join('\n'));
console.log(`wrote ${OUT} — ${elements.length} registered elements tabulated`);
