/**
 * Windows and doors that fill an opening (wall.ts): frame, sash bars and glass as separate roles, rectangular, round-arched or segmental.
 *
 * Units metres. Origin at the bottom centre of the opening, on the frame's front plane: the frame spans z from −depth to 0 and sits inside the opening outline
 * (pass the same width, height and shape as the wall opening, and place it at the reveal depth you want, e.g. z = −0.15).
 * Glass is one pane facing +Z in the middle of the frame depth; render it double-sided. Arched heads get a transom at the springing and radiating bars in the fanlight.
 * A door also returns each leaf apart, closed, in the same frame, with its hinge (a point and a unit axis) and its swing (which way, and how far), for a
 * door layer that turns the leaves (docs/design/spec.md, Doors; src/viewer/doors.ts); `doorLeavesOf` finds them from the closed leaves' geometry.
 */
import * as THREE from 'three';

import { MeshBuilder, type V2 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, integer, oneOf, positive, require, type Detail } from './params.js';
import type { Profile } from './profile.js';
import { sweepInto } from './sweep.js';
import { openingOutline, type OpeningShape } from './wall.js';

export interface WindowParams {
  width: number;
  /** Sill to crown, metres. */
  height: number;
  /** Default 'rect'. */
  shape?: OpeningShape;
  /** Segmental rise, metres. Default width / 6. */
  rise?: number;
  /** Frame face width, metres. Default 0.08. */
  frame?: number;
  /** Frame depth, metres. Default 0.12. */
  depth?: number;
  /** Lights across. Default 3. */
  cols?: number;
  /** Lights up (below the springing of an arched head). Default 4. */
  rows?: number;
  /** Sash bar face width, metres. Default 0.035. */
  bar?: number;
  detail?: Detail;
}

export interface WindowParts {
  readonly frame: THREE.BufferGeometry;
  readonly bars: THREE.BufferGeometry;
  readonly glass: THREE.BufferGeometry;
}

interface WindowSpec {
  width: number;
  height: number;
  shape: OpeningShape;
  rise: number;
  frame: number;
  depth: number;
  cols: number;
  rows: number;
  bar: number;
  detail: Detail;
}

function windowSpec(part: string, params: WindowParams, defaults: { cols: number; rows: number }): WindowSpec {
  const width = positive(part, 'width', params.width);
  const shape = oneOf(part, 'shape', params.shape ?? 'rect', ['rect', 'arch', 'segmental'] as const);
  const spec: WindowSpec = {
    width,
    height: positive(part, 'height', params.height),
    shape,
    rise: shape === 'arch' ? width / 2 : shape === 'segmental' ? positive(part, 'rise', params.rise ?? width / 6) : 0,
    frame: positive(part, 'frame', params.frame ?? 0.08),
    depth: positive(part, 'depth', params.depth ?? 0.12),
    cols: integer(part, 'cols', params.cols ?? defaults.cols, 1, 20),
    rows: integer(part, 'rows', params.rows ?? defaults.rows, 1, 30),
    bar: positive(part, 'bar', params.bar ?? 0.035),
    detail: checkDetail(part, params.detail ?? 'medium'),
  };
  require(part, spec.height > spec.rise + 2 * spec.frame, `height ${String(spec.height)} leaves no room below the head (rise ${String(spec.rise)}, frame ${String(spec.frame)}).`);
  require(part, spec.width > 4 * spec.frame, `width ${String(spec.width)} is too narrow for a ${String(spec.frame)} m frame.`);
  return spec;
}

/** Frame profile in (d inward from the opening edge… negative, y = z): a rectangle from z = −depth to 0. */
function frameProfile(face: number, depth: number): Profile {
  return {
    closed: true,
    points: [
      [-face, -depth],
      [0, -depth],
      [0, 0],
      [-face, 0],
    ],
  };
}

function outlineOf(spec: WindowSpec, segments: number): V2[] {
  return openingOutline({ shape: spec.shape, x: 0, y: 0, width: spec.width, height: spec.height, rise: spec.rise }, segments);
}

