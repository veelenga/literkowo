import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';

const ESCAPE_LABEL = 'Esc';

export function pauseOverlay(): HTMLElement {
  const t = i18n.t;
  return el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center pause-panel' },
      el('span', { class: 'pause-badge' }, icon('pause', 'pause-icon')),
      el('h2', { class: 'pause-title', text: t.paused }),
      el('p', { class: 'pause-hint' }, ...withKeycap(t.resumeHint, ESCAPE_LABEL)),
    ),
  );
}

function withKeycap(text: string, key: string): Array<string | HTMLElement> {
  const [before, ...after] = text.split(key);
  if (after.length === 0) return [text];
  return [before, el('kbd', { class: 'kbd', text: key }), after.join(key)];
}
