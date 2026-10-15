import { i18n } from '../i18n/i18n';
import type { Progress } from '../game/Game';
import type { SessionStats } from '../game/SessionStats';
import type { Profile } from '../profiles/Profile';
import { el } from './dom';

const MAX_LIVES = 3;

export class Hud {
  readonly element: HTMLElement;
  private readonly score = el('strong', { class: 'hud-value' });
  private readonly combo = el('strong', { class: 'hud-value' });
  private readonly wpm = el('strong', { class: 'hud-value' });
  private readonly accuracy = el('strong', { class: 'hud-value' });
  private readonly hearts = el('div', { class: 'hearts' });
  private readonly progressLabel = el('span', { class: 'progress-label' });
  private readonly progressFill = el('div', { class: 'progress-fill' });

  constructor(profile: Profile, onMap: () => void) {
    const t = i18n.t;
    this.element = el(
      'header',
      { class: 'hud' },
      el(
        'button',
        { class: 'avatar-button', title: t.map, onClick: onMap },
        el('span', { class: 'avatar', text: profile.avatar }),
        el('span', { text: t.map }),
      ),
      this.stat(t.score, this.score),
      this.stat(t.combo, this.combo),
      this.stat(t.speed, this.wpm, t.wpm),
      this.stat(t.accuracy, this.accuracy),
      el(
        'div',
        { class: 'progress' },
        this.progressLabel,
        el('div', { class: 'progress-bar' }, this.progressFill),
      ),
      this.hearts,
    );
  }

  update(stats: SessionStats, lives: number): void {
    this.score.textContent = String(stats.score);
    this.combo.textContent = `${stats.combo} ×${stats.multiplier}`;
    this.wpm.textContent = String(stats.wpm);
    this.accuracy.textContent = `${Math.round(stats.accuracy * 100)}%`;
    this.hearts.replaceChildren(
      ...Array.from({ length: MAX_LIVES }, (_, index) =>
        el('span', { class: index < lives ? 'heart' : 'heart is-lost', text: '♥' }),
      ),
    );
  }

  progress({ kind, done, total }: Progress): void {
    const t = i18n.t;
    const labels = { warmup: t.warmup, words: t.words, boss: t.bossHealth };
    this.progressLabel.textContent = `${labels[kind]} ${done}/${total}`;
    this.progressFill.style.width = `${(done / total) * 100}%`;
    this.progressFill.classList.toggle('is-boss', kind === 'boss');
  }

  private stat(label: string, value: HTMLElement, unit?: string): HTMLElement {
    return el(
      'div',
      { class: 'hud-stat' },
      el('span', { class: 'hud-label', text: label }),
      value,
      unit ? el('span', { class: 'hud-unit', text: unit }) : null,
    );
  }
}
