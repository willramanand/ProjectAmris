// Emits docs/contract.md — the consumer-facing FROZEN slot / `::part()` / `--am-*`
// token contract (D-05). Zero-dependency ESM Node script (D-13), mirroring
// scripts/build-audit.mjs: it reads the SAME dist/custom-elements.json the
// baseline + scripts/cem-diff.mjs guard, and the SAME src/tokens/*.css.ts global
// scale, so the published doc can NEVER drift from the enforced CEM surface.
//
// Declarations are keyed by tagName (never array position — CEM ordering is not
// stable across builds), exactly as scripts/build-audit.mjs / scripts/cem-diff.mjs.
//
// It reads ONLY the public CEM surface + global tokens — never src/internal
// (threat T-05-01). Manifest data is rendered as plain markdown table cells with
// `|` escaped — no code execution of manifest content.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const MANIFEST = resolve(root, 'dist/custom-elements.json');
const OUT = resolve(root, 'docs/contract.md');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// --- Index every declaration that registers a custom element, keyed by tagName. ---
// Mirrors scripts/build-audit.mjs / scripts/cem-diff.mjs: key by tagName, sort by name.
const elements = [];
for (const mod of manifest.modules ?? [])
  for (const d of mod.declarations ?? [])
    if (d.tagName) elements.push({ tagName: d.tagName, decl: d });
// Code-point comparison (NOT localeCompare): this doc is drift-gated by
// `git diff --exit-code` in CI, so ordering must be locale-independent —
// ICU collation can differ between the generating machine and CI (WR-01).
elements.sort((a, b) => (a.tagName < b.tagName ? -1 : a.tagName > b.tagName ? 1 : 0));

// --- Global --am-* token source of truth (src/tokens/*.css.ts). ---
// Same css`` block extraction as scripts/build-audit.mjs / build-tokens-css.mjs.
const TOKEN_SOURCES = [
  'src/tokens/primitives.css.ts',
  'src/tokens/semantic.css.ts',
  'src/tokens/dark.css.ts',
];
const cssBlocks = (src) => [...src.matchAll(/css`([\s\S]*?)`/g)].map((m) => m[1]);
const globalTokens = new Set();
for (const rel of TOKEN_SOURCES) {
  const src = readFileSync(resolve(root, rel), 'utf8');
  for (const block of cssBlocks(src))
    for (const m of block.matchAll(/(--am-[\w-]+)\s*:/g)) globalTokens.add(m[1]);
}

// --- Helpers (shared shape with build-audit.mjs). ---
const uniq = (a) => [...new Set(a)].sort();
const cemNames = (arr) => uniq((arr ?? []).map((x) => (x.name === '' ? '(default)' : x.name)));
const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/\|/g, '\\|'));

// Union surfaces across every registered tagName.
const allSlots = new Set();
const allParts = new Set();
const allComponentTokens = new Set();
for (const { decl } of elements) {
  for (const s of cemNames(decl.slots)) allSlots.add(s);
  for (const p of cemNames(decl.cssParts)) allParts.add(p);
  for (const t of decl.cssProperties ?? []) allComponentTokens.add(t.name);
}

// ---------------------------------------------------------------------------
// (2) Hand-written freeze-guarantee intro (D-06). Embedded as a constant so the
// ENTIRE file stays deterministically regenerable — CI diffs the whole doc.
// ---------------------------------------------------------------------------
const FREEZE_INTRO = `## What "frozen" means

At **v1.0**, the slot names, \`::part()\` names, and \`--am-*\` custom properties
enumerated on this page are the **frozen public contract** of \`@willramanand/amris\`.
You can build against them and trust that they will not churn:

- **They will not be renamed or removed within the 1.0 line.** A consumer who
  styles \`::part(control)\`, fills a named \`<slot>\`, or overrides an \`--am-*\`
  token can rely on that name continuing to work.
- **Any change to this surface is a versioned, deliberate act.** Adding, renaming,
  or removing a slot / part / token is a public-API change — it ships as a new
  release with a changeset, never silently.
- **CI blocks unversioned drift.** The surface is captured in
  \`api/custom-elements.baseline.json\` and checked by \`npm run diff:surface\`; this
  very document is regenerated from the same manifest and \`git diff\`-gated in CI,
  so it can never fall out of sync with the enforced surface.

Everything below is **generated from \`dist/custom-elements.json\`** — the same
Custom Elements Manifest the freeze gate enforces. It is the single source of
truth for the numbers and names on this page.`;

