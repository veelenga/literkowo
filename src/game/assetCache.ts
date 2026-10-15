export interface DisposableAsset {
  dispose(): void;
}

export interface AssetCache<T extends DisposableAsset> {
  get(key: string, create: () => T): T;
  dispose(): void;
}

const cachedAssets = new WeakSet<object>();

export function isCachedAsset(asset: object): boolean {
  return cachedAssets.has(asset);
}

class KeyedAssetCache<T extends DisposableAsset> implements AssetCache<T> {
  private readonly entries = new Map<string, T>();

  get(key: string, create: () => T): T {
    const cached = this.entries.get(key);
    if (cached) return cached;
    const created = create();
    this.entries.set(key, created);
    cachedAssets.add(created);
    return created;
  }

  dispose(): void {
    for (const asset of this.entries.values()) {
      cachedAssets.delete(asset);
      asset.dispose();
    }
    this.entries.clear();
  }
}

export function createAssetCache<T extends DisposableAsset>(): AssetCache<T> {
  return new KeyedAssetCache<T>();
}
