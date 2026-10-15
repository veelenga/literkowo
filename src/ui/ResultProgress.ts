import { sfx } from '../audio/Sfx';
import { levelProgress, type LevelProgress } from '../course/xp';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { confetti } from './confetti';
import { Counter, el, restartAnimation } from './dom';
import {
  coinPill,
  levelDisc,
  playerLevelTitle,
  rankName,
  setXpBarFill,
  xpBar,
  xpGainText,
  type XpBar,
} from './progression';

const FILL_DURATION_MS = 800;
const FULL_BAR = 1;
const EMPTY_BAR = 0;
const INSTANT_CLASS = 'is-instant';
const BUMP_CLASS = 'is-bumped';

export interface EarnedRewards {
  xpBefore: number;
  xp: number;
  coins: number;
}

export class ResultProgress {
  readonly element: HTMLElement;
  private readonly before: LevelProgress;
  private readonly after: LevelProgress;
  private readonly disc: HTMLElement;
  private readonly levelLabel = el('small');
  private readonly rank = el('strong');
  private readonly bar: XpBar;
  private readonly xpGain = new Counter(
    el('strong', { class: 'result-xp-gain' }),
    xpGainText,
    FILL_DURATION_MS,
  );
  private readonly timers: number[] = [];

  constructor(private readonly earned: EarnedRewards) {
    this.before = levelProgress(earned.xpBefore);
    this.after = levelProgress(earned.xpBefore + earned.xp);
    this.disc = levelDisc(this.before.level);
    this.bar = xpBar(this.before.fraction, 'xp-bar xp-bar-large');
    this.showLevel(this.before.level);
    this.element = el(
      'section',
      { class: 'result-progress' },
      el(
        'div',
        { class: 'result-progress-head' },
        this.disc,
        el('span', { class: 'result-rank' }, this.levelLabel, this.rank),
        this.xpGain.element,
        coinPill(`+${earned.coins}`),
      ),
      this.bar.element,
    );
  }

  reveal(): void {
    this.xpGain.set(this.earned.xp);
    if (this.after.level === this.before.level) return this.fillTo(this.after.fraction);
    this.fillTo(FULL_BAR);
    this.timers.push(window.setTimeout(() => this.levelUp(), FILL_DURATION_MS));
  }

  stop(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.xpGain.stop();
  }

  private levelUp(): void {
    this.showLevel(this.after.level);
    restartAnimation(this.disc, BUMP_CLASS);
    this.element.append(levelUpBanner(this.after.level), confetti());
    sfx.levelComplete();
    sfx.sparkle();
    this.refill(this.after.fraction);
  }

  private refill(fraction: number): void {
    const { fill } = this.bar;
    fill.classList.add(INSTANT_CLASS);
    setXpBarFill(fill, EMPTY_BAR);
    fill.getBoundingClientRect();
    fill.classList.remove(INSTANT_CLASS);
    setXpBarFill(fill, fraction);
  }

  private fillTo(fraction: number): void {
    setXpBarFill(this.bar.fill, fraction);
  }

  private showLevel(level: number): void {
    this.disc.textContent = String(level);
    this.disc.title = playerLevelTitle(level);
    this.levelLabel.textContent = format(i18n.t.features.progression.playerLevel, { level });
    this.rank.textContent = rankName(level);
  }
}

function levelUpBanner(level: number): HTMLElement {
  return el(
    'div',
    { class: 'level-up-banner', 'aria-live': 'polite' },
    el('strong', { text: i18n.t.features.progression.levelUp }),
    el('span', { text: rankName(level) }),
  );
}
