/**
 * The Koch Plaza fountains (2014, Fluidity Design for OLIN; exterior.md [P6]): a square of dark granite flush with the paving, a round basin inside it
 * holding a thin sheet of water over a shallow stone dome, and 48 jets on the rim that arc inward (Hałun 2023; the 2018 orthophoto's ring of spray).
 * Built locally because the parts library's fountain is a raised rectangular basin with vertical jets. Origin at the square's centre, y = 0 at the
 * plaza paving; every geometry is built once and shared by both fountains.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { FOUNTAIN_JETS, FOUNTAIN_SIZE } from '../frame.js';
import { MeshBuilder } from '../lib/index.js';

/** The square's top stands this far above the paving round it (E: a 2 cm arris). */
export const FOUNTAIN_TOP = 0.02;
/** Basin radius: the orthophoto's ring of spray is about 11 m across inside the 13.8 m square (E). */
const BASIN_RADIUS = 6.0;
/** The water sheet lies this far below the square's top, over a floor 5 cm deeper. */
const WATER_DROP = 0.035;
const FLOOR_DROP = WATER_DROP + 0.05;
/** The shallow dome in the middle (E): its radius and rise above the water. */
const DOME_RADIUS = 2.6;
const DOME_RISE = 0.14;
/** Jets: from nozzles on the rim, peaking about 2.8 m up and landing about 2.2 m from the centre (Hałun 2023, E). */
const NOZZLE_RADIUS = 5.75;
const JET_PEAK = 2.8;
const JET_LANDING = 2.2;
const SEGMENTS = 64;

/** Points round a circle of `radius` at height y, counter-clockwise seen from above. */
function ring(radius: number, y: number, n = SEGMENTS): Vector3[] {
  return Array.from({ length: n }, (_, k) => new Vector3(radius * Math.cos((2 * Math.PI * k) / n), y, -radius * Math.sin((2 * Math.PI * k) / n)));
}

export interface FountainParts {
  /** The granite square with its round hole, its sides, and the basin's wall and floor (dark granite). */
  readonly stone: BufferGeometry;
  /** The 48 nozzle blocks on the rim (dark granite). */
  readonly nozzles: BufferGeometry;
  /** The water sheet and the water over the dome (water). */
  readonly water: BufferGeometry;
  /** The 48 jets in one geometry (jet). */
  readonly jets: BufferGeometry;
}

function buildStone(): BufferGeometry {
  const b = new MeshBuilder();
  const h = FOUNTAIN_SIZE / 2;
  const hole = Array.from({ length: SEGMENTS }, (_, k): readonly [number, number] => [BASIN_RADIUS * Math.cos((2 * Math.PI * k) / SEGMENTS), BASIN_RADIUS * Math.sin((2 * Math.PI * k) / SEGMENTS)]);
  // The top face in the plane y = FOUNTAIN_TOP; (u, v) map to (x, −z), so u × v = +Y and the face looks up.
  const outline: readonly (readonly [number, number])[] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  b.planar(outline, [hole], new Vector3(0, FOUNTAIN_TOP, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1));
  // Outer sides, down into the paving, and the underside there.
  b.box([-h, -0.3, -h], [h, FOUNTAIN_TOP, h], ['+y']);
  // The basin's wall from the rim down to the floor, facing the centre, and the floor.
  b.grid([ring(BASIN_RADIUS, FOUNTAIN_TOP - FLOOR_DROP), ring(BASIN_RADIUS, FOUNTAIN_TOP)], { wrapU: true, flip: true });
  b.polygon(ring(BASIN_RADIUS, FOUNTAIN_TOP - FLOOR_DROP));
  return b.build();
}

/** Local +Z along the radius (outward), local +X along the tangent, placed on the rim. */
function rimMatrix(angle: number, radius: number, y: number): Matrix4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Matrix4().makeBasis(new Vector3(-s, 0, -c), new Vector3(0, 1, 0), new Vector3(c, 0, -s)).setPosition(radius * c, y, -radius * s);
}

function buildNozzles(): BufferGeometry {
  const b = new MeshBuilder();
  for (let k = 0; k < FOUNTAIN_JETS; k += 1) {
    const from = b.vertexCount;
    b.box([-0.08, 0, -0.22], [0.08, 0.12, 0.22]);
    b.transform(from, rimMatrix((2 * Math.PI * (k + 0.5)) / FOUNTAIN_JETS, NOZZLE_RADIUS + 0.12, FOUNTAIN_TOP - WATER_DROP - 0.02));
  }
  return b.build();
}

function buildWater(): BufferGeometry {
  const b = new MeshBuilder();
  const y = FOUNTAIN_TOP - WATER_DROP;
  // The sheet from the basin's wall to the dome's foot, then the dome as rings of a shallow cap; both face up.
  b.grid([ring(BASIN_RADIUS, y), ring(DOME_RADIUS, y)], { wrapU: true });
  const rings = 6;
  const cap: Vector3[][] = [];
  for (let k = 0; k <= rings; k += 1) {
    const t = k / rings;
    cap.push(ring(Math.max(DOME_RADIUS * Math.cos((t * Math.PI) / 2), 1e-3), y + DOME_RISE * Math.sin((t * Math.PI) / 2)));
  }
  b.grid(cap, { wrapU: true });
  return b.build();
}

function buildJets(): BufferGeometry {
  const b = new MeshBuilder();
  const steps = 10;
  const sides = 4;
  const width = 0.07;
  for (let k = 0; k < FOUNTAIN_JETS; k += 1) {
    const a = (2 * Math.PI * (k + 0.5)) / FOUNTAIN_JETS;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // A parabola in the vertical plane through the centre, from the nozzle to the landing, peaking at JET_PEAK.
    const path: Vector3[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const r = NOZZLE_RADIUS + (JET_LANDING - NOZZLE_RADIUS) * t;
      const y = FOUNTAIN_TOP + 0.08 + 4 * (JET_PEAK - 0.08) * t * (1 - t) * (1 - 0.15 * t);
      path.push(new Vector3(r * c, y, -r * s));
    }
    const side = new Vector3(-s, 0, -c);
    const rings: Vector3[][] = path.map((p, i) => {
      const next = path[Math.min(path.length - 1, i + 1)] ?? p;
      const prev = path[Math.max(0, i - 1)] ?? p;
      const tangent = next.clone().sub(prev).normalize();
      const up = new Vector3().crossVectors(side, tangent).normalize();
      // The stream thins as it falls.
      const w = width * (1 - 0.5 * (i / steps));
      return Array.from({ length: sides }, (_, j) => {
        const q = (2 * Math.PI * j) / sides;
        return p.clone().addScaledVector(side, w * Math.cos(q)).addScaledVector(up, w * Math.sin(q));
      });
    });
    // Rings run round from `side` toward `up`, so the grid's natural front is inward; flip it to face out.
    b.grid(rings, { wrapU: true, flip: true });
  }
  return b.build();
}

let parts: FountainParts | null = null;

/** The fountain's geometries, built on first use. */
export function fountainParts(): FountainParts {
  parts ??= { stone: buildStone(), nozzles: buildNozzles(), water: buildWater(), jets: buildJets() };
  return parts;
}
