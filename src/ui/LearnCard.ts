import { fingerFor, needsRightAlt } from '../course/fingers';
import type { KeyStat, KeyStats } from '../course/keyStats';
import type { Level } from '../course/catalog';
import { i18n } from '../i18n/i18n';
import { closeButton } from './closeButton';
import { el, fingerColor } from './dom';
import { handsDiagram } from './HandsDiagram';
import { levelKindLabel } from './levelKind';
import { keyStatus } from './mastery';
import { CLOSE_KEY, createOverlay, onCardKeys, PRIMARY_KEY, type Overlay } from './overlay';
import { primaryButton } from './shortcutHint';

const KEY_STAGGER_MS = 90;
const ALT_LABEL = 'Alt';

export interface LearnCardActions {
  readonly onStart: () => void;
  readonly onClose: () => void;
}

export function learnCard(level: Level, keyStats: KeyStats, actions: LearnCardActions): Overlay {
  const t = i18n.t;
  const { onStart, onClose } = actions;
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel' },
      closeButton(t.features.course.backToMap, onClose),
      el('span', { class: 'eyebrow', text: levelKindLabel(level) }),
      el(
        'div',
        { class: 'keycaps' },
        ...[...level.focusKeys].map((char, index) => keycap(char, index, keyStats[char])),
      ),
      ...guidance(level),
      el('div', { class: 'actions' }, primaryButton(t.letsGo, onStart)),
    ),
  );
  const keyActions = new Map([
    [PRIMARY_KEY, onStart],
    [CLOSE_KEY, onClose],
  ]);
  return createOverlay(element, onCardKeys(keyActions));
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
