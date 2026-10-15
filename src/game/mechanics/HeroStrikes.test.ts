// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import { isCachedAsset, type DisposableAsset } from '../assetCache';
import { FEVER_COMBO } from '../combo';
import { HeroStrikes } from './HeroStrikes';
import { MAX_LETTER_BOLTS } from './heroStrikes/LetterBolts';
import type { MechanicContext } from './Mechanic';

const NEAR = 3;
const FAR = 7;
const LONG_WORD = 'fjfjfjfj';
const FRAME = 1 / 60;
const STAGGER = 0.03;
const SETTLED = 5;
const MISTAKE_DIM_CEILING = 0.3;
const WORD_CRACK = 0.25;

function setup() {
  const shakeCamera = vi.fn<MechanicContext['shakeCamera']>();
  const board = fakeBoard({ shakeCamera });
  const strikes = new HeroStrikes(board.context);
  const impact = vi.spyOn(board.context.sfx, 'impact');
  const hit = (times = 1) => {
    for (let index = 0; index < times; index += 1) {
      board.context.stats.recordHit();
      strikes.onHit();
    }
  };
  return { ...board, strikes, impact, shakeCamera, hit };
}

function ownedResources(root: THREE.Object3D): DisposableAsset[] {
  const resources: DisposableAsset[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.push(object.geometry, object.material);
  });
  return resources.filter((resource) => !isCachedAsset(resource));
}

describe('HeroStrikes', () => {
  it('fires a letter bolt only while an enemy is being typed', () => {
    const { strikes, enemyAt, hit } = setup();
    hit();
    expect(strikes.letterBoltsInFlight).toBe(0);
    enemyAt(FAR, LONG_WORD).advance();
    hit();
    expect(strikes.letterBoltsInFlight).toBe(1);
  });

  it('keeps at most six letter bolts in flight and frees them once they land', () => {
    const { strikes, enemyAt, hit } = setup();
    enemyAt(NEAR, LONG_WORD).advance();
    hit(MAX_LETTER_BOLTS * 2);
    expect(strikes.letterBoltsInFlight).toBe(MAX_LETTER_BOLTS);
    strikes.update(1, 1);
    expect(strikes.letterBoltsInFlight).toBe(0);
  });

  it('strikes every completed word with a short stagger, a crack and a camera punch', () => {
    const { strikes, enemyAt, hit, impact, shakeCamera } = setup();
    const twins = [enemyAt(NEAR, 'fj'), enemyAt(FAR, 'fj')];
    hit();
    twins.forEach((enemy) => strikes.onWordComplete(enemy));
    expect(strikes.wordBoltsInFlight).toBe(1);
    expect(impact).toHaveBeenCalledExactlyOnceWith(WORD_CRACK);
    expect(shakeCamera).toHaveBeenCalledOnce();
    strikes.update(STAGGER / 2, 0);
    expect(strikes.wordBoltsInFlight).toBe(1);
    strikes.update(STAGGER, 0);
    expect(strikes.wordBoltsInFlight).toBe(2);
    expect(impact).toHaveBeenCalledTimes(2);
  });

  it('starts a new stagger on every key', () => {
    const { strikes, enemyAt, hit } = setup();
    hit();
    strikes.onWordComplete(enemyAt(NEAR, 'f'));
    hit();
    strikes.onWordComplete(enemyAt(FAR, 'j'));
    expect(strikes.wordBoltsInFlight).toBe(2);
  });

  it('charges the hero glow with the combo and dims it on a mistake', () => {
    const { context, strikes, hit } = setup();
    strikes.update(FRAME, 0);
    expect(strikes.chargeBrightness).toBe(0);
    hit(FEVER_COMBO);
    strikes.update(SETTLED, SETTLED);
    expect(strikes.chargeBrightness).toBeCloseTo(1);
    context.stats.recordMistake();
    strikes.onMistake();
    strikes.update(FRAME, SETTLED);
    expect(strikes.chargeBrightness).toBeLessThan(MISTAKE_DIM_CEILING);
  });

  it('removes its effects from the scene and frees them on dispose', () => {
    const { context, strikes } = setup();
    const [root] = context.scene.children;
    const disposals = ownedResources(root).map((resource) => vi.spyOn(resource, 'dispose'));
    strikes.dispose();
    expect(context.scene.children).not.toContain(root);
    expect(disposals.length).toBeGreaterThan(0);
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledOnce());
  });
});
