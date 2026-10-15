import { i18n } from '../i18n/i18n';
import { readStorage, writeStorage } from '../storage';
import { el } from './dom';
import './rotateHint.css';

export const ROTATE_HINT_KEY = 'literkowo.rotateHintDismissed';
const DISMISSED = 'true';
const CLOSE_MARK = '✕';

export function rotateHint(): HTMLElement | undefined {
  if (readStorage(ROTATE_HINT_KEY) === DISMISSED) return undefined;
  const t = i18n.t.features.touch;
  const hint = el(
    'button',
    { class: 'rotate-hint', type: 'button', title: t.closeHint },
    el('span', { text: t.rotateHint }),
    el('span', { class: 'rotate-hint-close', 'aria-hidden': 'true', text: CLOSE_MARK }),
  );
  hint.addEventListener('click', () => {
    writeStorage(ROTATE_HINT_KEY, DISMISSED);
    hint.remove();
  });
  return hint;
}
