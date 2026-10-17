import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { hatSpec } from '../course/shop';
import { Player } from './Player';
import { isMesh } from './threeGuards';

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

const CLIP_NAMES = ['idle', 'attack-melee-right', 'emote-no'];
const HEAD_SIZE = 8;
const NECK_HEIGHT = 10;

function fakeCharacter(): THREE.Group {
  const material = new THREE.MeshBasicMaterial();
  const body = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE, NECK_HEIGHT, 4), material);
  body.position.y = NECK_HEIGHT / 2;
  const headGeometry = new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE);
  const head = new THREE.Mesh(headGeometry.translate(0, HEAD_SIZE / 2, 0), material);
  head.name = 'head';
  head.position.y = NECK_HEIGHT;
  return new THREE.Group().add(body, head);
}

function loadFakeCharacter(): THREE.Object3D {
  const scene = fakeCharacter();
  const animations = CLIP_NAMES.map((name) => new THREE.AnimationClip(name, 1, []));
  loader.pending.at(-1)!({ scene, animations });
  return scene.getObjectByName('head')!;
}

describe('Player', () => {
  it('wears the hat on top of the head once the model loads', () => {
    const player = new Player('c');
    player.setHat(hatSpec('crown'));
    const head = loadFakeCharacter();

    const [hat] = head.children;
    expect(hat.position.y).toBeCloseTo(HEAD_SIZE);
    expect(hat.scale.x).toBeCloseTo(HEAD_SIZE);
    player.dispose();
  });

  it('frees the previous hat when the hat changes', () => {
    const player = new Player('d');
    const head = loadFakeCharacter();
    player.setHat(hatSpec('cap'));
    const counter = disposalCounter();
    head.children[0].traverse((child) => {
      if (isMesh(child)) counter.track(child.geometry);
    });

    player.setHat(hatSpec('halo'));

    expect(counter.count).toBeGreaterThan(0);
    expect(head.children).toHaveLength(1);
    player.setHat(undefined);
    expect(head.children).toHaveLength(0);
    player.dispose();
  });

  it('frees the placeholder and contact shadow on dispose', () => {
    const player = new Player('a');
    const counter = disposalCounter();
    player.object.traverse((child) => {
      if (!isMesh(child)) return;
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
