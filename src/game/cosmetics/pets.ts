import * as THREE from 'three';
import type { PetId, PetSpec } from '../../course/shop';
import { blockAssembly, type Block, type Triple } from '../effects/chunkyGeometry';
import { eyes, finish, part, pivot, shade, type EyeSpec } from './parts';

export interface PetModel {
  readonly object: THREE.Group;
  animate(elapsed: number): void;
}

interface Flap {
  speed: number;
  rest: number;
  angle: number;
}

type PetBuilder = (color: string) => PetModel;

const WHITE = 0xffffff;
const DARK = 0x2a2140;
const PINK = 0xff8fb1;
const IVORY = 0xfff1b8;
const VISOR = 0x5ce1ff;
const BEACON = 0xff5f7e;
const FLAME = 0xffa23a;
const BODY_GLOW = 0.35;
const SOFT_GLOW = 0.18;
const BRIGHT_GLOW = 0.9;
const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;

const CAT_FUR: readonly Block[] = [
  { size: [0.4, 0.28, 0.46] },
  { size: [0.36, 0.32, 0.32], position: [0, 0.24, 0.2] },
  ...[-1, 1].flatMap((side) =>
    [-1, 1].map((end) => ({
      size: [0.09, 0.12, 0.09] as const,
      position: [side * 0.13, -0.16, end * 0.15] as const,
    })),
  ),
];
const CAT_NOSE: readonly Block[] = [{ size: [0.06, 0.04, 0.03], position: [0, 0.2, 0.37] }];
const CAT_EYES: EyeSpec = { spacing: 0.16, height: 0.27, depth: 0.365 };
const CAT_EAR = { radius: 0.075, height: 0.15, spread: 0.11, lift: 0.46, depth: 0.2 };
const CAT_TAIL: readonly Block[] = [{ size: [0.07, 0.3, 0.07], position: [0, 0.14, 0] }];
const CAT_TAIL_ROOT: Triple = [0, 0.06, -0.24];
const CAT_TAIL_TILT = -0.5;
const TAIL_WAG = { speed: 5, angle: 0.45 };

const BEE_COAT: readonly Block[] = [
  { size: [0.3, 0.3, 0.42] },
  { size: [0.28, 0.26, 0.16], position: [0, 0.03, 0.27] },
];
const BEE_STRIPES: readonly Block[] = [
  { size: [0.32, 0.32, 0.06], position: [0, 0, -0.03] },
  { size: [0.32, 0.32, 0.06], position: [0, 0, -0.15] },
  { size: [0.025, 0.14, 0.025], position: [-0.07, 0.2, 0.3], rotation: [0.3, 0, 0.4] },
  { size: [0.025, 0.14, 0.025], position: [0.07, 0.2, 0.3], rotation: [0.3, 0, -0.4] },
];
const BEE_EYES: EyeSpec = { spacing: 0.14, height: 0.06, depth: 0.355, scale: 1.2 };
const BEE_STINGER = { radius: 0.05, height: 0.12, position: [0, -0.02, -0.27] as const };
const BEE_WING: readonly Block[] = [{ size: [0.28, 0.02, 0.17], position: [0.15, 0, 0] }];
const BEE_WING_ROOT: Triple = [0.1, 0.15, -0.02];
const BEE_WING_OPACITY = 0.7;
const WING_BUZZ: Flap = { speed: 26, rest: 0.35, angle: 0.55 };

const STAR_POINTS = 5;
const STAR_RADII = { outer: 0.3, inner: 0.13 };
const STAR_DEPTH = 0.08;
const STAR_BEVEL = 0.03;
const STAR_EYES: EyeSpec = {
  spacing: 0.12,
  height: 0.02,
  depth: STAR_DEPTH / 2 + STAR_BEVEL + 0.01,
};
const STAR_SWAY = { speed: 1.4, angle: 0.5 };
const STAR_PULSE = { speed: 3, amount: 0.35 };

