/**
 * The world around the model: sky dome, haze, sun with soft shadows fitted to the model, hemisphere fill, PMREM room reflections, and a neutral workspace ground.
 * None of this is part of the model: the timeline never touches it, and the model's site chapter lays its own terrain on top of the workspace ground.
 */
import {
  BackSide,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PMREMGenerator,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import type { Box3, Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { SUN_AZIMUTH_DEG, SUN_ELEVATION_DEG, fitShadow, sunDirection } from './sun.js';

const HORIZON = new Color('#d3dbe2');
const ZENITH = new Color('#6f9fd6');
const SUN_COLOUR = new Color('#fff2df');
/** Haze (exponential squared): under 1% at 300 m, about 6% at 1 km, 60% at 4 km and all horizon colour by 10 km, so the ground fades into the sky. */
const FOG_DENSITY = 0.00025;
const GROUND_SIZE = 30_000;
/** One grid cell of the workspace ground, in metres. */
const GRID_CELL = 10;
/** The workspace ground lies this far below the lowest point of the model or of grade (y = 0), whichever is lower. */
export const GROUND_GAP = 0.5;
const SHADOW_MAP = 4096;

/** The workspace ground's height for a model with `bounds`: below everything, so model terrain always lies on top of it. */
export function workspaceGroundY(bounds: Box3): number {
  const lowest = bounds.isEmpty() ? 0 : Math.min(0, bounds.min.y);
  return lowest - GROUND_GAP;
}

function skyDome(toSun: { x: number; y: number; z: number }): Mesh {
  const material = new ShaderMaterial({
    name: 'sky',
    side: BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      horizon: { value: HORIZON },
      zenith: { value: ZENITH },
      sunColour: { value: SUN_COLOUR },
      toSun: { value: [toSun.x, toSun.y, toSun.z] },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // on the far plane, behind everything
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 horizon;
      uniform vec3 zenith;
      uniform vec3 sunColour;
      uniform vec3 toSun;
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        float up = max(d.y, 0.0);
        vec3 colour = mix(horizon, zenith, pow(up, 0.55));
        float sun = max(dot(d, normalize(toSun)), 0.0);
        colour += sunColour * (pow(sun, 900.0) * 3.0 + pow(sun, 12.0) * 0.18);
        gl_FragColor = vec4(colour, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new Mesh(new SphereGeometry(1, 48, 24), material);
  dome.name = 'sky';
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.scale.setScalar(1000);
  dome.onBeforeRender = (_renderer, _scene, camera) => {
    dome.position.copy(camera.position);
    dome.updateMatrixWorld();
  };
  return dome;
}

/**
 * The workspace ground material: a neutral matte colour with a 10 m grid drawn in the shader from world position, anti-aliased with screen-space
 * derivatives and faded out where cells shrink below a few pixels, so it never shimmers or forms moire at a distance (a repeated texture did).
 */
function groundMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ name: 'workspace', color: new Color('#a19e95'), roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec2 vGrid;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGrid = (modelMatrix * vec4(transformed, 1.0)).xz / ${GRID_CELL.toFixed(1)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vGrid;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 gridWidth = fwidth(vGrid);
        vec2 gridDistance = abs(fract(vGrid - 0.5) - 0.5) / max(gridWidth, vec2(1e-6));
        float gridLine = 1.0 - min(min(gridDistance.x, gridDistance.y), 1.0);
        float gridFade = 1.0 - smoothstep(0.06, 0.2, max(gridWidth.x, gridWidth.y));
        diffuseColor.rgb *= 1.0 - 0.1 * gridLine * gridFade;`,
      );
  };
  material.customProgramCacheKey = () => 'met-workspace-grid';
  return material;
}

export interface Environment {
  readonly sky: Mesh;
  readonly ground: Mesh;
  readonly sun: DirectionalLight;
  readonly groundY: number;
}

/** Adds sky, haze, lights, reflections and the workspace ground to `scene`, with the sun's shadow camera fitted to `casters`. */
export function createEnvironment(renderer: WebGLRenderer, scene: Scene, bounds: Box3, casters: Box3): Environment {
  const toSun = sunDirection(SUN_AZIMUTH_DEG, SUN_ELEVATION_DEG);
  const groundY = workspaceGroundY(bounds);
  scene.background = HORIZON.clone();
  scene.fog = new FogExp2(HORIZON.getHex(), FOG_DENSITY);

  const sky = skyDome(toSun);
  scene.add(sky);

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  scene.add(new HemisphereLight(new Color('#cfdfff'), new Color('#8a7f6d'), 0.75));

  const sun = new DirectionalLight(SUN_COLOUR, 2.7);
  sun.name = 'sun';
  sun.castShadow = true;
  const fit = fitShadow(casters.isEmpty() ? bounds : casters, toSun, groundY);
  sun.position.copy(fit.position);
  sun.target.position.copy(fit.target);
  const camera = sun.shadow.camera;
  camera.left = fit.left;
  camera.right = fit.right;
  camera.bottom = fit.bottom;
  camera.top = fit.top;
  camera.near = fit.near;
  camera.far = fit.far;
  camera.updateProjectionMatrix();
  const mapSize = Math.min(SHADOW_MAP, renderer.capabilities.maxTextureSize);
  sun.shadow.mapSize.set(mapSize, mapSize);
  const texel = Math.max(fit.right - fit.left, fit.top - fit.bottom) / mapSize;
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = Math.max(0.02, texel * 1.5);
  scene.add(sun, sun.target);

  const ground = new Mesh(new PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMaterial());
  ground.name = 'workspace-ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  scene.add(ground);
  return { sky, ground, sun, groundY };
}
