import * as THREE from 'three';

type Material = THREE.MeshStandardMaterial;

const flat = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): Material =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, ...extra });

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const between = (min: number, max: number): number => min + Math.random() * (max - min);

function shadowed<T extends THREE.Object3D>(object: T): T {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return object;
}

export function coneTree(foliage: number[], trunk = 0x8b5a2b): THREE.Group {
  const tree = new THREE.Group();
  const height = between(1.2, 2.8);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, height, 6), flat(trunk));
  stem.position.y = height / 2;
  tree.add(stem);
  const material = flat(pick(foliage));
  const layers = 2 + Math.floor(Math.random() * 2);
  for (let layer = 0; layer < layers; layer += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3 - layer * 0.3, 1.4, 7), material);
    cone.position.y = height + layer * 0.8;
    tree.add(cone);
  }
  tree.rotation.y = Math.random() * Math.PI * 2;
  return shadowed(tree);
}

export function roundTree(foliage: number[], trunk = 0x7a4a22): THREE.Group {
  const tree = new THREE.Group();
  const height = between(1.4, 2.4);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, height, 6), flat(trunk));
  stem.position.y = height / 2;
  tree.add(stem);
  const material = flat(pick(foliage));
  const blobs = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blobs; i += 1) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(between(0.7, 1.1), 0), material);
    blob.position.set(between(-0.6, 0.6), height + between(0, 0.9), between(-0.6, 0.6));
    tree.add(blob);
  }
  return shadowed(tree);
}

export function snowPine(): THREE.Group {
  const tree = coneTree([0x2f6b4f, 0x3a7a5a], 0x5b3b1e);
  tree.children.slice(1).forEach((layer) => {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.5, 7), flat(0xf4f7fb));
    cap.position.y = layer.position.y + 0.45;
    tree.add(cap);
  });
  return shadowed(tree);
}

export function palm(): THREE.Group {
  const tree = new THREE.Group();
  const height = between(2.4, 3.6);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, height, 6), flat(0xa97142));
  trunk.position.y = height / 2;
  trunk.rotation.z = between(-0.15, 0.15);
  tree.add(trunk);
  const leafMaterial = flat(0x3fae5e, { side: THREE.DoubleSide });
  const leaves = 6;
  for (let i = 0; i < leaves; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.9, 4), leafMaterial);
    leaf.scale.set(1, 1, 0.15);
    leaf.position.y = height;
    leaf.rotation.z = Math.PI / 2 - 0.5;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / leaves) * Math.PI * 2;
    leaf.position.x = 0.8;
    pivot.add(leaf);
    pivot.position.y = 0;
    tree.add(pivot);
  }
  return shadowed(tree);
}

export function rock(color = 0x9aa3ad): THREE.Mesh {
  const size = between(0.3, 1.0);
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), flat(color));
  mesh.position.y = size * 0.4;
  mesh.rotation.set(Math.random(), Math.random(), Math.random());
  mesh.castShadow = true;
  return mesh;
}

export function flower(colors: number[]): THREE.Group {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), flat(0x4f8f3e));
  stem.position.y = 0.2;
  const color = pick(colors);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 5),
    flat(color, { emissive: color, emissiveIntensity: 0.3 }),
  );
  head.position.y = 0.42;
  group.add(stem, head);
  return group;
}

export function mushroom(): THREE.Group {
  const group = new THREE.Group();
  const height = between(0.25, 0.5);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height, 6), flat(0xf1e4c8));
  stem.position.y = height / 2;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(height * 0.6, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    flat(pick([0xd94646, 0xe8a33d]), { emissive: 0x2a0a0a }),
  );
  cap.position.y = height;
  group.add(stem, cap);
  return shadowed(group);
}

export function stalagmite(): THREE.Mesh {
  const height = between(0.8, 2.6);
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(between(0.3, 0.6), height, 5), flat(0x4b4f63));
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  return mesh;
}

export function crystalCluster(colors: number[]): THREE.Group {
  const group = new THREE.Group();
  const shards = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < shards; i += 1) {
    const color = pick(colors);
    const height = between(0.5, 1.4);
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, height, 5),
      flat(color, { emissive: color, emissiveIntensity: 0.9 }),
    );
    shard.position.set(between(-0.3, 0.3), height / 2, between(-0.3, 0.3));
    shard.rotation.set(between(-0.3, 0.3), 0, between(-0.3, 0.3));
    group.add(shard);
  }
  return group;
}

export function shell(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.12, 0.05, 32, 6),
    flat(pick([0xfff0d6, 0xf7c6a3, 0xe9a0a0])),
  );
  mesh.position.y = 0.12;
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function bush(colors: number[]): THREE.Mesh {
  const size = between(0.4, 0.8);
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), flat(pick(colors)));
  mesh.position.y = size * 0.6;
  mesh.castShadow = true;
  return mesh;
}

export function cloud(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const puffs = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < puffs; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(between(0.7, 1.3), 7, 6), material);
    puff.position.set(i * 1.1 - puffs * 0.5, between(-0.2, 0.2), between(-0.4, 0.4));
    puff.scale.y = 0.6;
    group.add(puff);
  }
  return group;
}
