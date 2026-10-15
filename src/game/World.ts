import * as THREE from 'three';

const GROUND_SIZE = 80;
const GROUND_SEGMENTS = 48;
const GROUND_BUMP = 0.45;
const CLEARING_RADIUS = 7;
const TREE_COUNT = 90;
const ROCK_COUNT = 30;
const FLOWER_COUNT = 70;
const SCATTER_RADIUS = 34;

const COLORS = {
  grassLight: 0x8fd16b,
  grassDark: 0x5fae4e,
  trunk: 0x8b5a2b,
  foliage: [0x3f9a5a, 0x4fae6b, 0x2f8a4f, 0x6cc27e],
  rock: 0x9aa3ad,
  flower: [0xffd166, 0xef476f, 0xf8f9fa, 0x8ecae6],
};

export function buildWorld(scene: THREE.Scene): void {
  scene.add(buildGround());
  scatter(scene, TREE_COUNT, buildTree);
  scatter(scene, ROCK_COUNT, buildRock);
  scatter(scene, FLOWER_COUNT, buildFlower, 0.6);
  addLights(scene);
}

function buildGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    GROUND_SIZE,
    GROUND_SIZE,
    GROUND_SEGMENTS,
    GROUND_SEGMENTS,
  );
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors: number[] = [];
  const light = new THREE.Color(COLORS.grassLight);
  const dark = new THREE.Color(COLORS.grassDark);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const distance = Math.hypot(x, z);
    const bump = distance < CLEARING_RADIUS ? 0 : (Math.random() - 0.5) * GROUND_BUMP;
    position.setY(i, bump);
    const mix = Math.random() * 0.6 + (distance < CLEARING_RADIUS ? 0.1 : 0.3);
    const color = light.clone().lerp(dark, mix);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function buildTree(): THREE.Group {
  const tree = new THREE.Group();
  const height = 1.2 + Math.random() * 1.6;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, height, 6),
    new THREE.MeshStandardMaterial({ color: COLORS.trunk, flatShading: true }),
  );
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliageColor = COLORS.foliage[Math.floor(Math.random() * COLORS.foliage.length)];
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: foliageColor,
    flatShading: true,
  });
  const layers = 2 + Math.floor(Math.random() * 2);
  for (let layer = 0; layer < layers; layer += 1) {
    const radius = 1.3 - layer * 0.3;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 1.4, 7), foliageMaterial);
    cone.position.y = height + layer * 0.8;
    cone.castShadow = true;
    tree.add(cone);
  }
  tree.rotation.y = Math.random() * Math.PI * 2;
  return tree;
}

function buildRock(): THREE.Mesh {
  const size = 0.3 + Math.random() * 0.7;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color: COLORS.rock, flatShading: true }),
  );
  rock.position.y = size * 0.4;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  return rock;
}

function buildFlower(): THREE.Group {
  const flower = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4),
    new THREE.MeshStandardMaterial({ color: COLORS.grassDark }),
  );
  stem.position.y = 0.2;
  const color = COLORS.flower[Math.floor(Math.random() * COLORS.flower.length)];
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 5),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }),
  );
  head.position.y = 0.42;
  flower.add(stem, head);
  return flower;
}

function scatter(
  scene: THREE.Scene,
  count: number,
  factory: () => THREE.Object3D,
  innerScale = 1,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const minRadius = CLEARING_RADIUS * innerScale;
    const radius = minRadius + Math.random() * (SCATTER_RADIUS - minRadius);
    const object = factory();
    object.position.x = Math.cos(angle) * radius;
    object.position.z = Math.sin(angle) * radius;
    scene.add(object);
  }
}

function addLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x4f7a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
}
