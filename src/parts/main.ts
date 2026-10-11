/**
 * Parts gallery (parts.html): every part of src/model/lib on a labelled grid, with orbit controls.
 *
 * Query: `part=<id>` shows one exhibit alone and frames it; `view=<three-quarter|front|side|back|rear-quarter|top|low>` picks the angle (default three-quarter);
 * `closeup=<name>` frames one of the exhibit's named close-up boxes; `shot=1` is capture mode (no animation, no controls, `window.__shotReady = true` once at least 5 frames have rendered);
 * `noui=1` hides the labels. `window.__parts` lists every exhibit for capture scripts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { catalogue } from './catalogue.js';
import type { PartEntry } from './entry.js';
import { boundsOf, buildExhibit, createStage, frame, light, VIEWS, type ViewName } from './stage.js';

declare global {
  interface Window {
    /** Capture contract (docs/design/spec.md, Query contract): true once at least 5 frames have rendered. */
    __shotReady?: boolean;
    /** Every exhibit: id, label, group and the names of its close-ups. */
    __parts?: { id: string; label: string; group: string; closeups: string[] }[];
  }
}

const READY_FRAMES = 5;
/** Overview cells: each exhibit is scaled to fit this many metres, on this pitch. */
const CELL = 4.5;
const PITCH = 6.5;
const PER_ROW = 8;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot') === '1';
const noUi = params.get('noui') === '1';
const partId = params.get('part');
const viewParam = params.get('view') ?? 'three-quarter';
const viewName: ViewName = viewParam in VIEWS ? (viewParam as ViewName) : 'three-quarter';
const closeup = params.get('closeup');

window.__parts = catalogue.map((entry) => ({ id: entry.id, label: entry.label, group: entry.group, closeups: Object.keys(entry.closeups ?? {}) }));

const stage = createStage();
const labels: { element: HTMLElement; anchor: THREE.Vector3 }[] = [];
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px/1.25 system-ui,sans-serif;color:#1d2228';
document.body.appendChild(overlay);

function label(text: string, anchor: THREE.Vector3, strong = false): void {
  if (noUi) return;
  const element = document.createElement('div');
  element.textContent = text;
  element.style.cssText = `position:absolute;transform:translate(-50%,0);white-space:pre;text-align:center;padding:1px 4px;background:rgba(255,255,255,0.72);border-radius:3px;${strong ? 'font-weight:600;font-size:14px;' : 'font-size:10px;'}`;
  overlay.appendChild(element);
  labels.push({ element, anchor });
}

function sizeText(box: THREE.Box3): string {
  const size = box.getSize(new THREE.Vector3());
  return `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`;
}

function message(text: string): void {
  const element = document.createElement('div');
  element.textContent = text;
  element.style.cssText = 'position:fixed;left:16px;top:16px;right:16px;padding:8px 12px;background:#fff3f0;color:#7a1d10;font:14px system-ui,sans-serif;border-radius:4px';
  document.body.appendChild(element);
}

function showOne(entry: PartEntry): THREE.Box3 {
  const group = buildExhibit(entry);
  stage.scene.add(group);
  const box = boundsOf(group);
  light(stage, box);
  const view = VIEWS[viewName];
  const target = closeup !== null ? entry.closeups?.[closeup] : undefined;
  if (closeup !== null && target === undefined) {
    const names = Object.keys(entry.closeups ?? {});
    message(`Exhibit "${entry.id}" has no close-up "${closeup}"; it has: ${names.length > 0 ? names.join(', ') : 'none'}.`);
  }
  const framed = target !== undefined ? new THREE.Box3(new THREE.Vector3(...target.min), new THREE.Vector3(...target.max)) : box;
  frame(stage, framed, view[0], view[1], target !== undefined ? 0.95 : 0.85);
  label(`${entry.label} — ${sizeText(box)}`, new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, box.max.z));
  return framed;
}

function showAll(): THREE.Box3 {
  const groups = [...new Set(catalogue.map((entry) => entry.group))];
  const gallery = new THREE.Group();
  stage.scene.add(gallery);
  let row = 0;
  for (const name of groups) {
    const members = catalogue.filter((entry) => entry.group === name);
    label(name, new THREE.Vector3(-PITCH * 0.9, 0, -row * PITCH + 1), true);
    members.forEach((entry, index) => {
      if (index > 0 && index % PER_ROW === 0) row++;
      let exhibit: THREE.Group;
      try {
        exhibit = buildExhibit(entry);
      } catch (error) {
        // One broken exhibit must not blank the gallery; the console error fails the capture script.
        console.error(`Exhibit "${entry.id}" failed to build: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const box = boundsOf(exhibit);
      const size = box.getSize(new THREE.Vector3());
      const scale = CELL / Math.max(size.x, size.y, size.z, 1e-3);
      const centre = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      holder.add(exhibit);
      exhibit.position.set(-centre.x, -box.min.y, -centre.z);
      holder.scale.setScalar(scale);
      holder.position.set((index % PER_ROW) * PITCH, 0, -row * PITCH);
      gallery.add(holder);
      label(`${entry.id}
${sizeText(box)}`, new THREE.Vector3((index % PER_ROW) * PITCH, 0, -row * PITCH + CELL / 2 + 0.3));
    });
    row++;
  }
  const all = boundsOf(gallery);
  light(stage, all);
  frame(stage, all, 0, 50, 1.1);
  return all;
}

function resize(): void {
  stage.renderer.setSize(window.innerWidth, window.innerHeight);
  stage.camera.aspect = window.innerWidth / window.innerHeight;
  stage.camera.updateProjectionMatrix();
}

function placeLabels(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const p = new THREE.Vector3();
  for (const { element, anchor } of labels) {
    p.copy(anchor).project(stage.camera);
    const visible = p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
    element.style.display = visible ? 'block' : 'none';
    element.style.left = `${String(((p.x + 1) / 2) * width)}px`;
    element.style.top = `${String(((1 - p.y) / 2) * height + 4)}px`;
  }
}

function start(): void {
  // Size first: framing reads the camera's aspect.
  resize();
  let framed: THREE.Box3;
  if (partId !== null) {
    const entry = catalogue.find((candidate) => candidate.id === partId);
    if (entry === undefined) {
      message(`No exhibit "${partId}". Known ids: ${catalogue.map((candidate) => candidate.id).join(', ')}.`);
      framed = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
      frame(stage, framed, 35, 18);
    } else framed = showOne(entry);
  } else framed = showAll();
  if (viewName !== viewParam) message(`Unknown view "${viewParam}"; use one of ${Object.keys(VIEWS).join(', ')}.`);
  let frames = 0;
  const controls = shot ? null : new OrbitControls(stage.camera, stage.renderer.domElement);
  if (controls !== null) {
    controls.target.copy(framed.getCenter(new THREE.Vector3()));
    controls.enableDamping = true;
    controls.update();
  }
  const tick = (): void => {
    controls?.update();
    stage.renderer.render(stage.scene, stage.camera);
    placeLabels();
    frames += 1;
    if (frames >= READY_FRAMES) window.__shotReady = true;
    if (!shot || frames < READY_FRAMES) requestAnimationFrame(tick);
  };
  window.addEventListener('resize', () => {
    resize();
    stage.renderer.render(stage.scene, stage.camera);
    placeLabels();
  });
  requestAnimationFrame(tick);
}

start();
