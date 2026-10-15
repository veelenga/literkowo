import * as THREE from 'three';
import type { PetId, PetSpec } from '../../course/shop';
import { blockAssembly, type Block, type Triple } from '../effects/chunkyGeometry';
import { eyes, finish, part, pivot, shade, type EyeSpec, type FinishOptions } from './parts';

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

const GOLD = 0xffd447;
const GOLD_FINISH: FinishOptions = { glow: SOFT_GLOW, roughness: 0.4 };
const COLLAR = 0xff4d6d;
const NAVY = 0x2b3f73;
const BEAK = 0xffa23a;
const SHADOW_VIOLET = 0x3a2870;
const SNOUT_DARKEN = -0.08;
const MUZZLE_DARKEN = -0.12;
const EAR_DARKEN = -0.22;

const PIGGY_BODY: readonly Block[] = [
  { size: [0.44, 0.38, 0.5] },
  ...fourLegs({ size: [0.11, 0.12, 0.11], spread: 0.13, lift: -0.2, reach: 0.15 }),
];
const PIGGY_SNOUT: readonly Block[] = [{ size: [0.2, 0.14, 0.08], position: [0, -0.01, 0.27] }];
const PIGGY_NOSTRILS: readonly Block[] = [-1, 1].map((side) => ({
  size: [0.04, 0.06, 0.02] as const,
  position: [side * 0.045, -0.01, 0.315] as const,
}));
const PIGGY_EYES: EyeSpec = { spacing: 0.2, height: 0.1, depth: 0.255 };
const PIGGY_EAR = { radius: 0.07, height: 0.12, spread: 0.13, lift: 0.23, depth: 0.14 };
const PIGGY_EAR_TILT: Triple = [0.6, QUARTER_TURN / 2, -0.3];
const PIGGY_SLOT: readonly Block[] = [{ size: [0.18, 0.03, 0.06], position: [0, 0.19, -0.08] }];
const PIGGY_COIN = { radius: 0.075, depth: 0.025, position: [0, 0.23, -0.08] as const };
const PIGGY_TAIL = { radius: 0.05, tube: 0.018, arc: Math.PI * 1.5 };
const PIGGY_TAIL_ROOT: Triple = [0, 0.06, -0.27];
const TAIL_CURL = { speed: 6, angle: 0.7 };

const PUPPY_FUR: readonly Block[] = [
  { size: [0.36, 0.28, 0.44] },
  { size: [0.34, 0.3, 0.3], position: [0, 0.26, 0.18] },
  ...fourLegs({ size: [0.09, 0.12, 0.09], spread: 0.12, lift: -0.16, reach: 0.14 }),
];
const PUPPY_MUZZLE: readonly Block[] = [{ size: [0.18, 0.12, 0.12], position: [0, 0.19, 0.36] }];
const PUPPY_NOSE: readonly Block[] = [{ size: [0.08, 0.05, 0.04], position: [0, 0.235, 0.42] }];
const PUPPY_EYES: EyeSpec = { spacing: 0.16, height: 0.3, depth: 0.335 };
const PUPPY_EAR: readonly Block[] = [{ size: [0.06, 0.2, 0.12], position: [0, -0.08, 0] }];
const PUPPY_EAR_ROOT: Triple = [0.19, 0.38, 0.18];
const PUPPY_COLLAR: readonly Block[] = [{ size: [0.37, 0.06, 0.32], position: [0, 0.12, 0.18] }];
const PUPPY_TAG: readonly Block[] = [{ size: [0.06, 0.06, 0.02], position: [0, 0.07, 0.35] }];
const PUPPY_TAIL: readonly Block[] = [{ size: [0.06, 0.2, 0.06], position: [0, 0.1, 0] }];
const PUPPY_TAIL_ROOT: Triple = [0, 0.08, -0.22];
const PUPPY_TAIL_TILT = -0.7;
const PUPPY_WAG = { speed: 9, angle: 0.5 };
const EAR_SWAY: Flap = { speed: 3, rest: 0.12, angle: 0.08 };

