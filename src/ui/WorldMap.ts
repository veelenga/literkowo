import type { Level, Region, ThemeId } from '../course/catalog';
import { courseFor, type Course } from '../course/course';
import { MAX_STARS } from '../course/scoring';
import { i18n } from '../i18n/i18n';
import { totalStars, type Profile } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { el, icon, svg } from './dom';
import { keyDots, masteryMeter } from './mastery';
import { coinIcon, levelBadge } from './progression';
import { shopButton } from './shopParts';
import { soundToggle } from './SoundToggle';

const TRAIL_EDGE = 8;
const TRAIL_LOW = 64;
const TRAIL_HIGH = 34;
const TRAIL_VIEWBOX = '0 0 100 100';
const REGION_STAGGER_MS = 90;
const STAR_BASE_DELAY_MS = 320;
const STAR_STAGGER_MS = 110;
const ART_VIEWBOX = '0 0 800 240';
const BOSS_FACE = '🌑';

type NodeState = 'locked' | 'current' | 'done';

interface Point {
  x: number;
  y: number;
}

interface Actions {
  onPlay: (level: Level) => void;
  onSwitchPlayer: () => void;
  onShop: () => void;
}

export class WorldMap {
  readonly element = el('div', { class: 'screen map-screen' });
  private readonly course: Course;

  constructor(
    private readonly profile: Profile,
    private readonly actions: Actions,
  ) {
    this.course = courseFor(profile.wordLanguage);
    this.render();
  }

  private render(): void {
    this.element.replaceChildren(
      this.header(),
      el(
        'main',
        { class: 'map-journey' },
        ...this.course.regions.map((region, index) => this.region(region, index)),
      ),
    );
    queueMicrotask(() =>
      this.element.querySelector('.level-node.is-current')?.scrollIntoView({ block: 'center' }),
    );
  }

  private header(): HTMLElement {
    const t = i18n.t;
    return el(
      'header',
      { class: 'map-header' },
      el(
        'div',
        { class: 'map-player' },
        el(
          'button',
          { class: 'profile-chip', title: t.switchPlayer, onClick: this.actions.onSwitchPlayer },
          el(
            'span',
            { class: 'avatar-ring avatar-ring-tiny' },
            characterAvatar(this.profile.avatar),
          ),
          el(
            'span',
            { class: 'profile-chip-text' },
            el('strong', { text: this.profile.name }),
            el('small', { text: t.switchPlayer }),
          ),
        ),
        levelBadge(this.profile.xp),
      ),
      el('h1', { class: 'logo logo-small', text: t.appName }),
      el(
        'div',
        { class: 'map-stats' },
        this.stat(icon('star', 'stat-icon stat-icon-star'), totalStars(this.profile), t.stars),
        this.stat('🔤', this.profile.lettersFreed, t.lettersFreed),
        this.stat('🏆', this.profile.totalScore, t.score),
        this.stat(
          coinIcon('stat-icon coin-icon'),
          this.profile.coins,
          t.features.progression.coins,
        ),
        shopButton(this.profile, this.actions.onShop),
        soundToggle(),
      ),
    );
  }

  private stat(symbol: SVGElement | string, value: number, label: string): HTMLElement {
    const glyph =
      typeof symbol === 'string' ? el('span', { class: 'stat-icon', text: symbol }) : symbol;
    return el(
      'div',
      { class: 'stat-pill', title: label, 'aria-label': `${label}: ${value}` },
      glyph,
      el('strong', { text: String(value) }),
    );
  }

  private region(region: Region, index: number): HTMLElement {
    const classes = ['region', `region-${region.theme}`];
    if (!this.isUnlocked(region.levels[0])) classes.push('is-locked');
    return el(
      'section',
      { class: classes.join(' '), style: `--delay: ${index * REGION_STAGGER_MS}ms` },
      el('div', { class: 'region-art', 'aria-hidden': 'true', html: regionArt(region.theme) }),
      this.regionHeader(region, index),
      this.trail(region.levels),
    );
  }

  private regionHeader(region: Region, index: number): HTMLElement {
    const t = i18n.t;
    const earned = region.levels.reduce((sum, level) => sum + this.starsOf(level), 0);
    return el(
      'header',
      { class: 'region-header' },
      el(
        'div',
        {},
        el('span', { class: 'region-eyebrow', text: `${t.chapter} ${index + 1}` }),
        el('h2', { class: 'region-title', text: region.name[i18n.current] }),
      ),
      el(
        'div',
        { class: 'region-badges' },
        el(
          'span',
          { class: 'region-progress', title: t.stars },
          icon('star', 'stat-icon stat-icon-star'),
          `${earned} / ${region.levels.length * MAX_STARS}`,
        ),
        masteryMeter(region, this.profile.keyStats),
      ),
    );
  }

