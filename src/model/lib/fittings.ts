/**
 * Street and garden fittings for the plaza, the steps and the roof garden: a stone urn with flowers, a cast-iron lamp post and a park bench.
 * Metres, +Y up, front +Z, origin at the base centre (y = 0 at the bottom) unless a header says otherwise.
 * Equal parameters return the identical cached object (docs/design/spec.md, Parts library): never mutate, move or dispose it; place it through a matrix.
 */
import * as THREE from 'three';

import { MeshBuilder, polygonNormal, vec, type V2, type V3 } from './builder.js';
import { cached } from './cache.js';
import { addFlatFaces, boundsOf, fitBox, icosphere, lumpyPoints } from './organic.js';
import { byDetail, checkDetail, inRange, integer, positive, type Detail } from './params.js';
import { ProfilePen, scaleProfile, signedArea, type Profile } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

// ---------------------------------------------------------------- urn

/** Urn proportions as fractions of `height`: the plinth's side and height, the rim's radius, and the flower mass's radius and rise above the rim. */
export const URN = { plinthSide: 0.41, plinthHeight: 0.36, rimRadius: 0.25, flowerRadius: 0.24, flowerRise: 0.15 } as const;

export interface UrnParams {
  /** Height from the ground to the urn's rim, metres. Default 1.2. The flowers rise a further 0.15 × height. */
  readonly height?: number;
  /** Fill the mouth with a lumpy dome of flowers. Default true. */
  readonly flowers?: boolean;
  /** Facets round the lathe (12, 20 or 32) and in the flower dome (80, 320 or 1,280 triangles): 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

/** An urn's materials. */
export interface Urn {
  /** The square moulded plinth and the lathe urn with its hollow mouth, closed (stone). */
  readonly urn: THREE.BufferGeometry;
  /** The flower mass, a closed lumpy dome whose lower half hides inside the mouth (flowers). Absent when `flowers` is false. */
  readonly flowers?: THREE.BufferGeometry;
}

interface UrnFull {
  readonly height: number;
  readonly flowers: boolean;
  readonly detail: Detail;
}

/**
 * A stone garden urn (a campana shape: foot, stem, convex lower bowl, flaring upper body, everted rim) on a square moulded plinth.
 * Origin at the plinth's base centre. The stone's box is exactly x and z in ±0.25 × height (the rim) and y in [0, height]; the flowers span ±0.24 × height and reach 1.15 × height.
 */
export function urn(params: UrnParams = {}): Urn {
  const part = 'urn';
  const height = positive(part, 'height', params.height ?? 1.2);
  const flowers = params.flowers ?? true;
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: UrnFull = { height, flowers, detail };
  return cached(part, full, () => buildUrn(full));
}

/** The urn's lathe profile in units of its height: from the axis across the foot, outside from the foot up, over the rim, down the inside of the mouth to its floor. */
function urnProfile(segments: number): Profile {
  const pen = new ProfilePen(0, URN.plinthHeight)
    .to(0.15, URN.plinthHeight)
    .to(0.15, 0.385)
    .quarter(-0.015, 0.015, true, segments)
    .to(0.115, 0.4)
    .quarter(-0.04, 0.05, false, segments)
    .to(0.075, 0.48)
    .quarter(0.115, 0.12, true, 2 * segments)
    .to(0.2, 0.6)
    .to(0.2, 0.625)
    .to(0.185, 0.625);
  // The upper body flares as a parabola from radius 0.185 to 0.235.
  const flare = 2 * segments;
  for (let k = 1; k <= flare; k++) {
    const t = k / flare;
    pen.to(0.185 + 0.05 * t * t, 0.625 + 0.295 * t);
  }
  return pen
    .to(URN.rimRadius, 0.935)
    .to(URN.rimRadius, 0.985)
    .quarter(-0.015, 0.015, true, segments)
    .to(0.205, 1)
    .quarter(-0.01, -0.01, true, segments)
    .to(0.19, 0.86)
    .to(0, 0.86)
    .open();
}

/** The plinth's section in units of the urn height: d outward from the die face, y up; a base block, a cove, the die, a cove under the cap. */
function plinthProfile(segments: number): Profile {
  const m = URN.plinthSide / 2 - 0.18;
  return new ProfilePen(m, 0)
    .to(m, 0.05)
    .quarter(-m, 0.02, false, segments)
    .to(0, 0.29)
    .quarter(0.8 * m, 0.025, false, segments)
    .to(m, 0.315)
    .to(m, URN.plinthHeight)
    .to(0, URN.plinthHeight)
    .open();
}

function buildUrn(p: UrnFull): Urn {
  const h = p.height;
  const segments = byDetail(p.detail, [1, 2, 3]);
  const stone = new MeshBuilder();
  const a = 0.18 * h;
  const plinth = scaleProfile(plinthProfile(segments), h, h);
  sweepInto(
    stone,
    plinth,
    [
      [-a, 0, a],
      [a, 0, a],
      [a, 0, -a],
      [-a, 0, -a],
    ],
    { closed: true },
  );
  const top = URN.plinthHeight * h;
  stone.polygon([vec(-a, top, a), vec(a, top, a), vec(a, top, -a), vec(-a, top, -a)]);
  // The plinth's underside, out to its foot.
  const b = a + (plinth.points[0]?.[0] ?? 0);
  stone.polygon([vec(-b, 0, -b), vec(b, 0, -b), vec(b, 0, b), vec(-b, 0, b)]);
  latheInto(stone, scaleProfile(urnProfile(segments), h, h), { segments: byDetail(p.detail, [12, 20, 32]) });
  if (!p.flowers) return Object.freeze({ urn: stone.build() });

  const sphere = icosphere(byDetail(p.detail, [1, 2, 3]));
  const points = lumpyPoints(sphere, { centre: vec(0, h, 0), radii: vec(URN.flowerRadius * h, URN.flowerRise * h, URN.flowerRadius * h), roughness: 0.14, frequency: 2.6, seed: 7 });
  const fit = fitBox(boundsOf([points]), URN.flowerRadius * h, URN.flowerRadius * h, (1 + URN.flowerRise) * h);
  const flowers = new MeshBuilder();
  addFlatFaces(flowers, points.map(fit.map), sphere.faces);
  return Object.freeze({ urn: stone.build(), flowers: flowers.build() });
}

// ---------------------------------------------------------------- lamp post

/** Lamp post proportions as fractions of `height`: base radius, globe radius, arm reach (axis to lantern centre) and lantern height (socket, globe and cap). */
export const LAMP = { baseRadius: 0.07, globeRadius: 0.06, armReach: 0.22, lanternHeight: 0.2 } as const;

export interface LampPostParams {
  /** Height from the ground to the top of the lantern caps, metres. Default 4. */
  readonly height?: number;
  /** 0: one lantern on top of the shaft; 1: one arm reaching toward +Z; 2: two arms along ±X. Default 0. */
  readonly arms?: number;
  /** Facets round (8, 12 or 20) and rings up the globe: 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

/** A lamp post's materials. */
export interface LampPost {
  /** Base, tapered shaft, arms and braces, lantern sockets and caps, closed (cast iron). */
  readonly post: THREE.BufferGeometry;
  /** The glass globes, closed (lamp). */
  readonly lamp: THREE.BufferGeometry;
}

interface LampFull {
  readonly height: number;
  readonly arms: number;
  readonly detail: Detail;
}

/**
 * A cast-iron park lamp post: a round plinth and bell-shaped base, a collar, a tapered shaft and one acorn glass globe per lantern under a crowned cap with a finial.
 * Origin at the base centre. The box is y in [0, height]; with 0 arms x and z are ±0.07 × height (the base); with 2 arms x is ±0.28 × height (arm reach plus globe radius);
 * with 1 arm the box is not centred in z: z runs from −0.07 to +0.28 × height.
 */
export function lampPost(params: LampPostParams = {}): LampPost {
  const part = 'lampPost';
  const height = positive(part, 'height', params.height ?? 4);
  const arms = integer(part, 'arms', params.arms ?? 0, 0, 2);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: LampFull = { height, arms, detail };
  return cached(part, full, () => buildLampPost(full));
}

/** Base, collar, shaft and its top ring, in units of the height, up to `shaftTop`, closed at the axis at both ends. */
function postProfile(shaftTop: number, segments: number): Profile {
  return new ProfilePen(0, 0)
    .to(LAMP.baseRadius, 0)
    .to(LAMP.baseRadius, 0.02)
    .quarter(-0.008, 0.008, true, segments)
    .to(0.055, 0.03)
    .quarter(-0.027, 0.11, false, 2 * segments)
    .to(0.028, 0.15)
    .to(0.034, 0.155)
    .to(0.034, 0.175)
    .to(0.024, 0.18)
    .to(0.017, shaftTop - 0.03)
    .to(0.026, shaftTop - 0.02)
    .to(0.026, shaftTop)
    .to(0, shaftTop)
    .open();
}

/** One lantern's iron parts and glass in units of the height, standing on y = 0: a socket cup on a neck, the globe, a crowned cap with a finial. */
function lanternInto(post: MeshBuilder, lamp: MeshBuilder, segments: number, rings: number, around: number, matrix: THREE.Matrix4): void {
  const socket = new ProfilePen(0, -0.01).to(0.01, -0.01).to(0.01, 0.004).to(0.036, 0.008).to(0.036, 0.03).to(0, 0.03).open();
  // The globe: radius 0.03 + 0.03 sin(π s) with y following s^1.25, so the widest ring (s = ½) is sampled exactly.
  const globe = new ProfilePen(0, 0.02).to(0.03, 0.02);
  for (let k = 0; k <= rings; k++) {
    const s = k / rings;
    globe.to(0.03 + (LAMP.globeRadius - 0.03) * Math.sin(Math.PI * s), 0.03 + 0.14 * s ** 1.25);
  }
  globe.to(0, 0.17);
  const cap = new ProfilePen(0, 0.165).to(0.036, 0.165).to(0.046, 0.175).to(0.046, 0.18).to(0.015, 0.188).to(0.01, 0.19).quarter(-0.01, 0.01, true, segments).open();
  for (const [builder, profile] of [
    [post, socket],
    [lamp, globe.open()],
    [post, cap],
  ] as const) {
    const mark = builder.vertexCount;
    latheInto(builder, profile, { segments: around });
    builder.transform(mark, matrix);
  }
}

/** A straight bar of square section `size` from `a` to `b` (both inside whatever it joins). */
function barInto(builder: MeshBuilder, a: THREE.Vector3, b: THREE.Vector3, size: number): void {
  const along = b.clone().sub(a);
  const length = along.length();
  const x = along.normalize();
  const helper = Math.abs(x.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const z = new THREE.Vector3().crossVectors(x, helper).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const mark = builder.vertexCount;
  builder.box([0, -size / 2, -size / 2], [length, size / 2, size / 2]);
  builder.transform(mark, new THREE.Matrix4().makeBasis(x, y, z).setPosition(a));
}

function buildLampPost(p: LampFull): LampPost {
  const h = p.height;
  const segments = byDetail(p.detail, [1, 2, 3]);
  const around = byDetail(p.detail, [8, 12, 20]);
  const rings = byDetail(p.detail, [4, 6, 10]);
  const post = new MeshBuilder();
  const lamp = new MeshBuilder();
  const lanternBase = 1 - LAMP.lanternHeight;
  const scale = new THREE.Matrix4().makeScale(h, h, h);
  if (p.arms === 0) {
    latheInto(post, scaleProfile(postProfile(lanternBase, segments), h, h), { segments: around });
    lanternInto(post, lamp, segments, rings, around, new THREE.Matrix4().makeTranslation(0, lanternBase * h, 0).multiply(scale));
    return Object.freeze({ post: post.build(), lamp: lamp.build() });
  }
  // With arms the shaft rises past them to a ball finial; each arm carries a lantern standing on its end.
  const shaftTop = lanternBase + 0.06;
  latheInto(post, scaleProfile(postProfile(shaftTop, segments), h, h), { segments: around });
  const ball = new ProfilePen(0, shaftTop - 0.004).to(0.012, shaftTop - 0.004).quarter(0.01, 0.018, true, segments + 1).quarter(-0.022, 0.018, true, segments + 1).open();
  latheInto(post, scaleProfile(ball, h, h), { segments: around });
  const directions = p.arms === 1 ? [new THREE.Vector3(0, 0, 1)] : [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)];
  const armDepth = 0.03 * h;
  const armTop = lanternBase * h;
  for (const dir of directions) {
    const reach = LAMP.armReach * h;
    const end = dir.clone().multiplyScalar(reach + 0.015 * h);
    barInto(post, new THREE.Vector3(0, armTop - armDepth / 2, 0), new THREE.Vector3(end.x, armTop - armDepth / 2, end.z), armDepth);
    const braceFoot = new THREE.Vector3(0, armTop - 0.12 * h, 0);
    const braceHead = dir.clone().multiplyScalar(0.6 * reach).setY(armTop - 0.6 * armDepth);
    barInto(post, braceFoot, braceHead, 0.016 * h);
    const at = new THREE.Matrix4().makeTranslation(dir.x * reach, armTop, dir.z * reach).multiply(scale);
    lanternInto(post, lamp, segments, rings, around, at);
  }
  return Object.freeze({ post: post.build(), lamp: lamp.build() });
}

// ---------------------------------------------------------------- bench

/** Bench section in metres (real scale whatever the length): overall height and depth, and the seat height under the slats. */
export const BENCH = { height: 0.86, depth: 0.66, seatTop: 0.464 } as const;

export interface BenchParams {
  /** Length along x, metres, from 0.8 to 12; a frame stands at each end and at most every 1.8 m between. Default 2. */
  readonly length?: number;
  /** Slat edges: 'low' square, 'medium' (default) rounded in 2 steps, 'high' in 4. */
  readonly detail?: Detail;
}

/** A bench's materials. */
export interface Bench {
  /** Cast-iron end frames (and middle frames on long benches), closed slabs (metal). */
  readonly frame: THREE.BufferGeometry;
  /** Wooden seat and back slats, closed (wood). */
  readonly seat: THREE.BufferGeometry;
}

interface BenchFull {
  readonly length: number;
  readonly detail: Detail;
}

/**
 * A park bench: cast-iron side frames (front leg, rear leg rising into a raked back post, seat rail) carrying four seat slats and three back slats that run the full length.
 * Origin at the base centre, the sitter faces +Z. The box is exactly x in [−length/2, length/2], y in [0, 0.86] and z in [−0.33, 0.33].
 */
export function bench(params: BenchParams = {}): Bench {
  const part = 'bench';
  const length = inRange(part, 'length', params.length ?? 2, 0.8, 12);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: BenchFull = { length, detail };
  return cached(part, full, () => buildBench(full));
}

/** The side frame's outline in (z, y) before centring: z from −0.36 (back post top) to +0.27 (front leg), counter-clockwise. */
const FRAME_OUTLINE: readonly V2[] = [
  [-0.24, 0],
  [-0.18, 0],
  [-0.18, 0.38],
  [0.21, 0.38],
  [0.21, 0],
  [0.27, 0],
  [0.27, 0.43],
  [-0.18, 0.43],
  [-0.31, BENCH.height],
  [-0.36, BENCH.height],
  [-0.24, 0.43],
];
/** The seat slats run from the back post to 3 cm past the front leg; the whole section is shifted so the box is centred in z. */
const SEAT_FRONT = 0.3;
const SHIFT = -(SEAT_FRONT + -0.36) / 2;
const FRAME_THICKNESS = 0.04;

/** A rounded rectangle d in [d0, d1], y in [y0, y1] with corner radius `r` in `segments` steps (square when `segments` is 0). */
function slatProfile(d0: number, d1: number, y0: number, y1: number, r: number, segments: number): Profile {
  if (segments === 0) return new ProfilePen(d0, y0).to(d1, y0).to(d1, y1).to(d0, y1).close();
  return new ProfilePen(d0 + r, y0)
    .to(d1 - r, y0)
    .quarter(r, r, true, segments)
    .to(d1, y1 - r)
    .quarter(-r, r, true, segments)
    .to(d0 + r, y1)
    .quarter(-r, -r, true, segments)
    .to(d0, y0 + r)
    .quarter(r, -r, true, segments)
    .close();
}

/** A flat slab: an outline in (z, y) extruded along x from x0 to x1, with flat faces on both sides and a strip round its edge. */
function slabInto(builder: MeshBuilder, outline: readonly V2[], x0: number, x1: number): void {
  const pts = signedArea(outline) > 0 ? outline : [...outline].reverse();
  // planar() faces axisU × axisV: (y, z) on Y, Z faces +x; (z, y) on Z, Y faces −x.
  builder.planar(
    pts.map(([z, y]) => [y, z] as const),
    [],
    vec(x1, 0, 0),
    vec(0, 1, 0),
    vec(0, 0, 1),
  );
  builder.planar(pts, [], vec(x0, 0, 0), vec(0, 0, 1), vec(0, 1, 0));
  for (let i = 0; i < pts.length; i++) {
    const [za, ya] = pts[i] ?? [0, 0];
    const [zb, yb] = pts[(i + 1) % pts.length] ?? [0, 0];
    // Counter-clockwise in (z, y), so the outward normal is right of travel: (dy, −dz) in (z, y).
    const outward = vec(0, -(zb - za), yb - ya);
    const quad = [vec(x0, ya, za), vec(x0, yb, zb), vec(x1, yb, zb), vec(x1, ya, za)];
    builder.polygon(polygonNormal(quad).dot(outward) < 0 ? quad.reverse() : quad);
  }
}

function buildBench(p: BenchFull): Bench {
  const half = p.length / 2;
  const segments = byDetail(p.detail, [0, 2, 4]);
  const outline = FRAME_OUTLINE.map(([z, y]) => [z + SHIFT, y] as const);
  const frame = new MeshBuilder();
  const inset = 0.18;
  const count = Math.max(2, Math.ceil((p.length - 2 * inset) / 1.8) + 1);
  for (let k = 0; k < count; k++) {
    const x = -half + inset + ((p.length - 2 * inset) * k) / (count - 1);
    slabInto(frame, outline, x - FRAME_THICKNESS / 2, x + FRAME_THICKNESS / 2);
  }
  const seat = new MeshBuilder();
  const thick = 0.032;
  const slatWidth = 0.085;
  const seatBottom = BENCH.seatTop - thick;
  // Four seat slats from the back post to the front edge, 2 mm above the seat rail.
  for (let k = 0; k < 4; k++) {
    const front = SEAT_FRONT - k * ((SEAT_FRONT + 0.16 - slatWidth) / 3);
    const centre = front - slatWidth / 2 + SHIFT;
    const path: V3[] = [
      [-half, seatBottom, centre],
      [half, seatBottom, centre],
    ];
    sweepInto(seat, slatProfile(-slatWidth / 2, slatWidth / 2, 0, thick, 0.008, segments), path);
  }
  // Three back slats on the raked back post's front edge, which runs from (z −0.18, y 0.43) to (−0.31, 0.86).
  const lean = new THREE.Vector2(-0.13, BENCH.height - 0.43).normalize();
  const up: V3 = [0, lean.y, lean.x];
  const forward = new THREE.Vector3(0, -lean.x, lean.y);
  const foot = new THREE.Vector3(0, 0.43, -0.18 + SHIFT).addScaledVector(forward, 0.002);
  for (const s0 of [0.1, 0.21, 0.32]) {
    const path: V3[] = [
      [-half, foot.y, foot.z],
      [half, foot.y, foot.z],
    ];
    sweepInto(seat, slatProfile(0, thick, s0, s0 + slatWidth, 0.008, segments), path, { up });
  }
  return Object.freeze({ frame: frame.build(), seat: seat.build() });
}
