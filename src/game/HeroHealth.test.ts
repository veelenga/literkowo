import { describe, expect, it } from 'vitest';
import { HeroHealth } from './HeroHealth';

const LIVES = 3;

function lifeHealth(lives = LIVES): HeroHealth {
  return new HeroHealth({ lives, hitCost: 'life' });
}

function comboHealth(lives = LIVES): HeroHealth {
  return new HeroHealth({ lives, hitCost: 'combo' });
}

describe('HeroHealth', () => {
  it('starts with every life of the plan and no shields or guards', () => {
    const health = lifeHealth();
    expect(health.lives).toBe(LIVES);
    expect(health.shields).toBe(0);
    expect(health.guards).toBe(0);
    expect(health.isLost).toBe(false);
  });

  it('costs one life for a hit without shields or guards', () => {
    const health = lifeHealth();
    expect(health.hit()).toBe('lifeLost');
    expect(health.lives).toBe(LIVES - 1);
    expect(health.isLost).toBe(false);
  });

  it('is lost once the last life is gone', () => {
    const health = lifeHealth();
    for (let hit = 0; hit < LIVES; hit += 1) health.hit();
    expect(health.lives).toBe(0);
    expect(health.isLost).toBe(true);
  });

  it('loses the run on the first hit of a one heart plan', () => {
    const health = lifeHealth(1);
    expect(health.hit()).toBe('lifeLost');
    expect(health.isLost).toBe(true);
  });

  it('lets a shield cancel one hit', () => {
    const health = lifeHealth();
    health.addShield();
    expect(health.hit()).toBe('shielded');
    expect(health.lives).toBe(LIVES);
    expect(health.shields).toBe(0);
    expect(health.hit()).toBe('lifeLost');
  });

  it('lets a guard keep the heart of one hit', () => {
    const health = lifeHealth();
    health.addGuard();
    expect(health.hit()).toBe('guarded');
    expect(health.lives).toBe(LIVES);
    expect(health.guards).toBe(0);
  });

  it('uses guards before shields', () => {
    const health = lifeHealth();
    health.addShield();
    health.addGuard();
    expect(health.hit()).toBe('guarded');
    expect(health.shields).toBe(1);
    expect(health.hit()).toBe('shielded');
    expect(health.hit()).toBe('lifeLost');
  });

  it('only breaks the combo when a hit costs the combo', () => {
    const health = comboHealth(1);
    health.addShield();
    health.addGuard();
    expect(health.hit()).toBe('comboBroken');
    expect(health.hit()).toBe('comboBroken');
    expect(health.lives).toBe(1);
    expect(health.shields).toBe(1);
    expect(health.guards).toBe(1);
    expect(health.isLost).toBe(false);
  });

  it('gives back a lost life', () => {
    const health = lifeHealth();
    health.hit();
    expect(health.restoreLife()).toBe(true);
    expect(health.lives).toBe(LIVES);
  });

  it('never restores past the lives of the plan', () => {
    const health = lifeHealth();
    expect(health.restoreLife()).toBe(false);
    expect(health.lives).toBe(LIVES);
  });
});
