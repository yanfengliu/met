/**
 * The gallery's contract with each part family: a catalogue entry builds the pieces of one exhibit.
 * Each family file (`catalogue-<family>.ts`) exports an array of entries; `catalogue.ts` concatenates them in gallery order.
 */
import type * as THREE from 'three';

/** Material roles the gallery paints with (src/parts/materials.ts). Multi-material parts map their role keys onto these. */
export type Role =
  | 'stone'
  | 'stoneDark'
  | 'granite'
  | 'plaster'
  | 'glass'
  | 'frame'
  | 'metal'
  | 'bronze'
  | 'copper'
  | 'water'
  | 'jet'
  | 'foliage'
  | 'bark'
  | 'flowers'
  | 'wood'
  | 'lamp';

export interface Piece {
  readonly geometry: THREE.BufferGeometry;
  readonly role: Role;
  /** Placements in the exhibit's frame; one identity placement when absent. */
  readonly matrices?: readonly THREE.Matrix4[];
}

export interface PartEntry {
  /** Unique kebab-case id, used by `?part=<id>` and the capture file names. */
  readonly id: string;
  /** Shown under the exhibit. */
  readonly label: string;
  /** Gallery row, e.g. 'Orders', 'Mouldings', 'Walls'. */
  readonly group: string;
  readonly build: () => Piece[];
  /** Named close-up boxes in the exhibit's frame (metres), captured as extra views, e.g. a capital. */
  readonly closeups?: Readonly<Record<string, { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] }>>;
}
