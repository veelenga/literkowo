import * as THREE from 'three';
import { isCachedAsset, type DisposableAsset } from './assetCache';

type Renderable = THREE.Mesh | THREE.Points | THREE.Line;

export function disposeObject(root: THREE.Object3D): void {
  const resources = new OwnedResources();
  root.traverse((object) => resources.collect(object));
  resources.dispose();
}

function isRenderable(object: THREE.Object3D): object is Renderable {
  return (
    object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line
  );
}

function materialsOf(material: THREE.Material | THREE.Material[]): THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function texturesOf(material: THREE.Material): THREE.Texture[] {
  const values: unknown[] = Object.values(material);
  if (material instanceof THREE.ShaderMaterial) {
    for (const uniform of Object.values(material.uniforms)) values.push(uniform.value);
  }
  return values.filter((value) => value instanceof THREE.Texture);
}

class OwnedResources {
  private readonly assets = new Set<DisposableAsset>();
  private readonly holders = new Set<DisposableAsset>();

  collect(object: THREE.Object3D): void {
    if (object instanceof THREE.Light || object instanceof THREE.InstancedMesh) {
      this.holders.add(object);
    }
    if (object instanceof THREE.SkinnedMesh) this.holders.add(object.skeleton);
    if (object instanceof THREE.Sprite) this.addMaterials(object.material);
    if (!isRenderable(object)) return;
    this.addAsset(object.geometry);
    this.addMaterials(object.material);
  }

  dispose(): void {
    this.holders.forEach((holder) => holder.dispose());
    this.assets.forEach((asset) => asset.dispose());
  }

  private addMaterials(material: THREE.Material | THREE.Material[]): void {
    for (const entry of materialsOf(material)) {
      if (isCachedAsset(entry)) continue;
      this.assets.add(entry);
      texturesOf(entry).forEach((texture) => this.addAsset(texture));
    }
  }

  private addAsset(asset: DisposableAsset): void {
    if (!isCachedAsset(asset)) this.assets.add(asset);
  }
}
