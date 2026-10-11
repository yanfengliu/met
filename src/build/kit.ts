/**
 * The kit a step's `build` receives: it records pieces and lights and rejects malformed input with a message naming the step, the piece and the fix.
 * Bound: it checks each piece's own inputs (geometry with positions, a single material, a finite affine matrix, a finite order) and each light's type and shadow flag;
 * whole-sequence rules (the light cap, site bounds, budgets) are checked by the timeline and the sequence tests.
 */
import { BufferGeometry, Material, Matrix4, PointLight, SpotLight } from 'three';

import type { Kit, StepDef } from './types.js';

export interface CollectedPiece {
  readonly geometry: BufferGeometry;
  readonly material: Material;
  /** A copy of the final world matrix, so later changes by the builder do not move the piece. */
  readonly matrix: Matrix4;
  readonly order: number;
}

export interface CollectedStep {
  readonly pieces: readonly CollectedPiece[];
  readonly lights: readonly (PointLight | SpotLight)[];
}

const AFFINE_ROW_TOLERANCE = 1e-9;

function fail(step: StepDef, what: string): never {
  throw new Error(`Step "${step.id}": ${what}`);
}

function checkMatrix(step: StepDef, index: number, matrix: unknown): Matrix4 {
  if (!(matrix instanceof Matrix4)) fail(step, `piece ${String(index)} has no Matrix4 as its matrix; pass the piece's final world matrix as a THREE.Matrix4.`);
  const e = matrix.elements;
  const bad = e.findIndex((value) => !Number.isFinite(value));
  if (bad !== -1) {
    fail(step, `piece ${String(index)} has a non-finite matrix element (${String(e[bad])} at index ${String(bad)}); every element must be a finite number.`);
  }
  if (Math.abs(e[3]) > AFFINE_ROW_TOLERANCE || Math.abs(e[7]) > AFFINE_ROW_TOLERANCE || Math.abs(e[11]) > AFFINE_ROW_TOLERANCE || Math.abs(e[15] - 1) > AFFINE_ROW_TOLERANCE) {
    fail(step, `piece ${String(index)} has a projective matrix (bottom row ${[e[3], e[7], e[11], e[15]].map(String).join(', ')}); pass an affine matrix whose bottom row is 0, 0, 0, 1.`);
  }
  return matrix.clone();
}

/** Runs `step.build` against a recording kit and returns what it added. Throws if the step adds no piece. */
export function collectStep(step: StepDef): CollectedStep {
  const pieces: CollectedPiece[] = [];
  const lights: (PointLight | SpotLight)[] = [];
  const kit: Kit = {
    add(geometry: BufferGeometry, material: Material, matrix: Matrix4, order?: number): void {
      const index = pieces.length;
      if (!(geometry instanceof BufferGeometry) || !geometry.hasAttribute('position')) {
        fail(step, `piece ${String(index)} has no BufferGeometry with a position attribute; pass a geometry from src/model/lib/ or THREE.`);
      }
      if (!(material instanceof Material)) {
        fail(step, `piece ${String(index)} has no single THREE.Material; a piece of several materials is several add calls with the same order.`);
      }
      if (order !== undefined && !Number.isFinite(order)) {
        fail(step, `piece ${String(index)} has a non-finite order (${String(order)}); pass a finite number or leave it out.`);
      }
      pieces.push({ geometry, material, matrix: checkMatrix(step, index, matrix), order: order ?? index });
    },
    light(light: PointLight | SpotLight): void {
      if (!(light instanceof PointLight) && !(light instanceof SpotLight)) {
        fail(step, `light ${String(lights.length)} is neither a THREE.PointLight nor a THREE.SpotLight; only those two kinds switch on with a step.`);
      }
      if (light.castShadow) {
        fail(step, `light ${String(lights.length)} casts shadows; step lights never cast shadows (docs/design/spec.md, Kit), so set castShadow = false.`);
      }
      lights.push(light);
    },
  };
  try {
    step.build(kit);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`Step "${step.id}"`)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Step "${step.id}": build() threw: ${message}`, { cause: error });
  }
  if (pieces.length === 0) fail(step, 'build() added no piece; every step adds at least one piece through kit.add (docs/design/spec.md, Verification).');
  return { pieces, lights };
}
