import { i18n } from '../i18n/i18n';
import { el } from './dom';

export function pauseOverlay(): HTMLElement {
  const t = i18n.t;
  return el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center' },
      el('h2', { text: t.paused }),
      el('p', { text: t.resumeHint }),
    ),
  );
}
