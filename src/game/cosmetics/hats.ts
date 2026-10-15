import * as THREE from 'three';
import type { HatId, HatSpec } from '../../course/shop';
import { blockAssembly, type Block } from '../effects/chunkyGeometry';
import { finish, part, pivot, shade } from './parts';

type HatBuilder = (color: string) => THREE.Group;

const DARK = 0x2a2140;
const GOLD = 0xffd447;
const GEM_COLORS = [0xff5f7e, 0x3db4ff, 0x3ee07a] as const;
const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const RING_SEGMENTS = { radial: 8, tubular: 28 };
const ROUND_SEGMENTS = 10;
const TRIM_DARKEN = -0.15;
const GLOW = 0.9;
const SHINE = { metalness: 0.55, roughness: 0.35 };

const CAP_CROWN: readonly Block[] = [
  { size: [1.04, 0.3, 1.04], position: [0, 0.13, 0] },
  { size: [0.16, 0.08, 0.16], position: [0, 0.31, 0] },
];
const CAP_BRIM: readonly Block[] = [{ size: [0.92, 0.07, 0.46], position: [0, 0.03, 0.66] }];

const HEADPHONE_BAND = { radius: 0.6, tube: 0.07, lift: -0.4 };
const HEADPHONE_CUP = { radius: 0.22, depth: 0.16, spread: 0.6, lift: -0.42 };
const HEADPHONE_PAD = { radius: 0.17, depth: 0.06, inset: 0.08 };

const HORN = { radius: 0.13, height: 0.4, spread: 0.3, lift: 0.17, tilt: 0.35, segments: 6 };
const HORN_TIP_LIGHTEN = 0.2;

const WIZARD_CONE = { radius: 0.6, height: 1.05, lift: 0.56, tilt: -0.18, segments: 8 };
const WIZARD_BRIM = { radius: 0.88, depth: 0.07, lift: 0.04 };
const WIZARD_BAND = { radius: 0.62, depth: 0.12, lift: 0.12 };
const WIZARD_STAR: readonly Block[] = [
  { size: [0.14, 0.14, 0.05], position: [0, 0.42, 0.42], rotation: [0.18, 0, Math.PI / 4] },
];

const HALO = { radius: 0.42, tube: 0.06, lift: 0.36 };

const CROWN_RING = { radius: 0.53, depth: 0.28, lift: 0.14, segments: 8 };
const CROWN_SPIKE = { radius: 0.11, height: 0.26, lift: 0.4, count: 5, ring: 0.44 };
const CROWN_GEM: readonly Block[] = [{ size: [0.12, 0.12, 0.06], position: [0, 0.14, 0.54] }];

const HAT_BUILDERS: Readonly<Record<HatId, HatBuilder>> = {
  cap: buildCap,
  headphones: buildHeadphones,
  horns: buildHorns,
  wizard: buildWizardHat,
  halo: buildHalo,
  crown: buildCrown,
};

export function buildHat(spec: HatSpec): THREE.Group {
  return HAT_BUILDERS[spec.id](spec.color);
}

function buildCap(color: string): THREE.Group {
  return pivot(
    [0, 0, 0],
    part(blockAssembly(CAP_CROWN), finish(color)),
    part(blockAssembly(CAP_BRIM), finish(shade(color, TRIM_DARKEN))),
  );
}

function buildHeadphones(color: string): THREE.Group {
  const shell = finish(color, SHINE);
  const cushion = finish(DARK);
  const band = new THREE.TorusGeometry(
    HEADPHONE_BAND.radius,
    HEADPHONE_BAND.tube,
    RING_SEGMENTS.radial,
    RING_SEGMENTS.tubular,
    Math.PI,
  );
  return pivot(
    [0, 0, 0],
    part(band, shell, { position: [0, HEADPHONE_BAND.lift, 0] }),
    ...[-1, 1].flatMap((side) => [
      part(sideDisc(HEADPHONE_CUP.radius, HEADPHONE_CUP.depth), shell, {
        position: [side * HEADPHONE_CUP.spread, HEADPHONE_CUP.lift, 0],
        rotation: [0, 0, QUARTER_TURN],
      }),
      part(sideDisc(HEADPHONE_PAD.radius, HEADPHONE_PAD.depth), cushion, {
        position: [side * (HEADPHONE_CUP.spread - HEADPHONE_PAD.inset), HEADPHONE_CUP.lift, 0],
        rotation: [0, 0, QUARTER_TURN],
      }),
    ]),
  );
}

