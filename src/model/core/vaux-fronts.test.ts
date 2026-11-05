/**
 * Work unit 15's gates on the 1880 fronts (exterior.md section 9). From the court-floor camera of [C7]'s renders, the Lehman Wing's court shows the west
 * front's central arch's head as exterior-images.md #60 shows it: each face of its voussoirs and inner order that looks out of the wall is the first thing
 * a ray from the camera meets, at its centroid and at each of its corners drawn 2 cm in, among every opaque piece of the wing's structure and glass and of
 * the west front itself. And each 1880 head moves as one in the build: at five moments through its step, its light and dark pieces stand at one matrix and
 * are drawn or not alike.
 * Bound: geometry is built in Node without WebGL, so these read ray hits on the built pieces and the timeline's instance matrices, not rendered pixels.
 * The sightline samples points, not whole faces. The court's ring walls stand 0.29 m into its east opening, so from this camera they hide the head's faces
 * beyond 2.01 m of the axis, the outer halves of its lowest stones, which #60 shows (section 9); the samples stop at 1.95 m. They start 0.1 m over the
 * springing, where the impost band's top, 5 cm prouder than the inner order, hides the faces' lowest centimetres from below. The wing's flat roof hides
 * the other four heads from this camera, so it reads the central one. The motion is read at five moments, 0.2 apart, through each step that holds heads;
 * every piece's window lasts at least 0.25 of its step (src/build/stagger.ts), so each holds one, and a dropping piece is off its place until it lands.
 * Red proofs (2026-11-04): the sightline went red with the court's east lintel back on the flat roof (12.0 m; 398 points hidden), with the strip's head
 * back at 12.9 m (110) and with it at 13.8 m, where the lead flat cuts the crown (27), and with the central head's light piece left out of its step; the
 * motion, rerun with the drawn check (review 4), went red with `vaux-openings` popping its pieces about their own centres (25 problems), staggered by Z
 * (17: 15 of matrices, 2 of drawing), and dropping each piece by its own height (25). No model change fails the drawn check alone: a head's two pieces
 * share an order, so they are drawn alike unless a change gives them different windows, and then their matrices differ at the same moments (both of the
 * Z stagger's drawing problems). It went red alone only with the engine's state changed under it: a light head's mesh hidden, or its count zeroed (Codex,
 * review 4).
 * The openings the owner chose on 2026-11-04 (work unit 15's follow-up; review 5, F45, F47 and F48): the west front's doorways beside the entrance and
 * the corridors through the east front's inner arches stand clear through the wall, each over a box pinned here from its sources rather than read from
 * the code that builds it (rays along Z every 0.1 m across and up each box, 2 cm in from its sides, from 5 cm over the floor to 5 cm under its head,
 * through the wall and 0.3 m out from each face, against every piece of the core, the Hunt Wing and the Lehman Wing); the brick filling each inner arch
 * round its corridor arrives with the floor band and apron in front of it, at one offset from their places and drawn alike at five moments of its
 * step; and while the openings' step drops its pieces, each ground window under a west doorway stays under the main floor, where that doorway begins.
 * Bound: rays, not the walker's capsule, so a gap between rays goes unseen; the brick's motion is read at five moments, as the heads' is, and the
 * ground windows every 0.005 of the step, as a dropping piece stands highest where it starts.
 * Red proofs (2026-11-04): the corridors 1 m wide (640 rays blocked) or 2 m high (760), and the side doorways closed again (2,736), turn the openings'
 * check red; the brick built with the walls, whose step holds no trim in front of it, turns its motion check red (6 problems); the step's earlier
 * 2.5 m drop turns the ground windows' check red (14 samples over the floor).
 */
