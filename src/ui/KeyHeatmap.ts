import { withRightAlt } from '../course/fingers';
import { recentAccuracy, type KeyStats } from '../course/keyStats';
import { accuracyPercent } from '../course/scoring';
import { i18n } from '../i18n/i18n';
import { el, type ElementProps } from './dom';
import { KEY_ROWS, type KeyRow } from './keyboardLayout';
import './mastery.css';

const HEAT_FLOOR = 0.7;
const GREEN_HUE = 130;
const EMPTY_CLASS = 'is-empty';

type Swatch = 'good' | 'weak' | 'empty';

const SWATCHES: readonly Swatch[] = ['good', 'weak', 'empty'];

export function heatHue(accuracy: number): number {
  const share = (accuracy - HEAT_FLOOR) / (1 - HEAT_FLOOR);
  return Math.round(Math.min(1, Math.max(0, share)) * GREEN_HUE);
}

export function keyHeatmap(stats: KeyStats): HTMLElement {
  const texts = i18n.t.features.mastery;
  return el(
    'section',
    { class: 'heatmap', 'aria-label': texts.heatmap },
    el('p', { class: 'heatmap-title', text: texts.heatmap }),
    el('div', { class: 'heatmap-keys' }, ...KEY_ROWS.map((row) => heatRow(row, stats))),
    el('div', { class: 'heatmap-legend' }, ...SWATCHES.map(swatch)),
  );
}

function heatRow({ keys, offset }: KeyRow, stats: KeyStats): HTMLElement {
  return el(
    'div',
    { class: 'key-row', style: `--offset: ${offset}` },
    ...[...keys].map((key) => heatKey(key, stats)),
  );
}

function heatKey(key: string, stats: KeyStats): HTMLElement {
  const polish = withRightAlt(key);
  const polishMark =
    polish !== key && stats[polish]
      ? el('span', { ...heatProps(polish, stats, 'heat-alt'), text: polish })
      : null;
  return el(
    'div',
    { ...heatProps(key, stats, 'key heat-key'), 'data-key': key },
    key.toUpperCase(),
    polishMark,
  );
}

function heatProps(key: string, stats: KeyStats, className: string): ElementProps {
  const stat = stats[key];
  const accuracy = stat ? recentAccuracy(stat) : undefined;
  const name = key.toUpperCase();
  if (accuracy === undefined) {
    const empty = i18n.t.features.mastery.legend.empty;
    return { class: `${className} ${EMPTY_CLASS}`, title: `${name}: ${empty}` };
  }
  return {
    class: className,
    style: `--heat: ${heatHue(accuracy)}`,
    title: `${name}: ${accuracyPercent(accuracy)}%`,
  };
}

function swatch(kind: Swatch): HTMLElement {
  return el(
    'span',
    { class: 'heatmap-swatch' },
    el('span', { class: `heatmap-chip is-${kind}`, 'aria-hidden': 'true' }),
    i18n.t.features.mastery.legend[kind],
  );
}