const GHOST_DOME = { radius: 0.24, lift: 0.06 };
const GHOST_SKIRT = { top: 0.24, bottom: 0.26, height: 0.26, lift: -0.07 };
const GHOST_TAIL = { count: 5, radius: 0.08, ring: 0.17, lift: -0.2 };
const GHOST_EYES: EyeSpec = { spacing: 0.14, height: 0.08, depth: 0.24, scale: 1.3 };
const GHOST_MOUTH: readonly Block[] = [{ size: [0.07, 0.035, 0.02], position: [0, -0.02, 0.25] }];
const GHOST_OPACITY = 0.88;
const GHOST_WOBBLE = { speed: 2.4, squash: 0.06, sway: 0.12 };
const ROUND_SEGMENTS = { width: 12, height: 8 };

const ROBOT_HEAD: readonly Block[] = [{ size: [0.36, 0.28, 0.3], position: [0, 0.18, 0] }];
const ROBOT_FRAME: readonly Block[] = [
  { size: [0.3, 0.24, 0.26], position: [0, -0.08, 0] },
  { size: [0.06, 0.16, 0.08], position: [-0.2, -0.06, 0] },
  { size: [0.06, 0.16, 0.08], position: [0.2, -0.06, 0] },
  { size: [0.04, 0.1, 0.1], position: [-0.2, 0.18, 0] },
  { size: [0.04, 0.1, 0.1], position: [0.2, 0.18, 0] },
];
const ROBOT_VISOR: readonly Block[] = [{ size: [0.28, 0.09, 0.03], position: [0, 0.19, 0.155] }];
const ROBOT_ANTENNA = { radius: 0.015, height: 0.14, lift: 0.39, tip: 0.045, tipLift: 0.48 };
const ROBOT_JET = { radius: 0.07, height: 0.12, lift: -0.26 };
const ROBOT_METAL = { metalness: 0.45, roughness: 0.4 };
const BLINK = { speed: 2.2, threshold: 0.4, on: 2.4, off: 0.4 };

const DRAGON_SCALES: readonly Block[] = [
  { size: [0.28, 0.26, 0.38] },
  { size: [0.26, 0.24, 0.26], position: [0, 0.22, 0.18] },
  { size: [0.18, 0.12, 0.14], position: [0, 0.16, 0.36] },
  { size: [0.1, 0.1, 0.24], position: [0, -0.04, -0.28], rotation: [0.3, 0, 0] },
];
const DRAGON_BELLY: readonly Block[] = [{ size: [0.2, 0.12, 0.3], position: [0, -0.08, 0.05] }];
const DRAGON_EYES: EyeSpec = { spacing: 0.15, height: 0.27, depth: 0.315 };
const DRAGON_HORN = { radius: 0.035, height: 0.12, spread: 0.08, lift: 0.38, depth: 0.12 };
const DRAGON_HORN_TILT = { forward: -0.5, outward: 0.25 };
const DRAGON_TAIL_TIP = { radius: 0.06, height: 0.12, position: [0, -0.1, -0.42] as const };
const DRAGON_TAIL_TILT = -QUARTER_TURN - 0.3;
const DRAGON_WING_ROOT: Triple = [0.12, 0.12, -0.02];
const DRAGON_WING_OUTLINE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.3, 0.16],
  [0.24, -0.02],
  [0.14, -0.08],
];
const DRAGON_WING_DEPTH = 0.02;
const DRAGON_WING_OPACITY = 0.92;
const WING_GLIDE: Flap = { speed: 7, rest: 0.25, angle: 0.4 };
const BELLY_LIGHTEN = 0.2;
const WING_DARKEN = -0.12;
const TRIM_DARKEN = -0.2;

const PET_BUILDERS: Readonly<Record<PetId, PetBuilder>> = {
  'cube-cat': buildCubeCat,
  bee: buildBee,
  star: buildStar,
  ghost: buildGhost,
  robot: buildRobot,
  dragon: buildDragon,
};

export function buildPet(spec: PetSpec): PetModel {
  return PET_BUILDERS[spec.id](spec.color);
}

