/**
 * The building footprint: the 15 block polygons of docs/research/exterior.md section 2, which tile the OSM outline exactly (46,470 m²).
 * The spec makes these lines the walls' outer faces (docs/design/spec.md, World frame), so the site's ground stops exactly on them.
 * Polygons are counter-clockwise lists of (X, Z) in world metres, copied from the block table; the ids are the table's.
 */

export type Point = readonly [number, number];

export interface Block {
  readonly id: string;
  readonly polygon: readonly Point[];
}

const rect = (x0: number, x1: number, z0: number, z1: number): readonly Point[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

/** exterior.md section 2, the block table. */
export const BLOCKS: readonly Block[] = [
  { id: 'hunt-d', polygon: [[-49.7, -69.0], [49.4, -69.0], [49.4, -2.0], [30.4, -2.0], [30.4, 1.2], [-30.4, 1.2], [-30.4, -1.9], [-49.7, -1.9]] },
  { id: 'mmw-north-e', polygon: rect(49.4, 88.6, -38.5, -2.0) },
  { id: 'mmw-north-h', polygon: rect(88.6, 153.1, -41.3, 9.8) },
  { id: 'mmw-north-f', polygon: [[49.4, -38.5], [88.6, -38.5], [88.6, -41.3], [118.0, -41.3], [118.0, -96.0], [49.4, -96.0]] },
  { id: 'mmw-south-j', polygon: rect(-88.1, -49.7, -69.0, -1.9) },
  { id: 'mmw-south-k', polygon: rect(-151.5, -88.1, -38.5, 9.9) },
  { id: 'core-1880-a', polygon: rect(-14.5, 14.5, -138.3, -69.0) },
  { id: 'core-1888-b', polygon: rect(-49.7, -14.5, -138.3, -69.0) },
  { id: 'core-1894-c', polygon: rect(14.5, 49.4, -138.3, -69.0) },
  {
    id: 'lehman',
    polygon: [[-17.5, -138.3], [-16.3, -139.4], [-16.3, -143.1], [-19.1, -146.0], [-29.1, -145.9], [-29.1, -156.4], [-5.6, -179.8], [5.5, -179.8], [29.0, -156.3], [29.0, -145.9], [19.0, -145.9], [16.2, -143.1], [16.2, -139.4], [17.5, -138.3]],
  },
  { id: 'sackler', polygon: rect(118.0, 153.1, -103.0, -41.3) },
  { id: 'american-wing', polygon: [[49.4, -96.0], [118.0, -96.0], [118.0, -103.0], [140.6, -103.0], [140.5, -161.0], [87.6, -161.0], [87.6, -138.3], [49.4, -138.3]] },
  { id: 'rockefeller', polygon: rect(-151.6, -88.1, -97.2, -38.5) },
  { id: 'wallace', polygon: [[-88.1, -97.2], [-151.6, -97.2], [-151.6, -104.7], [-141.2, -104.7], [-141.2, -160.1], [-88.2, -160.1]] },
  { id: 'kravis-petrie', polygon: rect(-88.1, -49.7, -138.2, -69.0) },
];

interface Prepared {
  readonly polygon: readonly Point[];
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

const PREPARED: readonly Prepared[] = BLOCKS.map((b) => ({
  polygon: b.polygon,
  minX: Math.min(...b.polygon.map((p) => p[0])),
  maxX: Math.max(...b.polygon.map((p) => p[0])),
  minZ: Math.min(...b.polygon.map((p) => p[1])),
  maxZ: Math.max(...b.polygon.map((p) => p[1])),
}));

function insidePolygon(polygon: readonly Point[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, zi] = polygon[i] ?? [0, 0];
    const [xj, zj] = polygon[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether (x, z) lies inside any block (points exactly on a line count as whichever side the ray test gives; callers test cell centres). */
export function insideFootprint(x: number, z: number): boolean {
  for (const b of PREPARED) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (insidePolygon(b.polygon, x, z)) return true;
  }
  return false;
}

/**
 * Whether (x, z) lies inside the outline the blocks tile: inside a block, or in a gap between two blocks narrower than 16 cm (the table's 0.1 m
 * rounding leaves a sliver up to 6.5 cm wide between the Wallace and Kravis wings, which belongs to the building, not the park).
 */
export function insideOutline(x: number, z: number): boolean {
  if (insideFootprint(x, z)) return true;
  const g = 0.08;
  return (insideFootprint(x - g, z) && insideFootprint(x + g, z)) || (insideFootprint(x, z - g) && insideFootprint(x, z + g));
}

/** Every X and every Z that a block vertex uses: the terrain grid puts a line on each, so axis-aligned walls fall on cell edges. */
export const FOOTPRINT_XS: readonly number[] = [...new Set(BLOCKS.flatMap((b) => b.polygon.map((p) => p[0])))].sort((a, b) => a - b);
export const FOOTPRINT_ZS: readonly number[] = [...new Set(BLOCKS.flatMap((b) => b.polygon.map((p) => p[1])))].sort((a, b) => a - b);

/**
 * A block edge that is not parallel to an axis (the Lehman Wing's chamfers, two near-vertical edges); the terrain clips cells against these.
 * `outside` is the sign of cross(b − a, p − a) for a point p outside the footprint (the table's polygons do not all wind the same way).
 */
export interface SlantedEdge {
  readonly a: Point;
  readonly b: Point;
  readonly outside: 1 | -1;
}

/** Signed side of p against the line a → b: cross(b − a, p − a). */
export function side(a: Point, b: Point, x: number, z: number): number {
  return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
}

/**
 * Slanted edges with the outside on one side somewhere along them (sampled at 2 cm off the line at 9 points); an edge two blocks share all along cuts no ground.
 * The terrain clips the cells such an edge crosses and still drops any clipped part whose centre lies inside the footprint.
 */
export const SLANTED_EDGES: readonly SlantedEdge[] = BLOCKS.flatMap((block) =>
  block.polygon.flatMap((a, i): SlantedEdge[] => {
    const b = block.polygon[(i + 1) % block.polygon.length] ?? a;
    if (Math.abs(a[0] - b[0]) < 1e-9 || Math.abs(a[1] - b[1]) < 1e-9) return [];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = ((b[1] - a[1]) / len) * 0.02;
    const nz = (-(b[0] - a[0]) / len) * 0.02;
    for (let k = 1; k < 10; k += 1) {
      const mx = a[0] + ((b[0] - a[0]) * k) / 10;
      const mz = a[1] + ((b[1] - a[1]) * k) / 10;
      const plus = insideFootprint(mx + nx, mz + nz);
      if (plus === insideFootprint(mx - nx, mz - nz)) continue;
      const outsidePoint: Point = plus ? [mx - nx, mz - nz] : [mx + nx, mz + nz];
      return [{ a, b, outside: side(a, b, outsidePoint[0], outsidePoint[1]) > 0 ? 1 : -1 }];
    }
    return [];
  }),
);

/** The footprint's extent. */
export const FOOTPRINT_BOUNDS = {
  minX: Math.min(...PREPARED.map((b) => b.minX)),
  maxX: Math.max(...PREPARED.map((b) => b.maxX)),
  minZ: Math.min(...PREPARED.map((b) => b.minZ)),
  maxZ: Math.max(...PREPARED.map((b) => b.maxZ)),
} as const;

/**
 * Distance from (x, z) to the nearest block, 0 inside: the clearance test for trees and rocks.
 * Bound: outside a block's box it uses the distance to the box, exact for the rectangular blocks and an underestimate (so a safe clearance) for the others.
 */
export function footprintClearance(x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const b of PREPARED) {
    const dx = Math.max(b.minX - x, 0, x - b.maxX);
    const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
    if (dx > 0 || dz > 0) {
      best = Math.min(best, Math.hypot(dx, dz));
      continue;
    }
    if (insidePolygon(b.polygon, x, z)) return 0;
    best = Math.min(best, polygonDistance(b.polygon, x, z));
  }
  return best;
}

function polygonDistance(polygon: readonly Point[], x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i += 1) {
    const [ax, az] = polygon[i] ?? [0, 0];
    const [bx, bz] = polygon[(i + 1) % polygon.length] ?? [0, 0];
    const ex = bx - ax;
    const ez = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
    best = Math.min(best, Math.hypot(x - (ax + t * ex), z - (az + t * ez)));
  }
  return best;
}
