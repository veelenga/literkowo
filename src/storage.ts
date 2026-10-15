const fallback = new Map<string, string>();

export function readStorage(key: string): string | null {
  return fallback.get(key) ?? readPersistent(key);
}

export function writeStorage(key: string, value: string): void {
  if (attempt(() => localStorage.setItem(key, value))) fallback.delete(key);
  else fallback.set(key, value);
}

export function readChoice<T extends string>(key: string, choices: readonly T[], fallback: T): T {
  const stored = readStorage(key);
  return choices.find((choice) => choice === stored) ?? fallback;
}

export function removeStorage(key: string): void {
  fallback.delete(key);
  attempt(() => localStorage.removeItem(key));
}

function readPersistent(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function attempt(action: () => void): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}
