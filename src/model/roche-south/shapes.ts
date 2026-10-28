/**
 * Shapes the Roche south builders place: a unit box and a unit triangle that every wall, slab, bar and pane instance scales into place,
 * and closed prisms for the few plan shapes that are one of a kind (slabs with voids, sloped-top walls).
 *
 * The unit box spans x and z in [−0.5, 0.5] and y in [0, 1]; a matrix of rotation times positive scale (no shear) places it, and three.js
 * corrects instanced normals for that scale. The unit triangle (0,0,0)-(1,0,0)-(0,1,0) faces +Z; a matrix whose third column is the pane's unit
 * normal maps it onto any flat triangle with its normal intact, so all panes of a glass roof share one geometry and one instanced mesh.
 * World frame: metres, +X north, +Y up, +Z east (docs/design/spec.md, World frame).
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder, sheet, type V2 } from '../lib/index.js';
import { ccw, contains, inwardNormal, signedArea2, simpleLoops, type P2 } from './poly.js';

export type V3 = readonly [number, number, number];

function unitBox(): BufferGeometry {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.5]);
  return b.build();
}

function unitTriangle(): BufferGeometry {
  const b = new MeshBuilder();
  b.polygon([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0)]);
  return sheet(b.build());
}

/** Shared by every box-like piece of the area (walls, slabs, piers, bars, steps of a stair landing). */
export const UNIT_BOX = unitBox();
/** Shared by every glass pane of the area, a sheet (../lib/sheet.ts). */
export const UNIT_TRIANGLE = unitTriangle();

const UP = new Vector3(0, 1, 0);

/** An axis-aligned box from `min` to `max`. */
export function boxAt(min: V3, max: V3): Matrix4 {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  return new Matrix4().makeScale(x1 - x0, y1 - y0, z1 - z0).setPosition((x0 + x1) / 2, y0, (z0 + z1) / 2);
}

/** A box whose bottom centre is at `at`, its local x along the plan direction `dir`, sized `sx` × `sy` × `sz` (z across `dir`). */
export function orientedBox(at: V3, dir: P2, sx: number, sy: number, sz: number): Matrix4 {
  const length = Math.hypot(dir[0], dir[1]);
  const x = new Vector3(dir[0] / length, 0, dir[1] / length);
  const z = new Vector3().crossVectors(x, UP);
  return new Matrix4().makeBasis(x.multiplyScalar(sx), UP.clone().multiplyScalar(sy), z.multiplyScalar(sz)).setPosition(at[0], at[1], at[2]);
}

/**
 * A wall on plan segment a→b from y0 to y1: its outer face on the segment, its body `thickness` to the left of a→b (inside a counter-clockwise
 * outline), lengthened by `extendStart` before a and `extendEnd` past b (to close reflex corners).
 */
export function wallAlong(a: P2, b: P2, y0: number, y1: number, thickness: number, extendStart = 0, extendEnd = 0): Matrix4 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  const [nx, nz] = inwardNormal(a, b);
  const mid = (extendEnd - extendStart) / 2;
  const cx = (a[0] + b[0]) / 2 + ux * mid + (nx * thickness) / 2;
  const cz = (a[1] + b[1]) / 2 + uz * mid + (nz * thickness) / 2;
  return orientedBox([cx, y0, cz], [dx, dz], length + extendStart + extendEnd, y1 - y0, thickness);
}

/** A wall centred on plan segment a→b (half its thickness each side). */
export function wallCentred(a: P2, b: P2, y0: number, y1: number, thickness: number, extend = 0): Matrix4 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return orientedBox([(a[0] + b[0]) / 2, y0, (a[1] + b[1]) / 2], [dx, dz], Math.hypot(dx, dz) + 2 * extend, y1 - y0, thickness);
}

