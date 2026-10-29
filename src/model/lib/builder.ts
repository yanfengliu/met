/**
 * MeshBuilder: the one place parts turn points into triangles.
 *
 * Every part builds into a MeshBuilder and calls `build()`, which returns an indexed BufferGeometry with `position`, `normal` (unit length) and `uv` attributes and its bounds computed.
 * Winding is counter-clockwise seen from the front, as three.js expects. Normals are explicit per vertex: flat faces give their own normal, smooth patches average the faces around each vertex, so creases stay sharp where a part asks for them.
 */
import * as THREE from 'three';

export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];

const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchC = new THREE.Vector3();

/** Newell's normal of a polygon given counter-clockwise from its front; zero for a degenerate polygon. */
export function polygonNormal(points: readonly THREE.Vector3[], target = new THREE.Vector3()): THREE.Vector3 {
  target.set(0, 0, 0);
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a === undefined || b === undefined) continue;
    target.x += (a.y - b.y) * (a.z + b.z);
    target.y += (a.z - b.z) * (a.x + b.x);
    target.z += (a.x - b.x) * (a.y + b.y);
  }
  const length = target.length();
  return length > 1e-12 ? target.divideScalar(length) : target.set(0, 0, 0);
}

export interface GridOptions {
  /** The last column joins the first (a closed loop across u). */
  wrapU?: boolean;
  /** One normal per quad instead of smooth averaging. */
  flat?: boolean;
  /** Reverse the winding (the grid's front is the other side). */
  flip?: boolean;
  /** Split each quad along the diagonal that folds it least, not always along one: a strongly curved patch then folds no quad through itself. Flat grids too. */
  flattest?: boolean;
}

