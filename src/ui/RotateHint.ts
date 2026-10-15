import { i18n } from '../i18n/i18n';
import { readStorage, writeStorage } from '../storage';
import { el } from './dom';
import { usesBuiltInKeyboard } from './formFactor';
import './rotateHint.css';

export const ROTATE_HINT_KEY = 'literkowo.rotateHintSeen';
export const ROTATE_HINT_LIFETIME_MS = 8000;
export const ROTATE_HINT_LEAVE_MS = 300;
const SEEN = 'true';
const CLOSE_MARK = '✕';
const PORTRAIT_QUERY = '(orientation: portrait)';
const LEAVING_CLASS = 'is-leaving';

export function rotateHint(): HTMLElement | undefined {
  if (!shouldShow()) return undefined;
  writeStorage(ROTATE_HINT_KEY, SEEN);
  const portrait = window.matchMedia(PORTRAIT_QUERY);
  const hint = hintButton(() => hide());
  let timer = window.setTimeout(leave, ROTATE_HINT_LIFETIME_MS);

  function leave(): void {
    hint.classList.add(LEAVING_CLASS);
    timer = window.setTimeout(hide, ROTATE_HINT_LEAVE_MS);
  }

  function hide(): void {
    window.clearTimeout(timer);
    portrait.removeEventListener('change', hide);
    hint.remove();
  }

  portrait.addEventListener('change', hide);
  return hint;
}

function shouldShow(): boolean {
  if (readStorage(ROTATE_HINT_KEY) === SEEN) return false;
  return usesBuiltInKeyboard() && window.matchMedia(PORTRAIT_QUERY).matches;
}

function hintButton(onClick: () => void): HTMLElement {
  const t = i18n.t.features.touch;
  return el(
    'button',
    { class: 'rotate-hint', type: 'button', title: t.closeHint, onClick },
    el('span', { text: t.rotateHint }),
    el('span', { class: 'rotate-hint-close', 'aria-hidden': 'true', text: CLOSE_MARK }),
  );
}
