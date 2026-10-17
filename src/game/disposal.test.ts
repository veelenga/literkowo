import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { trackDisposal } from '../testing/disposal';
import { createAssetCache, isCachedAsset } from './assetCache';
import { disposeObject } from './disposal';

describe('createAssetCache', () => {
  it('creates each asset once and marks it as cached', () => {
    const cache = createAssetCache<THREE.BufferGeometry>();
    const first = cache.get('box', () => new THREE.BoxGeometry());
    const second = cache.get('box', () => new THREE.BoxGeometry());
    expect(second).toBe(first);
    expect(isCachedAsset(first)).toBe(true);
    expect(isCachedAsset(new THREE.BoxGeometry())).toBe(false);
  });

  it('disposes its own assets and forgets them', () => {
    const cache = createAssetCache<THREE.Material>();
    const material = cache.get('basic', () => new THREE.MeshBasicMaterial());
    const counts = trackDisposal(material);
    cache.dispose();
    expect(counts.get(material)).toBe(1);
    expect(isCachedAsset(material)).toBe(false);
    expect(cache.get('basic', () => new THREE.MeshBasicMaterial())).not.toBe(material);
  });
});

describe('disposeObject', () => {
  it('frees owned resources once and skips cached ones', () => {
    const geometries = createAssetCache<THREE.BufferGeometry>();
    const textures = createAssetCache<THREE.Texture>();
    const materials = createAssetCache<THREE.Material>();
    const sharedGeometry = geometries.get('shared', () => new THREE.BoxGeometry());
    const sharedTexture = textures.get('shared', () => new THREE.Texture());
    const sharedMaterial = materials.get('shared', () => new THREE.MeshBasicMaterial());
    const ownGeometry = new THREE.BoxGeometry();
    const ownTexture = new THREE.Texture();
    const uniformTexture = new THREE.Texture();
    const ownMaterial = new THREE.MeshBasicMaterial({ map: sharedTexture, alphaMap: ownTexture });
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: uniformTexture } },
    });
    const root = new THREE.Group();
    root.add(
      new THREE.Mesh(sharedGeometry, ownMaterial),
      new THREE.Mesh(ownGeometry, sharedMaterial),
      new THREE.Mesh(ownGeometry, ownMaterial),
      new THREE.Points(new THREE.BufferGeometry(), shaderMaterial),
    );
    const counts = trackDisposal(
      sharedGeometry,
      sharedTexture,
      sharedMaterial,
      ownGeometry,
      ownTexture,
      uniformTexture,
      ownMaterial,
      shaderMaterial,
    );

    disposeObject(root);

    expect(counts.get(sharedGeometry)).toBe(0);
    expect(counts.get(sharedTexture)).toBe(0);
    expect(counts.get(sharedMaterial)).toBe(0);
    expect(counts.get(ownGeometry)).toBe(1);
    expect(counts.get(ownTexture)).toBe(1);
    expect(counts.get(uniformTexture)).toBe(1);
    expect(counts.get(ownMaterial)).toBe(1);
    expect(counts.get(shaderMaterial)).toBe(1);
  });

  it('releases instance buffers and light shadow maps', () => {
    const instanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
      2,
    );
    const sun = new THREE.DirectionalLight();
    const shadowMap = new THREE.WebGLRenderTarget(1, 1);
    sun.shadow.map = shadowMap;
    const root = new THREE.Group();
    root.add(instanced, sun);
    const counts = trackDisposal(instanced, shadowMap);

    disposeObject(root);

    expect(counts.get(instanced)).toBe(1);
    expect(counts.get(shadowMap)).toBe(1);
  });

  it('leaves the sprite geometry that three shares between sprites', () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
    const counts = trackDisposal(sprite.geometry, sprite.material);

    disposeObject(sprite);

    expect(counts.get(sprite.geometry)).toBe(0);
    expect(counts.get(sprite.material)).toBe(1);
  });
});
