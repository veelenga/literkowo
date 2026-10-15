import { regionsFor, type Level, type Region } from '../course/regions';
import { MAX_STARS } from '../course/scoring';
import { i18n } from '../i18n/i18n';
import { totalStars, type Profile } from '../profiles/Profile';
import { el } from './dom';

interface Actions {
  onPlay: (level: Level) => void;
  onSwitchPlayer: () => void;
}

export class WorldMap {
  readonly element = el('div', { class: 'screen map-screen' });

  constructor(
    private readonly profile: Profile,
    private readonly actions: Actions,
  ) {
    this.render();
  }

  private render(): void {
    const t = i18n.t;
    const regions = regionsFor(this.profile.wordLanguage);
    this.element.replaceChildren(
      el(
        'header',
        { class: 'map-header' },
        el(
          'button',
          { class: 'avatar-button', onClick: this.actions.onSwitchPlayer },
          el('span', { class: 'avatar', text: this.profile.avatar }),
          el('span', { text: this.profile.name }),
        ),
        el('h1', { class: 'logo logo-small', text: t.appName }),
        el(
          'div',
          { class: 'map-stats' },
          this.stat('★', String(totalStars(this.profile)), t.stars),
          this.stat('🔤', String(this.profile.lettersFreed), t.lettersFreed),
          this.stat('🏆', String(this.profile.totalScore), t.score),
        ),
      ),
      ...regions.map((region) => this.region(region)),
    );
    queueMicrotask(() =>
      this.element.querySelector('.level-node.is-current')?.scrollIntoView({ block: 'center' }),
    );
  }

  private stat(icon: string, value: string, label: string): HTMLElement {
    return el(
      'div',
      { class: 'map-stat', title: label },
      el('span', { class: 'map-stat-icon', text: icon }),
      el('strong', { text: value }),
    );
  }

  private region(region: Region): HTMLElement {
    const language = i18n.current === 'uk' ? 'uk' : this.profile.wordLanguage;
    return el(
      'section',
      { class: `region region-${region.theme}` },
      el('h2', { class: 'region-title', text: region.name[language] }),
      el('div', { class: 'level-path' }, ...region.levels.map((level) => this.node(level))),
    );
  }

  private node(level: Level): HTMLElement {
    const t = i18n.t;
    const result = this.profile.levelResults[level.id];
    const unlocked = this.isUnlocked(level);
    const isCurrent = unlocked && !result;
    const classes = ['level-node'];
    if (!unlocked) classes.push('is-locked');
    if (isCurrent) classes.push('is-current');
    if (level.isBoss) classes.push('is-boss');
    const label = level.isBoss ? '👑' : level.newKeys.toUpperCase().split('').join(' ');
    return el(
      'button',
      {
        class: classes.join(' '),
        disabled: unlocked ? undefined : 'true',
        title: unlocked ? (level.isBoss ? t.bossLevel : `${t.level} ${level.index}`) : t.locked,
        onClick: () => this.actions.onPlay(level),
      },
      el('span', { class: 'level-label', text: unlocked ? label : '🔒' }),
      el(
        'span',
        { class: 'level-stars' },
        ...Array.from({ length: MAX_STARS }, (_, index) =>
          el('span', {
            class: index < (result?.stars ?? 0) ? 'star is-earned' : 'star',
            text: '★',
          }),
        ),
      ),
    );
  }

  private isUnlocked(level: Level): boolean {
    const playable = regionsFor(this.profile.wordLanguage).flatMap((region) => region.levels);
    const position = playable.findIndex((candidate) => candidate.id === level.id);
    if (position === 0) return true;
    const previous = playable[position - 1];
    return (this.profile.levelResults[previous.id]?.stars ?? 0) > 0;
  }
}