const PENGUIN_BODY: readonly Block[] = [
  { size: [0.42, 0.38, 0.38], position: [0, -0.08, 0] },
  { size: [0.36, 0.24, 0.34], position: [0, 0.22, 0] },
];
const PENGUIN_PATCHES: readonly Block[] = [
  { size: [0.3, 0.28, 0.03], position: [0, -0.08, 0.19] },
  { size: [0.26, 0.15, 0.03], position: [0, 0.235, 0.17] },
];
const PENGUIN_EYES: EyeSpec = { spacing: 0.13, height: 0.25, depth: 0.19 };
const PENGUIN_BEAK: readonly Block[] = [{ size: [0.08, 0.05, 0.08], position: [0, 0.185, 0.2] }];
const PENGUIN_FEET: readonly Block[] = [-1, 1].map((side) => ({
  size: [0.1, 0.04, 0.12] as const,
  position: [side * 0.09, -0.28, 0.08] as const,
}));
const PENGUIN_SCARF: readonly Block[] = [
  { size: [0.44, 0.07, 0.4], position: [0, 0.1, 0] },
  { size: [0.07, 0.16, 0.03], position: [0.11, 0.03, 0.215], rotation: [0, 0, 0.15] },
];
const PENGUIN_FLIPPER: readonly Block[] = [{ size: [0.05, 0.24, 0.12], position: [0, -0.11, 0] }];
const PENGUIN_FLIPPER_ROOT: Triple = [0.22, 0.04, 0];
const FLIPPER_WAVE: Flap = { speed: 4, rest: 0.12, angle: 0.18 };

const SHADOW_PROFILE: readonly (readonly [number, number])[] = [
  [0, -0.2],
  [0.14, -0.17],
  [0.21, -0.08],
  [0.22, 0.02],
  [0.19, 0.12],
  [0.12, 0.22],
  [0.05, 0.3],
  [0, 0.36],
];
const SHADOW_LEAN = -0.15;
const SHADOW_FACE: readonly Block[] = [
  ...[-1, 1].map((side) => ({
    size: [0.07, 0.1, 0.03] as const,
    position: [side * 0.075, 0.03, 0.205] as const,
  })),
  ...[-1, 1].map((side) => ({
    size: [0.045, 0.018, 0.02] as const,
    position: [side * 0.018, -0.06, 0.2] as const,
    rotation: [0, 0, side * 0.5] as const,
  })),
];
const SHADOW_OPACITY = 0.88;
const WISP_OPACITY = 0.6;
const SHADOW_WISP_PUFFS = [
  { radius: 0.06, position: [0, -0.05, -0.03] as const },
  { radius: 0.035, position: [0, -0.12, -0.08] as const },
];
const SHADOW_WISP_ROOTS: readonly Triple[] = [
  [-0.11, -0.13, -0.04],
  [0, -0.16, -0.06],
  [0.11, -0.13, -0.04],
];
const WISP_SWAY = { speed: 2.2, angle: 0.35, lag: 0.9 };
const SHADOW_BOB = { speed: 1.8, height: 0.03 };
const SPRITE_GLOW = 0.6;
const EYE_PULSE = { speed: 2.4, amount: 0.25 };

const PET_BUILDERS: Readonly<Record<PetId, PetBuilder>> = {
  'cube-cat': buildCubeCat,
  bee: buildBee,
  star: buildStar,
  ghost: buildGhost,
  robot: buildRobot,
  dragon: buildDragon,
  piggy: buildPiggy,
  puppy: buildPuppy,
  penguin: buildPenguin,
  shadow: buildShadow,
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

function buildPiggy(color: string): PetModel {
  const skin = finish(color, { glow: SOFT_GLOW });
  const tail = pivot(PIGGY_TAIL_ROOT, part(curlyTail(), skin));
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(PIGGY_BODY), skin),
    part(blockAssembly(PIGGY_SNOUT), finish(shade(color, SNOUT_DARKEN))),
    part(blockAssembly(PIGGY_NOSTRILS), finish(DARK)),
    part(blockAssembly(PIGGY_SLOT), finish(DARK)),
    part(coinGeometry(), finish(GOLD, GOLD_FINISH), {
      position: PIGGY_COIN.position,
      rotation: [QUARTER_TURN, 0, 0],
    }),
    ...pairedCones(PIGGY_EAR, skin, PIGGY_EAR_TILT),
    ...eyes(PIGGY_EYES),
    tail,
  );
  return {
    object,
    animate: (elapsed) => {
      tail.rotation.z = Math.sin(elapsed * TAIL_CURL.speed) * TAIL_CURL.angle;
    },
  };
}

