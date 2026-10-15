import * as THREE from 'three';
import { hatSpec, itemKey, petSpec, SHOP_ITEMS } from '../../course/shop';
import { chunkyBlock } from '../../game/effects/chunkyGeometry';
import { buildHat } from '../../game/cosmetics/hats';
import { buildPet, type PetModel } from '../../game/cosmetics/pets';
import { disposeObject } from '../../game/disposal';
import type { PortraitRenderer } from '../CharacterPortraits';
import { canvasToDataUrl } from './canvasImage';
import { createCharacterRenderer, createLights } from './characterStage';

const PREVIEW_SIZE = 256;
const PREVIEW_PIXEL_RATIO = 1;
const FIELD_OF_VIEW = 30;
const NEAR_PLANE = 0.05;
const FAR_PLANE = 60;
const FRAME_MARGIN = 1.08;
const VIEW_AZIMUTH = THREE.MathUtils.degToRad(28);
const PET_ELEVATION = THREE.MathUtils.degToRad(14);
const HAT_ELEVATION = THREE.MathUtils.degToRad(24);
const POSE_TIME = 0.4;
const MANNEQUIN_COLOR = 0x6274c4;
const MANNEQUIN_SIZE = 1;
const MANNEQUIN_ROUGHNESS = 0.8;
const STUDIO_CLOSED_ERROR = 'The item studio is closed';
const UNKNOWN_ITEM_ERROR = 'There is no pet or hat with the key';

interface Pose {
  readonly model: THREE.Object3D;
  readonly elevation: number;
}

export class ItemStudio implements PortraitRenderer {
  private readonly renderer = createCharacterRenderer({ preserveDrawingBuffer: true });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR_PLANE, FAR_PLANE);
  private closed = false;

  constructor() {
    this.renderer.setPixelRatio(PREVIEW_PIXEL_RATIO);
    this.renderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
    this.scene.add(...createLights());
  }

  render(key: string): Promise<string> {
    if (this.closed) return Promise.reject(new Error(STUDIO_CLOSED_ERROR));
    const pose = poseFor(key);
    if (!pose) return Promise.reject(new Error(`${UNKNOWN_ITEM_ERROR} ${key}`));
    this.scene.add(pose.model);
    this.frame(pose);
    this.renderer.render(this.scene, this.camera);
    this.scene.remove(pose.model);
    disposeObject(pose.model);
    return canvasToDataUrl(this.renderer.domElement);
  }

  dispose(): void {
    this.closed = true;
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private frame({ model, elevation }: Pose): void {
    const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
    const halfView = THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2);
    const distance = (sphere.radius / Math.sin(halfView)) * FRAME_MARGIN;
    const polar = Math.PI / 2 - elevation;
    this.camera.position.setFromSphericalCoords(distance, polar, VIEW_AZIMUTH).add(sphere.center);
    this.camera.lookAt(sphere.center);
  }
}

function poseFor(key: string): Pose | undefined {
  const item = SHOP_ITEMS.find((candidate) => itemKey(candidate) === key);
  const pet = item?.kind === 'pet' ? petSpec(item.id) : undefined;
  const hat = item?.kind === 'hat' ? hatSpec(item.id) : undefined;
  if (pet) return { model: posedPet(buildPet(pet)), elevation: PET_ELEVATION };
  if (hat) return { model: onMannequin(buildHat(hat)), elevation: HAT_ELEVATION };
  return undefined;
}

function posedPet(pet: PetModel): THREE.Object3D {
  pet.animate(POSE_TIME);
  return pet.object;
}

function onMannequin(hat: THREE.Object3D): THREE.Object3D {
  const head = new THREE.Mesh(
    chunkyBlock(MANNEQUIN_SIZE, MANNEQUIN_SIZE, MANNEQUIN_SIZE),
    new THREE.MeshStandardMaterial({ color: MANNEQUIN_COLOR, roughness: MANNEQUIN_ROUGHNESS }),
  );
  head.position.y = -MANNEQUIN_SIZE / 2;
  return new THREE.Group().add(head, hat);
}
