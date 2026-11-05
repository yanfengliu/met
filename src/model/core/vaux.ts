/**
 * Chapter `vaux-mould-1880`: Calvert Vaux and Jacob Wrey Mould's building, ground broken 1874, opened 30 March 1880 (history.md section 2),
 * block core-1880-a (X ±14.5, Z −138.3..−69.0). Steps follow history.md's proposal in constructional order: foundations, walls, the west front,
 * the iron frame and floors, openings and trim, the central hall, the skylit upper galleries, and the roofs last.
 */
import type { StepDef } from '../../build/types.js';
import { L1, WEST_Z } from './constants.js';
import { westFrontHeads, westFrontTrim, westFrontWall, westFrontWindows } from './vaux-front.js';
import { vauxGalleries, vauxRoof } from './vaux-roof.js';
import { vauxFoundations, vauxHall, vauxIronFrame, vauxSideTrim, vauxWalls } from './vaux-shell.js';

const CHAPTER = 'vaux-mould-1880';

export const vauxSteps: readonly StepDef[] = [
  {
    id: 'vaux-foundations',
    chapter: CHAPTER,
    year: '1874–1877',
    title: 'Dig the foundations and basement',
    detail: 'Strip footings under every wall of the first building, pads for the iron columns and the basement floor, laid from the park side east.',
    motion: { kind: 'rise' },
    stagger: 'z',
    build: vauxFoundations,
  },
  {
    id: 'vaux-walls',
    chapter: CHAPTER,
    title: 'Raise the red-brick walls',
    detail: 'The long side walls rise bay by bay on the rhythm of the central hall, with their pointed arches, and the east wall closes the block.',
    motion: { kind: 'grow' },
    stagger: 'z',
    weight: 1.2,
    build: vauxWalls,
  },
  {
    id: 'vaux-west-front',
    chapter: CHAPTER,
    title: 'Build the west front and its entrance',
    detail: 'The park front: five tall arched openings over a rusticated ground storey, the entrance on the axis, with granite bands and a cornice. It survives inside the Lehman Wing.',
    motion: { kind: 'grow' },
    stagger: 'order',
    weight: 1.3,
    focus: { kind: 'view', position: [9, L1 + 3, WEST_Z - 34], target: [0, L1 + 5, WEST_Z] },
    build(kit) {
      westFrontWall(kit);
      westFrontTrim(kit);
    },
  },
  {
    id: 'vaux-iron-frame',
    chapter: CHAPTER,
    title: "Set Radford's iron frame and the floors",
    detail: 'Cast-iron columns carry the main and second floors; the iron staircases at the west end climb to the upper galleries.',
    motion: { kind: 'drop' },
    stagger: 'y',
    build: vauxIronFrame,
  },
  {
    id: 'vaux-openings',
    chapter: CHAPTER,
    title: 'Glaze the windows and set the granite trim',
    detail: 'Windows fill the west front’s outer arches and the ground storey; granite heads and bands finish the fronts and side walls; brick fills the east arches round their corridors.',
    // A fixed drop by order: the side walls' bands in rising courses (1 to 4), then the heads (5), the west windows by their distance off the axis,
    // the east front's trim with the brick round its corridors (12) and the oculus glass (20). Each head's light and dark pieces share an order and the
    // distance, so they move as one, as the east brick does with the band and apron in front of it; 1.9 m keeps each ground window, starting over its
    // place, under the main floor (4.11 m), where the doorways over it begin (core/vaux-fronts.test.ts).
    motion: { kind: 'drop', distance: 1.9 },
    stagger: 'order',
    build(kit) {
      westFrontWindows(kit);
      westFrontHeads(kit);
      vauxSideTrim(kit);
    },
  },
  {
    id: 'vaux-hall',
    chapter: CHAPTER,
    title: 'Frame the central hall',
    detail: 'The hall between the two pavilions gets its end walls with arches and round windows, and an iron frame of posts and trusses for its raised roof.',
    motion: { kind: 'grow' },
    stagger: 'y',
    build: vauxHall,
  },
  {
    id: 'vaux-galleries',
    chapter: CHAPTER,
    title: 'Partition the skylit upper galleries',
    detail: 'Picture galleries on the second floor, today European Paintings, each under a laylight frame.',
    motion: { kind: 'grow' },
    stagger: 'z',
    build: vauxGalleries,
  },
  {
    id: 'vaux-roof',
    chapter: CHAPTER,
    title: 'Close the roofs round the gallery skylights',
    detail: 'Flat roofs with a ridge skylight over each gallery, and the raised lead roof over the central hall. The building opens on 30 March 1880.',
    motion: { kind: 'drop' },
    stagger: 'z',
    weight: 1.2,
    build: vauxRoof,
  },
];
