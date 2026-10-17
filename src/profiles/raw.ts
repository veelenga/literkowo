export type RawRecord = Readonly<Record<string, unknown>>;

const FULL_SHARE = 1;
const NO_COUNT = 0;

export function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function countOf(value: unknown): number {
  return isCount(value) ? value : NO_COUNT;
}

export function isWholeNumber(value: unknown): value is number {
  return isCount(value) && Number.isInteger(value);
}

export function wholeOf(value: unknown): number {
  return isWholeNumber(value) ? value : NO_COUNT;
}

export function isShare(value: unknown): value is number {
  return isCount(value) && value <= FULL_SHARE;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

export function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

export function entriesOf<T>(
  value: unknown,
  read: (entry: unknown, key: string) => T | undefined,
): Record<string, T> {
  if (!isRecord(value)) return {};
  const entries: Record<string, T> = {};
  for (const [key, entry] of Object.entries(value)) {
    const parsed = read(entry, key);
    if (parsed !== undefined) entries[key] = parsed;
  }
  return entries;
}
