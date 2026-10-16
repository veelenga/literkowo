import { GOLD } from '../arena/medals';
import { bestEndlessMedal, bestEndlessWave } from '../arena/record';
import { STARTER_SKINS, type Profile } from '../profiles/Profile';
import { LEVELS, REGIONS, type Level } from './catalog';
import { courseFor } from './course';
import { masteredShare, regionKeys } from './mastery';
import { TROPHIES, type Trophy, type TrophyRule } from './shop';
import { levelProgress } from './xp';

export interface TrophyProgress {
  readonly current: number;
  readonly goal: number;
}

type MilestoneRule = Extract<TrophyRule, { kind: 'firstBoss' | 'masteredRegion' | 'arenaGold' }>;
type MeasuredRule = Exclude<TrophyRule, MilestoneRule>;

const FULL_SHARE = 1;
const THREE_STARS = 3;
const MILESTONES: readonly TrophyRule['kind'][] = ['firstBoss', 'masteredRegion', 'arenaGold'];

export function earnedTrophies(profile: Profile): string[] {
  return TROPHIES.filter((trophy) => isEarned(profile, trophy.rule)).map((trophy) => trophy.id);
}

export function awardTrophies(profile: Profile): Profile {
  const owned = new Set(profile.inventory.trophies);
  const fresh = earnedTrophies(profile).filter((id) => !owned.has(id));
  if (fresh.length === 0) return profile;
  return {
    ...profile,
    inventory: { ...profile.inventory, trophies: [...profile.inventory.trophies, ...fresh] },
  };
}

export function freshTrophies(before: Profile, after: Profile): Trophy[] {
  const earlier = new Set(before.inventory.trophies);
  const fresh = new Set(after.inventory.trophies.filter((id) => !earlier.has(id)));
  return TROPHIES.filter((trophy) => fresh.has(trophy.id));
}

export function trophyProgress(profile: Profile, rule: TrophyRule): TrophyProgress | undefined {
  return isMilestone(rule) ? undefined : measure(profile, rule);
}

export function shopItemsOwned(profile: Profile): number {
  const { pets, hats, skins } = profile.inventory;
  return pets.length + hats.length + skins.filter((skin) => !STARTER_SKINS.includes(skin)).length;
}

function isEarned(profile: Profile, rule: TrophyRule): boolean {
  if (isMilestone(rule)) return hasMilestone(profile, rule);
  const { current, goal } = measure(profile, rule);
  return current >= goal;
}

function isMilestone(rule: TrophyRule): rule is MilestoneRule {
  return MILESTONES.includes(rule.kind);
}

function hasMilestone(profile: Profile, rule: MilestoneRule): boolean {
  switch (rule.kind) {
    case 'firstBoss':
      return LEVELS.some((level) => level.isBoss && starsOn(profile, level) > 0);
    case 'masteredRegion':
      return REGIONS.some(
        (region) => masteredShare(regionKeys(region), profile.keyStats) === FULL_SHARE,
      );
    case 'arenaGold':
      return bestEndlessMedal(profile.arena) === GOLD;
  }
}

function measure(profile: Profile, rule: MeasuredRule): TrophyProgress {
  switch (rule.kind) {
    case 'region':
      return levelsWithStars(profile, regionLevels(rule.regionId), 1);
    case 'playerLevel':
      return { current: levelProgress(profile.xp).level, goal: rule.level };
    case 'arenaWave':
      return { current: bestEndlessWave(profile.arena), goal: rule.wave };
    case 'stamps':
      return { current: profile.arena.daily?.totalStamps ?? 0, goal: rule.stamps };
    case 'weekStreak':
      return { current: profile.arena.daily?.bestWeekStreak ?? 0, goal: rule.weeks };
    case 'starStreak':
      return { current: longestThreeStarRun(profile), goal: rule.levels };
    case 'counter':
      return { current: profile.counters[rule.counter], goal: rule.goal };
    case 'starterSkins':
      return {
        current: STARTER_SKINS.filter((skin) => profile.counters.skinsPlayed.includes(skin)).length,
        goal: STARTER_SKINS.length,
      };
    case 'everyRegionThreeStars':
      return levelsWithStars(profile, courseFor(profile.wordLanguage).levels, THREE_STARS);
    case 'itemsOwned':
      return { current: shopItemsOwned(profile), goal: rule.count };
  }
}

function regionLevels(regionId: string): readonly Level[] {
  return REGIONS.find((region) => region.id === regionId)?.levels ?? [];
}

function levelsWithStars(
  profile: Profile,
  levels: readonly Level[],
  stars: number,
): TrophyProgress {
  const current = levels.filter((level) => starsOn(profile, level) >= stars).length;
  return { current, goal: Math.max(1, levels.length) };
}

function longestThreeStarRun(profile: Profile): number {
  let longest = 0;
  let run = 0;
  for (const level of courseFor(profile.wordLanguage).levels) {
    run = starsOn(profile, level) >= THREE_STARS ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

function starsOn(profile: Profile, level: Level): number {
  return profile.levelResults[level.id]?.stars ?? 0;
}
