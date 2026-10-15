import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DynamicResolution } from './DynamicResolution';
import type { QualityPreset } from './quality';

const BLOOM = { strength: 0.5, radius: 0.7, threshold: 0.8 };
const EXPOSURE = 1.05;
const INITIAL_SIZE = 1;
const MIN_BLOOM_SIZE = 1;
const MS_PER_SECOND = 1000;
const VISIBLE: DocumentVisibilityState = 'visible';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

interface Pipeline {
  readonly preset: QualityPreset;
  readonly composer: EffectComposer;
  readonly scenePass: RenderPass;
}

export type CameraFraming = (viewport: Viewport) => void;

interface Stage {
  container: HTMLElement;
  frame: CameraFraming;
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

function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  return renderer;
}

function createPipeline(
  renderer: THREE.WebGLRenderer,
  preset: QualityPreset,
  scene: THREE.Scene,
  camera: THREE.Camera,
): Pipeline {
  const target = new THREE.WebGLRenderTarget(INITIAL_SIZE, INITIAL_SIZE, {
    samples: preset.msaaSamples,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, target);
  const scenePass = new RenderPass(scene, camera);
  composer.addPass(scenePass);
  if (preset.bloom.enabled) composer.addPass(new ScaledBloomPass(preset.bloom.scale));
  composer.addPass(new OutputPass());
  return { preset, composer, scenePass };
}

function disposePipeline({ composer }: Pipeline): void {
  composer.passes.forEach((pass) => pass.dispose());
  composer.dispose();
}

function pixelRatioCap(preset: QualityPreset): number {
  return Math.min(window.devicePixelRatio, preset.maxPixelRatio);
}

class RenderHost {
  private renderer: THREE.WebGLRenderer | undefined;
  private pipeline: Pipeline | undefined;
  private stage: Stage | undefined;
  private resolution: DynamicResolution | undefined;
  private size: Viewport = { width: INITIAL_SIZE, height: INITIAL_SIZE };
  private readonly resizer = new ResizeObserver(() => this.resize());

  get viewport(): Viewport {
    return this.size;
  }

  attach(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    preset: QualityPreset,
    frame: CameraFraming,
  ): void {
    const renderer = (this.renderer ??= createRenderer());
    this.usePreset(renderer, preset, scene, camera);
    this.stage = { container, frame };
    this.resolution = new DynamicResolution(pixelRatioCap(preset));
    container.append(renderer.domElement);
    this.resizer.observe(container);
    this.resize();
  }

  detach(): void {
    this.resizer.disconnect();
    this.renderer?.domElement.remove();
    this.stage = undefined;
    this.resolution = undefined;
  }

  render(): void {
    if (this.stage) this.pipeline?.composer.render();
  }

  recordFrame(seconds: number): void {
    if (this.resolution?.record(seconds * MS_PER_SECOND)) this.applyPixelRatio();
  }

  private usePreset(
    renderer: THREE.WebGLRenderer,
    preset: QualityPreset,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    if (this.pipeline?.preset !== preset) {
      if (this.pipeline) disposePipeline(this.pipeline);
      this.pipeline = createPipeline(renderer, preset, scene, camera);
    }
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pipeline.scenePass.scene = scene;
    this.pipeline.scenePass.camera = camera;
  }

  private resize(): void {
    if (!this.renderer || !this.pipeline || !this.stage) return;
    const { container, frame } = this.stage;
    this.size = { width: container.clientWidth, height: container.clientHeight };
    const { width, height } = this.size;
    frame(this.size);
    this.applyPixelRatio();
    this.renderer.setSize(width, height);
    this.pipeline.composer.setSize(width, height);
    if (document.visibilityState === VISIBLE) this.pipeline.composer.render();
  }

  private applyPixelRatio(): void {
    if (!this.renderer || !this.pipeline || !this.resolution) return;
    const ratio = Math.min(this.resolution.pixelRatio, pixelRatioCap(this.pipeline.preset));
    if (this.renderer.getPixelRatio() === ratio) return;
    this.renderer.setPixelRatio(ratio);
    this.pipeline.composer.setPixelRatio(ratio);
  }
}

export const renderHost = new RenderHost();
