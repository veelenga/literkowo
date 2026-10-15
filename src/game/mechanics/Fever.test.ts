import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fakeMechanicContext } from '../../testing/mechanicContext';
import { FEVER_COMBO } from '../combo';
import { Fever } from './Fever';
import type { MechanicContext } from './Mechanic';

function setup() {
  const announce = vi.fn<MechanicContext['announce']>();
  const burst = vi.fn<MechanicContext['particles']['burst']>();
  const context = fakeMechanicContext({ announce, particles: { burst } });
  const fever = new Fever(context);
  const [ring] = context.scene.children;
  const hit = (times = 1) => {
    for (let index = 0; index < times; index += 1) {
      context.stats.recordHit();
      fever.onHit();
    }
  };
  const miss = () => {
    context.stats.recordMistake();
    fever.onMistake();
  };
  return { announce, burst, context, fever, ring, hit, miss };
}

function completedWord() {
  return { burstPosition: new THREE.Vector3(1, 2, 3), color: new THREE.Color(0x00ff00) };
}

describe('Fever', () => {
  it('announces combo milestones with their accent', () => {
    const { announce, hit } = setup();
    hit(4);
    expect(announce).not.toHaveBeenCalled();
    hit();
    expect(announce).toHaveBeenLastCalledWith('Super!', 'callout', undefined);
    hit(5);
    expect(announce).toHaveBeenLastCalledWith('Mega!', 'callout', '#7cf5a8');
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('starts at the fever combo with a banner and a visible ring', () => {
    const { announce, context, ring, hit } = setup();
    const celebrate = vi.spyOn(context.sfx, 'fever');
    hit(FEVER_COMBO - 1);
    expect(ring.visible).toBe(false);
    hit();
    expect(ring.visible).toBe(true);
    expect(announce).toHaveBeenLastCalledWith('Szał!', 'banner');
    expect(celebrate).toHaveBeenCalledOnce();
    hit();
    expect(celebrate).toHaveBeenCalledOnce();
  });

  it('ends on a mistake and hides the ring', () => {
    const { ring, hit, miss } = setup();
    hit(FEVER_COMBO);
    miss();
    expect(ring.visible).toBe(false);
  });

  it('adds a second shatter above completed words only during fever', () => {
    const { burst, fever, hit, miss } = setup();
    fever.onWordComplete(completedWord());
    expect(burst).not.toHaveBeenCalled();
    hit(FEVER_COMBO);
    fever.onWordComplete(completedWord());
    expect(burst).toHaveBeenCalledOnce();
    const [position] = burst.mock.calls[0];
    expect(position.toArray()).toEqual([1, 2.6, 3]);
    miss();
    fever.onWordComplete(completedWord());
    expect(burst).toHaveBeenCalledOnce();
  });

  it('spins the ring only while active and removes it on dispose', () => {
    const { context, fever, ring, hit } = setup();
    fever.update(1, 1);
    expect(ring.rotation.y).toBe(0);
    hit(FEVER_COMBO);
    fever.update(1, 1);
    expect(ring.rotation.y).toBeGreaterThan(0);
    fever.dispose();
    expect(context.scene.children).not.toContain(ring);
  });
});
