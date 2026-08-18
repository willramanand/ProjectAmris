import { describe, expect, it } from 'vitest';

import { ShortcutRegistry } from '../../src/internal/controllers/shortcut-registry';

const noop = (): void => {};

describe('ShortcutRegistry — core', () => {
  describe('register() conflict detection (D-11 no-throw)', () => {
    it('keeps the first binding and refuses the second on a same-scope collision', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'a', keys: 'mod+k', handler: noop })).toEqual({ ok: true });

      const second = r.register({ id: 'b', keys: 'mod+k', handler: noop });
      expect(second).toEqual({ ok: false, reason: 'conflict', existingId: 'a' });

      // First binding still wins.
      expect(r.resolve('mod+k', [])).toBeTypeOf('function');
      expect(r.list().map((s) => s.id)).toEqual(['a']);
    });

    it('registers the same key in two different scopes (both legal)', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'g', keys: 'mod+k', handler: noop })).toEqual({ ok: true });
      expect(r.register({ id: 'd', keys: 'mod+k', scope: 'dialog', handler: noop })).toEqual({
        ok: true,
      });
    });

    it('never throws, even on empty or malformed input', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(() => r.register({ id: 'x', keys: '', handler: noop })).not.toThrow();
      expect(() =>
        r.register({ id: 'y', keys: undefined as unknown as string, handler: noop }),
      ).not.toThrow();
      expect(() =>
        r.register({ id: 'z', keys: 'mod++', handler: noop }),
      ).not.toThrow();
    });
  });

  describe('mod/opt platform normalization (D-08, detected once)', () => {
    it('maps mod → meta on macOS so mod+k and meta+k collide', () => {
      const r = new ShortcutRegistry({ platform: 'MacIntel' });
      expect(r.register({ id: 'a', keys: 'mod+k', handler: noop })).toEqual({ ok: true });
      expect(r.register({ id: 'b', keys: 'meta+k', handler: noop })).toEqual({
        ok: false,
        reason: 'conflict',
        existingId: 'a',
      });
    });

    it('maps mod → ctrl off macOS so mod+k and ctrl+k collide', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'a', keys: 'mod+k', handler: noop })).toEqual({ ok: true });
      expect(r.register({ id: 'b', keys: 'ctrl+k', handler: noop })).toEqual({
        ok: false,
        reason: 'conflict',
        existingId: 'a',
      });
    });

    it('maps opt → alt and is order-independent among modifiers', () => {
      const r = new ShortcutRegistry({ platform: 'MacIntel' });
      expect(r.register({ id: 'a', keys: 'opt+shift+p', handler: noop })).toEqual({ ok: true });
      expect(r.register({ id: 'b', keys: 'shift+alt+p', handler: noop })).toEqual({
        ok: false,
        reason: 'conflict',
        existingId: 'a',
      });
    });
  });

  describe('resolve() scope stacking (topmost active scope wins, global as base)', () => {
    it('returns the handler from the topmost active scope', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      const globalHandler = (): void => {};
      const dialogHandler = (): void => {};
      r.register({ id: 'g', keys: 'mod+k', handler: globalHandler });
      r.register({ id: 'd', keys: 'mod+k', scope: 'dialog', handler: dialogHandler });

      expect(r.resolve('mod+k', ['dialog'])).toBe(dialogHandler);
      expect(r.resolve('mod+k', [])).toBe(globalHandler);
      expect(r.resolve('mod+j', [])).toBeUndefined();
    });

    it('falls through to global when the topmost scope has no binding', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      const globalHandler = (): void => {};
      r.register({ id: 'g', keys: 'mod+k', handler: globalHandler });

      expect(r.resolve('mod+k', ['dialog'])).toBe(globalHandler);
    });
  });

  describe('list() / serialize() help-sheet seam (FEAT-V2-01)', () => {
    it('list() returns id/keys/scope/description in registration order', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      r.register({ id: 'a', keys: 'mod+k', handler: noop, description: 'Open palette' });
      r.register({ id: 'b', keys: 'mod+/', scope: 'editor', handler: noop });

      expect(r.list()).toEqual([
        { id: 'a', keys: 'mod+k', scope: 'global', description: 'Open palette' },
        { id: 'b', keys: 'mod+/', scope: 'editor', description: undefined },
      ]);
    });

    it('serialize() returns a JSON-serializable snapshot with no handler', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      r.register({ id: 'a', keys: 'mod+k', handler: noop, description: 'Open' });

      const json = r.serialize();
      expect(json).toEqual([{ id: 'a', keys: 'mod+k', scope: 'global', description: 'Open' }]);
      // Round-trips through JSON unchanged (no handler, no functions).
      expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    });
  });

  describe('unregister()', () => {
    it('removes a binding so it no longer resolves and frees the combo', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      r.register({ id: 'a', keys: 'mod+k', handler: noop });

      expect(r.unregister('a')).toBe(true);
      expect(r.resolve('mod+k', [])).toBeUndefined();
      expect(r.list()).toEqual([]);
      // Combo is freed → re-register succeeds.
      expect(r.register({ id: 'b', keys: 'mod+k', handler: noop })).toEqual({ ok: true });
    });

    it('returns false for an unknown id', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.unregister('missing')).toBe(false);
    });
  });
});

