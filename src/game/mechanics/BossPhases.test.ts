// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemeId } from '../../course/regions';
import { SHORT_LENGTH } from '../../course/WordSource';
import { levelWords, requireLevel } from '../../testing/levels';
import { fakeMechanicContext } from '../../testing/mechanicContext';
import { Boss } from '../Boss';
import { Enemy } from '../Enemy';
import type { Phase } from '../LevelPlan';
import { themeFor } from '../themes';
import { FIRST_STRIKE, STRIKE_INTERVAL, TELEGRAPH_LEAD } from './bossPhases/AttackSchedule';
import { RAGE_SPEED } from './bossPhases/BossFight';
import { DARKNESS_CLASS, DARKNESS_SECONDS } from './bossPhases/Darkness';
import { QUAKE_SHAKE } from './bossPhases/Earthquake';
import { FOG_SECONDS } from './bossPhases/Fog';
import { MAX_MINIONS, MINION_INTERVAL, MINION_TAG } from './bossPhases/Minions';
import { SLOW_MOTION, STUN_SECONDS } from './bossPhases/WeakPoint';
import { BossPhases } from './BossPhases';
import type { MechanicContext } from './Mechanic';

const STEP = 0.25;
const HITS = 8;
const SPEED = 0.4;
const ARMOUR_HITS = 2;
const WEAK_POINT_HITS = 3;
const MASK = '•';
const TELEGRAPH = 'Mrok szykuje atak';
const BOSS_LEVELS: Record<ThemeId, string> = {
  meadow: 'polana-19',
  forest: 'las-16',
  mountains: 'gory-16',
  cave: 'jaskinia-24',
  island: 'wyspa-24',
};

function label(): HTMLElement {
  return document.createElement('div');
}

function setup(themeId: ThemeId = 'forest') {
  const theme = themeFor(themeId);
  const words = levelWords(requireLevel(BOSS_LEVELS[themeId]), 'pl');
  const look = { shape: theme.enemyShape, colors: theme.enemyColors };
  const boss = new Boss(label(), SPEED, look, () => words.bossWord(), HITS);
  const enemies: Enemy[] = [boss];
  const addEnemy = (word: string, x = 0, z = 0) => {
    const enemy = new Enemy(word, label(), SPEED, look);
    enemy.object.position.set(x, 0, z);
    enemies.push(enemy);
    return enemy;
  };
  const announce = vi.fn<MechanicContext['announce']>();
  const setTimeScale = vi.fn<MechanicContext['setTimeScale']>();
  const shakeCamera = vi.fn<MechanicContext['shakeCamera']>();
  const burst = vi.fn<MechanicContext['particles']['burst']>();
  const spawnWord = vi.fn<MechanicContext['spawnWord']>((word = words.next()) => addEnemy(word));
  const phase: Phase = { kind: 'boss', count: HITS, speed: SPEED, spawnInterval: 0 };
  const context = fakeMechanicContext({
    enemies,
    theme,
    words,
    phase,
    announce,
    setTimeScale,
    shakeCamera,
    spawnWord,
    particles: { burst },
  });
  const mechanic = new BossPhases(context);
  mechanic.update(0);
  const run = (seconds: number) => {
    for (let step = 0; step < Math.round(seconds / STEP); step += 1) mechanic.update(STEP);
  };
  const hit = (times = 1) => {
    for (let index = 0; index < times; index += 1) {
      mechanic.onWordComplete(boss);
      boss.takeHit();
      mechanic.update(0);
    }
  };
  const texts = (style: string) =>
    announce.mock.calls.filter(([, kind]) => kind === style).map(([text]) => text);
  return {
    boss,
    enemies,
    words,
    context,
    mechanic,
    setTimeScale,
    shakeCamera,
    burst,
    spawnWord,
    addEnemy,
    run,
    hit,
    texts,
  };
}

function rest(enemy: Enemy): string | null | undefined {
  return enemy.label.querySelector('.rest')?.textContent;
}

function masked(word: string): string {
  return word[0] + MASK.repeat(word.length - 1);
}

function isDark(): boolean {
  return document.body.classList.contains(DARKNESS_CLASS);
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  document.body.className = '';
  vi.restoreAllMocks();
});