  private trail(levels: Level[]): HTMLElement {
    const points = trailPoints(levels.length);
    return el(
      'div',
      { class: 'level-trail', style: `--stops: ${levels.length}` },
      this.trailPath(levels, points),
      ...levels.map((level, index) => this.stop(level, points[index])),
    );
  }

  private trailPath(levels: Level[], points: Point[]): SVGElement {
    const segments = points.slice(1).map((point, index) =>
      svg('path', {
        d: curveBetween(points[index], point),
        class: this.isUnlocked(levels[index + 1]) ? 'trail-segment is-done' : 'trail-segment',
      }),
    );
    return svg(
      'svg',
      {
        class: 'trail-path',
        viewBox: TRAIL_VIEWBOX,
        preserveAspectRatio: 'none',
        'aria-hidden': 'true',
      },
      ...segments,
    );
  }

  private stop(level: Level, point: Point): HTMLElement {
    const state = this.stateOf(level);
    return el(
      'div',
      {
        class: level.isBoss ? 'trail-stop is-boss' : 'trail-stop',
        style: `--x: ${point.x}%; --y: ${point.y}%`,
      },
      state === 'current' ? el('span', { class: 'node-tag', text: i18n.t.play }) : null,
      this.node(level, state),
      state === 'locked' ? null : this.stars(level),
    );
  }

  private node(level: Level, state: NodeState): HTMLElement {
    const t = i18n.t;
    const classes = ['level-node', `is-${state}`];
    if (level.isBoss) classes.push('is-boss');
    const title =
      state === 'locked' ? t.locked : level.isBoss ? t.bossLevel : `${t.level} ${level.index}`;
    return el(
      'button',
      {
        class: classes.join(' '),
        disabled: state === 'locked',
        title,
        'aria-label': title,
        onClick: () => this.actions.onPlay(level),
      },
      level.isBoss ? el('span', { class: 'node-crown' }, icon('crown', 'node-crown-icon')) : null,
      this.nodeFace(level, state),
      state === 'locked' || level.isBoss ? null : keyDots(level.newKeys, this.profile.keyStats),
    );
  }

  private nodeFace(level: Level, state: NodeState): Element {
    if (state === 'locked') return icon('lock', 'node-lock');
    if (level.isBoss) return el('span', { class: 'level-label level-label-boss', text: BOSS_FACE });
    return el('span', {
      class: 'level-label',
      text: level.newKeys.toUpperCase().split('').join(' '),
    });
  }

  private stars(level: Level): HTMLElement {
    const earned = this.starsOf(level);
    return el(
      'span',
      { class: 'level-stars', 'aria-label': `${earned} / ${MAX_STARS}` },
      ...Array.from({ length: MAX_STARS }, (_, index) => {
        const star = icon('star', index < earned ? 'star is-earned' : 'star');
        star.style.setProperty('--delay', `${STAR_BASE_DELAY_MS + index * STAR_STAGGER_MS}ms`);
        return star;
      }),
    );
  }

  private stateOf(level: Level): NodeState {
    if (!this.isUnlocked(level)) return 'locked';
    return this.starsOf(level) > 0 ? 'done' : 'current';
  }

  private starsOf(level: Level): number {
    return this.profile.levelResults[level.id]?.stars ?? 0;
  }

  private isUnlocked(level: Level): boolean {
    return this.course.isUnlocked(level, this.profile.levelResults);
  }
}

function trailPoints(count: number): Point[] {
  const span = 100 - TRAIL_EDGE * 2;
  const step = count > 1 ? span / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => ({
    x: count > 1 ? TRAIL_EDGE + index * step : 50,
    y: index % 2 === 0 ? TRAIL_LOW : TRAIL_HIGH,
  }));
}

function curveBetween(from: Point, to: Point): string {
  const middle = (from.x + to.x) / 2;
  return `M${from.x} ${from.y}C${middle} ${from.y} ${middle} ${to.y} ${to.x} ${to.y}`;
}

function regionArt(theme: ThemeId): string {
  return `<svg viewBox="${ART_VIEWBOX}" preserveAspectRatio="xMidYMax slice">${REGION_MOTIFS[theme]}</svg>`;
}

type Dot = [x: number, y: number, radius: number];
type Pine = [x: number, base: number, height: number];
type Stalactite = [x: number, width: number, length: number];
type Crystal = [x: number, base: number, height: number, half: number];

function shapes(className: string, paths: string[]): string {
  return `<path class="${className}" d="${paths.join('')}"/>`;
}

function dots(className: string, points: Dot[]): string {
  return points
    .map(([x, y, r]) => `<circle class="${className}" cx="${x}" cy="${y}" r="${r}"/>`)
    .join('');
}

