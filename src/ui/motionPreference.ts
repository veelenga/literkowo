import { readChoice, writeStorage } from '../storage';
import './reducedMotion.css';

export const REDUCED_MOTION_KEY = 'literkowo.reducedMotion';
export const REDUCED_MOTION_CHOICES = ['auto', 'always'] as const;
export type ReducedMotionChoice = (typeof REDUCED_MOTION_CHOICES)[number];

const DEFAULT_REDUCED_MOTION: ReducedMotionChoice = 'auto';
const SYSTEM_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FORCED_ATTRIBUTE = 'data-reduced-motion';

export function readReducedMotion(): ReducedMotionChoice {
  return readChoice(REDUCED_MOTION_KEY, REDUCED_MOTION_CHOICES, DEFAULT_REDUCED_MOTION);
}

export function saveReducedMotion(choice: ReducedMotionChoice): void {
  writeStorage(REDUCED_MOTION_KEY, choice);
  applyReducedMotion();
}

export function applyReducedMotion(): void {
  document.documentElement.toggleAttribute(FORCED_ATTRIBUTE, isReducedMotionForced());
}

export function prefersReducedMotion(): boolean {
  return isReducedMotionForced() || window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY).matches;
}

function isReducedMotionForced(): boolean {
  return readReducedMotion() === 'always';
}
