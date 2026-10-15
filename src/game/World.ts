import * as THREE from 'three';
import { AmbientParticles } from './AmbientParticles';
import { cloud } from './props';
import type { Theme } from './themes';

const GROUND_SIZE = 90;
const GROUND_SEGMENTS = 54;
const GROUND_BUMP = 0.45;
const CLEARING_RADIUS = 7;
const SCATTER_RADIUS = 36;
const CLOUD_HEIGHT = 11;
const CLOUD_RANGE = 40;
const CLOUD_SPEED = 0.6;
const WATER_INNER = 21;
const WATER_OUTER = 70;
const WATER_WAVE = 0.08;

export class World {
  private readonly clouds: THREE.Group[] = [];
  private readonly ambient: AmbientParticles | undefined;
  private water: THREE.Mesh | undefined;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly theme: Theme,
  ) {
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.sky, theme.fog[0], theme.fog[1]);
    scene.add(this.buildGround());
    theme.props.forEach((spec) => this.scatter(spec.count, spec.build, spec.innerScale ?? 1));
    this.addLights();
    this.addClouds();
    this.addWater();
    if (theme.ambient) {
      this.ambient = new AmbientParticles(theme.ambient);
      scene.add(this.ambient.points);
    }
  }

  update(delta: number, elapsed: number): void {
    this.ambient?.update(delta, elapsed);
    this.clouds.forEach((group) => {
      group.position.x += CLOUD_SPEED * delta;
      if (group.position.x > CLOUD_RANGE) group.position.x = -CLOUD_RANGE;
    });
    if (this.water) this.water.position.y = -0.05 + Math.sin(elapsed * 1.2) * WATER_WAVE;
  }

  private buildGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(
      GROUND_SIZE,
      GROUND_SIZE,
      GROUND_SEGMENTS,
      GROUND_SEGMENTS,
    );
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colors: number[] = [];
    const light = new THREE.Color(this.theme.ground[0]);
    const dark = new THREE.Color(this.theme.ground[1]);
    for (let i = 0; i < position.count; i += 1) {
      const distance = Math.hypot(position.getX(i), position.getZ(i));
      const inClearing = distance < CLEARING_RADIUS;
      position.setY(i, inClearing ? 0 : (Math.random() - 0.5) * GROUND_BUMP);
      const color = light.clone().lerp(dark, Math.random() * 0.6 + (inClearing ? 0.1 : 0.3));
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }),
    );
    mesh.receiveShadow = true;
    return mesh;
  }

  private scatter(count: number, build: () => THREE.Object3D, innerScale: number): void {
    const maxRadius = this.theme.water ? WATER_INNER - 1 : SCATTER_RADIUS;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const minRadius = CLEARING_RADIUS * innerScale;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const object = build();
      object.position.set(Math.cos(angle) * radius, object.position.y, Math.sin(angle) * radius);
      this.scene.add(object);
    }
  }

  private addLights(): void {
    const [skyColor, groundColor, intensity] = this.theme.hemisphere;
    this.scene.add(new THREE.HemisphereLight(skyColor, groundColor, intensity));
    const sun = new THREE.DirectionalLight(this.theme.sun[0], this.theme.sun[1]);
    sun.position.set(14, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  private addClouds(): void {
    for (let i = 0; i < this.theme.clouds; i += 1) {
      const group = cloud();
      group.position.set(
        (Math.random() - 0.5) * CLOUD_RANGE * 2,
        CLOUD_HEIGHT + Math.random() * 3,
        (Math.random() - 0.5) * CLOUD_RANGE,
      );
      this.scene.add(group);
      this.clouds.push(group);
    }
  }

  private addWater(): void {
    if (!this.theme.water) return;
    const geometry = new THREE.RingGeometry(WATER_INNER, WATER_OUTER, 48, 1);
    geometry.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: this.theme.water, transparent: true, opacity: 0.85 }),
    );
    this.scene.add(this.water);
  }
}