import { Box3, Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { huntSteps } from '../hunt/index.js';
import { lehmanStructureSteps } from '../roche-south/lehman.js';
import { lehmanGlassSteps } from '../roche-south/lehman-glass.js';
import { EAST_Z, WEST_Z } from './constants.js';
import { medievalHallSteps } from './index.js';
import { INNER_EAST_Z, INNER_WEST_Z } from './layout.js';
import { vauxSteps } from './vaux.js';
import { SPRING_Y } from './vaux-arch.js';

/** The court-floor camera of exterior.md [C7]'s renders, 1.5 m over the court's floor on the axis, under the pyramid. */
const COURT_CAMERA = new Vector3(0, -0.84, -158);
/** How far from the axis the court's east opening lets this camera see the front's face: 2.01 m, less a margin. */
const SEEN_HALF_WIDTH = 1.95;
/** A sample corner is drawn this far toward its face's centroid. */
const INSET = 0.02;

/** A piece as a mesh at its world matrix, named by its step, material and geometry. */
function meshOf(step: StepDef, piece: { readonly geometry: BufferGeometry; readonly material: Material; readonly matrix: Matrix4 }): Mesh {
  const mesh = new Mesh(piece.geometry, piece.material);
  mesh.name = `${step.id}/${piece.material.name}/${piece.geometry.name}`;
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(piece.matrix);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** Points on a mesh's triangles that look out of the west front (world normal within 25° of −Z): each centroid and each corner drawn INSET toward it. */
function frontSamples(mesh: Mesh): Vector3[] {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const count = index === null ? position.count : index.count;
  const corner = (k: number): Vector3 => new Vector3().fromBufferAttribute(position, index === null ? k : index.getX(k)).applyMatrix4(mesh.matrixWorld);
  const out: Vector3[] = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const corners = [corner(k), corner(k + 1), corner(k + 2)] as const;
    const [a, b, c] = corners;
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (normal.length() < 1e-9 || normal.normalize().z > -0.9) continue;
    const centroid = a.clone().add(b).add(c).divideScalar(3);
    out.push(centroid, ...corners.map((p) => p.clone().add(centroid.clone().sub(p).setLength(Math.min(INSET, p.distanceTo(centroid))))));
  }
  return out;
}

function matrixAt(mesh: InstancedMesh, slot: number): Matrix4 {
  const m = new Matrix4();
  mesh.getMatrixAt(slot, m);
  return m;
}

describe('the 1880 west front from the Lehman court', () => {
  it("shows its central arch's head as #60 does: within 1.95 m of the axis, each of its faces that looks out is met first by the rays to its points", () => {
    const lehman = [...lehmanStructureSteps, ...lehmanGlassSteps].flatMap((step) => collectStep(step).pieces.filter((p) => !p.material.transparent).map((p) => meshOf(step, p)));
    const steps = vauxSteps.filter((s) => s.id === 'vaux-west-front' || s.id === 'vaux-openings');
    expect(steps.length, 'the west front and openings steps').toBe(2);
    const front = steps.flatMap((step) => collectStep(step).pieces.filter((p) => !p.material.transparent).map((p) => ({ mesh: meshOf(step, p), piece: p })));
    const heads = front.filter(({ piece }) => piece.geometry.name.includes(':west:') && Math.abs(piece.matrix.elements[12]) < 1e-6).map(({ mesh }) => mesh);
    expect(heads.length, "the central head's light and dark pieces").toBe(2);
    const targets = heads.flatMap((mesh) => frontSamples(mesh).filter((p) => Math.abs(p.x) <= SEEN_HALF_WIDTH && p.y >= SPRING_Y + 0.1 && p.z <= WEST_Z + 1e-3).map((point) => ({ mesh, point })));
    expect(targets.length, 'points sampled').toBeGreaterThan(400);
    const scene = [...lehman, ...front.map(({ mesh }) => mesh)];
    const hidden = targets.flatMap(({ mesh, point }) => {
      const along = point.clone().sub(COURT_CAMERA);
      const ray = new Raycaster(COURT_CAMERA, along.clone().normalize(), 0, along.length() + 0.05);
      const hit = ray.intersectObjects(scene, false)[0];
      if (hit !== undefined && hit.object === mesh && Math.abs(hit.distance - along.length()) < 0.01) return [];
      const at = (v: Vector3): string => v.toArray().map((x) => x.toFixed(2)).join(', ');
      return [`(${at(point)}): ${hit === undefined ? 'nothing' : `${hit.object.name} at (${at(hit.point)})`}`];
    });
    expect(hidden).toEqual([]);
  });
});

describe('the 1880 heads in the build', () => {
  it("move as one: at five moments of their step, each head's light and dark pieces stand at one matrix and are drawn or not alike", () => {
    const timeline = new Timeline(vauxSteps);
    const problems: string[] = [];
    let pairs = 0;
    timeline.steps.forEach((step, i) => {
      // At rest, each head's instances stand at their final matrices: pair each light instance with the dark one at its matrix.
      timeline.evaluate(i + 1);
      const instances = step.meshes.flatMap((mesh) =>
        mesh.geometry.name.startsWith('vauxHead:') ? Array.from({ length: mesh.count }, (_, slot) => ({ mesh, slot, tone: mesh.geometry.name.split(':')[1] ?? '', rest: matrixAt(mesh, slot) })) : [],
      );
      const here = instances.filter((p) => p.tone === 'light').map((light) => ({ light, dark: instances.find((d) => d.tone === 'dark' && d.rest.equals(light.rest)) }));
      for (const { light, dark } of here) if (dark === undefined) problems.push(`${step.def.id} ${light.mesh.geometry.name} slot ${String(light.slot)}: no dark piece at its matrix`);
      pairs += here.length;
      for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        timeline.evaluate(i + f);
        for (const { light, dark } of here) {
          if (dark === undefined) continue;
          const [a, b] = [matrixAt(light.mesh, light.slot), matrixAt(dark.mesh, dark.slot)];
          const gap = a.elements.reduce((most, v, k) => Math.max(most, Math.abs(v - (b.elements[k] ?? 0))), 0);
          if (gap > 1e-6) problems.push(`${step.def.id} at f ${String(f)}: ${light.mesh.geometry.name} slot ${String(light.slot)} and its dark piece differ by ${gap.toFixed(3)}`);
          // A mesh draws its first `count` slots, in arrival order (src/build/timeline.ts).
          const drawn = (p: { readonly mesh: InstancedMesh; readonly slot: number }): boolean => p.mesh.visible && p.slot < p.mesh.count;
          if (drawn(light) !== drawn(dark)) problems.push(`${step.def.id} at f ${String(f)}: ${light.mesh.geometry.name} slot ${String(light.slot)} drawn ${String(drawn(light))}, its dark piece ${String(drawn(dark))}`);
        }
      }
    });
    expect(problems).toEqual([]);
    // Five on the west front, twelve on the side walls and four on the east front.
    expect(pairs).toBe(21);
  });
});

