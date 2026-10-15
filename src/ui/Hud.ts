import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import type { SessionStats } from '../game/SessionStats';
import { el } from './dom';

const MAX_LIVES = 3;

export class Hud {
  readonly element: HTMLElement;
  private readonly score = el('strong', { class: 'hud-value' });
  private readonly combo = el('strong', { class: 'hud-value' });
  private readonly wpm = el('strong', { class: 'hud-value' });
  private readonly accuracy = el('strong', { class: 'hud-value' });
  private readonly hearts = el('div', { class: 'hearts' });

  constructor(profile: Profile, onSwitchPlayer: () => void) {
    const t = i18n.t;
    this.element = el(
      'header',
      { class: 'hud' },
      el(
        'button',
        { class: 'avatar-button', title: t.switchPlayer, onClick: onSwitchPlayer },
        el('span', { class: 'avatar', text: profile.avatar }),
        el('span', { text: profile.name }),
      ),
      this.stat(t.score, this.score),
      this.stat(t.combo, this.combo),
      this.stat(t.speed, this.wpm, t.wpm),
      this.stat(t.accuracy, this.accuracy),
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
