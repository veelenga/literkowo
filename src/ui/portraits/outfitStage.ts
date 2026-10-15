import * as THREE from 'three';
import type { HatSpec, PetSpec } from '../../course/shop';
import { CHARACTER_HEIGHT, mountOnHead } from '../../game/characterModel';
import { buildHat } from '../../game/cosmetics/hats';
import { buildPet, type PetModel } from '../../game/cosmetics/pets';
import { disposeObject } from '../../game/disposal';
import { CharacterStage, type IdleCharacter } from './characterStage';

export interface Outfit {
  readonly character: string;
  readonly hat?: HatSpec;
  readonly pet?: PetSpec;
}

export const STILL_POSE_TIME = 0.4;

const FRAMING = { framedHeight: CHARACTER_HEIGHT * 1.55, focusHeight: CHARACTER_HEIGHT * 0.62 };
const HERO_SPOT = new THREE.Vector3(-0.17, 0, 0.1);
const PET_SPOT = new THREE.Vector3(0.45, 1, -0.46);
const PET_BOB = { speed: 2.3, height: 0.1 };
const SWAY = { speed: 0.45, angle: 0.4 };

export class OutfitStage extends CharacterStage {
  private readonly petSpot = new THREE.Group();

  constructor() {
    super(FRAMING);
    this.petSpot.position.copy(PET_SPOT);
    this.turntable.position.copy(HERO_SPOT);
    this.scene.add(this.petSpot);
  }

  addPet(spec: PetSpec): PetModel {
    const pet = buildPet(spec);
    this.petSpot.add(pet.object);
    return pet;
  }

  removePet(pet: PetModel): void {
    pet.object.removeFromParent();
    disposeObject(pet.object);
  }

  pose(elapsed: number, pet: PetModel | undefined, sway: boolean): void {
    pet?.animate(elapsed);
    this.petSpot.position.y = PET_SPOT.y + Math.sin(elapsed * PET_BOB.speed) * PET_BOB.height;
    this.turntable.rotation.y = sway ? Math.sin(elapsed * SWAY.speed) * SWAY.angle : 0;
  }
}

export function wearHat(character: IdleCharacter, spec: HatSpec): THREE.Object3D {
  const hat = buildHat(spec);
  mountOnHead(character.model, hat);
  return hat;
}
