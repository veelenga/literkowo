import { STAGE_SECONDS } from '../../arena/placement';
import type { Region } from '../../course/catalog';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { closeButton } from '../closeButton';
import { el } from '../dom';
import { createOverlay, type Overlay } from '../overlay';
import { stageChips, startButton, startOrCloseKeys, type CardActions } from './placementParts';

export function placementIntro(regions: readonly Region[], actions: CardActions): Overlay {
  const copy = i18n.t.features.placement;
  const element = el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center learn-panel placement-intro' },
      closeButton(copy.close, actions.onClose),
      el('span', { class: 'eyebrow', text: copy.title }),
      stageChips(regions),
      el('p', {
        class: 'placement-rule',
        text: format(copy.rule, { seconds: STAGE_SECONDS }),
      }),
      el('p', { class: 'learn-hint', text: i18n.t.placeFingers }),
      el('div', { class: 'actions' }, startButton(actions.onStart)),
    ),
  );
  return createOverlay(element, startOrCloseKeys(actions));
}
