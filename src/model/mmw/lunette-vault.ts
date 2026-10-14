/**
 * A barrel vault pierced by lunettes: the Arms and Armor Court's clerestory windows rise from its cornice into the vault (interior.md, P7), so the vault's intrados
 * is cut round each window's head and a small tunnel (jambs, sill and a round head) runs from the window in the side wall to the vault. The parts library's
 * barrel vault has no penetrations, so this one is built here.
 *
 * Local frame: the vault's axis runs along X, centred at the origin; it springs at y = 0 from z = ±span/2; its intrados is a half ellipse of half-width span/2 and
 * rise `rise` (a stilted vault when rise > span/2). Windows stand in the side walls (z = ±span/2) at `windows` x positions, each `width` wide, its sill `sill` above the
 * springing and its round head springing at `jamb`. Only the intrados and the tunnels are built (faces look into the room); the roof covers the back.
 * The vault's hole edges and the tunnels' heads share their sample points, so the groins close without cracks.
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder } from '../lib/index.js';

export interface LunetteVaultParams {
  readonly span: number;
  readonly rise: number;
  readonly length: number;
  readonly windows: readonly number[];
  readonly width: number;
  readonly sill: number;
  readonly jamb: number;
}

/** Segments over the vault's crown band; samples across each window's head (cosine-spaced, dense at the springings). */
const CROWN_STEPS = 40;
const HEAD_SAMPLES = 20;

export function lunetteVault(p: LunetteVaultParams): BufferGeometry {
  const a = p.span / 2;
  const r = p.width / 2;
  const L = p.length / 2;
  const at = (x: number, phi: number): Vector3 => new Vector3(x, p.rise * Math.sin(phi), a * Math.cos(phi));
  /** Angle on the +Z side where the intrados reaches height y. */
  const phiAt = (y: number): number => Math.asin(Math.min(1, Math.max(0, y / p.rise)));
  const headTop = (dx: number): number => p.jamb + Math.sqrt(Math.max(0, r * r - dx * dx));
  /** Sample x positions across a window centred at xc, from xc − r to xc + r. */
  const samples = (xc: number): number[] => Array.from({ length: HEAD_SAMPLES + 1 }, (_, k) => xc - r * Math.cos((Math.PI * k) / HEAD_SAMPLES));
  const b = new MeshBuilder();

  const edges = new Set<number>([-L, L]);
  for (const xc of p.windows) for (const x of samples(xc)) edges.add(x);
  for (let x = -L; x < L; x += 1.5) if (!p.windows.some((xc) => Math.abs(x - xc) < r)) edges.add(x);
  const xs = [...edges].filter((x) => x >= -L && x <= L).sort((u, v) => u - v);

  /**
   * The angular ranges of the intrados kept at x, each with its segment count. Every slice breaks at the same angles (the sill's and the jambs' heights), so
   * neighbouring slices share their edge vertices and no T-junction cracks open; across a window the jamb band is the hole and the crown band starts at the head.
   */
  const lo = phiAt(p.sill);
  const jamb = phiAt(p.jamb);
  const kept = (x: number, xc: number | undefined): [number, number, number][] => {
    if (xc === undefined) {
      return [
        [0, lo, 1],
        [lo, jamb, 1],
        [jamb, Math.PI - jamb, CROWN_STEPS],
        [Math.PI - jamb, Math.PI - lo, 1],
        [Math.PI - lo, Math.PI, 1],
      ];
    }
    const hi = phiAt(headTop(x - xc));
    return [
      [0, lo, 1],
      [hi, Math.PI - hi, CROWN_STEPS],
      [Math.PI - lo, Math.PI, 1],
    ];
  };

  for (let i = 0; i + 1 < xs.length; i += 1) {
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    if (x1 - x0 < 1e-6) continue;
    const mid = (x0 + x1) / 2;
    const xc = p.windows.find((c) => Math.abs(mid - c) < r);
    const r0 = kept(x0, xc);
    const r1 = kept(x1, xc);
    r0.forEach((range, k) => {
      const [s0, e0, steps] = range;
      const [s1, e1] = r1[k] ?? range;
      const rows: Vector3[][] = [];
      for (let j = 0; j <= steps; j += 1) {
        const t = j / steps;
        rows.push([at(x0, s0 + (e0 - s0) * t), at(x1, s1 + (e1 - s1) * t)]);
      }
      // u along X, v round the arc from +Z over the top: their cross product points away from the axis, so flip to face the room.
      b.grid(rows, { flip: true });
    });
  }

  // The tunnels: each window's outline (up the +x jamb, over the head, down the −x jamb, along the sill) swept from the wall plane to the intrados.
  for (const xc of p.windows) {
    const head = samples(xc).reverse().map((x): [number, number] => [x, headTop(x - xc)]);
    const outline: [number, number][] = [[xc + r, p.sill], ...head, [xc - r, p.sill]];
    for (const side of [1, -1]) {
      for (let k = 0; k < outline.length; k += 1) {
        const pa = outline[k];
        const pb = outline[(k + 1) % outline.length];
        if (pa === undefined || pb === undefined) continue;
        const za = side * a * Math.cos(phiAt(pa[1]));
        const zb = side * a * Math.cos(phiAt(pb[1]));
        const quad = [new Vector3(pa[0], pa[1], side * a), new Vector3(pb[0], pb[1], side * a), new Vector3(pb[0], pb[1], zb), new Vector3(pa[0], pa[1], za)];
        // Counter-clockwise seen from +Z, so on the +Z side each quad faces into the tunnel; the −Z side mirrors it.
        b.polygon(side > 0 ? quad : quad.reverse());
      }
    }
  }
  return b.build();
}
