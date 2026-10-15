import * as THREE from 'three';
import type { HatSpec, PetSpec } from '../../course/shop';
import { CHARACTER_HEIGHT, mountOnHead } from '../../game/characterModel';
import { buildHat } from '../../game/cosmetics/hats';
import { buildPet, type PetModel } from '../../game/cosmetics/pets';
import { disposeObject } from '../../game/disposal';
import { CharacterStage, type IdleCharacter, type StageFraming } from './characterStage';

export interface Outfit {
  readonly character: string;
  readonly hat?: HatSpec;
  readonly pet?: PetSpec;
}

export interface OutfitLayout {
  readonly framing: StageFraming;
  readonly heroSpot: THREE.Vector3;
  readonly petSpot: THREE.Vector3;
  readonly petScale: number;
}

export const STILL_POSE_TIME = 0.4;

export const SHOWCASE_LAYOUT: OutfitLayout = {
  framing: { framedHeight: CHARACTER_HEIGHT * 1.55, focusHeight: CHARACTER_HEIGHT * 0.62 },
  heroSpot: new THREE.Vector3(-0.17, 0, 0.1),
  petSpot: new THREE.Vector3(0.45, 1, -0.46),
  petScale: 1,
};

const PET_BOB = { speed: 2.3, height: 0.1 };
const SWAY = { speed: 0.45, angle: 0.4 };

export class OutfitStage extends CharacterStage {
  private readonly petSpot = new THREE.Group();

  constructor(private readonly layout: OutfitLayout = SHOWCASE_LAYOUT) {
    super(layout.framing);
    this.petSpot.position.copy(layout.petSpot);
    this.petSpot.scale.setScalar(layout.petScale);
    this.turntable.position.copy(layout.heroSpot);
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
    this.petSpot.position.y =
      this.layout.petSpot.y + Math.sin(elapsed * PET_BOB.speed) * PET_BOB.height;
    this.turntable.rotation.y = sway ? Math.sin(elapsed * SWAY.speed) * SWAY.angle : 0;
  }
}

export function wearHat(character: IdleCharacter, spec: HatSpec): THREE.Object3D {
  const hat = buildHat(spec);
  mountOnHead(character.model, hat);
  return hat;
}