describe('ShortcutRegistry — reserved blocklist & single-key policy (D-10, WCAG 2.1.4)', () => {
  describe('reserved-combo blocklist', () => {
    it('refuses a reserved browser/OS combo with reason:"reserved" and does not store it', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'bad', keys: 'mod+w', handler: noop })).toEqual({
        ok: false,
        reason: 'reserved',
      });
      expect(r.list()).toEqual([]);
      expect(r.resolve('mod+w', [])).toBeUndefined();
    });

    it('refuses reserved combos regardless of modifier order or platform', () => {
      const mac = new ShortcutRegistry({ platform: 'MacIntel' });
      expect(mac.register({ id: 'a', keys: 'shift+mod+i', handler: noop })).toEqual({
        ok: false,
        reason: 'reserved',
      });

      const win = new ShortcutRegistry({ platform: 'Win32' });
      expect(win.register({ id: 'b', keys: 'f5', handler: noop })).toEqual({
        ok: false,
        reason: 'reserved',
      });
    });

    it('never throws while refusing a reserved combo', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(() => r.register({ id: 'x', keys: 'mod+t', handler: noop })).not.toThrow();
    });

    it('allows a non-reserved modifier combo through', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'ok', keys: 'mod+shift+p', handler: noop })).toEqual({ ok: true });
    });
  });

  describe('single-key opt-in (WCAG 2.1.4)', () => {
    it('refuses a bare single key without allowSingleKey', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      expect(r.register({ id: 'slash', keys: '/', handler: noop })).toEqual({
        ok: false,
        reason: 'reserved',
      });
      expect(r.resolve('/', [])).toBeUndefined();
    });

    it('registers the same single key when allowSingleKey is true', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      const handler = (): void => {};
      expect(
        r.register({ id: 'slash', keys: '/', handler, allowSingleKey: true }),
      ).toEqual({ ok: true });
      expect(r.resolve('/', [])).toBe(handler);
    });

    it('stops resolving an opted-in single key once it is unregistered (disable/remap seam)', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      r.register({ id: 'slash', keys: '/', handler: noop, allowSingleKey: true });
      expect(r.unregister('slash')).toBe(true);
      expect(r.resolve('/', [])).toBeUndefined();

      // Re-register under a different handler (remap) — combo is free again.
      const remapped = (): void => {};
      expect(
        r.register({ id: 'slash2', keys: '/', handler: remapped, allowSingleKey: true }),
      ).toEqual({ ok: true });
      expect(r.resolve('/', [])).toBe(remapped);
    });

    it('does not gate multi-key combos as single keys', () => {
      const r = new ShortcutRegistry({ platform: 'Win32' });
      // shift+/ has a modifier → not a bare single key, no opt-in needed.
      expect(r.register({ id: 'q', keys: 'shift+/', handler: noop })).toEqual({ ok: true });
    });
  });
});