/** The main floor (src/model/frame.ts MAIN_FLOOR_Y). */
const MAIN_FLOOR = 4.11;
/**
 * The west front's doorways beside the entrance: the floor map's doors through the front (research/cache/lm_features.json, its canonical frame), X
 * −6.92..−4.63 and +4.61..+6.91, each clear from the main floor to 5.7 m over it, under the impost band, whose bottom #60 puts 5.76 m over it.
 */
const WEST_DOORWAYS = [
  [-6.92, -4.63],
  [4.61, 6.91],
] as const;
const WEST_DOORWAY_HEAD = MAIN_FLOOR + 5.7;
/**
 * The corridors through the east front's inner arches: 1.78 m wide against each arch's outer jamb at X ±7.10, within 6 cm of the floor map's doors,
 * X −7.04..−5.26 and +5.31..+7.06, clear from the main floor to their 4 m head (E). The arches' clear openings, 2.6 m at X ±5.8, take the brick round them.
 */
const EAST_CORRIDORS = [
  [-7.1, -5.32],
  [5.32, 7.1],
] as const;
const MAP_EAST_DOORS = [
  [-7.04, -5.26],
  [5.31, 7.06],
] as const;
const EAST_CORRIDOR_HEAD = MAIN_FLOOR + 4.0;
const EAST_ARCH_OPENINGS = [
  [-7.1, -4.5],
  [4.5, 7.1],
] as const;
/** The east windows' sill, 0.7 m over the main floor: the band and apron under it stand in front of the brick. */
const EAST_SILL = MAIN_FLOOR + 0.7;

