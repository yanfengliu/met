/**
 * The gallery's stage: renderer, sky, ground, sun with shadows, hemisphere fill and a PMREM room environment, plus helpers to frame a box from a named view.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { materialFor } from './materials.js';
import type { PartEntry } from './entry.js';

export const SKY_COLOUR = 0xc9dbe9;
/** Light comes from the front left and above, so mouldings read with a shadow under each projection. */
const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.75, 0.62).normalize();

export interface Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly ground: THREE.Mesh;
}

export function createStage(): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOUR);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
  pmrem.dispose();

  const hemisphere = new THREE.HemisphereLight(0xd6e3f0, 0x6b6355, 0.55);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 5000);
  return { renderer, scene, camera, sun, ground };
}

/** Builds an exhibit's meshes into a group: instanced where a piece has several placements. */
export function buildExhibit(entry: PartEntry): THREE.Group {
  const group = new THREE.Group();
  group.name = entry.id;
  for (const piece of entry.build()) {
    const material = materialFor(piece.role);
    const see = piece.role !== 'glass' && piece.role !== 'jet' && piece.role !== 'water';
    const matrices = piece.matrices ?? [new THREE.Matrix4()];
    if (matrices.length === 1) {
      const mesh = new THREE.Mesh(piece.geometry, material);
      mesh.applyMatrix4(matrices[0] ?? new THREE.Matrix4());
      mesh.castShadow = see;
      mesh.receiveShadow = true;
      group.add(mesh);
    } else {
      const mesh = new THREE.InstancedMesh(piece.geometry, material, matrices.length);
      matrices.forEach((matrix, index) => {
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      mesh.castShadow = see;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

/** Bounding box of a group, instances included. */
export function boundsOf(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) {
      child.computeBoundingBox();
      if (child.boundingBox !== null) box.union(child.boundingBox.clone().applyMatrix4(child.matrixWorld));
    } else if (child instanceof THREE.Mesh) {
      const geometry = child.geometry as THREE.BufferGeometry;
      geometry.computeBoundingBox();
      if (geometry.boundingBox !== null) box.union(geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));
    }
  });
  return box;
}

export type ViewName = 'three-quarter' | 'front' | 'side' | 'back' | 'top' | 'low' | 'rear-quarter' | 'up';

/** Azimuth from +Z toward +X and elevation, degrees. */
export const VIEWS: Readonly<Record<ViewName, readonly [number, number]>> = {
  'three-quarter': [35, 18],
  front: [0, 6],
  side: [90, 8],
  back: [180, 15],
  'rear-quarter': [215, 30],
  top: [20, 72],
  low: [25, -12],
  // Standing inside under the exhibit's centre, looking up (domes, vaults, laylights); see `lookUp`.
  up: [0, 90],
};

/** Places the camera 1.6 m above the floor under `box`'s centre, looking straight up with +Z (the front) at the bottom of the view. */
export function lookUp(stage: Stage, box: THREE.Box3): void {
  const { camera } = stage;
  const centre = box.getCenter(new THREE.Vector3());
  camera.position.set(centre.x, box.min.y + 1.6, centre.z);
  camera.up.set(0, 0, -1);
  camera.near = 0.05;
  camera.far = box.getSize(new THREE.Vector3()).length() * 4 + 10;
  camera.fov = 100;
  camera.lookAt(centre.x, box.max.y, centre.z);
  camera.updateProjectionMatrix();
  // The sun cannot reach under a dome; a soft light at the eye shows the interior's forms.
  const fill = new THREE.PointLight(0xfff4e6, 22, 0, 1.2);
  fill.position.copy(camera.position);
  stage.scene.add(fill);
}

/** Places the camera to frame `box` from azimuth/elevation (degrees), filling about `fill` of the view. */
export function frame(stage: Stage, box: THREE.Box3, azimuthDeg: number, elevationDeg: number, fill = 0.85): void {
  const { camera } = stage;
  const centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2);
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const direction = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const fov = (camera.fov * Math.PI) / 180;
  const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
  const distance = radius / Math.sin(fit / 2) / fill;
  camera.position.copy(centre).addScaledVector(direction, distance);
  // Keep the camera above the ground for low views of things standing on it.
  if (camera.position.y < 0.15) camera.position.y = 0.15;
  camera.near = Math.max(0.01, distance / 200);
  camera.far = distance * 20 + radius * 4;
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
}

/** Fits the sun's shadow camera and the ground to `box`. */
export function light(stage: Stage, box: THREE.Box3): void {
  const centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(1, box.getSize(new THREE.Vector3()).length() / 2);
  const { sun, ground } = stage;
  sun.position.copy(centre).addScaledVector(SUN_DIRECTION, radius * 3);
  sun.target.position.copy(centre);
  const cam = sun.shadow.camera;
  cam.left = -radius * 1.2;
  cam.right = radius * 1.2;
  cam.top = radius * 1.2;
  cam.bottom = -radius * 1.2;
  cam.near = radius * 0.5;
  cam.far = radius * 6;
  cam.updateProjectionMatrix();
  ground.scale.set(radius * 12, radius * 12, 1);
  ground.position.x = centre.x;
  ground.position.z = centre.z;
}
