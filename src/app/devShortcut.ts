import { sfx } from '../audio/Sfx';
import { levelById, type Level } from '../course/catalog';
import { AVATARS, createProfile, type Profile } from '../profiles/Profile';

const LEVEL_PARAM = 'level';
const DEV_PROFILE_NAME = 'Test';

export function devLevelFromUrl(): Level | undefined {
  const id = new URLSearchParams(location.search).get(LEVEL_PARAM);
  return id ? levelById(id) : undefined;
}

export function devProfile(): Profile {
  return createProfile(DEV_PROFILE_NAME, AVATARS[0]);
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