// ---------------------------------------------------------------------------
// Generated exhaustive tables.
// ---------------------------------------------------------------------------
const list = (s) => (s.size ? uniq([...s]).map((x) => `\`${x}\``).join(', ') : '—');

function countsSummary() {
  return [
    '## Frozen surface at a glance',
    '',
    '| Surface | Count |',
    '| ------- | ----- |',
    `| Global \`--am-*\` tokens (src/tokens/{primitives,semantic,dark}.css.ts) | **${globalTokens.size}** |`,
    `| Per-component \`--am-*\` tokens (CEM \`@cssprop\`) | **${allComponentTokens.size}** |`,
    `| Slots (unique names) | **${allSlots.size}** |`,
    `| \`::part()\` names (unique) | **${allParts.size}** |`,
  ].join('\n');
}

function globalTokenList() {
  return [
    '## Global `--am-*` tokens',
    '',
    `All ${globalTokens.size} global semantic/primitive tokens from`,
    '`src/tokens/{primitives,semantic,dark}.css.ts`. Override any of these on a host',
    'element (or `:root`) to re-theme; every component reads them via `var(--am-*)`.',
    '',
    list(globalTokens),
  ].join('\n');
}

function perComponentTokenTable() {
  const lines = [
    '## Per-component `--am-*` tokens (`@cssprop`)',
    '',
    `The ${allComponentTokens.size} per-component \`--am-{component}-*\` tokens each element`,
    'documents. Set them on the element to tune it without piercing the Shadow DOM.',
    '',
    '| Component | `--am-*` tokens (`@cssprop`) |',
    '| --------- | ---------------------------- |',
  ];
  for (const { tagName, decl } of elements) {
    const toks = cemNames(decl.cssProperties);
    if (!toks.length) continue;
    lines.push(`| \`${tagName}\` | ${cell(toks.join(', '))} |`);
  }
  return lines.join('\n');
}

function slotTable() {
  const lines = [
    '## Slots (`@slot`)',
    '',
    `The ${allSlots.size} unique named slots (plus the default slot) exposed for content`,
    'composition. Project content into a component with `slot="<name>"`.',
    '',
    '| Component | Slots |',
    '| --------- | ----- |',
  ];
  for (const { tagName, decl } of elements) {
    const slots = cemNames(decl.slots);
    if (!slots.length) continue;
    lines.push(`| \`${tagName}\` | ${cell(slots.join(', '))} |`);
  }
  return lines.join('\n');
}

function partTable() {
  const lines = [
    '## `::part()` names (`@csspart`)',
    '',
    `The ${allParts.size} unique \`::part()\` names exposed for external styling. Target`,
    'them from outside the Shadow DOM with `am-component::part(<name>) { … }`.',
    '',
    '| Component | Parts |',
    '| --------- | ----- |',
  ];
  for (const { tagName, decl } of elements) {
    const parts = cemNames(decl.cssParts);
    if (!parts.length) continue;
    lines.push(`| \`${tagName}\` | ${cell(parts.join(', '))} |`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Assemble docs/contract.md.
// ---------------------------------------------------------------------------
const sections = [];
sections.push('# Amris Public Contract — Frozen Slots, `::part()`s & `--am-*` Tokens');
sections.push('');
sections.push(
  '> **Generated** by `node scripts/build-contract-doc.mjs` from `dist/custom-elements.json`. Do NOT hand-edit — re-run the generator (`npm run build:contract-doc`). CI regenerates this file and fails on drift (`git diff --exit-code docs/contract.md`).',
);
sections.push('');
sections.push(FREEZE_INTRO);
sections.push('');
sections.push(countsSummary());
sections.push('');
sections.push(globalTokenList());
sections.push('');
sections.push(perComponentTokenTable());
sections.push('');
sections.push(slotTable());
sections.push('');
sections.push(partTable());
sections.push('');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sections.join('\n'));
console.log(
  `wrote ${OUT} — ${globalTokens.size} global tokens, ${allComponentTokens.size} component tokens, ${allSlots.size} slots, ${allParts.size} parts`,
);
