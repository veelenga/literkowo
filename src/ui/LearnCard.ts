import { fingerFor, needsRightAlt } from '../course/fingers';
import type { Level } from '../course/regions';
import { i18n } from '../i18n/i18n';
import { el } from './dom';
import { handsDiagram } from './HandsDiagram';

export function learnCard(level: Level, onStart: () => void): HTMLElement {
  const t = i18n.t;
  const keys = [...level.newKeys];
  const overlay = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel' },
      el('p', { class: 'muted', text: t.newKeys }),
      el('div', { class: 'big-keys' }, ...keys.map(bigKey)),
      handsDiagram(level.newKeys),
      el('p', { class: 'learn-fingers' }, ...keys.map(fingerLine)),
      el('p', { class: 'muted learn-hint', text: t.placeFingers }),
      el(
        'div',
        { class: 'actions' },
        el('button', {
          class: 'button button-primary button-large',
          text: `${t.letsGo} ⏎`,
          onClick: () => finish(),
        }),
      ),
    ),
  );

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    finish();
  };

  const finish = () => {
    window.removeEventListener('keydown', onKey);
    overlay.remove();
    onStart();
  };

  window.addEventListener('keydown', onKey);
  return overlay;
}

function bigKey(char: string): HTMLElement {
  const t = i18n.t;
  const finger = fingerFor(char);
  const color = finger ? `var(--finger-${finger})` : 'var(--muted)';
  return el(
    'div',
    { class: 'big-key', style: `--finger: ${color}` },
    needsRightAlt(char) ? el('small', { text: t.rightAlt + ' +' }) : null,
    el('span', { text: char.toUpperCase() }),
  );
}

function fingerLine(char: string): HTMLElement {
  const t = i18n.t;
  const finger = fingerFor(char);
  const name = finger ? t.fingers[finger] : '';
  return el('span', { class: 'finger-line' }, el('b', { text: char.toUpperCase() }), ` · ${name}`);
}
