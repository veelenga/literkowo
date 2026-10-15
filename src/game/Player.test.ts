import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { Player } from './Player';

type LoadCallback = (gltf: Pick<GLTF, 'scene' | 'animations'>) => void;

const loader = vi.hoisted(() => {
  const pending: LoadCallback[] = [];
  return { pending };
});

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(_url: string, onLoad: LoadCallback): void {
      loader.pending.push(onLoad);
    }
  },
}));

function disposalCounter(): {
  track(asset: THREE.EventDispatcher<{ dispose: object }>): void;
  count: number;
} {
  const counter = {
    count: 0,
    track(asset: THREE.EventDispatcher<{ dispose: object }>) {
      asset.addEventListener('dispose', () => (counter.count += 1));
    },
  };
  return counter;
}

describe('Player', () => {
  it('frees the placeholder and contact shadow on dispose', () => {
    const player = new Player('a');
    const counter = disposalCounter();
    player.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const { geometry, material } = child;
      counter.track(geometry);
      if (!(
        material instanceof THREE.MeshBasicMaterial ||
        material instanceof THREE.MeshStandardMaterial
      ))
        return;
      counter.track(material);
      if (material.map) counter.track(material.map);
    });

    player.dispose();

    expect(counter.count).toBe(5);
  });

  it('frees a model that finishes loading after dispose without attaching it', () => {
    const player = new Player('b');
    const onLoad = loader.pending.at(-1)!;
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    const scene = new THREE.Group().add(new THREE.Mesh(geometry, material));
    const counter = disposalCounter();
    counter.track(geometry);
    counter.track(material);

    player.dispose();
    onLoad({ scene, animations: [] });

    expect(counter.count).toBe(2);
    expect(scene.parent).toBeNull();
  });
});
