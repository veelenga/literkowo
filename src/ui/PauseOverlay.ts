import {
  QUALITY_CHOICES,
  readQualityChoice,
  saveQualityChoice,
  type QualityChoice,
} from '../game/quality';
import { formatParts } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';
import { createOverlay, type Overlay } from './overlay';
import './quality.css';

const ESCAPE_LABEL = 'Esc';
const ACTIVE_CLASS = 'is-active';

export function pauseOverlay(): Overlay {
  const t = i18n.t;
  const escapeKey = el('kbd', { class: 'kbd', text: ESCAPE_LABEL });
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
        qualityPicker(),
      ),
    ),
  );
}

function qualityPicker(): HTMLElement {
  const texts = i18n.t.features.quality;
  const chips = new Map<QualityChoice, HTMLButtonElement>();
  const select = (choice: QualityChoice): void => {
    saveQualityChoice(choice);
    chips.forEach((chip, key) => markChip(chip, key === choice));
  };
  QUALITY_CHOICES.forEach((choice) => {
    const chip = el('button', {
      class: 'chip',
      type: 'button',
      text: texts.options[choice],
      onClick: () => select(choice),
    });
    chips.set(choice, chip);
  });
  const current = readQualityChoice();
  chips.forEach((chip, key) => markChip(chip, key === current));
  return el(
    'div',
    { class: 'quality-picker' },
    el('p', { class: 'quality-title', text: texts.title }),
    el(
      'div',
      { class: 'segmented segmented-wide quality-options', 'aria-label': texts.title },
      ...chips.values(),
    ),
    el('p', { class: 'quality-hint', text: texts.hint }),
  );
}

function markChip(chip: HTMLButtonElement, active: boolean): void {
  chip.classList.toggle(ACTIVE_CLASS, active);
  chip.setAttribute('aria-pressed', String(active));
}
