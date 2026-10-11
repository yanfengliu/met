/**
 * Window and door surrounds on a wall face: an architrave trim round the sides and head, a sill, and a head that is plain, a cornice, or a triangular or segmental pediment.
 *
 * Units metres. Origin at the bottom centre of the opening on the wall face (z = 0); the surround projects toward +Z. Pass the opening's width, height and shape.
 * Pediments are swept cornices: a horizontal cornice across the top of the trim with raking (or arched) cornices above it and a recessed tympanum.
 */
import * as THREE from 'three';

import { MeshBuilder, type V3 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, inRange, oneOf, positive, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { corniceProfile } from './profiles.js';
import { sweepInto } from './sweep.js';
import { openingOutline, type OpeningShape } from './wall.js';

export type HeadKind = 'none' | 'cornice' | 'triangular' | 'segmental';

export interface SurroundParams {
  width: number;
  /** Sill to crown of the opening, metres. */
  height: number;
  /** Default 'rect'. */
  shape?: OpeningShape;
  rise?: number;
  /** Architrave trim width, metres. Default width / 7. */
  trim?: number;
  /** Trim projection, metres. Default trim / 2.5. */
  projection?: number;
  /** A projecting sill. Default true. */
  sill?: boolean;
  /** Default 'cornice'. */
  head?: HeadKind;
  /** Pediment pitch, degrees (triangular). Default 22. */
  pitch?: number;
  detail?: Detail;
}

/** Architrave trim profile (d out from the opening edge, y = z out from the wall), counter-clockwise. */
function trimProfile(t: number, p: number, n: number): Profile {
  return new ProfilePen(0, 0)
    .to(t, 0)
    .to(t, 0.45 * p)
    .cyma(-0.2 * t, 0.55 * p, 'reversa', n)
    .to(0.25 * t, p)
    .to(0.22 * t, 0.8 * p)
    .to(0, 0.8 * p)
    .close();
}

/** A cornice profile (d out from the wall, y up) turned for a path in the wall plane swept with up = +Z: (d, y) → (−y, d) when the cornice's top faces the path's left. */
function turned(profile: Profile, topOutward: boolean): Profile {
  const points = profile.points.map(([d, y]) => (topOutward ? ([y, d] as const) : ([-y, d] as const)));
  return { closed: true, points: topOutward ? [...points].reverse() : points };
}

export function surround(params: SurroundParams): THREE.BufferGeometry {
  const width = positive('surround', 'width', params.width);
  const shape = oneOf('surround', 'shape', params.shape ?? 'rect', ['rect', 'arch', 'segmental'] as const);
  const trim = positive('surround', 'trim', params.trim ?? width / 7);
  const full = {
    width,
    height: positive('surround', 'height', params.height),
    shape,
    rise: shape === 'arch' ? width / 2 : shape === 'segmental' ? positive('surround', 'rise', params.rise ?? width / 6) : 0,
    trim,
    projection: positive('surround', 'projection', params.projection ?? trim / 2.5),
    sill: params.sill ?? true,
    head: oneOf('surround', 'head', params.head ?? 'cornice', ['none', 'cornice', 'triangular', 'segmental'] as const),
    pitch: inRange('surround', 'pitch', params.pitch ?? 22, 5, 45),
    detail: checkDetail('surround', params.detail ?? 'medium'),
  };
  return cached('surround', full, () => {
    const b = new MeshBuilder();
    const n = byDetail(full.detail, [2, 3, 5]);
    const segments = byDetail(full.detail, [8, 16, 28]);
    const w = full.width / 2;
    const t = full.trim;
    const p = full.projection;
    // Trim: up the right side, over the head, down the left (open at the sill).
    const loop = openingOutline({ shape: full.shape, x: 0, y: 0, width: full.width, height: full.height, rise: full.rise }, segments);
    const path: V3[] = [...loop.slice(1), loop[0] ?? [-w, 0]].map(([x, y]) => [x, y, 0] as const);
    sweepInto(b, trimProfile(t, p, n), path, { up: [0, 0, 1], pathCreaseDeg: 30 });
    if (full.sill) {
      const sh = t * 0.55;
      const over = t * 0.35;
      b.box([-w - t - over, -sh, 0], [w + t + over, 0, p * 1.6], ['-z']);
    }
    const top = full.height + t;
    if (full.head === 'none') return b.build();
    const ch = t * 1.1;
    const cornice = corniceProfile({ height: ch, projection: ch * 0.75, dentils: false, modillions: false, detail: full.detail });
    const span = w + t + ch * 0.4;
    // Horizontal cornice resting on the trim: its top faces up, i.e. left of a path running −X… run it +X with the cornice's height upward (n = −Y, so top faces left).
    sweepInto(b, turned(cornice, false), [
      [-span, top, 0],
      [span, top, 0],
    ], { up: [0, 0, 1] });
    if (full.head === 'cornice') return b.build();
    const base = top + ch;
    const rakePath: V3[] = [];
    if (full.head === 'triangular') {
      const apex = base + Math.tan((full.pitch * Math.PI) / 180) * span;
      rakePath.push([span, base, 0], [0, apex, 0], [-span, base, 0]);
      // Tympanum, set back from the cornice face.
      b.polygon([new THREE.Vector3(-span, base, p * 0.3), new THREE.Vector3(span, base, p * 0.3), new THREE.Vector3(0, apex, p * 0.3)]);
    } else {
      const rise = span * 0.32;
      const radius = (span * span + rise * rise) / (2 * rise);
      const cy = base + rise - radius;
      const half = Math.asin(span / radius);
      const steps = Math.max(4, Math.round(segments * 0.6));
      const tympanum: THREE.Vector3[] = [];
      for (let k = 0; k <= steps; k++) {
        const a = Math.PI / 2 - half + (2 * half * k) / steps;
        rakePath.push([radius * Math.cos(a), cy + radius * Math.sin(a), 0]);
        tympanum.push(new THREE.Vector3(radius * Math.cos(a), cy + radius * Math.sin(a), p * 0.3));
      }
      b.polygon(tympanum.reverse().concat([]).reverse());
    }
    // Raking cornice: running from the right eave over the top to the left, its top faces outward (right of travel).
    sweepInto(b, turned(cornice, true), rakePath, { up: [0, 0, 1], pathCreaseDeg: 10 });
    return b.build();
  });
}
