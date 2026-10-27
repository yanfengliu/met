/**
 * The collection's placeholders as pieces (docs/design/spec.md, Collection): an artwork's catalogue entry (catalogue.ts) and its placement in a space give
 * its pieces, all at the object's real size: the object in its form (kinds.ts), and its plinth, its vitrine (objects under 0.6 m) or its frame (paintings).
 * Every piece of one artwork is added together, with one `order`, so they arrive together, and tagged with its object ID (`artworkTag`), so the look
 * target and an orbit-view click find the artwork whichever of its pieces they meet, vitrine glass included (docs/design/spec.md, Collection: Labels).
 * One step per space (`collectionStep`) builds its artworks with one shared material (material.ts) and a stagger by order.
 * Derived, not measured (docs/research/collection.md, Display): plinth heights and margins, vitrine sizes, frame borders where the record gives no
 * framed size, the hanging height, and each object's roughness and metalness.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { CameraFocus, Kit, PieceTag, StepDef } from '../../build/types.js';
import type { ChapterId } from '../../build/chapters.js';
import { CATALOGUE } from './catalogue.js';
import { block, bust, canvas, dish, figureGroup, jar, recumbentFigure, slab, standingFigure, unitBox } from './kinds.js';
import { artMaterial, finishOf, giltMaterial, plinthMaterial, vitrineGlass } from './material.js';
import type { ArtSurface } from './material.js';
import type { CatalogueEntry } from './types.js';

/** Where one artwork stands or hangs. */
export interface Placement {
  readonly id: number;
  /**
   * Plan position, world metres: a standing artwork's footprint centre; a hung one's point on the wall face behind its centre.
   */
  readonly x: number;
  readonly z: number;
  /** The level of the floor it stands on, or of the floor under the wall it hangs on. */
  readonly floor: number;
  /** The way its front faces, as a turn about +Y from +Z (radians): 0 faces +Z, π/2 faces +X. */
  readonly facing: number;
  /** Hung artworks: the height of the centre over the floor; default 1.6 m, or higher so the bottom clears 0.5 m. */
  readonly centre?: number;
  /** Hung artworks: the highest the frame may reach (a ceiling), so a tall painting's centre and border give way to it. */
  readonly ceiling?: number;
  /** Standing artworks: the plinth's height, where the space sets it (a fountain figure on its block in a pool). */
  readonly plinth?: number;
}

/** One piece of an artwork: its geometry, its role (which material it takes) and its final world matrix. */
export interface ArtPiece {
  readonly geometry: BufferGeometry;
  readonly role: 'object' | 'plinth' | 'glass' | 'gilt';
  readonly matrix: Matrix4;
}

const UP = new Vector3(0, 1, 0);

/** A base-origin unit piece at (x, y, z), turned by `facing`, scaled to width, height and depth. */
function placed(x: number, y: number, z: number, facing: number, w: number, h: number, d: number): Matrix4 {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(UP, facing), new Vector3(w, h, d));
}

/** The form an entry takes: a recumbent figure when it is longer than it is high, a group when it is wide, a dish when it is low and wide. */
export function formOf(entry: CatalogueEntry): BufferGeometry {
  const { h, w, d } = entry.size;
  switch (entry.kind) {
    case 'figure':
      return Math.max(w, d) > 1.15 * h ? recumbentFigure() : w > 0.7 * h ? figureGroup() : standingFigure();
    case 'bust':
      return bust();
    case 'vessel':
      return h < 0.6 * Math.max(w, d) ? dish() : jar();
    case 'slab':
      return slab();
    case 'frame':
      return canvas();
    case 'plinth':
      return block();
  }
}

/** Plinth heights by form: a low one under a long or block-like object, else one that lifts a small object's middle toward eye height. */
export function plinthHeight(entry: CatalogueEntry): number {
  const { h, w, d } = entry.size;
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  if (entry.kind === 'plinth') return clamp(1.0 - h / 2, 0.2, 0.8);
  if (Math.max(w, d) > 1.15 * h) return clamp(0.9 - h / 2, 0.2, 0.6);
  return clamp(1.4 - h / 2, 0.25, 1.0);
}

