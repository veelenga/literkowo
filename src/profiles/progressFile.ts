import { practiceDay } from '../course/keyStats';
import type { Profile } from './Profile';
import { parseProfiles } from './profileSchema';

export const PROGRESS_FILE_TYPE = 'application/json';
export const PROGRESS_FILE_EXTENSION = '.json';
export const MAX_PROGRESS_FILE_BYTES = 5_000_000;
const PROGRESS_FILE_PREFIX = 'literkowo-';

export function progressFileName(date: Date): string {
  return `${PROGRESS_FILE_PREFIX}${practiceDay(date)}${PROGRESS_FILE_EXTENSION}`;
}

export function parseProgressFile(json: string): Profile[] | undefined {
  const { profiles, intact } = parseProfiles(json);
  return intact && profiles.length > 0 ? profiles : undefined;
}

export async function readProgressFile(file: Blob): Promise<Profile[] | undefined> {
  if (file.size > MAX_PROGRESS_FILE_BYTES) return undefined;
  try {
    return parseProgressFile(await file.text());
  } catch {
    return undefined;
  }
}

export function mergeProfiles(
  current: readonly Profile[],
  imported: readonly Profile[],
): Profile[] {
  const incoming = new Map(imported.map((profile) => [profile.id, profile]));
  const known = new Set(current.map((profile) => profile.id));
  const kept = current.map((profile) => incoming.get(profile.id) ?? profile);
  const added = [...incoming.values()].filter((profile) => !known.has(profile.id));
  return [...kept, ...added];
}
