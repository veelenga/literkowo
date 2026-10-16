import { arenaGateLevel, isArenaOpen } from '../arena/keySets';
import type { Level, LevelKind, Region } from '../course/catalog';
import { courseFor, type Course } from '../course/course';
import { MAX_STARS } from '../course/scoring';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { arenaIcon } from './arena/arenaParts';
import { el, icon, prefersReducedMotion, restartAnimation, svg } from './dom';
import {
  gatePoint,
  journeyLayout,
  journeyPath,
  stopRoles,
  type BandLayout,
  type BandSpec,
  type JourneyLayout,
  type JourneyStop,
} from './map/journeyLayout';
import { followScroll, revealOnEnter, type StopEffect } from './map/journeyMotion';
import { mapHeader } from './map/mapHeader';
import { ART_HEIGHT, ART_WIDTH, CEILING_HEIGHT, regionArt, type ArtLayer } from './map/regionArt';
import { keyLabel, levelTitle } from './levelKind';
import { keyDots, masteryMeter } from './mastery';
import { hasAmbientMotion } from './menuMotion';
import { onShortcutKeys, stepWithin } from './overlay';
import './courseMap.css';
import { outfitAvatar, releaseOutfitAvatars } from './OutfitAvatar';
import { primaryHint } from './shortcutHint';
import { hintedLockBadge } from './shopParts';
import './worldMap.css';

const STAR_BASE_DELAY_MS = 260;
const STAR_STAGGER_MS = 110;
const BOSS_FACE = '🌑';
const KIND_BADGES: Readonly<Partial<Record<LevelKind, string>>> = { learn: '✨', review: '👑' };
const HALF = 2;
const STOP_CLASS = 'journey-stop';
const SATELLITE_ROLE = 'satellite';
const STOP_SELECTOR = `.${STOP_CLASS}`;
const REVEAL_CLASS = 'has-reveal';
const AMBIENT_CLASS = 'has-ambient';
const PATH_WIDTH = 100;
const GATE_SELECTOR = '.journey-gate';
const NUDGE_CLASS = 'is-nudged';
const OPEN_NODE_SELECTOR = '.level-node:not(:disabled)';
const NODE_SELECTOR = '.level-node';
const NOT_FOUND = -1;
const PREVIOUS = -1;
const NEXT = 1;

type NodeState = 'locked' | 'open' | 'current' | 'done';

const NODE_LOOKS: Readonly<Record<NodeState, string>> = {
  locked: 'locked',
  open: 'current',
  current: 'current',
  done: 'done',
};

interface Actions {
  onPlay: (level: Level) => void;
  onSwitchPlayer: () => void;
  onShop: () => void;
  onArena: () => void;
  onSettings: () => void;
}

export class WorldMap {
  readonly element = el('div', { class: 'screen map-screen' });
  private readonly course: Course;
  private readonly layout: JourneyLayout;
  private readonly current: Level | undefined;
  private effects: StopEffect[] = [];
  private readonly stopKeys: () => void;

  constructor(
    private readonly profile: Profile,
    private readonly actions: Actions,
  ) {
    this.course = courseFor(profile.wordLanguage);
    this.current = this.course.current(profile);
    this.layout = journeyLayout(this.bandSpecs(), this.currentIndex());
    this.stopKeys = onShortcutKeys(this.element, {
      Enter: () => this.playFocusLevel(),
      ArrowRight: () => this.moveFocus(NEXT),
      ArrowDown: () => this.moveFocus(NEXT),
      ArrowLeft: () => this.moveFocus(PREVIOUS),
      ArrowUp: () => this.moveFocus(PREVIOUS),
      Escape: () => this.actions.onSwitchPlayer(),
    });
    this.render();
  }

  dispose(): void {
    this.stopKeys();
    this.effects.forEach((stop) => stop());
    this.effects = [];
    releaseOutfitAvatars();
  }

  private bandSpecs(): BandSpec[] {
    return this.course.regions.map((region) => ({
      roles: stopRoles(region.levels.map((level) => level.kind)),
      gate: this.hasGate(region),
    }));
  }

  private currentIndex(): number {
    return this.course.levels.findIndex((level) => this.stateOf(level) === 'current');
  }

  private render(): void {
    const scene = this.scene();
    const { onSwitchPlayer, onShop, onSettings } = this.actions;
    const onArena = () => this.openArena();
    this.element.replaceChildren(
      mapHeader(this.profile, { onSwitchPlayer, onShop, onArena, onSettings }),
      el('main', { class: 'map-journey' }, scene),
    );
    queueMicrotask(() => this.startMotion(scene));
  }

