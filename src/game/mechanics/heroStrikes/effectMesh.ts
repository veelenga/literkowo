import * as THREE from 'three';

const EFFECT_RENDER_ORDER = 10;
const BACKGROUND_OCCLUSION = 0.55;

export function createEffectMesh<T extends THREE.BufferGeometry>(
  geometry: T,
  vertexShader: string,
  fragmentShader: string,
): THREE.Mesh<T, THREE.ShaderMaterial> {
  const mesh = new THREE.Mesh(geometry, createEffectMaterial(vertexShader, fragmentShader));
  mesh.frustumCulled = false;
  mesh.renderOrder = EFFECT_RENDER_ORDER;
  mesh.visible = false;
  return mesh;
}

export function dynamicAttribute<T extends THREE.BufferAttribute>(attribute: T): T {
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

function createEffectMaterial(vertexShader: string, fragmentShader: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    defines: { OCCLUSION: BACKGROUND_OCCLUSION.toFixed(2) },
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}