/** A vitrine's base height, and its case's margin round the object and room above it (metres). */
export const VITRINE = { base: 0.9, margin: 0.15, headroom: 0.18, least: 0.4, leastGlass: 0.3 } as const;
/** How far a hung artwork stands off its wall, metres. */
export const WALL_GAP = 0.01;
/** A frame stands this far proud of its canvas, metres. */
const FRAME_PROUD = 0.03;

/** The frame's border width: the record's framed size where it gives one, else a border that grows with the painting (derived). */
export function frameBorder(entry: CatalogueEntry): number {
  if (entry.framed !== undefined) return Math.max(0.02, Math.min(entry.framed.w - entry.size.w, entry.framed.h - entry.size.h) / 2);
  return Math.min(0.16, Math.max(0.05, 0.04 + 0.05 * Math.min(entry.size.w, entry.size.h)));
}

/** Every piece of one artwork at its placement; the first is the object itself, whose translation the material keys its colour on. */
export function artworkPieces(entry: CatalogueEntry, at: Placement): ArtPiece[] {
  const { h, w, d } = entry.size;
  const form = formOf(entry);
  const box = unitBox();
  if (entry.display === 'wall') {
    const normal = new Vector3(Math.sin(at.facing), 0, Math.cos(at.facing));
    const side = new Vector3(Math.cos(at.facing), 0, -Math.sin(at.facing));
    let border = entry.kind === 'frame' ? frameBorder(entry) : 0;
    let centre = at.centre ?? Math.max(1.6, 0.5 + h / 2 + border);
    if (at.ceiling !== undefined) {
      const room = at.ceiling - at.floor;
      border = Math.max(0, Math.min(border, (room - h) / 2 - 0.005));
      centre = Math.min(centre, room - h / 2 - border - 0.005);
    }
    const bottom = at.floor + centre - h / 2;
    const out = (distance: number): Vector3 => new Vector3(at.x, 0, at.z).addScaledVector(normal, WALL_GAP + distance);
    const surface = out(d / 2);
    const pieces: ArtPiece[] = [{ geometry: form, role: 'object', matrix: placed(surface.x, bottom, surface.z, at.facing, w, h, d) }];
    if (border > 0) {
      const depth = d + FRAME_PROUD;
      const c = out(depth / 2);
      const bar = (along: number, y: number, bw: number, bh: number): ArtPiece => {
        const p = c.clone().addScaledVector(side, along);
        return { geometry: box, role: 'gilt', matrix: placed(p.x, y, p.z, at.facing, bw, bh, depth) };
      };
      pieces.push(bar(0, bottom + h, w + 2 * border, border), bar(0, bottom - border, w + 2 * border, border), bar(-(w + border) / 2, bottom, border, h), bar((w + border) / 2, bottom, border, h));
    }
    return pieces;
  }
  if (entry.display === 'vitrine') {
    const vw = Math.max(VITRINE.least, w + 2 * VITRINE.margin);
    const vd = Math.max(VITRINE.least, d + 2 * VITRINE.margin);
    const top = at.floor + VITRINE.base;
    return [
      { geometry: form, role: 'object', matrix: placed(at.x, top, at.z, at.facing, w, h, d) },
      { geometry: box, role: 'plinth', matrix: placed(at.x, at.floor, at.z, at.facing, vw, VITRINE.base, vd) },
      { geometry: box, role: 'glass', matrix: placed(at.x, top, at.z, at.facing, vw, Math.max(VITRINE.leastGlass, h + VITRINE.headroom), vd) },
    ];
  }
  if (entry.display === 'floor') return [{ geometry: form, role: 'object', matrix: placed(at.x, at.floor, at.z, at.facing, w, h, d) }];
  const pedestal = entry.pedestal;
  const ph = at.plinth ?? pedestal?.h ?? plinthHeight(entry);
  const pw = pedestal?.w ?? Math.max(0.45, w + 0.2);
  const pd = pedestal?.d ?? Math.max(0.45, d + 0.2);
  return [
    { geometry: form, role: 'object', matrix: placed(at.x, at.floor + ph, at.z, at.facing, w, h, d) },
    { geometry: box, role: 'plinth', matrix: placed(at.x, at.floor, at.z, at.facing, pw, ph, pd) },
  ];
}

