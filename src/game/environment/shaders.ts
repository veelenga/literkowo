import { NOISE_PERIOD } from './noiseTexture';

export const NOISE_GLSL = `
uniform sampler2D uKitNoise;
float kitNoise(vec2 p) {
  return texture2D(uKitNoise, p * ${(1 / NOISE_PERIOD).toFixed(4)}).r;
}
float kitFbm(vec2 p) {
  return kitNoise(p) * 0.7 + kitNoise(p * 2.03 + vec2(5.3, 1.7)) * 0.3;
}
`;
