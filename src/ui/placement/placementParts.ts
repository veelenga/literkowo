import type { Region } from '../../course/catalog';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { el } from '../dom';
import { CLOSE_KEY, onCardKeys, PRIMARY_KEY } from '../overlay';
import { primaryButton } from '../shortcutHint';
import '../placement.css';

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
  return primaryButton(i18n.t.letsGo, onStart);
}

export function startOrCloseKeys({ onStart, onClose }: CardActions): () => void {
  return onCardKeys(
    new Map([
      [PRIMARY_KEY, onStart],
      [CLOSE_KEY, onClose],
    ]),
  );
}

function chipState(index: number, passed: number | undefined): string {
  if (passed === undefined) return 'is-ahead';
  return index < passed ? 'is-lit' : 'is-dim';
}
