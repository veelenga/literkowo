import { i18n } from '../i18n/i18n';
import type { Progress } from '../game/Game';
import type { SessionStats } from '../game/SessionStats';
import type { Profile } from '../profiles/Profile';
import { avatarImg, Counter, el, icon, restartAnimation } from './dom';
import { soundToggle } from './SoundToggle';

const MAX_LIVES = 3;
const PERCENT = 100;
const BASE_MULTIPLIER = 1;

export class Hud {
  readonly element: HTMLElement;
  private readonly score = new Counter(el('strong', { class: 'hud-value' }));
  private readonly combo = el('strong', { class: 'hud-value' });
  private readonly multiplier = el('span', { class: 'multiplier' });
  private readonly wpm = el('strong', { class: 'hud-value' });
  private readonly accuracy = el('strong', { class: 'hud-value' });
  private readonly hearts = Array.from({ length: MAX_LIVES }, () =>
    el('span', { class: 'heart' }, icon('heart', 'heart-icon')),
  );
  private readonly heartRow = el('div', { class: 'hearts' }, ...this.hearts);
  private readonly progressLabel = el('span', { class: 'progress-label' });
  private readonly progressCount = el('span', { class: 'progress-count' });
  private readonly progressFill = el('div', { class: 'progress-fill' });
  private lives = MAX_LIVES;
  private lastMultiplier = BASE_MULTIPLIER;

  constructor(profile: Profile, onMap: () => void) {
    const t = i18n.t;
    this.element = el(
      'header',
      { class: 'hud' },
      el(
        'button',
        { class: 'hud-map', title: t.map, onClick: onMap },
        avatarImg(profile.avatar, 'avatar-img hud-avatar'),
        el('span', { text: t.map }),
      ),
      el(
        'div',
        { class: 'hud-stats' },
        this.stat(t.score, this.score.element),
        this.stat(t.combo, el('span', { class: 'hud-combo' }, this.combo, this.multiplier)),
        this.stat(t.accuracy, this.accuracy),
        this.stat(t.speed, this.wpm, t.wpm),
      ),
      el(
        'div',
        { class: 'hud-progress' },
        el('div', { class: 'progress-head' }, this.progressLabel, this.progressCount),
        el('div', { class: 'progress-bar' }, this.progressFill),
      ),
      this.heartRow,
      soundToggle(),
    );
  }

  update(stats: SessionStats, lives: number): void {
    this.score.set(stats.score);
    this.combo.textContent = String(stats.combo);
    this.wpm.textContent = String(stats.wpm);
    this.accuracy.textContent = `${Math.round(stats.accuracy * PERCENT)}%`;
    this.updateMultiplier(stats.multiplier);
    this.updateHearts(lives);
  }

  progress({ kind, done, total }: Progress): void {
    const t = i18n.t;
    const labels = { warmup: t.warmup, words: t.words, boss: t.bossHealth };
    this.progressLabel.textContent = labels[kind];
    this.progressCount.textContent = `${done}/${total}`;
    this.progressFill.style.width = `${(done / total) * PERCENT}%`;
    this.progressFill.classList.toggle('is-boss', kind === 'boss');
  }

  private updateMultiplier(multiplier: number): void {
    this.multiplier.textContent = `×${multiplier}`;
    this.multiplier.classList.toggle('is-hot', multiplier > BASE_MULTIPLIER);
    if (multiplier > this.lastMultiplier) restartAnimation(this.multiplier, 'is-bumped');
    this.lastMultiplier = multiplier;
  }

  private updateHearts(lives: number): void {
    this.hearts.forEach((heart, index) => heart.classList.toggle('is-lost', index >= lives));
    if (lives < this.lives) this.breakHearts(Math.max(lives, 0), this.lives);
    this.lives = lives;
  }

  private breakHearts(from: number, to: number): void {
    this.hearts.slice(from, to).forEach((heart) => restartAnimation(heart, 'is-breaking'));
    restartAnimation(this.heartRow, 'is-shaking');
  }

  private stat(label: string, value: HTMLElement, unit?: string): HTMLElement {
    return el(
      'div',
      { class: 'hud-stat' },
      el('span', { class: 'hud-label', text: label }),
      el(
        'span',
        { class: 'hud-reading' },
        value,
        unit ? el('span', { class: 'hud-unit', text: unit }) : null,
      ),
    );
  }
}