  private startMotion(scene: HTMLElement): void {
    if (!prefersReducedMotion()) this.revealStops(scene);
    if (hasAmbientMotion()) this.addParallax(scene);
    this.scrollToFocus();
  }

  private revealStops(scene: HTMLElement): void {
    scene.classList.add(REVEAL_CLASS);
    this.effects.push(revealOnEnter([...scene.querySelectorAll<HTMLElement>(STOP_SELECTOR)]));
  }

  private addParallax(scene: HTMLElement): void {
    scene.classList.add(AMBIENT_CLASS);
    this.effects.push(followScroll(this.element, scene));
  }

  private openArena(): void {
    if (isArenaOpen(this.profile)) return this.actions.onArena();
    const gate = this.element.querySelector(GATE_SELECTOR);
    if (!gate) return;
    gate.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    restartAnimation(gate, NUDGE_CLASS);
  }

  private scrollToFocus(): void {
    this.focusStop()?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }

  private playFocusLevel(): void {
    const level = this.focusLevel();
    if (level) this.actions.onPlay(level);
  }

  private focusLevel(): Level | undefined {
    const levels = this.course.levels;
    const current = levels.find((level) => this.stateOf(level) === 'current');
    return current ?? levels.filter((level) => this.isUnlocked(level)).at(-1);
  }

  private moveFocus(direction: number): void {
    const nodes = [...this.element.querySelectorAll<HTMLButtonElement>(OPEN_NODE_SELECTOR)];
    const index = nodes.findIndex((node) => node === document.activeElement);
    const target =
      index === NOT_FOUND
        ? this.focusStop()?.querySelector<HTMLButtonElement>(NODE_SELECTOR)
        : nodes[stepWithin(index, direction, nodes.length)];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }

  private focusStop(): HTMLElement | null {
    const current = this.element.querySelector<HTMLElement>(`${STOP_SELECTOR}.is-current`);
    if (current) return current;
    const unlocked = this.element.querySelectorAll<HTMLElement>(`${STOP_SELECTOR}:not(.is-locked)`);
    return unlocked.item(unlocked.length - 1);
  }

  private scene(): HTMLElement {
    return el(
      'div',
      { class: 'journey-scene', style: `--journey-height: ${this.layout.height}` },
      ...this.course.regions.map((region, index) =>
        this.region(region, index, this.layout.bands[index]),
      ),
      el('div', { class: 'journey-track journey-path-track' }, this.path()),
    );
  }

  private region(region: Region, index: number, band: BandLayout): HTMLElement {
    const classes = ['region', `region-${region.theme}`];
    if (!this.isUnlocked(region.levels[0])) classes.push('is-locked');
    return el(
      'section',
      {
        class: classes.join(' '),
        style: `--band-height: ${band.height}; --band-center: ${band.top + band.height / HALF}`,
        'aria-label': region.name[i18n.current],
      },
      el(
        'div',
        { class: 'region-art', 'aria-hidden': 'true' },
        ...regionArt(region.theme).map(artLayer),
      ),
      el(
        'div',
        { class: 'journey-track region-track' },
        this.regionHeader(region, index, band),
        ...region.levels.map((level, stop) => this.stop(level, band, stop)),
        this.hasGate(region) ? this.gate(band) : null,
      ),
    );
  }

  private regionHeader(region: Region, index: number, band: BandLayout): HTMLElement {
    const t = i18n.t;
    const earned = region.levels.reduce((sum, level) => sum + this.starsOf(level), 0);
    const total = region.levels.length * MAX_STARS;
    const locked = !this.isUnlocked(region.levels[0]);
    return el(
      'header',
      { class: `region-header is-${band.headerSide}` },
      el(
        'span',
        { class: 'region-chapter' },
        locked ? icon('lock', 'region-lock') : null,
        `${t.chapter} ${index + 1}`,
      ),
      el('h2', { class: 'region-title', text: region.name[i18n.current] }),
      el('p', { class: 'region-mood', text: t.features.worldMap.moods[region.theme] }),
      el(
        'div',
        { class: 'region-badges' },
        el(
          'span',
          {
            class: 'region-progress',
            title: t.stars,
            'aria-label': `${t.stars}: ${earned} / ${total}`,
          },
          icon('star', 'stat-icon stat-icon-star'),
          `${earned} / ${total}`,
        ),
        masteryMeter(region, this.profile.keyStats),
      ),
    );
  }

  private hasGate(region: Region): boolean {
    return arenaGateLevel(this.profile.wordLanguage).regionId === region.id;
  }

