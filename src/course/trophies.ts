import type { Profile } from '../profiles/Profile';
import { LEVELS, REGIONS, type Level } from './catalog';
import { masteredShare, regionKeys } from './mastery';
import { TROPHIES, type TrophyRule } from './shop';
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
  }
}

function isRegionCleared(profile: Profile, regionId: string): boolean {
  const region = REGIONS.find((candidate) => candidate.id === regionId);
  return region !== undefined && region.levels.every((level) => hasStar(profile, level));
}

function hasStar(profile: Profile, level: Level): boolean {
  return (profile.levelResults[level.id]?.stars ?? 0) > 0;
}
