import type { LevelResult, Profile } from '../profiles/Profile';
import {
  afterStoryId,
  bossStoryId,
  FINALE_STORY_ID,
  INTRO_STORY_ID,
  storyScene,
  type StoryScene,
} from '../story/story';
import type { Level } from './catalog';
import { countRun, type Tally } from './counters';
import { courseFor } from './course';
import type { KeyStats } from './keyStats';
import { awardTrophies } from './trophies';

export interface Attempt extends LevelResult {
  lettersFreed: number;
  xp: number;
  coins: number;
  keyStats: KeyStats;
  tally: Tally;
}

const PERFECT_ACCURACY = 1;

export function isBetterResult(candidate: LevelResult, previous: LevelResult | undefined): boolean {
  if (!previous) return true;
  if (candidate.stars !== previous.stars) return candidate.stars > previous.stars;
  return candidate.score > previous.score;
}

export function recordResult(profile: Profile, level: Level, attempt: Attempt): Profile {
  const result: LevelResult = {
    stars: attempt.stars,
    score: attempt.score,
    accuracy: attempt.accuracy,
    wpm: attempt.wpm,
  };
  const improved = isBetterResult(result, profile.levelResults[level.id]);
  return awardTrophies({
    ...profile,
    totalScore: profile.totalScore + attempt.score,
    lettersFreed: profile.lettersFreed + attempt.lettersFreed,
    xp: profile.xp + attempt.xp,
    coins: profile.coins + attempt.coins,
    levelResults: improved ? { ...profile.levelResults, [level.id]: result } : profile.levelResults,
    keyStats: { ...profile.keyStats, ...attempt.keyStats },
    counters: countRun(profile.counters, {
      tally: attempt.tally,
      coins: attempt.coins,
      avatar: profile.avatar,
      perfect: hasStars(attempt) && attempt.accuracy >= PERFECT_ACCURACY,
      wpm: hasStars(attempt) ? attempt.wpm : 0,
    }),
  });
}

function hasStars(result: LevelResult): boolean {
  return result.stars > 0;
}

export function markStorySeen(profile: Profile, storyId: string): Profile {
  if (profile.seenStories.includes(storyId)) return profile;
  return { ...profile, seenStories: [...profile.seenStories, storyId] };
}

export function storyBefore(profile: Profile, level: Level): StoryScene | undefined {
  if (courseFor(profile.wordLanguage).isFirst(level)) return unseen(profile, INTRO_STORY_ID);
  if (level.isBoss) return unseen(profile, bossStoryId(level.regionId));
  return undefined;
}

export function storyAfter(profile: Profile, level: Level, stars: number): StoryScene | undefined {
  if (!level.isBoss || stars === 0) return undefined;
  const isLast = courseFor(profile.wordLanguage).next(level) === undefined;
  return unseen(profile, isLast ? FINALE_STORY_ID : afterStoryId(level.regionId));
}

function unseen(profile: Profile, storyId: string): StoryScene | undefined {
  return profile.seenStories.includes(storyId) ? undefined : storyScene(storyId);
}
