import type { Region } from '../../course/catalog';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { el } from '../dom';
import { KEY_READY_MS, onWindowKeyAfter } from '../overlay';
import { primaryHint } from '../shortcutHint';
import '../placement.css';

export const START_KEY = 'Enter';
export const CLOSE_KEY = 'Escape';

export interface CardActions {
  readonly onStart: () => void;
  readonly onClose: () => void;
}

export function stageChips(regions: readonly Region[], passed?: number): HTMLElement {
  const copy = i18n.t.features.placement;
  const label =
    passed === undefined
      ? copy.title
      : format(copy.stagesPassed, { passed, count: regions.length });
  return el(
    'div',
    { class: 'stage-chips', role: 'list', 'aria-label': label },
    ...regions.map((region, index) =>
      el('span', {
        class: `stage-chip is-${region.theme} ${chipState(index, passed)}`,
        role: 'listitem',
        text: region.name[i18n.current],
      }),
    ),
  );
}

export function startButton(onStart: () => void): HTMLElement {
  return el(
    'button',
    { class: 'button button-primary button-large', onClick: onStart },
    i18n.t.letsGo,
    primaryHint(),
  );
}

export function onCardKeys(keys: ReadonlyMap<string, () => void>): () => void {
  const stopListening = onWindowKeyAfter(KEY_READY_MS, (event) => {
    const action = keys.get(event.key);
    if (!action || event.repeat) return;
    event.preventDefault();
    stopListening();
    action();
  });
  return stopListening;
}

export function startOrCloseKeys({ onStart, onClose }: CardActions): () => void {
  return onCardKeys(
    new Map([
      [START_KEY, onStart],
      [CLOSE_KEY, onClose],
    ]),
  );
}

function chipState(index: number, passed: number | undefined): string {
  if (passed === undefined) return 'is-ahead';
  return index < passed ? 'is-lit' : 'is-dim';
}
