import { Rng } from '../../game/environment/random';

export const LETTER_GLOWS = ['amber', 'cream', 'violet'] as const;
export type LetterGlow = (typeof LETTER_GLOWS)[number];

export interface LetterParticle {
  readonly char: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly driftX: number;
  readonly driftY: number;
  readonly driftSeconds: number;
  readonly twinkleSeconds: number;
  readonly delaySeconds: number;
  readonly glow: LetterGlow;
}

const ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';
const FIELD_SEED = 20_241;
const PERCENT = 100;
const EDGE = 3;
const SIZE_REM = { min: 0.9, max: 2.3 } as const;
const DRIFT_X_PX = 46;
const DRIFT_Y_PX = { min: 40, max: 120 } as const;
const DRIFT_SECONDS = { min: 14, max: 26 } as const;
const TWINKLE_SECONDS = { min: 3, max: 7 } as const;

export function letterField(count: number, seed = FIELD_SEED): LetterParticle[] {
  const rng = new Rng(seed);
  return Array.from({ length: count }, () => ({
    char: rng.pick([...ALPHABET]),
    x: rng.range(EDGE, PERCENT - EDGE),
    y: rng.range(EDGE, PERCENT - EDGE),
    size: rng.range(SIZE_REM.min, SIZE_REM.max),
    driftX: rng.range(-DRIFT_X_PX, DRIFT_X_PX),
    driftY: -rng.range(DRIFT_Y_PX.min, DRIFT_Y_PX.max),
    driftSeconds: rng.range(DRIFT_SECONDS.min, DRIFT_SECONDS.max),
    twinkleSeconds: rng.range(TWINKLE_SECONDS.min, TWINKLE_SECONDS.max),
    delaySeconds: -rng.range(0, DRIFT_SECONDS.max),
    glow: rng.pick(LETTER_GLOWS),
  }));
}
