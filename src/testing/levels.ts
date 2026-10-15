import { levelById, type Level } from '../course/catalog';

export function requireLevel(id: string): Level {
  const level = levelById(id);
  if (!level) throw new Error(`Missing level ${id}`);
  return level;
}
