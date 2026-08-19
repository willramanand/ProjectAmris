import { describe, expect, it } from 'vitest';

// @ts-expect-error — zero-dep .mjs comparator, no accompanying .d.ts (build tooling, not shipped).
import { diffManifests, releaseGateExitCode } from '../scripts/cem-diff.mjs';

// Build a minimal CEM manifest wrapping one custom-element declaration.
// Only the fields the comparator reads are populated; `source` and `description`
// are added where a test needs to prove they are stripped (Pitfall 3).
type Decl = Record<string, unknown>;
const manifest = (decls: Decl[]) => ({
  schemaVersion: '1.0.0',
  modules: [{ kind: 'javascript-module', path: 'src/x.ts', declarations: decls }],
});

const el = (over: Partial<Decl> = {}): Decl => ({
  kind: 'class',
  customElement: true,
  tagName: 'am-widget',
  name: 'AmWidget',
  attributes: [{ name: 'size', default: "'md'" }],
  members: [{ kind: 'field', name: 'size', privacy: 'public' }],
  events: [{ name: 'am-change' }],
  slots: [{ name: '' }],
  cssParts: [{ name: 'base' }],
  cssProperties: [{ name: '--am-widget-bg' }],
  ...over,
});

describe('cem-diff comparator normalization', () => {
  it('reports NO drift for two identical manifests', () => {
    const result = diffManifests(manifest([el()]), manifest([el()]));
    expect(result.hasDrift).toBe(false);
    expect(result.addedElements).toEqual([]);
    expect(result.removedElements).toEqual([]);
    expect(result.changed).toEqual({});
  });

  it('reports an added event when the current element gains one', () => {
    const baseline = manifest([el({ events: [{ name: 'am-change' }] })]);
    const current = manifest([el({ events: [{ name: 'am-change' }, { name: 'am-open' }] })]);
    const result = diffManifests(baseline, current);
    expect(result.hasDrift).toBe(true);
    expect(result.changed['am-widget'].events.added).toEqual(['am-open']);
    expect(result.changed['am-widget'].events.removed).toEqual([]);
  });

  it('reports a removed cssPart when the current element loses one', () => {
    const baseline = manifest([el({ cssParts: [{ name: 'base' }, { name: 'label' }] })]);
    const current = manifest([el({ cssParts: [{ name: 'base' }] })]);
    const result = diffManifests(baseline, current);
    expect(result.hasDrift).toBe(true);
    expect(result.changed['am-widget'].cssParts.removed).toEqual(['label']);
    expect(result.changed['am-widget'].cssParts.added).toEqual([]);
  });

  it('reports a renamed cssProperty as one removed + one added token', () => {
    const baseline = manifest([el({ cssProperties: [{ name: '--am-x-old' }] })]);
    const current = manifest([el({ cssProperties: [{ name: '--am-x-new' }] })]);
    const result = diffManifests(baseline, current);
    expect(result.hasDrift).toBe(true);
    expect(result.changed['am-widget'].cssProperties.added).toEqual(['--am-x-new']);
    expect(result.changed['am-widget'].cssProperties.removed).toEqual(['--am-x-old']);
  });

  it('reports NO drift when only `source` refs and array order differ (normalization)', () => {
    // Same surface, but: source attached, arrays in a different order.
    const baseline = manifest([
      el({
        source: { href: 'src/x.ts#L10' },
        events: [{ name: 'am-change' }, { name: 'am-open' }],
        cssProperties: [{ name: '--am-a' }, { name: '--am-b' }],
      }),
    ]);
    const current = manifest([
      el({
        source: { href: 'src/x.ts#L42' }, // different line ref — must be ignored
        description: 'churned prose that must not count as a surface change',
        events: [{ name: 'am-open' }, { name: 'am-change' }], // reordered
        cssProperties: [{ name: '--am-b' }, { name: '--am-a' }], // reordered
      }),
    ]);
    const result = diffManifests(baseline, current);
    expect(result.hasDrift).toBe(false);
    expect(result.changed).toEqual({});
  });
});

describe('release gate exit code', () => {
  it('fails (1) when the surface drifts and NO Changeset accompanies it', () => {
    expect(releaseGateExitCode({ hasDrift: true, pendingChangesetCount: 0 })).toBe(1);
  });

  it('passes (0) when the surface drifts but a pending Changeset is present', () => {
    expect(releaseGateExitCode({ hasDrift: true, pendingChangesetCount: 2 })).toBe(0);
  });

  it('passes (0) when the surface is clean and no Changeset is pending', () => {
    expect(releaseGateExitCode({ hasDrift: false, pendingChangesetCount: 0 })).toBe(0);
  });

  it('passes (0) when the surface is clean and a Changeset is pending', () => {
    expect(releaseGateExitCode({ hasDrift: false, pendingChangesetCount: 3 })).toBe(0);
  });
});
