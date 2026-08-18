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
