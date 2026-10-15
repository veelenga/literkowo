import * as THREE from 'three';

export interface SkySpec {
  top: number;
  horizon: number;
  bottom: number;
  sun?: {
    color: number;
    size: number;
    glow: number;
  };
}

const SKY_RADIUS = 60;
const SKY_SEGMENTS = 24;
const NO_SUN_SIZE = 0;
const DRAW_AFTER_OPAQUE = 1000;

const VERTEX = `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = clip.xyww;
}
`;

const FRAGMENT = `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBottom;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;
uniform float uSunSize;
uniform float uSunGlow;
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  float height = direction.y;
  vec3 color = height > 0.0
    ? mix(uHorizon, uTop, pow(height, 0.55))
    : mix(uHorizon, uBottom, pow(-height, 0.45));
  float facing = max(dot(direction, uSunDirection), 0.0);
  float disc = uSunSize > 0.0 ? smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.85, facing) : 0.0;
  color += uSunColor * (disc * 2.5 + pow(facing, 24.0) * uSunGlow);
  gl_FragColor = vec4(color, 1.0);
}
`;

export function createSkyDome(spec: SkySpec, sunDirection: THREE.Vector3): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(spec.top) },
      uHorizon: { value: new THREE.Color(spec.horizon) },
      uBottom: { value: new THREE.Color(spec.bottom) },
      uSunColor: { value: new THREE.Color(spec.sun?.color ?? 0x000000) },
      uSunDirection: { value: sunDirection.clone().normalize() },
      uSunSize: { value: spec.sun?.size ?? NO_SUN_SIZE },
      uSunGlow: { value: spec.sun?.glow ?? 0 },
    },
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, SKY_SEGMENTS, SKY_SEGMENTS / 2),
    material,
  );
  dome.frustumCulled = false;
  dome.renderOrder = DRAW_AFTER_OPAQUE;
  dome.onBeforeRender = (_renderer, _scene, camera) => {
    dome.position.copy(camera.position);
    dome.updateMatrixWorld();
  };
  return dome;
}
