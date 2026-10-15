import { fingerFor, needsRightAlt } from '../course/fingers';
import type { KeyStat, KeyStats } from '../course/keyStats';
import type { Level } from '../course/regions';
import { i18n } from '../i18n/i18n';
import { el, fingerColor } from './dom';
import { handsDiagram } from './HandsDiagram';
import { levelKindLabel } from './levelKind';
import { keyStatus } from './mastery';
import { createOverlay, onWindowKey, type Overlay } from './overlay';

const KEY_STAGGER_MS = 90;
const ALT_LABEL = 'Alt';
const START_KEY = 'Enter';

export function learnCard(level: Level, keyStats: KeyStats, onStart: () => void): Overlay {
  const t = i18n.t;
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel' },
      el('span', { class: 'eyebrow', text: levelKindLabel(level) }),
      el(
        'div',
        { class: 'keycaps' },
        ...[...level.focusKeys].map((char, index) => keycap(char, index, keyStats[char])),
      ),
      ...guidance(level),
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

function guidance(level: Level): Element[] {
  if (level.kind === 'learn') return [handsDiagram(level.newKeys), hint(i18n.t.placeFingers)];
  if (level.kind === 'boss') return [];
  return [hint(i18n.t.features.course.hints[level.kind])];
}

function hint(text: string): HTMLElement {
  return el('p', { class: 'learn-hint', text });
}

function keycap(char: string, index: number, stat: KeyStat | undefined): HTMLElement {
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
    keyStatus(char, stat),
  );
}

function fingerCaption(char: string): string {
  const t = i18n.t;
  const finger = fingerFor(char);
  const name = finger ? t.fingers[finger] : '';
  return needsRightAlt(char) ? `${t.rightAlt} + ${name}` : name;
}