describe('BossPhases phases', () => {
  it('announces each phase once, on the first hit taken in it', () => {
    const { hit, texts } = setup('meadow');
    expect(texts('banner')).toEqual([]);
    hit(ARMOUR_HITS);
    expect(texts('banner')).toEqual(['Pancerz pęka!']);
    hit(WEAK_POINT_HITS);
    expect(texts('banner')).toEqual(['Pancerz pęka!', 'Słaby punkt!']);
    hit();
    expect(texts('banner')).toEqual(['Pancerz pęka!', 'Słaby punkt!', 'Furia!']);
  });

  it('keeps armour hits plain', () => {
    const { boss, words, setTimeScale, hit } = setup('meadow');
    const shortWord = vi.spyOn(words, 'shortWord');
    hit(ARMOUR_HITS);
    expect(setTimeScale).not.toHaveBeenCalled();
    expect(shortWord).not.toHaveBeenCalled();
    expect(boss.isFrozen).toBe(false);
  });

  it('stuns the boss in slow motion with a short word after weak point hits', () => {
    const { boss, setTimeScale, hit, run } = setup('meadow');
    hit(ARMOUR_HITS + 1);
    expect(boss.isFrozen).toBe(true);
    expect(setTimeScale).toHaveBeenLastCalledWith(SLOW_MOTION);
    expect(boss.word.length).toBeGreaterThanOrEqual(SHORT_LENGTH[0]);
    expect(boss.word.length).toBeLessThanOrEqual(SHORT_LENGTH[1]);
    run(STUN_SECONDS - STEP);
    expect(setTimeScale).toHaveBeenLastCalledWith(SLOW_MOTION);
    run(STEP);
    expect(setTimeScale).toHaveBeenLastCalledWith(1);
  });

  it('speeds the boss up in rage and keeps at most two minions', () => {
    const { boss, enemies, spawnWord, hit, run } = setup('meadow');
    const setSpeedScale = vi.spyOn(boss, 'setSpeedScale');
    hit(ARMOUR_HITS + WEAK_POINT_HITS + 1);
    expect(setSpeedScale).toHaveBeenCalledWith(RAGE_SPEED);
    run(STEP);
    expect(spawnWord).toHaveBeenCalledOnce();
    run(MINION_INTERVAL);
    expect(spawnWord).toHaveBeenCalledTimes(MAX_MINIONS);
    run(MINION_INTERVAL);
    expect(spawnWord).toHaveBeenCalledTimes(MAX_MINIONS);
    enemies.splice(1, 1);
    run(MINION_INTERVAL);
    expect(spawnWord).toHaveBeenCalledTimes(MAX_MINIONS + 1);
    const minions = enemies.filter((enemy) => enemy !== boss);
    expect(minions.every((enemy) => enemy.tags.has(MINION_TAG))).toBe(true);
  });

  it('restores time and light when the boss leaves', () => {
    const { enemies, setTimeScale, hit, run } = setup('forest');
    run(FIRST_STRIKE);
    hit(ARMOUR_HITS + 1);
    expect(isDark()).toBe(true);
    enemies.length = 0;
    run(STEP);
    expect(setTimeScale).toHaveBeenLastCalledWith(1);
    expect(isDark()).toBe(false);
  });
});

describe('BossPhases signature attacks', () => {
  it('telegraphs the attack before it strikes', () => {
    const { texts, run } = setup('forest');
    run(FIRST_STRIKE - TELEGRAPH_LEAD - STEP);
    expect(texts('warning')).toEqual([]);
    run(STEP);
    expect(texts('warning')).toEqual([TELEGRAPH]);
    expect(isDark()).toBe(false);
    run(TELEGRAPH_LEAD);
    expect(isDark()).toBe(true);
    run(STRIKE_INTERVAL - TELEGRAPH_LEAD - STEP);
    expect(texts('warning')).toHaveLength(1);
    run(STEP);
    expect(texts('warning')).toHaveLength(2);
  });

  it('darkness hides the keyboard for a while', () => {
    const { run } = setup('forest');
    run(FIRST_STRIKE);
    expect(isDark()).toBe(true);
    run(DARKNESS_SECONDS - STEP);
    expect(isDark()).toBe(true);
    run(STEP);
    expect(isDark()).toBe(false);
  });

  it('fog masks every label, also new ones, then clears', () => {
    const { boss, mechanic, spawnWord, run } = setup('mountains');
    run(FIRST_STRIKE);
    expect(rest(boss)).toBe(masked(boss.word));
    const newcomer = spawnWord('kot');
    mechanic.onSpawn(newcomer);
    expect(rest(newcomer)).toBe(masked('kot'));
    run(FOG_SECONDS);
    expect(rest(boss)).toBe(boss.word);
    expect(rest(newcomer)).toBe('kot');
  });

  it('earthquake shakes and scrambles enemies at the same distance', () => {
    const { boss, shakeCamera, burst, addEnemy, run } = setup('cave');
    const near = addEnemy('kot', 3, -4);
    const far = addEnemy('pies', -6, -8);
    const bossPosition = boss.object.position.clone();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    run(FIRST_STRIKE);
    expect(shakeCamera).toHaveBeenCalledWith(QUAKE_SHAKE.strength, QUAKE_SHAKE.seconds);
    for (const [enemy, distance] of [
      [near, 5],
      [far, 10],
    ] as const) {
      expect(enemy.distanceToCenter).toBeCloseTo(distance);
      expect(enemy.object.position.x).toBeLessThan(0);
      expect(enemy.object.position.z).toBeGreaterThan(0);
    }
    expect(boss.object.position.equals(bossPosition)).toBe(true);
    expect(burst).toHaveBeenCalled();
  });

  it('the island boss rotates through every attack', () => {
    const { boss, shakeCamera, run } = setup('island');
    run(FIRST_STRIKE);
    expect(isDark()).toBe(true);
    run(STRIKE_INTERVAL);
    expect(isDark()).toBe(false);
    expect(rest(boss)).toBe(masked(boss.word));
    expect(shakeCamera).not.toHaveBeenCalled();
    run(STRIKE_INTERVAL);
    expect(shakeCamera).toHaveBeenCalledOnce();
  });

  it('the meadow boss stays gentle', () => {
    const { shakeCamera, texts, run } = setup('meadow');
    run(FIRST_STRIKE + STRIKE_INTERVAL * 2);
    expect(texts('warning')).toEqual([]);
    expect(shakeCamera).not.toHaveBeenCalled();
    expect(isDark()).toBe(false);
  });
});
