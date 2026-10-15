import { GOLD } from '../arena/medals';
import type { EndlessBest } from '../arena/record';
import type { Profile } from '../profiles/Profile';
import { LEVELS, REGIONS, type Level } from './catalog';
import { masteredShare, regionKeys } from './mastery';
import { TROPHIES, type Trophy, type TrophyRule } from './shop';
import { levelProgress } from './xp';

const FULL_SHARE = 1;

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

function isEarned(profile: Profile, rule: TrophyRule): boolean {
  switch (rule.kind) {
    case 'firstBoss':
      return LEVELS.some((level) => level.isBoss && hasStar(profile, level));
    case 'region':
      return isRegionCleared(profile, rule.regionId);
    case 'playerLevel':
      return levelProgress(profile.xp).level >= rule.level;
    case 'masteredRegion':
      return REGIONS.some(
        (region) => masteredShare(regionKeys(region), profile.keyStats) === FULL_SHARE,
      );
    case 'arenaWave':
      return endlessBests(profile).some((best) => best.wave >= rule.wave);
    case 'arenaGold':
      return endlessBests(profile).some((best) => best.medal === GOLD);
  }
}

function endlessBests(profile: Profile): EndlessBest[] {
  return Object.values(profile.arena.endless);
}

function isRegionCleared(profile: Profile, regionId: string): boolean {
  const region = REGIONS.find((candidate) => candidate.id === regionId);
  return region !== undefined && region.levels.every((level) => hasStar(profile, level));
}

function hasStar(profile: Profile, level: Level): boolean {
  return (profile.levelResults[level.id]?.stars ?? 0) > 0;
}
