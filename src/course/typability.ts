import { fingerFor, type Finger } from './fingers';

export const TRANSITION_SCORES = {
  alternation: 1,
  double: 0.8,
  sameHand: 0.5,
  sameFinger: 0,
} as const;

type Hand = 'left' | 'right';

const LEFT_HAND = 'left';
const RIGHT_HAND = 'right';
const PERFECT = TRANSITION_SCORES.alternation;

export function typability(text: string, focusKeys = ''): number {
  const pairs = transitions(text);
  const focused = pairs.filter(([from, to]) => focusKeys.includes(from) || focusKeys.includes(to));
  const scored = focused.length > 0 ? focused : pairs;
  if (scored.length === 0) return PERFECT;
  const total = scored.reduce((sum, [from, to]) => sum + transitionScore(from, to), 0);
  return total / scored.length;
}

export function transitionScore(from: string, to: string): number {
  if (from === to) return TRANSITION_SCORES.double;
  const first = fingerFor(from);
  const second = fingerFor(to);
  if (!first || !second) return TRANSITION_SCORES.alternation;
  if (first === second) return TRANSITION_SCORES.sameFinger;
  const hand = handOf(first);
  return hand && hand === handOf(second)
    ? TRANSITION_SCORES.sameHand
    : TRANSITION_SCORES.alternation;
}

function transitions(text: string): [string, string][] {
  const chars = [...text];
  return chars.slice(1).map((char, index) => [chars[index], char]);
}

function handOf(finger: Finger): Hand | undefined {
  if (finger.startsWith(LEFT_HAND)) return LEFT_HAND;
  if (finger.startsWith(RIGHT_HAND)) return RIGHT_HAND;
  return undefined;
}