function buildPuppy(color: string): PetModel {
  const fur = finish(color, { glow: SOFT_GLOW });
  const earFur = finish(shade(color, EAR_DARKEN));
  const ears = mirroredWings(PUPPY_EAR_ROOT, () => part(blockAssembly(PUPPY_EAR), earFur));
  const tail = pivot(PUPPY_TAIL_ROOT, part(blockAssembly(PUPPY_TAIL), fur));
  tail.rotation.x = PUPPY_TAIL_TILT;
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(PUPPY_FUR), fur),
    part(blockAssembly(PUPPY_MUZZLE), finish(shade(color, MUZZLE_DARKEN))),
    part(blockAssembly(PUPPY_NOSE), finish(DARK)),
    part(blockAssembly(PUPPY_COLLAR), finish(COLLAR)),
    part(blockAssembly(PUPPY_TAG), finish(GOLD, GOLD_FINISH)),
    ...eyes(PUPPY_EYES),
    ...ears,
    tail,
  );
  return {
    object,
    animate: (elapsed) => {
      tail.rotation.z = Math.sin(elapsed * PUPPY_WAG.speed) * PUPPY_WAG.angle;
      flap(ears, elapsed, EAR_SWAY);
    },
  };
}

function buildPenguin(color: string): PetModel {
  const feathers = finish(NAVY);
  const flippers = mirroredWings(PENGUIN_FLIPPER_ROOT, () =>
    part(blockAssembly(PENGUIN_FLIPPER), feathers),
  );
  const object = pivot(
    [0, 0, 0],
    part(blockAssembly(PENGUIN_BODY), feathers),
    part(blockAssembly(PENGUIN_PATCHES), finish(WHITE)),
    part(blockAssembly([...PENGUIN_BEAK, ...PENGUIN_FEET]), finish(BEAK)),
    part(blockAssembly(PENGUIN_SCARF), finish(color, { glow: SOFT_GLOW })),
    ...eyes(PENGUIN_EYES),
    ...flippers,
  );
  return { object, animate: (elapsed) => flap(flippers, elapsed, FLIPPER_WAVE) };
}

function buildShadow(color: string): PetModel {
  const mist = finish(SHADOW_VIOLET, { glow: BODY_GLOW, opacity: SHADOW_OPACITY });
  const trail = finish(SHADOW_VIOLET, { glow: BODY_GLOW, opacity: WISP_OPACITY });
  const glow = finish(color, { glow: SPRITE_GLOW });
  const wisps = SHADOW_WISP_ROOTS.map((root) => shadowWisp(root, trail));
  const body = pivot(
    [0, 0, 0],
    part(shadowDrop(), mist, { rotation: [SHADOW_LEAN, 0, 0] }),
    part(blockAssembly(SHADOW_FACE), glow),
    ...wisps,
  );
  const object = pivot([0, 0, 0], body);
  return {
    object,
    animate: (elapsed) => {
      body.position.y = Math.sin(elapsed * SHADOW_BOB.speed) * SHADOW_BOB.height;
      glow.emissiveIntensity = SPRITE_GLOW + Math.sin(elapsed * EYE_PULSE.speed) * EYE_PULSE.amount;
      swayWisps(wisps, elapsed);
    },
  };
}

interface LegLayout {
  size: Triple;
  spread: number;
  lift: number;
  reach: number;
}

function fourLegs({ size, spread, lift, reach }: LegLayout): Block[] {
  return [-1, 1].flatMap((side) =>
    [-1, 1].map((end) => ({ size, position: [side * spread, lift, end * reach] as const })),
  );
}

function curlyTail(): THREE.BufferGeometry {
  const { radius, tube, arc } = PIGGY_TAIL;
  return new THREE.TorusGeometry(radius, tube, ROUND_SEGMENTS.height, ROUND_SEGMENTS.width, arc);
}

function coinGeometry(): THREE.BufferGeometry {
  const { radius, depth } = PIGGY_COIN;
  return new THREE.CylinderGeometry(radius, radius, depth, ROUND_SEGMENTS.width);
}

function shadowDrop(): THREE.BufferGeometry {
  const profile = SHADOW_PROFILE.map(([radius, height]) => new THREE.Vector2(radius, height));
  return new THREE.LatheGeometry(profile, ROUND_SEGMENTS.width);
}

function swayWisps(wisps: readonly THREE.Object3D[], elapsed: number): void {
  wisps.forEach((wisp, index) => {
    const phase = elapsed * WISP_SWAY.speed + index * WISP_SWAY.lag;
    wisp.rotation.z = Math.sin(phase) * WISP_SWAY.angle;
  });
}

function shadowWisp(root: Triple, material: THREE.Material): THREE.Group {
  const segments = ROUND_SEGMENTS.height;
  return pivot(
    root,
    ...SHADOW_WISP_PUFFS.map(({ radius, position }) =>
      part(new THREE.SphereGeometry(radius, segments, segments), material, { position }),
    ),
  );
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
