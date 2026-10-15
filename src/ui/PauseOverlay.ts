import type { KeyStats } from '../course/keyStats';
import { formatParts } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';
import { keyHeatmap } from './KeyHeatmap';
import { createOverlay, onShortcutKeys, type Overlay } from './overlay';
import { settingsTextButton } from './settingsParts';
import { ESCAPE_LABEL, primaryHint } from './shortcutHint';

export function pauseOverlay(
  onResume: () => void,
  keyStats: KeyStats,
  onSettings: () => void,
): Overlay {
  const t = i18n.t;
  const escapeKey = el('kbd', { class: 'kbd', text: ESCAPE_LABEL });
  const resume = el(
    'button',
    { class: 'button button-primary button-large', type: 'button', onClick: onResume },
    `▶ ${t.features.touch.resume}`,
    primaryHint(),
  );
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
        el('div', { class: 'actions' }, resume, settingsTextButton(onSettings)),
        keyHeatmap(keyStats),
      ),
    ),
    onShortcutKeys(resume, { Enter: onResume }),
  );
}