function buildHorns(color: string): THREE.Group {
  const horn = finish(color);
  const tip = finish(shade(color, HORN_TIP_LIGHTEN));
  return pivot([0, 0, 0], ...[-1, 1].map((side) => tiltedHorn(side, horn, tip)));
}

function tiltedHorn(side: number, horn: THREE.Material, tip: THREE.Material): THREE.Group {
  const { radius, height, segments } = HORN;
  const group = pivot(
    [side * HORN.spread, HORN.lift, 0],
    part(new THREE.ConeGeometry(radius, height, segments), horn),
    part(new THREE.ConeGeometry(radius / 2, height / 3, segments), tip, {
      position: [0, height / 3, 0],
    }),
  );
  group.rotation.z = -side * HORN.tilt;
  return group;
}

function buildWizardHat(color: string): THREE.Group {
  const felt = finish(color);
  const cone = new THREE.ConeGeometry(WIZARD_CONE.radius, WIZARD_CONE.height, WIZARD_CONE.segments);
  return pivot(
    [0, 0, 0],
    part(cone, felt, { position: [0, WIZARD_CONE.lift, 0], rotation: [WIZARD_CONE.tilt, 0, 0] }),
    part(flatDisc(WIZARD_BRIM.radius, WIZARD_BRIM.depth, WIZARD_CONE.segments), felt, {
      position: [0, WIZARD_BRIM.lift, 0],
    }),
    part(flatDisc(WIZARD_BAND.radius, WIZARD_BAND.depth, WIZARD_CONE.segments), finish(GOLD), {
      position: [0, WIZARD_BAND.lift, 0],
    }),
    part(blockAssembly(WIZARD_STAR), finish(GOLD, { glow: GLOW })),
  );
}

function buildHalo(color: string): THREE.Group {
  const ring = new THREE.TorusGeometry(
    HALO.radius,
    HALO.tube,
    RING_SEGMENTS.radial,
    RING_SEGMENTS.tubular,
  );
  return pivot(
    [0, 0, 0],
    part(ring, finish(color, { glow: GLOW }), {
      position: [0, HALO.lift, 0],
      rotation: [QUARTER_TURN, 0, 0],
    }),
  );
}

function buildCrown(color: string): THREE.Group {
  const gold = finish(color, SHINE);
  const ring = new THREE.CylinderGeometry(
    CROWN_RING.radius,
    CROWN_RING.radius,
    CROWN_RING.depth,
    CROWN_RING.segments,
    1,
    true,
  );
  const spikes = Array.from({ length: CROWN_SPIKE.count }, (_, index) => {
    const angle = (index / CROWN_SPIKE.count) * FULL_TURN;
    return part(new THREE.ConeGeometry(CROWN_SPIKE.radius, CROWN_SPIKE.height, 4), gold, {
      position: [
        Math.sin(angle) * CROWN_SPIKE.ring,
        CROWN_SPIKE.lift,
        Math.cos(angle) * CROWN_SPIKE.ring,
      ],
    });
  });
  const gems = GEM_COLORS.map((gem, index) =>
    part(blockAssembly(CROWN_GEM), finish(gem, { glow: GLOW / 2 }), {
      rotation: [0, ((index - 1) * FULL_TURN) / CROWN_SPIKE.count, 0],
    }),
  );
  ring.translate(0, CROWN_RING.lift, 0);
  return pivot([0, 0, 0], part(ring, doubleSided(gold)), ...spikes, ...gems);
}

function sideDisc(radius: number, depth: number): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, depth, ROUND_SEGMENTS);
}

function flatDisc(radius: number, depth: number, segments: number): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, depth, segments);
}

function doubleSided(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  material.side = THREE.DoubleSide;
  return material;
}
