/**
 * along(path, spacing, options): matrices that place a repeated piece (a modillion, a dentil, a baluster, a lamp) along a path.
 *
 * Each matrix maps the piece's local frame onto the path: local +X runs along the segment, +Y along `up` (default +Y), +Z to the right of travel (`t × up`), which is outward for a loop wound counter-clockwise seen from above and toward +Z for a path running +X.
 * So a piece modelled with its front facing +Z faces out of the building. The translation is the path point plus `outward` along +Z and `y` along up.
 * Items are spread evenly per segment between `margin` from each end, at most `spacing` apart. Equal calls return new arrays; matrices are cheap and the caller may keep or change them.
 */
import * as THREE from 'three';

import type { V3 } from './builder.js';
import { cleanPath } from './sweep.js';

export interface AlongOptions {
  /** The path is a loop. Default false. */
  closed?: boolean;
  /** Offset along the piece's +Z (outward), metres. Default 0. */
  outward?: number;
  /** Offset along up, metres. Default 0. */
  y?: number;
  /** Clear distance kept from each segment end to the nearest item centre, metres. Default spacing / 2. */
  margin?: number;
  /** Place one more item on each convex corner (one that turns away from the +Z side, like the outside corner of a building), turned to the corner's bisector (a corner modillion). Default false. */
  corners?: boolean;
  /** Keep exactly `spacing` from the first item instead of stretching it to fill the segment evenly. Default false. */
  exact?: boolean;
  /** The frame's up axis; the path must lie across it. Default +Y. */
  up?: V3;
}

function frame(origin: THREE.Vector3, tangent: THREE.Vector3, up: THREE.Vector3, outward: number, y: number): THREE.Matrix4 {
  const z = new THREE.Vector3().crossVectors(tangent, up).normalize();
  const x = tangent.clone().normalize();
  const p = origin.clone().addScaledVector(z, outward).addScaledVector(up, y);
  return new THREE.Matrix4().makeBasis(x, up.clone(), z).setPosition(p);
}

export function along(path: readonly V3[], spacing: number, options: AlongOptions = {}): THREE.Matrix4[] {
  if (!(Number.isFinite(spacing) && spacing > 0)) throw new Error(`along: spacing is ${String(spacing)}; it must be a finite distance above 0 metres.`);
  const closed = options.closed === true;
  const up = new THREE.Vector3(...(options.up ?? [0, 1, 0])).normalize();
  const outward = options.outward ?? 0;
  const y = options.y ?? 0;
  const margin = options.margin ?? spacing / 2;
  const points = cleanPath(path, closed);
  const segCount = closed ? points.length : points.length - 1;
  const out: THREE.Matrix4[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let k = 0; k < segCount; k++) {
    const a = points[k] ?? new THREE.Vector3();
    const b = points[(k + 1) % points.length] ?? new THREE.Vector3();
    const t = new THREE.Vector3().subVectors(b, a);
    t.addScaledVector(up, -t.dot(up));
    const length = a.distanceTo(b);
    tangents.push(t.clone().normalize());
    if (t.lengthSq() < 1e-18) continue;
    const usable = length - 2 * margin;
    if (usable < -1e-9) continue;
    const count = Math.floor(usable / spacing + 1e-9) + 1;
    const step = options.exact === true || count < 2 ? spacing : usable / (count - 1);
    const start = count < 2 && options.exact !== true ? length / 2 : margin;
    for (let i = 0; i < count; i++) {
      const s = start + i * step;
      out.push(frame(a.clone().lerp(b, s / length), t, up, outward, y));
    }
  }
  if (options.corners === true) {
    for (let i = 0; i < points.length; i++) {
      const kIn = i > 0 ? i - 1 : closed ? segCount - 1 : -1;
      const kOut = i < segCount ? i : -1;
      const tIn = tangents[kIn];
      const tOut = tangents[kOut];
      const p = points[i];
      if (tIn === undefined || tOut === undefined || p === undefined || kIn < 0 || kOut < 0) continue;
      const bisector = tIn.clone().add(tOut);
      if (bisector.lengthSq() < 1e-12) continue;
      // Convex for the +Z side means the path turns left seen from the up side.
      if (new THREE.Vector3().crossVectors(tIn, tOut).dot(up) <= 1e-9) continue;
      // The corner piece sits on the mitre, pushed out by the mitre stretch so it lines up with the run's outward offset.
      const nIn = new THREE.Vector3().crossVectors(tIn, up).normalize();
      const nOut = new THREE.Vector3().crossVectors(tOut, up).normalize();
      const m = nIn.clone().add(nOut).normalize();
      const stretch = 1 / Math.max(m.dot(nOut), 1e-3);
      const matrix = frame(p, bisector.normalize(), up, 0, y);
      matrix.setPosition(p.clone().addScaledVector(m, outward * stretch).addScaledVector(up, y));
      out.push(matrix);
    }
  }
  return out;
}
