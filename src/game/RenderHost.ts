import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { QualityPreset } from './quality';

const BLOOM = { strength: 0.5, radius: 0.7, threshold: 0.8 };
const EXPOSURE = 1.05;
const INITIAL_SIZE = 1;
const MIN_BLOOM_SIZE = 1;
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
  private size: Viewport = { width: INITIAL_SIZE, height: INITIAL_SIZE };

  get viewport(): Viewport {
    return this.size;
  }

  attach(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    preset: QualityPreset,
  ): void {
    const renderer = (this.renderer ??= createRenderer());
    this.usePreset(renderer, preset, scene, camera);
    this.stage = { container, camera };
    container.append(renderer.domElement);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  detach(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer?.domElement.remove();
    this.stage = undefined;
  }

  render(): void {
    if (this.stage) this.pipeline?.composer.render();
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
    renderer.shadowMap.type = preset.shadow.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.pipeline.scenePass.scene = scene;
    this.pipeline.scenePass.camera = camera;
  }

  private readonly resize = (): void => {
    if (!this.renderer || !this.pipeline || !this.stage) return;
    const { container, camera } = this.stage;
    this.size = { width: container.clientWidth, height: container.clientHeight };
    const { width, height } = this.size;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    this.applyPixelRatio();
    this.renderer.setSize(width, height);
    this.pipeline.composer.setSize(width, height);
    if (document.visibilityState === VISIBLE) this.pipeline.composer.render();
  };

  private applyPixelRatio(): void {
    if (!this.renderer || !this.pipeline) return;
    const ratio = pixelRatioCap(this.pipeline.preset);
    if (this.renderer.getPixelRatio() === ratio) return;
    this.renderer.setPixelRatio(ratio);
    this.pipeline.composer.setPixelRatio(ratio);
  }
}

export const renderHost = new RenderHost();
