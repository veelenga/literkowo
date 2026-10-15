import type * as THREE from 'three';

const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const MIN_LUMINANCE = 0.01;

export function luminanceOf(color: THREE.Color): number {
  const luminance = RED_WEIGHT * color.r + GREEN_WEIGHT * color.g + BLUE_WEIGHT * color.b;
  return Math.max(MIN_LUMINANCE, luminance);
}

export function withLuminance(color: THREE.Color, luminance: number): THREE.Color {
  return color.multiplyScalar(luminance / luminanceOf(color));
}

export function setEmissiveLuminance(
  material: THREE.MeshStandardMaterial,
  luminance: number,
): void {
  material.emissiveIntensity = luminance / luminanceOf(material.emissive);
}
