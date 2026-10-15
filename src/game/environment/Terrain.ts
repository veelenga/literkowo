import * as THREE from 'three';
import type { MaterialKit } from './materials';
import { hash2 } from './noise';

export interface TileSurface {
  top: THREE.Color;
  side: THREE.Color;
}

export interface TerrainSpec {
  cell: number;
  step: number;
  height(x: number, z: number): number;
  surface(x: number, z: number, height: number): TileSurface;
  lip?: number;
  strata?: number;
  variation?: number;
  roughness?: number;
  metalness?: number;
}

interface Neighbour {
  di: number;
  dj: number;
}

const EXTENT = { minX: -54, maxX: 54, minZ: -42, maxZ: 22 };
const NEIGHBOURS: Neighbour[] = [
  { di: 1, dj: 0 },
  { di: -1, dj: 0 },
  { di: 0, dj: 1 },
  { di: 0, dj: -1 },
];
const LIP_SHADE = 0.86;
const DEFAULT_STRATA = 0.07;
const DEFAULT_VARIATION = 0.05;
const MIN_SIDE_SHADE = 0.45;
const VARIATION_SEED = 77;
const EPSILON = 0.001;

class MeshBuffers {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colors: number[] = [];
  private readonly ab = new THREE.Vector3();
  private readonly ac = new THREE.Vector3();

  quad(corners: THREE.Vector3[], normal: THREE.Vector3, color: THREE.Color): void {
    this.ab.subVectors(corners[1], corners[0]);
    this.ac.subVectors(corners[2], corners[0]);
    const facing = this.ab.cross(this.ac).dot(normal);
    const order = facing >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    for (const index of order) {
      const corner = corners[index];
      this.positions.push(corner.x, corner.y, corner.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(color.r, color.g, color.b);
    }
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    return geometry;
  }
}

export class Terrain {
  readonly mesh: THREE.Mesh;
  readonly cell: number;
  private readonly iMin: number;
  private readonly jMin: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly heights: Float32Array;
  private readonly surfaces: TileSurface[] = [];

  constructor(
    private readonly spec: TerrainSpec,
    materials: MaterialKit,
  ) {
    this.cell = spec.cell;
    this.iMin = Math.floor(EXTENT.minX / spec.cell);
    this.jMin = Math.floor(EXTENT.minZ / spec.cell);
    this.cols = Math.ceil(EXTENT.maxX / spec.cell) - this.iMin;
    this.rows = Math.ceil(EXTENT.maxZ / spec.cell) - this.jMin;
    this.heights = new Float32Array(this.cols * this.rows);
    this.sample();
    this.mesh = new THREE.Mesh(
      this.build(),
      materials.surface({ roughness: spec.roughness, metalness: spec.metalness }),
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  heightAt(x: number, z: number): number {
    const i = Math.floor(x / this.cell) - this.iMin;
    const j = Math.floor(z / this.cell) - this.jMin;
    if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return 0;
    return this.heights[j * this.cols + i];
  }

  snap(value: number): number {
    return (Math.floor(value / this.cell) + 0.5) * this.cell;
  }

  private sample(): void {
    const { step } = this.spec;
    for (let j = 0; j < this.rows; j += 1) {
      for (let i = 0; i < this.cols; i += 1) {
        const x = (this.iMin + i + 0.5) * this.cell;
        const z = (this.jMin + j + 0.5) * this.cell;
        const height = Math.round(this.spec.height(x, z) / step) * step;
        this.heights[j * this.cols + i] = height;
        this.surfaces.push(this.varied(this.spec.surface(x, z, height), i, j));
      }
    }
  }

  private varied(surface: TileSurface, i: number, j: number): TileSurface {
    const amount = this.spec.variation ?? DEFAULT_VARIATION;
    const shift = 1 + (hash2(i, j, VARIATION_SEED) - 0.5) * 2 * amount;
    return { top: surface.top.clone().multiplyScalar(shift), side: surface.side };
  }

  private build(): THREE.BufferGeometry {
    const buffers = new MeshBuffers();
    const up = new THREE.Vector3(0, 1, 0);
    for (let j = 0; j < this.rows; j += 1) {
      for (let i = 0; i < this.cols; i += 1) {
        const index = j * this.cols + i;
        const height = this.heights[index];
        const x0 = (this.iMin + i) * this.cell;
        const z0 = (this.jMin + j) * this.cell;
        const x1 = x0 + this.cell;
        const z1 = z0 + this.cell;
        buffers.quad(
          [
            new THREE.Vector3(x0, height, z0),
            new THREE.Vector3(x0, height, z1),
            new THREE.Vector3(x1, height, z1),
            new THREE.Vector3(x1, height, z0),
          ],
          up,
          this.surfaces[index].top,
        );
        NEIGHBOURS.forEach((neighbour) => this.addCliff(buffers, i, j, neighbour));
      }
    }
    return buffers.geometry();
  }

  private addCliff(buffers: MeshBuffers, i: number, j: number, neighbour: Neighbour): void {
    const ni = i + neighbour.di;
    const nj = j + neighbour.dj;
    if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) return;
    const index = j * this.cols + i;
    const top = this.heights[index];
    const bottom = this.heights[nj * this.cols + ni];
    if (bottom >= top - EPSILON) return;
    const [from, to] = this.edge(i, j, neighbour);
    const normal = new THREE.Vector3(neighbour.di, 0, neighbour.dj);
    const surface = this.surfaces[index];
    const lip = Math.min(this.spec.lip ?? 0, top - bottom);
    if (lip > EPSILON) {
      this.band(
        buffers,
        from,
        to,
        top - lip,
        top,
        normal,
        surface.top.clone().multiplyScalar(LIP_SHADE),
      );
    }
    const strata = this.spec.strata ?? DEFAULT_STRATA;
    let level = 0;
    for (let upper = top - lip; upper > bottom + EPSILON; upper -= this.spec.step) {
      const lower = Math.max(bottom, upper - this.spec.step);
      const shade = Math.max(MIN_SIDE_SHADE, 1 - strata * level);
      this.band(
        buffers,
        from,
        to,
        lower,
        upper,
        normal,
        surface.side.clone().multiplyScalar(shade),
      );
      level += 1;
    }
  }

  private edge(i: number, j: number, neighbour: Neighbour): [THREE.Vector2, THREE.Vector2] {
    const x0 = (this.iMin + i) * this.cell;
    const z0 = (this.jMin + j) * this.cell;
    const x1 = x0 + this.cell;
    const z1 = z0 + this.cell;
    if (neighbour.di === 1) return [new THREE.Vector2(x1, z0), new THREE.Vector2(x1, z1)];
    if (neighbour.di === -1) return [new THREE.Vector2(x0, z0), new THREE.Vector2(x0, z1)];
    if (neighbour.dj === 1) return [new THREE.Vector2(x0, z1), new THREE.Vector2(x1, z1)];
    return [new THREE.Vector2(x0, z0), new THREE.Vector2(x1, z0)];
  }

  private band(
    buffers: MeshBuffers,
    from: THREE.Vector2,
    to: THREE.Vector2,
    lower: number,
    upper: number,
    normal: THREE.Vector3,
    color: THREE.Color,
  ): void {
    buffers.quad(
      [
        new THREE.Vector3(from.x, lower, from.y),
        new THREE.Vector3(to.x, lower, to.y),
        new THREE.Vector3(to.x, upper, to.y),
        new THREE.Vector3(from.x, upper, from.y),
      ],
      normal,
      color,
    );
  }
}
