import { difficultyAtLevel } from '../arena/difficulty';
import type { ArenaChoice } from '../arena/endlessPlan';
import { keySetById } from '../arena/keySets';
import { sfx } from '../audio/Sfx';
import { levelById, type Level } from '../course/catalog';
import { AVATARS, createProfile, DEFAULT_WORD_LANGUAGE, type Profile } from '../profiles/Profile';

const LEVEL_PARAM = 'level';
const ARENA_PARAM = 'arena';
const ARENA_PATTERN = /^(\p{L}+)-(\d)$/u;
const DEV_PROFILE_NAME = 'Test';

export function devLevelFromUrl(): Level | undefined {
  const id = new URLSearchParams(location.search).get(LEVEL_PARAM);
  return id ? levelById(id) : undefined;
}

export function devArenaFromUrl(): ArenaChoice | undefined {
  const match = new URLSearchParams(location.search).get(ARENA_PARAM)?.match(ARENA_PATTERN);
  if (!match) return undefined;
  const [, keySetId, level] = match;
  const keySet = keySetById(keySetId, DEFAULT_WORD_LANGUAGE);
  const difficulty = difficultyAtLevel(Number(level));
  return keySet && difficulty ? { keySet, difficulty } : undefined;
}

export function devProfile(active?: Profile): Profile {
  const profile = createProfile(DEV_PROFILE_NAME, active?.avatar ?? AVATARS[0]);
  if (!active) return profile;
  return { ...profile, inventory: active.inventory, equipped: active.equipped };
}

export function unlockAudioOnFirstInput(): void {
  const controller = new AbortController();
  const unlock = () => {
    controller.abort();
    sfx.unlock();
  };
  window.addEventListener('pointerdown', unlock, { signal: controller.signal });
  window.addEventListener('keydown', unlock, { signal: controller.signal });
}
