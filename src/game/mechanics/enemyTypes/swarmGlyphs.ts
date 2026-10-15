import type { LabelMode } from '../../Enemy';

export interface GlyphSpot {
  readonly x: number;
  readonly y: number;
}

const GLYPH_CLASS = 'swarm-glyph';
export const DONE_CLASS = 'is-done';
export const NEXT_CLASS = 'is-next';

const SPREAD = { x: 2.3, y: 1.15 };
const ANGLE_JITTER = 0.35;
const FULL_TURN = Math.PI * 2;
const MASK_CHAR = '•';
const UNIT = 'em';

export function scatterGlyphs(count: number, random: () => number = Math.random): GlyphSpot[] {
  const angles = Array.from(
    { length: count },
    (_, index) => (index / count) * FULL_TURN + (random() - 0.5) * ANGLE_JITTER,
  );
  return shuffle(angles, random).map((angle) => ({
    x: Math.cos(angle) * SPREAD.x,
    y: Math.sin(angle) * SPREAD.y,
  }));
}

export function glyphMarkup(
  word: string,
  popped: number,
  spots: readonly GlyphSpot[],
  mode: LabelMode,
): string {
  return [...word]
    .map((char, index) => {
      const shown = mode === 'firstLetter' && index > popped ? MASK_CHAR : char;
      const spot = spots[index];
      const style = `--glyph-x: ${spot.x.toFixed(2)}${UNIT}; --glyph-y: ${spot.y.toFixed(2)}${UNIT}`;
      return `<span class="${glyphClasses(index, popped)}" style="${style}">${shown}</span>`;
    })
    .join('');
}

function glyphClasses(index: number, popped: number): string {
  if (index < popped) return `${GLYPH_CLASS} ${DONE_CLASS}`;
  if (index === popped) return `${GLYPH_CLASS} ${NEXT_CLASS}`;
  return GLYPH_CLASS;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}
