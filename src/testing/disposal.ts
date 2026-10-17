import type * as THREE from 'three';

export function trackDisposal(
  ...assets: THREE.EventDispatcher<{ dispose: object }>[]
): Map<object, number> {
  const counts = new Map<object, number>();
  for (const asset of assets) {
    counts.set(asset, 0);
    asset.addEventListener('dispose', () => counts.set(asset, (counts.get(asset) ?? 0) + 1));
  }
  return counts;
}
