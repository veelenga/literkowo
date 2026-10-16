import { baseKey, fingerFor, needsRightAlt } from '../../course/fingers';
import { i18n } from '../../i18n/i18n';
import { closeButton } from '../closeButton';
import { el, fingerColor } from '../dom';
import { handsDiagram } from '../HandsDiagram';
import { KEY_ROWS, type KeyRow } from '../keyboardLayout';
import { createOverlay, type Overlay } from '../overlay';
import { startButton, startOrCloseKeys, type CardActions } from './placementParts';

export function fingersCard(skippedKeys: string, actions: CardActions): Overlay {
  const copy = i18n.t.features.placement;
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel fingers-panel' },
      closeButton(copy.close, actions.onClose),
      el('span', { class: 'eyebrow', text: copy.fingersTitle }),
      fingerKeyboard(skippedKeys),
      handsDiagram(skippedKeys),
      el('p', { class: 'learn-hint', text: copy.fingersHint }),
      el('div', { class: 'actions' }, startButton(actions.onStart)),
    ),
  );
  return createOverlay(element, startOrCloseKeys(actions));
}

function fingerKeyboard(keys: string): HTMLElement {
  return el(
    'div',
    { class: 'finger-keys', 'aria-label': [...keys].join(' ') },
    ...KEY_ROWS.map((row) => keyRow(row, keys)),
  );
}

function keyRow({ keys: rowKeys, offset }: KeyRow, skipped: string): HTMLElement {
  return el(
    'div',
    { class: 'key-row', style: `--offset: ${offset}` },
    ...rowKeys.map((key) => fingerKey(key, skipped)),
  );
}

function fingerKey(key: string, skipped: string): HTMLElement {
  const polish = [...skipped].filter((char) => needsRightAlt(char) && baseKey(char) === key);
  const lit = skipped.includes(key) || polish.length > 0;
  return el(
    'span',
    {
      class: lit ? 'key finger-key is-lit' : 'key finger-key',
      style: `--finger: ${fingerColor(fingerFor(key))}`,
    },
    key.toUpperCase(),
    polish.length ? el('span', { class: 'finger-key-alt', text: polish.join('') }) : null,
  );
}
