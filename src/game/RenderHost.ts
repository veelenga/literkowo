import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const BLOOM = { strength: 0.5, radius: 0.7, threshold: 0.8 };
const BLOOM_SCALE = 0.5;
const MIN_BLOOM_SIZE = 1;
const MSAA_SAMPLES = 4;
const MAX_PIXEL_RATIO = 1.5;
const EXPOSURE = 1.05;
const INITIAL_SIZE = 1;
const VISIBLE: DocumentVisibilityState = 'visible';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

interface Pipeline {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scenePass: RenderPass;
}

interface Stage {
  container: HTMLElement;
  camera: THREE.PerspectiveCamera;
}

class ScaledBloomPass extends UnrealBloomPass {
  constructor(private readonly scale: number) {
    const resolution = new THREE.Vector2(INITIAL_SIZE, INITIAL_SIZE);
    super(resolution, BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  }

  override setSize(width: number, height: number): void {
    super.setSize(this.scaled(width), this.scaled(height));
  }

  private scaled(size: number): number {
    return Math.max(MIN_BLOOM_SIZE, Math.round(size * this.scale));
  }
}

function pixelRatio(): number {
  return Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
}

function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.setPixelRatio(pixelRatio());
  return renderer;
}

function createPipeline(scene: THREE.Scene, camera: THREE.Camera): Pipeline {
  const renderer = createRenderer();
  const target = new THREE.WebGLRenderTarget(INITIAL_SIZE, INITIAL_SIZE, {
    samples: MSAA_SAMPLES,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, target);
  const scenePass = new RenderPass(scene, camera);
  composer.addPass(scenePass);
  composer.addPass(new ScaledBloomPass(BLOOM_SCALE));
  composer.addPass(new OutputPass());
  return { renderer, composer, scenePass };
}

class RenderHost {
  private pipeline: Pipeline | undefined;
  private stage: Stage | undefined;
  private size: Viewport = { width: INITIAL_SIZE, height: INITIAL_SIZE };

  get viewport(): Viewport {
    return this.size;
  }

  attach(container: HTMLElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.pipeline ??= createPipeline(scene, camera);
    this.pipeline.scenePass.scene = scene;
    this.pipeline.scenePass.camera = camera;
    this.stage = { container, camera };
    container.append(this.pipeline.renderer.domElement);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  detach(): void {
    window.removeEventListener('resize', this.resize);
    this.pipeline?.renderer.domElement.remove();
    this.stage = undefined;
  }

  render(): void {
    if (this.stage) this.pipeline?.composer.render();
  }

  private readonly resize = (): void => {
    if (!this.pipeline || !this.stage) return;
    const { container, camera } = this.stage;
    const { renderer, composer } = this.pipeline;
    this.size = { width: container.clientWidth, height: container.clientHeight };
    camera.aspect = this.size.width / this.size.height;
    camera.updateProjectionMatrix();
    this.applyPixelRatio();
    renderer.setSize(this.size.width, this.size.height);
    composer.setSize(this.size.width, this.size.height);
    if (document.visibilityState === VISIBLE) composer.render();
  };

  private applyPixelRatio(): void {
    if (!this.pipeline) return;
    const ratio = pixelRatio();
    if (this.pipeline.renderer.getPixelRatio() === ratio) return;
    this.pipeline.renderer.setPixelRatio(ratio);
    this.pipeline.composer.setPixelRatio(ratio);
  }
}

export const renderHost = new RenderHost();
