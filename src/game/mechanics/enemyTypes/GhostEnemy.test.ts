// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FRAME, VIEWER, enemyTypesBoard, rollFor, specialOf } from '../../../testing/enemyTypes';
import { Enemy } from '../../Enemy';
import { FADE_CYCLE_SECONDS, GhostEnemy, solidityAt } from './GhostEnemy';

const LEVEL = 'las-2';

function haunt(ghost: GhostEnemy, seconds: number): void {
  for (let time = 0; time < seconds; time += FRAME) ghost.update(FRAME, time, VIEWER);
}

function spawnGhost(): GhostEnemy {
  return specialOf(enemyTypesBoard(LEVEL, () => rollFor('ghost', LEVEL)).spawn(), GhostEnemy);
}

function heading(enemy: Enemy): number {
  return Math.atan2(enemy.object.position.z, enemy.object.position.x);
}

describe('Ghost', () => {
  it('haunts the forest from its second level', () => {
    expect(enemyTypesBoard('las-1', () => 0.2).spawn()).not.toBeInstanceOf(GhostEnemy);
    expect(spawnGhost()).toBeInstanceOf(GhostEnemy);
  });

  it('fades out and back in on a three second cycle', () => {
    expect(solidityAt(0)).toBe(1);
    expect(solidityAt(FADE_CYCLE_SECONDS / 2)).toBe(0);
    expect(solidityAt(FADE_CYCLE_SECONDS)).toBeCloseTo(1);
  });

  it('shows its label only while it is solid', () => {
    const ghost = spawnGhost();
    haunt(ghost, FRAME);
    expect(Number(ghost.label.style.opacity)).toBeGreaterThan(0.9);
    haunt(ghost, FADE_CYCLE_SECONDS / 2);
    expect(Number(ghost.label.style.opacity)).toBeLessThan(0.1);
    haunt(ghost, FADE_CYCLE_SECONDS / 2);
    expect(Number(ghost.label.style.opacity)).toBeGreaterThan(0.9);
  });

  it('can still be typed while it is gone', () => {
    const ghost = spawnGhost();
    haunt(ghost, FADE_CYCLE_SECONDS / 2);
    const word = ghost.word;
    ghost.advance();
    expect(ghost.expectedChar).toBe(word[1]);
  });

  it('drifts sideways while it walks in', () => {
    const ghost = spawnGhost();
    const start = heading(ghost);
    const distance = ghost.distanceToCenter;
    haunt(ghost, 1);
    expect(ghost.distanceToCenter).toBeLessThan(distance);
    expect(Math.abs(heading(ghost) - start)).toBeGreaterThan(0.02);
  });
});