  private gate(band: BandLayout): HTMLElement {
    const copy = i18n.t.features.arena;
    const open = isArenaOpen(this.profile);
    const point = gatePoint(band);
    const title = open ? copy.title : `${copy.title}. ${copy.locked}`;
    return el(
      'div',
      {
        class: open ? 'journey-gate' : 'journey-gate is-locked',
        style: `--x: ${point.x.toFixed(2)}; --y: ${point.y - band.top}`,
      },
      el(
        'button',
        {
          class: 'gate-node',
          disabled: !open,
          title,
          'aria-label': title,
          onClick: () => this.actions.onArena(),
        },
        arenaIcon('gate-icon'),
        open ? null : hintedLockBadge(copy.locked),
      ),
      el('span', { class: 'gate-label', text: open ? copy.title : copy.locked }),
    );
  }

  private path(): SVGElement {
    const reached = this.course.levels.filter((level) => this.isUnlocked(level)).length;
    const { road, roadIndex } = this.layout;
    const route = journeyPath(road);
    const walked = journeyPath(road.slice(0, (roadIndex[reached - 1] ?? -1) + 1));
    return svg(
      'svg',
      {
        class: 'journey-path',
        viewBox: `0 0 ${PATH_WIDTH} ${this.layout.height}`,
        preserveAspectRatio: 'none',
        'aria-hidden': 'true',
      },
      svg('path', { class: 'journey-road', d: route }),
      svg('path', { class: 'journey-road-dots', d: route }),
      svg('path', { class: 'journey-walked-glow', d: walked }),
      svg('path', { class: 'journey-walked', d: walked }),
    );
  }

  private stop(level: Level, band: BandLayout, index: number): HTMLElement {
    const state = this.stateOf(level);
    const point = band.stops[index];
    const isSatellite = point.role === SATELLITE_ROLE;
    const classes = [STOP_CLASS, `is-${state}`, `is-${point.role}`];
    return el(
      'div',
      { class: classes.join(' '), style: stopStyle(point, band) },
      isSatellite ? el('span', { class: 'stop-link', 'aria-hidden': 'true' }) : null,
      state === 'current' ? this.hero() : null,
      this.node(level, state),
      state === 'current' ? el('span', { class: 'node-tag' }, i18n.t.play, primaryHint()) : null,
      state === 'done' ? this.stars(level) : null,
    );
  }

  private hero(): HTMLElement {
    return el(
      'span',
      { class: 'journey-hero', 'aria-hidden': 'true' },
      outfitAvatar(this.profile.avatar, this.profile.equipped),
    );
  }

  private node(level: Level, state: NodeState): HTMLElement {
    const classes = ['level-node', `is-${NODE_LOOKS[state]}`, `is-${level.kind}`];
    const lock = this.course.lockReason(level, this.profile);
    const title = lock ? i18n.t.features.course.locks[lock] : levelTitle(level);
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
      state === 'locked' ? null : kindBadge(level.kind),
      this.nodeFace(level, state),
      state === 'locked' || level.isBoss ? null : keyDots(level.focusKeys, this.profile.keyStats),
    );
  }

  private nodeFace(level: Level, state: NodeState): Element {
    if (state === 'locked') return icon('lock', 'node-lock');
    if (level.isBoss) return el('span', { class: 'level-label level-label-boss', text: BOSS_FACE });
    return el('span', { class: 'level-label', text: keyLabel(level.focusKeys) });
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
    if (this.starsOf(level) > 0) return 'done';
    return level.id === this.current?.id ? 'current' : 'open';
  }

  private starsOf(level: Level): number {
    return this.profile.levelResults[level.id]?.stars ?? 0;
  }

  private isUnlocked(level: Level): boolean {
    return this.course.isUnlocked(level, this.profile);
  }
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function stopStyle(point: JourneyStop, band: BandLayout): string {
  return `--x: ${point.x.toFixed(2)}; --y: ${point.y - band.top}; --shift: ${point.shift}`;
}

function kindBadge(kind: LevelKind): HTMLElement | null {
  const badge = KIND_BADGES[kind];
  return badge ? el('span', { class: 'node-kind', 'aria-hidden': 'true', text: badge }) : null;
}

function artLayer(layer: ArtLayer): HTMLElement {
  const height = layer.anchor === 'top' ? CEILING_HEIGHT : ART_HEIGHT;
  const align = layer.anchor === 'top' ? 'xMidYMin' : 'xMidYMax';
  return el('div', {
    class: `art-layer art-layer-${layer.name} is-${layer.anchor}`,
    style: `--art-width: ${ART_WIDTH}; --art-height: ${height}`,
    html: `<svg viewBox="0 0 ${ART_WIDTH} ${height}" preserveAspectRatio="${align} slice">${layer.markup}</svg>`,
  });
}
