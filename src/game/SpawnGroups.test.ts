import { describe, expect, it } from 'vitest';
import { SpawnGroups } from './SpawnGroups';

describe('SpawnGroups', () => {
  it('keeps a spawn pending until its enemy leaves', () => {
    const groups = new SpawnGroups<string>();
    groups.spawn(() => groups.join('kot'));
    expect(groups.pending).toBe(1);
    groups.leave('kot');
    expect(groups.pending).toBe(0);
  });

  it('counts a spawn that turned into several enemies as one until the last one leaves', () => {
    const groups = new SpawnGroups<string>();
    groups.spawn(() => {
      groups.join('kot');
      ['twin a', 'twin b', 'twin c'].forEach((twin) => groups.join(twin));
      groups.leave('kot');
    });
    expect(groups.pending).toBe(1);
    groups.leave('twin a');
    groups.leave('twin b');
    expect(groups.pending).toBe(1);
    groups.leave('twin c');
    expect(groups.pending).toBe(0);
  });

  it('keeps the group open while a replacement leaves before its successors arrive', () => {
    const groups = new SpawnGroups<string>();
    groups.spawn(() => {
      groups.join('kot');
      groups.leave('kot');
      groups.join('jumper');
    });
    expect(groups.pending).toBe(1);
  });

  it('resolves a spawn that left during its own arrival', () => {
    const groups = new SpawnGroups<string>();
    groups.spawn(() => {
      groups.join('kot');
      groups.leave('kot');
    });
    expect(groups.pending).toBe(0);
  });

  it('ignores enemies that join outside a spawn', () => {
    const groups = new SpawnGroups<string>();
    groups.spawn(() => groups.join('kot'));
    groups.join('power word');
    groups.leave('power word');
    expect(groups.pending).toBe(1);
  });
});