export class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  /** Vertices added so far; use it as a mark for `transform`. */
  get vertexCount(): number {
    return this.positions.length / 3;
  }

  get triangleCount(): number {
    return this.indices.length / 3;
  }

  /** Adds one vertex. The normal is normalised here; a zero normal falls back to +Y so no vertex ever carries NaN. */
  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u = 0, v = 0): number {
    const length = Math.hypot(nx, ny, nz);
    if (length > 1e-12) this.normals.push(nx / length, ny / length, nz / length);
    else this.normals.push(0, 1, 0);
    this.positions.push(x, y, z);
    this.uvs.push(u, v);
    return this.vertexCount - 1;
  }

  vertexAt(p: THREE.Vector3, n: THREE.Vector3, u = 0, v = 0): number {
    return this.vertex(p.x, p.y, p.z, n.x, n.y, n.z, u, v);
  }

  triangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  /** Quad a-b-c-d, counter-clockwise seen from the front. */
  quad(a: number, b: number, c: number, d: number): void {
    this.indices.push(a, b, c, a, c, d);
  }

  /** A flat convex polygon, counter-clockwise seen from the front, fan-triangulated with one shared normal. */
  polygon(points: readonly THREE.Vector3[], uvScale = 1): void {
    if (points.length < 3) return;
    const n = polygonNormal(points, scratchA.clone());
    if (n.lengthSq() === 0) return;
    const { u: axisU, v: axisV } = planeAxes(n);
    const ids = points.map((p) => this.vertex(p.x, p.y, p.z, n.x, n.y, n.z, p.dot(axisU) * uvScale, p.dot(axisV) * uvScale));
    const first = ids[0] ?? 0;
    for (let i = 1; i < ids.length - 1; i++) this.triangle(first, ids[i] ?? 0, ids[i + 1] ?? 0);
  }

  /**
   * A flat polygon with holes in a plane: 2D points (u, v) map to `origin + u·axisU + v·axisV`, and the front faces `axisU × axisV`.
   * Concave outlines are fine (earcut); holes must lie inside the outline.
   */
  planar(outline: readonly V2[], holes: readonly (readonly V2[])[], origin: THREE.Vector3, axisU: THREE.Vector3, axisV: THREE.Vector3): void {
    if (outline.length < 3) return;
    const contour = outline.map(([u, v]) => new THREE.Vector2(u, v));
    const holeLoops = holes.map((hole) => hole.map(([u, v]) => new THREE.Vector2(u, v)));
    const all = [...contour, ...holeLoops.flat()];
    const faces = THREE.ShapeUtils.triangulateShape(contour, holeLoops);
    const n = scratchA.crossVectors(axisU, axisV).normalize().clone();
    const base = this.vertexCount;
    for (const p of all) {
      const x = origin.x + p.x * axisU.x + p.y * axisV.x;
      const y = origin.y + p.x * axisU.y + p.y * axisV.y;
      const z = origin.z + p.x * axisU.z + p.y * axisV.z;
      this.vertex(x, y, z, n.x, n.y, n.z, p.x, p.y);
    }
    for (const face of faces) {
      const [a = 0, b = 0, c = 0] = face;
      const pa = all[a];
      const pb = all[b];
      const pc = all[c];
      if (pa === undefined || pb === undefined || pc === undefined) continue;
      const area = (pb.x - pa.x) * (pc.y - pa.y) - (pc.x - pa.x) * (pb.y - pa.y);
      if (Math.abs(area) < 1e-14) continue;
      if (area > 0) this.triangle(base + a, base + b, base + c);
      else this.triangle(base + a, base + c, base + b);
    }
  }

  /**
   * A grid patch from rows of points: `rows[j][i]`, with i across (u) and j along (v).
   * The front is the side `∂u × ∂v` points to (counter-clockwise when u runs right and v runs up), unless `flip`.
   * Smooth normals average the area-weighted faces around each vertex, across the seam too when `wrapU`.
   */
  grid(rows: readonly (readonly THREE.Vector3[])[], options: GridOptions = {}): void {
    const nv = rows.length;
    const nu = rows[0]?.length ?? 0;
    if (nv < 2 || nu < 2) return;
    const wrap = options.wrapU === true;
    const flip = options.flip === true;
    const cells = wrap ? nu : nu - 1;
    const at = (i: number, j: number): THREE.Vector3 => {
      const row = rows[j];
      const p = row?.[((i % nu) + nu) % nu];
      if (p === undefined) throw new Error(`MeshBuilder.grid: row ${String(j)} is shorter than row 0 (${String(nu)} points); every row needs the same count.`);
      return p;
    };
    // Each quad's diagonal: from its first corner to its third, or from its second to its fourth where `flattest` finds that folds it less.
    const across = (i: number, j: number): boolean => {
      if (options.flattest !== true) return false;
      const [a, b, c, d] = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      const bend = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3, s: THREE.Vector3, t: THREE.Vector3, u: THREE.Vector3): number => {
        const m = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(r, p));
        const n = new THREE.Vector3().subVectors(t, s).cross(new THREE.Vector3().subVectors(u, s));
        return m.dot(n) / Math.max(1e-30, m.length() * n.length());
      };
      return bend(b, c, d, b, d, a) > bend(a, b, c, a, c, d);
    };
    if (options.flat === true) {
      for (let j = 0; j < nv - 1; j++) {
        for (let i = 0; i < cells; i++) {
          const [a, b, c, d] = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
          // A polygon fans from its first corner, so it splits along the diagonal from there; flipped, a quad has always split from b to d.
          if (options.flattest !== true) this.polygon(flip ? [d, c, b, a] : [a, b, c, d]);
          else if (across(i, j)) this.polygon(flip ? [d, c, b, a] : [b, c, d, a]);
          else this.polygon(flip ? [c, b, a, d] : [a, b, c, d]);
        }
      }
      return;
    }
    const sums = new Float64Array(nu * nv * 3);
    const addFace = (ids: readonly (readonly [number, number])[]): void => {
      const [i0, j0] = ids[0] ?? [0, 0];
      const [i1, j1] = ids[1] ?? [0, 0];
      const [i2, j2] = ids[2] ?? [0, 0];
      scratchB.subVectors(at(i1, j1), at(i0, j0));
      scratchC.subVectors(at(i2, j2), at(i0, j0));
      scratchA.crossVectors(scratchB, scratchC);
      if (flip) scratchA.negate();
      for (const [i, j] of ids) {
        const k = (j * nu + (((i % nu) + nu) % nu)) * 3;
        sums[k] = (sums[k] ?? 0) + scratchA.x;
        sums[k + 1] = (sums[k + 1] ?? 0) + scratchA.y;
        sums[k + 2] = (sums[k + 2] ?? 0) + scratchA.z;
      }
    };
    const splits: boolean[] = [];
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < cells; i++) {
        const bd = across(i, j);
        splits.push(bd);
        const corners: [number, number][] = [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ];
        const [p, q, r, t] = corners as [[number, number], [number, number], [number, number], [number, number]];
        if (bd) {
          addFace([p, q, t]);
          addFace([q, r, t]);
        } else {
          addFace([p, q, r]);
          addFace([p, r, t]);
        }
      }
    }
    const base = this.vertexCount;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const p = at(i, j);
        const k = (j * nu + i) * 3;
        let nx = sums[k] ?? 0;
        let ny = sums[k + 1] ?? 0;
        let nz = sums[k + 2] ?? 0;
        if (Math.hypot(nx, ny, nz) < 1e-14) [nx, ny, nz] = this.fallbackNormal(rows, i, j, flip);
        this.vertex(p.x, p.y, p.z, nx, ny, nz, i / (nu - 1), j / (nv - 1));
      }
    }
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < cells; i++) {
        const i1 = (i + 1) % nu;
        const a = base + j * nu + i;
        const b = base + j * nu + i1;
        const c = base + (j + 1) * nu + i1;
        const d = base + (j + 1) * nu + i;
        // Split from b to d: (a, b, d) and (b, c, d), wound the other way when flipped.
        if (splits[j * cells + i] === true) this.indices.push(...(flip ? [a, d, b, d, c, b] : [a, b, d, b, c, d]));
        else if (flip) this.quad(a, d, c, b);
        else this.quad(a, b, c, d);
      }
    }
  }

  /** The normal of the nearest non-degenerate quad, for vertices whose own faces have no area (a pole, a pinched edge). */
  private fallbackNormal(rows: readonly (readonly THREE.Vector3[])[], i: number, j: number, flip: boolean): [number, number, number] {
    for (let radius = 1; radius < rows.length + 4; radius++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const r0 = rows[j + dj];
        const r1 = rows[j + dj + 1];
        if (r0 === undefined || r1 === undefined) continue;
        for (let di = -radius; di <= radius; di++) {
          const p0 = r0[i + di];
          const p1 = r0[i + di + 1];
          const p3 = r1[i + di];
          if (p0 === undefined || p1 === undefined || p3 === undefined) continue;
          scratchB.subVectors(p1, p0);
          scratchC.subVectors(p3, p0);
          scratchA.crossVectors(scratchB, scratchC);
          if (scratchA.lengthSq() > 1e-20) return flip ? [-scratchA.x, -scratchA.y, -scratchA.z] : [scratchA.x, scratchA.y, scratchA.z];
        }
      }
    }
    return [0, 1, 0];
  }

  /** An axis-aligned box with flat faces; `skip` leaves out hidden faces by their outward axis ('+x', '-y', ...). */
  box(min: V3, max: V3, skip: readonly string[] = []): void {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    if (!(x1 > x0 && y1 > y0 && z1 > z0)) return;
    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    const faces: [string, THREE.Vector3[]][] = [
      ['+x', [v(x1, y0, z1), v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1)]],
      ['-x', [v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)]],
      ['+y', [v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), v(x0, y1, z0)]],
      ['-y', [v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)]],
      ['+z', [v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)]],
      ['-z', [v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0)]],
    ];
    for (const [axis, quad] of faces) if (!skip.includes(axis)) this.polygon(quad);
  }

  /** Transforms the vertices added since `fromVertex` (a `vertexCount` mark). A mirroring matrix flips their triangles so fronts stay in front. */
  transform(fromVertex: number, matrix: THREE.Matrix4, fromIndex?: number): void {
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let k = fromVertex; k < this.vertexCount; k++) {
      scratchA.fromArray(this.positions, k * 3).applyMatrix4(matrix).toArray(this.positions, k * 3);
      scratchA.fromArray(this.normals, k * 3).applyMatrix3(normalMatrix).normalize().toArray(this.normals, k * 3);
    }
    if (matrix.determinant() < 0) {
      const start = fromIndex ?? this.indices.findIndex((index) => index >= fromVertex);
      if (start < 0) return;
      for (let t = start; t + 2 < this.indices.length; t += 3) {
        const b = this.indices[t + 1] ?? 0;
        this.indices[t + 1] = this.indices[t + 2] ?? 0;
        this.indices[t + 2] = b;
      }
    }
  }

  /** Appends another builder's or geometry's triangles, optionally transformed. */
  append(source: MeshBuilder | THREE.BufferGeometry, matrix?: THREE.Matrix4): void {
    const geometry = source instanceof MeshBuilder ? source.build() : source;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
    const fromVertex = this.vertexCount;
    const fromIndex = this.indices.length;
    for (let k = 0; k < position.count; k++) {
      this.vertex(position.getX(k), position.getY(k), position.getZ(k), normal.getX(k), normal.getY(k), normal.getZ(k), uv?.getX(k) ?? 0, uv?.getY(k) ?? 0);
    }
    const index = geometry.getIndex();
    if (index !== null) for (let k = 0; k < index.count; k++) this.indices.push(fromVertex + index.getX(k));
    else for (let k = 0; k < position.count; k++) this.indices.push(fromVertex + k);
    if (matrix !== undefined) this.transform(fromVertex, matrix, fromIndex);
  }

  /** The finished geometry: indexed, with position, unit normal and uv attributes and bounds computed. */
  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.vertexCount > 65535 ? new THREE.Uint32BufferAttribute(this.indices, 1) : new THREE.Uint16BufferAttribute(this.indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** Two unit axes spanning the plane with normal `n`, for uv coordinates in metres. */
export function planeAxes(n: THREE.Vector3): { u: THREE.Vector3; v: THREE.Vector3 } {
  const helper = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(helper, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v };
}

/** Shorthand for a Vector3. */
export function vec(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}
