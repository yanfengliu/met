/**
 * The viewer: renderer, scene, environment, camera rig and section cut around one model root.
 * Renderer: WebGL2, MSAA, `preserveDrawingBuffer: true` (headless capture reads a blank canvas without it), ACES filmic tone mapping, sRGB output,
 * PCF soft shadows re-rendered only when the model or the cut changed, and local clipping for the section cut.
 */
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, Scene, WebGLRenderer } from 'three';
import type { Box3, Material, Mesh, Object3D } from 'three';

import { CameraRig } from './camera-rig.js';
import { createEnvironment } from './environment.js';
import type { Environment } from './environment.js';
import { SectionCut } from './section-cut.js';

export interface ViewerModel {
  readonly root: Object3D;
  readonly bounds: Box3;
  readonly casterBounds: Box3;
  readonly materials: Iterable<Material>;
  /** Meshes the section cap pass leaves out (transparent ones: glass would otherwise show its back faces in the cut colour). */
  readonly capExcluded: readonly Mesh[];
}

const MAX_PIXEL_RATIO = 2;

export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly rig: CameraRig;
  readonly cut = new SectionCut();
  readonly env: Environment;
  private shadowsDirty = true;
  private insetBottom = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly model: ViewerModel,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.outputColorSpace = SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.localClippingEnabled = true;
    r.domElement.setAttribute('aria-label', 'The build of the model; drag to orbit, wheel or pinch to zoom, right-drag to pan');
    r.domElement.setAttribute('role', 'img');
    r.domElement.dataset['testid'] = 'canvas';
    container.appendChild(r.domElement);

    this.env = createEnvironment(r, this.scene, model.bounds, model.casterBounds);
    this.cut.attach(model.materials);
    this.scene.add(model.root);
    this.rig = new CameraRig(r.domElement, this.env.groundY);
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.rig.resize(width, height, this.insetBottom);
  }

  /** Pixels at the bottom of the canvas covered by the timeline bar; the camera frames the part above them. */
  setInsetBottom(pixels: number): void {
    if (pixels === this.insetBottom) return;
    this.insetBottom = pixels;
    this.resize();
  }

  /** The shadow map is re-rendered on the next frame; call after the model moved or the cut changed. */
  markShadowsDirty(): void {
    this.shadowsDirty = true;
  }

  render(): void {
    const { renderer, scene, rig } = this;
    rig.updateClipping();
    if (this.shadowsDirty) {
      renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
    }
    renderer.render(scene, rig.camera);
    if (this.cut.enabled) this.renderCap();
  }

  /** Renders `frames` frames, each with a shadow update and a GPU sync, and returns the mean milliseconds per frame. Changes no model state. */
  benchmark(frames: number): number {
    const gl = this.renderer.getContext();
    const pixel = new Uint8Array(4);
    this.render();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const start = performance.now();
    for (let i = 0; i < frames; i += 1) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }
    return (performance.now() - start) / Math.max(1, frames);
  }

  /** The GPU and driver the page renders with, as WebGL reports them. */
  gpu(): string {
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return String(info === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }

  /** The back-face pass that makes cut solids read as solid; see src/viewer/section-cut.ts. */
  private renderCap(): void {
    const { renderer, scene, env } = this;
    const background = scene.background;
    const hidden = [env.sky, env.ground, ...this.model.capExcluded].filter((object) => object.visible);
    for (const object of hidden) object.visible = false;
    scene.background = null;
    scene.overrideMaterial = this.cut.capMaterial;
    renderer.autoClear = false;
    renderer.render(scene, this.rig.camera);
    renderer.autoClear = true;
    scene.overrideMaterial = null;
    scene.background = background;
    for (const object of hidden) object.visible = true;
  }
}