/** The tag every piece of The Met's object `id` carries (src/build/types.ts `PieceTag`): kind artwork, its object ID as the id. */
export function artworkTag(id: number): PieceTag {
  return { kind: 'artwork', id: String(id) };
}

/** The catalogue entry of an object, or a throw naming it and the fix. */
export function entryOf(id: number): CatalogueEntry {
  const entry = CATALOGUE.find((e) => e.id === id);
  if (entry === undefined) throw new Error(`Object ${String(id)} is placed but not in src/model/collection/catalogue.ts; add it to picks.ts and regenerate (npm run met-catalogue).`);
  return entry;
}

/** A space's collection step: what the timeline shows of it, and where each of its artworks stands. */
export interface CollectionStepDef {
  readonly id: string;
  readonly chapter: ChapterId;
  readonly year: string;
  readonly title: string;
  readonly detail: string;
  readonly focus: CameraFocus;
  /** The space of picks.ts whose objects it places. */
  readonly space: string;
  readonly placements: readonly Placement[];
  /** The plinths' material where the space's photographs show it (default: plinthMaterial, a pale painted stone). */
  readonly plinth?: Material;
}

/** Every artwork of a step as pieces, with the surfaces its shared material draws (the same order). */
export function stepArtworks(def: CollectionStepDef): { readonly pieces: readonly ArtPiece[][]; readonly surfaces: readonly ArtSurface[] } {
  const pieces = def.placements.map((at) => {
    const entry = entryOf(at.id);
    if (entry.space !== def.space) throw new Error(`Step "${def.id}" places object ${String(at.id)}, which picks.ts puts in ${entry.space}, not ${def.space}.`);
    return artworkPieces(entry, at);
  });
  const surfaces = def.placements.map((at, i) => {
    const entry = entryOf(at.id);
    const origin = new Vector3().setFromMatrixPosition(pieces[i]?.[0]?.matrix ?? new Matrix4());
    return { x: origin.x, z: origin.z, colour: entry.colour, ...(entry.grid === undefined ? {} : { grid: entry.grid }), ...finishOf(entry.medium, entry.kind) };
  });
  return { pieces, surfaces };
}

/** The step that builds one space's artworks: each one's pieces together (one order per artwork), popping into place one artwork after another. */
export function collectionStep(def: CollectionStepDef): StepDef {
  return {
    id: def.id,
    chapter: def.chapter,
    year: def.year,
    title: def.title,
    detail: def.detail,
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: def.focus,
    build(kit: Kit) {
      const { pieces, surfaces } = stepArtworks(def);
      const art = artMaterial(`collection-${def.space}`, surfaces);
      const material: Record<ArtPiece['role'], Material> = { object: art, plinth: def.plinth ?? plinthMaterial, glass: vitrineGlass, gilt: giltMaterial };
      def.placements.forEach(({ id }, order) => {
        // One artwork, The Met's object `id`: all its pieces together under one order, each tagged with its object ID. Artwork tags never split a mesh
        // (src/build/batch.ts keeps only doors apart), so the step's meshes are those untagged pieces would make.
        const artwork = pieces[order] ?? [];
        if (artwork.length === 0) throw new Error(`Step "${def.id}": object ${String(id)} has no pieces; check its catalogue entry's display.`);
        const tag = artworkTag(id);
        for (const piece of artwork) kit.addTagged(piece.geometry, material[piece.role], piece.matrix, tag, order);
      });
    },
  };
}