function buildCubeCat(color: string): PetModel {
  const fur = finish(color, { glow: BODY_GLOW });
  const tail = pivot(CAT_TAIL_ROOT, part(blockAssembly(CAT_TAIL), fur));
  tail.rotation.x = CAT_TAIL_TILT;
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(CAT_FUR), fur),
    part(blockAssembly(CAT_NOSE), finish(PINK)),
    ...pairedCones(CAT_EAR, fur, [0, QUARTER_TURN / 2, 0]),
    ...eyes(CAT_EYES),
    tail,
  );
  return {
    object,
    animate: (elapsed) => {
      tail.rotation.z = Math.sin(elapsed * TAIL_WAG.speed) * TAIL_WAG.angle;
    },
  };
}

function buildBee(color: string): PetModel {
  const stripes = finish(DARK);
  const membrane = finish(WHITE, { opacity: BEE_WING_OPACITY, glow: SOFT_GLOW });
  const wings = mirroredWings(BEE_WING_ROOT, (side) =>
    part(blockAssembly(BEE_WING), membrane, { rotation: [0, side < 0 ? Math.PI : 0, 0] }),
  );
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(BEE_COAT), finish(color, { glow: SOFT_GLOW })),
    part(blockAssembly(BEE_STRIPES), stripes),
    ...eyes(BEE_EYES),
    part(new THREE.ConeGeometry(BEE_STINGER.radius, BEE_STINGER.height, 5), stripes, {
      position: BEE_STINGER.position,
      rotation: [-QUARTER_TURN, 0, 0],
    }),
    ...wings,
  );
  return { object, animate: (elapsed) => flap(wings, elapsed, WING_BUZZ) };
}

function buildStar(color: string): PetModel {
  const glow = finish(color, { glow: BRIGHT_GLOW });
  const object = pivot([0, 0, 0], part(starGeometry(), glow), ...eyes(STAR_EYES));
  return {
    object,
    animate: (elapsed) => {
      object.rotation.y = Math.sin(elapsed * STAR_SWAY.speed) * STAR_SWAY.angle;
      glow.emissiveIntensity =
        BRIGHT_GLOW + Math.sin(elapsed * STAR_PULSE.speed) * STAR_PULSE.amount;
    },
  };
}

function buildGhost(color: string): PetModel {
  const veil = finish(color, { glow: BODY_GLOW, opacity: GHOST_OPACITY });
  const body = pivot(
    [0, 0, 0],
    part(ghostDome(), veil, { position: [0, GHOST_DOME.lift, 0] }),
    part(ghostSkirt(), veil, { position: [0, GHOST_SKIRT.lift, 0] }),
    ...ghostTails(veil),
    ...eyes(GHOST_EYES),
    part(blockAssembly(GHOST_MOUTH), finish(DARK)),
  );
  const object = pivot([0, 0, 0], body);
  return {
    object,
    animate: (elapsed) => {
      const wave = Math.sin(elapsed * GHOST_WOBBLE.speed);
      body.scale.set(1 - wave * GHOST_WOBBLE.squash, 1 + wave * GHOST_WOBBLE.squash, 1);
      body.rotation.z = Math.cos((elapsed * GHOST_WOBBLE.speed) / 2) * GHOST_WOBBLE.sway;
    },
  };
}

function buildRobot(color: string): PetModel {
  const trim = finish(shade(color, TRIM_DARKEN), ROBOT_METAL);
  const beacon = finish(BEACON, { glow: BLINK.on });
  const antenna = new THREE.CylinderGeometry(
    ROBOT_ANTENNA.radius,
    ROBOT_ANTENNA.radius,
    ROBOT_ANTENNA.height,
  );
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(ROBOT_FRAME), trim),
    part(blockAssembly(ROBOT_HEAD), finish(color, ROBOT_METAL)),
    part(blockAssembly(ROBOT_VISOR), finish(VISOR, { glow: BRIGHT_GLOW })),
    part(antenna, trim, { position: [0, ROBOT_ANTENNA.lift, 0] }),
    part(
      new THREE.SphereGeometry(ROBOT_ANTENNA.tip, ROUND_SEGMENTS.width, ROUND_SEGMENTS.height),
      beacon,
      { position: [0, ROBOT_ANTENNA.tipLift, 0] },
    ),
    part(
      new THREE.ConeGeometry(ROBOT_JET.radius, ROBOT_JET.height),
      finish(FLAME, { glow: BRIGHT_GLOW }),
      { position: [0, ROBOT_JET.lift, 0], rotation: [Math.PI, 0, 0] },
    ),
  );
  return {
    object,
    animate: (elapsed) => {
      const lit = Math.sin(elapsed * BLINK.speed * FULL_TURN) > BLINK.threshold;
      beacon.emissiveIntensity = lit ? BLINK.on : BLINK.off;
    },
  };
}