function pine([x, base, height]: Pine): string {
  const half = Math.round(height * 0.36);
  const tier = Math.round(base - height * 0.5);
  const foot = Math.round(base - height * 0.1);
  const inner = Math.round(half * 0.45);
  const shoulder = Math.round(half * 0.7);
  return `M${x} ${base - height}L${x + shoulder} ${tier}H${x + inner}L${x + half} ${foot}H${x - half}L${x - inner} ${tier}H${x - shoulder}Z`;
}

function stalactite([x, width, length]: Stalactite): string {
  return `M${x - width / 2} 0L${x} ${length}L${x + width / 2} 0Z`;
}

function crystal([x, base, height, half]: Crystal): string {
  const shoulder = Math.round(base - height * 0.6);
  return `M${x - half} ${base}V${shoulder}L${x} ${base - height}L${x + half} ${shoulder}V${base}Z`;
}

const FAR_PINES: Pine[] = [
  [60, 210, 90],
  [130, 214, 70],
  [520, 210, 80],
  [590, 214, 104],
  [660, 210, 76],
  [740, 214, 96],
];

const NEAR_PINES: Pine[] = [
  [18, 240, 130],
  [96, 240, 100],
  [690, 240, 120],
  [772, 240, 146],
];

const STALACTITES: Stalactite[] = [
  [40, 40, 60],
  [96, 26, 36],
  [160, 50, 82],
  [240, 30, 44],
  [560, 36, 58],
  [620, 24, 34],
  [690, 48, 92],
  [760, 30, 50],
];

const CRYSTALS: Crystal[] = [
  [600, 236, 70, 12],
  [632, 236, 46, 9],
  [574, 236, 40, 8],
  [120, 236, 50, 10],
  [146, 236, 32, 7],
];

const MEADOW_ART = [
  dots('art-glow', [[560, 74, 30]]),
  shapes('art-far', ['M0 172C110 122 230 128 340 160S560 132 680 142 780 160 800 166V240H0Z']),
  shapes('art-near', ['M0 206C140 172 270 182 400 206S650 182 800 196V240H0Z']),
  dots('art-accent', [
    [90, 198, 4],
    [150, 190, 3],
    [600, 192, 4],
    [690, 186, 3],
    [740, 194, 4],
  ]),
].join('');

const FOREST_ART = [
  dots('art-glow', [[470, 58, 20]]),
  shapes('art-far', FAR_PINES.map(pine)),
  shapes('art-near', ['M0 226Q400 204 800 226V240H0Z', ...NEAR_PINES.map(pine)]),
  dots('art-accent', [
    [240, 150, 2.5],
    [300, 120, 2],
    [470, 160, 2.5],
    [560, 110, 2],
  ]),
].join('');

const MOUNTAINS_ART = [
  dots('art-glow', [[500, 54, 24]]),
  shapes('art-far', [
    'M0 200L90 120L150 160L240 80L330 170L420 110L520 180L610 70L700 150L800 100V240H0Z',
  ]),
  shapes('art-snow', [
    'M240 80L262 102L250 97L240 106L230 96L218 100Z',
    'M610 70L632 90L620 86L610 96L599 88L588 97Z',
  ]),
  shapes('art-near', ['M0 216L120 170L210 210L330 150L460 214L560 176L680 220L800 182V240H0Z']),
].join('');

const CAVE_ART = [
  shapes('art-far', STALACTITES.map(stalactite)),
  shapes('art-near', ['M0 240V222Q200 204 400 222T800 216V240Z']),
  shapes('art-glow', CRYSTALS.map(crystal)),
].join('');

const ISLAND_ART = [
  dots('art-glow', [[640, 150, 64]]),
  shapes('art-far', [
    'M0 196Q50 186 100 196T200 196T300 196T400 196T500 196T600 196T700 196T800 196V240H0Z',
  ]),
  shapes('art-near', ['M10 240Q160 192 330 240Z']),
  '<path class="art-trunk" d="M168 226Q158 170 196 118"/>',
  shapes('art-leaf', [
    'M196 118Q160 92 122 112Q162 104 196 118Z',
    'M196 118Q214 84 254 92Q220 98 196 118Z',
    'M196 118Q238 112 262 140Q228 120 196 118Z',
    'M196 118Q170 116 146 146Q172 122 196 118Z',
    'M196 118Q190 88 206 66Q200 92 196 118Z',
  ]),
].join('');

const REGION_MOTIFS: Record<ThemeId, string> = {
  meadow: MEADOW_ART,
  forest: FOREST_ART,
  mountains: MOUNTAINS_ART,
  cave: CAVE_ART,
  island: ISLAND_ART,
};
