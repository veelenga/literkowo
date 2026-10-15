import * as THREE from 'three';
import { isCachedAsset } from '../../assetCache';

interface Faded {
  readonly material: THREE.Material;
  readonly opacity: number;
}

export class FadingMaterials {
  private readonly faded: Faded[] = [];

  constructor(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.Material) {
        object.material = this.own(object.material);
      }
    });
  }

  apply(level: number): void {
    for (const { material, opacity } of this.faded) material.opacity = opacity * level;
  }

  private own(shared: THREE.Material): THREE.Material {
    const material = isCachedAsset(shared) ? shared.clone() : shared;
    material.transparent = true;
    material.depthWrite = false;
    material.needsUpdate = true;
    this.faded.push({ material, opacity: material.opacity });
    return material;
  }
}
