// Scaffold stub: an empty sky scene that proves the toolchain end to end. The engine replaces it with the real boot.
import * as THREE from 'three';

declare global {
  interface Window {
    /** Capture contract (docs/design/spec.md, Query contract): true once at least 5 frames have rendered. */
    __shotReady?: boolean;
  }
}

const READY_FRAMES = 5;
const SKY_COLOUR = 0xc9dbe9;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOUR);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 2, 10);

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

let frames = 0;
function renderFrame(): void {
  renderer.render(scene, camera);
  frames += 1;
  if (frames < READY_FRAMES) requestAnimationFrame(renderFrame);
  else window.__shotReady = true;
}

window.addEventListener('resize', () => {
  resize();
  renderer.render(scene, camera);
});
resize();
requestAnimationFrame(renderFrame);
