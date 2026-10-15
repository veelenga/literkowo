export type AssetCache<T> = (key: string, create: () => T) => T;

export function createAssetCache<T>(): AssetCache<T> {
  const entries = new Map<string, T>();
  return (key, create) => {
    const cached = entries.get(key);
    if (cached) return cached;
    const created = create();
    entries.set(key, created);
    return created;
  };
}
