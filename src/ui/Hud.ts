import { accuracyPercent } from '../course/scoring';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import type { Progress } from '../game/Game';
import type { RunPlan, StageMark } from '../game/RunPlan';
import type { Rewards } from '../game/RunRewards';
import type { SessionStats } from '../game/SessionStats';
import type { Profile } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { Counter, el, icon, releaseFocus, restartAnimation } from './dom';
import { playerLevelOf, playerLevelTitle, xpGainText } from './progression';
import { soundToggle } from './SoundToggle';

const PERCENT = 100;
const BASE_MULTIPLIER = 1;
const NO_XP = 0;

interface HudActions {
  onMap: () => void;
  onPause: () => void;
  onKeyboard: () => void;
}

export class Hud {
  readonly element: HTMLElement;
  private readonly score = new Counter(el('strong', { class: 'hud-value' }));
  private readonly xpGain = new Counter(el('span', { class: 'hud-xp' }), xpGainText);
  private readonly levelBadge = el('span', { class: 'hud-level-badge' });
  private readonly combo = el('strong', { class: 'hud-value' });
  private readonly multiplier = el('span', { class: 'multiplier' });
  private readonly wpm = el('strong', { class: 'hud-value' });
  private readonly accuracy = el('strong', { class: 'hud-value' });
  private readonly hearts: HTMLElement[];
  private readonly heartRow: HTMLElement;
  private readonly progressLabel = el('span', { class: 'progress-label' });
  private readonly progressCount = el('span', { class: 'progress-count' });
  private readonly progressFill = el('div', { class: 'progress-fill' });
  private lives: number;
  private lastMultiplier = BASE_MULTIPLIER;
  private playerLevel: number;

  constructor(
    private readonly profile: Profile,
    actions: HudActions,
    { lives, xpFactor }: Pick<RunPlan, 'lives' | 'xpFactor'>,
  ) {
    const t = i18n.t;
    this.lives = lives;
    this.xpGain.element.hidden = xpFactor <= NO_XP;
    this.hearts = Array.from({ length: lives }, () =>
      el('span', { class: 'heart' }, icon('heart', 'heart-icon')),
    );
    this.heartRow = el('div', { class: 'hearts' }, ...this.hearts);
    this.playerLevel = playerLevelOf(profile.xp);
    this.showPlayerLevel();
    this.element = el(
      'header',
      { class: 'hud' },
      el(
        'button',
        {
          class: 'hud-map',
          title: t.map,
          onClick: (event) => {
            releaseFocus(event);
            actions.onMap();
          },
        },
        characterAvatar(profile.avatar, 'hud-avatar'),
        this.levelBadge,
        el('span', { class: 'hud-map-label', text: t.map }),
      ),
      el(
        'div',
        { class: 'hud-stats' },
        this.stat(
          t.score,
          el('span', { class: 'hud-score' }, this.score.element, this.xpGain.element),
        ),
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
      keyboardButton(actions.onKeyboard),
      pauseButton(actions.onPause),
      soundToggle(),
    );
  }

  update(stats: SessionStats, lives: number): void {
    this.score.set(stats.score);
    this.combo.textContent = String(stats.combo);
    this.wpm.textContent = String(stats.wpm);
    this.accuracy.textContent = `${accuracyPercent(stats.accuracy)}%`;
    this.updateMultiplier(stats.multiplier);
    this.updateHearts(lives);
  }

  setRewards(rewards: Rewards): void {
    this.xpGain.set(rewards.xp);
    const level = playerLevelOf(this.profile.xp + rewards.xp);
    if (level === this.playerLevel) return;
    this.playerLevel = level;
    this.showPlayerLevel();
    restartAnimation(this.levelBadge, 'is-bumped');
  }

  progress({ kind, done, total, timed, wave, stage }: Progress): void {
    this.progressLabel.textContent = progressLabel(kind, wave, stage);
    this.progressCount.textContent = timed ? secondsLeft(total - done) : `${done}/${total}`;
    const share = timed ? (total - done) / total : done / total;
    this.progressFill.style.width = `${share * PERCENT}%`;
    this.progressFill.classList.toggle('is-boss', kind === 'boss');
    this.progressFill.classList.toggle('is-timed', timed);
  }

  private showPlayerLevel(): void {
    this.levelBadge.textContent = String(this.playerLevel);
    this.levelBadge.title = playerLevelTitle(this.playerLevel);
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

function progressLabel(
  kind: Progress['kind'],
  wave: number | undefined,
  stage: StageMark | undefined,
): string {
  const t = i18n.t;
  if (stage) return format(t.features.placement.stage, { stage: stage.number, count: stage.count });
  if (wave !== undefined) return format(t.features.arena.wave, { wave });
  const labels = {
    warmup: t.warmup,
    learn: t.words,
    words: t.words,
    boss: t.bossHealth,
    test: t.words,
  };
  return labels[kind];
}

function secondsLeft(seconds: number): string {
  return format(i18n.t.features.placement.secondsLeft, { seconds: Math.ceil(seconds) });
}

function keyboardButton(onKeyboard: () => void): HTMLElement {
  const label = i18n.t.features.touch.phoneKeyboard;
  return el(
    'button',
    { class: 'hud-keys', title: label, 'aria-label': label, onClick: onKeyboard },
    icon('keyboard', 'hud-keys-icon'),
  );
}

function pauseButton(onPause: () => void): HTMLElement {
  const label = i18n.t.features.touch.pause;
  return el(
    'button',
    {
      class: 'hud-pause',
      title: label,
      'aria-label': label,
      onClick: (event) => {
        releaseFocus(event);
        onPause();
      },
    },
    icon('pause', 'hud-pause-icon'),
  );
}