/** A bar from a to b: `width` across, `depth` along the projection of `normal` perpendicular to the bar. */
export function bar(a: V3, b: V3, width: number, depth: number, normal: V3 = [0, 1, 0]): Matrix4 {
  const start = new Vector3(...a);
  const axis = new Vector3(...b).sub(start);
  const length = axis.length();
  axis.divideScalar(length);
  const n = new Vector3(...normal);
  n.addScaledVector(axis, -n.dot(axis));
  if (n.lengthSq() < 1e-12) {
    // The hint runs along the bar: use the up axis, or north for an upright bar.
    if (Math.abs(axis.y) < 0.9) n.set(0, 1, 0);
    else n.set(1, 0, 0);
    n.addScaledVector(axis, -n.dot(axis));
  }
  n.normalize();
  const side = new Vector3().crossVectors(axis, n).normalize();
  return new Matrix4().makeBasis(side.multiplyScalar(width), axis.multiplyScalar(length), n.multiplyScalar(depth)).setPosition(start);
}

/** Maps the unit triangle onto triangle a, b, c; the pane faces (b − a) × (c − a). */
export function paneMatrix(a: V3, b: V3, c: V3): Matrix4 {
  const o = new Vector3(...a);
  const e1 = new Vector3(...b).sub(o);
  const e2 = new Vector3(...c).sub(o);
  const n = new Vector3().crossVectors(e1, e2).normalize();
  return new Matrix4().makeBasis(e1, e2, n).setPosition(o);
}

/** The two pane matrices of a flat quad a, b, c, d (in order round its edge). */
export function quadPanes(a: V3, b: V3, c: V3, d: V3): Matrix4[] {
  return [paneMatrix(a, b, c), paneMatrix(a, c, d)];
}

function sideQuads(b: MeshBuilder, loop: readonly P2[], y0: number, y1: number): void {
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i] ?? [0, 0];
    const q = loop[(i + 1) % loop.length] ?? [0, 0];
    b.polygon([new Vector3(q[0], y0, q[1]), new Vector3(p[0], y0, p[1]), new Vector3(p[0], y1, p[1]), new Vector3(q[0], y1, q[1])]);
  }
}

/**
 * A closed vertical prism over a plan outline with optional holes, from y0 to y1 (a floor slab with its voids, a roof, a court paving). An outline that
 * touches itself is split there into simple loops (./poly.ts `simpleLoops`): each it bounds is covered with the holes inside it, a notch it pinches off
 * among them, so earcut covers its top and bottom whole.
 */
export function prism(outline: readonly P2[], holes: readonly (readonly P2[])[], y0: number, y1: number): BufferGeometry {
  const b = new MeshBuilder();
  const loops = simpleLoops(ccw(outline));
  const notches = loops.filter((loop) => signedArea2(loop) < 0);
  // A hole is found by its first point; a notch, which touches the loop round it, by the mean of its points.
  const inner = [...holes.map((h) => ({ loop: ccw(h).reverse(), at: h[0] ?? [0, 0] })), ...notches.map((loop) => ({ loop, at: mean(loop) }))];
  const flip = (loop: readonly P2[]): V2[] => loop.map(([x, z]) => [x, -z] as const);
  for (const outer of loops.filter((loop) => signedArea2(loop) > 0)) {
    const within = inner.filter((h) => contains(outer, h.at)).map((h) => h.loop);
    b.planar(flip(outer), within.map(flip), new Vector3(0, y1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1));
    b.planar(outer, within, new Vector3(0, y0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1));
    sideQuads(b, outer, y0, y1);
  }
  for (const { loop } of inner) sideQuads(b, loop, y0, y1);
  return b.build();
}

/** The mean of a loop's points. */
function mean(loop: readonly P2[]): P2 {
  return [loop.reduce((sum, p) => sum + p[0], 0) / loop.length, loop.reduce((sum, p) => sum + p[1], 0) / loop.length];
}

/**
 * A closed wall on plan segment a→b whose top slopes from `topA` over a to `topB` over b, from `y0` up, `thickness` to the left of a→b:
 * the gable under the end of a sloping roof.
 */
