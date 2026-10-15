import * as THREE from 'three';

const SPRITE_SIZE = 64;
const GLOW_STOPS: Array<[offset: number, alpha: number]> = [
  [0, 1],
  [0.18, 0.9],
  [0.42, 0.35],
  [0.7, 0.08],
  [1, 0],
];

let glow: THREE.Texture | undefined;

export function glowSprite(): THREE.Texture {
  if (glow) return glow;
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const half = SPRITE_SIZE / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    GLOW_STOPS.forEach(([offset, alpha]) =>
      gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`),
    );
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  }
  glow = new THREE.CanvasTexture(canvas);
  return glow;
}
