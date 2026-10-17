import { i18n } from '../i18n/i18n';
import { readStorage, writeStorage } from '../storage';
import { usesBuiltInKeyboard } from './formFactor';
import { hintPill } from './hintPill';
import './rotateHint.css';

export const ROTATE_HINT_KEY = 'literkowo.rotateHintSeen';
export const ROTATE_HINT_LIFETIME_MS = 8000;
const SEEN = 'true';
const PORTRAIT_QUERY = '(orientation: portrait)';
const ROTATE_HINT_CLASS = 'rotate-hint';
const CHANGE_EVENT = 'change';

export function rotateHint(): HTMLElement | undefined {
  if (!shouldShow()) return undefined;
  writeStorage(ROTATE_HINT_KEY, SEEN);
  const portrait = window.matchMedia(PORTRAIT_QUERY);
  const t = i18n.t.features.touch;
  const hint = hintPill({
    text: t.rotateHint,
    closeLabel: t.closeHint,
    className: ROTATE_HINT_CLASS,
    lifetimeMs: ROTATE_HINT_LIFETIME_MS,
    onHide: () => portrait.removeEventListener(CHANGE_EVENT, hint.hide),
  });
  portrait.addEventListener(CHANGE_EVENT, hint.hide);
  return hint.element;
}

function shouldShow(): boolean {
  if (readStorage(ROTATE_HINT_KEY) === SEEN) return false;
  return usesBuiltInKeyboard() && window.matchMedia(PORTRAIT_QUERY).matches;
}
