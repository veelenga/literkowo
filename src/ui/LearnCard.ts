import { fingerFor, needsRightAlt } from '../course/fingers';
import type { Level } from '../course/regions';
import { i18n } from '../i18n/i18n';
import { el, fingerColor } from './dom';
import { handsDiagram } from './HandsDiagram';
import { createOverlay, onWindowKey, type Overlay } from './overlay';

const KEY_STAGGER_MS = 90;
const ALT_LABEL = 'Alt';
const START_KEY = 'Enter';

export function learnCard(level: Level, onStart: () => void): Overlay {
  const t = i18n.t;
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel' },
      el('span', { class: 'eyebrow', text: t.newKeys }),
      el('div', { class: 'keycaps' }, ...[...level.newKeys].map(keycap)),
      handsDiagram(level.newKeys),
      el('p', { class: 'learn-hint', text: t.placeFingers }),
      el(
        'div',
        { class: 'actions' },
        el(
          'button',
          { class: 'button button-primary button-large', onClick: onStart },
          t.letsGo,
          el('kbd', { class: 'kbd kbd-on-primary', text: '⏎' }),
        ),
      ),
    ),
  );
  const stopListening = onWindowKey((event) => {
    if (event.key !== START_KEY) return;
    event.preventDefault();
    onStart();
  });
  return createOverlay(element, stopListening);
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
