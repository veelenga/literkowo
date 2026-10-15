import { describe, expect, it } from 'vitest';
import { LEVELS } from '../course/catalog';
import { baseKey } from '../course/fingers';
import { KEYBOARD_LAYOUTS, SPACE_KEY, type KeyboardLayout } from './keyboardLayout';
import { RIGHT_ALT_KEY } from './rightAltLatch';

const MAX_COMPACT_ROW = 10;

function keysOf(layout: KeyboardLayout): string[] {
  return layout.rows.flatMap((row) => row.keys);
}

describe('keyboard layouts', () => {
  const taught = new Set(LEVELS.flatMap((level) => [...level.newKeys].map(baseKey)));

  it.each(Object.values(KEYBOARD_LAYOUTS))(
    'has every key the course teaches in $name',
    (layout) => {
      const keys = keysOf(layout);
      taught.forEach((key) => expect(keys).toContain(key));
      expect(keys).toContain(RIGHT_ALT_KEY);
    },
  );

  it.each(Object.values(KEYBOARD_LAYOUTS))('lists each key once in $name', (layout) => {
    const keys = keysOf(layout);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('fits the compact layout in three rows of at most ten keys', () => {
    const { rows } = KEYBOARD_LAYOUTS.compact;
    expect(rows).toHaveLength(3);
    rows.forEach((row) => expect(row.keys.length).toBeLessThanOrEqual(MAX_COMPACT_ROW));
    expect(rows.at(-1)?.keys.at(-1)).toBe(RIGHT_ALT_KEY);
    expect(keysOf(KEYBOARD_LAYOUTS.compact)).not.toContain(SPACE_KEY);
  });

  it('shows capitals only on the full layout', () => {
    expect(KEYBOARD_LAYOUTS.full.capitals).toBe(true);
    expect(KEYBOARD_LAYOUTS.compact.capitals).toBe(false);
  });
});