/** Inner outline: the opening shrunk by the frame width (exact for rectangles, concentric for arches). */
function innerOutline(spec: WindowSpec, segments: number): V2[] {
  const f = spec.frame;
  if (spec.shape === 'rect') return openingOutline({ shape: 'rect', x: 0, y: f, width: spec.width - 2 * f, height: spec.height - 2 * f }, segments);
  const w = spec.width / 2;
  const radius = (w * w + spec.rise * spec.rise) / (2 * spec.rise);
  const cy = spec.height - radius;
  const r = radius - f;
  const half = Math.asin(Math.min(1, (w - f) / r));
  const out: V2[] = [
    [-(w - f), f],
    [w - f, f],
    [w - f, Math.max(f, cy + r * Math.cos(half))],
  ];
  const count = Math.max(2, Math.round((segments * half * 2) / Math.PI));
  for (let k = 1; k < count; k++) {
    const a = Math.PI / 2 - half + (2 * half * k) / count;
    out.push([r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  out.push([-(w - f), Math.max(f, cy + r * Math.cos(half))]);
  return out;
}

/** A bar as a box between two points in the wall plane, `width` across and `depth` deep, centred on z = zc. */
function barInto(b: MeshBuilder, x0: number, y0: number, x1: number, y1: number, width: number, depth: number, zc: number): void {
  const length = Math.hypot(x1 - x0, y1 - y0);
  if (length < 1e-6) return;
  const mark = b.vertexCount;
  b.box([-width / 2, 0, -depth / 2], [width / 2, length, depth / 2]);
  const angle = Math.atan2(x1 - x0, y1 - y0);
  b.transform(mark, new THREE.Matrix4().makeTranslation(x0, y0, zc).multiply(new THREE.Matrix4().makeRotationZ(-angle)));
}

function glassInto(b: MeshBuilder, outline: readonly V2[], z: number): void {
  b.planar(outline, [], new THREE.Vector3(0, 0, z), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
}

function frameInto(b: MeshBuilder, spec: WindowSpec, segments: number): void {
  sweepInto(
    b,
    frameProfile(spec.frame, spec.depth),
    outlineOf(spec, segments).map(([x, y]) => [x, y, 0] as const),
    { closed: true, up: [0, 0, 1], pathCreaseDeg: 30 },
  );
}

/** Glazing bars: a grid in the rectangular part, a transom at the springing and spokes in an arched head. */
function barsInto(b: MeshBuilder, spec: WindowSpec, inner: readonly V2[]): void {
  const f = spec.frame;
  const w = spec.width / 2 - f;
  const zc = -spec.depth / 2;
  const depth = spec.depth * 0.6;
  const spring = spec.shape === 'rect' ? spec.height - f : spec.height - spec.rise;
  const top = (x: number): number => {
    // Height of the inner outline above x (the head), for bars that run up into an arch.
    let best = spring;
    for (let k = 0; k < inner.length; k++) {
      const a = inner[k];
      const c = inner[(k + 1) % inner.length];
      if (a === undefined || c === undefined || a[1] < spring - 1e-9 || c[1] < spring - 1e-9) continue;
      if ((a[0] - x) * (c[0] - x) <= 0 && Math.abs(c[0] - a[0]) > 1e-9) best = Math.max(best, a[1] + ((c[1] - a[1]) * (x - a[0])) / (c[0] - a[0]));
    }
    return best;
  };
  for (let i = 1; i < spec.cols; i++) {
    const x = -w + (2 * w * i) / spec.cols;
    barInto(b, x, f, x, spring, spec.bar, depth, zc);
  }
  for (let j = 1; j < spec.rows; j++) {
    const y = f + ((spring - f) * j) / spec.rows;
    barInto(b, -w, y, w, y, spec.bar, depth, zc);
  }
  if (spec.shape !== 'rect') {
    // Transom at the springing, then spokes from its middle to the head.
    barInto(b, -w, spring, w, spring, f, spec.depth * 0.9, zc);
    const spokes = Math.max(2, spec.cols);
    for (let k = 1; k < spokes; k++) {
      const a = Math.PI - (Math.PI * k) / spokes;
      const reach = w * 1.5;
      const x1 = Math.cos(a) * reach;
      const y1 = spring + Math.sin(a) * reach;
      // Clip the spoke at the head.
      let lo = 0;
      let hi = 1;
      for (let it = 0; it < 30; it++) {
        const mid = (lo + hi) / 2;
        const x = x1 * mid;
        const y = spring + (y1 - spring) * mid;
        if (y < top(x) && Math.abs(x) < w) lo = mid;
        else hi = mid;
      }
      barInto(b, 0, spring, x1 * lo, spring + (y1 - spring) * lo, spec.bar, depth, zc);
    }
  }
}

/** A window filling an opening: frame, sash bars and glass. */
export function windowUnit(params: WindowParams): WindowParts {
  const spec = windowSpec('windowUnit', params, { cols: 3, rows: 4 });
  return cached('windowUnit', spec, () => {
    const segments = byDetail(spec.detail, [8, 16, 28]);
    const frame = new MeshBuilder();
    frameInto(frame, spec, segments);
    const inner = innerOutline(spec, segments);
    const bars = new MeshBuilder();
    barsInto(bars, spec, inner);
    const glass = new MeshBuilder();
    glassInto(glass, inner, -spec.depth / 2);
    return Object.freeze({ frame: frame.build(), bars: bars.build(), glass: glass.build() });
  });
}

export interface DoorParams extends Omit<WindowParams, 'cols' | 'rows'> {
  /** One or two leaves. Default 2. */
  leaves?: number;
  /** Raised panels per leaf, stacked (panelled leaves). Default 3. */
  panels?: number;
  /** Leaf thickness, metres. Default 0.07. */
  thickness?: number;
  /** Glaze the head: the fanlight of an arched door, or a transom light `transom` tall over a rectangular one. Default true. */
  fanlight?: boolean;
  /** A rectangular door's transom light: its height from the transom bar to the frame's head, metres. Default width / 3. */
  transom?: number;
  /** Glazed leaves: each a metal frame of stiles and rails `bar` wide round `lights` panes stacked between bars, in place of raised panels. Default false. */
  glazed?: boolean;
  /** Panes up each glazed leaf. Default 3. */
  lights?: number;
  /** How far each leaf opens about its hinge, degrees. Default 90. */
  opens?: number;
  /** Which way the leaves open: either way (a double-acting door, opened away from whoever opens it), or only toward the back (−Z) or the front (+Z). Default 'either'. */
  swing?: DoorSwing['direction'];
}

/**
 * A leaf's hinge in the door unit's frame: the line it turns about when it opens toward the back (−Z) and when it opens toward the front (+Z), each through a
 * point on the leaf's hinge-side edge at the face it opens round, so that edge rolls away from the jamb rather than into it; and the unit axis, turned so that
 * a positive (right-handed) turn swings the leaf toward the back.
 */
export interface DoorHinge {
  readonly back: readonly [number, number, number];
  readonly front: readonly [number, number, number];
  readonly axis: readonly [number, number, number];
}

/** How a leaf opens: which way, and by how much at most, radians. */
export interface DoorSwing {
  readonly direction: 'either' | 'back' | 'front';
  readonly angle: number;
}

/** One leaf apart, closed, in the unit's frame: its panels or its glazing's metal, a glazed leaf's glass, its hinge and its swing. */
export interface DoorLeaf {
  readonly panel: THREE.BufferGeometry;
  readonly glass?: THREE.BufferGeometry;
  readonly hinge: DoorHinge;
  readonly swing: DoorSwing;
}

export interface DoorParts {
  readonly frame: THREE.BufferGeometry;
  /** Every leaf closed, as one geometry: the panels (wood or bronze), or a glazed door's metal. The piece a build places, and tags as the door (src/model/doors.ts). */
  readonly leaf: THREE.BufferGeometry;
  /** A glazed door's panes, every leaf closed, as one geometry; absent for panelled leaves. */
  readonly leafGlass?: THREE.BufferGeometry;
  /** Fanlight or transom-light glass (its transom bar is part of `frame`); absent when `fanlight` is false on a rectangular door. */
  readonly glass?: THREE.BufferGeometry;
  /** Each leaf apart, from −X: `leaf` and `leafGlass` are these leaves' panels and panes appended, so a leaf turned by 0 about its hinge is exactly its part of them. */
  readonly leaves: readonly DoorLeaf[];
}

/** One leaf's geometry and how it turns: a part of a door's `leaf` or `leafGlass` (`doorLeavesOf`). */
export interface SwingingPart {
  readonly geometry: THREE.BufferGeometry;
  readonly hinge: DoorHinge;
  readonly swing: DoorSwing;
}

/** Each door's `leaf` and `leafGlass` geometry, to its leaves' parts of it (`doorLeavesOf`). */
const leafParts = new WeakMap<THREE.BufferGeometry, readonly SwingingPart[]>();

/**
 * The leaves that make up `geometry` when it is a door's `leaf` or `leafGlass` (doorUnit), each with its own geometry, hinge and swing, from −X; undefined
 * for any other geometry. A door layer turns each about its hinge in place of the closed piece (src/viewer/doors.ts).
 */
export function doorLeavesOf(geometry: THREE.BufferGeometry): readonly SwingingPart[] | undefined {
  return leafParts.get(geometry);
}

/** The gap a leaf keeps from its frame, its transom bar and its sill, metres; the two leaves of a pair, each this far from the middle, meet twice it apart. */
const LEAF_GAP = 0.004;

/**
 * One raised-panel leaf over [x0, x1] × [y0, y1], `t` thick about z = zc, with `panels` raised panels on both faces, spaced over a bay `bay` wide and
 * `rise` tall from `base` (the leaf's share of the opening, gaps included).
 */
function panelledLeafInto(b: MeshBuilder, x0: number, x1: number, y0: number, y1: number, zc: number, t: number, panels: number, base: number, bay: number, rise: number): void {
  b.box([x0, y0, zc - t / 2], [x1, y1, zc + t / 2]);
  const margin = Math.min(bay, rise) * 0.12;
  const ph = (rise - margin * (panels + 1)) / panels;
  for (let p = 0; p < panels && ph > 0; p++) {
    const py = base + margin + p * (ph + margin);
    for (const side of [1, -1]) {
      const z0 = zc + (side * t) / 2;
      const z1 = z0 + side * 0.018;
      b.box([x0 + margin, py, Math.min(z0, z1)], [x1 - margin, py + ph, Math.max(z0, z1)], [side > 0 ? '-z' : '+z']);
    }
  }
}

/** One glazed leaf over [x0, x1] × [y0, y1]: stiles and rails `s` wide and `t` thick about z = zc, `lights − 1` bars between the panes, and its glass. */
function glazedLeafInto(metal: MeshBuilder, glass: MeshBuilder, x0: number, x1: number, y0: number, y1: number, zc: number, t: number, s: number, lights: number): void {
  metal.box([x0, y0, zc - t / 2], [x0 + s, y1, zc + t / 2]);
  metal.box([x1 - s, y0, zc - t / 2], [x1, y1, zc + t / 2]);
  metal.box([x0 + s, y0, zc - t / 2], [x1 - s, y0 + s, zc + t / 2]);
  metal.box([x0 + s, y1 - s, zc - t / 2], [x1 - s, y1, zc + t / 2]);
  for (let j = 1; j < lights; j++) {
    const y = y0 + s + ((y1 - y0 - 2 * s) * j) / lights;
    metal.box([x0 + s, y - s / 2, zc - t * 0.4], [x1 - s, y + s / 2, zc + t * 0.4]);
  }
  glassInto(glass, [[x0 + s, y0 + s], [x1 - s, y0 + s], [x1 - s, y1 - s], [x0 + s, y1 - s]], zc);
}

/**
 * A door filling an opening: frame (with fanlight bars), leaves (raised panels, or glazed: metal and glass) and fanlight glass, and each leaf apart with its
 * hinge. Leaves hang from the jambs (two from both, one from the −X jamb), 4 mm clear of the frame, the sill and the transom bar's underside; a pair's leaves meet 8 mm apart.
 * Each turns about its hinge-side edge at the face it opens round, so swung either way it meets no fixed part of the unit, and a quarter turn open it
 * stands 4 mm off its jamb.
 */
export function doorUnit(params: DoorParams): DoorParts {
  const spec = windowSpec('doorUnit', { ...params, cols: 1, rows: 1 }, { cols: 1, rows: 1 });
  const full = {
    ...spec,
    leaves: integer('doorUnit', 'leaves', params.leaves ?? 2, 1, 2),
    panels: integer('doorUnit', 'panels', params.panels ?? 3, 1, 8),
    thickness: positive('doorUnit', 'thickness', params.thickness ?? 0.07),
    fanlight: params.fanlight ?? true,
    glazed: params.glazed ?? false,
    lights: integer('doorUnit', 'lights', params.lights ?? 3, 1, 12),
    opens: positive('doorUnit', 'opens', params.opens ?? 90),
    swing: oneOf('doorUnit', 'swing', params.swing ?? 'either', ['either', 'back', 'front'] as const),
    transom: positive('doorUnit', 'transom', params.transom ?? spec.width / 3),
  };
  require('doorUnit', full.opens <= 180, `opens ${String(full.opens)} turns a leaf past its wall; give at most 180 degrees.`);
  const head = full.shape === 'rect' ? (full.fanlight ? full.height - full.frame - full.transom : full.height - full.frame) : full.height - full.rise;
  require('doorUnit', head > 3 * full.frame, `transom ${full.transom.toFixed(3)} leaves the leaves ${(head - full.frame).toFixed(3)} m of a ${String(full.height)} m door; give a lower transom.`);
  return cached('doorUnit', full, () => {
    const segments = byDetail(full.detail, [8, 16, 28]);
    const frame = new MeshBuilder();
    frameInto(frame, full, segments);
    const f = full.frame;
    const w = full.width / 2 - f;
    const headBottom = head;
    const zc = -full.depth / 2;
    const t = full.thickness;
    const leafWidth = (2 * w) / full.leaves;
    require('doorUnit', leafWidth > 2 * t, `each leaf is ${leafWidth.toFixed(3)} m wide, too narrow to hang on a ${String(t)} m pivot; widen the door or use one leaf.`);
    const swing: DoorSwing = Object.freeze({ direction: full.swing, angle: (full.opens * Math.PI) / 180 });
    const leaves: DoorLeaf[] = [];
    const all = new MeshBuilder();
    const allGlass = new MeshBuilder();
    // Under a head with a transom bar (a fanlight's, or an arch's at its springing) the leaves stop under the bar's underside, half the frame's face below its line.
    const top = headBottom - (full.fanlight || full.shape !== 'rect' ? f / 2 : 0) - LEAF_GAP;
    for (let k = 0; k < full.leaves; k++) {
      const x0 = -w + k * leafWidth + LEAF_GAP;
      const x1 = x0 + leafWidth - 2 * LEAF_GAP;
      const panel = new MeshBuilder();
      const pane = new MeshBuilder();
      if (full.glazed) glazedLeafInto(panel, pane, x0, x1, f + LEAF_GAP, top, zc, t, full.bar, full.lights);
      else panelledLeafInto(panel, x0, x1, f + LEAF_GAP, top, zc, t, full.panels, f, leafWidth, headBottom - f);
      // The −X leaf turns about +Y and the +X leaf about −Y, so a positive turn swings either toward the unit's back; each about its hinge-side edge.
      const left = k === 0;
      const edge = left ? x0 : x1;
      const hinge: DoorHinge = Object.freeze({
        back: Object.freeze([edge, 0, zc - t / 2] as const),
        front: Object.freeze([edge, 0, zc + t / 2] as const),
        axis: Object.freeze([0, left ? 1 : -1, 0] as const),
      });
      const leaf: { panel: THREE.BufferGeometry; glass?: THREE.BufferGeometry; hinge: DoorHinge; swing: DoorSwing } = { panel: panel.build(), hinge, swing };
      all.append(leaf.panel);
      if (full.glazed) {
        leaf.glass = pane.build();
        allGlass.append(leaf.glass);
      }
      leaves.push(Object.freeze(leaf));
    }
    let glass: THREE.BufferGeometry | undefined;
    if (full.fanlight || full.shape !== 'rect') {
      barInto(frame, -w, headBottom, w, headBottom, f, full.depth * 0.9, zc);
      const inner = innerOutline(full, segments).filter(([, y]) => y >= headBottom - 1e-9);
      const pane: V2[] = full.shape === 'rect' ? [[-w, headBottom + f / 2], [w, headBottom + f / 2], [w, full.height - f], [-w, full.height - f]] : [[w, headBottom + f / 2], ...inner.filter(([, y]) => y > headBottom + f / 2), [-w, headBottom + f / 2]];
      const g = new MeshBuilder();
      glassInto(g, pane, zc);
      glass = g.build();
    }
    const parts: { frame: THREE.BufferGeometry; leaf: THREE.BufferGeometry; leafGlass?: THREE.BufferGeometry; glass?: THREE.BufferGeometry; leaves: readonly DoorLeaf[] } = {
      frame: frame.build(),
      leaf: all.build(),
      leaves: Object.freeze(leaves),
    };
    leafParts.set(parts.leaf, Object.freeze(leaves.map((l) => Object.freeze({ geometry: l.panel, hinge: l.hinge, swing: l.swing }))));
    if (full.glazed) {
      parts.leafGlass = allGlass.build();
      leafParts.set(parts.leafGlass, Object.freeze(leaves.flatMap((l) => (l.glass === undefined ? [] : [Object.freeze({ geometry: l.glass, hinge: l.hinge, swing: l.swing })]))));
    }
    if (glass !== undefined) parts.glass = glass;
    return Object.freeze(parts);
  });
}