export function wedgeWall(a: P2, b: P2, y0: number, topA: number, topB: number, thickness: number): BufferGeometry {
  const [nx, nz] = inwardNormal(a, b);
  const a2: P2 = [a[0] + nx * thickness, a[1] + nz * thickness];
  const b2: P2 = [b[0] + nx * thickness, b[1] + nz * thickness];
  const v = (p: P2, y: number): Vector3 => new Vector3(p[0], y, p[1]);
  const m = new MeshBuilder();
  // Outer face (right of a→b), inner face, ends, top and bottom.
  m.polygon([v(b, y0), v(a, y0), v(a, topA), v(b, topB)]);
  m.polygon([v(a2, y0), v(b2, y0), v(b2, topB), v(a2, topA)]);
  m.polygon([v(a, y0), v(a2, y0), v(a2, topA), v(a, topA)]);
  m.polygon([v(b2, y0), v(b, y0), v(b, topB), v(b2, topB)]);
  m.polygon([v(a, topA), v(a2, topA), v(b2, topB), v(b, topB)]);
  m.polygon([v(a, y0), v(b, y0), v(b2, y0), v(a2, y0)]);
  return m.build();
}

/** A closed upright cylinder of `radius` from y0 to y1 with `segments` sides, centred on the origin in plan. */
export function cylinder(radius: number, y0: number, y1: number, segments: number): BufferGeometry {
  const loop: P2[] = [];
  for (let k = 0; k < segments; k++) {
    const angle = (2 * Math.PI * k) / segments;
    loop.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return prism(loop, [], y0, y1);
}

/** A closed ring (annulus) of `outer` and `inner` radii from y0 to y1, centred on the origin in plan: a round basin's wall. */
export function annulus(outer: number, inner: number, y0: number, y1: number, segments: number): BufferGeometry {
  const loop = (r: number): P2[] => Array.from({ length: segments }, (_, k) => [r * Math.cos((2 * Math.PI * k) / segments), r * Math.sin((2 * Math.PI * k) / segments)] as const);
  return prism(loop(outer), [loop(inner)], y0, y1);
}

/**
 * Places a parts-library wall (src/model/lib/wall.ts: origin at the bottom centre of its front face, front toward +Z) centred on plan segment
 * a→b at height y0, its front toward the left of a→b, moved `forward` metres toward its front (half the thickness centres it on the line).
 */
export function libraryWallOn(a: P2, b: P2, y0: number, forward = 0): Matrix4 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const x = new Vector3(dx / length, 0, dz / length);
  const z = new Vector3().crossVectors(x, UP);
  const cx = (a[0] + b[0]) / 2 + z.x * forward;
  const cz = (a[1] + b[1]) / 2 + z.z * forward;
  return new Matrix4().makeBasis(x, UP.clone(), z).setPosition(cx, y0, cz);
}

/**
 * Unit-box matrices of a small closed room (a roof plant house, a stair house): four walls `wall` thick inside the plan rectangle and a roof slab,
 * so a section cut shows it hollow rather than as a solid block.
 */
export function hollowBoxes(min: V3, max: V3, wall: number, roof = 0.4): Matrix4[] {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  return [
    boxAt([x0, y0, z0], [x1, y1 - roof, z0 + wall]),
    boxAt([x0, y0, z1 - wall], [x1, y1 - roof, z1]),
    boxAt([x0, y0, z0 + wall], [x0 + wall, y1 - roof, z1 - wall]),
    boxAt([x1 - wall, y0, z0 + wall], [x1, y1 - roof, z1 - wall]),
    boxAt([x0, y1 - roof, z0], [x1, y1, z1]),
  ];
}

/** A translation matrix. */
export function at(x: number, y: number, z: number): Matrix4 {
  return new Matrix4().makeTranslation(x, y, z);
}
