import * as THREE from 'three';
import { createAssetCache } from '../../assetCache';
import { Enemy, themedBody, type EnemyBody, type EnemyLook } from '../../Enemy';
import { mergeParts, placed } from '../../effects/chunkyGeometry';
import { coreGeometry } from '../../effects/enemyStyles';
import type { EnemyShape } from '../../themes';
import { MERGED_TAG } from './rules';

const MERGED_SCALE = 1.6;
const SHELL_DARKEN = 0.4;
const SHELL_OPACITY_BOOST = 0.12;
const MAX_SHELL_OPACITY = 0.85;
const EXTRA_SPARKS = 2;
const TWIN_CORE_SIZE = 0.8;
const TWIN_CORE_SPREAD = 0.65;
const LABEL_LIFT = 0.7;
const IGNITE_COLOR = new THREE.Color(0xffffff);
const IGNITE_DURATION = 0.45;
const MERGED_LABEL_CLASS = 'is-merged';

const twinCores = createAssetCache<THREE.BufferGeometry>();

function twinCoreGeometry(shape: EnemyShape): THREE.BufferGeometry {
  return twinCores.get(shape, () => buildTwinCore(coreGeometry(shape)));
}

function buildTwinCore(core: THREE.BufferGeometry): THREE.BufferGeometry {
  const single = core.clone().scale(TWIN_CORE_SIZE, TWIN_CORE_SIZE, TWIN_CORE_SIZE);
  const offset = widthOf(single) * TWIN_CORE_SPREAD;
  const twins = [-offset, offset].map((x) => placed(single.clone(), { position: [x, 0, 0] }));
  single.dispose();
  return mergeParts(twins);
}

function widthOf(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  return geometry.boundingBox?.getSize(new THREE.Vector3()).x ?? 0;
}

function mergedBody(shape: EnemyShape): EnemyBody {
  const body = themedBody(shape);
  return {
    ...body,
    core: twinCoreGeometry(shape),
    shellShade: body.shellShade * SHELL_DARKEN,
    shellOpacity: Math.min(MAX_SHELL_OPACITY, body.shellOpacity + SHELL_OPACITY_BOOST),
    sparkCount: body.sparkCount + EXTRA_SPARKS,
  };
}

export class MergedEnemy extends Enemy {
  constructor(word: string, label: HTMLElement, speed: number, look: EnemyLook) {
    super(word, label, speed, { ...look, scale: MERGED_SCALE }, mergedBody(look.shape));
    this.tags.add(MERGED_TAG);
    this.label.classList.add(MERGED_LABEL_CLASS);
  }

  override get labelHeight(): number {
    return super.labelHeight + LABEL_LIFT;
  }

  ignite(): void {
    this.startFlash(IGNITE_COLOR, IGNITE_DURATION);
    this.face?.flare();
  }
}