/** Each piece of `scene` met on rays along +Z through a box, every 0.1 m across X and up Y inside it, 2 cm in from its sides and 5 cm in from floor and head. */
function blockers(scene: readonly Mesh[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): string[] {
  const out: string[] = [];
  const nx = Math.ceil((x1 - x0 - 0.04) / 0.1);
  const ny = Math.ceil((y1 - y0 - 0.1) / 0.1);
  for (let i = 0; i <= nx; i++) {
    const x = x0 + 0.02 + ((x1 - x0 - 0.04) * i) / nx;
    for (let j = 0; j <= ny; j++) {
      const y = y0 + 0.05 + ((y1 - y0 - 0.1) * j) / ny;
      const hit = new Raycaster(new Vector3(x, y, z0), new Vector3(0, 0, 1), 0, z1 - z0).intersectObjects([...scene], false)[0];
      if (hit !== undefined) out.push(`(${x.toFixed(2)}, ${y.toFixed(2)}): ${hit.object.name} at Z ${hit.point.z.toFixed(2)}`);
    }
  }
  return out;
}

/** An instance's box at its current matrix. */
function instanceBox(mesh: InstancedMesh, slot: number): Box3 {
  if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
  return new Box3().copy(mesh.geometry.boundingBox ?? new Box3()).applyMatrix4(matrixAt(mesh, slot));
}

interface Placed {
  readonly mesh: InstancedMesh;
  readonly slot: number;
  readonly rest: Box3;
}
const drawnAt = (p: Placed): boolean => p.mesh.visible && p.slot < p.mesh.count;
const yOffset = (p: Placed): number => instanceBox(p.mesh, p.slot).min.y - p.rest.min.y;
const materialOf = (mesh: InstancedMesh): string => (mesh.material as Material).name;

describe('the openings the owner chose on 2026-11-04', () => {
  it('stand clear through the wall, each its pinned width and height: the west doorways beside the entrance and the east corridors', () => {
    for (const [k, [a, b]] of MAP_EAST_DOORS.entries()) {
      const [c, d] = EAST_CORRIDORS[k] ?? [0, 0];
      expect(Math.max(Math.abs(a - c), Math.abs(b - d)), `corridor ${String(k)} against the map's door`).toBeLessThanOrEqual(0.06 + 1e-9);
    }
    const boxes = [
      ...WEST_DOORWAYS.map(([x0, x1]) => ({ name: `west doorway X ${String(x0)}..${String(x1)}`, x0, x1, y1: WEST_DOORWAY_HEAD, z0: WEST_Z - 0.3, z1: INNER_WEST_Z + 0.3 })),
      ...EAST_CORRIDORS.map(([x0, x1]) => ({ name: `east corridor X ${String(x0)}..${String(x1)}`, x0, x1, y1: EAST_CORRIDOR_HEAD, z0: INNER_EAST_Z - 0.3, z1: EAST_Z + 0.3 })),
    ];
    const steps = [...vauxSteps, ...medievalHallSteps, ...huntSteps, ...lehmanStructureSteps, ...lehmanGlassSteps];
    const scene = steps
      .flatMap((step) => collectStep(step).pieces.map((p) => meshOf(step, p)))
      .filter((mesh) => {
        const box = new Box3().setFromObject(mesh);
        return boxes.some((b) => box.max.x > b.x0 && box.min.x < b.x1 && box.max.y > MAIN_FLOOR && box.min.y < b.y1 && box.max.z > b.z0 && box.min.z < b.z1);
      });
    const blocked = boxes.flatMap((b) => blockers(scene, b.x0, b.x1, MAIN_FLOOR, b.y1, b.z0, b.z1).map((s) => `${b.name} ${s}`));
    expect(blocked.slice(0, 12), `${String(blocked.length)} rays blocked`).toEqual([]);
  });

  it('set the east front’s brick round its corridors with the band and apron in front of it: at five moments of its step, at one offset and drawn alike', () => {
    const timeline = new Timeline(vauxSteps);
    const problems: string[] = [];
    let bricks = 0;
    timeline.steps.forEach((step, i) => {
      timeline.evaluate(i + 1);
      const instances: Placed[] = step.meshes.flatMap((mesh) => Array.from({ length: mesh.count }, (_, slot) => ({ mesh, slot, rest: instanceBox(mesh, slot) })));
      const side = (box: Box3): number => EAST_ARCH_OPENINGS.findIndex(([x0, x1]) => box.min.x >= x0 - 1e-3 && box.max.x <= x1 + 1e-3);
      const brick = instances.filter(
        (p) => materialOf(p.mesh) === 'core.vauxBrick' && side(p.rest) >= 0 && p.rest.min.y >= MAIN_FLOOR - 1e-3 && p.rest.min.z >= INNER_EAST_Z - 1e-3 && p.rest.max.z <= EAST_Z + 1e-3,
      );
      if (brick.length === 0) return;
      bricks += brick.length;
      // The granite in front of each arch's opening under its sill, on the east face: the floor band and the apron.
      const trim = instances.filter((p) => materialOf(p.mesh) === 'core.granite' && p.rest.min.z >= EAST_Z - 1e-3 && p.rest.max.z <= EAST_Z + 0.1 && p.rest.max.y <= EAST_SILL + 1e-3);
      for (const b of brick) {
        const [x0, x1] = EAST_ARCH_OPENINGS[side(b.rest)] ?? [0, 0];
        const front = trim.filter((t) => t.rest.max.x > x0 && t.rest.min.x < x1);
        if (front.length === 0) problems.push(`${step.def.id}: brick at X ${b.rest.min.x.toFixed(2)}..${b.rest.max.x.toFixed(2)}, Y ${b.rest.min.y.toFixed(2)} arrives with no band or apron in front of it`);
        for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          timeline.evaluate(i + f);
          for (const t of front) {
            const gap = Math.abs(yOffset(b) - yOffset(t));
            if (gap > 1e-6 || drawnAt(b) !== drawnAt(t)) {
              problems.push(`${step.def.id} at f ${String(f)}: brick at X ${b.rest.min.x.toFixed(2)}, Y ${b.rest.min.y.toFixed(2)} and granite at X ${t.rest.min.x.toFixed(2)}, Y ${t.rest.min.y.toFixed(2)}: offsets ${gap.toFixed(3)} apart, drawn ${String(drawnAt(b))} and ${String(drawnAt(t))}`);
            }
          }
        }
        timeline.evaluate(i + 1);
      }
    });
    expect(problems.slice(0, 12), `${String(problems.length)} problems`).toEqual([]);
    // Three pieces round each of the two corridors.
    expect(bricks).toBe(6);
  });

  it('keep each ground window under a west doorway beneath the main floor while the openings step drops it, so none shows in the doorway over it', () => {
    const timeline = new Timeline(vauxSteps);
    const i = timeline.steps.findIndex((s) => s.def.id === 'vaux-openings');
    const step = timeline.steps[i];
    if (step === undefined) throw new Error('no vaux-openings step');
    timeline.evaluate(i + 1);
    const under: Placed[] = step.meshes.flatMap((mesh) =>
      Array.from({ length: mesh.count }, (_, slot) => ({ mesh, slot, rest: instanceBox(mesh, slot) })).filter(
        (p) => p.rest.max.y < MAIN_FLOOR && p.rest.min.z >= WEST_Z - 0.1 && p.rest.max.z <= INNER_WEST_Z && WEST_DOORWAYS.some(([x0, x1]) => p.rest.max.x > x0 && p.rest.min.x < x1),
      ),
    );
    // Each ground window's frame and bars, and its glass, under the two doorways.
    expect(under.length).toBe(4);
    // Every 0.005 of the step: a dropping piece is highest where it starts, and the drop's last glimpse of a window over the floor, at 2.5 m, lasted 0.02.
    const over: string[] = [];
    for (let k = 0; k < 200; k++) {
      const f = (k + 0.5) / 200;
      timeline.evaluate(i + f);
      for (const p of under) {
        const top = instanceBox(p.mesh, p.slot).max.y;
        if (drawnAt(p) && top > MAIN_FLOOR + 1e-6) over.push(`f ${f.toFixed(4)}: ${materialOf(p.mesh)} at X ${p.rest.min.x.toFixed(2)}, its top at ${top.toFixed(3)}`);
      }
    }
    expect(over.slice(0, 8), `${String(over.length)} samples over the floor`).toEqual([]);
  });
});
