import { formatParts } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';
import { createOverlay, type Overlay } from './overlay';

const ESCAPE_LABEL = 'Esc';

export function pauseOverlay(): Overlay {
  const t = i18n.t;
  const escapeKey = el('kbd', { class: 'kbd', text: ESCAPE_LABEL });
  return createOverlay(
    el(
      'div',
      { class: 'overlay' },
      el(
        'div',
        { class: 'panel panel-center pause-panel' },
        el('span', { class: 'pause-badge' }, icon('pause', 'pause-icon')),
        el('h2', { class: 'pause-title', text: t.paused }),
        el('p', { class: 'pause-hint' }, ...formatParts(t.resumeHint, { key: escapeKey })),
      ),
    ),
  );
}
