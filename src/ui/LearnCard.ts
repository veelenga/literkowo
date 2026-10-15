import { fingerFor, needsRightAlt } from '../course/fingers';
import type { Level } from '../course/regions';
import { i18n } from '../i18n/i18n';
import { el, fingerColor } from './dom';
import { handsDiagram } from './HandsDiagram';

const KEY_STAGGER_MS = 90;
const ALT_LABEL = 'Alt';

export function learnCard(level: Level, onStart: () => void): HTMLElement {
  const t = i18n.t;
  const keys = [...level.newKeys];
  const overlay = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel' },
      el('span', { class: 'eyebrow', text: t.newKeys }),
      el('div', { class: 'keycaps' }, ...keys.map(keycap)),
      handsDiagram(level.newKeys),
      el('p', { class: 'learn-hint', text: t.placeFingers }),
      el(
        'div',
        { class: 'actions' },
        el(
          'button',
          { class: 'button button-primary button-large', onClick: () => finish() },
          t.letsGo,
          el('kbd', { class: 'kbd kbd-on-primary', text: '⏎' }),
        ),
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

function keycap(char: string, index: number): HTMLElement {
  return el(
    'div',
    {
      class: 'keycap-column',
      style: `--finger: ${fingerColor(fingerFor(char))}; --delay: ${index * KEY_STAGGER_MS}ms`,
    },
    el(
      'div',
      { class: 'keycap' },
      needsRightAlt(char) ? el('span', { class: 'keycap-mod', text: ALT_LABEL }) : null,
      el('span', { class: 'keycap-letter', text: char.toUpperCase() }),
    ),
    el('span', { class: 'keycap-caption', text: fingerCaption(char) }),
  );
}

function fingerCaption(char: string): string {
  const t = i18n.t;
  const finger = fingerFor(char);
  const name = finger ? t.fingers[finger] : '';
  return needsRightAlt(char) ? `${t.rightAlt} + ${name}` : name;
}