function buildDragon(color: string): PetModel {
  const horn = finish(IVORY);
  const skin = finish(shade(color, WING_DARKEN), { opacity: DRAGON_WING_OPACITY });
  const wings = mirroredWings(DRAGON_WING_ROOT, (side) => part(dragonWing(side), skin));
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(DRAGON_SCALES), finish(color, { glow: SOFT_GLOW })),
    part(blockAssembly(DRAGON_BELLY), finish(shade(color, BELLY_LIGHTEN))),
    ...eyes(DRAGON_EYES),
    ...pairedCones(DRAGON_HORN, horn, [DRAGON_HORN_TILT.forward, 0, -DRAGON_HORN_TILT.outward]),
    part(new THREE.ConeGeometry(DRAGON_TAIL_TIP.radius, DRAGON_TAIL_TIP.height, 4), horn, {
      position: DRAGON_TAIL_TIP.position,
      rotation: [DRAGON_TAIL_TILT, 0, 0],
    }),
    ...wings,
  );
  return { object, animate: (elapsed) => flap(wings, elapsed, WING_GLIDE) };
}

interface ConePair {
  radius: number;
  height: number;
  spread: number;
  lift: number;
  depth: number;
}

function pairedCones(cone: ConePair, material: THREE.Material, tilt: Triple): THREE.Mesh[] {
  return [-1, 1].map((side) =>
    part(new THREE.ConeGeometry(cone.radius, cone.height, 4), material, {
      position: [side * cone.spread, cone.lift, cone.depth],
      rotation: [tilt[0], tilt[1], tilt[2] * side],
    }),
  );
}

function mirroredWings(root: Triple, build: (side: number) => THREE.Object3D): THREE.Group[] {
  return [-1, 1].map((side) => pivot([root[0] * side, root[1], root[2]], build(side)));
}

function flap(
  wings: readonly THREE.Object3D[],
  elapsed: number,
  { speed, rest, angle }: Flap,
): void {
  const beat = rest + Math.sin(elapsed * speed) * angle;
  wings.forEach((wing, index) => (wing.rotation.z = index === 0 ? -beat : beat));
}

function starGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const corners = STAR_POINTS * 2;
  for (let corner = 0; corner < corners; corner += 1) {
    const radius = corner % 2 === 0 ? STAR_RADII.outer : STAR_RADII.inner;
    const angle = (corner / corners) * FULL_TURN;
    const point = new THREE.Vector2(Math.sin(angle) * radius, Math.cos(angle) * radius);
    if (corner === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: STAR_DEPTH,
    bevelThickness: STAR_BEVEL,
    bevelSize: STAR_BEVEL,
    bevelSegments: 1,
  }).center();
}

function ghostDome(): THREE.BufferGeometry {
  const { width, height } = ROUND_SEGMENTS;
  return new THREE.SphereGeometry(GHOST_DOME.radius, width, height, 0, FULL_TURN, 0, QUARTER_TURN);
}

function ghostSkirt(): THREE.BufferGeometry {
  const { top, bottom, height } = GHOST_SKIRT;
  return new THREE.CylinderGeometry(top, bottom, height, ROUND_SEGMENTS.width);
}

function ghostTails(material: THREE.Material): THREE.Mesh[] {
  const { count, radius, ring, lift } = GHOST_TAIL;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * FULL_TURN;
    const geometry = new THREE.SphereGeometry(radius, ROUND_SEGMENTS.height, ROUND_SEGMENTS.height);
    return part(geometry, material, {
      position: [Math.sin(angle) * ring, lift, Math.cos(angle) * ring],
    });
  });
}

function dragonWing(side: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(
    DRAGON_WING_OUTLINE.map(([x, y]) => new THREE.Vector2(x * side, y)),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DRAGON_WING_DEPTH,
    bevelEnabled: false,
  });
  return geometry.rotateX(QUARTER_TURN);
}
