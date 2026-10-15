import * as THREE from 'three';
import { Sfx } from '../audio/Sfx';
import { WordSource } from '../course/WordSource';
import type { Phase } from '../game/LevelPlan';
import type { MechanicContext } from '../game/mechanics/Mechanic';
import { SessionStats } from '../game/SessionStats';
import { themeFor } from '../game/themes';
import { requireLevel } from './levels';

const FAKE_LEVEL = 'polana-1';
const FAKE_PHASE: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2 };

function unavailable(name: string): () => never {
  return () => {
    throw new Error(`${name} needs a real game, pass a fake in the overrides`);
  };
}

function noop(): void {}

export function fakeMechanicContext(overrides: Partial<MechanicContext> = {}): MechanicContext {
  return {
    enemies: [],
    player: { object: new THREE.Group(), jump: noop, hurt: noop },
    scene: new THREE.Scene(),
    particles: { burst: noop },
    stats: new SessionStats(),
    phase: FAKE_PHASE,
    playing: true,
    shields: 0,
    theme: themeFor('meadow'),
    sfx: new Sfx(),
    words: new WordSource(requireLevel(FAKE_LEVEL), 'pl'),
    createLabel: unavailable('createLabel'),
    addEnemy: noop,
    removeEnemy: noop,
    spawnWord: unavailable('spawnWord'),
    setTimeScale: noop,
    shakeCamera: noop,
    announce: noop,
    loseLife: noop,
    absorbNextHit: noop,
    ...overrides,
  };
}
