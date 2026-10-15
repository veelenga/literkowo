import { sfx } from '../audio/Sfx';
import type { Region } from '../course/catalog';
import { recentAccuracy, type KeyStat, type KeyStats } from '../course/keyStats';
import { masteredKeys, masteredShare, masteryOf, regionKeys } from '../course/mastery';
import type { KeyReport } from '../game/KeyTracker';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, icon, prefersReducedMotion } from './dom';
import './mastery.css';

const PERCENT = 100;
const METER_CAP = 'A';
const MASTERED_CALLOUT_DELAY_MS = 1200;
const KEY_SEPARATOR = ', ';

export function percent(fraction: number): number {
  return Math.round(fraction * PERCENT);
}

export function masteryMeter(region: Region, stats: KeyStats): HTMLElement {
  const keys = regionKeys(region);
  const mastered = masteredKeys(keys, stats).length;
  const total = [...keys].length;
  const label = format(i18n.t.features.mastery.meter, { mastered, total });
  return el(
    'span',
    { class: 'mastery-meter', title: label, 'aria-label': label },
    el('span', { class: 'mastery-meter-cap', 'aria-hidden': 'true', text: METER_CAP }),
    el(
      'span',
      { class: 'mastery-meter-bar' },
      el('span', {
        class: 'mastery-meter-fill',
        style: `width: ${percent(masteredShare(keys, stats))}%`,
      }),
    ),
    el('strong', { text: `${mastered}/${total}` }),
  );
}

export function keyDots(keys: string, stats: KeyStats): HTMLElement {
  return el(
    'span',
    { class: 'node-keys', 'aria-hidden': 'true' },
    ...[...keys].map((key) =>
      el('span', { class: 'node-key', 'data-mastery': masteryOf(key, stats[key]) }),
    ),
  );
}

export function keyStatus(key: string, stat: KeyStat | undefined): HTMLElement {
  const level = masteryOf(key, stat);
  const accuracy = stat ? recentAccuracy(stat) : undefined;
  return el(
    'span',
    { class: 'key-status', 'data-mastery': level },
    el('span', { class: 'key-status-dot', 'aria-hidden': 'true' }),
    i18n.t.features.mastery.levels[level],
    accuracy === undefined ? null : el('strong', { text: `${percent(accuracy)}%` }),
  );
}

export class ResultKeys {
  readonly element: HTMLElement;
  private timer = 0;

  constructor(private readonly report: KeyReport) {
    const texts = i18n.t.features.mastery;
    this.element = el(
      'section',
      { class: 'result-keys' },
      el('span', { class: 'result-keys-label', text: texts.keys }),
      el('div', { class: 'result-keys-list' }, ...this.weakChips(), ...this.masteredChips()),
    );
  }

  reveal(): void {
    if (!this.report.mastered.length) return;
    const delay = prefersReducedMotion() ? 0 : MASTERED_CALLOUT_DELAY_MS;
    this.timer = window.setTimeout(() => this.celebrate(), delay);
  }

  stop(): void {
    window.clearTimeout(this.timer);
  }

  private weakChips(): HTMLElement[] {
    if (!this.report.weakest.length) {
      return [el('span', { class: 'result-keys-clean', text: i18n.t.features.mastery.noMistakes })];
    }
    return this.report.weakest.map(({ key, accuracy }) =>
      el(
        'span',
        { class: 'key-chip' },
        keyCap(key),
        el('strong', { text: `${percent(accuracy)}%` }),
      ),
    );
  }

  private masteredChips(): HTMLElement[] {
    const title = i18n.t.features.mastery.levels.mastered;
    return this.report.mastered.map((key) =>
      el(
        'span',
        { class: 'key-chip is-mastered', title, 'aria-label': `${title}: ${key.toUpperCase()}` },
        icon('star', 'key-chip-star'),
        keyCap(key),
      ),
    );
  }

  private celebrate(): void {
    this.element.classList.add('has-mastered');
    this.element.append(
      el('div', {
        class: 'mastered-callout',
        'aria-live': 'polite',
        text: masteredText(this.report.mastered),
      }),
    );
    sfx.sparkle();
  }
}

function masteredText(keys: readonly string[]): string {
  const texts = i18n.t.features.mastery;
  const template = keys.length === 1 ? texts.masteredOne : texts.masteredMany;
  return format(template, { keys: keys.map((key) => key.toUpperCase()).join(KEY_SEPARATOR) });
}

function keyCap(key: string): HTMLElement {
  return el('kbd', { class: 'key-chip-cap', text: key.toUpperCase() });
}
